import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCw, Mic, MicOff, Upload, Volume2, VolumeX } from 'lucide-react';

const YouTubeAudioCaptureAndISL = ({ darkMode = true }) => {
  // States for YouTube video
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  // States for audio capture
  const [isCapturing, setIsCapturing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // States for ISL translation
  const [islVideos, setIslVideos] = useState([]);
  const [currentIslIndex, setCurrentIslIndex] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Refs
  const playerRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const islVideoRef = useRef(null);
  const streamRef = useRef(null);
  const timeUpdateIntervalRef = useRef(null);
  
  // Speech Recognition setup
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    // Initialize Web Speech API if available
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let transcriptText = '';
        for (let i = 0; i < event.results.length; i++) {
          transcriptText += event.results[i][0].transcript + ' ';
        }
        console.log('CAPTURED AUDIO TEXT:', transcriptText);
        setTranscript(transcriptText);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
      };
    } else {
      setError('Speech recognition not supported in this browser');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopMicCapture();
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, []);
  
  // Extract YouTube video ID from URL
  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = () => {
        if (videoId) {
          initializeYouTubePlayer();
        }
      };
    } else if (videoId) {
      initializeYouTubePlayer();
    }
  }, [videoId]);
  
  // Initialize YouTube player
  const initializeYouTubePlayer = () => {
    if (!videoId) return;
    
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.loadVideoById(videoId);
      return;
    }
    
    try {
      youtubePlayerRef.current = new window.YT.Player('youtube-player', {
        videoId: videoId,
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 1, // Set to 1 to autoplay video when loaded
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError,
        }
      });
    } catch (error) {
      console.error('Error initializing YouTube player:', error);
      setError('Failed to initialize YouTube player: ' + error.message);
    }
  };
  
  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    setDuration(playerRef.current.getDuration());
    setIsVideoLoaded(true);
    
    // Autoplay video when ready
    playerRef.current.playVideo();
  };
  
  const onPlayerStateChange = (event) => {
    // YT.PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0
    
    if (event.data === 1) { // Playing
      setIsPlaying(true);
      
      // Start capturing audio when video starts playing
      if (!isReady) {
        startMicCapture();
      }
      
      // Update current time regularly
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      
      timeUpdateIntervalRef.current = setInterval(() => {
        if (playerRef.current) {
          const time = playerRef.current.getCurrentTime();
          setCurrentTime(time);
          
          // Synchronize ISL video if in replay mode
          if (isReady && islVideos.length > 0) {
            const videoSegmentLength = duration / islVideos.length;
            const currentSegmentIndex = Math.floor(time / videoSegmentLength);
            
            if (currentSegmentIndex !== currentIslIndex && currentSegmentIndex < islVideos.length) {
              setCurrentIslIndex(currentSegmentIndex);
            }
          }
        }
      }, 250);
    } else if (event.data === 2) { // Paused
      setIsPlaying(false);
      // Pause ISL video if in replay mode
      if (isReady && islVideoRef.current) {
        islVideoRef.current.pause();
      }
    } else if (event.data === 0) { // Ended
      setIsPlaying(false);
      
      // Clear the time update interval
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      
      // Process transcript and prepare ISL when video ends
      if (!isReady && transcript) {
        stopMicCapture();
        processTranscriptForISL();
      }
    }
  };
  
  const onPlayerError = (event) => {
    console.error('YouTube player error:', event.data);
    setError(`YouTube player error: ${event.data}`);
  };
  
  // Audio capture functions
  const startMicCapture = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsCapturing(true);
        setIsTranscribing(true);
      }
    } catch (error) {
      console.error('Error starting media capture:', error);
      setError('Failed to access microphone: ' + error.message);
    }
  };
  
  const stopMicCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsCapturing(false);
    setIsTranscribing(false);
  };
  
  // Process transcript and fetch ISL videos
  const processTranscriptForISL = async () => {
    if (!transcript.trim()) {
      setError('No transcript captured. Please try again.');
      return;
    }
    
    setIsLoading(true);
    setIsTranslating(true);
    
    try {
      // Direct API call here - no dependency on ISLViewer
      const response = await fetch('https://aurisvue-api.onrender.com/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      const videos = data?.videos || [];
      if (videos.length > 0) {
        setIslVideos(videos);
        setCurrentIslIndex(0);
        setIsReady(true);
        
        // Prepare to replay the YouTube video with ISL
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          // Slight delay to ensure everything is ready
          setTimeout(() => {
            playerRef.current.playVideo();
          }, 500);
        }
      } else {
        setError('No sign language videos available for this content');
      }
    } catch (error) {
      console.error('Error fetching ISL videos:', error);
      setError('Failed to fetch sign language videos: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsTranslating(false);
    }
  };
  
  // Handle URL input and loading video
  const handleUrlChange = (e) => {
    setYoutubeUrl(e.target.value);
  };
  
  const handleLoadVideo = () => {
    const extractedId = extractVideoId(youtubeUrl);
    if (extractedId) {
      // Reset states for new video
      setVideoId(extractedId);
      setIsReady(false);
      setIslVideos([]);
      setCurrentIslIndex(0);
      setTranscript('');
      setError('');
      
      // Clear any existing interval
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    } else {
      setError('Invalid YouTube URL');
    }
  };
  
  // Video playback controls
  const togglePlayPause = () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
      
      // Also pause ISL video if in replay mode
      if (isReady && islVideoRef.current) {
        islVideoRef.current.pause();
      }
    } else {
      playerRef.current.playVideo();
      
      // Also play ISL video if in replay mode
      if (isReady && islVideoRef.current) {
        islVideoRef.current.play();
      }
    }
  };
  
  const toggleMute = () => {
    if (!playerRef.current) return;
    
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };
  
  const seekVideo = (e) => {
    if (!playerRef.current) return;
    
    const seekTime = (e.target.value / 100) * duration;
    playerRef.current.seekTo(seekTime, true);
    setCurrentTime(seekTime);
    
    // If in replay mode, also update ISL video index
    if (isReady && islVideos.length > 0) {
      const videoSegmentLength = duration / islVideos.length;
      const currentSegmentIndex = Math.floor(seekTime / videoSegmentLength);
      
      if (currentSegmentIndex !== currentIslIndex && currentSegmentIndex < islVideos.length) {
        setCurrentIslIndex(currentSegmentIndex);
      }
    }
  };
  
  // Format time (seconds) to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Reset everything
  const handleReset = () => {
    setIsReady(false);
    setIslVideos([]);
    setCurrentIslIndex(0);
    setTranscript('');
    stopMicCapture();
    
    if (playerRef.current) {
      playerRef.current.seekTo(0);
    }
  };
  
  return (
    <div className={`flex flex-col h-full w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="flex flex-col md:flex-row h-full">
        {/* YouTube Video Section */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full p-4 flex flex-col">
          <div className="mb-4 flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={youtubeUrl}
              onChange={handleUrlChange}
              placeholder="Enter YouTube URL"
              className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border`}
            />
            <button
              onClick={handleLoadVideo}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white flex items-center justify-center gap-2`}
            >
              <Upload size={16} />
              <span>Load Video</span>
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-500 bg-opacity-25 text-red-100 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="relative flex-1 bg-black">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {!isVideoLoaded ? (
              <div className="h-full flex items-center justify-center">
                <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Upload size={48} className="mx-auto mb-2" />
                  <p>Enter a YouTube URL and click Load Video</p>
                </div>
              </div>
            ) : (
              <div className="h-full">
                <div id="youtube-player" className="h-full"></div>
              </div>
            )}
          </div>
          
          {isVideoLoaded && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={togglePlayPause}
                  className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                
                <span className="text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
                
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(currentTime / duration) * 100 || 0}
                  onChange={seekVideo}
                  className="flex-1"
                />
                
                <button
                  onClick={handleReset}
                  className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  <RotateCw size={20} />
                </button>
              </div>
              
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow mb-2`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {isReady ? 'Replay Mode with ISL' : 'First Play - Capturing Audio'}
                  </span>
                  {!isReady && (
                    <div className="flex items-center">
                      {isCapturing ? (
                        <Mic size={18} className="text-green-500 mr-2" />
                      ) : (
                        <MicOff size={18} className="text-red-500 mr-2" />
                      )}
                      <span className="text-sm">
                        {isCapturing ? 'Capturing Audio' : 'Mic Off'}
                      </span>
                    </div>
                  )}
                </div>
                
                {isTranscribing && (
                  <div className="p-2 bg-blue-500 bg-opacity-20 rounded text-sm mb-2">
                    <p className="font-medium">Transcribing audio...</p>
                  </div>
                )}
                
                {isTranslating && (
                  <div className="p-2 bg-green-500 bg-opacity-20 rounded text-sm mb-2">
                    <p className="font-medium">Translating to ISL...</p>
                  </div>
                )}
                
                <p className="text-sm opacity-80">
                  {transcript ? transcript : "No transcript available yet..."}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* ISL Viewer Section */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full p-4 flex flex-col">
          <div className="flex-1 flex items-center justify-center bg-gray-800 rounded-lg overflow-hidden">
            {!isReady ? (
              <div className="text-center p-6">
                <h3 className="text-xl font-medium mb-4">ISL Translation</h3>
                <p className="opacity-70">
                  {isVideoLoaded 
                    ? "Play the YouTube video. Audio will be captured and converted to ISL."
                    : "Load a YouTube video to start."}
                </p>
                
                {isTranslating && (
                  <div className="mt-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2">Translating to ISL...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col">
                <h3 className="text-center p-2 bg-gray-700">
                  ISL Video {currentIslIndex + 1} of {islVideos.length}
                </h3>
                {islVideos.length > 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <video
                      ref={islVideoRef}
                      key={islVideos[currentIslIndex]} // Forces reloading on index change
                      src={`/videos/${islVideos[currentIslIndex]}`}
                      className="max-w-full max-h-full"
                      autoPlay={isPlaying}
                      loop
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          
          {isReady && islVideos.length > 0 && (
            <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
              <h3 className="font-medium mb-2">Available ISL Videos:</h3>
              <div className="grid grid-cols-5 gap-2">
                {islVideos.map((video, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded text-center cursor-pointer text-sm ${
                      index === currentIslIndex 
                        ? (darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white') 
                        : (darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')
                    }`}
                    onClick={() => {
                      setCurrentIslIndex(index);
                      // Optionally seek to the appropriate part of the YouTube video
                      if (playerRef.current && duration) {
                        const videoSegmentLength = duration / islVideos.length;
                        playerRef.current.seekTo(index * videoSegmentLength);
                      }
                    }}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YouTubeAudioCaptureAndISL;