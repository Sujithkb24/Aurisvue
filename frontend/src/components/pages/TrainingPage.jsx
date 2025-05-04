import React, { useState, useEffect, useRef } from "react";
import Slider from "react-input-slider";
import ybot from "/models/ybot.glb";

import * as words from "../../Animations/words";
import * as alphabets from "../../Animations/alphabets";
import { defaultPose } from "../../Animations/defaultPose";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const TrainingPage = () => {
  const [bot, setBot] = useState(ybot);
  const [speed, setSpeed] = useState(0.03);
  const [pause, setPause] = useState(800);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const componentRef = useRef({});
  const { current: ref } = componentRef;

  useEffect(() => {
    ref.flag = false;
    ref.pending = false;
    ref.animations = [];
    ref.characters = [];

    ref.scene = new THREE.Scene();
    ref.scene.background = new THREE.Color(0x101828);


    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(40, 40, 40);
    directionalLight.castShadow = true;
    ref.scene.add(directionalLight);


    const spotLight = new THREE.SpotLight(0xffffff, 45);
    spotLight.position.set(0, 5, 5);
    ref.scene.add(spotLight);

    const canvasContainer = document.getElementById("canvas");
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;

    ref.camera = new THREE.PerspectiveCamera(30,
      window.innerWidth*0.57 / (window.innerHeight - 70),
      0.1,
      1000);

    ref.renderer = new THREE.WebGLRenderer({ antialias: true });
    ref.renderer.setSize(width, height);
    // ref.renderer.shadowMap.enabled = true;
    // ref.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    canvasContainer.innerHTML = "";
    canvasContainer.appendChild(ref.renderer.domElement);

    ref.camera.position.z = 3.6;
    ref.camera.position.y = 1.0;

    ref.controls = new OrbitControls(ref.camera, ref.renderer.domElement);
    ref.controls.enableDamping = true; 
    ref.controls.dampingFactor = 0.05;
    ref.controls.minDistance = 1.5; 
    ref.controls.maxDistance = 10; 
    ref.controls.enablePan = false; 
    ref.controls.target.set(0, 1, 0); 
    ref.controls.update();

    const loader = new GLTFLoader();
    loader.load(bot, (gltf) => {
      gltf.scene.traverse((child) => {
        if (child.type === "SkinnedMesh") {
          child.frustumCulled = false;
        }
      });
      ref.avatar = gltf.scene;
      ref.scene.add(ref.avatar);
      defaultPose(ref);
      setIsModelLoaded(true);


    }, undefined, (error) => {
      console.error("An error happened while loading model:", error);
    });

    const handleResize = () => {
      const width = canvasContainer.clientWidth;
      const height = canvasContainer.clientHeight;
      ref.renderer.setSize(width, height);
      ref.camera.aspect = width / height;
      ref.camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [bot]);

  ref.animate = () => {
    requestAnimationFrame(ref.animate); // Call ONCE at the start
  
    // Update orbit controls
    if (ref.controls) {
      ref.controls.update();
    }
  
    // Handle animation logic
    if (ref.animations.length > 0 && ref.animations[0].length) {
      if (!ref.flag) {
        for (let i = 0; i < ref.animations[0].length;) {
          let [boneName, action, axis, limit, sign] = ref.animations[0][i];
          const bone = ref.avatar.getObjectByName(boneName);
  
          if (!bone || !bone[action]) {
            console.warn(`Could not find bone "${boneName}" or action "${action}"`);
            ref.animations[0].splice(i, 1);
            continue;
          }
  
          const obj = bone[action];
          if (sign === "+" && obj[axis] < limit) {
            obj[axis] += speed;
            obj[axis] = Math.min(obj[axis], limit);
            i++;
          } else if (sign === "-" && obj[axis] > limit) {
            obj[axis] -= speed;
            obj[axis] = Math.max(obj[axis], limit);
            i++;
          } else {
            ref.animations[0].splice(i, 1);
          }
        }
      }
    } else if (ref.animations.length > 0) {
      ref.flag = true;
      setTimeout(() => {
        ref.flag = false;
      }, pause);
      ref.animations.shift();
    }
  
    // Render scene
    ref.renderer.render(ref.scene, ref.camera);
  };
  

  const alphaButtons = Array.from({ length: 26 }, (_, i) => (
    <button
      key={i}
      className="px-2 py-2 text-sm font-semibold text-white transition bg-blue-600 rounded sm:text-base hover:bg-blue-700"
      onClick={() => {
        if (ref.animations.length === 0 && ref.avatar) alphabets[String.fromCharCode(i + 65)](ref);
      }}
    >
      {String.fromCharCode(i + 65)}
    </button>
  ));

  const wordButtons = words.wordList.map((word, i) => (
    <button
      key={i}
      className="px-2 py-2 text-sm font-semibold text-white transition bg-blue-600 rounded sm:text-base hover:bg-blue-700"
      onClick={() => {
        if (ref.animations.length === 0 && ref.avatar) words[word](ref);
      }}
    >
      {word}
    </button>
  ));

  return (
    <div className="flex flex-col w-full min-h-screen gap-6 p-4 overflow-hidden md:flex-row">

      {/* Sidebar */}
      <div className="flex flex-col w-full gap-6 md:w-1/4">
        <div>
          <h2 className="mb-2 text-xl font-bold text-center">Alphabets</h2>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">{alphaButtons}</div>
        </div>
        <div>
          <h2 className="mb-2 text-xl font-bold text-center">Words</h2>
          <div className="grid grid-cols-2 gap-2">{wordButtons}</div>
        </div>
      </div>

      {/* Canvas Viewer */}
      <div className="relative w-full md:w-2/4 rounded-2xl">
        <div id="canvas" className="w-full h-[400px] md:h-[600px] shadow-md rounded-2xl" />
        {!isModelLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-2xl">
            <div className="text-xl font-bold text-white">Loading model...</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col w-full gap-6 md:w-1/4">
        <div>
          <p className="font-semibold text-center">Animation Speed: {Math.round(speed * 100) / 100}</p>
          <Slider
            axis="x"
            xmin={0.01}
            xmax={0.5}
            xstep={0.01}
            x={speed}
            onChange={({ x }) => setSpeed(x)}
            className="w-full"
          />
        </div>
        <div>
          <p className="font-semibold text-center">Pause Time: {pause} ms</p>
          <Slider
            axis="x"
            xmin={0}
            xmax={2000}
            xstep={100}
            x={pause}
            onChange={({ x }) => setPause(x)}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;
