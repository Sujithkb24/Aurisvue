import React,{ useState, useEffect } from 'react';
import { Settings, AlertTriangle, Info, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import HomePage from './components/HomePage';
import QuickAccessWidget from './components/plugin/access_widget';
import SettingsPanel from './components/Settings';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';

const App = ({ showLogin = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Core app state
  const [darkMode, setDarkMode] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [platform, setPlatform] = useState('web'); // 'web', 'android', 'ios'
  const [translationActive, setTranslationActive] = useState(false);
  
  // Detect platform on mount
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setPlatform('ios');
    } else if (/android/i.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('web');
    }
    
    // Check if setup was previously completed
    const setupStatus = localStorage.getItem('islSetupComplete');
    if (setupStatus === 'true') {
      setSetupComplete(true);
    }
  }, []);
  
  // Save setup status
  useEffect(() => {
    localStorage.setItem('islSetupComplete', setupComplete);
  }, [setupComplete]);
  
  // Navigation functions
  const navigateToMode = (mode) => {
    if (mode === 'plugin' && !setupComplete) {
      // Need to go through setup first
      navigate('/setup');
    } else {
      navigate(`/${mode}`);
    }
  };
  
  const navigateToHome = () => {
    navigate('/');
    setTranslationActive(false);
  };
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  // Plugin specific functions
  const completeSetup = () => {
    setSetupComplete(true);
    navigate('/plugin');
  };
  
  const toggleWidget = () => {
    setShowWidget(!showWidget);
  };
  
  const handleActivate = (isActive) => {
    setTranslationActive(isActive);
    if (isActive && location.pathname === '/') {
      navigate('/plugin');
    }
  };
  
  const openSettings = () => {
    setShowSettings(true);
  };
  
  const closeSettings = () => {
    setShowSettings(false);
  };
  
  // Show Login if on login route
  if (showLogin || location.pathname === '/login') {
    return (
      <div className={darkMode ? "bg-gray-900 text-white min-h-screen" : "bg-gray-100 text-gray-900 min-h-screen"}>
        <Login darkMode={darkMode} />
      </div>
    );
  }
  if (location.pathname === '/signup') {
    return (
      <div className={darkMode ? "bg-gray-900 text-white min-h-screen" : "bg-gray-100 text-gray-900 min-h-screen"}>
        <Signup darkMode={darkMode} />
      </div>
    );
  }
  // Main app with widget when appropriate
  return (
    <div className={darkMode ? "bg-gray-900 text-white min-h-screen" : "bg-gray-100 text-gray-900 min-h-screen"}>
      <HomePage
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        navigateToMode={navigateToMode}
        navigateToHome={navigateToHome}
        activeMode={location.pathname.substring(1) || null}
      />
      
      {/* Floating widget when enabled */}
      {showWidget && (
        <QuickAccessWidget 
          darkMode={darkMode}
          onActivate={handleActivate}
          onSettings={openSettings}
          isVisible={true}
        />
      )}
      
      {/* Widget toggle button */}
      <button
        onClick={toggleWidget}
        className={`fixed bottom-6 left-6 p-3 rounded-full shadow-lg ${
          darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
      >
        {showWidget ? <X size={20} /> : <Info size={20} />}
      </button>
      
      {/* Settings panel */}
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