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
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Leaderboard</h2>
      <ol className="space-y-2">
        {leaderboard.map((user, index) => (
          <li key={index} className="text-lg font-medium text-gray-700">
            <span className="font-semibold">User ID:</span> {user.userId} - <span className="font-semibold">Score:</span> {user.score}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default Leaderboard;
