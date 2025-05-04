export const ONE = (ref) => {
  let animations = []

  // Only index finger extended
  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandMiddle2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandMiddle3", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandRing1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI/2, "-"]);
  animations.push(["mixamorigRightHandThumb2", "rotation", "z", Math.PI/2, "-"]);

  // Pointing upward
  animations.push(["mixamorigRightHand", "rotation", "z", -Math.PI/2.3, "-"]);
  animations.push(["mixamorigRightHand", "rotation", "y", -Math.PI/5, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", Math.PI/2.65, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", Math.PI/30, "+"]);
  animations.push(["mixamorigRightArm", "rotation", "x", -Math.PI/4, "-"]);

  ref.animations.push(animations);

  // Reset animations
  animations = []
  
  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandMiddle2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandMiddle3", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHandThumb2", "rotation", "z", 0, "+"]);

  animations.push(["mixamorigRightHand", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHand", "rotation", "y", 0, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightArm", "rotation", "x", 0, "+"]);

  ref.animations.push(animations);

  if(ref.pending === false){
    ref.pending = true;
    ref.animate();
  }
};

export const TWO = (ref) => {
  let animations = []

  // Index and middle fingers extended
  animations.push(["mixamorigRightHandRing1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI/2, "-"]);
  animations.push(["mixamorigRightHandThumb2", "rotation", "z", Math.PI/2, "-"]);

  // Slightly spread index and middle fingers
  animations.push(["mixamorigRightHandIndex1", "rotation", "x", Math.PI/20, "+"]);
  animations.push(["mixamorigRightHandMiddle1", "rotation", "x", -Math.PI/20, "-"]);

  // Hand position
  animations.push(["mixamorigRightHand", "rotation", "z", -Math.PI/2.3, "-"]);
  animations.push(["mixamorigRightHand", "rotation", "y", -Math.PI/5, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", Math.PI/2.65, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", Math.PI/30, "+"]);
  animations.push(["mixamorigRightArm", "rotation", "x", -Math.PI/4, "-"]);

  ref.animations.push(animations);

  animations = []

  // Reset
  animations.push(["mixamorigRightHandRing1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHandThumb2", "rotation", "z", 0, "+"]);
  
  // Reset finger spread
  animations.push(["mixamorigRightHandIndex1", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightHandMiddle1", "rotation", "x", 0, "+"]);

  animations.push(["mixamorigRightHand", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHand", "rotation", "y", 0, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightArm", "rotation", "x", 0, "+"]);

  ref.animations.push(animations);

  if(ref.pending === false){
    ref.pending = true;
    ref.animate();
  }
};

export const THREE = (ref) => {
  let animations = []

  // Thumb, index and middle extended
  animations.push(["mixamorigRightHandRing1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", Math.PI/1.6, "+"]);
  
  // Thumb positioned outward
  animations.push(["mixamorigRightHandThumb1", "rotation", "z", -Math.PI/6, "-"]);
  animations.push(["mixamorigRightHandThumb1", "rotation", "y", Math.PI/6, "+"]);

  // Hand position
  animations.push(["mixamorigRightHand", "rotation", "z", -Math.PI/2.3, "-"]); 
  animations.push(["mixamorigRightHand", "rotation", "y", -Math.PI/5, "-"]); 
  animations.push(["mixamorigRightForeArm", "rotation", "z", Math.PI/2.65, "+"]); 
  animations.push(["mixamorigRightForeArm", "rotation", "x", Math.PI/30, "+"]); 
  animations.push(["mixamorigRightArm", "rotation", "x", -Math.PI/4, "-"]); 

  ref.animations.push(animations);

  animations = []

  // Reset
  animations.push(["mixamorigRightHandRing1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHandThumb1", "rotation", "y", 0, "-"]);

  animations.push(["mixamorigRightHand", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHand", "rotation", "y", 0, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightArm", "rotation", "x", 0, "+"]);

  ref.animations.push(animations);

  if(ref.pending === false){
    ref.pending = true;
    ref.animate();
  }
};

export const FOUR = (ref) => {
  let animations = []

  // All fingers extended except thumb
  animations.push(["mixamorigRightHandThumb1", "rotation", "z", Math.PI/2, "-"]);
  animations.push(["mixamorigRightHandThumb2", "rotation", "z", Math.PI/2, "-"]);
  
  // Hand position
  animations.push(["mixamorigRightHand", "rotation", "z", -Math.PI/2.3, "-"]);
  animations.push(["mixamorigRightHand", "rotation", "y", -Math.PI/5, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", Math.PI/2.65, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", Math.PI/30, "+"]);
  animations.push(["mixamorigRightArm", "rotation", "x", -Math.PI/4, "-"]);

  ref.animations.push(animations);

  animations = []

  // Reset
  animations.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHandThumb2", "rotation", "z", 0, "+"]);

  animations.push(["mixamorigRightHand", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHand", "rotation", "y", 0, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightArm", "rotation", "x", 0, "+"]);

  ref.animations.push(animations);

  if(ref.pending === false){
    ref.pending = true;
    ref.animate();
  }
};

export const FIVE = (ref) => {
  let animations = []

  // All fingers extended
  // Slightly spread fingers for clarity
  animations.push(["mixamorigRightHandIndex1", "rotation", "x", Math.PI/16, "+"]);
  animations.push(["mixamorigRightHandMiddle1", "rotation", "x", Math.PI/32, "+"]);
  animations.push(["mixamorigRightHandRing1", "rotation", "x", -Math.PI/32, "-"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "x", -Math.PI/16, "-"]);

  // Hand position
  animations.push(["mixamorigRightHand", "rotation", "z", -Math.PI/2.3, "-"]);
  animations.push(["mixamorigRightHand", "rotation", "y", -Math.PI/5, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", Math.PI/2.65, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", Math.PI/30, "+"]);
  animations.push(["mixamorigRightArm", "rotation", "x", -Math.PI/4, "-"]);

  ref.animations.push(animations);

  animations = []

  // Reset spread
  animations.push(["mixamorigRightHandIndex1", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightHandMiddle1", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightHandRing1", "rotation", "x", 0, "+"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "x", 0, "+"]);

  animations.push(["mixamorigRightHand", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHand", "rotation", "y", 0, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightArm", "rotation", "x", 0, "+"]);

  ref.animations.push(animations);

  if(ref.pending === false){
    ref.pending = true;
    ref.animate();
  }
};

export const SIX = (ref) => {
  let animations = []

  animations.push(["mixamorigRightHandIndex1", "rotation", "z", Math.PI/1.5, "+"]);
  animations.push(["mixamorigRightHandIndex2", "rotation", "z", Math.PI/1.5, "+"]);
  animations.push(["mixamorigRightHandIndex3", "rotation", "z", Math.PI/1.5, "+"]);

  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", Math.PI/1.5, "+"]);
  animations.push(["mixamorigRightHandMiddle2", "rotation", "z", Math.PI/1.5, "+"]);
  animations.push(["mixamorigRightHandMiddle3", "rotation", "z", Math.PI/1.5, "+"]);

  animations.push(["mixamorigRightHandRing1", "rotation", "z", Math.PI/1.5, "+"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", Math.PI/1.5, "+"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", Math.PI/1.5, "+"]);

  animations.push(["mixamorigRightHand", "rotation", "z", -Math.PI/2.5, "-"]);
  animations.push(["mixamorigRightHand", "rotation", "y", Math.PI/5, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", Math.PI/15, "+"]);
  animations.push(["mixamorigRightArm", "rotation", "x", -Math.PI/4, "-"]);

  ref.animations.push(animations);

  animations = []

  animations.push(["mixamorigRightHandIndex1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandIndex2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandIndex3", "rotation", "z", 0, "-"]);

  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandMiddle2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandMiddle3", "rotation", "z", 0, "-"]);

  animations.push(["mixamorigRightHandRing1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", 0, "-"]);

  animations.push(["mixamorigRightHand", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHand", "rotation", "y", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightArm", "rotation", "x", 0, "+"]);

  ref.animations.push(animations);

  if(ref.pending === false){
    ref.pending = true;
    ref.animate();
  }
};

export const SEVEN = (ref) => {
  let animations = []

  animations.push(["mixamorigRightHandThumb1", "rotation", "z", -Math.PI/1.5, "-"]);
  animations.push(["mixamorigRightHandThumb2", "rotation", "z", -Math.PI/1.5, "-"]);
  animations.push(["mixamorigRightHandThumb3", "rotation", "z", -Math.PI/1.5, "-"]);

  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandMiddle2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandMiddle3", "rotation", "z", Math.PI/1.6, "+"]);

  animations.push(["mixamorigRightHandRing1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", Math.PI/1.6, "+"]);

  animations.push(["mixamorigRightHandPinky1", "rotation", "z", Math.PI/1.8, "+"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", Math.PI/1.8, "+"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", Math.PI/1.8, "+"]);

  ref.animations.push(animations);

  animations = []

  animations.push(["mixamorigRightHandThumb1", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHandThumb2", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHandThumb3", "rotation", "z", 0, "+"]);

  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandMiddle2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandMiddle3", "rotation", "z", 0, "-"]);

  animations.push(["mixamorigRightHandRing1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", 0, "-"]);

  animations.push(["mixamorigRightHandPinky1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", 0, "-"]);

  ref.animations.push(animations);

  if(ref.pending === false){
    ref.pending = true;
    ref.animate();
  }
};

export const EIGHT = (ref) => {
  let animations = []

  animations.push(["mixamorigRightHandIndex1", "rotation", "z", Math.PI/1.4, "+"]);
  animations.push(["mixamorigRightHandIndex2", "rotation", "z", Math.PI/1.4, "+"]);
  animations.push(["mixamorigRightHandIndex3", "rotation", "z", Math.PI/1.4, "+"]);

  ref.animations.push(animations);

  animations = []

  animations.push(["mixamorigRightHandIndex1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandIndex2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandIndex3", "rotation", "z", 0, "-"]);

  ref.animations.push(animations);

  if(ref.pending === false){
    ref.pending = true;
    ref.animate();
  }
};

export const NINE = (ref) => {
  let animations = []

  animations.push(["mixamorigRightHandRing1", "rotation", "z", -Math.PI/1.6, "-"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", -Math.PI/1.6, "-"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", -Math.PI/1.6, "-"]);

  ref.animations.push(animations);

  animations = []

  animations.push(["mixamorigRightHandRing1", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", 0, "+"]);

  ref.animations.push(animations);

  if(ref.pending === false){
    ref.pending = true;
    ref.animate();
  }
};


export const TEN = (ref) => {
  let animations = []

  animations.push(["mixamorigRightHandThumb1", "rotation", "x", -Math.PI/2.5, "-"]);
  animations.push(["mixamorigRightHandThumb2", "rotation", "x", -Math.PI/2.5, "-"]);
  animations.push(["mixamorigRightHandThumb3", "rotation", "x", -Math.PI/2.5, "-"]);

  ref.animations.push(animations);

  animations = []

  animations.push(["mixamorigRightHandThumb1", "rotation", "x", 0, "+"]);
  animations.push(["mixamorigRightHandThumb2", "rotation", "x", 0, "+"]);
  animations.push(["mixamorigRightHandThumb3", "rotation", "x", 0, "+"]);

  ref.animations.push(animations);

  if(ref.pending === false){
    ref.pending = true;
    ref.animate();
  }
};
