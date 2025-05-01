import { X, AlertTriangle } from 'lucide-react';

const SettingsPanel = ({ darkMode, toggleDarkMode, onClose, platform }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-md rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 mx-4`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">ISL Translator Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Dark Mode</span>
            <button 
              onClick={toggleDarkMode} 
              className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
            >
              {darkMode ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          
          <div className="pt-2 border-t border-gray-700">
            <h3 className="font-medium mb-2">Platform Settings</h3>
            <div className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p>Current platform: <span className="font-medium">{platform}</span></p>
              {platform === 'web' && (
                <p className="mt-2 text-sm text-yellow-400 flex items-center">
                  <AlertTriangle size={16} className="mr-1" />
                  Install our Chrome extension for better experience
                </p>
              )}
            </div>
          </div>
          
          <div className="pt-2 border-t border-gray-700">
            <h3 className="font-medium mb-2">Translation Settings</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Translation Quality</span>
                <select className={`px-2 py-1.5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <option>Low</option>
                  <option defaultValue>Medium</option>
                  <option>High</option>
                </select>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Auto-start on videos</span>
                <button className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  Enabled
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={onClose}
            className={`px-4 py-2 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;