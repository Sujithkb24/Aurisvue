import ClassSession from '../models/class.model.js';
import { nanoid } from 'nanoid';

// Create new class session (Teacher only)
export const createClassSession = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.uid;

    const newSession = await ClassSession.create({
      title,
      description,
      code: nanoid(6).toUpperCase(),
      createdBy: userId,
    });

    res.status(201).json({ session: newSession });
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ message: 'Failed to create session' });
  }
};

// Get active session for teacher
export const getActiveSession = async (req, res) => {
  try {
    const userId = req.user.uid;
    const activeSession = await ClassSession.findOne({ createdBy: userId, isActive: true });
    res.status(200).json({ activeSession });
  } catch (err) {
    console.error('Error fetching active session:', err);
    res.status(500).json({ message: 'Error retrieving session' });
  }
};

// Join class session (Student)
export const joinClassByCode = async (req, res) => {
  try {
    const { code } = req.body;
    const session = await ClassSession.findOne({ code: code.toUpperCase(), isActive: true });

    if (!session) {
      return res.status(404).json({ message: 'Invalid or expired class code' });
    }

    res.status(200).json({ session });
  } catch (err) {
    console.error('Error joining session:', err);
    res.status(500).json({ message: 'Error joining session' });
  }
};
