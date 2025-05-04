import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import PublicMode from './components/modes/public';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ClassMode from './components/modes/class';
import PluginMode from './components/modes/plugin';
import PluginActivation from './components/plugin/activation';
import TeacherAnalyticsDashboard from './components/TeacherAnalytics';
import React from 'react';
import { AuthProvider } from './contexts/AuthContext'; // Import AuthProvider

const AppRouter = () => {
  return (
    <BrowserRouter>
      <AuthProvider> {/* Wrap the component tree with AuthProvider */}
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/public" element={<PublicMode />} />
          <Route path="/class/:teacherId?" element={<ClassMode />} />
          <Route path="/plugin" element={<PluginMode />} />
          <Route path="/setup" element={<PluginActivation />} />
          <Route path="/analytics" element={<TeacherAnalyticsDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRouter;