import express from 'express';
import User from '../models/user.model.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

// Create or update user on frontend registration
router.post('/register', verifyToken, async (req, res) => {
  const { role } = req.body;
  const { uid, email } = req.user;

  try {
    let user = await User.findOne({ uid });
    if (user) {
      user.role = role;
      await user.save();
    } else {
      user = new User({ uid, email, role });
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