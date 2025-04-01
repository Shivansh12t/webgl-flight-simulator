import * as THREE from 'three';

// --- Core Setup ---
let scene, camera, renderer, clock;
let playerPlane, playerVelocity, targetQuaternion; // Use target quaternion
let groundPlane;
let activeObjects = [];
let score = 0;
let playerHP = 100;
let currentSpeedFactor = 1.0; // Start at base speed
let remainingTime = 120; // Seconds
let gameOver = false;
let gameOverReason = "";

// --- Game Constants ---
const PLANE_SIZE = 2;
const BASE_SPEED = 50; // Increased base speed
const MAX_SPEED_FACTOR = 3.0;
const MIN_SPEED_FACTOR = 0.4;
const ACCELERATION = 2.0;
const DECELERATION = 1.0; // How quickly speed factor drops when not accelerating
const PITCH_SPEED = Math.PI * 0.6; // Radians per second
const YAW_SPEED = Math.PI * 0.5;
const ROLL_SPEED = Math.PI * 1.2;
const MOUSE_SENSITIVITY = 0.0025; // Adjusted sensitivity
const PITCH_LIMIT = Math.PI / 2.2;
const ROLL_LIMIT = Math.PI / 1.8; // Limit how far the plane can roll
const INPUT_DAMPING = 0.92; // Damping factor for pitch/roll when no input
const BANKING_FACTOR = 0.08; // How much roll influences yaw
const SPAWN_DISTANCE_MIN = 350;
const SPAWN_DISTANCE_MAX = 600;
const SPAWN_WIDTH = 250; // How wide the spawn area is horizontally
const SPAWN_HEIGHT = 150; // How wide the spawn area is vertically
const CLEANUP_DISTANCE = 200;
const MAX_OBJECTS = 60; // Increased density
const RING_BASE_RADIUS = 6;
const RING_RADIUS_VARIANCE = 4;
const OBSTACLE_BASE_SIZE = 2;
const OBSTACLE_SIZE_VARIANCE = 3;
const OBSTACLE_DAMAGE_FACTOR = 8; // Damage scales with size
const OBSTACLE_SCORE_PENALTY = 5;
const CAMERA_DISTANCE = PLANE_SIZE * 6; // Adjusted camera distance
const CAMERA_HEIGHT = PLANE_SIZE * 1.8;
const CAMERA_LAG = 0.05; // Smaller value = less lag

// --- Input State ---
const keyState = {};
let mouseDelta = { x: 0, y: 0 };
let isPointerLocked = false;
let rollInput = 0; // -1, 0, 1
let pitchInput = 0; // -1, 0, 1 (from mouse)
let yawInput = 0; // -1, 0, 1 (from mouse)


// --- UI Elements ---
const scoreElement = document.getElementById('score');
const hpElement = document.getElementById('hp');
const speedElement = document.getElementById('speed');
const timerElement = document.getElementById('timer'); // Get timer element
const gameOverElement = document.getElementById('game-over');
const canvasContainer = document.getElementById('canvas-container');

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 150, 1000); // Adjusted fog range

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000); // Increased far plane

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x87CEEB);
    canvasContainer.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Slightly brighter ambient
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Slightly stronger directional
    directionalLight.position.set(100, 150, 50);
    scene.add(directionalLight);

    // Ground Plane (Illusion)
    createGroundPlane();

    // Player Plane
    createPlayerPlane();
    playerVelocity = new THREE.Vector3();
    targetQuaternion = playerPlane.quaternion.clone(); // Start with current rotation

    // Initial Objects
    spawnInitialObjects();

    setupEventListeners();
    updateCamera(true); // Initial camera snap

    animate();
}

