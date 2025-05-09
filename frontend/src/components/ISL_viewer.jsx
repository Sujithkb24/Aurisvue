import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Loader from './ui/Loader';

const ISLViewer = ({ speechInput, darkMode, shouldTranslate, onTranslationDone }) => {
  const [videoSequence, setVideoSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  // Fetch video filenames from backend
  useEffect(() => {
    const fetchVideos = async () => {
      if (shouldTranslate && speechInput?.trim()) {
        try {
          setLoading(true);
          const response = await axios.post('https://aurisvue-api.onrender.com/analyze', {
            transcript: speechInput,
          });
          console.log('API response:', response.data);

          const videos = response.data?.videos || [];
          if (videos.length > 0) {
            setVideoSequence(videos);
            setCurrentIndex(0);
            setIsPlaying(true);
          }

          if (onTranslationDone) onTranslationDone(); // Notify parent
        } catch (error) {
          console.error('Error fetching ISL videos:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchVideos();
  }, [shouldTranslate, speechInput, onTranslationDone]);

  // Play each video in sequence
  const handleVideoEnd = () => {
    if (currentIndex < videoSequence.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsPlaying(true);
    }
  };

  // Handle play/pause toggle
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Move to next video
  const handleNext = () => {
    if (currentIndex < videoSequence.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsPlaying(true);
    }
  };

  // Move to previous video
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsPlaying(true);
    }
  };

  if (!videoSequence.length && !loading) return null;

  return (
    <div className={`flex items-center justify-center w-full h-full p-4`}>
      <div 
        className={`relative w-full max-w-2xl mx-auto overflow-hidden transition-all duration-300 transform ${
          darkMode ? 'bg-transparent text-white' : 'bg-white text-gray-900'
        }  ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        {loading ? (
         
            <Loader/>
            
          
        ) : videoSequence.length > 0 ? (
          <>
            {/* Video Display */}
            <div className="relative bg-black aspect-video">
              <video
                ref={videoRef}
                key={videoSequence[currentIndex]}
                src={`/videos/${videoSequence[currentIndex]}`}
                onEnded={handleVideoEnd}
                autoPlay
                controls={false}
                className="object-contain w-full h-full"
                muted
              />
              
              {/* Hover overlay for controls */}
              <div 
                className="absolute inset-0 transition-opacity duration-300 opacity-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 hover:opacity-100"
                onClick={togglePlayPause}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <button 
                    className="p-4 transition-all duration-300 transform rounded-full bg-white/30 backdrop-blur-sm hover:bg-white/40 hover:scale-110"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                  >
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="px-4 py-2">
              <div className="w-full h-1.5 overflow-hidden bg-gray-300 dark:bg-gray-600 rounded-full">
                <div
                  className="h-full transition-all duration-300 bg-blue-500"
                  style={{ width: `${((currentIndex + 1) / videoSequence.length) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    currentIndex === 0 
                      ? 'opacity-40 cursor-not-allowed' 
                      : `${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} active:scale-95`
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
          
                <button
                  onClick={togglePlayPause}
                  className={`p-2 rounded-full transition-all duration-200 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} active:scale-95`}
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
          
                <button
                  onClick={handleNext}
                  disabled={currentIndex === videoSequence.length - 1}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    currentIndex === videoSequence.length - 1 
                      ? 'opacity-40 cursor-not-allowed' 
                      : `${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} active:scale-95`
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
          
              <div className="flex items-center">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  {currentIndex + 1} / {videoSequence.length}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ISLViewer;