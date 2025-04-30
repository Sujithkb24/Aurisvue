import { useState, useEffect } from 'react';
import { Settings, AlertTriangle, Info, X } from 'lucide-react';
import Header from './components/header';
import HomePage from './components/HomePage';
import PublicMode from './components/modes/public';
import ClassMode from './components/modes/class';
import PluginMode from './components/modes/plugin';
import PluginActivation from './components/plugin/activation';
import QuickAccessWidget from './components/plugin/access_widget';
// import SettingsPanel from './components/settings/SettingsPanel';

const App = () => {
  // Core app state
  const [darkMode, setDarkMode] = useState(true);
  const [activeMode, setActiveMode] = useState(null);
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
    setActiveMode(mode);
    if (mode === 'plugin' && !setupComplete) {
      // Need to go through setup first
      startSetup();
    }
  };
  
  const navigateToHome = () => {
    setActiveMode(null);
    setTranslationActive(false);
  };
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  // Plugin specific functions
  const startSetup = () => {
    setActiveMode('setup');
  };
  
  const completeSetup = () => {
    setSetupComplete(true);
    setActiveMode('plugin');
  };
  
  const toggleWidget = () => {
    setShowWidget(!showWidget);
  };
  
  const handleActivate = (isActive) => {
    setTranslationActive(isActive);
    if (isActive && !activeMode) {
      setActiveMode('plugin');
    }
  };
  
  const openSettings = () => {
    setShowSettings(true);
  };
  
  const closeSettings = () => {
    setShowSettings(false);
  };
  
  // Render the appropriate view based on state
  if (activeMode === 'setup') {
    return <PluginActivation darkMode={darkMode} onContinue={completeSetup} />;
  }
  
  if (activeMode === 'public') {
    return <PublicMode darkMode={darkMode} onBack={navigateToHome} />;
  }
  
  if (activeMode === 'class') {
    return <ClassMode darkMode={darkMode} onBack={navigateToHome} />;
  }
  
  if (activeMode === 'plugin') {
    return <PluginMode darkMode={darkMode} onBack={navigateToHome} />;
  }
  
  // Main app with widget when appropriate
  return (
    <div className={darkMode ? "bg-gray-900 text-white min-h-screen" : "bg-gray-100 text-gray-900 min-h-screen"}>
      <HomePage
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        navigateToMode={navigateToMode}
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

// For demonstration purposes only, settings panel simplified component
const SettingsPanel = ({ darkMode, toggleDarkMode, onClose, platform }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-md rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 mx-4`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">ISL Translator Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Dark Mode</span>
            <button 
              onClick={toggleDarkMode} 
              className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
            >
              {darkMode ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          
          <div className="pt-2 border-t border-gray-700">
            <h3 className="font-medium mb-2">Platform Settings</h3>
            <div className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p>Current platform: <span className="font-medium">{platform}</span></p>
              {platform === 'web' && (
                <p className="mt-2 text-sm text-yellow-400 flex items-center">
                  <AlertTriangle size={16} className="mr-1" />
                  Install our Chrome extension for better experience
                </p>
              )}
            </div>
          </div>
          
          <div className="pt-2 border-t border-gray-700">
            <h3 className="font-medium mb-2">Translation Settings</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Translation Quality</span>
                <select className={`px-2 py-1.5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <option>Low</option>
                  <option selected>Medium</option>
                  <option>High</option>
                </select>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Auto-start on videos</span>
                <button className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  Enabled
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose}
            className={`px-4 py-2 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;