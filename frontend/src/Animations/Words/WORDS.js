export const THANK = (ref) => {
  let animations = []
  
  // First position - palm facing forward, fingers extended
  animations.push(["mixamorigRightHandIndex1", "rotation", "z", Math.PI/6, "+"]);
  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", Math.PI/6, "+"]);
  animations.push(["mixamorigRightHandRing1", "rotation", "z", Math.PI/6, "+"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", Math.PI/6, "+"]);
  
  // Position hand in front of chest
  animations.push(["mixamorigRightHand", "rotation", "y", Math.PI/4, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", Math.PI/6, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", Math.PI/12, "+"]);
  
  // Raise hand position
  animations.push(["mixamorigRightArm", "rotation", "x", -Math.PI/6, "-"]);
  
  ref.animations.push(animations);
  
  // Moving hand forward
  animations = []
  animations.push(["mixamorigRightForeArm", "rotation", "x", Math.PI/6, "+"]);
  ref.animations.push(animations);
  
  // Reset hand position
  animations = []
  animations.push(["mixamorigRightHandIndex1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", 0, "-"]);
  
  animations.push(["mixamorigRightHand", "rotation", "y", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightArm", "rotation", "x", 0, "+"]);
  
  ref.animations.push(animations);
  
  if(ref.pending === false){
      ref.pending = true;
      ref.animate();
  }
}

export const PLEASE = (ref) => {
  let animations = []
  
  // Flat palm on chest
  animations.push(["mixamorigRightHandIndex1", "rotation", "z", Math.PI/12, "+"]);
  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", Math.PI/12, "+"]);
  animations.push(["mixamorigRightHandRing1", "rotation", "z", Math.PI/12, "+"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", Math.PI/12, "+"]);
  
  // Position hand on chest
  animations.push(["mixamorigRightHand", "rotation", "x", Math.PI/2.5, "+"]);
  animations.push(["mixamorigRightHand", "rotation", "y", -Math.PI/6, "-"]);
  
  animations.push(["mixamorigRightForeArm", "rotation", "z", -Math.PI/12, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", -Math.PI/6, "-"]);
  
  // Circular motion part 1
  ref.animations.push(animations);
  
  // Circular motion part 2
  animations = []
  animations.push(["mixamorigRightForeArm", "rotation", "z", -Math.PI/6, "-"]);
  ref.animations.push(animations);
  
  // Reset
  animations = []
  animations.push(["mixamorigRightHandIndex1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandRing1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", 0, "-"]);
  
  animations.push(["mixamorigRightHand", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightHand", "rotation", "y", 0, "+"]);
  
  animations.push(["mixamorigRightForeArm", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "+"]);
  
  ref.animations.push(animations);
  
  if(ref.pending === false){
      ref.pending = true;
      ref.animate();
  }
}

export const SORRY = (ref) => {
  let animations = []
  
  // Fist with thumb up
  animations.push(["mixamorigRightHandIndex1", "rotation", "z", Math.PI/2, "+"]);
  animations.push(["mixamorigRightHandIndex2", "rotation", "z", Math.PI/2, "+"]);
  animations.push(["mixamorigRightHandIndex3", "rotation", "z", Math.PI/2, "+"]);
  
  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", Math.PI/2, "+"]);
  animations.push(["mixamorigRightHandMiddle2", "rotation", "z", Math.PI/2, "+"]);
  animations.push(["mixamorigRightHandMiddle3", "rotation", "z", Math.PI/2, "+"]);
  
  animations.push(["mixamorigRightHandRing1", "rotation", "z", Math.PI/2, "+"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", Math.PI/2, "+"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", Math.PI/2, "+"]);
  
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", Math.PI/2, "+"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", Math.PI/2, "+"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", Math.PI/2, "+"]);
  
  // Position over chest
  animations.push(["mixamorigRightHand", "rotation", "x", Math.PI/3, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", Math.PI/4, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", -Math.PI/6, "-"]);
  
  // Circular motion over chest
  ref.animations.push(animations);
  
  animations = []
  animations.push(["mixamorigRightHand", "rotation", "z", Math.PI/6, "+"]);
  ref.animations.push(animations);
  
  animations = []
  animations.push(["mixamorigRightHand", "rotation", "z", 0, "-"]);
  ref.animations.push(animations);
  
  // Reset position
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
  
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", 0, "-"]);
  
  animations.push(["mixamorigRightHand", "rotation", "x", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "+"]);
  
  ref.animations.push(animations);
  
  if(ref.pending === false){
      ref.pending = true;
      ref.animate();
  }
}

export const LEARN = (ref) => {
  let animations = []
  
  // Touching temple with index
  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", Math.PI/1.8, "+"]);
  animations.push(["mixamorigRightHandMiddle2", "rotation", "z", Math.PI/1.8, "+"]);
  animations.push(["mixamorigRightHandMiddle3", "rotation", "z", Math.PI/1.8, "+"]);
  
  animations.push(["mixamorigRightHandRing1", "rotation", "z", Math.PI/1.8, "+"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", Math.PI/1.8, "+"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", Math.PI/1.8, "+"]);
  
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", Math.PI/1.8, "+"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", Math.PI/1.8, "+"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", Math.PI/1.8, "+"]);
  
  // Position hand near temple
  animations.push(["mixamorigRightHand", "rotation", "y", -Math.PI/4, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", Math.PI/2.5, "+"]);
  animations.push(["mixamorigRightArm", "rotation", "x", -Math.PI/4, "-"]);
  animations.push(["mixamorigRightArm", "rotation", "y", Math.PI/12, "+"]);
  
  ref.animations.push(animations);
  
  // Pull hand out
  animations = []
  animations.push(["mixamorigRightForeArm", "rotation", "z", Math.PI/4, "+"]);
  ref.animations.push(animations);
  
  // Reset position
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
  
  animations.push(["mixamorigRightHand", "rotation", "y", 0, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightArm", "rotation", "x", 0, "+"]);
  animations.push(["mixamorigRightArm", "rotation", "y", 0, "-"]);
  
  ref.animations.push(animations);
  
  if(ref.pending === false){
      ref.pending = true;
      ref.animate();
  }
}

export const FRIEND = (ref) => {
  let animations = []
  
  // Hook index fingers together
  // First set right hand position
  animations.push(["mixamorigRightHandMiddle1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandMiddle2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandMiddle3", "rotation", "z", Math.PI/1.6, "+"]);
  
  animations.push(["mixamorigRightHandRing1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandRing2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandRing3", "rotation", "z", Math.PI/1.6, "+"]);
  
  animations.push(["mixamorigRightHandPinky1", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandPinky2", "rotation", "z", Math.PI/1.6, "+"]);
  animations.push(["mixamorigRightHandPinky3", "rotation", "z", Math.PI/1.6, "+"]);
  
  animations.push(["mixamorigRightHand", "rotation", "z", Math.PI/6, "+"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", Math.PI/4, "+"]);
  
  // Then set left hand position
  animations.push(["mixamorigLeftHandMiddle1", "rotation", "z", -Math.PI/1.6, "-"]);
  animations.push(["mixamorigLeftHandMiddle2", "rotation", "z", -Math.PI/1.6, "-"]);
  animations.push(["mixamorigLeftHandMiddle3", "rotation", "z", -Math.PI/1.6, "-"]);
  
  animations.push(["mixamorigLeftHandRing1", "rotation", "z", -Math.PI/1.6, "-"]);
  animations.push(["mixamorigLeftHandRing2", "rotation", "z", -Math.PI/1.6, "-"]);
  animations.push(["mixamorigLeftHandRing3", "rotation", "z", -Math.PI/1.6, "-"]);
  
  animations.push(["mixamorigLeftHandPinky1", "rotation", "z", -Math.PI/1.6, "-"]);
  animations.push(["mixamorigLeftHandPinky2", "rotation", "z", -Math.PI/1.6, "-"]);
  animations.push(["mixamorigLeftHandPinky3", "rotation", "z", -Math.PI/1.6, "-"]);
  
  animations.push(["mixamorigLeftHand", "rotation", "z", -Math.PI/6, "-"]);
  animations.push(["mixamorigLeftForeArm", "rotation", "z", -Math.PI/4, "-"]);
  
  ref.animations.push(animations);
  
  // Hook motion
  animations = []
  animations.push(["mixamorigRightForeArm", "rotation", "x", Math.PI/12, "+"]);
  animations.push(["mixamorigLeftForeArm", "rotation", "x", Math.PI/12, "+"]);
  ref.animations.push(animations);
  
  // Reset all positions
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
  
  animations.push(["mixamorigRightHand", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "z", 0, "-"]);
  animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "-"]);
  
  animations.push(["mixamorigLeftHandMiddle1", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigLeftHandMiddle2", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigLeftHandMiddle3", "rotation", "z", 0, "+"]);
  
  animations.push(["mixamorigLeftHandRing1", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigLeftHandRing2", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigLeftHandRing3", "rotation", "z", 0, "+"]);
  
  animations.push(["mixamorigLeftHandPinky1", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigLeftHandPinky2", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigLeftHandPinky3", "rotation", "z", 0, "+"]);
  
  animations.push(["mixamorigLeftHand", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigLeftForeArm", "rotation", "z", 0, "+"]);
  animations.push(["mixamorigLeftForeArm", "rotation", "x", 0, "-"]);
  
  ref.animations.push(animations);
  
  if(ref.pending === false){
      ref.pending = true;
      ref.animate();
  }
}