import express from 'express';
import {
  createClassSession,
  getActiveSession,
  joinClassByCode,
  appendTranscriptEntry
} from '../controllers/class.controller.js';
import verifyToken  from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', verifyToken, createClassSession);
router.get('/active', verifyToken, getActiveSession);
router.post('/join', verifyToken, joinClassByCode);
router.post('/:sessionId/transcripts', verifyToken, appendTranscriptEntry);


export default router;

