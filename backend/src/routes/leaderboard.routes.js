// routes/leaderboard.routes.js
import express from 'express';
import { getLeaderboard, getUserHighScore, getUserScoreHistory } from '../controllers/leaderboard.controller.js';

const router = express.Router();

// Get top scores for leaderboard
router.get('/', getLeaderboard);

// Get user's highest score
router.get('/user/:userId/highscore', getUserHighScore);

// Get user's score history
router.get('/user/:userId/history', getUserScoreHistory);

export default router;