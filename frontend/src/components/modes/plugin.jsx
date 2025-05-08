import React, { useState, useRef, useEffect } from 'react';

const VideoTranscriptionPlugin = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCaption, setCurrentCaption] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [videoType, setVideoType] = useState('local'); // 'local' or 'youtube'
  const [transcriptionLog, setTranscriptionLog] = useState([]); // For debugging purpose
  const [debugInfo, setDebugInfo] = useState({
    lastRecognizedText: '',
    captionUpdateCount: 0,
    recognitionActive: false
  });
  const videoRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const recognitionRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // ISLViewer component
  const ISLViewer = ({ darkMode, shouldTranslate, onTranslationDone, speechInput, isListening }) => {
    // Remove React.memo to ensure component always updates
    console.log('[ISLViewer] Props:', {
      darkMode,
      shouldTranslate,
      speechInput: typeof speechInput === 'string' ? speechInput : String(speechInput),
      speechInputLength: speechInput ? speechInput.length : 0,
      isListening
    });
  
    useEffect(() => {
      // Check if speechInput is a non-empty string
      if (shouldTranslate && speechInput && typeof speechInput === 'string' && speechInput.trim() !== '') {
        console.log('[ISLViewer] New text for translation:', speechInput);
        // Simulate translation completion
        setTimeout(() => {
          console.log('[ISLViewer] Translation complete');
          onTranslationDone?.();
        }, 1000);
      }
    }, [speechInput, shouldTranslate, onTranslationDone]);
  
    return (
      <div className={`border-2 p-4 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
        <h3 className="font-bold mb-2">ISL Viewer</h3>
        <div className="mb-2">
          <span className="font-semibold">Mode:</span> {darkMode ? 'Dark' : 'Light'}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Translation:</span> {shouldTranslate ? 'Active' : 'Inactive'}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Listening:</span> {isListening ? 'Yes' : 'No'}
        </div>
        <div className="border-t pt-2 mt-2">
          <p className="font-semibold">Current Text:</p>
          <p className="bg-gray-100 text-gray-800 p-2 rounded">{
            (speechInput && typeof speechInput === 'string' && speechInput.trim()) ? 
              speechInput : 'No text available'
          }</p>
        </div>
      </div>
    );
  };

  // Extract YouTube ID from URL
  const extractYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Load YouTube API
  useEffect(() => {
    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      // YouTube API is ready
      if (youtubeId) {
        initYouTubePlayer();
      }
    };

    return () => {
      window.onYouTubeIframeAPIReady = null;
    };
  }, []);

  // Initialize YouTube player when ID changes
  useEffect(() => {
    if (youtubeId && window.YT && window.YT.Player) {
      initYouTubePlayer();
    }
  }, [youtubeId]);

  // Initialize YouTube player
  const initYouTubePlayer = () => {
    // Destroy existing player if any
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.destroy();
    }

    // Create a div for the player if it doesn't exist
    let playerElement = document.getElementById('youtube-player');
    if (!playerElement) {
      playerElement = document.createElement('div');
      playerElement.id = 'youtube-player';
      const container = document.getElementById('youtube-container');
      if (container) {
        container.innerHTML = '';
        container.appendChild(playerElement);
      }
    }

    // Initialize the player
    youtubePlayerRef.current = new window.YT.Player('youtube-player', {
      height: '360',
      width: '640',
      videoId: youtubeId,
      playerVars: {
        'playsinline': 1,
        'controls': 1
      },
      events: {
        'onStateChange': onPlayerStateChange
      }
    });
  };

  // Handle YouTube player state changes
  const onPlayerStateChange = (event) => {
    // YT.PlayerState.PLAYING = 1, YT.PlayerState.PAUSED = 2, YT.PlayerState.ENDED = 0
    if (event.data === 1) { // playing
      setIsPlaying(true);
    } else if (event.data === 2) { // paused
      setIsPlaying(false);
    } else if (event.data === 0) { // ended
      setIsPlaying(false);
      if (isTranslating) {
        stopTranscription();
      }
    }
  };

  // Function to handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoType('local');
      setYoutubeId('');
      
      // Reset state when new video is selected
      if (isTranslating) {
        stopTranscription();
      }
      setCurrentCaption('');
    }
  };

  // Function to handle URL input
  const handleUrlInput = (e) => {
    const url = e.target.value;
    setVideoUrl(url);
    
    // Check if it's a YouTube URL
    const ytId = extractYouTubeId(url);
    if (ytId) {
      setYoutubeId(ytId);
      setVideoType('youtube');
    } else {
      setYoutubeId('');
      setVideoType('local');
    }
    
    // Reset state when new URL is entered
    if (isTranslating) {
      stopTranscription();
    }
    setCurrentCaption('');
  };

  // Function to trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Function to handle play/pause
  const togglePlayPause = () => {
    if (videoType === 'local' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (videoType === 'youtube' && youtubePlayerRef.current) {
      if (isPlaying) {
        youtubePlayerRef.current.pauseVideo();
      } else {
        youtubePlayerRef.current.playVideo();
      }
    }
  };

  // Initialize speech recognition
  const initSpeechRecognition = () => {
    console.log('[DEBUG] Initializing speech recognition...');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('[ERROR] SpeechRecognition API not available');
      alert("Your browser doesn't support speech recognition. Please try Chrome, Edge, or Safari.");
      return false;
    }
    
    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        console.log('[DEBUG] Speech recognition started');
        setIsMicActive(true);
        addToTranscriptionLog('Speech recognition started');
      };
      
      recognitionRef.current.onresult = (event) => {
        console.log('[DEBUG] Speech recognition result received');
        let transcript = '';
        let interimTranscript = '';
        let finalText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const currentTranscript = result[0].transcript.trim();
          
          console.log(`[DEBUG] Result ${i}:`, {
            transcript: currentTranscript,
            isFinal: result.isFinal,
            confidence: result[0].confidence
          });
          
          if (result.isFinal) {
            transcript += ` ${currentTranscript}`;
            finalText = currentTranscript;
            addToTranscriptionLog(`Final: ${currentTranscript} (Confidence: ${result[0].confidence.toFixed(2)})`);
          } else {
            interimTranscript += ` ${currentTranscript}`;
          }
        }
        
        if (transcript.trim()) {
          console.log('[DEBUG] Final transcript:', transcript);
          
          // Update debug info
          setDebugInfo(prev => ({
            ...prev,
            lastRecognizedText: transcript.trim(),
            captionUpdateCount: prev.captionUpdateCount + 1
          }));
          
          // Set the current caption - this is what gets passed to ISLViewer
          setCurrentCaption(prev => {
            const newCaption = prev ? `${prev} ${transcript.trim()}` : transcript.trim();
            console.log('[DEBUG] Setting new caption:', newCaption);
            return newCaption;
          });
          
          // Also immediately log the current state to see if it was updated
          setTimeout(() => {
            console.log('[DEBUG] Current caption state after update:', currentCaption);
          }, 0);
        }
        
        if (interimTranscript.trim()) {
          console.log('[DEBUG] Interim transcript:', interimTranscript);
          // For debugging, we could show interim results too
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('[ERROR] Speech recognition error:', {
          error: event.error,
          message: event.message
        });
        
        addToTranscriptionLog(`Error: ${event.error}`);
        
        if (event.error === 'no-speech') {
          console.log('[DEBUG] No speech detected, restarting recognition');
          if (isTranslating && recognitionRef.current) {
            recognitionRef.current.stop();
            setTimeout(() => {
              if (isTranslating && recognitionRef.current) {
                recognitionRef.current.start();
              }
            }, 100);
          }
        }
      };
      
      recognitionRef.current.onend = () => {
        console.log('[DEBUG] Speech recognition ended');
        addToTranscriptionLog('Speech recognition ended');
        
        if (isTranslating) {
          console.log('[DEBUG] Auto-restarting recognition');
          setTimeout(() => {
            if (isTranslating && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.error('[ERROR] Failed to restart recognition:', error);
                addToTranscriptionLog(`Restart failed: ${error.message}`);
              }
            }
          }, 500);
        } else {
          setIsMicActive(false);
        }
      };
      
      console.log('[DEBUG] Speech recognition initialized successfully');
      return true;
    } catch (error) {
      console.error('[ERROR] Failed to initialize speech recognition:', error);
      addToTranscriptionLog(`Init failed: ${error.message}`);
      return false;
    }
  };

  // Add to transcription log (for debugging)
  const addToTranscriptionLog = (message) => {
    setTranscriptionLog(prev => {
      const timestamp = new Date().toLocaleTimeString();
      return [...prev, `[${timestamp}] ${message}`].slice(-10); // Keep last 10 entries
    });
  };

  // Setup system audio capture for transcription
  const setupSystemAudioCapture = async () => {
    console.log('[DEBUG] Setting up system audio capture...');
    
    try {
      // Request permission to access system audio
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Check if audio track is available
        const audioTrack = displayStream.getAudioTracks()[0];
        if (!audioTrack) {
          console.error('[ERROR] No audio track available in the display media');
          alert('Please select "Share audio" when sharing your screen to enable transcription.');
          
          // Clean up the display stream
          displayStream.getTracks().forEach(track => track.stop());
          return false;
        }
        
        // Create a new MediaStream with just the audio track
        const audioStream = new MediaStream([audioTrack]);
        mediaStreamRef.current = audioStream;
        
        console.log('[DEBUG] System audio capture set up successfully');
        addToTranscriptionLog('System audio capture enabled');
        return true;
      } else {
        console.error('[ERROR] getDisplayMedia API not available');
        alert("Your browser doesn't support screen capture with audio. Please try a modern version of Chrome or Edge.");
        return false;
      }
    } catch (error) {
      console.error('[ERROR] Failed to set up system audio capture:', error);
      addToTranscriptionLog(`Audio capture failed: ${error.message}`);
      
      if (error.name === 'NotAllowedError') {
        alert('Permission to capture system audio was denied. Please allow screen sharing with audio to enable transcription.');
      } else {
        alert(`Failed to access system audio: ${error.message}`);
      }
      
      return false;
    }
  };

  // Function to start transcription
  const startTranscription = async () => {
    console.log('[DEBUG] Starting transcription...');
    addToTranscriptionLog('Starting transcription process');
    
    // Clear previous captions and set initial state
    setCurrentCaption('');
    setDebugInfo({
      lastRecognizedText: '',
      captionUpdateCount: 0,
      recognitionActive: true
    });
    
    // First, set up system audio capture
    const audioSetupSuccess = await setupSystemAudioCapture();
    if (!audioSetupSuccess) {
      console.error('[ERROR] Failed to set up audio for transcription');
      setDebugInfo(prev => ({...prev, recognitionActive: false}));
      return;
    }
    
    // Then play the video
    if (videoType === 'local' && videoRef.current) {
      if (!isPlaying) {
        console.log('[DEBUG] Starting video playback');
        try {
          await videoRef.current.play();
          console.log('[DEBUG] Video playback started successfully');
          setIsPlaying(true);
        } catch (err) {
          console.error('[ERROR] Failed to start video playback:', err);
          addToTranscriptionLog(`Playback error: ${err.message}`);
          return;
        }
      }
    } else if (videoType === 'youtube' && youtubePlayerRef.current) {
      if (!isPlaying) {
        console.log('[DEBUG] Starting YouTube video playback');
        youtubePlayerRef.current.playVideo();
      }
    }
    
    // Finally, initialize and start speech recognition
    if (!recognitionRef.current) {
      console.log('[DEBUG] Initializing speech recognition');
      if (!initSpeechRecognition()) {
        console.error('[ERROR] Speech recognition initialization failed');
        return;
      }
    }
    
    try {
      console.log('[DEBUG] Starting speech recognition');
      recognitionRef.current.start();
      setIsTranslating(true);
      console.log('[DEBUG] Transcription started successfully');
      addToTranscriptionLog('Transcription active');
    } catch (error) {
      console.error('[ERROR] Failed to start speech recognition:', error);
      addToTranscriptionLog(`Start error: ${error.message}`);
      
      if (error.name === 'InvalidStateError' && recognitionRef.current) {
        console.log('[DEBUG] Attempting to restart recognition after InvalidStateError');
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.start();
              setIsTranslating(true);
            }
          }, 300);
        } catch (err) {
          console.error('[ERROR] Failed to restart recognition:', err);
        }
      }
    }
  };

  // Function to stop transcription
  const stopTranscription = () => {
    console.log('[DEBUG] Stopping transcription...');
    
    // Stop media stream if exists
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
      console.log('[DEBUG] Media stream stopped');
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('[DEBUG] Speech recognition stopped');
      } catch (error) {
        console.error('[ERROR] Error stopping recognition:', error);
      }
    }
    
    setIsTranslating(false);
    setIsMicActive(false);
    addToTranscriptionLog('Transcription stopped');
  };

  // Handle video ended event
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (isTranslating) {
      stopTranscription();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up audio context and nodes
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => console.error('Error closing audio context:', err));
      }
      
      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
      
      // Stop media stream if exists
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
      
      // Destroy YouTube player
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
      }
      
      // Revoke any object URLs to prevent memory leaks
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // CSS class for play button
  const playButtonClass = `px-4 py-2 rounded-lg font-bold ${
    isPlaying 
      ? 'bg-red-500 hover:bg-red-600 text-white' 
      : 'bg-green-500 hover:bg-green-600 text-white'
  }`;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Video Transcription Plugin</h2>
      
      {/* Video selection area */}
      <div className="mb-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Select Video Source</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={videoUrl}
            onChange={handleUrlInput}
            placeholder="Enter video URL (YouTube links supported)"
            className="flex-grow p-2 border rounded"
          />
          <div className="flex gap-2">
            <button 
              onClick={triggerFileInput} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      </div>
      
      {/* Video player area */}
      <div className="mb-6">
        {videoUrl ? (
          <div className="bg-gray-900 p-2 rounded-lg">
            {videoType === 'local' ? (
              <video 
                ref={videoRef}
                src={videoUrl}
                className="w-full h-auto max-h-96 mb-2" 
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={handleVideoEnded}
                crossOrigin="anonymous"
              />
            ) : (
              <div id="youtube-container" className="aspect-video w-full">
                {/* YouTube iframe will be inserted here */}
              </div>
            )}
            <div className="flex justify-between items-center mt-2">
              <button 
                onClick={togglePlayPause}
                className={playButtonClass}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={startTranscription}
                  disabled={!videoUrl || isTranslating}
                  className={`px-4 py-2 rounded ${
                    !videoUrl || isTranslating 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  Start Transcription
                </button>
                <button 
                  onClick={stopTranscription}
                  disabled={!isTranslating}
                  className={`px-4 py-2 rounded ${
                    !isTranslating 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-yellow-500 text-white hover:bg-yellow-600'
                  }`}
                >
                  Stop Transcription
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 p-8 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <p className="text-gray-500">Enter a YouTube URL or select a local video file</p>
          </div>
        )}
      </div>
      
      {/* Settings area */}
      <div className="mb-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Settings</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
              className="mr-2"
            />
            Dark Mode
          </label>
        </div>
      </div>
      
      {/* ISLViewer component */}
      <div className="mb-6">
        <ISLViewer 
          darkMode={darkMode} 
          shouldTranslate={isTranslating}
          onTranslationDone={stopTranscription}
          speechInput={currentCaption} 
          isListening={isMicActive}
        />
      </div>
      
      {/* Debug/Transcription Log */}
      <div className="mb-6 bg-gray-100 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Transcription Log</h3>
        <div className="max-h-40 overflow-y-auto bg-white p-2 rounded border text-sm font-mono">
          {transcriptionLog.length > 0 ? (
            transcriptionLog.map((log, index) => (
              <div key={index} className="text-xs mb-1">{log}</div>
            ))
          ) : (
            <div className="text-gray-500 italic">No transcription activity yet</div>
          )}
        </div>
      </div>
      
      {/* Advanced Debug Information */}
      <div className="mb-6 bg-gray-100 p-4 rounded-lg text-sm border border-blue-300">
        <h3 className="font-semibold mb-2 text-blue-700">Speech Recognition Debug</h3>
        <div className="bg-white p-3 rounded border">
          <pre className="whitespace-pre-wrap text-xs">
            {`Last Recognized Text: "${debugInfo.lastRecognizedText}"
Caption Updates: ${debugInfo.captionUpdateCount}
Recognition Active: ${debugInfo.recognitionActive}
Current Caption Length: ${currentCaption ? currentCaption.length : 0}
Current Caption: "${currentCaption}"`}
          </pre>
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs font-semibold">Manual Caption Test:</p>
            <button 
              onClick={() => {
                const testText = "This is a test caption " + new Date().toLocaleTimeString();
                console.log("[TEST] Setting test caption:", testText);
                setCurrentCaption(testText);
                addToTranscriptionLog(`Test caption set: ${testText}`);
              }}
              className="mt-1 bg-blue-500 text-white px-2 py-1 text-xs rounded"
            >
              Set Test Caption
            </button>
          </div>
        </div>
      </div>

      {/* Debug/status information */}
      <div className="bg-gray-100 p-4 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">Status Information</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>Video Type: {videoType === 'youtube' ? 'YouTube' : 'Local Video'}</div>
          <div>Video Source: {videoUrl ? 'Loaded' : 'Not loaded'}</div>
          <div>Playback: {isPlaying ? 'Playing' : 'Paused'}</div>
          <div>Transcription: {isTranslating ? 'Active' : 'Inactive'}</div>
        </div>
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            <strong>Important:</strong> For transcription to work, you'll need to share your screen with audio when prompted.
            This allows the system to capture the audio from the video for transcription.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoTranscriptionPlugin;