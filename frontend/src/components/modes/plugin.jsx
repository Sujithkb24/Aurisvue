import { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, Volume2, VolumeX, MessageSquare, X } from 'lucide-react';
import ISLViewer from '../ISL_viewer';
import Header from '../Header';

const PluginMode = ({ darkMode = true, onBack }) => {
  // State management
  const [isTranslating, setIsTranslating] = useState(true);
  const [isMicActive, setIsMicActive] = useState(false);
  const [currentCaption, setCurrentCaption] = useState("");
  const [detectedAudio, setDetectedAudio] = useState("");
  const [showFloatingControls, setShowFloatingControls] = useState(true);
  const [captionHistory, setCaptionHistory] = useState([]);
  const [videoTitle, setVideoTitle] = useState("No video detected");
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Refs for speech recognition and audio processing
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const videoElementsRef = useRef([]);
  const currentVideoRef = useRef(null);

  // Initialize Web Speech API for caption recognition
  useEffect(() => {
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser doesn't support speech recognition. Please use Chrome or Edge.");
      return;
    }
    
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US'; // Default language
    
    // Handle speech recognition results
    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      setDetectedAudio(transcript);
      
      // Add to caption history when we have a final result
      if (event.results[0].isFinal) {
        setCurrentCaption(transcript);
        setCaptionHistory(prev => [
          { text: transcript, timestamp: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9) // Keep only the last 10 entries
        ]);
      }
    };
    
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access to use this feature.');
        setIsMicActive(false);
      }
    };
    
    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopAudioCapture();
    };
  }, []);

  // Detect video elements on the page
  useEffect(() => {
    const findVideoElements = () => {
      // Find all video elements on the page
      const videos = document.querySelectorAll('video');
      videoElementsRef.current = Array.from(videos);
      
      // Set up event listeners for videos
      videoElementsRef.current.forEach(video => {
        // Listen for play events
        video.addEventListener('play', () => handleVideoPlay(video));
        // Listen for pause events
        video.addEventListener('pause', () => handleVideoPause(video));
        // Listen for title changes (usually through parent elements)
        if (video.parentElement) {
          const possibleTitleElements = video.parentElement.querySelectorAll('h1, h2, h3, .title');
          possibleTitleElements.forEach(el => {
            const observer = new MutationObserver(() => {
              updateVideoTitle(video);
            });
            observer.observe(el, { characterData: true, childList: true, subtree: true });
          });
        }
      });
      
      // Check if any videos are currently playing
      const playingVideo = videoElementsRef.current.find(v => !v.paused);
      if (playingVideo) {
        handleVideoPlay(playingVideo);
      } else if (videoElementsRef.current.length > 0) {
        updateVideoTitle(videoElementsRef.current[0]);
      }
    };
    
    // Initial scan for videos
    findVideoElements();
    
    // Set up a MutationObserver to detect new video elements
    const observer = new MutationObserver(() => {
      findVideoElements();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      observer.disconnect();
      
      // Remove event listeners
      videoElementsRef.current.forEach(video => {
        video.removeEventListener('play', () => handleVideoPlay(video));
        video.removeEventListener('pause', () => handleVideoPause(video));
      });
    };
  }, []);

  // Handle video play event
  const handleVideoPlay = (video) => {
    currentVideoRef.current = video;
    setVideoPlaying(true);
    updateVideoTitle(video);
    
    // Start audio capture if not already active
    if (!isMicActive) {
      startAudioCapture();
    }
  };

  // Handle video pause event
  const handleVideoPause = (video) => {
    if (currentVideoRef.current === video) {
      setVideoPlaying(false);
      
      // Optionally stop audio capture when video is paused
      // stopAudioCapture();
    }
  };

  // Try to extract video title from surrounding elements
  const updateVideoTitle = (video) => {
    let title = "Untitled Video";
    
    // For YouTube
    if (window.location.hostname.includes('youtube')) {
      const ytTitle = document.querySelector('.title.ytd-video-primary-info-renderer, h1.title');
      if (ytTitle) title = ytTitle.textContent.trim();
    } 
    // For Netflix
    else if (window.location.hostname.includes('netflix')) {
      const netflixTitle = document.querySelector('.video-title, .title-wrapper h1');
      if (netflixTitle) title = netflixTitle.textContent.trim();
    } 
    // For other sites - try common patterns
    else {
      // Look for title in video attributes
      if (video.title) title = video.title;
      
      // Look for title in parent elements
      if (video.parentElement) {
        const parentTitle = video.parentElement.querySelector('h1, h2, h3, .title, .video-title');
        if (parentTitle) title = parentTitle.textContent.trim();
      }
      
      // Look at page title as fallback
      if (title === "Untitled Video" && document.title) {
        title = document.title;
      }
    }
    
    setVideoTitle(title);
  };

  // Start audio capture
  const startAudioCapture = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Initialize audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Create analyzer for audio visualization (optional)
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      
      // Create source from stream
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      setIsMicActive(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Failed to access microphone. Please check your permissions.');
    }
  };

  // Stop audio capture
  const stopAudioCapture = () => {
    // Stop all audio tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Disconnect audio nodes
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    
    setIsMicActive(false);
    setDetectedAudio("");
  };

  // Toggle audio capture
  const toggleAudioCapture = () => {
    if (isMicActive) {
      stopAudioCapture();
    } else {
      startAudioCapture();
    }
  };

  // Toggle ISL translation view
  const toggleTranslation = () => {
    setIsTranslating(!isTranslating);
  };

  return (
    <div className={`flex flex-col h-screen w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Header title="Plugin Mode" showBackButton={true} onBack={onBack} darkMode={darkMode} />
      
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* 3D Model View (conditionally rendered based on isTranslating) */}
        {isTranslating && (
          <div className="w-full md:w-2/3 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-gray-700 relative">
            <ISLViewer 
              darkMode={darkMode} 
              mode="plugin" 
              speechInput={currentCaption} 
              isListening={isMicActive}
            />
            
            {/* Current speech detection overlay */}
            {detectedAudio && detectedAudio !== currentCaption && (
              <div className={`absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-opacity-75 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <p className="text-center italic text-sm">{detectedAudio}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Plugin Interface */}
        <div className={`w-full ${isTranslating ? 'md:w-1/3' : 'md:w-full'} h-1/2 md:h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'} ${showFloatingControls && window.innerWidth < 768 ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex flex-col h-full p-4">
            <div className={`mb-4 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="aspect-video bg-black rounded-lg mb-3 flex justify-center items-center">
                <Video size={48} className={`${videoPlaying ? 'text-blue-500' : 'text-gray-500'}`} />
              </div>
              <h3 className="font-medium">Currently watching:</h3>
              <p className="text-sm">{videoTitle}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs ${videoPlaying ? 'text-green-500' : 'text-gray-500'}`}>
                  {videoPlaying ? 'Video playing' : 'Video paused'}
                </span>
                
                <button 
                  onClick={toggleAudioCapture}
                  className={`p-2 rounded-lg ${isMicActive 
                    ? (darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600') 
                    : (darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400')} text-white`}
                >
                  {isMicActive ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>
            </div>
            
            <div className={`flex-1 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} overflow-y-auto`}>
              <h3 className="font-medium mb-2">Real-time Captions:</h3>
              
              {captionHistory.length > 0 ? (
                <div className="space-y-3">
                  {captionHistory.map((caption, index) => (
                    <div key={index} className={`p-2 rounded ${index === 0 ? (darkMode ? 'bg-blue-900 bg-opacity-30' : 'bg-blue-100') : ''}`}>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{caption.timestamp}</p>
                      <p className={`${index === 0 ? 'font-medium' : ''}`}>{caption.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="italic text-gray-500">No captions detected yet. Start playing a video with audio.</p>
              )}
            </div>
            
            <div className="mt-4 flex justify-between">
              <button 
                onClick={toggleAudioCapture}
                className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} flex items-center space-x-2`}
              >
                {isMicActive ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <span>{isMicActive ? "Stop Listening" : "Start Listening"}</span>
              </button>
              
              <button 
                onClick={toggleTranslation}
                className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white flex items-center space-x-2`}
              >
                <span>{isTranslating ? "Hide ISL View" : "Show ISL View"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Google Maps style floating action button for mobile */}
      {window.innerWidth < 768 && (
        <div className="fixed bottom-6 right-6 z-10">
          <button
            onClick={() => setShowFloatingControls(!showFloatingControls)}
            className={`p-4 rounded-full shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <MessageSquare size={24} className="text-blue-500" />
          </button>
          
          {/* Quick mic toggle floating button */}
          <button
            onClick={toggleAudioCapture}
            className={`absolute bottom-16 right-0 p-4 rounded-full shadow-lg ${
              isMicActive 
                ? 'bg-red-500' 
                : (darkMode ? 'bg-blue-600' : 'bg-blue-500')
            } text-white`}
          >
            {isMicActive ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
        </div>
      )}
      
      {/* On-the-go floating controls for mobile */}
      {showFloatingControls && window.innerWidth < 768 && (
        <div className={`fixed bottom-20 right-6 p-4 rounded-lg shadow-lg z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">ISL Translation</h3>
            <button onClick={() => setShowFloatingControls(false)} className="p-1">
              <X size={16} />
            </button>
          </div>
          
          <div className={`mb-3 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className="text-sm font-medium">Now watching:</p>
            <p className="text-xs truncate">{videoTitle}</p>
          </div>
          
          {currentCaption && (
            <div className={`mb-3 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-xs font-medium">Current caption:</p>
              <p className="text-sm">{currentCaption}</p>
            </div>
          )}
          
          <div className="flex space-x-2">
            <button
              onClick={toggleAudioCapture}
              className={`flex-1 py-2 rounded-lg font-medium ${isMicActive 
                ? (darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600') 
                : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')} text-white flex items-center justify-center space-x-2`}
            >
              {isMicActive ? (
                <>
                  <MicOff size={16} />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Mic size={16} />
                  <span>Start</span>
                </>
              )}
            </button>
            
            <button
              onClick={toggleTranslation}
              className={`flex-1 py-2 rounded-lg font-medium ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'} text-white flex items-center justify-center`}
            >
              {isTranslating ? "Hide ISL" : "Show ISL"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginMode;