import express from 'express';
import {
  createClassSession,
  getActiveSession,
  joinClassByCode
} from '../controllers/class.controller.js';
import verifyToken  from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', verifyToken, createClassSession);
router.get('/active', verifyToken, getActiveSession);
router.post('/join', verifyToken, joinClassByCode);

export default router;
