import React from 'react';
import { Mic, BookOpen, Chrome, BarChart2 } from 'react-feather';

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
      name: 'Class Mode',
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

export default ModeSelector;