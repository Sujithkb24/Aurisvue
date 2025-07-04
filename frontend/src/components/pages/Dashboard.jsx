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
    const fetchSchoolInfo = async () => {
      try {
         const schoolData = JSON.parse(localStorage.getItem('user_school'));
        setSchoolInfo(schoolData);
        console.log('School Info:', schoolData);
      } catch (error) {
        console.error("Error fetching school info:", error);
      }
    };
    
    // Call the function explicitly
    fetchSchoolInfo();
  }, []);
  useEffect(() => {
    // Set user information
    if (currentUser) {
      setUserInfo({
        name: localStorage.getItem('user_name') || currentUser.email.split('@')[0],
        email: currentUser.email,
        uid: currentUser.uid
      });
    }
  }, [currentUser]);

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
      video: '/assets/classroom.mp4',
      onClick: () => navigate('/teacher-analytics')
    },
    { 
      icon: <BookOpen size={20} />, 
      label: 'Classroom', 
      description: 'Start or manage your ongoing interactive classes.',
      color: 'from-blue-600 to-indigo-600',
      ctaText: 'Start an interactive session now',
      gif: '/assets/class.gif',
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
      characterImg: '/assets/class.gif',
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
      video: '/assets/rank.mp4',
      onClick: () => navigate('/leaderboard') 
    },
    { 
      icon: <Users size={20} />,
      label: 'Quiz Section', 
      description: 'Challenge yourself with engaging quiz activities.',
      color: 'from-rose-600 to-pink-600',
      ctaText: 'Practice your signing skills',
      characterImg: '/assets/characters/quiz-character.svg',
      video: '/assets/practice.mp4',
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
          {/* Fixed header with dark mode toggle - adjusted for mobile */}
          <header className={`sticky top-0 z-10 backdrop-blur-md bg-opacity-90 ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          } shadow-lg`}>
            <div className="container flex items-center justify-between px-4 py-3 mx-auto sm:py-4">
              <div className="flex items-center space-x-2">
                <img 
                  src="/AurisVue_logo.png" 
                  alt="AurisVue Logo" 
                  className="w-auto h-8 sm:h-10 md:h-12" 
                />
                <h1 className="text-lg font-bold sm:text-xl">AurisVue Interact</h1>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-amber-400' 
                    : 'bg-gray-200 hover:bg-gray-300 text-amber-600'
                }`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </header>
      
          <main ref={mainRef} className="container relative w-full px-3 py-4 pb-20 mx-auto sm:px-4 sm:py-6 sm:pb-24">
            {/* Spotlight effect */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background: darkMode 
                  ? `radial-gradient(600px circle at ${cursorPosition.x}px ${cursorPosition.y}px, rgba(120, 120, 255, 0.15), transparent 40%)`
                  : `radial-gradient(600px circle at ${cursorPosition.x}px ${cursorPosition.y}px, rgba(80, 70, 230, 0.1), transparent 40%)`
              }}
            />
      
            {/* Welcome card with role-specific gradient and welcome gesture on hover */}
            <div 
              className={`rounded-2xl mb-6 sm:mb-8 p-4 sm:p-6 md:p-8 ${headerGradient} shadow-xl text-center relative overflow-hidden transition-all duration-300`}
              onMouseEnter={() => setIsWelcomeHovered(true)}
              onMouseLeave={() => setIsWelcomeHovered(false)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-10"></div>
              
              {/* ISL Welcome Gesture - Hidden on very small screens */}
              <div className={`absolute right-6 sm:right-10 top-1/2 transform -translate-y-1/2 transition-all duration-500 ease-in-out hidden sm:block ${
                isWelcomeHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
              }`}>
                <img 
                  src="/assets/welcome.gif" 
                  alt="Welcome Gesture" 
                  className="object-contain w-16 h-16 md:h-24 md:w-24"
                  height={100}
                  width={100}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/api/placeholder/96/96";
                    
                  }}
                />
              </div>
              
              <div className={`transition-all duration-500 ease-in-out ${
                isWelcomeHovered && window.innerWidth >= 640 ? 'transform translate-x-[-20px] sm:translate-x-[-30px]' : ''
              }`}>
                <h2 className="mb-2 text-2xl font-bold text-white sm:text-3xl sm:mb-3">
                  Welcome, {userInfo?.name || 'User'}
                </h2>
                <p className="text-base text-white text-opacity-90 sm:text-lg">
                  {userRole === 'teacher' ? 'Teacher Dashboard' : 'Student Dashboard'}
                  {schoolInfo && ` · ${schoolInfo.name}`}
                </p>
              </div>
            </div>
      
            {/* Teacher-specific tools section */}
            {userRole === 'teacher' && (
              <div className="w-full mb-6 sm:mb-8">
                <h3 className="mb-3 text-lg font-bold text-center sm:text-xl sm:mb-4">Teaching Tools</h3>
                <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 sm:gap-6">
                  {teacherTools.map((tool, index) => (
                    <div
                      key={`teacher-${index}`}
                      onClick={tool.onClick}
                      onMouseEnter={() => setActiveCardIndex(`teacher-${index}`)}
                      onMouseLeave={() => setActiveCardIndex(null)}
                      className={`p-4 sm:p-6 rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                        activeCardIndex === `teacher-${index}`
                          ? `bg-gradient-to-br ${tool.color} text-white`
                          : darkMode 
                            ? 'bg-gray-800' 
                            : 'bg-white'
                      } shadow-lg relative overflow-hidden group h-28 sm:h-32 w-full`}
                    >
                      {/* ISL Character that appears on hover - Hidden on very small screens */}
                      <div className={`absolute right-4 top-4 h-24 sm:h-32 w-24 sm:w-32 transition-all duration-500 ease-in-out hidden sm:block ${
                        activeCardIndex === `teacher-${index}` ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
                      }`}>
                        {tool.video ? (
                          <video
                            src={tool.video}
                            className="object-contain w-full h-full rounded-lg"
                            style={{ maxHeight: '8rem', maxWidth: '8rem' }}
                            autoPlay
                            loop
                            muted
                            playsInline
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.poster = "/api/placeholder/96/96";
                            }}
                          />
                        ) : tool.gif ? (
                          <img
                            src={tool.gif}
                            alt="Classroom GIF"
                            className="object-contain w-full h-full"
                            style={{ maxHeight: '8rem', maxWidth: '8rem' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/assets/class.gif";
                            }}
                          />
                        ) : (
                          <img 
                            src={tool.characterImg} 
                            alt="ISL Character" 
                            className="object-contain w-full h-full"
                            style={{ maxHeight: '8rem', maxWidth: '8rem' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/api/placeholder/96/96";
                            }}
                          />
                        )}
                      </div>
                      
                      <div className="relative flex items-center justify-between h-full">
                        <div className={`flex flex-col justify-center transition-all duration-500 ease-in-out ${
                          activeCardIndex === `teacher-${index}` && window.innerWidth >= 640 ? 'w-3/5' : 'w-full'
                        }`}>
                          <div className={`p-2 sm:p-3 rounded-full inline-flex mb-2 ${
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
                            <h3 className="text-sm font-medium sm:text-base">{tool.label}</h3>
                            <p className="text-xs sm:text-sm opacity-70">{tool.description}</p>
                          </div>
                          
                          {/* CTA content - visible when hovered */}
                          <div className={`transition-all duration-500 ease-in-out ${
                            activeCardIndex === `teacher-${index}` ? 'opacity-100' : 'opacity-0 absolute'
                          }`}>
                            <h3 className="text-sm font-bold text-white sm:text-base">{tool.ctaText}</h3>
                          </div>
                        </div>
                        
                        <ChevronRight size={20} className={`transition-all duration-500 ease-in-out absolute right-4 top-1/2 transform -translate-y-1/2 ${
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
              <div className="w-full mb-6 sm:mb-8">
                <h3 className="mb-3 text-lg font-bold text-center sm:text-xl sm:mb-4">Learning Tools</h3>
                <div className="grid w-full grid-cols-1 gap-4">
                  {studentTools.map((tool, index) => (
                    <div
                      key={`student-${index}`}
                      onClick={tool.onClick}
                      onMouseEnter={() => setActiveCardIndex(`student-${index}`)}
                      onMouseLeave={() => setActiveCardIndex(null)}
                      className={`p-4 sm:p-6 rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                        activeCardIndex === `student-${index}`
                          ? `bg-gradient-to-br ${tool.color} text-white`
                          : darkMode 
                            ? 'bg-gray-800' 
                            : 'bg-white'
                      } shadow-lg relative overflow-hidden group h-28 sm:h-32 w-full`}
                    >
                      {/* ISL Character that appears on hover - Hidden on very small screens */}
                      <div className={`absolute right-4 top-4 h-16 sm:h-24 w-16 sm:w-24 transition-all duration-500 ease-in-out hidden sm:block ${
                        activeCardIndex === `student-${index}` ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
                      }`}>
                        <img 
                          src={tool.characterImg} 
                          alt="ISL Character" 
                          className="object-contain w-full h-full"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/api/placeholder/96/96";
                          }}
                        />
                      </div>
                      
                      <div className="relative flex items-center justify-between h-full">
                        <div className={`flex flex-col justify-center transition-all duration-500 ease-in-out ${
                          activeCardIndex === `student-${index}` && window.innerWidth >= 640 ? 'w-3/5' : 'w-full'
                        }`}>
                          <div className={`p-2 sm:p-3 rounded-full inline-flex mb-2 ${
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
                            <h3 className="text-sm font-medium sm:text-base">{tool.label}</h3>
                            <p className="text-xs sm:text-sm opacity-70">{tool.description}</p>
                          </div>
                          
                          {/* CTA content - visible when hovered */}
                          <div className={`transition-all duration-500 ease-in-out ${
                            activeCardIndex === `student-${index}` ? 'opacity-100' : 'opacity-0 absolute'
                          }`}>
                            <h3 className="text-sm font-bold text-white sm:text-base">{tool.ctaText}</h3>
                          </div>
                        </div>
                        
                        <ChevronRight size={20} className={`transition-all duration-500 ease-in-out absolute right-4 top-1/2 transform -translate-y-1/2 ${
                          activeCardIndex === `student-${index}` ? 'opacity-100 text-white translate-x-0' : 'opacity-0 translate-x-4'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
      
            {/* Common tools section for both roles */}
            <div className="w-full mb-6 sm:mb-8">
              <h3 className="mb-3 text-lg font-bold text-center sm:text-xl sm:mb-4">Explore & Learn</h3>
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                {commonTools.map((tool, index) => (
                  <div
                    key={`common-${index}`}
                    onClick={tool.onClick}
                    onMouseEnter={() => setActiveCardIndex(`common-${index}`)}
                    onMouseLeave={() => setActiveCardIndex(null)}
                    className={`p-4 sm:p-6 rounded-xl cursor-pointer transition-all duration-300 ease-in-out ${
                      activeCardIndex === `common-${index}`
                        ? `bg-gradient-to-br ${tool.color} text-white`
                        : darkMode 
                          ? 'bg-gray-800' 
                          : 'bg-white'
                    } shadow-lg relative overflow-hidden group h-28 sm:h-32 w-full`}
                  >
                    {/* ISL Character or video that appears on hover - Hidden on very small screens */}
                    <div className={`absolute right-4 top-4 h-24 sm:h-32 w-24 sm:w-32 transition-all duration-500 ease-in-out hidden sm:block ${
                      activeCardIndex === `common-${index}` ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
                    }`}>
                      {tool.video ? (
                        <video
                          src={tool.video}
                          className="object-contain w-full h-full rounded-lg"
                          style={{ maxHeight: '8rem', maxWidth: '8rem', margin: 'auto' }}
                          autoPlay
                          loop
                          muted
                          playsInline
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.poster = "/api/placeholder/96/96";
                          }}
                        />
                      ) : (
                        <img 
                          src={tool.characterImg} 
                          alt="ISL Character" 
                          className="object-contain w-full h-full"
                          style={{ maxHeight: '8rem', maxWidth: '8rem', margin: 'auto' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/api/placeholder/96/96";
                          }}
                        />
                      )}
                    </div>
                    
                    <div className="relative flex items-center justify-between h-full">
                      <div className={`flex flex-col justify-center transition-all duration-500 ease-in-out ${
                        activeCardIndex === `common-${index}` && window.innerWidth >= 640 ? 'w-3/5' : 'w-full'
                      }`}>
                        <div className={`p-2 sm:p-3 rounded-full inline-flex mb-2 ${
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
                          <h3 className="text-sm font-medium sm:text-base">{tool.label}</h3>
                          <p className="text-xs sm:text-sm opacity-70">{tool.description}</p>
                        </div>
                        
                        {/* CTA content - visible when hovered */}
                        <div className={`transition-all duration-500 ease-in-out ${
                          activeCardIndex === `common-${index}` ? 'opacity-100' : 'opacity-0 absolute'
                        }`}>
                          <h3 className="text-sm font-bold text-white sm:text-base">{tool.ctaText}</h3>
                        </div>
                      </div>
                      
                      <ChevronRight size={20} className={`transition-all duration-500 ease-in-out absolute right-4 top-1/2 transform -translate-y-1/2 ${
                        activeCardIndex === `common-${index}` ? 'opacity-100 text-white translate-x-0' : 'opacity-0 translate-x-4'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
      
            {/* User stats section */}
            <div className={`rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-lg text-center w-full`}>
              <h3 className="mb-3 text-lg font-bold sm:text-xl sm:mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
                <div className={`p-3 sm:p-4 rounded-lg group transition-all duration-300 hover:scale-105 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                  <p className="text-xs transition-opacity sm:text-sm opacity-70 group-hover:opacity-100">Recent Sessions</p>
                  <p className="text-xl font-bold transition-colors sm:text-2xl group-hover:text-amber-500">12</p>
                </div>
                <div className={`p-3 sm:p-4 rounded-lg group transition-all duration-300 hover:scale-105 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                  <p className="text-xs transition-opacity sm:text-sm opacity-70 group-hover:opacity-100">Quizzes Taken</p>
                  <p className="text-xl font-bold transition-colors sm:text-2xl group-hover:text-blue-500">8</p>
                </div>
                <div className={`p-3 sm:p-4 rounded-lg group transition-all duration-300 hover:scale-105 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                  <p className="text-xs transition-opacity sm:text-sm opacity-70 group-hover:opacity-100">Leaderboard Rank</p>
                  <p className="text-xl font-bold transition-colors sm:text-2xl group-hover:text-purple-500">#4</p>
                </div>
                <div className={`p-3 sm:p-4 rounded-lg group transition-all duration-300 hover:scale-105 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                  <p className="text-xs transition-opacity sm:text-sm opacity-70 group-hover:opacity-100">Achievements</p>
                  <p className="text-xl font-bold transition-colors sm:text-2xl group-hover:text-green-500">3</p>
                </div>
              </div>
            </div>
      
            {/* Logout button */}
            <div className="flex justify-center">
              <button
                onClick={handleLogout}
                className={`flex items-center px-4 sm:px-6 py-2 sm:py-3 rounded-lg ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                    : 'bg-white hover:bg-gray-100 text-gray-800'
                } shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
              >
                <LogOut size={16} className="mr-2" />
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
              school={schoolInfo}
            />
          )}
        </div>
      );
};

export default Dashboard;