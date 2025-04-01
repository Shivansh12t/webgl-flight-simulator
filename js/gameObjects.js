// js/gameObjects.js
import * as THREE from 'three';
import {
    MAX_OBJECTS, INITIAL_OBJECTS, RING_POINTS_BASE, RING_POINTS_SIZE_MULTIPLIER,
    OBSTACLE_DAMAGE_BASE, OBSTACLE_DAMAGE_SIZE_MULTIPLIER, OBSTACLE_SCORE_PENALTY,
    OBJECT_SPAWN_RADIUS_MIN, OBJECT_SPAWN_RADIUS_MAX, OBJECT_SPAWN_HEIGHT_MIN,
    OBJECT_SPAWN_HEIGHT_MAX, GROUND_LEVEL, REMOVAL_DISTANCE_BUFFER, PLANE_SIZE
} from './constants.js';
import { scene } from './sceneSetup.js';
import { playerPlane } from './player.js';
// Import the function to call when a collision happens
import { handleCollisionResult } from './gameLogic.js';

export let activeObjects = [];

// --- Spawning ---
function spawnObject() {
    // ... (Keep spawnObject logic exactly as before, using constants) ...
    // ... (Ensure it adds the object to 'scene' and 'activeObjects') ...
    if (!playerPlane || activeObjects.length >= MAX_OBJECTS || !scene) return;

    const isRing = Math.random() > 0.4;
    let object;
    const radius = THREE.MathUtils.randFloat(4, 12);

    if (isRing) {
        const geometry = new THREE.TorusGeometry(radius, radius * 0.2, 8, 32);
        const material = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0xaa8800, side: THREE.DoubleSide });
        object = new THREE.Mesh(geometry, material);
        object.userData = { type: 'ring', radius: radius, points: Math.max(1, Math.round(RING_POINTS_BASE + RING_POINTS_SIZE_MULTIPLIER / radius)) };
    } else { // Obstacle
        const geometry = new THREE.IcosahedronGeometry(radius * 0.8, 0);
        const material = new THREE.MeshPhongMaterial({ color: 0x778899, flatShading: true });
        object = new THREE.Mesh(geometry, material);
        object.userData = { type: 'obstacle', radius: radius * 0.8, damage: Math.max(5, Math.round(OBSTACLE_DAMAGE_BASE + OBSTACLE_DAMAGE_SIZE_MULTIPLIER * radius)), penalty: OBSTACLE_SCORE_PENALTY };
    }

    // Positioning logic (same as before)
    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(playerPlane.quaternion);
    const spawnDist = THREE.MathUtils.randFloat(OBJECT_SPAWN_RADIUS_MIN, OBJECT_SPAWN_RADIUS_MAX);
    const angleH = THREE.MathUtils.randFloatSpread(Math.PI * 0.6);
    const angleV = THREE.MathUtils.randFloatSpread(Math.PI * 0.4);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(playerPlane.quaternion);
    const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(playerPlane.quaternion);
    const offset = forwardDir.clone().multiplyScalar(spawnDist)
                     .add(rightDir.multiplyScalar(Math.sin(angleH) * spawnDist * 0.5))
                     .add(upDir.multiplyScalar(Math.sin(angleV) * spawnDist * 0.3));
    const spawnPos = playerPlane.position.clone().add(offset);
    spawnPos.y = Math.max(GROUND_LEVEL + OBJECT_SPAWN_HEIGHT_MIN, spawnPos.y);
    spawnPos.y = Math.min(OBJECT_SPAWN_HEIGHT_MAX, spawnPos.y);
    object.position.copy(spawnPos);
    object.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

    scene.add(object);
    activeObjects.push(object);
}


