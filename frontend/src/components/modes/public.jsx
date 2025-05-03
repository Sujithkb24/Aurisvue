import React,{useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';
import ISLViewer from '../ISL_viewer'; 
import Header from '../header';
import React from 'react';

const PublicMode = ({ darkMode = true, onBack }) => {
  const [isMicActive, setIsMicActive] = useState(false);
  const [detectedSpeech, setDetectedSpeech] = useState("");
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFloatingControls, setShowFloatingControls] = useState(true);
  
  // Refs for Web Speech API
  const recognitionRef = useRef(null);
  
  // Initialize Web Speech API
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
      
      setDetectedSpeech(transcript);
      
      // Add to history when we have a final result
      if (event.results[0].isFinal) {
        // Add to history
        setTranscriptHistory(prev => [
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
    
    return () => {
      // Clean up
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  // Start speech recognition
  const startMic = () => {
    try {
      recognitionRef.current.start();
      setIsMicActive(true);
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  };
  
  // Stop speech recognition
  const stopMic = () => {
    recognitionRef.current.stop();
    setIsMicActive(false);
    setDetectedSpeech("");
  };
  
  // Toggle history panel
  const toggleHistory = () => {
    setShowHistory(prev => !prev);
  };
  
  // Clear history
  const clearHistory = () => {
    setTranscriptHistory([]);
  };

  return (
    <div className={`flex flex-col h-screen w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Header title="Public Mode" showBackButton={true} onBack={onBack} darkMode={darkMode} />
      
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* 3D Model View using ISLViewer*/}
        <div className="w-full md:w-2/3 h-1/2 md:h-full relative">
          <ISLViewer 
            darkMode={darkMode} 
            mode="public" 
            speechInput={detectedSpeech} // Pass detected speech to ISLViewer
            isListening={isMicActive} // Pass mic state
          />
          
          {/* Current transcript overlay */}
          {detectedSpeech && (
            <div className={`absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-opacity-75 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <p className="text-center">{detectedSpeech}</p>
            </div>
          )}
        </div>
        
        {/* Controls Panel - only visible on larger screens or when expanded on mobile */}
        <div className={`w-full md:w-1/3 h-1/2 md:h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'} ${showFloatingControls && window.innerWidth < 768 ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex flex-col h-full p-4">
            {/* Controls section */}
            <div className="flex-1 flex flex-col justify-center items-center">
              <div 
                className={`mb-6 p-6 rounded-full transition-colors ${isMicActive 
                  ? 'bg-red-500 animate-pulse' 
                  : (darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')}`}
              >
                {isMicActive ? <MicOff size={32} /> : <Mic size={32} />}
              </div>
              <p className="text-center mb-6">
                {isMicActive 
                  ? "Listening... Speak clearly for ISL translation" 
                  : "Press the microphone button to start ISL translation"}
              </p>
              <button 
                onClick={isMicActive ? stopMic : startMic}
                className={`px-6 py-3 rounded-lg font-medium ${isMicActive 
                  ? (darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600') 
                  : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')} text-white`}
              >
                {isMicActive ? "Stop Listening" : "Start Listening"}
              </button>
            </div>
            
            {/* History section */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <button 
                  onClick={toggleHistory}
                  className="flex items-center space-x-1 text-sm"
                >
                  {showHistory ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  <span>Speech History</span>
                </button>
                
                {transcriptHistory.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {showHistory && (
                <div className={`max-h-40 overflow-y-auto rounded-lg p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {transcriptHistory.length > 0 ? (
                    <ul className="space-y-2">
                      {transcriptHistory.map((item, index) => (
                        <li key={index} className="text-sm border-b border-gray-600 pb-1 last:border-b-0">
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.timestamp}</span>
                          <p>{item.text}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-sm text-gray-500">No history yet</p>
                  )}
                </div>
              )}
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
            onClick={isMicActive ? stopMic : startMic}
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
      
      {/* On-the-go floating controls like Google Maps */}
      {showFloatingControls && window.innerWidth < 768 && (
        <div className={`fixed bottom-20 right-6 p-4 rounded-lg shadow-lg z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">ISL Translation</h3>
            <button onClick={() => setShowFloatingControls(false)} className="p-1">
              <X size={16} />
            </button>
          </div>
          
          {detectedSpeech && (
            <div className={`mb-3 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-sm">{detectedSpeech}</p>
            </div>
          )}
          
          <button
            onClick={isMicActive ? stopMic : startMic}
            className={`w-full py-2 rounded-lg font-medium ${isMicActive 
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
        </div>
      )}
    </div>
  );
};

export default PublicMode;