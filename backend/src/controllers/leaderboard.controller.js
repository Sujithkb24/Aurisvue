// controllers/leaderboard.controller.js
import Leaderboard from '../models/leaderboard.model.js';

// Get top scores for leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Leaderboard.find()
      .sort({ score: -1 }) // Sort by score in descending order
      .limit(10); // Get top 10 scores
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user's highest score
export const getUserHighScore = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }
  
  try {
    const highScore = await Leaderboard.findOne({ userId })
      .sort({ score: -1 }) // Sort by score in descending order
      .select('score completedAt'); // Only return score and completion date
      
    if (!highScore) {
      return res.status(404).json({ message: 'No scores found for this user' });
    }
    
    res.status(200).json(highScore);
  } catch (error) {
    console.error('Error fetching user high score:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user's score history
export const getUserScoreHistory = async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }
  
  try {
    const scoreHistory = await Leaderboard.find({ userId })
      .sort({ completedAt: -1 }) // Sort by completion date, newest first
      .select('score completedAt');
      
    res.status(200).json(scoreHistory);
  } catch (error) {
    console.error('Error fetching user score history:', error);
    res.status(500).json({ message: error.message });
  }
};