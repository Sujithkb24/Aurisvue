import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import PublicMode from './components/modes/public';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ClassMode from './components/modes/class';
import PluginMode from './components/modes/plugin';
// import PluginActivation from './components/plugin/activation';
import TeacherAnalyticsDashboard from './components/TeacherAnalytics';
import Quiz from './components/pages/QuizPage'; // Import Quiz component
import Leaderboard from './components/pages/LeaderBoard'; // Import Leaderboard component
import Training from './components/pages/TrainingPage'; // Import Training component
import Dashboard from './components/pages/Dashboard'; // Import Dashboard component
import React from 'react';
import ISLChatbot from './components/pages/Chatbot';
import { AuthProvider } from './contexts/AuthContext';
import {SocketProvider} from './contexts/SocketContext'
import VideoTranscriptionPlugin from './components/modes/plugin';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/public" element={<PublicMode />} />
          <Route path="/class/:teacherId?" element={<ClassMode />} />
          <Route path="/plugin" element={<VideoTranscriptionPlugin />} />
          {/* <Route path="/setup" element={<PluginActivation />} /> */}
          <Route path="/teacher-analytics" element={<TeacherAnalyticsDashboard />} />
          <Route path="/quiz" element={<Quiz />} /> {/* Quiz route */}
          <Route path="/chatbot" element={<ISLChatbot />} /> {/* Chatbot route */}
          <Route path="/leaderboard" element={<Leaderboard />} /> {/* Leaderboard route */}
          <Route path="/training" element={<Training />} /> {/* Training route */}
          <Route path="/dashboard" element={<Dashboard />} /> {/* Dashboard route */}
          <Route path="*" element={<Navigate to="/" replace />} /> {/* Fallback route */}
          
        </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRouter;