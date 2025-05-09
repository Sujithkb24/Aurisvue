import { ChevronLeft, Volume2 } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
const Header = ({ title = "AurisVue", showBackButton = false, onBack, darkMode = true }) => {
  const navigate = useNavigate();
  const handleNavigateToMode = () => {
    navigate(`/`);
  };
  return (
    <header className={`flex justify-between items-center px-4 py-4 ${darkMode ? 'g-gradient-to-br from-black to-blue-950' : 'bg-white'} shadow-md`}>
      <div className="flex items-center space-x-2">
        {showBackButton && (
          <button  onClick={() => handleNavigateToMode()} className="p-1 rounded-full hover:bg-gray-700">
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>
      <div>
      
      </div>
    </header>
  );
};

export default Header;