import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, MessageSquare, ChevronUp, ChevronDown, Globe } from 'lucide-react';
import ISLViewer from '../ISL_viewer';
import Header from '../header';
import { SocketProvider, useSocket } from '../../contexts/SocketContext';

const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'te-IN', name: 'Telugu' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'ml-IN', name: 'Malayalam' }
];

const PublicMode = ({ darkMode = true, onBack }) => {
  const [isMicActive, setIsMicActive] = useState(false);
  const [detectedSpeech, setDetectedSpeech] = useState('');
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFloatingControls, setShowFloatingControls] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [shouldTranslate, setShouldTranslate] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const { isConnected, sendSpeechTranscript, islResponse, resetIslResponse } = useSocket();

  // Track window size for responsive UI
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle stopping media recorder when component unmounts
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startMic = async () => {
    try {
      resetIslResponse();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendAudioToServer(audioBlob);
        
        // Clear the audio chunks for the next recording
        audioChunksRef.current = [];
        
        // Restart recording if still active
        if (isMicActive) {
          mediaRecorderRef.current.start(3000); // Capture in 3-second chunks
        }
      };

      // Start recording in chunks
      mediaRecorderRef.current.start(3000); // Capture in 3-second chunks
      setIsMicActive(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied. Please allow microphone access to use this feature.');
    }
  };

  const stopMic = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsMicActive(false);
    setDetectedSpeech('');
  };

  const sendAudioToServer = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('predominantLang', selectedLanguage);

      const response = await fetch('http://localhost:5000/api/audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      
      if (result.transcript) {
        setDetectedSpeech(result.transcript);
        
        // Add to history
        setTranscriptHistory((prev) => [
          { text: result.transcript, timestamp: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9),
        ]);

        // Send to socket for ISL translation
        sendSpeechTranscript(result.transcript);
      }
    } catch (error) {
      console.error('Error sending audio to server:', error);
    }
  };

  const toggleHistory = () => {
    setShowHistory((prev) => !prev);
  };

  const clearHistory = () => {
    setTranscriptHistory([]);
  };

  const toggleLanguageSelector = () => {
    setShowLanguageSelector(prev => !prev);
  };

  const changeLanguage = (langCode) => {
    setSelectedLanguage(langCode);
    setShowLanguageSelector(false);
  };

  // Determine if we should show the floating controls
  const isMobile = windowWidth < 768;
  const shouldShowMainControls = !isMobile || (isMobile && !showFloatingControls);

  const handleTranslateClick = () => {
    if (detectedSpeech && detectedSpeech.trim() !== '') {
      setShouldTranslate(true);
    }
  };

  const getLanguageName = (code) => {
    const language = LANGUAGES.find(lang => lang.code === code);
    return language ? language.name : code;
  };

  return (
    <div className={`flex flex-col h-screen w-full transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
    }`}>
      <Header title="Public Mode" showBackButton={true} onBack={onBack} darkMode={darkMode} />
    
      <div className="flex flex-col flex-1 overflow-hidden md:flex-row">
        {/* Main content area with ISL Viewer */}
        <div className="relative flex items-center justify-center w-full md:w-2/3 h-1/2 md:h-full bg-gradient-to-br from-gray-950 to-gray-800">
          <div className="absolute inset-0 opacity-20 bg-pattern"></div>
          
          <SocketProvider>
            <ISLViewer
              darkMode={darkMode}
              mode="public"
              speechInput={detectedSpeech}
              isListening={isMicActive}
              islResponse={islResponse}
              shouldTranslate={shouldTranslate}
              onTranslationDone={() => setShouldTranslate(false)}
            />
          </SocketProvider>
          <br />
          <br />
          {/* Current transcript overlay */}
          {detectedSpeech && (
            
            <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 max-w-md w-full mx-auto p-4 rounded-lg mt-30 ${
              darkMode ? 'bg-gray-800/90' : 'bg-white/90'
            } backdrop-blur-sm shadow-lg border ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            } transition-all duration-300`}>
              <p className="font-medium text-center">{detectedSpeech}</p>
              
              <div className="flex justify-center mt-3">
                <button
                  onClick={handleTranslateClick}
                  className={`px-4 py-2 rounded-md font-medium transition-all duration-200 transform hover:scale-105 ${
                    darkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } shadow-md`}
                >
                  Translate to ISL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls Panel - only visible on larger screens or when expanded on mobile */}
        <div className={`w-full md:w-1/3 h-1/2 md:h-full flex flex-col ${
          darkMode ? 'bg-gray-800 border-l border-gray-700' : 'bg-white border-l border-gray-200'
        } ${shouldShowMainControls ? 'flex' : 'hidden md:flex'} transition-all duration-300`}>
          <div className="flex flex-col h-full p-6">
            {/* Language Selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={toggleLanguageSelector}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  } transition-colors duration-200`}
                >
                  <Globe size={18} />
                  <span>{getLanguageName(selectedLanguage)}</span>
                  {showLanguageSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
              
              {showLanguageSelector && (
                <div className={`mt-2 rounded-lg overflow-hidden border ${
                  darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'
                } shadow-lg`}>
                  <ul>
                    {LANGUAGES.map((lang) => (
                      <li key={lang.code}>
                        <button
                          onClick={() => changeLanguage(lang.code)}
                          className={`w-full text-left px-4 py-2 ${
                            selectedLanguage === lang.code
                              ? (darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white')
                              : (darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100')
                          } transition-colors duration-200`}
                        >
                          {lang.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Controls section */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div
                className={`mb-8 p-8 rounded-full transition-all duration-300 ${
                  isMicActive
                    ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse'
                    : darkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                } transform hover:scale-105`}
              >
                {isMicActive ? <MicOff size={36} /> : <Mic size={36} />}
              </div>
              
              <p className="mb-8 text-lg text-center">
                {isMicActive
                  ? `Listening in ${getLanguageName(selectedLanguage)}...`
                  : 'Press the microphone button to start ISL translation'}
              </p>
              
              <button
                onClick={isMicActive ? stopMic : startMic}
                className={`px-8 py-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg ${
                  isMicActive
                    ? darkMode
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                      : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                    : darkMode
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                      : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30'
                } text-white`}
              >
                {isMicActive ? 'Stop Listening' : 'Start Listening'}
              </button>
            </div>

            {/* History section */}
            <div className="pt-4 mt-8 border-t border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={toggleHistory}
                  className="flex items-center space-x-2 text-sm font-medium transition hover:text-blue-400"
                >
                  {showHistory ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  <span>Speech History</span>
                </button>

                {transcriptHistory.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-sm text-red-500 transition hover:text-red-400"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {showHistory && (
                <div className={`mt-2 max-h-48 overflow-y-auto rounded-lg p-3 ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                } border ${
                  darkMode ? 'border-gray-600' : 'border-gray-300'
                } transition-all duration-300`}>
                  {transcriptHistory.length > 0 ? (
                    <ul className="space-y-3">
                      {transcriptHistory.map((item, index) => (
                        <li 
                          key={index} 
                          className={`p-2 rounded-lg ${
                            darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'
                          } transition-colors duration-200 border-b border-gray-700 last:border-b-0`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {item.timestamp}
                            </span>
                          </div>
                          <p className="text-sm">{item.text}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-4 text-sm text-center text-gray-500">No speech history yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Google Maps style floating action button for mobile */}
      {isMobile && (
        <div className="fixed z-10 bottom-6 right-6">
          <button
            onClick={() => setShowFloatingControls(!showFloatingControls)}
            className={`p-4 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } border ${
              darkMode ? 'border-gray-700' : 'border-gray-300'
            }`}
          >
            <MessageSquare size={24} className="text-blue-500" />
          </button>

          {/* Quick mic toggle floating button */}
          <button
            onClick={isMicActive ? stopMic : startMic}
            className={`absolute bottom-16 right-0 p-4 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 ${
              isMicActive
                ? 'bg-red-500 shadow-red-500/30'
                : (darkMode ? 'bg-blue-600 shadow-blue-600/30' : 'bg-blue-500 shadow-blue-500/30')
            } text-white`}
          >
            {isMicActive ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
        </div>
      )}

      {/* On-the-go floating controls like Google Maps */}
      {isMobile && showFloatingControls && (
        <div className={`fixed bottom-24 right-6 p-5 rounded-xl shadow-xl z-10 max-w-xs w-full transform transition-all duration-300 ${
          darkMode ? 'bg-gray-800/95' : 'bg-white/95'
        } backdrop-blur-sm border ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">ISL Translation</h3>
            <button 
              onClick={() => setShowFloatingControls(false)} 
              className="p-1 transition-colors rounded-full hover:bg-gray-700"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mobile language selector */}
          <div className="mb-4">
            <button 
              onClick={toggleLanguageSelector}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              } transition-colors duration-200`}
            >
              <div className="flex items-center space-x-2">
                <Globe size={16} />
                <span>{getLanguageName(selectedLanguage)}</span>
              </div>
              {showLanguageSelector ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {showLanguageSelector && (
              <div className={`mt-2 rounded-lg overflow-hidden border ${
                darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'
              } max-h-32 overflow-y-auto`}>
                <ul>
                  {LANGUAGES.map((lang) => (
                    <li key={lang.code}>
                      <button
                        onClick={() => changeLanguage(lang.code)}
                        className={`w-full text-left px-3 py-2 text-sm ${
                          selectedLanguage === lang.code
                            ? (darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white')
                            : (darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100')
                        } transition-colors duration-200`}
                      >
                        {lang.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {detectedSpeech && (
            <div className={`mb-4 p-3 rounded-lg ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            } border ${
              darkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              <p className="text-sm">{detectedSpeech}</p>
            </div>
          )}

          <div className="flex flex-col space-y-3">
            <button
              onClick={isMicActive ? stopMic : startMic}
              className={`w-full py-3 rounded-lg font-medium transition-all duration-300 ${
                isMicActive
                  ? (darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600')
                  : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')
              } text-white flex items-center justify-center space-x-2 shadow-md`}
            >
              {isMicActive ? (
                <>
                  <MicOff size={18} />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Mic size={18} />
                  <span>Start Listening</span>
                </>
              )}
            </button>
            
            {detectedSpeech && (
              <button
                onClick={handleTranslateClick}
                className={`w-full py-3 rounded-lg font-medium transition-all duration-300 ${
                  darkMode 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-green-500 hover:bg-green-600'
                } text-white flex items-center justify-center space-x-2 shadow-md`}
              >
                <span>Translate to ISL</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMode;