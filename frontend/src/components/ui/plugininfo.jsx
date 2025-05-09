import { useState } from 'react';
import { Info, X } from 'lucide-react';
import React from 'react';
export default function InfoButton() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleInfoPanel = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Info Button */}
      <button
        onClick={toggleInfoPanel}
        className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300"
        aria-label="Show information"
      >
        <Info size={24} />
      </button>

      {/* Info Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-purple-950 rounded-lg shadow-xl border border-gray-200 p-5 animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">How to Use This Plugin</h3>
            <button 
              onClick={toggleInfoPanel}
              className="text-gray-50 hover:text-gray-700"
              aria-label="Close information panel"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-medium text-blue-100">Step 1: Install Chrome Extension</h4>
              <p className="text-sm text-cyan-300">Make sure you have our Chrome extension installed to enable YouTube transcript extraction.</p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-medium text-blue-100">Step 2: Copy YouTube URL</h4>
              <p className="text-sm text-cyan-300">Find the YouTube video you want to convert to ISL gestures and copy its URL.</p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-medium text-blue-100">Step 3: Paste URL in Plugin</h4>
              <p className="text-sm text-cyan-300">Paste the URL in the designated field on the plugin page.</p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-medium text-blue-100">Step 4: Extract Transcript</h4>
              <p className="text-sm text-cyan-300">Copy the transcript from the extension and paste it in the placeholder.</p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-medium text-blue-100">Step 5: View ISL Gestures</h4>
              <p className="text-sm text-cyan-300">Once processed, you'll see the ISL gestures displayed side by side with the original video.</p>
            </div>
            
            <div className="mt-4 text-xs text-gray-50">
              <p>Note: The extension works with any YouTube video that has captions/subtitles available. For best results, use videos with clear spoken content.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}