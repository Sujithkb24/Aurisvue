import express from 'express';
import { getSessionFeedback, saveStudentFeedback } from '../controllers/analytics.controller.js';
import verifyToken from '../middleware/auth.middleware.js';
const router = express.Router();
router.post('/feedback', verifyToken, saveStudentFeedback);
router.get('/feedback/:sessionId', verifyToken, getSessionFeedback);
export default router;