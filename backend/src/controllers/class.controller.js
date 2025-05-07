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



// GET /api/sessions/:sessionId/transcripts
export const getSessionTranscripts = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ClassSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const transcripts = session.transcripts || [];

    res.status(200).json({ transcripts });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    res.status(500).json({ error: 'Server error while fetching transcripts' });
  }
};

// GET /api/sessions/:sessionId/messages
export const getSessionMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ClassSession.findById(sessionId)
      .populate('students', 'name') // if needed
      .populate('createdBy', 'name'); // optional

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Sample logic: Assuming "messages" are stored in the transcripts or you'd want to structure this differently.
    // You can customize what qualifies as a message (e.g., filter only user messages)
    const messages = session.transcripts.map(t => ({
      text: t.text,
      sender: t.speaker,
      userId: t.userId,
      timestamp: t.timestamp,
    }));

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error while fetching messages' });
  }
};

// controllers/class.controller.js



// Raise hand (Student role)
export const raiseHand = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { requestType } = req.body; // 'video' or 'text'
    const userId = req.user.uid;
    const userName = req.user.name || req.user.displayName || 'Student'; // Get name from user object

    // Only students can raise hand
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can raise hand' });
    }

    const session = await ClassSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.isActive) {
      return res.status(400).json({ message: 'Session is no longer active' });
    }

    // Check if student already has a pending hand raise
    const existingRequest = session.handRaises.find(
      request => request.userId === userId && request.status === 'pending'
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending request' });
    }

    // Add hand raise to session
    session.handRaises.push({
      userId,
      userName,
      requestType,
      status: 'pending',
      timestamp: new Date()
    });

    await session.save();

    res.status(200).json({
      message: 'Hand raised successfully',
      handRaiseId: session.handRaises[session.handRaises.length - 1]._id
    });
  } catch (error) {
    console.error('Error raising hand:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all hand raises (Teacher role)
export const getHandRaises = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.uid;

    // Only teachers can view hand raises
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Not authorized to view hand raises' });
    }

    const session = await ClassSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Verify the user is the teacher of this session
    if (session.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to view hand raises for this session' });
    }

    // Return all hand raises, with pending ones first
    const handRaises = session.handRaises.sort((a, b) => {
      // Sort by status (pending first) then by timestamp
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    res.status(200).json({ handRaises });
  } catch (error) {
    console.error('Error getting hand raises:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Respond to hand raise (Teacher role)
export const respondToHandRaise = async (req, res) => {
  try {
    const { sessionId, handRaiseId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'
    const userId = req.user.uid;

    // Only teachers can respond to hand raises
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Not authorized to manage hand raises' });
    }

    const session = await ClassSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Verify the user is the teacher of this session
    if (session.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to manage hand raises for this session' });
    }

    // Find the hand raise
    const handRaiseIndex = session.handRaises.findIndex(
      hr => hr._id.toString() === handRaiseId
    );

    if (handRaiseIndex === -1) {
      return res.status(404).json({ message: 'Hand raise not found' });
    }

    if (session.handRaises[handRaiseIndex].status !== 'pending') {
      return res.status(400).json({ message: 'This request has already been processed' });
    }

    // Update hand raise status
    session.handRaises[handRaiseIndex].status = action === 'accept' ? 'accepted' : 'declined';
    session.handRaises[handRaiseIndex].respondedAt = new Date();

    await session.save();

    res.status(200).json({
      message: `Hand raise ${action === 'accept' ? 'accepted' : 'declined'}`,
      handRaise: session.handRaises[handRaiseIndex]
    });
  } catch (error) {
    console.error('Error responding to hand raise:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Clear all hand raises for a session (Teacher role)
export const clearHandRaises = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.uid;

    // Only teachers can clear hand raises
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Not authorized to manage hand raises' });
    }

    const session = await ClassSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Verify the user is the teacher of this session
    if (session.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to manage hand raises for this session' });
    }

    // Clear hand raises
    session.handRaises = [];
    await session.save();

    res.status(200).json({ message: 'All hand raises cleared' });
  } catch (error) {
    console.error('Error clearing hand raises:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
// End class session (Teacher only)
export const endClassSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.uid;

    // Only teachers can end sessions
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Not authorized to end sessions' });
    }

    const session = await ClassSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Verify the user is the teacher who created this session
    if (session.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to end this session' });
    }

    if (!session.isActive) {
      return res.status(400).json({ message: 'Session is already ended' });
    }

    // End the session by setting isActive to false
    session.isActive = false;
    session.endedAt = new Date();
    await session.save();

    res.status(200).json({ 
      message: 'Session ended successfully',
      session: {
        _id: session._id,
        title: session.title,
        endedAt: session.endedAt
      }
    });
  } catch (error) {
    console.error('Error ending class session:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};