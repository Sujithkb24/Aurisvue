import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import connectDB from './config/db.js';

import authRoutes from './routes/auth.routes.js';
import schoolRoutes from './routes/school.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import chatRoutes from './routes/chat.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';

import cors from 'cors';
import registerSocketHandlers from './socket.js';

dotenv.config();

const app = express();
connectDB();
app.use(cors('*'));
app.use(express.json());

app.use('/api/schools', schoolRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/auth', authRoutes);

// Socket.io setup
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: '*'
  }
});
registerSocketHandlers(io); // Register all socket events

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
