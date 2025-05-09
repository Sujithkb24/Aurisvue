
// 
import ClassSession from '../models/class.model.js';
// 
import User from '../models/user.model.js';

// Save student feedback
export const saveStudentFeedback = async (req, res) => {
  try {
    console.log("Hit")
    const userId = req.user.uid;
    const { 
      sessionId, 
      understood, 
      transcript, 
      conversionResult, 
      specificFeedback, 
      problematicWords 
    } = req.body;
    
    const classSession = await ClassSession.findById(sessionId);
    
    if (!classSession) {
      return res.status(404).json({ success: false, message: 'Class session not found' });
    }
    
    // Check if user is a student in the session
    if (!classSession.students.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not a student in this session' });
    }
    
    // Add feedback to the class session
    classSession.feedback.push({
      studentId: userId,
      understood,
      transcript,
      conversionResult,
      specificFeedback,
      problematicWords,
      timestamp: new Date()
    });
    
    await classSession.save();
    
    return res.status(200).json({
      success: true,
      message: 'Feedback saved successfully'
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get feedback for a session (teacher only)
export const getSessionFeedback = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.uid;
    
    const classSession = await ClassSession.findById(sessionId);
    
    if (!classSession) {
      return res.status(404).json({ success: false, message: 'Class session not found' });
    }
    
    // Check if user is the teacher of the session
    if (classSession.createdBy !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Only the teacher can view feedback' });
    }
    
    return res.status(200).json({
      success: true,
      data: classSession.feedback
    });
  } catch (error) {
    console.error('Error getting session feedback:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};