import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Moon, 
  Sun, 
  ChevronRight, 
  BarChart3, 
  Users, 
  Award, 
  BookOpen, 
  LogOut, 
  Sparkles
} from 'lucide-react';
import TeacherSelectionModal from '../TeacherSelection';

const Dashboard = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [activeCardIndex, setActiveCardIndex] = useState(null);
  const [isWelcomeHovered, setIsWelcomeHovered] = useState(false);
  const mainRef = useRef(null);
  
  const navigate = useNavigate();
  
  const { 
    currentUser, 
    userRole, 
    userSchool, 
    logout, 
    getSchoolInfo 
  } = useAuth();

  // Track cursor position for spotlight effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (mainRef.current) {
        const rect = mainRef.current.getBoundingClientRect();
        setCursorPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    // Load school info if available
    if (userSchool) {
      const fetchSchoolInfo = async () => {
        try {
          const schoolData = await getSchoolInfo(userSchool);
          setSchoolInfo(schoolData);
        } catch (error) {
          console.error("Error fetching school info:", error);
        }
      };
      
      fetchSchoolInfo();
    }
    
    // Set user information
    if (currentUser) {
      setUserInfo({
        name: currentUser.displayName || currentUser.email.split('@')[0],
        email: currentUser.email,
        uid: currentUser.uid
      });
    }
  }, [currentUser, userSchool, getSchoolInfo]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleTeacherSelect = (teacherId) => {
    setShowTeacherModal(false);
    navigate(`/class/${teacherId}`);
  };

  // Teacher-specific teaching tools
  const teacherTools = [
    { 
      icon: <BarChart3 size={20} />, 
      label: 'Analytics Dashboard', 
      description: 'View detailed insights and performance metrics for your classes.',
      color: 'from-violet-600 to-fuchsia-600',
      ctaText: 'Explore your classroom insights',
      characterImg: '/assets/characters/teacher-analytics.svg',
      onClick: () => navigate('/teacher-analytics')
    },
    { 
      icon: <BookOpen size={20} />, 
      label: 'Classroom', 
      description: 'Start or manage your ongoing interactive classes.',
      color: 'from-blue-600 to-indigo-600',
      ctaText: 'Start an interactive session now',
      characterImg: '/assets/characters/teacher-classroom.svg',
      onClick: () => navigate(`/class/${currentUser?.uid}`) 
    }
  ];

  // Student-specific learning tools
  const studentTools = [
    { 
      icon: <BookOpen size={20} />,
      label: 'Join Classroom', 
      description: 'Connect with your teacher and participate in live sessions.',
      color: 'from-blue-600 to-indigo-600',
      ctaText: 'Connect with your teacher now',
      characterImg: '/assets/characters/student-classroom.svg',
      onClick: () => setShowTeacherModal(true) 
    }
  ];

  // Common tools for both teachers and students
  const commonTools = [
    { 
      icon: <Award size={20} />,
      label: 'Leaderboard', 
      description: 'Explore achievements and rankings across the platform.',
      color: 'from-amber-600 to-orange-600',
      ctaText: 'See where you rank today',
      characterImg: '/assets/characters/leaderboard-character.svg',
      onClick: () => navigate('/leaderboard') 
    },
    { 
      icon: <Users size={20} />,
      label: 'Quiz Section', 
      description: 'Challenge yourself with engaging quiz activities.',
      color: 'from-rose-600 to-pink-600',
      ctaText: 'Practice your signing skills',
      characterImg: '/assets/characters/quiz-character.svg',
      onClick: () => navigate('/quiz') 
    }
  ];

  // Generate gradient based on user role
  const headerGradient = userRole === 'teacher'
    ? darkMode 
      ? 'bg-gradient-to-r from-purple-900 to-indigo-800'
      : 'bg-gradient-to-r from-purple-500 to-indigo-400'
    : darkMode
      ? 'bg-gradient-to-r from-blue-900 to-teal-800'
      : 'bg-gradient-to-r from-blue-500 to-teal-400';

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
    }`}>
      {/* Fixed header with dark mode toggle */}
      <header className={`sticky top-0 z-10 backdrop-blur-md bg-opacity-90 ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      } shadow-lg`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
          <img src="/AurisVue_logo.png" alt="AurisVue Logo" style={{ height: '50px', width: 'auto' }} />
            <h1 className="text-xl font-bold">AurisVue Interact</h1>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-amber-400' 
                : 'bg-gray-200 hover:bg-gray-300 text-amber-600'
            }`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main ref={mainRef} className="container mx-auto px-4 py-6 pb-24 relative w-full">
        {/* Spotlight effect */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: darkMode 
              ? `radial-gradient(600px circle at ${cursorPosition.x}px ${cursorPosition.y}px, rgba(120, 120, 255, 0.15), transparent 40%)`
              : `radial-gradient(600px circle at ${cursorPosition.x}px ${cursorPosition.y}px, rgba(80, 70, 230, 0.1), transparent 40%)`
          }}
        />

        {/* Welcome card with role-specific gradient and welcome gesture on hover */}
        <div 
          className={`rounded-2xl mb-8 p-8 ${headerGradient} shadow-xl text-center relative overflow-hidden transition-all duration-300`}
          onMouseEnter={() => setIsWelcomeHovered(true)}
          onMouseLeave={() => setIsWelcomeHovered(false)}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-10"></div>
          
          {/* ISL Welcome Gesture */}
          <div className={`absolute right-10 top-1/2 transform -translate-y-1/2 transition-all duration-500 ease-in-out ${
            isWelcomeHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
          }`}>
            <img 
              src="/assets/characters/welcome-gesture.svg" 
              alt="Welcome Gesture" 
              className="h-24 w-24 object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/api/placeholder/96/96";
              }}
            />
          </div>
          
          <div className={`transition-all duration-500 ease-in-out ${
            isWelcomeHovered ? 'transform translate-x-[-30px]' : ''
          }`}>
            <h2 className="text-3xl font-bold text-white mb-3">
              Welcome, {userInfo?.name || 'User'}
            </h2>
            <p className="text-white text-opacity-90 text-lg">
              {userRole === 'teacher' ? 'Teacher Dashboard' : 'Student Dashboard'}
              {schoolInfo && ` · ${schoolInfo.name}`}
            </p>
          </div>
        </div>

        {/* Teacher-specific tools section */}
        {userRole === 'teacher' && (
          <div className="mb-8 w-full">
            <h3 className="text-xl font-bold mb-4 text-center">Teaching Tools</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {teacherTools.map((tool, index) => (
                <div
                  key={`teacher-${index}`}
                  onClick={tool.onClick}
                  onMouseEnter={() => setActiveCardIndex(`teacher-${index}`)}
                  onMouseLeave={() => setActiveCardIndex(null)}
                  className={`p-6 rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                    activeCardIndex === `teacher-${index}`
                      ? `bg-gradient-to-br ${tool.color} text-white`
                      : darkMode 
                        ? 'bg-gray-800' 
                        : 'bg-white'
                  } shadow-lg relative overflow-hidden group h-32 w-full`}
                >
                  {/* ISL Character that appears on hover */}
                  <div className={`absolute right-4 top-4 h-24 w-24 transition-all duration-500 ease-in-out ${
                    activeCardIndex === `teacher-${index}` ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
                  }`}>
                    <img 
                      src={tool.characterImg} 
                      alt="ISL Character" 
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/api/placeholder/96/96";
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between relative h-full">
                    <div className={`flex flex-col justify-center transition-all duration-500 ease-in-out ${
                      activeCardIndex === `teacher-${index}` ? 'w-3/5' : 'w-full'
                    }`}>
                      <div className={`p-3 rounded-full inline-flex mb-2 ${
                        activeCardIndex === `teacher-${index}` 
                          ? 'bg-white bg-opacity-20' 
                          : `bg-gradient-to-br ${tool.color}`
                      } shadow-inner`}>
                        <span className={activeCardIndex === `teacher-${index}` ? 'text-white' : 'text-white'}>
                          {tool.icon}
                        </span>
                      </div>
                      
                      {/* Original content - visible when not hovered */}
                      <div className={`transition-all duration-500 ease-in-out ${
                        activeCardIndex === `teacher-${index}` ? 'opacity-0 absolute' : 'opacity-100'
                      }`}>
                        <h3 className="font-medium">{tool.label}</h3>
                        <p className="text-sm opacity-70">{tool.description}</p>
                      </div>
                      
                      {/* CTA content - visible when hovered */}
                      <div className={`transition-all duration-500 ease-in-out ${
                        activeCardIndex === `teacher-${index}` ? 'opacity-100' : 'opacity-0 absolute'
                      }`}>
                        <h3 className="font-bold text-white">{tool.ctaText}</h3>
                      </div>
                    </div>
                    
                    <ChevronRight size={24} className={`transition-all duration-500 ease-in-out absolute right-4 top-1/2 transform -translate-y-1/2 ${
                      activeCardIndex === `teacher-${index}` ? 'opacity-100 text-white translate-x-0' : 'opacity-0 translate-x-4'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student-specific tools section */}
        {userRole === 'student' && (
          <div className="mb-8 w-full">
            <h3 className="text-xl font-bold mb-4 text-center">Learning Tools</h3>
            <div className="grid grid-cols-1 gap-4 w-full">
              {studentTools.map((tool, index) => (
                <div
                  key={`student-${index}`}
                  onClick={tool.onClick}
                  onMouseEnter={() => setActiveCardIndex(`student-${index}`)}
                  onMouseLeave={() => setActiveCardIndex(null)}
                  className={`p-6 rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                    activeCardIndex === `student-${index}`
                      ? `bg-gradient-to-br ${tool.color} text-white`
                      : darkMode 
                        ? 'bg-gray-800' 
                        : 'bg-white'
                  } shadow-lg relative overflow-hidden group h-32 w-full`}
                >
                  {/* ISL Character that appears on hover */}
                  <div className={`absolute right-4 top-4 h-24 w-24 transition-all duration-500 ease-in-out ${
                    activeCardIndex === `student-${index}` ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
                  }`}>
                    <img 
                      src={tool.characterImg} 
                      alt="ISL Character" 
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/api/placeholder/96/96";
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between relative h-full">
                    <div className={`flex flex-col justify-center transition-all duration-500 ease-in-out ${
                      activeCardIndex === `student-${index}` ? 'w-3/5' : 'w-full'
                    }`}>
                      <div className={`p-3 rounded-full inline-flex mb-2 ${
                        activeCardIndex === `student-${index}` 
                          ? 'bg-white bg-opacity-20' 
                          : `bg-gradient-to-br ${tool.color}`
                      } shadow-inner`}>
                        <span className="text-white">
                          {tool.icon}
                        </span>
                      </div>
                      
                      {/* Original content - visible when not hovered */}
                      <div className={`transition-all duration-500 ease-in-out ${
                        activeCardIndex === `student-${index}` ? 'opacity-0 absolute' : 'opacity-100'
                      }`}>
                        <h3 className="font-medium">{tool.label}</h3>
                        <p className="text-sm opacity-70">{tool.description}</p>
                      </div>
                      
                      {/* CTA content - visible when hovered */}
                      <div className={`transition-all duration-500 ease-in-out ${
                        activeCardIndex === `student-${index}` ? 'opacity-100' : 'opacity-0 absolute'
                      }`}>
                        <h3 className="font-bold text-white">{tool.ctaText}</h3>
                      </div>
                    </div>
                    
                    <ChevronRight size={24} className={`transition-all duration-500 ease-in-out absolute right-4 top-1/2 transform -translate-y-1/2 ${
                      activeCardIndex === `student-${index}` ? 'opacity-100 text-white translate-x-0' : 'opacity-0 translate-x-4'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common tools section for both roles */}
        <div className="mb-8 w-full">
          <h3 className="text-xl font-bold mb-4 text-center">Explore & Learn</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {commonTools.map((tool, index) => (
              <div
                key={`common-${index}`}
                onClick={tool.onClick}
                onMouseEnter={() => setActiveCardIndex(`common-${index}`)}
                onMouseLeave={() => setActiveCardIndex(null)}
                className={`p-6 rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                  activeCardIndex === `common-${index}`
                    ? `bg-gradient-to-br ${tool.color} text-white`
                    : darkMode 
                      ? 'bg-gray-800' 
                      : 'bg-white'
                } shadow-lg relative overflow-hidden group h-32 w-full`}
              >
                {/* ISL Character that appears on hover */}
                <div className={`absolute right-4 top-4 h-24 w-24 transition-all duration-500 ease-in-out ${
                  activeCardIndex === `common-${index}` ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
                }`}>
                  <img 
                    src={tool.characterImg} 
                    alt="ISL Character" 
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/api/placeholder/96/96";
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between relative h-full">
                  <div className={`flex flex-col justify-center transition-all duration-500 ease-in-out ${
                    activeCardIndex === `common-${index}` ? 'w-3/5' : 'w-full'
                  }`}>
                    <div className={`p-3 rounded-full inline-flex mb-2 ${
                      activeCardIndex === `common-${index}` 
                        ? 'bg-white bg-opacity-20' 
                        : `bg-gradient-to-br ${tool.color}`
                    } shadow-inner`}>
                      <span className="text-white">
                        {tool.icon}
                      </span>
                    </div>
                    
                    {/* Original content - visible when not hovered */}
                    <div className={`transition-all duration-500 ease-in-out ${
                      activeCardIndex === `common-${index}` ? 'opacity-0 absolute' : 'opacity-100'
                    }`}>
                      <h3 className="font-medium">{tool.label}</h3>
                      <p className="text-sm opacity-70">{tool.description}</p>
                    </div>
                    
                    {/* CTA content - visible when hovered */}
                    <div className={`transition-all duration-500 ease-in-out ${
                      activeCardIndex === `common-${index}` ? 'opacity-100' : 'opacity-0 absolute'
                    }`}>
                      <h3 className="font-bold text-white">{tool.ctaText}</h3>
                    </div>
                  </div>
                  
                  <ChevronRight size={24} className={`transition-all duration-500 ease-in-out absolute right-4 top-1/2 transform -translate-y-1/2 ${
                    activeCardIndex === `common-${index}` ? 'opacity-100 text-white translate-x-0' : 'opacity-0 translate-x-4'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User stats section */}
        <div className={`rounded-xl p-6 mb-8 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-lg text-center w-full`}>
          <h3 className="text-xl font-bold mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg group transition-all duration-300 hover:scale-105 ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <p className="text-sm opacity-70 group-hover:opacity-100 transition-opacity">Recent Sessions</p>
              <p className="text-2xl font-bold group-hover:text-amber-500 transition-colors">12</p>
            </div>
            <div className={`p-4 rounded-lg group transition-all duration-300 hover:scale-105 ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <p className="text-sm opacity-70 group-hover:opacity-100 transition-opacity">Quizzes Taken</p>
              <p className="text-2xl font-bold group-hover:text-blue-500 transition-colors">8</p>
            </div>
            <div className={`p-4 rounded-lg group transition-all duration-300 hover:scale-105 ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <p className="text-sm opacity-70 group-hover:opacity-100 transition-opacity">Leaderboard Rank</p>
              <p className="text-2xl font-bold group-hover:text-purple-500 transition-colors">#4</p>
            </div>
            <div className={`p-4 rounded-lg group transition-all duration-300 hover:scale-105 ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <p className="text-sm opacity-70 group-hover:opacity-100 transition-opacity">Achievements</p>
              <p className="text-2xl font-bold group-hover:text-green-500 transition-colors">3</p>
            </div>
          </div>
        </div>

        {/* Logout button */}
        <div className="flex justify-center">
          <button
            onClick={handleLogout}
            className={`flex items-center px-6 py-3 rounded-lg ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                : 'bg-white hover:bg-gray-100 text-gray-800'
            } shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
          >
            <LogOut size={18} className="mr-2" />
            <span>Logout</span>
          </button>
        </div>
      </main>

      {/* Teacher selection modal for students */}
      {showTeacherModal && userRole === 'student' && (
        <TeacherSelectionModal
          darkMode={darkMode}
          onClose={() => setShowTeacherModal(false)}
          onSelect={handleTeacherSelect}
          schoolId={userSchool}
        />
      )}
    </div>
  );
};

export default Dashboard;