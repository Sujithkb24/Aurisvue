import express from 'express';
import User from '../models/user.model.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

const compareFaceDescriptors = (storedDescriptor, loginDescriptor, threshold = 0.5) => {
  if (!storedDescriptor || !loginDescriptor) return false;
  if (storedDescriptor.length !== loginDescriptor.length) return false;
  
  // Calculate Euclidean distance between the descriptors
  let distance = 0;
  for (let i = 0; i < storedDescriptor.length; i++) {
    distance += Math.pow(storedDescriptor[i] - loginDescriptor[i], 2);
  }
  distance = Math.sqrt(distance);
  
  console.log(`Face similarity distance: ${distance}`);
  
  // Lower distance means more similar faces
  return distance < threshold;
};

// Create or update user on frontend registration
router.post('/register', verifyToken, async (req, res) => {
  const { role, schoolId, teacherCode } = req.body;
  const { uid, email } = req.user;

  try {
    if (role === 'teacher') {
      const school = await School.findById(schoolId);
      if (!school || school.teacherCode !== teacherCode) {
        return res.status(403).json({ error: 'Invalid teacher code or school ID' });
      }
    }

    if (role === 'student') {
      const school = await School.findById(schoolId);
      if (!school) {
        return res.status(404).json({ error: 'Invalid school ID' });
      }
    }

    let user = await User.findOne({ uid });
    if (user) {
      user.role = role;
      user.schoolId = schoolId;
      await user.save();
    } else {
      user = new User({ uid, email, role, schoolId });
      await user.save();
    }

    res.json({ message: 'User registered/updated', role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user role by token
router.get('/role', verifyToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;