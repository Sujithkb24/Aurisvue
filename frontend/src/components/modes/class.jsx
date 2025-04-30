import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';
import ISLViewer from '../ISL_viewer'; // Using ISLViewer instead of ISLModel
import Header from '../header';

const ClassMode = ({ darkMode = true, onBack }) => {
  const [isMicActive, setIsMicActive] = useState(false);
  const [detectedSpeech, setDetectedSpeech] = useState("Today we'll learn about the planets in our solar system.");
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'student', text: 'Could you explain that again?', timestamp: '10:30 AM' },
    { id: 2, sender: 'teacher', text: 'Sure! I was explaining how sign language uses both hands.', timestamp: '10:31 AM' }
  ]);
  
  // Refs for Web Speech API
  const recognitionRef = useRef(null);
  
  // Teaching content
  const teachingContent = [
    "Today we'll learn about the planets in our solar system.",
    "Mercury is the smallest planet and closest to the Sun.",
    "Venus is the hottest planet due to its thick atmosphere.",
    "Earth is the only known planet with life."
  ];
  
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
      simulateTeaching();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  };
  
  // Stop speech recognition
  const stopMic = () => {
    recognitionRef.current.stop();
    setIsMicActive(false);
    
    // Clear any teaching simulation intervals
    if (teachingIntervalRef.current) {
      clearInterval(teachingIntervalRef.current);
      teachingIntervalRef.current = null;
    }
  };
  
  // Ref for teaching interval
  const teachingIntervalRef = useRef(null);
  
  // Simulate teaching with predefined content
  const simulateTeaching = () => {
    let phraseIndex = 0;
    
    // Clear any existing interval
    if (teachingIntervalRef.current) {
      clearInterval(teachingIntervalRef.current);
    }
    
    // Set initial phrase
    setDetectedSpeech(teachingContent[phraseIndex]);
    
    // Add the first phrase to history
    setTranscriptHistory(prev => [
      { text: teachingContent[phraseIndex], timestamp: new Date().toLocaleTimeString() },
      ...prev
    ]);
    
    // Set up interval to cycle through phrases
    teachingIntervalRef.current = setInterval(() => {
      if (!isMicActive) {
        clearInterval(teachingIntervalRef.current);
        return;
      }
      
      phraseIndex = (phraseIndex + 1) % teachingContent.length;
      setDetectedSpeech(teachingContent[phraseIndex]);
      
      // Add to history
      setTranscriptHistory(prev => [
        { text: teachingContent[phraseIndex], timestamp: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9) // Keep only the last 10 entries
      ]);
    }, 5000);
    
    return () => {
      if (teachingIntervalRef.current) {
        clearInterval(teachingIntervalRef.current);
      }
    };
  };

  // Toggle history panel
  const toggleHistory = () => {
    setShowHistory(prev => !prev);
  };
  
  // Clear history
  const clearHistory = () => {
    setTranscriptHistory([]);
  };

  // Send message in chat
  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = { 
        id: messages.length + 1, 
        sender: 'student', 
        text: message,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages([...messages, newMessage]);
      setMessage('');
      
      // Simulate teacher response
      setTimeout(() => {
        const teacherResponse = { 
          id: messages.length + 2, 
          sender: 'teacher', 
          text: `I understand your question about "${message.trim()}". Let me explain that further.`,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, teacherResponse]);
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-screen w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Header title="Class Mode" showBackButton={true} onBack={onBack} darkMode={darkMode} />
      
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* 3D Model View */}
        <div className="w-full md:w-2/3 h-1/2 md:h-full relative">
          <ISLViewer 
            darkMode={darkMode} 
            mode="class" 
            speechInput={detectedSpeech}
            isListening={isMicActive}
          />
          
          {/* Current transcript overlay */}
          {detectedSpeech && (
            <div className={`absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-opacity-75 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <p className="text-center">{detectedSpeech}</p>
            </div>
          )}
        </div>
        
        {/* Class Interface */}
        <div className={`w-full md:w-1/3 h-1/2 md:h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h2 className="font-bold mb-2">Science Class - Topic: Solar System</h2>
            <div className="flex space-x-2">
              <button 
                className={`px-4 py-2 rounded-lg ${isMicActive 
                  ? (darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600') 
                  : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')} text-white flex items-center space-x-2`}
                onClick={isMicActive ? stopMic : startMic}
              >
                {isMicActive ? <MicOff size={18} /> : <Mic size={18} />}
                <span>{isMicActive ? "Stop Teaching" : "Start Teaching"}</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {/* Toggle for transcript history */}
            <div className="flex justify-between items-center mb-2">
              <button 
                onClick={toggleHistory}
                className="flex items-center space-x-1 text-sm"
              >
                {showHistory ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                <span>Teaching History</span>
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
            
            {/* Transcript history panel */}
            {showHistory && (
              <div className={`mb-4 max-h-32 overflow-y-auto rounded-lg p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
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
            
            <h3 className="font-medium mb-2 mt-4">Questions</h3>
            <div className="space-y-3">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`p-3 rounded-lg ${msg.sender === 'student' 
                    ? (darkMode ? 'bg-blue-900/30 ml-6' : 'bg-blue-100 ml-6') 
                    : (darkMode ? 'bg-gray-700 mr-6' : 'bg-gray-200 mr-6')}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium">{msg.sender === 'student' ? 'You' : 'Teacher'}</p>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{msg.timestamp}</span>
                  </div>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <input 
                type="text" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..." 
                className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <button 
                onClick={sendMessage} 
                className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
              >
                <MessageSquare size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassMode;