import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/leaderboard')
      .then(res => setLeaderboard(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-4">Leaderboard</h2>
      <ol className="space-y-3">
        {leaderboard.map((user, index) => (
          <li
            key={index}
            className="text-base sm:text-lg font-medium text-gray-700 flex flex-col sm:flex-row sm:justify-between"
          >
            <div><span className="font-semibold">User ID:</span> {user.userId}</div>
            <div><span className="font-semibold">Score:</span> {user.score}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default Leaderboard;