// --- Player Plane and Ground ---
function createPlayerPlane() {
    // (Using the same simple model as before)
    playerPlane = new THREE.Group();
    const bodyGeo = new THREE.ConeGeometry(PLANE_SIZE * 0.5, PLANE_SIZE * 2.5, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    playerPlane.add(body);

    const wingGeo = new THREE.BoxGeometry(PLANE_SIZE * 3, PLANE_SIZE * 0.2, PLANE_SIZE * 0.8);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.5, roughness: 0.6 });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.y = -PLANE_SIZE * 0.1;
    wings.position.z = -PLANE_SIZE * 0.3;
    playerPlane.add(wings);

    const tailFinGeo = new THREE.BoxGeometry(PLANE_SIZE * 0.2, PLANE_SIZE * 0.8, PLANE_SIZE * 0.5);
    const tailFin = new THREE.Mesh(tailFinGeo, wingMat);
    tailFin.position.y = PLANE_SIZE * 0.3;
    tailFin.position.z = -PLANE_SIZE * 1.0;
    playerPlane.add(tailFin);

    const tailWingGeo = new THREE.BoxGeometry(PLANE_SIZE * 1.2, PLANE_SIZE * 0.15, PLANE_SIZE * 0.4);
    const tailWings = new THREE.Mesh(tailWingGeo, wingMat);
    tailWings.position.y = -PLANE_SIZE * 0.1;
    tailWings.position.z = -PLANE_SIZE * 1.0;
    playerPlane.add(tailWings);

    playerPlane.position.set(0, 60, 0); // Start higher
    scene.add(playerPlane);
}

function createGroundPlane() {
    const groundTexture = createCheckerboardTexture(1024, 1024); // Larger texture
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(100, 100); // Repeat texture many times

    const groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture }); // Lambert for less reflection
    const groundGeometry = new THREE.PlaneGeometry(20000, 20000); // Make it huge
    groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2; // Lay flat
    groundPlane.position.y = -10; // Position below starting point
    scene.add(groundPlane);
}

function createCheckerboardTexture(width, height) {
    const size = width * height;
    const data = new Uint8Array(3 * size);
    const color1 = new THREE.Color(0x55aa55); // Greenish
    const color2 = new THREE.Color(0x448844); // Darker Greenish

    for (let i = 0; i < size; i++) {
        const x = i % width;
        const y = Math.floor(i / width);
        const stride = i * 3;

        const isDark = (Math.floor(x / 64) % 2 === Math.floor(y / 64) % 2);
        const color = isDark ? color1 : color2;

        data[stride] = Math.floor(color.r * 255);
        data[stride + 1] = Math.floor(color.g * 255);
        data[stride + 2] = Math.floor(color.b * 255);
    }
    return new THREE.DataTexture(data, width, height, THREE.RGBFormat);
}


