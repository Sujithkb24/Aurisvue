import express from 'express'
import { chatWithISL } from '../controllers/chat.controller.js';
const router = express.Router();


router.post('/chats', chatWithISL);

export  default router