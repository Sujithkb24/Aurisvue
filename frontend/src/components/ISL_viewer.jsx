import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ISLViewer = ({ speechInput, darkMode, shouldTranslate, onTranslationDone }) => {
  const [videoSequence, setVideoSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch video filenames from backend
  useEffect(() => {
    const fetchVideos = async () => {
      if (shouldTranslate && speechInput?.trim()) {
        try {
          const response = await axios.post('https://aurisvue-api.onrender.com/analyze', {
            transcript: speechInput,
          });
          console.log('API response:', response.data);

          const videos = response.data?.videos || [];
          if (videos.length > 0) {
            setVideoSequence(videos);
            setCurrentIndex(0);
          }

          if (onTranslationDone) onTranslationDone(); // Notify parent
        } catch (error) {
          console.error('Error fetching ISL videos:', error);
        }
      }
    };

    fetchVideos();
  }, [shouldTranslate, speechInput, onTranslationDone]);

  // Play each video in sequence
  const handleVideoEnd = () => {
    if (currentIndex < videoSequence.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (!videoSequence.length) return null;

  return (
    <div className="flex flex-col items-center justify-center">
      <video
        key={videoSequence[currentIndex]} // forces reloading on index change
        src={`/videos/${videoSequence[currentIndex]}`}
        onEnded={handleVideoEnd}
        autoPlay
        controls={false}
        className="w-64 h-auto rounded-xl shadow-md"
      />
      <p className="mt-2 text-sm">
        Showing gesture {currentIndex + 1} of {videoSequence.length}
      </p>
    </div>
  );
};

export default ISLViewer;
