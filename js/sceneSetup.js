// js/sceneSetup.js
import * as THREE from 'three';

export let scene;
export let camera;
export let renderer;
export let clock;
export let ambientLight;
export let directionalLight;

export function initScene(canvasContainer) {
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 200, 1200);

    // Camera (Perspective)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x87CEEB);
    renderer.autoClear = false; // Crucial for HUD overlay
    canvasContainer.appendChild(renderer.domElement);

    // Clock
    clock = new THREE.Clock(false); // Don't start automatically

    // Lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(100, 150, 100);
    // directionalLight.castShadow = true; // Optional: enable shadows
    scene.add(directionalLight);

    console.log("Core scene initialized.");
}

// Function to handle window resizing for core elements
export function handleResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}