// --- Event Listeners ---
function setupEventListeners() {
    // (Pointer Lock setup remains the same as before)
    window.addEventListener('keydown', (event) => keyState[event.key.toLowerCase()] = true);
    window.addEventListener('keyup', (event) => keyState[event.key.toLowerCase()] = false);
    window.addEventListener('resize', onWindowResize);

    canvasContainer.addEventListener('click', () => {
        if (!isPointerLocked && !gameOver) {
            canvasContainer.requestPointerLock = canvasContainer.requestPointerLock ||
                                                canvasContainer.mozRequestPointerLock ||
                                                canvasContainer.webkitRequestPointerLock;
            canvasContainer.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);

    document.addEventListener('mousemove', onMouseMove, false);
}

function lockChangeAlert() {
     if (document.pointerLockElement === canvasContainer ||
        document.mozPointerLockElement === canvasContainer ||
        document.webkitPointerLockElement === canvasContainer) {
        isPointerLocked = true;
    } else {
        isPointerLocked = false;
        // Reset input axes when lock is lost
        mouseDelta = { x: 0, y: 0 };
        pitchInput = 0;
        yawInput = 0;
        rollInput = 0;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    if (!isPointerLocked || gameOver) return;
    // Accumulate delta, will be processed in updatePlayer
    mouseDelta.x += event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    mouseDelta.y += event.movementY || event.mozMovementY || event.webkitMovementY || 0;
}

// --- Object Spawning ---
function spawnInitialObjects() {
    for (let i = 0; i < MAX_OBJECTS * 0.6; i++) { // Start with a decent number
        spawnObject(true);
    }
}

function spawnObject(initialSpawn = false) {
     if (activeObjects.length >= MAX_OBJECTS) return; // Don't exceed max

    const isRing = Math.random() > 0.35; // Slightly fewer rings now

    // Calculate spawn center ahead of the player
    const spawnDist = THREE.MathUtils.randFloat(SPAWN_DISTANCE_MIN, SPAWN_DISTANCE_MAX);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerPlane.quaternion);
    const spawnCenter = initialSpawn
        ? new THREE.Vector3(0, 60, spawnDist) // Initial spawn relative to origin
        : new THREE.Vector3().copy(playerPlane.position).addScaledVector(forward, spawnDist);

    // Add random offsets relative to player's orientation
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerPlane.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(playerPlane.quaternion);

    const offsetX = (Math.random() - 0.5) * SPAWN_WIDTH;
    const offsetY = (Math.random() - 0.5) * SPAWN_HEIGHT;

    const spawnPos = new THREE.Vector3()
        .copy(spawnCenter)
        .addScaledVector(right, offsetX)
        .addScaledVector(up, offsetY);

     // Ensure minimum altitude
     if (!initialSpawn && spawnPos.y < groundPlane.position.y + 10) {
        spawnPos.y = groundPlane.position.y + 10 + Math.random() * 15;
     } else if (initialSpawn && spawnPos.y < 15) {
        spawnPos.y = 15 + Math.random() * 15;
     }


    let newObject;

    if (isRing) {
        const ringRadius = RING_BASE_RADIUS + Math.random() * RING_RADIUS_VARIANCE;
        const tubeRadius = ringRadius * THREE.MathUtils.randFloat(0.1, 0.18);
        const points = Math.floor(10 + (RING_BASE_RADIUS + RING_RADIUS_VARIANCE - ringRadius) * 5); // Smaller rings = more points
        // Color based on points (e.g., green=low, yellow=mid, red=high)
        const hue = THREE.MathUtils.mapLinear(points, 10, 10 + RING_RADIUS_VARIANCE * 5, 0.3, 0.0); // Green to Red
        const color = new THREE.Color().setHSL(hue, 0.9, 0.6);

        const geometry = new THREE.TorusGeometry(ringRadius, tubeRadius, 10, 40);
        const material = new THREE.MeshStandardMaterial({
             color: color,
             metalness: 0.4,
             roughness: 0.6,
             emissive: color, // Make rings glow slightly
             emissiveIntensity: 0.3
             });
        newObject = new THREE.Mesh(geometry, material);
        newObject.userData = { type: 'ring', points: points, radius: ringRadius /* Collision uses outer radius */ };
        // Orient the ring to roughly face the player's current position
         newObject.position.copy(spawnPos);
         newObject.lookAt(playerPlane.position);

    } else { // Obstacle
        const size = OBSTACLE_BASE_SIZE + Math.random() * OBSTACLE_SIZE_VARIANCE;
        const shapeType = Math.random();
        let geometry;
        if (shapeType < 0.6) { // Cube
             geometry = new THREE.BoxGeometry(size, size, size);
        } else if (shapeType < 0.9) { // Sphere
             geometry = new THREE.SphereGeometry(size * 0.6, 16, 16); // Sphere radius adjustment
        } else { // Cone
            geometry = new THREE.ConeGeometry(size * 0.6, size * 1.2, 8);
        }

        const material = new THREE.MeshStandardMaterial({
            color: 0x444455, // Dark grey/blueish
            metalness: 0.2,
            roughness: 0.8
            });
        newObject = new THREE.Mesh(geometry, material);
        const damage = Math.floor(size * OBSTACLE_DAMAGE_FACTOR);
        newObject.userData = { type: 'obstacle', damage: damage, radius: size * 0.7 }; // Approx radius for collision
        newObject.position.copy(spawnPos);
        // Random orientation for obstacles
        newObject.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    }

    scene.add(newObject);
    activeObjects.push(newObject);
}

// --- Update Functions ---
function updatePlayer(deltaTime) {
    // --- Speed Control ---
    if (keyState['w'] || keyState['arrowup']) {
        currentSpeedFactor = Math.min(MAX_SPEED_FACTOR, currentSpeedFactor + ACCELERATION * deltaTime);
    } else if (keyState['s'] || keyState['arrowdown']) {
        currentSpeedFactor = Math.max(MIN_SPEED_FACTOR, currentSpeedFactor - ACCELERATION * deltaTime);
    } else {
        // Gradually return to base speed if no input
        if (currentSpeedFactor > 1.0) {
             currentSpeedFactor = Math.max(1.0, currentSpeedFactor - DECELERATION * deltaTime * 0.5);
        } else if (currentSpeedFactor < 1.0) {
            currentSpeedFactor = Math.min(1.0, currentSpeedFactor + DECELERATION * deltaTime * 0.5);
        }
    }

    const actualSpeed = BASE_SPEED * currentSpeedFactor;

    // --- Rotation Input ---
    // Reset continuous input axes
    pitchInput = 0;
    yawInput = 0; // Yaw mostly comes from banking now
    rollInput = 0;

    // Keyboard Roll
    if (keyState['a'] || keyState['arrowleft']) {
        rollInput = 1.0;
    } else if (keyState['d'] || keyState['arrowright']) {
        rollInput = -1.0;
    }

    // Mouse Pitch/Yaw Input (apply sensitivity)
    if (isPointerLocked) {
        pitchInput = -mouseDelta.y * MOUSE_SENSITIVITY * (PITCH_SPEED / (Math.PI * 0.6)); // Scale mouse input relative to base speed
        yawInput   = -mouseDelta.x * MOUSE_SENSITIVITY * (YAW_SPEED / (Math.PI * 0.5));
    }
    // Reset accumulated mouse delta
    mouseDelta = { x: 0, y: 0 };


    // --- Calculate Target Rotation Delta ---
    const deltaRotation = new THREE.Quaternion();
    const rotationSpeedFactor = 1.0; // Optional: link rotation speed to air speed?

     // Apply Pitch (Rotation around local X axis)
    const pitchAngle = pitchInput * PITCH_SPEED * rotationSpeedFactor * deltaTime;
    const pitchDelta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchAngle);
    deltaRotation.multiply(pitchDelta);

    // Apply Yaw (Rotation around local Y axis) - Primarily from Banking + Mouse
     const currentRoll = getPlaneRoll(); // Get current roll angle
     const bankYawAngle = -currentRoll * BANKING_FACTOR * YAW_SPEED * deltaTime; // Roll influences yaw
     const mouseYawAngle = yawInput * YAW_SPEED * rotationSpeedFactor * deltaTime;
     const yawDelta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), bankYawAngle + mouseYawAngle);
     deltaRotation.multiply(yawDelta);


    // Apply Roll (Rotation around local Z axis)
    const rollAngle = rollInput * ROLL_SPEED * rotationSpeedFactor * deltaTime;
    const rollDelta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rollAngle);
    deltaRotation.multiply(rollDelta);

    // Combine delta with current target
    targetQuaternion.premultiply(deltaRotation); // Apply delta to the current target


    // --- Apply Damping & Limits ---
    // Decompose target quaternion to Euler for damping/limiting (easier than pure quaternion limits)
    const targetEuler = new THREE.Euler().setFromQuaternion(targetQuaternion, 'YXZ'); // Use YXZ order

    // Damp roll and pitch towards zero if no input
     if (Math.abs(rollInput) < 0.1) { // No roll input
       targetEuler.z *= INPUT_DAMPING;
     }
     if (Math.abs(pitchInput) < 0.1) { // No pitch input (mouse stopped moving significantly)
       targetEuler.x *= INPUT_DAMPING;
     }
     // Limit roll and pitch
     targetEuler.x = THREE.MathUtils.clamp(targetEuler.x, -PITCH_LIMIT, PITCH_LIMIT);
     targetEuler.z = THREE.MathUtils.clamp(targetEuler.z, -ROLL_LIMIT, ROLL_LIMIT);

    // Convert back to quaternion
    targetQuaternion.setFromEuler(targetEuler);


    // --- Smoothly Interpolate Plane Rotation ---
    playerPlane.quaternion.slerp(targetQuaternion, 8 * deltaTime); // Increased slerp speed for responsiveness


    // --- Update Position ---
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerPlane.quaternion);
    playerVelocity.copy(forward).multiplyScalar(actualSpeed);
    playerPlane.position.addScaledVector(playerVelocity, deltaTime);

    // --- Keep Ground Plane Centered under Player ---
    groundPlane.position.x = playerPlane.position.x;
    groundPlane.position.z = playerPlane.position.z;
}

