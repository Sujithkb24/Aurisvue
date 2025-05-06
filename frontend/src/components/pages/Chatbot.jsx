import React, { useState } from 'react';
import axios from 'axios';

// Common words that have dedicated signs
const wordSigns = {
  hello: "/signs/Hello.png",
  hi: "/signs/Hello.png",
  thank: "/signs/thank_you.png",
  thanks: "/signs/thank_you.png",
  you: "/signs/you.png",
  eat: "/signs/eat.png",
  water: "/signs/water.png",
  sleep: "/signs/sleep.png",
  help: "/signs/help.png",
  drink: "/signs/drink.png",
  bye: "/signs/bye.png",
  goodbye: "/signs/bye.png",
  please: "/signs/please.png",
  sorry: "/signs/sorry.png"
};

const ISLChatbot = () => {
  const [userInput, setUserInput] = useState('');
  const [botReply, setBotReply] = useState('');
  const [signImages, setSignImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Function to get sign for a word or its letters
  const getSignsForWord = (word) => {
    const lowerWord = word.toLowerCase();
    
    // First try to find the complete word sign
    if (wordSigns[lowerWord]) {
      return [wordSigns[lowerWord]];
    }
    
    // If no word sign found, break down into letters
    return word.split('').map(letter => {
      if (/[a-zA-Z]/.test(letter)) {
        return /signs/`${letter.toUpperCase()}.png`;
      }
      return null;
    }).filter(Boolean);
  };

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

      // Process the reply to get signs
      const words = reply.match(/[a-zA-Z']+/g) || [];
      const signs = [];
      
      words.forEach(word => {
        signs.push(...getSignsForWord(word));
      });

      setSignImages(signs);
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

  // Handle image loading errors
  const handleImageError = (index) => {
    console.log(`Image failed to load: ${signImages[index]}`);
    // Remove the failed image from display
    setSignImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">ISL Chatbot</h1>
      <div className="mb-4">
        <textarea
          className="w-full p-3 border rounded"
          rows={3}
          placeholder="Ask something..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyPress}
        ></textarea>
      </div>
      <button
        onClick={handleChat}
        disabled={isLoading || !userInput.trim()}
        className={`px-4 py-2 rounded text-white ${
          isLoading || !userInput.trim() ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isLoading ? 'Sending...' : 'Send'}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {botReply && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h2 className="text-xl font-semibold">Bot Reply:</h2>
          <p className="text-lg mt-2">{botReply}</p>

          <h3 className="text-lg font-medium mt-4">Sign Language:</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {signImages.map((img, idx) => (
              <div key={idx} className="text-center">
                <img
                  src={img}
                  alt="sign"
                  className="w-20 h-20 object-contain border rounded bg-white"
                  onError={() => handleImageError(idx)}
                />
                <span className="text-xs block mt-1">
                  {img.split('/').pop().replace('.png', '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ISLChatbot;