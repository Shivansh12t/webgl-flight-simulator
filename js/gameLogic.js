// js/gameLogic.js
import * as THREE from "three"

import {
    MAX_HP, INITIAL_TIME, ACCELERATION, MIN_SPEED_FACTOR, MAX_SPEED_FACTOR
} from './constants.js';
import { clock } from './sceneSetup.js';
import { exitPointerLock, keyState } from './inputController.js'; // Need keyState for speed
import { resetPlayerState } from './player.js';
import { clearGameObjects, spawnInitialObjects } from './gameObjects.js';

// --- Game State ---
export const gameState = {
    score: 0,
    playerHP: MAX_HP,
    remainingTime: INITIAL_TIME,
    currentSpeedFactor: 1.0,
    gameOver: false,
    gameStarted: false,
    gameOverReason: ""
};

// --- HTML Elements --- (Store references)
let gameOverElement = null;
let instructionModal = null;
// Start button listener is handled in inputController now

export function initGameLogic(goElement, modalElement) {
    gameOverElement = goElement;
    instructionModal = modalElement;
}

// --- Game Flow ---
export function startGame() {
    if (gameState.gameStarted && !gameState.gameOver) return; // Prevent starting if already running

    console.log("Attempting to start/restart game...");
    if (instructionModal) instructionModal.classList.add('hidden');
    if (gameOverElement) gameOverElement.classList.add('hidden');

    // Reset State
    gameState.score = 0;
    gameState.playerHP = MAX_HP;
    gameState.remainingTime = INITIAL_TIME;
    gameState.currentSpeedFactor = 1.0;
    gameState.gameOver = false;
    gameState.gameStarted = true; // Set this early
    gameState.gameOverReason = "";

    resetPlayerState();     // Reset player position/velocity
    clearGameObjects();     // Remove old rings/obstacles
    spawnInitialObjects();  // Create new ones

    // requestPointerLock(); // Pointer lock request is now in inputController via canvas click or button

    if (clock) {
        if (!clock.running) {
           clock.start();
        }
        clock.getDelta(); // Clear large delta if paused
    } else {
        console.error("Clock not initialized!");
    }
    console.log("Game Started/Restarted!");
}

export function endGame() {
    if (gameState.gameOver) return; // Prevent multiple calls
    gameState.gameOver = true;
    gameState.gameStarted = false;

    if (clock) clock.stop();

    // Display Game Over Message
    if (gameOverElement) {
        gameOverElement.innerText = `${gameState.gameOverReason}\nFinal Score: ${gameState.score}\nRefresh page to play again.`;
        gameOverElement.classList.remove('hidden');
    }

    exitPointerLock(); // Release mouse lock

    console.log("Game Over! Reason:", gameState.gameOverReason, "Final Score:", gameState.score);
}

// --- State Updates ---
export function updateTimer(deltaTime) {
    if (gameState.gameOver || !gameState.gameStarted) return;
    gameState.remainingTime -= deltaTime;
    if (gameState.remainingTime <= 0) {
        gameState.remainingTime = 0;
        if (!gameState.gameOver) {
            gameState.gameOverReason = "Time's Up!";
            endGame();
        }
    }
}

// Handles results from collision checks in gameObjects.js
export function handleCollisionResult(result) {
    if (!result || gameState.gameOver) return;

    if (result.points) {
        gameState.score += result.points;
    }
    if (result.damage) {
        gameState.playerHP -= result.damage;
        gameState.playerHP = Math.max(0, gameState.playerHP); // Clamp HP
        if (result.penalty) { // Apply score penalty if defined
             gameState.score -= result.penalty;
             gameState.score = Math.max(0, gameState.score); // Clamp score
        }

        if (gameState.playerHP <= 0) {
            gameState.gameOverReason = "Plane Destroyed!";
            endGame();
        }
    }
}

// Update speed factor based on keys
export function updateSpeedFactor(deltaTime) {
     if (gameState.gameOver || !gameState.gameStarted) return;

     if (keyState['w'] || keyState['arrowup']) {
        gameState.currentSpeedFactor += ACCELERATION * deltaTime;
    }
    if (keyState['s'] || keyState['arrowdown']) {
        gameState.currentSpeedFactor -= ACCELERATION * deltaTime;
    }
    gameState.currentSpeedFactor = THREE.MathUtils.clamp(
        gameState.currentSpeedFactor,
        MIN_SPEED_FACTOR,
        MAX_SPEED_FACTOR
    );
}