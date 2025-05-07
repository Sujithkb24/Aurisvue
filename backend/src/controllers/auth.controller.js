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
    const { faceDescriptor } = req.body;

    if (!faceDescriptor || faceDescriptor.length !== 128) {
      return res.status(400).json({ message: 'Invalid or missing face descriptor' });
    }

    // Fetch all users with face authentication enabled and a non-null face descriptor
    const users = await User.find({
      useFaceAuth: true,
      faceDescriptor: { $ne: null }
    });

    if (!users.length) {
      return res.status(404).json({ message: 'No users found with face auth enabled' });
    }

    // Find the best matching user based on face descriptor comparison
    let bestMatchUser = null;
    let bestMatchDistance = Infinity;

    for (const user of users) {
      const distance = compareFaceDescriptors(user.faceDescriptor, faceDescriptor);

      if (distance && distance < bestMatchDistance) {
        bestMatchUser = user;
        bestMatchDistance = distance;
      }
    }

    if (!bestMatchUser) {
      return res.status(401).json({ message: 'Face authentication failed' });
    }

    // Fetch school info if available
    const schoolId = bestMatchUser.schoolId || null;

    res.json({
      message: 'Login successful',
      user: {
        uid: bestMatchUser.uid,
        name: bestMatchUser.name,
        email: bestMatchUser.email,
        role: bestMatchUser.role,
        schoolId
      },
      schoolId
    });

  } catch (error) {
    console.error('Face login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const checkFaceAuthEnabled = async (req, res) => {
  try {
    const { emailOrPhone } = req.query;

    if (!emailOrPhone) {
      return res.status(400).json({ message: 'Email or phone number is required' });
    }

    // Find the user by email or phone
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if face authentication is enabled
    const hasFaceAuth = !!user.faceDescriptor; // Assuming `faceDescriptor` is stored in the user model
    res.json({ hasFaceAuth });
  } catch (error) {
    console.error('Error checking face authentication:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};