import React, { useState, useEffect, useRef } from "react";
import Slider from "react-input-slider";
import ybot from "/models/ybot.glb";
import { ArrowLeft, Sun, Moon, ArrowRight, ArrowUp, ArrowDown, RotateCw, ZoomIn, ZoomOut, Move } from "lucide-react";
import { useNavigate } from "react-router-dom";

import * as words from "../../Animations/words";
import * as alphabets from "../../Animations/alphabets";
import { defaultPose } from "../../Animations/defaultPose";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { div } from "three/src/nodes/TSL.js";

const Training = () => {
  const navigate = useNavigate();
  const [bot, setBot] = useState(ybot);
  const [speed, setSpeed] = useState(0.01);
  const [pause, setPause] = useState(800);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeCategory, setActiveCategory] = useState("alphabets"); // 'alphabets' or 'words'
  const [showModelControls, setShowModelControls] = useState(false);
  const [resetKey, setResetKey] = useState(0); // For resetting camera position
  const componentRef = useRef({});
  const { current: ref } = componentRef;

  useEffect(() => {
    // Clear any existing scene elements on re-initialization
    if (ref.scene) {
      // Remove any previous avatar if it exists
      if (ref.avatar) {
        ref.scene.remove(ref.avatar);
      }
    }

    ref.flag = false;
    ref.pending = false;
    ref.animations = [];
    ref.characters = [];

    ref.scene = new THREE.Scene();
    // Set background color based on dark mode
    ref.scene.background = new THREE.Color(darkMode ? 0x111827 : 0xf3f4f6);

    // Improved lighting setup
    // Main directional light (simulates sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    // Improve shadow quality
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.bias = -0.0001;
    ref.scene.add(directionalLight);

    // Fill light from opposite side (softer, to fill shadows)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, 5, -2);
    ref.scene.add(fillLight);

    // Rim light for edge highlighting
    const rimLight = new THREE.DirectionalLight(darkMode ? 0x6495ED : 0xffffff, 0.6);
    rimLight.position.set(0, 5, -5);
    ref.scene.add(rimLight);

    // Ambient light to provide general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    ref.scene.add(ambientLight);

    // Spotlight for focus on the model
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 8, 5);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.2;
    spotLight.decay = 1;
    spotLight.distance = 30;
    spotLight.castShadow = true;
    ref.scene.add(spotLight);

    const canvasContainer = document.getElementById("canvas");
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;

    ref.camera = new THREE.PerspectiveCamera(
      30,
      window.innerWidth * 0.57 / (window.innerHeight - 70),
      0.1,
      1000
    );

    ref.renderer = new THREE.WebGLRenderer({ antialias: true });
    ref.renderer.setSize(width, height);
    ref.renderer.shadowMap.enabled = true;
    ref.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    canvasContainer.innerHTML = "";
    canvasContainer.appendChild(ref.renderer.domElement);

    ref.camera.position.z = 3.0;
    ref.camera.position.y = 1.0;
    // ref.camera.position.x = 0.2;

    ref.controls = new OrbitControls(ref.camera, ref.renderer.domElement);
    ref.controls.enableDamping = true;
    ref.controls.dampingFactor = 0.05;
    ref.controls.minDistance = 1.5;
    ref.controls.maxDistance = 10;
    ref.controls.enablePan = true;
    ref.controls.panSpeed = 0.8;
    ref.controls.target.set(0, 1, 0);
    ref.controls.update();

    const loader = new GLTFLoader();
    loader.load(
      bot,
      (gltf) => {
        // Clear any previous model before adding the new one
        if (ref.avatar) {
          ref.scene.remove(ref.avatar);
        }

        ref.avatar = gltf.scene;

        // Ensure only one instance of the model in the scene
        gltf.scene.traverse((child) => {
          if (child.type === "SkinnedMesh") {
            child.frustumCulled = false;
          }
        });

        ref.scene.add(ref.avatar);
        defaultPose(ref);
        setIsModelLoaded(true);

        // Start animation loop once model is loaded
        if (!ref.animationStarted) {
          ref.animate();
          ref.animationStarted = true;
        }
      },
      undefined,
      (error) => {
        console.error("An error happened while loading model:", error);
      }
    );

    const handleResize = () => {
      const width = canvasContainer.clientWidth;
      const height = canvasContainer.clientHeight;
      ref.renderer.setSize(width, height);
      ref.camera.aspect = width / height;
      ref.camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [bot, darkMode]);

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

  const handleBack = () => {
    navigate('/dashboard');
  };

  const moveModel = (direction) => {
    if (!ref.avatar) return;
    
    const moveSpeed = 0.1;
    
    switch(direction) {
      case 'up':
        ref.avatar.position.y += moveSpeed;
        break;
      case 'down':
        ref.avatar.position.y -= moveSpeed;
        break;
      case 'left':
        ref.avatar.position.x -= moveSpeed;
        break;
      case 'right':
        ref.avatar.position.x += moveSpeed;
        break;
    }
  };

  const resetModelPosition = () => {
    if (!ref.avatar) return;
    
    ref.avatar.position.set(0, 0, 0);
    ref.controls.target.set(0, 1, 0);
    ref.camera.position.set(0, 1.0, 3.6);
    ref.controls.update();
    setResetKey(prev => prev + 1); // Trigger re-render
  };

  const zoomCamera = (direction) => {
    if (!ref.camera) return;
    
    if (direction === 'in' && ref.controls.getDistance() > ref.controls.minDistance + 0.3) {
      ref.camera.position.z -= 0.3;
    } else if (direction === 'out' && ref.controls.getDistance() < ref.controls.maxDistance - 0.3) {
      ref.camera.position.z += 0.3;
    }
    
    ref.controls.update();
  };

  const alphaButtons = Array.from({ length: 26 }, (_, i) => (
    <button
      key={i}
      className={`px-3 py-3 text-sm font-semibold transition rounded-lg ${
        darkMode 
          ? 'bg-blue-600 hover:bg-blue-500 text-white' 
          : 'bg-blue-500 hover:bg-blue-400 text-white'
      }`}
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
      className={`px-3 py-2 text-sm font-semibold transition rounded-lg ${
        darkMode 
          ? 'bg-blue-600 hover:bg-blue-500 text-white' 
          : 'bg-blue-500 hover:bg-blue-400 text-white'
      }`}
      onClick={() => {
        if (ref.animations.length === 0 && ref.avatar) words[word](ref);
      }}
    >
      {word}
    </button>
  ));

  return (
    <div>
      
    <div className={`flex flex-col min-h-screen transition-colors duration-500 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-10 backdrop-blur-md bg-opacity-90 ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      } shadow-lg`}>
        <div className="container flex items-center justify-between px-4 py-4 mx-auto">
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleBack}
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">ISL Training Mode</h1>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-amber-400' 
                : 'bg-gray-200 hover:bg-gray-300 text-amber-600'
            }`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <div className="flex flex-col flex-1 gap-6 p-6 md:flex-row">
        {/* Canvas Viewer - Center panel */}
        <div className="w-full md:w-3/5 order-2 md:order-1 h-[500px]">
          <div className={`relative w-full h-full rounded-2xl overflow-hidden ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-lg`}>
            <div id="canvas" className="w-full h-full" />
            {!isModelLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-2xl">
                <div className="flex items-center text-xl font-bold text-white">
                  <div className="inline-block w-8 h-8 mr-2 border-4 rounded-full border-t-blue-500 animate-spin"></div>
                  Loading model...
                </div>
              </div>
            )}
            <div className={`absolute bottom-4 left-0 right-0 flex justify-center ${showModelControls ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}>
              <div className={`px-4 py-3 rounded-xl backdrop-blur-md ${darkMode ? 'bg-gray-800 bg-opacity-80' : 'bg-white bg-opacity-80'} shadow-lg flex flex-col items-center`}>
                {/* Movement controls */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="col-span-1"></div>
                  <button 
                    onClick={() => moveModel('up')} 
                    className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition`}
                    title="Move Up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <div className="col-span-1"></div>
                  
                  <button 
                    onClick={() => moveModel('left')} 
                    className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition`}
                    title="Move Left"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  
                  <button 
                    onClick={resetModelPosition} 
                    className={`p-2 rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-400'} text-white transition`}
                    title="Reset Position"
                  >
                    <RotateCw size={16} />
                  </button>
                  
                  <button 
                    onClick={() => moveModel('right')} 
                    className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition`}
                    title="Move Right"
                  >
                    <ArrowRight size={16} />
                  </button>
                  
                  <div className="col-span-1"></div>
                  <button 
                    onClick={() => moveModel('down')} 
                    className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition`}
                    title="Move Down"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <div className="col-span-1"></div>
                </div>
                
                {/* Zoom controls */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => zoomCamera('in')} 
                    className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition`}
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button 
                    onClick={() => zoomCamera('out')} 
                    className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition`}
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowModelControls(prev => !prev)}
              className={`absolute bottom-4 right-4 p-2 rounded-full ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                  : 'bg-blue-500 hover:bg-blue-400 text-white'
              } shadow-lg transition-transform duration-300 ${showModelControls ? 'rotate-45' : 'rotate-0'}`}
              title={showModelControls ? "Hide Controls" : "Show Controls"}
            >
              <Move size={20} />
            </button>
          </div>
        </div>

        {/* Right sidebar for controls and gestures */}
        <div className="flex flex-col order-1 w-full gap-6 md:w-2/5 md:order-2">
          {/* Controls section */}
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className="mb-4 text-xl font-bold">Animation Controls</h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Animation Speed</span>
                  <span className={`px-2 py-0.5 rounded-full text-sm ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                    {Math.round(speed * 100) / 100}
                  </span>
                </div>
                <Slider
                  axis="x"
                  xmin={0.001}
                  xmax={0.05}
                  xstep={0.005}
                  x={speed}
                  onChange={({ x }) => setSpeed(x)}
                  styles={{
                    track: {
                      backgroundColor: darkMode ? '#374151' : '#E5E7EB',
                      height: '8px',
                      borderRadius: '4px',
                      width: '100%'
                    },
                    active: {
                      backgroundColor: darkMode ? '#3B82F6' : '#2563EB',
                      height: '8px',
                      borderRadius: '4px'
                    },
                    thumb: {
                      width: '20px',
                      height: '20px',
                      backgroundColor: darkMode ? '#3B82F6' : '#2563EB',
                      borderRadius: '50%',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }
                  }}
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Pause Duration</span>
                  <span className={`px-2 py-0.5 rounded-full text-sm ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                    {pause} ms
                  </span>
                </div>
                <Slider
                  axis="x"
                  xmin={0}
                  xmax={2000}
                  xstep={100}
                  x={pause}
                  onChange={({ x }) => setPause(x)}
                  styles={{
                    track: {
                      backgroundColor: darkMode ? '#374151' : '#E5E7EB',
                      height: '8px',
                      borderRadius: '4px',
                      width: '100%'
                    },
                    active: {
                      backgroundColor: darkMode ? '#3B82F6' : '#2563EB',
                      height: '8px',
                      borderRadius: '4px'
                    },
                    thumb: {
                      width: '20px',
                      height: '20px',
                      backgroundColor: darkMode ? '#3B82F6' : '#2563EB',
                      borderRadius: '50%',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Gesture selection tabs */}
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="flex mb-4 border-b border-gray-700">
              <button 
                onClick={() => setActiveCategory("alphabets")}
                className={`px-4 py-2 font-medium text-sm ${
                  activeCategory === "alphabets" 
                    ? (darkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600')
                    : (darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800')
                }`}
              >
                Alphabets
              </button>
              <button 
                onClick={() => setActiveCategory("words")}
                className={`px-4 py-2 font-medium text-sm ${
                  activeCategory === "words" 
                    ? (darkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600')
                    : (darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800')
                }`}
              >
                Words
              </button>
            </div>

            {/* Alphabets grid - shown when alphabets tab is active */}
            {activeCategory === "alphabets" && (
              <div className="grid grid-cols-6 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {alphaButtons}
              </div>
            )}

            {/* Words grid - shown when words tab is active */}
            {activeCategory === "words" && (
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {wordButtons}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>

  );
};

export default Training;