import React, { useEffect, useState,useRef } from 'react';
import axios from 'axios';

const ISLViewer = ({ speechInput, darkMode, shouldTranslate, onTranslationDone }) => {
  const [gifSequence, setGifSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch GIFs when shouldTranslate becomes true
  useEffect(() => {
    const fetchGIFsFromTranscript = async () => {
      if (shouldTranslate && speechInput && speechInput.trim() !== '') {
        try {
          const response = await axios.post('https://aurisvue-api.onrender.com/analyze', {
            transcript: speechInput,
          });
          console.log(response.data);
          const gifs = response.data?.videos || [];
          if (gifs.length > 0) {
            setGifSequence(gifs);
            setCurrentIndex(0);
          }

          if (onTranslationDone) onTranslationDone(); // reset the trigger in parent
        } catch (error) {
          console.error('Error fetching ISL GIFs:', error);
        }
      }
    };

    fetchGIFsFromTranscript();
  }, [shouldTranslate, speechInput, onTranslationDone]);

  // Play GIFs one by one
  useEffect(() => {
    if (gifSequence.length > 0 && currentIndex < gifSequence.length) {
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, gifSequence]);

  if (!gifSequence.length) return null;

  return (
    <div className="flex flex-col items-center justify-center">
      <img
        src={`/${gifSequence[currentIndex]}`}
        alt={`Gesture ${currentIndex}`}
        className="w-64 h-auto rounded-xl shadow-md"
      />
      <p className="mt-2 text-sm">
        Showing gesture {currentIndex + 1} of {gifSequence.length}
      </p>
    </div>
  );
};

export default ISLViewer;



// const ISLViewer = ({ speechInput, darkMode, shouldTranslate, onTranslationDone }) => {
//   const [videoSequence, setVideoSequence] = useState([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const videoRef = useRef(null);

//   // Dummy video data
//   const dummyVideos = [
//     '13 thirteen.mp4',
//     '16 sixteen.mp4',
//     '17 seventeen.mp4',
//     '18 eighteen.mp4'
//   ];

//   useEffect(() => {
//     if (shouldTranslate) {
//       setVideoSequence(dummyVideos);
//       setCurrentIndex(0);
//       if (onTranslationDone) onTranslationDone();
//     }
//   }, [shouldTranslate, onTranslationDone]);

//   const handleVideoEnd = () => {
//     if (currentIndex < videoSequence.length - 1) {
//       setCurrentIndex((prev) => prev + 1);
//     }
//   };

//   if (!videoSequence.length) return null;

//   const currentVideo = encodeURIComponent(videoSequence[currentIndex]);
//   const videoSrc = `/videos/${currentVideo}`;

//   return (
//     <div className="flex flex-col items-center justify-center h-screen">
//       <div className="relative w-full h-full flex items-center justify-center bg-gray-800 p-4">
//         <video
//           key={currentVideo} // force reload when index changes
//           ref={videoRef}
//           src={videoSrc}
//           autoPlay
//           muted
//           playsInline
//           onEnded={handleVideoEnd}
//           className="max-w-full max-h-full object-contain rounded-xl shadow-md"
//         />
//       </div>
//       <p className="mt-2 text-sm text-white">
//         Showing gesture {currentIndex + 1} of {videoSequence.length}
//       </p>
//     </div>
//   );
// };

// export default ISLViewer;


