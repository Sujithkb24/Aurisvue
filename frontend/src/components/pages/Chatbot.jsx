import React, { useState } from 'react';
import axios from 'axios';
import { SocketProvider } from '../../contexts/SocketContext';
import ISLViewer from '../ISL_viewer';

const ISLChatbot = () => {
  const [userInput, setUserInput] = useState('');
  const [botReply, setBotReply] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [shouldTranslate, setShouldTranslate] = useState(true);

  const handleChat = async () => {
    if (!userInput.trim()) return;

    setIsLoading(true);
    setError('');
    setBotReply(''); // Clear previous replies when sending new message

    try {
      const res = await axios.post('http://localhost:5000/api/chat/chats', {
        prompt: userInput,
      });

      const reply = res.data.response;
      setBotReply(reply);
      setShouldTranslate(true); // Reset translation state for new replies

      if (res.data.metadata) {
        setMetadata(res.data.metadata);
      }

      setUserInput('');
    } catch (err) {
      console.error('Chat Error:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChat();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl glassmorphism p-8 rounded-2xl shadow-xl mb-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-cyan-500 p-3 rounded-full mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-center">ISL Chatbot</h1>
        </div>
        
        <p className="text-center mb-8 text-gray-300">Ask anything in simple language for ISL translation</p>

        <div className="mb-4 relative">
          <textarea
            className="w-full p-4 rounded-xl border border-gray-700 bg-black bg-opacity-50 text-white resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400"
            rows={3}
            placeholder="Type something like 'how are you?'"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleChat}
          disabled={isLoading || !userInput.trim()}
          className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center ${
            isLoading || !userInput.trim()
              ? 'bg-cyan-700 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-600'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 bg-red-900 bg-opacity-40 border border-red-700 rounded-xl p-4 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {isLoading && !botReply && (
          <div className="mt-8 bg-black bg-opacity-40 border border-gray-700 rounded-xl p-6 flex flex-col items-center">
            <div className="flex space-x-2 justify-center items-center">
              <div className="h-3 w-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="h-3 w-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="h-3 w-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-4 text-gray-400">Generating response and preparing ISL translation...</p>
          </div>
        )}

        {botReply && (
          <div className="mt-8 bg-black bg-opacity-40 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center mb-3">
              <div className="bg-cyan-500 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-cyan-400">Bot Reply</h2>
            </div>
            <p className="mt-3 text-lg text-gray-200">{botReply}</p>

            {metadata && (
              <div className="mt-4 text-sm text-gray-400 border-t border-gray-700 pt-3">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Words: {metadata.wordCount}</p>
                </div>
                {metadata.containsPrioritizedVocab && (
                  <div className="flex items-center mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-green-400">ISL-friendly vocabulary detected</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ISL Viewer Section - Placed below the chat interface */}
      {botReply && (
        <div className="w-full max-w-3xl glassmorphism p-8 rounded-2xl shadow-xl mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-purple-500 p-2 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-purple-400">ISL Translation</h2>
          </div>
          
          <div className="bg-black bg-opacity-60 rounded-xl p-4 flex justify-center">
            <SocketProvider>
              <ISLViewer
                speechInput={botReply}
                shouldTranslate={shouldTranslate}
                onTranslationDone={() => setShouldTranslate(false)}
              />
            </SocketProvider>
          </div>
        </div>
      )}
    </div>
  );
};

export default ISLChatbot;