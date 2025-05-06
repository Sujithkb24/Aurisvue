import express from 'express';
import User from '../models/user.model.js';
import School from '../models/school.model.js';
import verifyToken from '../middleware/auth.middleware.js';
import { loginWithFace, checkFaceAuthEnabled } from '../controllers/auth.controller.js';
import admin from '../services/firebase.js';

const router = express.Router();

router.post('/login-face', loginWithFace);

// Create or update user on frontend registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, role, useFaceAuth, faceDescriptor, schoolId, uid } = req.body;

    if (!email || !role || !uid) {
      return res.status(400).json({ message: 'Email, role, and uid are required' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (schoolId) {
      const school = await School.findById(schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
    }

    user = new User({
      uid,
      name,
      email,
      role,
      useFaceAuth: useFaceAuth || false,
      ...(faceDescriptor && { faceDescriptor }),
      ...(schoolId && { schoolId })
    });

    await user.save();

    // 🔐 Generate Firebase custom token
    const token = await admin.auth().createCustomToken(uid);
    console.log('Generated Firebase token:', token);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        useFaceAuth: user.useFaceAuth
      },
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Register with face authentication (no Firebase uid yet)
router.post('/register-face', async (req, res) => {
  try {
    const { name, email, role, faceDescriptor, schoolId } = req.body;
    
    // Validate input
    if (!email || !role || !faceDescriptor) {
      return res.status(400).json({ message: 'Email, role, and face descriptor are required' });
    }
    
    // Check if the user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Generate a unique identifier for the user (since there's no Firebase UID)
    const uid = require('crypto').randomBytes(16).toString('hex');
    
    // Create new user
    user = new User({
      uid,
      name,
      email,
      role,
      useFaceAuth: true,
      faceDescriptor,
      ...(schoolId && { schoolId })
    });
    
    await user.save();
    
    // Generate a token for the client
    const token = jwt.sign(
      { uid, email, role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );
    
    // Return user data and token
    res.status(201).json({
      message: 'User registered with face authentication',
      user: {
        uid: userRecord.uid,
        email,
        role
      },
      token
    });
  }catch (error) {
    console.error('Face registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
})

router.get('/check-face-auth', checkFaceAuthEnabled);
router.post('/update-school', verifyToken, async (req, res) => {
  const { schoolId } = req.body;
  const { uid } = req.user;
  
  try {
    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.schoolId = schoolId;
    await user.save();
    
    res.json({ message: 'User school updated successfully' });
  } catch (err) {
    console.error('Error updating user school:', err);
    res.status(500).json({ error: err.message || 'Failed to update user school' });
  }
});

router.get('/user-info/:uid', verifyToken, async (req, res) => {
  const { uid } = req.params;
  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      role: user.role,
      name: user.name,
      schoolId: user.schoolId || null 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;