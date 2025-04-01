// js/world.js
import * as THREE from 'three';
import { GROUND_LEVEL } from './constants.js';
import { renderer, scene } from './sceneSetup.js'; // Need renderer for anisotropy

let groundPlane;

function createCheckerboardTexture() {
    // ... (keep the createCheckerboardTexture function exactly as before) ...
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    const size = 512 / 16; // 16x16 checkers

    for (let row = 0; row < 16; row++) {
        for (let col = 0; col < 16; col++) {
            context.fillStyle = (row + col) % 2 === 0 ? '#779977' : '#557755'; // Greener tones
            context.fillRect(col * size, row * size, size, size);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(200, 200); // Repeat texture many times
    if (renderer && renderer.capabilities) { // Check if renderer is available
       texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Sharper at angles
    }
    texture.needsUpdate = true;
    return texture;
}

export function createGround() {
    if (!scene) {
        console.error("Scene not initialized before creating ground.");
        return;
    }
    const groundTexture = createCheckerboardTexture();
    const groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });
    const groundGeometry = new THREE.PlaneGeometry(20000, 20000);
    groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = GROUND_LEVEL;
    // groundPlane.receiveShadow = true; // Optional
    scene.add(groundPlane);
    console.log("Ground plane created.");
}