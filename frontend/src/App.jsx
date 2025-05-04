import React, { useState, useEffect } from 'react';
import { Settings, Info, X } from 'lucide-react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';

import HomePage from './components/HomePage';
import QuickAccessWidget from './components/plugin/access_widget';
import SettingsPanel from './components/Settings';
import Login from './components/auth/Login';
import TrainingPage from './components/pages/TrainingPage';
import QuizPage from './components/pages/QuizPage';
import LeaderboardPage from './components/pages/LeaderBoard';

const App = ({ showLogin = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [platform, setPlatform] = useState('web');
  const [translationActive, setTranslationActive] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setPlatform('ios');
    } else if (/android/i.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('web');
    }

    const setupStatus = localStorage.getItem('islSetupComplete');
    if (setupStatus === 'true') {
      setSetupComplete(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('islSetupComplete', setupComplete);
  }, [setupComplete]);

  const navigateToMode = (mode) => {
    if (mode === 'plugin' && !setupComplete) {
      navigate('/setup');
    } else {
      navigate(`/${mode}`);
    }
  };

  const navigateToHome = () => {
    navigate('/');
    setTranslationActive(false);
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const completeSetup = () => {
    setSetupComplete(true);
    navigate('/plugin');
  };

  const toggleWidget = () => setShowWidget(!showWidget);

  const handleActivate = (isActive) => {
    setTranslationActive(isActive);
    if (isActive && location.pathname === '/') {
      navigate('/plugin');
    }
  };

  const openSettings = () => setShowSettings(true);
  const closeSettings = () => setShowSettings(false);

  if (showLogin || location.pathname === '/login') {
    return (
      <div className={darkMode ? "bg-gray-900 text-white min-h-screen" : "bg-gray-100 text-gray-900 min-h-screen"}>
        <Login darkMode={darkMode} />
      </div>
    );
  }

  return (
    <div className={darkMode ? "bg-gray-900 text-white min-h-screen" : "bg-gray-100 text-gray-900 min-h-screen"}>
      {/* Navigation header - can be moved to a separate component */}
      <nav className="p-4 flex items-center justify-between">
        <h1 
          onClick={navigateToHome}
          className="text-xl font-bold cursor-pointer"
        >
          Your App Name
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => navigateToMode('quiz')}
            className={`px-4 py-2 rounded ${
              location.pathname === '/quiz' 
                ? (darkMode ? 'bg-blue-600' : 'bg-blue-500') 
                : (darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200')
            }`}
          >
            Quiz
          </button>
          <button
            onClick={() => navigateToMode('training')}
            className={`px-4 py-2 rounded ${
              location.pathname === '/training' 
                ? (darkMode ? 'bg-blue-600' : 'bg-blue-500') 
                : (darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200')
            }`}
          >
            Training
          </button>
          <button
            onClick={() => navigateToMode('leaderboard')}
            className={`px-4 py-2 rounded ${
              location.pathname === '/leaderboard' 
                ? (darkMode ? 'bg-blue-600' : 'bg-blue-500') 
                : (darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200')
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={toggleDarkMode}
            className={`px-4 py-2 rounded ${
              darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
            }`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* Main content area that changes based on route */}
      <main className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<HomePage 
            darkMode={darkMode} 
            navigateToMode={navigateToMode} 
          />} />
          <Route path="/leaderboard" element={<LeaderboardPage darkMode={darkMode} />} />
          <Route path="/training" element={<TrainingPage darkMode={darkMode} />} />
          <Route path="/quiz" element={<QuizPage darkMode={darkMode} />} />
          {/* Add more routes like /plugin, /setup, etc. */}
        </Routes>
      </main>

      {/* Floating widget button */}
      <button
        onClick={toggleWidget}
        className={`fixed bottom-6 left-6 p-3 rounded-full shadow-lg ${
          darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
      >
        {showWidget ? <X size={20} /> : <Info size={20} />}
      </button>

      {/* Conditional rendering of widget and settings */}
      {showWidget && (
        <QuickAccessWidget
          darkMode={darkMode}
          onActivate={handleActivate}
          onSettings={openSettings}
          isVisible={true}
        />
      )}

      {showSettings && (
        <SettingsPanel
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          onClose={closeSettings}
          platform={platform}
        />
      )}
    </div>
  );
};

export default App;