import cv from 'opencv.js';

export const matchFace = async (newDescriptor, storedDescriptors) => {
  // Convert descriptors to OpenCV Mat objects
  const newMat = cv.matFromArray(newDescriptor.length, 1, cv.CV_32F, newDescriptor);
  
  let bestMatch = null;
  let bestDistance = Infinity;
  
  storedDescriptors.forEach(({ userId, descriptor }) => {
    const storedMat = cv.matFromArray(descriptor.length, 1, cv.CV_32F, descriptor);
    
    // Compute Euclidean distance between descriptors
    const distance = cv.norm(newMat, storedMat, cv.NORM_L2);
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = userId;
    }
    storedMat.delete(); // Free memory
  });
  
  newMat.delete(); // Free memory
  
  // Define a reasonable threshold (adjust based on testing)
  return bestDistance < 0.6 ? bestMatch : null;
};