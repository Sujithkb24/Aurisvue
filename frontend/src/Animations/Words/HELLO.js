export const HELLO = (ref) => {
  let animations = [];

    animations.push(["mixamorigRightArm", "rotation", "x", -Math.PI / 3, "-"]);
    animations.push(["mixamorigRightForeArm", "rotation", "x", Math.PI / 8, "+"]);
    // animations.push(["mixamorigRightHand", "rotation", "z", Math.PI / 4, "+"]);
    animations.push(["mixamorigRightHand", "rotation", "x", Math.PI / 4, "+"]);

    ref.animations.push(animations);

    animations = [];
    animations.push(["mixamorigRightHand", "rotation", "z", -Math.PI / 4, "-"]);
    ref.animations.push(animations);

    animations = [];
    animations.push(["mixamorigRightHand", "rotation", "z", 0, "+"]);
    animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "-"]);
    animations.push(["mixamorigRightArm", "rotation", "x", 0, "+"]);


    animations.push(["mixamorigRightHand", "rotation", "x", 0, "-"]);
    animations.push(["mixamorigRightHand", "rotation", "z", 0, "-"]);
    animations.push(["mixamorigRightHand", "rotation", "y", 0, "+"]);
    ref.animations.push(animations);

    if (!ref.pending) {
        ref.pending = true;
        ref.animate();
    }
};