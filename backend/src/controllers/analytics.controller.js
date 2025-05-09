
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

export const getTeacherAnalytics = async (req, res) => {
  try {
    const userId = req.user.uid;
  
    
    // Get all class sessions created by this teacher
    const sessions = await ClassSession.find({ createdBy: userId });
    
    if (!sessions || sessions.length === 0) {
      return res.status(200).json({
        overallAnalytics: {
          overall_success_rate: 0,
          successful_conversions: 0,
          total_conversions: 0,
          total_words: 0,
          avg_conversion_time: 0
        },
        sessionAnalytics: [],
        problematicWords: [],
        improvementOverTime: [],
        studentFeedbackMetrics: {
          understoodPercentage: 0,
          totalFeedback: 0,
          feedbackOverTime: []
        }
      });
    }

    // Calculate overall analytics
    let totalWords = 0;
    let successfulConversions = 0;
    let totalConversions = 0;
    let totalFeedback = 0;
    let totalUnderstood = 0;
    let allProblematicWords = {};
    
    // Process sessions to gather analytics
    const sessionAnalytics = sessions.map(session => {
      // Count words in transcripts
      const sessionWords = session.transcripts.reduce((sum, transcript) => 
        sum + (transcript.text ? transcript.text.split(' ').length : 0), 0);
      totalWords += sessionWords;
      
      // Process feedback for this session
      const sessionFeedback = session.feedback || [];
      const feedbackCount = sessionFeedback.length;
      totalFeedback += feedbackCount;
      
      const understoodCount = sessionFeedback.filter(fb => fb.understood).length;
      totalUnderstood += understoodCount;
      
      const understoodPercentage = feedbackCount > 0 
        ? (understoodCount / feedbackCount) * 100 
        : 0;
      
      // Track successful and total conversions
      const sessionSuccessfulConversions = sessionFeedback.filter(fb => fb.understood).length;
      const sessionTotalConversions = feedbackCount;
      successfulConversions += sessionSuccessfulConversions;
      totalConversions += sessionTotalConversions;
      
      // Gather problematic words
      sessionFeedback.forEach(fb => {
        if (fb.problematicWords && fb.problematicWords.length > 0) {
          fb.problematicWords.forEach(word => {
            allProblematicWords[word] = (allProblematicWords[word] || 0) + 1;
          });
        }
      });
      
      return {
        id: session._id,
        session_title: session.title,
        session_date: session.createdAt,
        total_words: sessionWords,
        feedback_count: feedbackCount,
        understood_percentage: understoodPercentage,
        successful_conversions: sessionSuccessfulConversions,
        total_conversions: sessionTotalConversions
      };
    });
    
    // Sort sessions by date, most recent first
    sessionAnalytics.sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
    
    // Create problematic words array sorted by frequency
    const problematicWords = Object.entries(allProblematicWords).map(([word_or_phrase, frequency]) => ({
      word_or_phrase,
      frequency
    })).sort((a, b) => b.frequency - a.frequency);
    
    // Calculate improvement over time
    const improvementOverTime = calculateImprovementOverTime(sessions);
    
    // Calculate student feedback metrics over time
    const feedbackOverTime = calculateFeedbackOverTime(sessions);
    
    // Calculate overall success rate
    const overall_success_rate = totalConversions > 0 
      ? (successfulConversions / totalConversions) * 100 
      : 0;
    
    // Calculate overall understood percentage
    const understoodPercentage = totalFeedback > 0 
      ? (totalUnderstood / totalFeedback) * 100 
      : 0;
    
    // Prepare and send the response
    const analyticsData = {
      overallAnalytics: {
        overall_success_rate,
        successful_conversions: successfulConversions,
        total_conversions: totalConversions,
        total_words: totalWords,
        avg_conversion_time: 250 // Placeholder, replace with actual data if available
      },
      sessionAnalytics,
      problematicWords,
      improvementOverTime,
      studentFeedbackMetrics: {
        understoodPercentage,
        totalFeedback,
        feedbackOverTime
      }
    };
    
    return res.status(200).json(analyticsData);
    
  } catch (error) {
    console.error('Error getting teacher analytics:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper function to calculate improvement over time (weekly)
const calculateImprovementOverTime = (sessions) => {
  // Group feedback by week
  const weeklyData = {};
  
  sessions.forEach(session => {
    session.feedback.forEach(feedback => {
      const date = new Date(feedback.timestamp);
      // Get start of week (Sunday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.toISOString();
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekStart.toISOString(),
          successful: 0,
          total: 0
        };
      }
      
      weeklyData[weekKey].total++;
      if (feedback.understood) {
        weeklyData[weekKey].successful++;
      }
    });
  });
  
  // Convert to array and calculate success rate
  const improvementData = Object.values(weeklyData)
    .map(week => ({
      week: week.week,
      success_rate: week.total > 0 ? (week.successful / week.total) * 100 : 0
    }))
    .sort((a, b) => new Date(a.week) - new Date(b.week)); // Sort by date ascending
  
  return improvementData;
};

// Helper function to calculate feedback metrics over time (weekly)
const calculateFeedbackOverTime = (sessions) => {
  // Group feedback by week
  const weeklyData = {};
  
  sessions.forEach(session => {
    session.feedback.forEach(feedback => {
      const date = new Date(feedback.timestamp);
      // Get start of week (Sunday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.toISOString();
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekStart.toISOString(),
          understood: 0,
          total: 0
        };
      }
      
      weeklyData[weekKey].total++;
      if (feedback.understood) {
        weeklyData[weekKey].understood++;
      }
    });
  });
  
  // Convert to array and calculate understanding rate
  const feedbackData = Object.values(weeklyData)
    .map(week => ({
      week: week.week,
      understanding_rate: week.total > 0 ? (week.understood / week.total) * 100 : 0
    }))
    .sort((a, b) => new Date(a.week) - new Date(b.week)); // Sort by date ascending
  
  return feedbackData;
};