import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
// import schoolRoutes from './routes/school.routes.js';\
import quizRoutes from './routes/quiz.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import cors from 'cors';

dotenv.config();

const app = express();
connectDB();

app.use(cors('*'));
app.use(express.json());
// app.use('/api/schools', require('./routes/schoolRoutes'));
app.use('/api/quizzes', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));