// Helper function to estimate roll angle from quaternion
function getPlaneRoll() {
    // Project the plane's local X axis onto the world XZ plane
    // and find the angle relative to the world X axis.
    // This is a simplification. A more robust way uses Euler angles derived carefully.
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerPlane.quaternion);
    return Math.atan2(right.y, right.x) - Math.PI / 2; // Angle relative to horizon basically
    // A simpler Euler-based approach (prone to gimbal lock issues if not careful):
    // return new THREE.Euler().setFromQuaternion(playerPlane.quaternion, 'YXZ').z;
}


function updateCamera(forceSnap = false) {
    // Target position: behind and slightly above the plane's center of mass
    const offset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    const targetPosition = playerPlane.localToWorld(offset.clone());

    // Target lookAt: point slightly ahead of the plane
    const lookAtOffset = new THREE.Vector3(0, 0, 20); // Look ahead distance
    const targetLookAt = playerPlane.localToWorld(lookAtOffset.clone());

    if (forceSnap) {
        camera.position.copy(targetPosition);
        camera.lookAt(targetLookAt);
    } else {
        // Smoothly interpolate camera position using lerp
        camera.position.lerp(targetPosition, CAMERA_LAG);

        // Smoothly interpolate lookAt point - Create a dummy object to lerp its position
        // This avoids jerky lookAt changes if the targetLookAt jumps around
        if (!camera.userData.lookAtTarget) {
            camera.userData.lookAtTarget = new THREE.Vector3();
            camera.userData.lookAtTarget.copy(targetLookAt); // Initialize
        }
         camera.userData.lookAtTarget.lerp(targetLookAt, CAMERA_LAG);
         camera.lookAt(camera.userData.lookAtTarget);
    }
}


