import { X, UserCheck } from 'lucide-react';
import React from 'react';

const TeacherSelectionModal = ({ darkMode, onClose, onSelect }) => {
  // Sample predefined teachers list
  const teachers = [
    { id: 1, name: 'Dr. Priya Sharma', subject: 'Science' },
    { id: 2, name: 'Prof. Amit Kumar', subject: 'Mathematics' },
    { id: 3, name: 'Mrs. Deepa Gupta', subject: 'English Literature' },
    { id: 4, name: 'Mr. Raj Verma', subject: 'History' },
    { id: 5, name: 'Dr. Anil Patel', subject: 'Computer Science' },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className={`w-full max-w-md p-6 rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Select Teacher</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {teachers.map(teacher => (
            <button
              key={teacher.id}
              onClick={() => onSelect(teacher.id)}
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
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{teacher.subject}</p>
              </div>
            </button>
          ))}
        </div>
        
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