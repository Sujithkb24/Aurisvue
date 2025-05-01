import { useState } from 'react';
import { Sun, Moon, Mic, BookOpen, Chrome, BarChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from './header';
import TeacherSelectionModal from './TeacherSelection';
import FloatingActionButton from './ActionButton';

const HomePage = ({ darkMode, toggleDarkMode, navigateToMode, navigateToHome, activeMode }) => {
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const navigate = useNavigate();

  const handleNavigateToMode = (mode) => {
    if (mode === 'class') {
      setShowTeacherModal(true);
    } else {
      navigateToMode(mode);
    }
  };
  const navigateToHome = () =>{
    navigate('/');
  }

  const handleTeacherSelect = (teacherId) => {
    setShowTeacherModal(false);
    navigate(`/class/${teacherId}`);
  };

  return (
    <div className={`flex flex-col min-h-screen w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Header title="AurisVue" darkMode={darkMode} />
      
      {/* Dark mode toggle */}
      <div className="flex justify-end p-4">
        <button 
          onClick={toggleDarkMode} 
          className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">AurisVue</h1>
          <p className="text-xl">Audio to Indian Sign Language Converter</p>
        </div>
        
        {/* Mode selection grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl w-full">
          {/* Public Mode Card */}
          <button 
            onClick={() => handleNavigateToMode('public')} 
            className={`p-8 rounded-xl flex flex-col items-center text-center ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow-lg transition-colors`}
          >
            <div className={`mb-4 p-4 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
              <Mic size={24} />
            </div>
            <h2 className="text-xl font-bold mb-2">Public Mode</h2>
            <p>Real-time ISL translation for on-the-go communication</p>
          </button>
          
          {/* Class Mode Card */}
          <button 
            onClick={() => handleNavigateToMode('class')} 
            className={`p-8 rounded-xl flex flex-col items-center text-center ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow-lg transition-colors`}
          >
            <div className={`mb-4 p-4 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
              <BookOpen size={24} />
            </div>
            <h2 className="text-xl font-bold mb-2">Class Mode</h2>
            <p>ISL translation for classroom environments with Q&A support</p>
          </button>
          
          {/* Plugin Mode Card */}
          <button 
            onClick={() => handleNavigateToMode('plugin')} 
            className={`p-8 rounded-xl flex flex-col items-center text-center ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow-lg transition-colors`}
          >
            <div className={`mb-4 p-4 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
              <Chrome size={24} />
            </div>
            <h2 className="text-xl font-bold mb-2">Plugin Mode</h2>
            <p>Browser extension for ISL translation of online video content</p>
          </button>

          {/* Analytics Dashboard Card */}
          <button 
            onClick={() => handleNavigateToMode('analytics')} 
            className={`p-8 rounded-xl flex flex-col items-center text-center ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} shadow-lg transition-colors`}
          >
            <div className={`mb-4 p-4 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
              <BarChart size={24} />
            </div>
            <h2 className="text-xl font-bold mb-2">Analytics</h2>
            <p>View usage statistics and performance metrics</p>
          </button>
        </div>
      </div>
      
      {/* Floating Action Button for quick access */}
      <FloatingActionButton 
        darkMode={darkMode}
        navigateToMode={navigateToMode}
        navigateToHome={navigateToHome}
        activeMode={activeMode}
      />
      
      {/* Teacher Selection Modal */}
      {showTeacherModal && (
        <TeacherSelectionModal 
          darkMode={darkMode}
          onClose={() => setShowTeacherModal(false)}
          onSelect={handleTeacherSelect}
        />
      )}
    </div>
  );
};

export default HomePage;