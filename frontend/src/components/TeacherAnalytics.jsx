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

const TeacherAnalyticsDashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { getToken } = useAuth();
    const navigate = useNavigate();
    
    useEffect(() => {
      fetchTeacherAnalytics();
    }, []);
    
    const fetchTeacherAnalytics = async () => {
      try {
        setIsLoading(true);
        const token = await getToken();
        const response = await fetch('/http://localhost:5000/api/analytics/teacher', {
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
    
    if (isLoading) return <div>Loading analytics...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!analytics) return <div>No analytics data available</div>;
    
    const { overallAnalytics, sessionAnalytics, problematicWords, improvementOverTime, studentFeedbackMetrics } = analytics;
    
    // Colors for pie chart
    const COLORS = ['#4ade80', '#f87171'];
    
    // Prepare data for student understanding pie chart
    const understandingData = [
      { name: 'Understood', value: studentFeedbackMetrics.understoodPercentage },
      { name: 'Not Understood', value: 100 - studentFeedbackMetrics.understoodPercentage }
    ];
    
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Teaching Analytics</h2>
        
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xl font-medium mb-2">Overall Success Rate</h3>
            <p className="text-3xl font-bold">{overallAnalytics.overall_success_rate.toFixed(1)}%</p>
            <p className="text-sm text-gray-500">
              {overallAnalytics.successful_conversions} successful out of {overallAnalytics.total_conversions} conversions
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xl font-medium mb-2">Total Words</h3>
            <p className="text-3xl font-bold">{overallAnalytics.total_words.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Words processed by the ML model</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xl font-medium mb-2">Avg. Conversion Time</h3>
            <p className="text-3xl font-bold">{(overallAnalytics.avg_conversion_time || 0).toFixed(1)}ms</p>
            <p className="text-sm text-gray-500">Average ML processing time</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xl font-medium mb-2">Sessions</h3>
            <p className="text-3xl font-bold">{sessionAnalytics.length}</p>
            <p className="text-sm text-gray-500">Total teaching sessions</p>
          </div>
        </div>
        
        {/* Student Feedback Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xl font-medium mb-2">Student Understanding</h3>
            {studentFeedbackMetrics.totalFeedback > 0 ? (
              <div className="h-64 flex items-center">
                <div className="w-1/2">
                  <p className="text-3xl font-bold">{studentFeedbackMetrics.understoodPercentage.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500">
                    Based on {studentFeedbackMetrics.totalFeedback} student feedback responses
                  </p>
                </div>
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={understandingData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {understandingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No student feedback data available yet</p>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-xl font-medium mb-2">Student Understanding Over Time</h3>
            {studentFeedbackMetrics.feedbackOverTime && studentFeedbackMetrics.feedbackOverTime.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={studentFeedbackMetrics.feedbackOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="week" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Understanding Rate']}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
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
                <p className="text-gray-500">Not enough data to display student understanding</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Success Rate Over Time Chart */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-xl font-medium mb-4">Success Rate Over Time</h3>
          
          <div className="h-64">
            {improvementOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={improvementOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="week" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Success Rate']}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="success_rate" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    dot={{ r: 4 }}
                    name="Success Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">Not enough data to display improvement over time</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Problematic Words */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-xl font-medium mb-4">Top Problematic Words</h3>
          
          {problematicWords.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={problematicWords.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="word_or_phrase" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="frequency" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">No problematic words identified yet</p>
          )}
        </div>
        
        {/* Feedback Count By Session */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-xl font-medium mb-4">Feedback by Session</h3>
          
          {sessionAnalytics.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={sessionAnalytics.slice(0, 10)} 
                  margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="session_title" 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="feedback_count" 
                    name="Feedback Count" 
                    fill="#8884d8" 
                  />
                  <Bar 
                    dataKey="understood_percentage" 
                    name="Understanding %" 
                    fill="#82ca9d" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">No session data available</p>
          )}
        </div>
        
        {/* Recent Sessions Table */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-xl font-medium mb-4">Recent Sessions</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left border-b">Session</th>
                  <th className="px-4 py-2 text-left border-b">Date</th>
                  <th className="px-4 py-2 text-left border-b">Success Rate</th>
                  <th className="px-4 py-2 text-left border-b">Conversions</th>
                  <th className="px-4 py-2 text-left border-b">Words</th>
                  <th className="px-4 py-2 text-left border-b">Feedback</th>
                  <th className="px-4 py-2 text-left border-b">Understanding</th>
                  <th className="px-4 py-2 text-left border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessionAnalytics.map((session) => (
                  <tr key={session.id}>
                    <td className="px-4 py-2 border-b">{session.session_title}</td>
                    <td className="px-4 py-2 border-b">
                      {new Date(session.session_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {(session.successful_conversions / session.total_conversions * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 border-b">
                      {session.successful_conversions} / {session.total_conversions}
                    </td>
                    <td className="px-4 py-2 border-b">{session.total_words}</td>
                    <td className="px-4 py-2 border-b">{session.feedback_count}</td>
                    <td className="px-4 py-2 border-b">
                      {session.understood_percentage.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 border-b">
                      <div className="flex space-x-2">
                        <button 
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                          onClick={() => navigate(`/sessions/${session.id}`)}
                        >
                          View Details
                        </button>
                        <button 
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs"
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
    );
  };
  
  export default TeacherAnalyticsDashboard;