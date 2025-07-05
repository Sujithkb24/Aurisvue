import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown, Star, Users } from 'lucide-react';
import axios from 'axios';
// Accept darkMode as prop for theme consistency
const Leaderboard = ({ darkMode = true }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {

    const timer = setTimeout(() => {
   
      axios.get('http://localhost:5000/api/leaderboard')
        .then(res => {
          setLeaderboard(res.data);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to load leaderboard');
          setLoading(false);
        });
    
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Rank icons and colors for top positions
  const getRankIcon = (index) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6" />;
      case 1: return <Trophy className="w-6 h-6" />;
      case 2: return <Medal className="w-6 h-6" />;
      default: return <Award className="w-5 h-5 opacity-60" />;
    }
  };

  const getRankStyle = (index) => {
    const baseStyle = "flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl";
    
    switch (index) {
      case 0: return `${baseStyle} bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 border-yellow-300 text-white shadow-xl shadow-yellow-500/25 transform scale-105`;
      case 1: return `${baseStyle} bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 border-gray-300 text-white shadow-xl shadow-gray-400/25 transform scale-102`;
      case 2: return `${baseStyle} bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 border-orange-300 text-white shadow-xl shadow-orange-500/25`;
      default: return `${baseStyle} ${darkMode 
        ? 'bg-gray-800/50 border-gray-700 text-white hover:bg-gray-800/70 backdrop-blur-sm' 
        : 'bg-white/80 border-gray-200 text-gray-900 hover:bg-white backdrop-blur-sm'} shadow-lg`;
    }
  };

  const containerBg = darkMode 
    ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900' 
    : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50';

  const headerTextColor = darkMode ? 'text-white' : 'text-gray-800';
  const subHeaderTextColor = darkMode ? 'text-gray-300' : 'text-gray-600';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${containerBg}`}>
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <Star className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <p className={`text-xl font-semibold ${headerTextColor}`}>Loading Leaderboard...</p>
          <p className={`${subHeaderTextColor}`}>Fetching the latest scores</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${containerBg}`}>
        <div className="text-center space-y-4 p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-red-600">Oops! Something went wrong</h2>
          <p className={`${subHeaderTextColor} max-w-md`}>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${containerBg}`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Trophy className={`w-12 h-12 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <h1 className={`text-5xl font-black tracking-tight ${headerTextColor}`}>
              Leaderboard
            </h1>
            <Trophy className={`w-12 h-12 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
          </div>
          <p className={`text-xl ${subHeaderTextColor} max-w-2xl mx-auto`}>
            Compete with the best players and climb to the top! 🚀
          </p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${darkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <Users className="w-4 h-4" />
            <span className="font-semibold">{leaderboard.length} Players</span>
          </div>
        </div>

        {/* Leaderboard Content */}
        {leaderboard.length === 0 ? (
          <div className="text-center py-20 space-y-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <Trophy className={`w-12 h-12 ${subHeaderTextColor}`} />
            </div>
            <div className="space-y-2">
              <h3 className={`text-2xl font-bold ${headerTextColor}`}>No Scores Yet</h3>
              <p className={`${subHeaderTextColor} max-w-md mx-auto`}>
                Be the first to make it to the leaderboard! Start playing now and set the record.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((user, index) => {
              const isTop3 = index < 3;
              
              return (
                <div
                  key={user._id || user.userId || index}
                  className={getRankStyle(index)}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'slideInUp 0.6s ease-out forwards'
                  }}
                >
                  <div className="flex items-center gap-6">
                    {/* Rank Number & Icon */}
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                        isTop3 
                          ? 'bg-white/20 text-white' 
                          : darkMode 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className={isTop3 ? 'text-white' : darkMode ? 'text-yellow-400' : 'text-yellow-600'}>
                        {getRankIcon(index)}
                      </div>
                    </div>

                    {/* Player Info */}
                    <div className="flex-1">
                      <h3 className={`text-xl font-bold truncate max-w-[200px] ${
                        isTop3 ? 'text-white' : headerTextColor
                      }`}>
                        {user.name || user.userId}
                      </h3>
                      {isTop3 && (
                        <p className="text-white/80 text-sm font-medium">
                          {index === 0 ? '👑 Champion' : index === 1 ? '🥈 Runner-up' : '🥉 Third Place'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className={`text-3xl font-black ${
                      isTop3 ? 'text-white' : darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {user.score.toLocaleString()}
                    </div>
                    <p className={`text-sm font-medium ${
                      isTop3 ? 'text-white/80' : subHeaderTextColor
                    }`}>
                      points
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 space-y-4">
          <p className={`${subHeaderTextColor} text-sm`}>
            Rankings update in real-time • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;