import { X, UserCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TeacherSelectionModal = ({ darkMode, onClose, onSelect, school }) => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch teachers when the modal is opened
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        console.log('Fetching teachers for school:', school._id);
        setLoading(true);
        setError('');
        const response = await axios.get(`http://localhost:5000/api/schools/${school._id}/teachers`);
        setTeachers(response.data.teachers);
      } catch (err) {
        console.error('Error fetching teachers:', err);
        setError('Failed to load teachers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (school) {
      fetchTeachers();
    }
  }, [school]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className={`w-full max-w-md p-6 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Select Teacher</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-400">Loading teachers...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : teachers.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {teachers.map((teacher) => (
              <button
                key={teacher.uid}
                onClick={() => onSelect(teacher.uid)}
                className={`w-full flex items-center p-4 rounded-lg ${
                  darkMode
                    ? 'hover:bg-gray-700 bg-gray-750'
                    : 'hover:bg-gray-100 bg-gray-50'
                } transition-colors`}
              >
                <div className={`p-3 rounded-full mr-4 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`}>
                  <UserCheck size={20} />
                </div>
                <div className="text-left">
                  <h3 className="font-medium">{teacher.name}</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{teacher.email}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400">No teachers found for this school.</p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-md mr-2 ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherSelectionModal;