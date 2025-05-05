import express from 'express'
import { chatWithGemini } from '../controllers/chat.controller.js';
const router = express.Router();


router.post('/chats', chatWithGemini);

export  default router