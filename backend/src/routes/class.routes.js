import express from 'express';
import {
  createClassSession,
  getActiveSession,
  joinClassByCode,
  appendTranscriptEntry,
  raiseHand,
  getHandRaises,
  respondToHandRaise,
  clearHandRaises,
  endClassSession,
  getSessionTranscripts,
  getSessionMessages
} from '../controllers/class.controller.js';
import verifyToken  from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', verifyToken, createClassSession);
router.get('/active', verifyToken, getActiveSession);
router.post('/join', verifyToken, joinClassByCode);
router.post('/:sessionId/append', verifyToken, appendTranscriptEntry);
router.post('/:sessionId/hand-raise', verifyToken, raiseHand); // Student role check in controller
router.get('/:sessionId/hand-raises', verifyToken, getHandRaises); // Teacher role check in controller
router.patch('/:sessionId/hand-raises/:handRaiseId', verifyToken, respondToHandRaise); // Teacher role check in controller
router.delete('/:sessionId/hand-raises', verifyToken, clearHandRaises); // Teacher role check in controller
router.put('/:sessionId/end', verifyToken ,endClassSession);
router.get('/:sessionId/transcripts', verifyToken, getSessionTranscripts);
router.get('/:sessionId/messages', verifyToken, getSessionMessages);
export default router;

