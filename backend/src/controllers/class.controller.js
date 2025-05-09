import ClassSession from '../models/class.model.js';
import { nanoid } from 'nanoid';
import User from '../models/user.model.js';

// Create new class session (Teacher only)
export const createClassSession = async (req, res) => {
  try {
    const { title, description, video = false } = req.body;
    const userId = req.user.uid;
    const code = nanoid(8);
    const jitsiLink = `https://meet.jit.si/${code}`;

    const session = await ClassSession.create({
      title,
      description,
      createdBy: userId,
      code,
      isActive: true,
      videoEnabled: video,
      jitsiLink
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
    const userId = req.user.uid;
    const activeSession = await ClassSession.findOne({ createdBy: userId, isActive: true });
    console.log(activeSession)
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
    const userId = req.user.uid; // Assuming user is authenticated and middleware sets req.user

    const session = await ClassSession.findOne({ code, isActive: true });

    if (!session) {
      return res.status(404).json({ message: 'Invalid or expired class code' });
    }

    // Add user to session if not already present
    if (!session.students.includes(userId)) {
      session.students.push(userId);
      await session.save();
    }

    res.status(200).json({ session });
  } catch (err) {
    console.error('Error joining session:', err);
    res.status(500).json({ message: 'Error joining session' });
  }
};



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
    
      userId: req.user.uid,
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
    const session = await ClassSession.findById(sessionId).lean();
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // 1) Resolve creator name (always a single UID)
    const createdByUid = session.createdBy;
    const createdByUser = createdByUid
      ? await User.findOne({ firebaseUid: createdByUid }, 'name').lean()
      : null;

    // 2) Ensure students is an array
    const studentUids = Array.isArray(session.students)
      ? session.students
      : [];

    // 3) Only query if there's at least one UID
    let studentDocs = [];
    if (studentUids.length > 0) {
      studentDocs = await User.find(
        { firebaseUid: { $in: studentUids } },
        'firebaseUid name'
      ).lean();
    }

    // 4) Build UID→name map
    const nameByUid = {};
    if (createdByUser) {
      nameByUid[createdByUid] = createdByUser.name;
    }
    for (let u of studentDocs) {
      nameByUid[u.firebaseUid] = u.name;
    }

    // 5) Assemble messages, pulling names where available
    const messages = (session.transcripts || []).map(t => ({
      text:     t.text,
      sender:   t.speaker,
      userId:   t.userId,
      userName: nameByUid[t.userId] || t.speaker,
      timestamp: t.timestamp,
    }));

    return res.status(200).json({
      createdBy: createdByUid
        ? { uid: createdByUid, name: nameByUid[createdByUid] || null }
        : null,
      students: studentDocs.map(u => ({ uid: u.firebaseUid, name: u.name })),
      messages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Server error while fetching messages' });
  }
};


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

// BACKEND CODE - controllers/sessionController.js
export const endClassSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.uid;

   
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

    // End the session
    session.isActive = false;
    session.endedAt = new Date();
    await session.save();

    // Emit socket event to notify all connected clients
    req.io.to(`session-${sessionId}`).emit('session_update', { 
      type: 'ended',
      sessionId: session._id,
      endedAt: session.endedAt
    });

    res.status(200).json({ 
      message: 'Session ended successfully', 
      session: {
        id: session._id,
        title: session.title,
        endedAt: session.endedAt 
      }
    });
  } catch (error) {
    console.error('Error ending class session:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
