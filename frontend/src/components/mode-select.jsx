import { Mic, BookOpen, ExternalLink } from 'lucide-react';

const ModeSelector = ({ activeMode, setActiveMode, darkMode = true }) => {
  return (
    <div className={`flex justify-center space-x-2 p-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <button 
        onClick={() => setActiveMode('public')} 
        className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${activeMode === 'public' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')}`}
      >
        <Mic size={18} />
        <span className="hidden sm:inline">Public Mode</span>
      </button>
      <button 
        onClick={() => setActiveMode('class')} 
        className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${activeMode === 'class' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')}`}
      >
        <BookOpen size={18} />
        <span className="hidden sm:inline">Class Mode</span>
      </button>
      <button 
        onClick={() => setActiveMode('plugin')} 
        className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${activeMode === 'plugin' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')}`}
      >
        <ExternalLink size={18} />
        <span className="hidden sm:inline">Plugin Mode</span>
      </button>
    </div>
  );
};

export default ModeSelector;