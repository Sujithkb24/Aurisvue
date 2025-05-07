import ClassSession from '../models/class.model.js';
import { nanoid } from 'nanoid';

// Create new class session (Teacher only)
export const createClassSession = async (req, res) => {
    try {
      const { title, description, video = false } = req.body;
      const userId = req.user.uid;
      console.log(userId)
      const session = await ClassSession.create({
        title,
        description,
        createdBy: userId,
        code: nanoid(8),
        isActive: true,
        videoEnabled: video
      });
  
      res.status(201).json({ session });
    } catch (error) {
      console.error("Error creating class session:", error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  
// Get active session for teacher
export const getActiveSession = async (req, res) => {
  try {
    const userId = req.user._id;
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
    const session = await ClassSession.findOne({ code: code, isActive: true });

    if (!session) {
      return res.status(404).json({ message: 'Invalid or expired class code' });
    }

    res.status(200).json({ session });
  } catch (err) {
    console.error('Error joining session:', err);
    res.status(500).json({ message: 'Error joining session' });
  }
};
// controllers/class.controller.js

// import ClassSession from '../models/class.model.js';

export const appendTranscriptEntry = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { text, timestamp } = req.body;

    const session = await ClassSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.transcripts.push({
      text,
      speaker: req.user.role,
    
      userId: req.user.id,
      timestamp: timestamp || new Date()
    });

    await session.save();

    res.status(200).json({
      message: 'Transcript entry saved',
      transcripts: session.transcripts
    });
  } catch (error) {
    console.error('Error saving transcript:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


