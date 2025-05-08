import React, { useState } from 'react';
import axios from 'axios';

const ISLChatbot = () => {
  const [userInput, setUserInput] = useState('');
  const [botReply, setBotReply] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState(null);

  const handleChat = async () => {
    if (!userInput.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await axios.post('http://localhost:5000/api/chat/chats', {
        prompt: userInput,
      });

      const reply = res.data.response;
      setBotReply(reply);

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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-3xl glassmorphism p-8 rounded-2xl shadow-xl">
        <h1 className="text-4xl font-bold mb-4 text-center">🧠 ISL Chatbot</h1>
        <p className="text-center mb-6 text-gray-300">Ask anything in simple language</p>

        <div className="mb-4">
          <textarea
            className="w-full p-4 rounded-xl border border-gray-700 bg-black bg-opacity-50 text-white resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400"
            rows={3}
            placeholder="Type something like 'how are you?'"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
        </div>

        <button
          onClick={handleChat}
          disabled={isLoading || !userInput.trim()}
          className={`w-full py-3 rounded-xl font-medium transition ${
            isLoading || !userInput.trim()
              ? 'bg-cyan-700 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-600'
          }`}
        >
          {isLoading ? 'Processing...' : 'Send'}
        </button>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

        {botReply && (
          <div className="mt-8 bg-black bg-opacity-40 border border-gray-700 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-cyan-400">🤖 Bot Reply</h2>
            <p className="mt-3 text-lg text-gray-200">{botReply}</p>

            {metadata && (
              <div className="mt-4 text-sm text-gray-400">
                <p>Words: {metadata.wordCount}</p>
                {metadata.containsPrioritizedVocab && (
                  <p className="text-green-400 mt-1">✓ ISL-friendly vocabulary detected</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ISLChatbot;
