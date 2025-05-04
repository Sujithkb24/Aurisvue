import crypto from 'crypto';
import School from '../models/school.model.js';
import User from '../models/user.model.js';

export const createSchool = async (req, res) => {
  try {
    console.log('Creating school:', req.body);
    const { name, createdByEmail } = req.body;

    // Check if the school already exists
    const existingSchool = await School.findOne({ name });
    if (existingSchool) {
      return res.status(400).json({ message: 'School already exists' });
    }

    // Find the creator by email
    const creator = await User.findOne({ email: createdByEmail });
    if (!creator) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate secure teacher code
    const teacherCode = crypto.randomBytes(4).toString('hex'); // 8-char code

    // Create the school
    const school = await School.create({
      name,
      createdBy: creator._id,
      teacherCode
    });

    // Assign the creator as a teacher
    creator.role = 'teacher';
    creator.schoolId = school._id;
    await creator.save();

    // Respond with the created school details
    res.status(201).json({
      message: 'School created',
      school: {
        _id: school._id,
        name: school.name,
        teacherCode // Show once on creation (can omit in production)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllSchools = async (req, res) => {
  try {
    const schools = await School.find({}, 'name _id');
    res.json(schools);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