export function spawnInitialObjects() {
    if (!playerPlane) return;
    // Ensure activeObjects is empty before spawning
    if (activeObjects.length > 0) {
        console.warn("Spawning initial objects, but activeObjects is not empty. Clearing first.");
        clearGameObjects();
    }
    const initialSpawnOffset = 150;
    const tempPos = playerPlane.position.clone();
    // Temporarily move player back slightly for initial spawn field
    const backDir = new THREE.Vector3(0,0,1).applyQuaternion(playerPlane.quaternion);
    playerPlane.position.addScaledVector(backDir, initialSpawnOffset);

    for (let i = 0; i < INITIAL_OBJECTS; i++) {
        spawnObject();
    }
    playerPlane.position.copy(tempPos); // Restore player position
    console.log("Spawned initial objects:", INITIAL_OBJECTS);
}

// --- Update & Collision ---
function checkCollision(object, distance) {
    // ... (Keep collision check logic exactly as before) ...
    // ... (BUT instead of modifying score/HP directly, return collision info) ...
    const objectCollisionRadius = object.userData.radius || 5;
    const planeCollisionRadius = PLANE_SIZE * 0.7;
    const effectiveCollisionDist = objectCollisionRadius + planeCollisionRadius;

    if (distance < effectiveCollisionDist) {
        if (object.userData.type === 'ring') {
            console.log(`%c+${object.userData.points} Score!`, 'color: green; font-weight: bold;');
            return { points: object.userData.points }; // Return points gained
        } else if (object.userData.type === 'obstacle') {
            console.log(`%c-${object.userData.damage} HP! -${object.userData.penalty} Score.`, 'color: red; font-weight: bold;');
            // Return damage dealt and score penalty
            return { damage: object.userData.damage, penalty: object.userData.penalty };
        }
    }
    return null; // No collision
}

function removeObject(object, index) {
     // ... (Keep removeObject logic exactly as before, disposing geo/mat) ...
     if (!object || !scene) return;
    scene.remove(object);
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
        Object.keys(object.material).forEach(key => {
            if (object.material[key] && object.material[key].isTexture) {
                object.material[key].dispose();
            }
        });
        object.material.dispose();
    }
    // Remove from array safely
    if (index >= 0 && index < activeObjects.length && activeObjects[index] === object) {
      activeObjects.splice(index, 1);
    } else {
      const idx = activeObjects.indexOf(object); // Fallback search
      if (idx > -1) activeObjects.splice(idx, 1);
      else console.warn("Tried to remove object not found at index or in array.");
    }
}

export function updateGameObjects(deltaTime, gameState) {
    if (!playerPlane || gameState.gameOver || !gameState.gameStarted) return;

    const playerPos = playerPlane.position;
    const removalDistanceSq = (OBJECT_SPAWN_RADIUS_MAX * REMOVAL_DISTANCE_BUFFER) ** 2;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerPlane.quaternion);

    for (let i = activeObjects.length - 1; i >= 0; i--) {
        const object = activeObjects[i];
        if (!object) continue; // Safety check

        const directionToObject = object.position.clone().sub(playerPos);
        const distance = directionToObject.length(); // Get distance

        // --- Collision Check ---
        const collisionResult = checkCollision(object, distance);
        if (collisionResult) {
            handleCollisionResult(collisionResult); // Pass result to gameLogic
            removeObject(object, i); // Remove on collision
            continue; // Skip despawn check for this object
        }

        // --- Despawn Check ---
        directionToObject.normalize();
        const dot = directionToObject.dot(forward);
        if ((dot < -0.2 && distance > OBJECT_SPAWN_RADIUS_MIN * 1.5) || distance * distance > removalDistanceSq ) {
             removeObject(object, i);
        }
    }

    // --- Spawn New ---
    if (activeObjects.length < MAX_OBJECTS && Math.random() < 0.1) { // Spawn chance
        spawnObject();
    }
}

export function clearGameObjects() {
     for (let i = activeObjects.length - 1; i >= 0; i--) {
         removeObject(activeObjects[i], i);
     }
     activeObjects = []; // Ensure array is empty
     console.log("Cleared all game objects.");
}