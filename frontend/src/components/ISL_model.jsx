import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

const ISLModel = ({ darkMode = true, animationToPlay = null }) => {
  const modelContainerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const modelRef = useRef(null);
  const animationsRef = useRef({});
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!modelContainerRef.current) return;
    
    // Setup
    const container = modelContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? '#111827' : '#f3f4f6');
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1, 3);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Grid Helper
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    
    // Load FBX Model
    const loader = new FBXLoader();
    loader.load('/models/human.fbx', (fbx) => {
      fbx.scale.set(0.01, 0.01, 0.01);
      fbx.position.y = 0;
      scene.add(fbx);
      modelRef.current = fbx;
      
      // Setup animation mixer
      mixerRef.current = new THREE.AnimationMixer(fbx);
      
      // Store animations for later use
      if (fbx.animations && fbx.animations.length) {
        fbx.animations.forEach((clip, index) => {
          const actionName = clip.name || `animation_${index}`;
          animationsRef.current[actionName] = mixerRef.current.clipAction(clip);
        });
        
        // Play default animation if available
        const defaultAction = Object.values(animationsRef.current)[0];
        if (defaultAction) {
          defaultAction.play();
        }
      }
    });
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update mixer
      if (mixerRef.current) {
        mixerRef.current.update(clockRef.current.getDelta());
      }
      
      renderer.render(scene, camera);
    };
    animate();
    
    // Handle resize
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, [darkMode]);
  
  // Update scene background on dark mode change
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(darkMode ? '#111827' : '#f3f4f6');
    }
  }, [darkMode]);
  
  // Handle animation changes
  useEffect(() => {
    if (!animationToPlay || !mixerRef.current || !animationsRef.current) return;
    
    // Stop all current animations
    Object.values(animationsRef.current).forEach(action => {
      action.stop();
    });
    
    // Play the requested animation if it exists
    if (animationsRef.current[animationToPlay]) {
      animationsRef.current[animationToPlay].play();
    }
  }, [animationToPlay]);

  return (
    <div ref={modelContainerRef} className="w-full h-full" />
  );
};

export default ISLModel;