function updateObjects(deltaTime) {
    const playerPos = playerPlane.position;
    const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerPlane.quaternion);

    let objectsToSpawn = 0;
    for (let i = activeObjects.length - 1; i >= 0; i--) {
        const obj = activeObjects[i];
        const objPos = obj.position;
        const distanceToPlayer = playerPos.distanceTo(objPos);
        const directionToObject = new THREE.Vector3().subVectors(objPos, playerPos).normalize();

        // Cleanup check: Is object behind the player and far enough away?
        const dot = playerForward.dot(directionToObject); // If dot < 0, object is generally behind
        if (dot < -0.2 && distanceToPlayer > CLEANUP_DISTANCE) {
            removeObject(obj, i);
            objectsToSpawn++;
        } else {
            // Collision Check (only if reasonably close and generally in front)
             if (dot > -0.5 && distanceToPlayer < 100) { // Optimization: check only closer objects
                 checkCollision(obj, distanceToPlayer);
             }
        }
    }

    // Spawn new objects if needed
    for (let i = 0; i < objectsToSpawn; i++) {
        spawnObject();
    }
     // Also spawn if count is low
     if (activeObjects.length < MAX_OBJECTS * 0.5) {
        spawnObject();
     }

}

function removeObject(object, index) {
    scene.remove(object);
    if (object.geometry) object.geometry.dispose();
    if (object.material) object.material.dispose();
    if (index !== undefined) { // Only splice if index is provided
         activeObjects.splice(index, 1);
    } else { // Find index if not provided (less efficient)
        const idx = activeObjects.indexOf(object);
        if (idx > -1) activeObjects.splice(idx, 1);
    }
}


