import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Mic, 
  ArrowRight, 
  Sun, 
  Moon, 
  Star, 
  BookOpen, 
  Chrome, 
  BarChart2,
  Layout,
  Home,
  X
} from 'react-feather';
import Header from './header';
import FloatingActionButton from './ActionButton';
import TeacherSelectionModal from './TeacherSelection';
import QuickAccessWidget from './plugin/access_widget';
import HeroSection from './ui/HeroSection';
import { Book, Play } from 'lucide-react';
import Training from './pages/TrainingPage';
import Footer from './pages/footer';


const HomePage = ({ darkMode, toggleDarkMode, navigateToMode, navigateToHome, activeMode }) => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Animation for page load
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigateToMode = (mode) => {
    if (mode === 'class') {
      navigate('/login'); // Navigate to the login page
    } else {
      navigateToMode(mode);
    }
  };

  // Card data for consistent styling and easier maintenance
  const cards = [
    {
      id: 'public',
      title: 'Public Mode',
      description: 'Real-time ISL translation for on-the-go communication',
      icon: <Mic size={24} />,
      color: 'blue'
    },
    {
      id: 'class',
      title: 'Interact Mode',
      description: 'ISL translation for classroom environments with Q&A support',
      icon: <BookOpen size={24} />,
      color: 'purple'
    },
    {
      id: 'yt',
      title: 'Plugin Mode',
      description: 'Browser extension for ISL translation of online video content',
      icon: <Chrome size={24} />,
      color: 'green'
    },
    {
      id: 'Training',
      title: 'Training',
      description: 'Train with interactive 3D model',
      icon: <Play size={24} />,
      color: 'orange'
    }
  ];

  // Get the color class based on color name and mode
  const getColorClass = (color) => {
    const colorMap = {
      blue: darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-400',
      purple: darkMode ? 'bg-purple-600 hover:bg-purple-500' : 'bg-purple-500 hover:bg-purple-400',
      green: darkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-500 hover:bg-green-400',
      orange: darkMode ? 'bg-orange-600 hover:bg-orange-500' : 'bg-orange-500 hover:bg-orange-400'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className={`flex flex-col min-h-screen w-full transition-colors duration-500 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Header title="AurisVue" darkMode={darkMode} />
      
      {/* Dark mode toggle */}
      <div className="fixed z-50 top-4 right-4">
        <button 
          onClick={toggleDarkMode} 
          className={`p-3 rounded-full shadow-lg transition-all ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'}`}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={20} className="text-yellow-300" /> : <Moon size={20} className="text-gray-700" />}
        </button>
      </div>
      
      {/* Hero section with improved branding */}
      {/* <div className={`relative overflow-hidden py-20 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute w-64 h-64 transform bg-blue-500 rounded-full -rotate-12 -left-10 -top-20"></div>
          <div className="absolute w-48 h-48 transform bg-purple-500 rounded-full rotate-12 right-20 bottom-10"></div>
          <div className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-green-500 rounded-full top-1/2 left-1/2 w-96 h-96 opacity-20"></div>
        </div>
        
        <div className="container relative z-10 px-6 mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <div className={`inline-flex items-center justify-center p-2 mb-6 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <span className="flex items-center px-3 py-1 text-sm font-medium">
                <Star size={16} className={`mr-2 ${darkMode ? 'text-yellow-300' : 'text-blue-500'}`} /> 
                Audio to Indian Sign Language
              </span>
            </div>
            
            <h1 className={`text-5xl md:text-6xl font-bold mb-6 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              AurisVue
            </h1>
            
            <p className={`text-xl md:text-2xl ${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto mb-10 transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              Where every word meets its sign
            </p>
            
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => handleNavigateToMode('public')} 
                className={`px-6 py-3 rounded-lg font-medium flex items-center transition-all transform hover:scale-105 ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-400'} text-white`}
              >
                Get Started <ArrowRight size={18} className="ml-2" />
              </button>
              
              <button 
                onClick={() => navigate('/about')} 
                className={`px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div> */}
      <HeroSection darkMode={darkMode} modelPath="/models/Orc.fbx"/>
      
      {/* Main content with cards - improved layout and animations */}
      <div className="container px-6 py-20 mx-auto">
        <h2 className={`text-7xl font-bold mb-14 text-center ${darkMode ? 'text-blue-500' : 'text-gray-800'}`}>
          Choose a Mode
        </h2>
        
        <div id='cards' className="grid max-w-6xl grid-cols-1 gap-8 mx-auto md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <button 
              key={card.id}
              onClick={() => handleNavigateToMode(card.id)}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`group relative p-6 rounded-2xl flex flex-col transition-all duration-300 transform ${hoveredCard === card.id ? 'scale-105 shadow-xl' : 'scale-100 shadow-md'} ${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'}`}
            >
              <div className={`mb-6 p-4 rounded-xl ${getColorClass(card.color)} text-white transition-all duration-300 group-hover:scale-110 items-center justify-center`}>
                <div className='items-center justify-center px-14'>
                {card.icon}
                </div>           
              </div>
              
              <h3 className="mb-3 text-xl font-bold">{card.title}</h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>{card.description}</p>
              
              <div className={`absolute bottom-6 right-6 transition-all duration-300 opacity-0 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 ${getColorClass(card.color)} text-white p-2 rounded-full`}>
                <ArrowRight size={16} />
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Features section - improved styling */}
      <div className={`py-20 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
  <div className="container px-6 mx-auto">
    <h2 className={`text-7xl font-bold mb-16 text-center ${darkMode ? 'text-cyan-500' : 'text-gray-900'}`}>
      Key Features
    </h2>

    <div className="grid max-w-6xl grid-cols-1 gap-10 mx-auto md:grid-cols-3">
      {/* Speech Recognition */}
      <div
        className={`p-6 rounded-2xl transition-transform transform hover:scale-105 shadow-lg 
        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
      >
        <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
          <Mic size={24} />
        </div>
        <h3 className="mb-2 text-xl font-semibold">Speech Recognition</h3>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Advanced real-time audio processing for accurate speech-to-text conversion.
        </p>
      </div>

      {/* 3D Visualization */}
      <div
        className={`p-6 rounded-2xl transition-transform transform hover:scale-105 shadow-lg 
        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
      >
        <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <Layout size={24} />
        </div>
        <h3 className="mb-2 text-xl font-semibold">3D Visualization</h3>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          High-quality 3D rendering of ISL gestures with natural movements.
        </p>
      </div>

      {/* Customization */}
      <div
        className={`p-6 rounded-2xl transition-transform transform hover:scale-105 shadow-lg 
        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
      >
        <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-white text-xl font-bold">
          🎛️
        </div>
        <h3 className="mb-2 text-xl font-semibold">Customization</h3>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Personalized settings for speed, gestures, and learning preferences.
        </p>
      </div>
    </div>
  </div>
</div>

      
      {/* Call to action - improved styling */}
      <div className="container px-6 py-24 mx-auto">
  <div
    className={`max-w-4xl mx-auto text-center p-12 rounded-3xl shadow-xl transition-transform duration-300 hover:scale-105 
    ${darkMode ? 'bg-gradient-to-r from-blue-900 to-blue-950' : 'bg-gradient-to-br from-white via-blue-50 to-blue-100'}`}
  >
    <h2 className={`text-4xl font-extrabold mb-4 tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      Ready to get started?
    </h2>

    <p className={`mb-10 text-lg leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
      Choose a mode that fits your needs and start breaking communication barriers today.
    </p>

    <button
      onClick={() => handleNavigateToMode('public')}
      className={`px-8 py-4 rounded-xl text-lg font-semibold shadow-md transition duration-300 ease-in-out transform hover:scale-105 
      ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-400'} text-white`}
    >
      Start Using AurisVue
    </button>
  </div>
</div>

      
      {/* Floating Action Button for quick access */}
      <FloatingActionButton 
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        navigateToMode={navigateToMode}
        navigateToHome={navigateToHome}
        activeMode={activeMode}
      />
      <Footer/>
    </div>
  );
};

export default HomePage;