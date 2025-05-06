import React, { useState } from 'react';
import { Mic, BookOpen, Home, Info, Settings, X, Chrome, BarChart2 } from 'lucide-react';
import SettingsPanel from './Settings';

// ModeSelector Component 
const ModeSelector = ({ activeMode, setActiveMode, darkMode }) => {
  const modes = [
    {
      id: 'public',
      name: 'Public Mode',
      icon: <Mic size={18} />,
      color: 'blue'
    },
    {
      id: 'class',
      name: 'Interact Mode',
      icon: <BookOpen size={18} />,
      color: 'purple'
    },
    {
      id: 'plugin',
      name: 'Plugin Mode',
      icon: <Chrome size={18} />,
      color: 'green'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: <BarChart2 size={18} />,
      color: 'orange'
    }
  ];

  // Get the color class based on color name and active state
  const getColorClass = (color, isActive) => {
    if (isActive) {
      return {
        blue: darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white',
        purple: darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white',
        green: darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white',
        orange: darkMode ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white'
      }[color];
    }
    
    return darkMode 
      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300';
  };

  return (
    <div className="flex flex-col space-y-2">
      {modes.map(mode => (
        <button
          key={mode.id}
          onClick={() => setActiveMode(mode.id)}
          className={`flex items-center px-3 py-2 rounded-lg transition-colors
                    ${getColorClass(mode.color, activeMode === mode.id)}`}
        >
          <span className="mr-2">{mode.icon}</span>
          {mode.name}
        </button>
      ))}
    </div>
  );
};

// FloatingActionButton Component
const FloatingActionButton = ({ darkMode, toggleDarkMode, navigateToMode, navigateToHome, activeMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Close mode selector if open
    if (showModeSelector) setShowModeSelector(false);
  };

  const toggleActive = () => {
    setIsActive(!isActive);
  };

  const toggleModeSelector = () => {
    setShowModeSelector(!showModeSelector);
    // Close main menu if open
    if (isExpanded) setIsExpanded(false);
  };

  const handleModeChange = (mode) => {
    if (navigateToMode) {
      navigateToMode(mode);
    }
    console.log('Mode changed to:', mode);
    setShowModeSelector(false);
  };

  const handleActionClick = (action) => {
    // Handle different actions
    switch (action) {
      case 'translate':
        toggleActive();
        console.log('Translation toggled:', !isActive);
        break;
      case 'modes':
        toggleModeSelector();
        break;
      case 'home':
        if (navigateToHome) {
          navigateToHome();
        }
        break;
      case 'info':
        console.log('Info clicked');
        break;
      case 'settings':
        console.log('Settings clicked');
        setShowSettings(true);
        break;
      default:
        break;
    }
    
    // Collapse the menu after action (except for modes)
    if (action !== 'modes') {
      setIsExpanded(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel 
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode} 
          onClose={() => setShowSettings(false)}
          platform="web"
        />
      )}
      
      {/* Mode Selector Overlay */}
      {showModeSelector && (
        <div className={`absolute bottom-20 right-0 w-64 p-4 rounded-lg shadow-lg
                        ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-base font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            Switch Mode
          </h3>
          
          <ModeSelector 
            activeMode={activeMode} 
            setActiveMode={handleModeChange} 
            darkMode={darkMode} 
          />
          
          <button 
            onClick={() => setShowModeSelector(false)}
            className={`absolute top-3 right-3 p-1 rounded-full
                      ${darkMode ? 'text-gray-400 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <X size={18} />
          </button>
        </div>
      )}
      
      {/* Main FAB Container */}
      <div className={`relative flex flex-col items-center ${isExpanded ? 'expanded' : ''}`}>
        {isExpanded && (
          <div className="flex flex-col-reverse gap-4 mb-4">
            <button 
              onClick={() => handleActionClick('translate')} 
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md
                        transition-all hover:scale-110 group
                        ${isActive 
                          ? 'bg-red-500 text-white' 
                          : darkMode 
                            ? 'bg-gray-800 text-white' 
                            : 'bg-white text-gray-700'}`}
            >
              <Mic size={20} />
              <span className={`absolute right-full mr-2 px-2 py-1 rounded whitespace-nowrap text-sm
                              opacity-0 group-hover:opacity-100 transition-opacity
                              ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                Start Translation
              </span>
            </button>
            
            <button 
              onClick={() => handleActionClick('modes')} 
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md
                        transition-all hover:scale-110 group
                        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-700'}`}
            >
              <BookOpen size={20} />
              <span className={`absolute right-full mr-2 px-2 py-1 rounded whitespace-nowrap text-sm
                              opacity-0 group-hover:opacity-100 transition-opacity
                              ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                Switch Mode
              </span>
            </button>

            <button 
              onClick={() => handleActionClick('home')} 
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md
                        transition-all hover:scale-110 group
                        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-700'}`}
            >
              <Home size={20} />
              <span className={`absolute right-full mr-2 px-2 py-1 rounded whitespace-nowrap text-sm
                              opacity-0 group-hover:opacity-100 transition-opacity
                              ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                Go Home
              </span>
            </button>
            
            <button 
              onClick={() => handleActionClick('info')} 
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md
                        transition-all hover:scale-110 group
                        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-700'}`}
            >
              <Info size={20} />
              <span className={`absolute right-full mr-2 px-2 py-1 rounded whitespace-nowrap text-sm
                              opacity-0 group-hover:opacity-100 transition-opacity
                              ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                Help
              </span>
            </button>
            
            <button 
              onClick={() => handleActionClick('settings')} 
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md
                        transition-all hover:scale-110 group
                        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-700'}`}
            >
              <Settings size={20} />
              <span className={`absolute right-full mr-2 px-2 py-1 rounded whitespace-nowrap text-sm
                              opacity-0 group-hover:opacity-100 transition-opacity
                              ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                Settings
              </span>
            </button>
          </div>
        )}
        
        <button 
          onClick={toggleExpand}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg 
                    transition-transform active:scale-100
                    ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-400'}
                    text-white z-10`}
        >
          {isExpanded ? <X size={24} /> :  <img src="/AurisVue_logo.png" alt="AurisVue Logo" style={{ height: 'auto', width: 'auto' }} />}
          <div className={`absolute inset-0 rounded-full border-0 
                        ${darkMode ? 'border-blue-500' : 'border-blue-400'}
                        transition-all duration-300`}>
          </div>
        </button>
      </div>
    </div>
  );
};

export default FloatingActionButton;