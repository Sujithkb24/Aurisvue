import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Play, Pause, SkipBack, SkipForward, AlertCircle, Loader } from 'lucide-react';

const ISLView = ({ speechInput, darkMode, shouldTranslate, onTranslationDone }) => {
  const [videoSequence, setVideoSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  
  const videoRef = useRef(null);
  const previousSpeechRef = useRef('');

  // Fetch video filenames from backend when speechInput changes
  useEffect(() => {
    const fetchVideos = async () => {
      // Only fetch if we have new speech input and shouldTranslate is true
      if (
        shouldTranslate && 
        speechInput?.trim() && 
        speechInput !== previousSpeechRef.current
      ) {
        console.log('ISLViewer: Fetching ISL videos for speech input:', speechInput);
        setIsLoading(true);
        setError('');
        
        try {
          const response = await axios.post('https://aurisvue-api.onrender.com/analyze', {
            transcript: speechInput,
          });
          
          console.log('ISLViewer: API response:', response.data);
          previousSpeechRef.current = speechInput;

          const videos = response.data?.videos || [];
          if (videos.length > 0) {
            console.log('ISLViewer: Received videos:', videos);
            setVideoSequence(videos);
            setCurrentIndex(0);
            setIsPlaying(true);
          } else {
            console.warn('ISLViewer: No videos received from API');
            setError('No sign language videos available for this content');
          }

          if (onTranslationDone) {
            console.log('ISLViewer: Translation complete, notifying parent');
            onTranslationDone();
          }
        } catch (error) {
          console.error('ISLViewer: Error fetching ISL videos:', error);
          setError('Failed to fetch sign language videos: ' + error.message);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchVideos();
  }, [shouldTranslate, speechInput, onTranslationDone]);

  // Play each video in sequence
  const handleVideoEnd = () => {
    console.log(`ISLViewer: Video ${currentIndex + 1}/${videoSequence.length} ended`);
    
    if (currentIndex < videoSequence.length - 1) {
      console.log('ISLViewer: Moving to next video');
      setCurrentIndex((prev) => prev + 1);
    } else {
      console.log('ISLViewer: Reached end of video sequence');
      setIsPlaying(false);
    }
  };

  // Handle errors
  const handleVideoError = (e) => {
    console.error('ISLViewer: Video playback error:', e);
    setError(`Error playing video: ${videoSequence[currentIndex]}`);
  };

  // Reset when new input comes
  useEffect(() => {
    if (speechInput !== previousSpeechRef.current) {
      console.log('ISLViewer: New speech input detected, resetting');
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  }, [speechInput]);

  // Manage video playback when isPlaying state changes
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(err => {
          console.error('ISLViewer: Error auto-playing video:', err);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex]);

  // Video controls
  const playCurrentVideo = () => {
    setIsPlaying(true);
  };

  const pauseCurrentVideo = () => {
    setIsPlaying(false);
  };

  const goToPreviousVideo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  };

  const goToNextVideo = () => {
    if (currentIndex < videoSequence.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center w-full h-full ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Translating to Indian Sign Language...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center w-full h-full ${darkMode ? 'bg-red-900 bg-opacity-20 text-red-100' : 'bg-red-100 text-red-800'} p-4 rounded-lg`}>
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!videoSequence.length) {
    return (
      <div className={`flex items-center justify-center w-full h-full ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        <div className="text-center p-6">
          <p className="mb-2">No ISL videos available yet</p>
          <p className="text-sm opacity-75">Videos will appear once speech is captured and processed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className={`p-4 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} max-w-full max-h-full flex flex-col items-center`}>
        <video
          ref={videoRef}
          key={videoSequence[currentIndex]} // forces reloading on index change
          src={`/videos/${videoSequence[currentIndex]}`}
          onEnded={handleVideoEnd}
          onError={handleVideoError}
          autoPlay
          muted={false}
          controls={false}
          className="w-64 h-auto rounded-xl shadow-md"
        />
        
        <div className="mt-4 w-full">
          <p className={`text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Showing gesture {currentIndex + 1} of {videoSequence.length}
          </p>
          
          {/* Video controls */}
          <div className="flex justify-center items-center gap-4 mt-2">
            <button 
              onClick={goToPreviousVideo} 
              disabled={currentIndex === 0}
              className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Previous sign"
            >
              <SkipBack size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
            </button>
            
            {isPlaying ? (
              <button 
                onClick={pauseCurrentVideo}
                className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                aria-label="Pause"
              >
                <Pause size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
              </button>
            ) : (
              <button 
                onClick={playCurrentVideo}
                className={`p-2 rounded-full ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
                aria-label="Play"
              >
                <Play size={20} className="text-white" />
              </button>
            )}
            
            <button 
              onClick={goToNextVideo} 
              disabled={currentIndex === videoSequence.length - 1}
              className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${currentIndex === videoSequence.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Next sign"
            >
              <SkipForward size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ISLView;