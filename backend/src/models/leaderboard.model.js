// models/leaderboard.model.js
import mongoose from 'mongoose';

const leaderboardSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    default: 6
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  // Optional fields for additional analytics
  timeSpent: {
    type: Number, // time in seconds
    default: null
  },
  deviceType: {
    type: String,
    default: 'web'
  }
});

// Add a virtual field for calculating percentage score
leaderboardSchema.virtual('percentageScore').get(function() {
  return Math.round((this.score / this.totalQuestions) * 100);
});

// Ensure virtual fields are included when converting to JSON
leaderboardSchema.set('toJSON', { virtuals: true });
leaderboardSchema.set('toObject', { virtuals: true });

// Add index for faster querying
leaderboardSchema.index({ userId: 1, completedAt: -1 });
leaderboardSchema.index({ score: -1 }); // For leaderboard sorting

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);
export default Leaderboard;