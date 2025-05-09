import React, { useState } from 'react';
import { Send, MessageSquare, ChevronUp, ChevronDown, X } from 'lucide-react';
import ISLViewer from '../ISL_viewer';
import Header from '../header';
import { SocketProvider, useSocket } from '../../contexts/SocketContext';

const YouTube = ({ darkMode = true, onBack }) => {
  const [inputText, setInputText] = useState('');
  const [youtubeURL, setYoutubeURL] = useState('');
  const [embedURL, setEmbedURL] = useState('');
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFloatingControls, setShowFloatingControls] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [shouldTranslate, setShouldTranslate] = useState(false);

  const { isConnected, sendSpeechTranscript, islResponse, resetIslResponse } = useSocket();

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim() === '') return;
    setTranscriptHistory((prev) => [
      { text: inputText, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9),
    ]);
    sendSpeechTranscript(inputText);
    setShouldTranslate(true);
    setInputText('');
  };

  const handleYoutubeURLChange = (e) => {
    const url = e.target.value;
    setYoutubeURL(url);
    const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    if (videoIdMatch) {
      setEmbedURL(`https://www.youtube.com/embed/${videoIdMatch[1]}`);
    } else {
      setEmbedURL('');
    }
  };

  const toggleHistory = () => setShowHistory((prev) => !prev);
  const clearHistory = () => setTranscriptHistory([]);

  const isMobile = windowWidth < 768;
  const shouldShowMainControls = !isMobile || (isMobile && !showFloatingControls);

  return (
    <div className={`flex flex-col h-screen w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Header title="ISL Translator" showBackButton={true} onBack={onBack} darkMode={darkMode} />

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Viewer Panel */}
        <div className="w-full md:w-2/3 h-1/2 md:h-full relative flex flex-col items-center p-4 space-y-4">
          {/* YouTube Video Embed */}
          {embedURL && (
            <div className="w-full aspect-video mb-4">
              <iframe
                width="100%"
                height="100%"
                src={embedURL}
                title="YouTube video player"
                frameBorder="0"
                allowFullScreen
                className="rounded-xl"
              ></iframe>
            </div>
          )}

          <SocketProvider>
            <ISLViewer
              darkMode={darkMode}
              mode="public"
              speechInput={inputText}
              isListening={false}
              islResponse={islResponse}
              shouldTranslate={true}
              onTranslationDone={() => setShouldTranslate(false)}
            />
          </SocketProvider>
        </div>

        {/* Control Panel */}
        <div className={`w-full md:w-1/3 h-1/2 md:h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'} ${shouldShowMainControls ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex flex-col h-full p-4">
            {/* YouTube URL Input */}
            <div className="mb-6">
              <label className="block mb-2 font-medium text-lg">YouTube Video</label>
              <input
                type="text"
                value={youtubeURL}
                onChange={handleYoutubeURLChange}
                placeholder="Paste YouTube link here..."
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-200'
                } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            {/* ISL Translation Input */}
            <div className="flex-1 flex flex-col justify-center items-center">
              <h2 className="mb-4 text-xl font-medium">ISL Translation</h2>
              <p className="text-center mb-6">Enter text to translate into Indian Sign Language</p>
              <form onSubmit={handleSubmit} className="w-full max-w-md">
                <div className="flex mb-4">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type text to translate..."
                    className={`flex-1 px-4 py-3 rounded-l-lg ${
                      darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-200'
                    } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <button
                    type="submit"
                    className={`px-4 py-3 rounded-r-lg ${
                      darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                    } text-white`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
              <button
                onClick={handleSubmit}
                className={`px-6 py-3 rounded-lg font-medium ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                } text-white mt-4`}
                disabled={inputText.trim() === ''}
              >
                Translate to ISL
              </button>
            </div>

            {/* History */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <button onClick={toggleHistory} className="flex items-center space-x-1 text-sm">
                  {showHistory ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  <span>Translation History</span>
                </button>
                {transcriptHistory.length > 0 && (
                  <button onClick={clearHistory} className="text-sm text-red-500 hover:text-red-600">
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

      {/* Floating Controls for Mobile */}
      {isMobile && (
        <>
          <div className="fixed bottom-6 right-6 z-10">
            <button
              onClick={() => setShowFloatingControls(!showFloatingControls)}
              className={`p-4 rounded-full shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
            >
              <MessageSquare size={24} className="text-blue-500" />
            </button>
          </div>

          {showFloatingControls && (
            <div className={`fixed bottom-20 right-6 p-4 rounded-lg shadow-lg z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">ISL Translation</h3>
                <button onClick={() => setShowFloatingControls(false)} className="p-1">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mb-2">
                <div className="flex">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type text..."
                    className={`flex-1 px-3 py-2 text-sm rounded-l-lg ${
                      darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-100 text-gray-900 border-gray-200'
                    } border focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  <button
                    type="submit"
                    className={`px-3 py-2 rounded-r-lg ${
                      darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                    } text-white`}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default YouTube;
