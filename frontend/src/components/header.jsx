import { ChevronLeft, Volume2, Settings } from 'lucide-react';
import React from 'react';

const Header = ({ title = "AurisVue", showBackButton = false, onBack, darkMode = true }) => {
  return (
    <header className={`flex justify-between items-center px-4 py-3 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
      <div className="flex items-center space-x-2">
        {showBackButton && (
          <button onClick={onBack} className="p-1 rounded-full hover:bg-gray-700">
            <ChevronLeft size={24} />
          </button>
        )}
        <img src="/AurisVue_logo.png" alt="AurisVue Logo" style={{ height: '50px', width: 'auto' }} />
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div>
        <button className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;