// js/player.js
import * as THREE from 'three';
import {
    PLANE_SIZE, TURN_SPEED, ROLL_SPEED, PITCH_SPEED, MOVEMENT_DAMPING,
    BASE_SPEED, MAX_SPEED_FACTOR, MIN_SPEED_FACTOR, ACCELERATION, GROUND_LEVEL
} from './constants.js';
import { scene } from './sceneSetup.js';

export let playerPlane;
export let playerVelocity = new THREE.Vector3(); // Initialize here

export function createPlayer() {
    if (!scene) {
        console.error("Scene not initialized before creating player.");
        return;
    }
    playerPlane = new THREE.Group();

    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: false });
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, flatShading: false });

    // Fuselage
    const fuselageGeo = new THREE.BoxGeometry(PLANE_SIZE * 0.5, PLANE_SIZE * 0.4, PLANE_SIZE * 1.8);
    const fuselage = new THREE.Mesh(fuselageGeo, bodyMaterial);
    playerPlane.add(fuselage);

    // Wings
    const wingGeo = new THREE.BoxGeometry(PLANE_SIZE * 1.8, PLANE_SIZE * 0.1, PLANE_SIZE * 0.6);
    const mainWing = new THREE.Mesh(wingGeo, wingMaterial);
    mainWing.position.y = 0;
    mainWing.position.z = -PLANE_SIZE * 0.2;
    playerPlane.add(mainWing);

    // Tail Fin
    const tailFinGeo = new THREE.BoxGeometry(PLANE_SIZE * 0.15, PLANE_SIZE * 0.6, PLANE_SIZE * 0.4);
    const tailFin = new THREE.Mesh(tailFinGeo, wingMaterial);
    tailFin.position.z = PLANE_SIZE * 0.8;
    tailFin.position.y = PLANE_SIZE * 0.35;
    playerPlane.add(tailFin);

    // Horizontal Stabilizer
    const hStabGeo = new THREE.BoxGeometry(PLANE_SIZE * 0.8, PLANE_SIZE * 0.08, PLANE_SIZE * 0.3);
    const hStab = new THREE.Mesh(hStabGeo, wingMaterial);
    hStab.position.z = PLANE_SIZE * 0.8;
    hStab.position.y = PLANE_SIZE * 0.1;
    playerPlane.add(hStab);

    playerPlane.position.set(0, 50, 0);
    scene.add(playerPlane);
    console.log("Player plane created (Group).");
}

export function resetPlayerState() {
     if (playerPlane) {
        playerPlane.position.set(0, 50, 0);
        playerPlane.quaternion.identity(); // Reset rotation
     }
     playerVelocity.set(0,0,0);
}


// Pass input state and game state as arguments
export function updatePlayer(deltaTime, inputState, gameState) {
    if (!playerPlane || gameState.gameOver || !gameState.gameStarted) return;

    // --- Handle Input ---
    const yawInput = inputState.yaw; // Use values processed by inputController
    const pitchInput = inputState.pitch;
    const rollInput = inputState.roll;

    // Speed Control (Managed by gameLogic, passed via gameState)
    // Rotation
    playerPlane.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), yawInput * TURN_SPEED); // Yaw around World Y
    playerPlane.rotateOnAxis(new THREE.Vector3(1, 0, 0), pitchInput * PITCH_SPEED); // Pitch around Local X
    playerPlane.rotateOnAxis(new THREE.Vector3(0, 0, 1), rollInput * ROLL_SPEED * deltaTime); // Roll around Local Z (Apply dT here or in input?) - Let's apply dT here

    // --- Calculate Movement ---
    const forward = new THREE.Vector3(0, 0, -1); // Local forward is -Z
    forward.applyQuaternion(playerPlane.quaternion);
    forward.normalize();

    const currentSpeed = BASE_SPEED * gameState.currentSpeedFactor;
    const thrustVector = forward.multiplyScalar(currentSpeed * deltaTime);

    playerVelocity.add(thrustVector);
    playerVelocity.multiplyScalar(MOVEMENT_DAMPING); // Apply damping

    playerPlane.position.add(playerVelocity.clone().multiplyScalar(deltaTime));

    // --- Prevent Flying Too Low ---
    const planeBottomClearance = PLANE_SIZE * 0.2;
    if (playerPlane.position.y < GROUND_LEVEL + planeBottomClearance) {
        playerPlane.position.y = GROUND_LEVEL + planeBottomClearance;
        playerVelocity.y *= 0.1;
        if (playerVelocity.y < 0) {
             playerVelocity.y = 0;
        }
        // Optional: Return collision info for ground impact?
    }
}