function checkCollision(object, distance) {
    const collisionRadius = object.userData.radius || 5;
    // Consider plane's general size for collision margin
    const effectiveCollisionDist = collisionRadius + PLANE_SIZE * 1.5; // A bit more generous

    if (distance < effectiveCollisionDist) {
        let collided = false;
        if (object.userData.type === 'ring') {
            score += object.userData.points;
            console.log(`%c+${object.userData.points} Score! (${score})`, 'color: green; font-weight: bold;');
            // TODO: Add visual/audio feedback
            collided = true;
        } else if (object.userData.type === 'obstacle') {
            const damage = object.userData.damage;
            playerHP -= damage;
            score -= OBSTACLE_SCORE_PENALTY; // Penalize score slightly
            playerHP = Math.max(0, playerHP);
            score = Math.max(0, score); // Don't let score go below 0
            console.log(`%c-${damage} HP! (${playerHP} left). -${OBSTACLE_SCORE_PENALTY} Score.`, 'color: red; font-weight: bold;');
            // TODO: Add visual/audio feedback (e.g., screen shake, hit sound)
            collided = true;

            if (playerHP <= 0) {
                 gameOverReason = "Plane Destroyed!";
                endGame();
            }
        }

        if (collided) {
             // Find and remove the object without needing the index passed in
             removeObject(object);
        }
    }
}


function updateUI() {
    scoreElement.innerText = `Score: ${score}`;
    hpElement.innerText = `HP: ${playerHP}`;
    speedElement.innerText = `Speed: ${(BASE_SPEED * currentSpeedFactor).toFixed(0)}`;
    timerElement.innerText = `Time: ${Math.ceil(remainingTime)}`;
}

function updateTimer(deltaTime) {
    if (gameOver) return;
    remainingTime -= deltaTime;
    if (remainingTime <= 0) {
        remainingTime = 0;
         gameOverReason = "Time's Up!";
        endGame();
    }
}

function endGame() {
    if (gameOver) return; // Prevent multiple calls
    gameOver = true;
    gameOverElement.innerText = `${gameOverReason}\nFinal Score: ${score}\nRefresh to restart.`;
    gameOverElement.classList.remove('hidden');
    if (isPointerLocked) {
        document.exitPointerLock = document.exitPointerLock ||
                                  document.mozExitPointerLock ||
                                  document.webkitExitPointerLock;
        if(document.exitPointerLock) document.exitPointerLock();
    }
    console.log("Game Over! Reason:", gameOverReason, "Final Score:", score);
}

// --- Animation Loop ---
function animate() {
    if (gameOver) {
         // Optional: Allow camera movement even after game over?
         renderer.render(scene, camera);
         requestAnimationFrame(animate); // Keep rendering but stop updates
         return;
    }

    const deltaTime = Math.min(clock.getDelta(), 0.1); // Clamp delta time to avoid large jumps

    requestAnimationFrame(animate);

    // Updates
    updatePlayer(deltaTime);
    updateCamera(); // Camera updates after player
    updateObjects(deltaTime); // Includes collision checks
    updateTimer(deltaTime); // Update game timer
    updateUI(); // Update score/hp/time display

    renderer.render(scene, camera);
}

// --- Start ---
init();