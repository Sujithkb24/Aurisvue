import User from '../models/user.model.js';
import School from '../models/school.model.js';

// Util: Euclidean distance-based face matcher
const compareFaceDescriptors = (storedDescriptor, loginDescriptor, threshold = 0.5) => {
  if (!storedDescriptor || !loginDescriptor) return false;
  if (storedDescriptor.length !== loginDescriptor.length) return false;

  let distance = 0;
  for (let i = 0; i < storedDescriptor.length; i++) {
    distance += Math.pow(storedDescriptor[i] - loginDescriptor[i], 2);
  }
  distance = Math.sqrt(distance);

  console.log(`Face similarity distance: ${distance}`);
  return distance < threshold;
};

export const loginWithFace = async (req, res) => {
  try {
    const { emailOrPhone, faceDescriptor } = req.body;

    if (!faceDescriptor || faceDescriptor.length !== 128) {
      return res.status(400).json({ message: 'Invalid or missing face descriptor' });
    }

    // Find candidate users based on email or phone
    const users = await User.find({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      useFaceAuth: true,
      faceDescriptor: { $ne: null }
    });

    if (!users.length) {
      return res.status(404).json({ message: 'No users found with face auth enabled' });
    }

    // Match face descriptor
    let matchedUser = null;
    for (const user of users) {
      if (compareFaceDescriptors(user.faceDescriptor, faceDescriptor)) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ message: 'Face authentication failed' });
    }

    // Fetch school info if available
    const schoolId = matchedUser.schoolId || null;

    res.json({
      message: 'Login successful',
      user: {
        uid: matchedUser.uid,
        email: matchedUser.email,
        role: matchedUser.role,
        schoolId
      },
      schoolId
    });

  } catch (error) {
    console.error('Face login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
