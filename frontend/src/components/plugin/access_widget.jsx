import { useState, useEffect, useRef } from 'react';
import { 
  Mic, Play, Settings, X, Maximize2, Minimize2, Move, 
  Volume2, VolumeX, RefreshCw, AlertTriangle, MessageSquare,
  ChevronUp, ChevronDown
} from 'lucide-react';

const QuickAccessWidget = ({ 
  darkMode = true, 
  onActivate, 
  onSettings, 
  isVisible = true,
  platform = 'web', // 'web', 'android', 'ios'
  initialPosition = null
}) => {
  // Widget state
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState(initialPosition || { 
    x: platform === 'android' ? 20 : window.innerWidth - 80, 
    y: window.innerHeight - 100 
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [videoDetected, setVideoDetected] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [translationQuality, setTranslationQuality] = useState('medium'); // low, medium, high
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Store widget position in localStorage
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem('islWidgetPosition', JSON.stringify(position));
    }
  }, [position, isDragging]);
  
  // Load saved position on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('islWidgetPosition');
    if (savedPosition && !initialPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        // Make sure widget isn't positioned off-screen
        const safeX = Math.min(Math.max(parsed.x, 0), window.innerWidth - 80);
        const safeY = Math.min(Math.max(parsed.y, 0), window.innerHeight - 80);
        setPosition({ x: safeX, y: safeY });
      } catch (e) {
        console.error('Failed to parse saved widget position', e);
      }
    }
  }, [initialPosition]);
  
  // Check for videos on the page
  useEffect(() => {
    const checkForVideos = () => {
      const videos = document.querySelectorAll('video');
      const hasVideos = videos.length > 0;
      setVideoDetected(hasVideos);
      
      // Find a playing video if any
      const playingVideo = Array.from(videos).find(v => !v.paused);
      if (playingVideo) {
        setCurrentVideo(playingVideo);
        extractVideoInfo(playingVideo);
      } else if (videos.length > 0) {
        setCurrentVideo(videos[0]);
        extractVideoInfo(videos[0]);
      } else {
        setCurrentVideo(null);
      }
    };
    
    // Try to extract video title or other info
    const extractVideoInfo = (videoEl) => {
      if (!videoEl) return;
      
      // Try to get video information based on the current site
      let videoTitle = "Unnamed Video";
      let hostName = window.location.hostname;
      
      if (hostName.includes('youtube')) {
        const ytTitle = document.querySelector('.title.ytd-video-primary-info-renderer, h1.title');
        if (ytTitle) videoTitle = ytTitle.textContent.trim();
        setStatusMessage(`YouTube video detected: ${videoTitle}`);
      } 
      else if (hostName.includes('netflix')) {
        const netflixTitle = document.querySelector('.video-title, .title-wrapper h1');
        if (netflixTitle) videoTitle = netflixTitle.textContent.trim();
        setStatusMessage(`Netflix content detected: ${videoTitle}`);
      }
      else {
        // Generic detection
        setStatusMessage(`Video detected on ${hostName}`);
      }
    };
    
    // Initial check
    checkForVideos();
    
    // Set up observer to detect new videos
    const observer = new MutationObserver(() => {
      checkForVideos();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Set up event listeners for play/pause events on all videos
    const handleVideoEvents = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        video.addEventListener('play', () => checkForVideos());
        video.addEventListener('pause', () => checkForVideos());
      });
    };
    
    handleVideoEvents();
    
    // Also periodically check for videos (catches cases the MutationObserver misses)
    const intervalId = setInterval(checkForVideos, 5000);
    
    return () => {
      observer.disconnect();
      clearInterval(intervalId);
      
      // Clean up event listeners
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        video.removeEventListener('play', () => checkForVideos());
        video.removeEventListener('pause', () => checkForVideos());
      });
    };
  }, [platform]);
  
  // Handle mouse down for dragging
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    
    // Prevent text selection during drag
    e.preventDefault();
  };
  
  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 80));
        const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 80));
        
        setPosition({
          x: newX,
          y: newY
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);
  
  // Handle touch events for mobile dragging
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y
    });
  };
  
  useEffect(() => {
    const handleTouchMove = (e) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(e.touches[0].clientX - dragOffset.x, window.innerWidth - 80));
        const newY = Math.max(0, Math.min(e.touches[0].clientY - dragOffset.y, window.innerHeight - 80));
        
        setPosition({
          x: newX,
          y: newY
        });
        
        // Prevent scrolling while dragging
        e.preventDefault();
      }
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  // Handle activation toggle
  const handleActivate = () => {
    if (videoDetected) {
      const newState = !isTranslating;
      setIsTranslating(newState);
      
      // Notify parent component
      if (onActivate) {
        onActivate(newState);
      }
      
      // Update status message
      if (newState) {
        setStatusMessage(`ISL translation active${currentVideo ? ' - processing audio' : ''}`);
      } else {
        setStatusMessage('Translation stopped');
      }
    } else {
      setStatusMessage('No video detected to translate');
      // Maybe show a toast notification here
    }
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    
    // If we have access to the current video element, mute/unmute it
    if (currentVideo) {
      currentVideo.muted = !isMuted;
    }
  };

  // Handle quality change
  const handleQualityChange = (quality) => {
    setTranslationQuality(quality);
    setStatusMessage(`Translation quality set to ${quality}`);
  };

  // Handle advanced settings toggle
  const toggleAdvancedSettings = () => {
    setShowAdvancedSettings(!showAdvancedSettings);
  };

  // If widget is not visible, don't render anything
  if (!isVisible) return null;
  
  // Platform-specific widget behavior
  const renderPlatformIndicator = () => {
    if (platform === 'web') {
      return <span className="text-xs ml-1">(Browser)</span>;
    } else if (platform === 'android') {
      return <span className="text-xs ml-1">(Android)</span>;
    } else if (platform === 'ios') {
      return <span className="text-xs ml-1">(iOS)</span>;
    }
    return null;
  };
  
  return (
    <div 
      className={`fixed shadow-lg rounded-lg overflow-hidden z-50 ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'all 0.2s ease',
        width: isExpanded ? '240px' : 'auto',
        maxWidth: '90vw'
      }}
    >
      {/* Handle for dragging */}
      <div 
        className={`p-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} cursor-grab flex justify-between items-center border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center">
          <Move size={14} className="mr-2 text-gray-500" />
          <span className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            ISL Translator {renderPlatformIndicator()}
          </span>
        </div>
        
        <div className="flex items-center">
          {isTranslating && (
            <div className="mr-2 flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></div>
              <span className="text-xs text-green-400">Live</span>
            </div>
          )}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
          >
            {isExpanded ? 
              <Minimize2 size={14} className={darkMode ? 'text-white' : 'text-gray-800'} /> : 
              <Maximize2 size={14} className={darkMode ? 'text-white' : 'text-gray-800'} />
            }
          </button>
        </div>
      </div>
      
      {/* Widget body */}
      <div className={`p-3 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        {isExpanded ? (
          <div>
            {/* Status indicator */}
            <div className={`mb-3 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} text-sm`}>
              {videoDetected ? (
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm truncate">{statusMessage || 'Video detected'}</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-sm">No video detected</span>
                </div>
              )}
            </div>
            
            {/* Main controls */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button 
                onClick={handleActivate}
                className={`p-2 rounded-lg flex flex-col items-center justify-center ${
                  videoDetected 
                    ? (isTranslating
                      ? (darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600')
                      : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'))
                    : (darkMode ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'bg-gray-300 opacity-50 cursor-not-allowed')
                } text-white`}
                disabled={!videoDetected}
              >
                {isTranslating ? <X size={16} /> : <Play size={16} />}
                <span className="text-xs mt-1">{isTranslating ? 'Stop' : 'Start'}</span>
              </button>
              
              <button 
                onClick={onSettings}
                className={`p-2 rounded-lg flex flex-col items-center justify-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${darkMode ? 'text-white' : 'text-gray-800'}`}
              >
                <Settings size={16} />
                <span className="text-xs mt-1">Settings</span>
              </button>
            </div>

            {/* Translation settings when active */}
            {isTranslating && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs">Translation quality:</span>
                  <div className="flex bg-gray-700 rounded overflow-hidden">
                    {['low', 'medium', 'high'].map((quality) => (
                      <button
                        key={quality}
                        onClick={() => handleQualityChange(quality)}
                        className={`text-xs px-2 py-1 ${
                          translationQuality === quality
                            ? (darkMode ? 'bg-blue-600' : 'bg-blue-500')
                            : (darkMode ? 'bg-gray-700' : 'bg-gray-200')
                        }`}
                      >
                        {quality.charAt(0).toUpperCase() + quality.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Audio controls */}
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs">Original audio:</span>
                  <button
                    onClick={handleMuteToggle}
                    className={`flex items-center justify-center p-1.5 rounded ${
                      darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                </div>
                
                {/* Advanced settings toggle */}
                <button
                  onClick={toggleAdvancedSettings}
                  className={`mt-3 w-full p-1 text-xs flex items-center justify-center rounded ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                 {showAdvancedSettings ? (
                    <>Advanced Settings <ChevronUp size={12} className="ml-1" /></>
                  ) : (
                    <>Advanced Settings <ChevronDown size={12} className="ml-1" /></>
                  )}
                </button>
                
                {/* Advanced settings panel */}
                {showAdvancedSettings && (
                  <div className={`mt-2 p-2 rounded text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span>Avatar size:</span>
                      <select className={`text-xs p-1 rounded ${darkMode ? 'bg-gray-600' : 'bg-white'}`}>
                        <option>Small</option>
                        <option selected>Medium</option>
                        <option>Large</option>
                      </select>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <span>Speed:</span>
                      <select className={`text-xs p-1 rounded ${darkMode ? 'bg-gray-600' : 'bg-white'}`}>
                        <option>0.75x</option>
                        <option selected>1.0x</option>
                        <option>1.25x</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Position:</span>
                      <div className="flex space-x-1">
                        <button className={`px-2 py-1 rounded ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>L</button>
                        <button className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>R</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Help/feedback section */}
            <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between">
              <button className="text-xs text-blue-400 hover:underline flex items-center">
                <MessageSquare size={12} className="mr-1" /> Feedback
              </button>
              <button 
                onClick={() => setStatusMessage('Refreshing video detection...')}
                className="text-xs text-blue-400 hover:underline flex items-center"
              >
                <RefreshCw size={12} className="mr-1" /> Refresh
              </button>
            </div>
          </div>
        ) : (
          // Collapsed state - just show translation status indicator
          <div className="px-1">
            {isTranslating ? (
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></div>
                <span className="text-xs">Active</span>
              </div>
            ) : (
              <div className="w-4 h-4 flex items-center justify-center">
                <Play size={12} className="text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickAccessWidget;