import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import PublicMode from './components/modes/public';
import ClassMode from './components/modes/class';
import PluginMode from './components/modes/plugin';
import PluginActivation from './components/plugin/activation';
import TeacherAnalyticsDashboard from './components/TeacherAnalytics';
import React from 'react';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/public" element={<PublicMode />} />
        <Route path="/class/:teacherId?" element={<ClassMode />} />
        <Route path="/plugin" element={<PluginMode />} />
        <Route path="/setup" element={<PluginActivation />} />
        <Route path="/analytics" element={<TeacherAnalyticsDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;