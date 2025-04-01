// js/main.js
import * as THREE from 'three'; // Needed for THREE.MathUtils potentially

// Core THREE setup
import { initScene, scene, camera, renderer, clock, handleResize as handleSceneResize } from './sceneSetup.js';

// World elements
import { createGround } from './world.js';

// Player elements
import { createPlayer, updatePlayer, playerPlane } from './player.js'; // Import playerPlane for camera

// Camera control
import { updateCamera } from './cameraController.js';

// Game Objects
import { updateGameObjects, spawnInitialObjects, activeObjects } from './gameObjects.js'; // Import activeObjects for debugging maybe

// HUD
import { createHUD, updateHUD, hudScene, hudCamera, handleHUDResize } from './hud.js';

// Input
import { setupInputListeners, processInputFrame, processedInput } from './inputController.js';

// Game Logic & State
import { gameState, initGameLogic, updateTimer, updateSpeedFactor } from './gameLogic.js';

// --- DOM Elements ---
const canvasContainer = document.getElementById('canvas-container');
const gameOverElement = document.getElementById('game-over');
const instructionModal = document.getElementById('instruction-modal');
const startGameButton = document.getElementById('start-game-button');

// --- Initialization ---
function initialize() {
    if (!canvasContainer || !gameOverElement || !instructionModal || !startGameButton) {
        console.error("One or more essential HTML elements not found!");
        return;
    }

    initScene(canvasContainer);
    initGameLogic(gameOverElement, instructionModal); // Pass HTML elements to gameLogic
    createGround();
    createPlayer();
    createHUD();
    setupInputListeners(canvasContainer, startGameButton);

    // Initial state updates
    updateCamera(true); // Snap camera initially
    updateHUD(gameState); // Update HUD with initial values

    // Add combined resize handler
    window.addEventListener('resize', onWindowResize);

    console.log("Flight Simulator Initialized. Starting animation loop.");
    animate(); // Start the main loop
}

// --- Resize Handling ---
function onWindowResize() {
    handleSceneResize(); // Resize main scene camera/renderer
    handleHUDResize();   // Resize HUD camera and reposition elements
    console.log("Window resized - triggered main resize handler.");
}


// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate); // Keep loop going

    const deltaTime = clock.running ? Math.min(clock.getDelta(), 0.1) : 0; // Get delta time safely

    // --- Input Processing ---
    processInputFrame(); // Update processedInput state based on mouse/keys

    // --- Game Logic Updates (if game is running) ---
    if (gameState.gameStarted && !gameState.gameOver && deltaTime > 0) {
        updateSpeedFactor(deltaTime); // Update speed based on W/S keys
        updatePlayer(deltaTime, processedInput, gameState); // Update plane physics/controls
        updateGameObjects(deltaTime, gameState); // Update rings/obstacles, check collisions
        updateTimer(deltaTime);         // Update game timer
    }

    // --- Visual Updates ---
    updateCamera();                 // Update main camera position/orientation
    updateHUD(gameState);           // Update HUD display based on current game state

    // --- Rendering ---
    if (renderer && scene && camera && hudScene && hudCamera) {
        renderer.clear();                 // Clear buffers
        renderer.render(scene, camera);   // Render main 3D scene
        renderer.clearDepth();            // Clear depth buffer only
        renderer.render(hudScene, hudCamera); // Render HUD scene over the top
    } else {
        console.error("Render error: Missing core components");
    }
}

// --- Start ---
initialize();