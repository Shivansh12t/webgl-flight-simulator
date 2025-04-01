// js/inputController.js
import { MOUSE_SENSITIVITY } from './constants.js';
import { gameState, startGame } from './gameLogic.js'; // Need game state flags

// DOM Elements needed for listeners
let canvasContainer = null;
let startGameButton = null;

// Input state variables
export const keyState = {};
export const mouseDelta = { x: 0, y: 0 };
export let isPointerLocked = false;

// Processed input values for player update
export const processedInput = {
    pitch: 0,
    yaw: 0,
    roll: 0 // A/D roll is applied directly with dT in player update
};

// --- Event Handlers ---
function handleKeyDown(event) {
    if (!gameState.gameOver) {
        keyState[event.key.toLowerCase()] = true;
    }
}

function handleKeyUp(event) {
    keyState[event.key.toLowerCase()] = false;
}

function handlePointerLockChange() {
    if (document.pointerLockElement === canvasContainer || document.mozPointerLockElement === canvasContainer || document.webkitPointerLockElement === canvasContainer) {
        isPointerLocked = true;
        console.log("Pointer Lock active");
    } else {
        isPointerLocked = false;
        console.log("Pointer Lock released");
        // Clear mouse delta and key states when lock is lost
        mouseDelta.x = 0;
        mouseDelta.y = 0;
        processedInput.pitch = 0;
        processedInput.yaw = 0;
        Object.keys(keyState).forEach(key => keyState[key] = false);
        // Optional: Pause game here
    }
}

function handleMouseMove(event) {
    if (!isPointerLocked || gameState.gameOver || !gameState.gameStarted) return;
    mouseDelta.x += event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    mouseDelta.y += event.movementY || event.mozMovementY || event.webkitMovementY || 0;
}

function handleCanvasClick() {
    // Request pointer lock if game is running and not locked
    if (!isPointerLocked && gameState.gameStarted && !gameState.gameOver) {
       requestPointerLock();
    }
}

// --- Setup ---
export function setupInputListeners(containerElement, startButtonElement) {
    canvasContainer = containerElement; // Store reference
    startGameButton = startButtonElement;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange, false);
    document.addEventListener('mozpointerlockchange', handlePointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', handlePointerLockChange, false);
    document.addEventListener('mousemove', handleMouseMove, false);

    if (startGameButton) {
        startGameButton.addEventListener('click', startGame); // Call imported startGame
    } else {
        console.error("Start game button not found for listener.");
    }
    if (canvasContainer) {
        canvasContainer.addEventListener('click', handleCanvasClick);
    } else {
        console.error("Canvas container not found for listener.");
    }

    console.log("Input listeners set up.");
}

// --- Pointer Lock ---
export function requestPointerLock() {
    if (!canvasContainer) return;
    canvasContainer.requestPointerLock = canvasContainer.requestPointerLock || canvasContainer.mozRequestPointerLock || canvasContainer.webkitRequestPointerLock;
    if (canvasContainer.requestPointerLock) {
        canvasContainer.requestPointerLock();
    } else {
        console.warn("Pointer Lock API not supported or available.");
    }
}

export function exitPointerLock() {
     if (!isPointerLocked) return;
     document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
     if(document.exitPointerLock) {
         document.exitPointerLock();
     }
     isPointerLocked = false; // Update state manually just in case event is slow
}


// --- Input Processing (Call this each frame in main loop) ---
export function processInputFrame() {
    if (!isPointerLocked || gameState.gameOver || !gameState.gameStarted) {
         processedInput.pitch = 0;
         processedInput.yaw = 0;
         processedInput.roll = 0; // Roll state comes from keyState check in player.js
         mouseDelta.x = 0; // Clear delta if not used
         mouseDelta.y = 0;
         return;
    }
    // Calculate pitch/yaw based on accumulated mouse delta
    processedInput.yaw = -mouseDelta.x * MOUSE_SENSITIVITY;
    processedInput.pitch = -mouseDelta.y * MOUSE_SENSITIVITY;

    // Reset accumulated delta for the next frame
    mouseDelta.x = 0;
    mouseDelta.y = 0;

    // Roll is handled via keyState directly in player update, but could be set here too
    processedInput.roll = 0;
    if (keyState['a'] || keyState['arrowleft']) processedInput.roll = 1; // Indicate direction
    if (keyState['d'] || keyState['arrowright']) processedInput.roll = -1;

}