// routes/quiz.routes.js
import express from 'express';
import { getQuestions, submitQuiz, getQuizFeedback } from '../controllers/quiz.controller.js';

const router = express.Router();

// Get dynamically generated ISL quiz questions
router.get('/questions', getQuestions);

// Submit quiz score
router.post('/submit', submitQuiz);

// Get personalized feedback on quiz performance
router.post('/feedback', getQuizFeedback);

export default router;