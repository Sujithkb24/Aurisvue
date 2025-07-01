import admin from '../config/firebase.js';
import User from '../models/user.model.js';

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // Fetch user from MongoDB to get role
    const user = await User.findOne({ uid: decoded.uid });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = {
      ...decoded,
      role: user.role,
      name: user.name,
      email: user.email,
      uid: user.uid
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export default verifyToken;