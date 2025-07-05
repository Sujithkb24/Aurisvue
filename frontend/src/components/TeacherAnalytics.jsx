import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const TeacherAnalyticsDashboard = ({ darkMode: externalDarkMode }) => {
    const [analytics, setAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [localDarkMode, setLocalDarkMode] = useState(() => {
      // Initialize from localStorage or system preference
      const savedMode = localStorage.getItem('darkMode');
      if (savedMode !== null) {
        return savedMode === 'true';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    
    // Use external darkMode prop if provided, otherwise use local state
    const darkMode = externalDarkMode !== undefined ? externalDarkMode : localDarkMode;
    
    const { getToken } = useAuth();
    const navigate = useNavigate();
    
    // Helper function to format dates consistently
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    // Helper function for short date format (for charts)
    const formatShortDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    };
    
    // Apply dark mode to document when changed (only if we're managing dark mode locally)
    useEffect(() => {
      if (externalDarkMode === undefined) {
        if (darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', darkMode);
      }
    }, [darkMode, externalDarkMode]);

    const toggleDarkMode = () => {
      if (externalDarkMode === undefined) {
        setLocalDarkMode(prev => !prev);
      }
      // If external dark mode is provided, don't toggle locally
    };
    
    useEffect(() => {
      fetchTeacherAnalytics();
    }, []);
    
    const fetchTeacherAnalytics = async () => {
      try {
        setIsLoading(true);
        const token = await getToken();
        const response = await fetch('http://localhost:5000/api/analytics/teacher', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        } else {
          setError('Failed to fetch analytics');
        }
      } catch (err) {
        setError('Error connecting to server');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Theme colors based on dark mode - improved for better visibility
    const theme = {
      bg: darkMode ? 'bg-gray-900' : 'bg-gray-100',
      cardBg: darkMode ? 'bg-gray-800' : 'bg-white',
      text: darkMode ? 'text-white' : 'text-gray-900', // Changed to white for better visibility
      textMuted: darkMode ? 'text-gray-300' : 'text-gray-500', // Lightened in dark mode
      border: darkMode ? 'border-gray-700' : 'border-gray-200',
      chartColors: {
        stroke: darkMode ? '#6ee7b7' : '#3b82f6',
        fill: darkMode ? '#065f46' : '#dbeafe',
        grid: darkMode ? '#4b5563' : '#e5e7eb', // Lightened grid lines in dark mode
        bar1: darkMode ? '#5eead4' : '#8884d8',
        bar2: darkMode ? '#6ee7b7' : '#82ca9d',
        errorBar: darkMode ? '#f87171' : '#ef4444',
        pie: darkMode ? ['#34d399', '#f87171'] : ['#4ade80', '#f87171'],
        axis: darkMode ? '#ffffff' : '#000000' // White axis in dark mode
      }
    };

    // Custom label renderer for pie chart
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      // Only show label if percentage is significant enough
      if (percent > 0.05) { // 5% threshold
        return (
          <text 
            x={x} 
            y={y} 
            fill={darkMode ? '#ffffff' : '#000000'} 
            textAnchor={x > cx ? 'start' : 'end'} 
            dominantBaseline="central"
            fontSize="12"
            fontWeight="500"
          >
            {`${(percent * 100).toFixed(0)}%`}
          </text>
        );
      }
      return null;
    };
      
    if (isLoading) return (
      <div className={`flex items-center justify-center min-h-screen ${theme.bg} ${theme.text}`}>
        <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
      </div>
    );

    if (error) return (
      <div className={`p-6 ${theme.bg} ${theme.text} min-h-screen`}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <div className={`${theme.cardBg} rounded-lg shadow p-6 ${theme.text}`}>
            <p className="text-red-500">{error}</p>
            <button 
              onClick={fetchTeacherAnalytics} 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );

    if (!analytics) return (
      <div className={`p-6 ${theme.bg} ${theme.text} min-h-screen`}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Analytics Dashboard</h2>
          <div className={`${theme.cardBg} rounded-lg shadow p-6 ${theme.text}`}>
            <p>No analytics data available</p>
          </div>
        </div>
      </div>
    );
    
    const { overallAnalytics, sessionAnalytics, problematicWords, improvementOverTime, studentFeedbackMetrics } = analytics;
    
    // Prepare data for student understanding pie chart
    const understandingData = [
      { name: 'Understood', value: studentFeedbackMetrics.understoodPercentage },
      { name: 'Not Understood', value: 100 - studentFeedbackMetrics.understoodPercentage }
    ];
    
    return (
      <div className={`p-6 min-h-screen ${theme.bg}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header with dark mode toggle (only show if we're managing dark mode locally) */}
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${theme.text}`}>Teaching Analytics</h2>
            {externalDarkMode === undefined && (
              <button 
                onClick={toggleDarkMode} 
                className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            )}
          </div>
          
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`${theme.cardBg} rounded-lg shadow p-4 border ${theme.border}`}>
              <h3 className={`text-xl font-medium mb-2 ${theme.text}`}>Overall Success Rate</h3>
              <p className={`text-3xl font-bold ${theme.text}`}>{overallAnalytics.overall_success_rate.toFixed(1)}%</p>
              <p className={`text-sm ${theme.textMuted}`}>
                {overallAnalytics.successful_conversions} successful out of {overallAnalytics.total_conversions} conversions
              </p>
            </div>
            
            <div className={`${theme.cardBg} rounded-lg shadow p-4 border ${theme.border}`}>
              <h3 className={`text-xl font-medium mb-2 ${theme.text}`}>Avg. Conversion Time</h3>
              <p className={`text-3xl font-bold ${theme.text}`}>{(overallAnalytics.avg_conversion_time || 0).toFixed(1)}ms</p>
              <p className={`text-sm ${theme.textMuted}`}>Average ML processing time</p>
            </div>
            
            <div className={`${theme.cardBg} rounded-lg shadow p-4 border ${theme.border}`}>
              <h3 className={`text-xl font-medium mb-2 ${theme.text}`}>Sessions</h3>
              <p className={`text-3xl font-bold ${theme.text}`}>{sessionAnalytics.length}</p>
              <p className={`text-sm ${theme.textMuted}`}>Total teaching sessions</p>
            </div>
          </div>
          
          {/* Student Feedback Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className={`${theme.cardBg} rounded-lg shadow p-4 border ${theme.border}`}>
              <h3 className={`text-xl font-medium mb-2 ${theme.text}`}>Student Understanding</h3>
              {studentFeedbackMetrics.totalFeedback > 0 ? (
                <div className="h-64 flex items-center">
                  <div className="w-1/2">
                    <p className={`text-3xl font-bold ${theme.text}`}>{studentFeedbackMetrics.understoodPercentage.toFixed(1)}%</p>
                    <p className={`text-sm ${theme.textMuted}`}>
                      Based on {studentFeedbackMetrics.totalFeedback} student feedback responses
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                        <span className={`text-sm ${theme.textMuted}`}>Understood: {studentFeedbackMetrics.understoodPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                        <span className={`text-sm ${theme.textMuted}`}>Not Understood: {(100 - studentFeedbackMetrics.understoodPercentage).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={understandingData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {understandingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={theme.chartColors.pie[index % theme.chartColors.pie.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => `${value.toFixed(1)}%`} 
                          contentStyle={{ 
                            backgroundColor: theme.cardBg, 
                            borderColor: theme.border, 
                            color: theme.text 
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className={theme.textMuted}>No student feedback data available yet</p>
              )}
            </div>
            
            <div className={`${theme.cardBg} rounded-lg shadow p-4 border ${theme.border}`}>
              <h3 className={`text-xl font-medium mb-2 ${theme.text}`}>Student Understanding Over Time</h3>
              {studentFeedbackMetrics.feedbackOverTime && studentFeedbackMetrics.feedbackOverTime.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={studentFeedbackMetrics.feedbackOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.chartColors.grid} />
                      <XAxis 
                        dataKey="week" 
                        tickFormatter={formatShortDate}
                        stroke={theme.chartColors.axis}
                      />
                      <YAxis domain={[0, 100]} stroke={theme.chartColors.axis} />
                      <Tooltip 
                        formatter={(value) => [`${value.toFixed(1)}%`, 'Understanding Rate']}
                        labelFormatter={formatDate}
                        contentStyle={{ 
                          backgroundColor: theme.cardBg, 
                          borderColor: theme.border, 
                          color: theme.text 
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="understanding_rate" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        dot={{ r: 4 }}
                        name="Understanding Rate"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className={theme.textMuted}>Not enough data to display student understanding</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Success Rate Over Time Chart */}
          <div className={`${theme.cardBg} rounded-lg shadow p-4 mb-6 border ${theme.border}`}>
            <h3 className={`text-xl font-medium mb-4 ${theme.text}`}>Success Rate Over Time</h3>
            
            <div className="h-64">
              {improvementOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={improvementOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.chartColors.grid} />
                    <XAxis 
                      dataKey="week" 
                      tickFormatter={formatShortDate}
                      stroke={theme.chartColors.axis}
                    />
                    <YAxis domain={[0, 100]} stroke={theme.chartColors.axis} />
                    <Tooltip 
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Success Rate']}
                      labelFormatter={formatDate}
                      contentStyle={{ 
                        backgroundColor: theme.cardBg, 
                        borderColor: theme.border, 
                        color: theme.text 
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="success_rate" 
                      stroke={theme.chartColors.stroke} 
                      strokeWidth={2} 
                      dot={{ r: 4 }}
                      name="Success Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className={theme.textMuted}>Not enough data to display improvement over time</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Problematic Words */}
          <div className={`${theme.cardBg} rounded-lg shadow p-4 mb-6 border ${theme.border}`}>
            <h3 className={`text-xl font-medium mb-4 ${theme.text}`}>Top Problematic Words</h3>
            
            {problematicWords.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={problematicWords.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.chartColors.grid} />
                    <XAxis dataKey="word_or_phrase" stroke={theme.chartColors.axis} />
                    <YAxis stroke={theme.chartColors.axis} />
                    <Tooltip contentStyle={{ 
                      backgroundColor: theme.cardBg, 
                      borderColor: theme.border, 
                      color: theme.text 
                    }} />
                    <Bar dataKey="frequency" fill={theme.chartColors.errorBar} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={theme.textMuted}>No problematic words identified yet</p>
            )}
          </div>
          
          {/* Feedback Count By Session */}
          <div className={`${theme.cardBg} rounded-lg shadow p-4 mb-6 border ${theme.border}`}>
            <h3 className={`text-xl font-medium mb-4 ${theme.text}`}>Feedback by Session</h3>
            {/* Only show sessions with feedback_count > 0 */}
            {sessionAnalytics.filter(s => s.feedback_count > 0).length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={sessionAnalytics.filter(s => s.feedback_count > 0).slice(0, 10)} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.chartColors.grid} />
                    <XAxis 
                      dataKey="session_title" 
                      angle={-45} 
                      textAnchor="end"
                      height={60}
                      stroke={theme.chartColors.axis}
                    />
                    <YAxis stroke={theme.chartColors.axis} />
                    <Tooltip contentStyle={{ 
                      backgroundColor: theme.cardBg, 
                      borderColor: theme.border, 
                      color: theme.text 
                    }} />
                    <Legend 
                      wrapperStyle={{ color: theme.text }}
                    />
                    {/* <Bar 
                      dataKey="feedback_count" 
                      name="Feedback Count" 
                      fill={theme.chartColors.bar1} 
                    />
                    <Bar 
                      dataKey="understood_percentage" 
                      name="Understanding %" 
                      fill={theme.chartColors.bar2} 
                    /> */}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={theme.textMuted}>No session data available</p>
            )}
          </div>
          
          {/* Recent Sessions Table */}
          <div className={`${theme.cardBg} rounded-lg shadow p-4 border ${theme.border}`}>
            <h3 className={`text-xl font-medium mb-4 ${theme.text}`}>Recent Sessions</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={theme.border}>
                  <tr>
                    <th className={`px-4 py-2 text-left border-b ${theme.border} ${theme.text}`}>Session</th>
                    <th className={`px-4 py-2 text-left border-b ${theme.border} ${theme.text}`}>Date</th>
                    <th className={`px-4 py-2 text-left border-b ${theme.border} ${theme.text}`}>Success Rate</th>
                    <th className={`px-4 py-2 text-left border-b ${theme.border} ${theme.text}`}>Conversions</th>
                    <th className={`px-4 py-2 text-left border-b ${theme.border} ${theme.text}`}>Words</th>
                    <th className={`px-4 py-2 text-left border-b ${theme.border} ${theme.text}`}>Feedback</th>
                    <th className={`px-4 py-2 text-left border-b ${theme.border} ${theme.text}`}>Understanding</th>
                    <th className={`px-4 py-2 text-left border-b ${theme.border} ${theme.text}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sessionAnalytics.map((session) => (
                    <tr key={session.id} className={`hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                      <td className={`px-4 py-2 border-b ${theme.border} ${theme.text}`}>{session.session_title}</td>
                      <td className={`px-4 py-2 border-b ${theme.border} ${theme.text}`}>
                        {formatDate(session.session_date)}
                      </td>
                      <td className={`px-4 py-2 border-b ${theme.border} ${theme.text}`}>
                        {(session.successful_conversions / session.total_conversions * 100).toFixed(1)}%
                      </td>
                      <td className={`px-4 py-2 border-b ${theme.border} ${theme.text}`}>
                        {session.successful_conversions} / {session.total_conversions}
                      </td>
                      <td className={`px-4 py-2 border-b ${theme.border} ${theme.text}`}>{session.total_words}</td>
                      <td className={`px-4 py-2 border-b ${theme.border} ${theme.text}`}>{session.feedback_count}</td>
                      <td className={`px-4 py-2 border-b ${theme.border} ${theme.text}`}>
                        {session.understood_percentage.toFixed(1)}%
                      </td>
                      <td className={`px-4 py-2 border-b ${theme.border} ${theme.text}`}>
                        <div className="flex space-x-2">
                          <button 
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                            onClick={() => navigate(`/sessions/${session.id}`)}
                          >
                            View Details
                          </button>
                          <button 
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                            onClick={() => navigate(`/sessions/${session.id}/playback`)}
                          >
                            Playback
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default TeacherAnalyticsDashboard;