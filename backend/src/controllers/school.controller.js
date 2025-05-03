import crypto from 'crypto';
import School from '../models/School.js';
import User from '../models/User.js';

export const createSchool = async (req, res) => {
  try {
    const { name, creatorUid } = req.body;

    const existingSchool = await School.findOne({ name });
    if (existingSchool) {
      return res.status(400).json({ message: 'School already exists' });
    }

    const creator = await User.findOne({ uid: creatorUid });
    if (!creator) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate secure teacher code
    const teacherCode = crypto.randomBytes(4).toString('hex'); // 8-char code

    const school = await School.create({
      name,
      createdBy: creator._id,
      teacherCode
    });

    // Assign creator as teacher
    creator.role = 'teacher';
    creator.schoolId = school._id;
    await creator.save();

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
