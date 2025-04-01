import * as THREE from 'three';

// --- Core Setup ---
let scene, camera, renderer, clock;
let hudScene, hudCamera; // For Orthographic HUD
let playerPlane, playerVelocity, targetQuaternion; // TargetQuaternion might be unused with direct controls but keep for now
let groundPlane;
let activeObjects = [];
let score = 0;
let playerHP = 100;
const MAX_HP = 100;
let currentSpeedFactor = 1.0;
let remainingTime = 120;
let gameOver = false;
let gameOverReason = "";
let gameStarted = false;

// --- Game Constants ---

// ADJUST THESE CONSTANTS FOR BETTER CONTROL FEEL
const TURN_SPEED = 1.0;      // Sensitivity for Yaw (Mouse X)
const ROLL_SPEED = 1.8;      // Sensitivity for Roll (A/D Keys)
const PITCH_SPEED = 1.2;     // Sensitivity for Pitch (Mouse Y)
const MOUSE_SENSITIVITY = 0.0015; // General mouse sensitivity multiplier
const ACCELERATION = 1.0;    // How quickly speed factor changes
const MOVEMENT_DAMPING = 0.96; // Damping factor applied directly to velocity (closer to 1 = less damping, 0.95-0.98 is typical)

const BASE_SPEED = 60;       // Base speed units per second at factor 1.0
const MAX_SPEED_FACTOR = 2.0;
const MIN_SPEED_FACTOR = 0.5;
const CAMERA_DISTANCE = 20; // Slightly closer camera
const CAMERA_HEIGHT = 6;   // Slightly lower camera
const CAMERA_LAG = 0.08;     // Camera smoothing factor
const OBJECT_SPAWN_RADIUS_MIN = 250;
const OBJECT_SPAWN_RADIUS_MAX = 700;
const OBJECT_SPAWN_HEIGHT_MIN = 10;
const OBJECT_SPAWN_HEIGHT_MAX = 180;
const MAX_OBJECTS = 45;
const INITIAL_OBJECTS = 30;
const RING_POINTS_BASE = 10;
const RING_POINTS_SIZE_MULTIPLIER = 15; // Smaller ring = more points
const OBSTACLE_DAMAGE_BASE = 15;
const OBSTACLE_DAMAGE_SIZE_MULTIPLIER = 10; // Bigger obstacle = more damage
const OBSTACLE_SCORE_PENALTY = 5;
const GROUND_LEVEL = -2; // Y position of the visual ground plane

// Make PLANE_SIZE slightly larger to accommodate the new shape visually
const PLANE_SIZE = 8; // Adjust as needed for visual scale and collision

// HUD Constants
const HUD_MARGIN = 20; // Pixels from edge for HUD elements
const HUD_FONT_SIZE = 24;
const HUD_ELEMENT_HEIGHT = 30; // Approx height for positioning

// --- Input State ---
const keyState = {};
let mouseDelta = { x: 0, y: 0 };
let pitchInput = 0;
let yawInput = 0;
let rollInput = 0;
let isPointerLocked = false;

// --- UI Elements (WebGL HUD Objects) ---
let scoreTextPlane, timerTextPlane, hpLabelTextPlane; // Planes for text textures
let hpBarBgPlane, hpBarFgPlane; // Planes for the health bar
let lastScore = -1, lastTime = -1, lastHP = -1; // Track changes for performance

// --- HTML Elements (Modal/Game Over) ---
const gameOverElement = document.getElementById('game-over');
const canvasContainer = document.getElementById('canvas-container');
const instructionModal = document.getElementById('instruction-modal');
const startGameButton = document.getElementById('start-game-button');

// --- Initialization ---
function init() {
    console.log("Initializing...");
    // --- Main Scene Setup ---
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 200, 1200); // Adjusted fog distances
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x87CEEB); // Sky blue background
    renderer.autoClear = false; // IMPORTANT: Allow manual clearing for multi-scene render
    canvasContainer.appendChild(renderer.domElement);
    clock = new THREE.Clock(false); // Don't start clock immediately

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Slightly less ambient
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); // Slightly stronger directional
    directionalLight.position.set(100, 150, 100); // Adjust light direction
    directionalLight.castShadow = true; // Enable shadows if needed (performance cost)
    // Configure shadow properties if enabled (optional)
    // directionalLight.shadow.mapSize.width = 1024;
    // directionalLight.shadow.mapSize.height = 1024;
    // directionalLight.shadow.camera.near = 0.5;
    // directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // --- HUD Scene Setup ---
    hudScene = new THREE.Scene();
    hudCamera = new THREE.OrthographicCamera(
        0, window.innerWidth, window.innerHeight, 0, 1, 10 // left, right, top, bottom, near, far
    );
    hudCamera.position.z = 5;

    // --- Game Objects ---
    createGroundPlane();        // <<< ADDED BACK
    createPlayerPlane();
    playerVelocity = new THREE.Vector3();
    targetQuaternion = playerPlane.quaternion.clone(); // <<< Initialize targetQuaternion correctly

    // --- Create WebGL HUD ---
    createWebGLHUD();

    // --- Event Listeners & Initial State ---
    setupEventListeners();
    updateCamera(true); // Initial camera snap for main scene
    updateWebGLHUD(); // Initial update to set text/bar state

    console.log("Initialization complete. Waiting for Start button.");
    animate(); // Start render loop (waits for gameStarted flag)
}

// --- Ground Creation --- // <<< ADDED BACK

function createCheckerboardTexture() {
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

function createGroundPlane() {
    const groundTexture = createCheckerboardTexture();
    // Use MeshStandardMaterial for better lighting interaction if needed, or Lambert
    const groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });
    const groundGeometry = new THREE.PlaneGeometry(20000, 20000); // Very large plane
    groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    groundPlane.position.y = GROUND_LEVEL; // Position according to constant
    // groundPlane.receiveShadow = true; // Allow ground to receive shadows (if enabled)
    scene.add(groundPlane);
    console.log("Ground plane created.");
}


// --- Player Plane Creation --- // <<< New Version

function createPlayerPlane() {
    playerPlane = new THREE.Group(); // Use a Group

    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: false }); // Smoother shading
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, flatShading: false });

    // Fuselage
    const fuselageGeo = new THREE.BoxGeometry(PLANE_SIZE * 0.5, PLANE_SIZE * 0.4, PLANE_SIZE * 1.8);
    const fuselage = new THREE.Mesh(fuselageGeo, bodyMaterial);
    // fuselage.castShadow = true; // Enable shadows if needed
    playerPlane.add(fuselage);

    // Wings
    const wingGeo = new THREE.BoxGeometry(PLANE_SIZE * 1.8, PLANE_SIZE * 0.1, PLANE_SIZE * 0.6);
    const mainWing = new THREE.Mesh(wingGeo, wingMaterial);
    mainWing.position.y = 0;
    mainWing.position.z = -PLANE_SIZE * 0.2;
    // mainWing.castShadow = true;
    playerPlane.add(mainWing);

    // Tail Fin (Vertical Stabilizer)
    const tailFinGeo = new THREE.BoxGeometry(PLANE_SIZE * 0.15, PLANE_SIZE * 0.6, PLANE_SIZE * 0.4);
    const tailFin = new THREE.Mesh(tailFinGeo, wingMaterial);
    tailFin.position.z = PLANE_SIZE * 0.8;
    tailFin.position.y = PLANE_SIZE * 0.35;
    // tailFin.castShadow = true;
    playerPlane.add(tailFin);

    // Horizontal Stabilizer (Tail Wings)
    const hStabGeo = new THREE.BoxGeometry(PLANE_SIZE * 0.8, PLANE_SIZE * 0.08, PLANE_SIZE * 0.3);
    const hStab = new THREE.Mesh(hStabGeo, wingMaterial);
    hStab.position.z = PLANE_SIZE * 0.8;
    hStab.position.y = PLANE_SIZE * 0.1;
    // hStab.castShadow = true;
    playerPlane.add(hStab);

    playerPlane.position.set(0, 50, 0); // Start position
    scene.add(playerPlane);
    console.log("Player plane created (Group).");
}


// --- Update Functions --- // <<< Using Direct Controls

function updatePlayer(deltaTime) {
    if (!playerPlane || gameOver || !gameStarted) return;

    // --- Handle Input ---
    yawInput = -mouseDelta.x * MOUSE_SENSITIVITY;
    pitchInput = -mouseDelta.y * MOUSE_SENSITIVITY;
    mouseDelta.x = 0; // Reset delta
    mouseDelta.y = 0;

    rollInput = 0;
    if (keyState['a'] || keyState['arrowleft']) rollInput = ROLL_SPEED * deltaTime;
    if (keyState['d'] || keyState['arrowright']) rollInput = -ROLL_SPEED * deltaTime;

    if (keyState['w'] || keyState['arrowup']) {
        currentSpeedFactor += ACCELERATION * deltaTime;
    }
    if (keyState['s'] || keyState['arrowdown']) {
        currentSpeedFactor -= ACCELERATION * deltaTime;
    }
    currentSpeedFactor = THREE.MathUtils.clamp(currentSpeedFactor, MIN_SPEED_FACTOR, MAX_SPEED_FACTOR);

    // --- Calculate Rotation (Direct Method) ---
    playerPlane.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), yawInput * TURN_SPEED); // Yaw around World Y
    playerPlane.rotateOnAxis(new THREE.Vector3(1, 0, 0), pitchInput * PITCH_SPEED); // Pitch around Local X
    playerPlane.rotateOnAxis(new THREE.Vector3(0, 0, 1), rollInput); // Roll around Local Z


    // --- Calculate Movement ---
    const forward = new THREE.Vector3(0, 0, -1); // Local forward is -Z for BoxGeometry default
    forward.applyQuaternion(playerPlane.quaternion);
    forward.normalize();

    const currentSpeed = BASE_SPEED * currentSpeedFactor;
    const thrustVector = forward.multiplyScalar(currentSpeed * deltaTime);

    playerVelocity.add(thrustVector);
    playerVelocity.multiplyScalar(MOVEMENT_DAMPING); // Apply damping

    playerPlane.position.add(playerVelocity.clone().multiplyScalar(deltaTime));

    // --- Prevent Flying Too Low ---
    // Consider plane's rough vertical size for collision check
    const planeBottomClearance = PLANE_SIZE * 0.2;
    if (playerPlane.position.y < GROUND_LEVEL + planeBottomClearance) {
        playerPlane.position.y = GROUND_LEVEL + planeBottomClearance;
        playerVelocity.y *= 0.1; // Significantly dampen vertical velocity on ground impact
        if (playerVelocity.y < 0) {
             playerVelocity.y = 0;
        }
        // Optional: Small damage on bumpy landing?
        // playerHP -= 0.5; if (playerHP <= 0 && !gameOver) endGame("Crashed!");
    }
}

// --- Camera Update ---
function getPlaneRoll() {
    // Extract roll from the plane's quaternion using Euler angles (YXZ order is often good for aircraft)
    const euler = new THREE.Euler().setFromQuaternion(playerPlane.quaternion, 'YXZ');
    return euler.z; // z rotation in YXZ order typically corresponds to roll
}

function updateCamera(snap = false) {
    if (!playerPlane || !camera) return;

    // Get current roll for camera tilt effect
    const roll = getPlaneRoll();

    // Calculate desired camera position: behind, slightly above
    const baseOffset = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE); // Note: Z is positive for behind the default THREE object orientation

    // Apply plane's rotation to the base offset vector
    const rotatedOffset = baseOffset.clone().applyQuaternion(playerPlane.quaternion);
    const desiredPosition = playerPlane.position.clone().add(rotatedOffset);

    // Calculate target point: slightly ahead of the plane for smoother looking
    const lookAtOffset = new THREE.Vector3(0, 0, -30); // Look ahead (negative Z is forward)
    const lookAtTarget = playerPlane.position.clone().add(lookAtOffset.applyQuaternion(playerPlane.quaternion));

    if (snap) {
        camera.position.copy(desiredPosition);
        camera.lookAt(lookAtTarget); // Snap lookAt as well
    } else {
        // Smoothly interpolate camera position
        camera.position.lerp(desiredPosition, CAMERA_LAG);

        // Smoothly interpolate lookAt target by adjusting camera quaternion
        const targetQuaternion = new THREE.Quaternion();
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.lookAt(camera.position, lookAtTarget, camera.up); // Calculate target orientation matrix
        targetQuaternion.setFromRotationMatrix(tempMatrix); // Convert matrix to quaternion
        camera.quaternion.slerp(targetQuaternion, CAMERA_LAG * 1.5); // Slerp towards target orientation (adjust multiplier for responsiveness)
    }

    // Apply camera roll based on plane roll *after* position/lookAt interpolation
    // This prevents the roll from affecting the lerp target point incorrectly
    // We need to apply roll relative to the camera's forward direction
    const cameraForward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    camera.rotateOnAxis(cameraForward, -roll * 0.5); // Apply negated roll around camera's forward axis (adjust multiplier 0.5 for roll intensity)

}


// --- Collision Check --- // <<< Adjusted for new PLANE_SIZE
function checkCollision(object, distance, index) {
    const objectCollisionRadius = object.userData.radius || 5;
    // Use a slightly larger bounding sphere radius for the plane group
    const planeCollisionRadius = PLANE_SIZE * 0.7; // Tuned value for the new model

    const effectiveCollisionDist = objectCollisionRadius + planeCollisionRadius;

    if (distance < effectiveCollisionDist) {
        let collided = false;
        if (object.userData.type === 'ring') {
            score += object.userData.points;
            console.log(`%c+${object.userData.points} Score! (${score})`, 'color: green; font-weight: bold;');
            collided = true;
            // Add sound effect here?
        } else if (object.userData.type === 'obstacle') {
            const damage = object.userData.damage;
            playerHP -= damage;
            score -= OBSTACLE_SCORE_PENALTY;
            playerHP = Math.max(0, playerHP);
            score = Math.max(0, score);
            console.log(`%c-${damage} HP! (${playerHP} left). -${OBSTACLE_SCORE_PENALTY} Score. (${score})`, 'color: red; font-weight: bold;');
            collided = true;
            // Add sound effect, screen shake?
            if (playerHP <= 0 && !gameOver) {
                 gameOverReason = "Plane Destroyed!";
                 endGame();
            }
        }
        if (collided) {
             removeObject(object, index);
        }
    }
}


// --- Object Spawning & Management ---
function spawnObject() {
    if (!playerPlane || activeObjects.length >= MAX_OBJECTS) return;

    const isRing = Math.random() > 0.4; // 60% chance of ring
    let object;
    const radius = THREE.MathUtils.randFloat(4, 12); // Slightly larger range

    if (isRing) {
        const geometry = new THREE.TorusGeometry(radius, radius * 0.2, 8, 32);
        const material = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0xaa8800, side: THREE.DoubleSide }); // Gold with slight glow
        object = new THREE.Mesh(geometry, material);
        object.userData = {
            type: 'ring',
            radius: radius,
            points: Math.max(1, Math.round(RING_POINTS_BASE + RING_POINTS_SIZE_MULTIPLIER / radius))
        };
    } else { // Obstacle
        const geometry = new THREE.IcosahedronGeometry(radius * 0.8, 0); // Or Box, Sphere etc.
        const material = new THREE.MeshPhongMaterial({ color: 0x778899, flatShading: true }); // Slate grey
        object = new THREE.Mesh(geometry, material);
        // object.castShadow = true; // Obstacles can cast shadows
        object.userData = {
            type: 'obstacle',
            radius: radius * 0.8, // Approx collision radius
            damage: Math.max(5, Math.round(OBSTACLE_DAMAGE_BASE + OBSTACLE_DAMAGE_SIZE_MULTIPLIER * radius))
        };
    }

    // Position the object relative to the player's direction
    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(playerPlane.quaternion);
    const spawnDist = THREE.MathUtils.randFloat(OBJECT_SPAWN_RADIUS_MIN, OBJECT_SPAWN_RADIUS_MAX);

    // Spawn in a wider cone ahead
    const angleH = THREE.MathUtils.randFloatSpread(Math.PI * 0.6); // Horizontal angle spread
    const angleV = THREE.MathUtils.randFloatSpread(Math.PI * 0.4); // Vertical angle spread

    // Create offset vector relative to forward direction
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(playerPlane.quaternion);
    const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(playerPlane.quaternion);

    const offset = forwardDir.clone().multiplyScalar(spawnDist)
                     .add(rightDir.multiplyScalar(Math.sin(angleH) * spawnDist * 0.5)) // Horizontal offset
                     .add(upDir.multiplyScalar(Math.sin(angleV) * spawnDist * 0.3)); // Vertical offset


    const spawnPos = playerPlane.position.clone().add(offset);

    // Clamp height relative to ground
    spawnPos.y = Math.max(GROUND_LEVEL + OBJECT_SPAWN_HEIGHT_MIN, spawnPos.y);
    spawnPos.y = Math.min(OBJECT_SPAWN_HEIGHT_MAX, spawnPos.y);


    object.position.copy(spawnPos);
    // Randomly orient objects
    object.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

    scene.add(object);
    activeObjects.push(object);
}

function spawnInitialObjects() {
    // Spawn slightly ahead so they don't appear right on top at start
    const initialSpawnOffset = 150;
    const tempPos = playerPlane.position.clone();
    playerPlane.position.z -= initialSpawnOffset; // Temporarily move player back

    for (let i = 0; i < INITIAL_OBJECTS; i++) {
        spawnObject();
    }
     playerPlane.position.copy(tempPos); // Restore player position

    console.log("Spawned initial objects:", INITIAL_OBJECTS);
}


function updateObjects(deltaTime) {
    if (!playerPlane || gameOver || !gameStarted) return;

    const playerPos = playerPlane.position;
    // Increased removal distance to avoid pop-out at high speeds
    const removalDistanceSq = (OBJECT_SPAWN_RADIUS_MAX * 1.8) ** 2;

    // Get player forward vector once
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerPlane.quaternion);

    for (let i = activeObjects.length - 1; i >= 0; i--) {
        const object = activeObjects[i];
        const distSq = playerPos.distanceToSquared(object.position);

        // Check collision first
        checkCollision(object, Math.sqrt(distSq), i);

        // Check for removal if behind player and far away
        const directionToObject = object.position.clone().sub(playerPos); // Vector from player to object
        const dist = directionToObject.length(); // Reuse distance if needed later
        directionToObject.normalize();
        const dot = directionToObject.dot(forward); // Dot product with player's forward vector

        // Remove if far behind (dot < -0.2) AND beyond min spawn radius, OR just extremely far away
        if ((dot < -0.2 && dist > OBJECT_SPAWN_RADIUS_MIN * 1.5) || distSq > removalDistanceSq ) {
             removeObject(object, i);
        }
    }

    // Spawn new objects if needed (maybe less frequently than every frame?)
    if (activeObjects.length < MAX_OBJECTS && Math.random() < 0.1) { // ~10% chance per frame to spawn if needed
        spawnObject();
    }
}

function removeObject(object, index) {
    if (!object) return;
    scene.remove(object);

    // Dispose geometry and material to free GPU memory
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
        // If material has maps (textures), dispose them too
        Object.keys(object.material).forEach(key => {
            if (object.material[key] && object.material[key].isTexture) {
                object.material[key].dispose();
            }
        });
        object.material.dispose();
    }

    // Remove from array using splice
    if (index >= 0 && index < activeObjects.length) {
      activeObjects.splice(index, 1);
    } else {
      // Fallback if index is wrong somehow (shouldn't happen often)
      const idx = activeObjects.indexOf(object);
      if (idx > -1) activeObjects.splice(idx, 1);
    }
}


// --- WebGL HUD Creation & Update --- (No changes needed from previous version)

function createTextTexture(text, fontSize = 24, fontFace = "Arial", textColor = "white", bgColor = "rgba(0,0,0,0)") {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `Bold ${fontSize}px ${fontFace}`;
    const metrics = context.measureText(text);
    canvas.width = metrics.width + fontSize * 0.5;
    canvas.height = fontSize * 1.5;
    context.font = `Bold ${fontSize}px ${fontFace}`; // Re-apply font after resize
    context.fillStyle = bgColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = textColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return { texture, width: canvas.width, height: canvas.height };
}

function createHUDPlane(textureInfo, materialOptions = {}) {
    const material = new THREE.MeshBasicMaterial({
        map: textureInfo.texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        ...materialOptions
    });
    const geometry = new THREE.PlaneGeometry(textureInfo.width, textureInfo.height);
    const plane = new THREE.Mesh(geometry, material);
    return plane;
}

function createWebGLHUD() {
    // Score Text
    const scoreInfo = createTextTexture("Score: 0", HUD_FONT_SIZE);
    scoreTextPlane = createHUDPlane(scoreInfo);
    scoreTextPlane.position.set(
        HUD_MARGIN + scoreInfo.width / 2,
        window.innerHeight - HUD_MARGIN - scoreInfo.height / 2,
        1
    );
    hudScene.add(scoreTextPlane);

    // Timer Text
    const timerInfo = createTextTexture("Time: 120", HUD_FONT_SIZE);
    timerTextPlane = createHUDPlane(timerInfo);
    timerTextPlane.position.set(
        HUD_MARGIN + timerInfo.width / 2,
        scoreTextPlane.position.y - scoreInfo.height/2 - timerInfo.height/2 - HUD_MARGIN * 0.5,
        1
    );
    hudScene.add(timerTextPlane);

    // HP Label Text
    const hpLabelInfo = createTextTexture("HP:", HUD_FONT_SIZE);
    hpLabelTextPlane = createHUDPlane(hpLabelInfo);
    hpLabelTextPlane.position.set(
        HUD_MARGIN + hpLabelInfo.width / 2,
        timerTextPlane.position.y - timerInfo.height/2 - hpLabelInfo.height/2 - HUD_MARGIN * 0.5,
        1
    );
    hudScene.add(hpLabelTextPlane);

    // HP Bar
    const barWidth = 150;
    const barHeight = 18;
    const barPosX = hpLabelTextPlane.position.x + hpLabelInfo.width / 2 + HUD_MARGIN * 0.5;

    // Background
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x444444, depthTest: false, depthWrite: false, transparent: true, opacity: 0.8 });
    const bgGeo = new THREE.PlaneGeometry(barWidth, barHeight);
    hpBarBgPlane = new THREE.Mesh(bgGeo, bgMat);
    hpBarBgPlane.position.set(barPosX + barWidth / 2, hpLabelTextPlane.position.y, 0.9);
    hudScene.add(hpBarBgPlane);

    // Foreground
    const fgMat = new THREE.MeshBasicMaterial({ color: 0x4CAF50, depthTest: false, depthWrite: false });
    const fgGeo = new THREE.PlaneGeometry(barWidth, barHeight);
    fgGeo.translate(barWidth / 2, 0, 0); // Anchor left
    hpBarFgPlane = new THREE.Mesh(fgGeo, fgMat);
    hpBarFgPlane.position.set(barPosX, hpLabelTextPlane.position.y, 1.0);
    hpBarFgPlane.scale.x = 1.0;
    hudScene.add(hpBarFgPlane);

     console.log("WebGL HUD created.");
}

function updateWebGLHUD() {
    if (!scoreTextPlane || !timerTextPlane || !hpLabelTextPlane || !hpBarFgPlane || !hpBarBgPlane) {
        return;
    }
    // Update Score Text
    if (score !== lastScore) {
        if (scoreTextPlane.material.map) scoreTextPlane.material.map.dispose();
        if (scoreTextPlane.geometry) scoreTextPlane.geometry.dispose();
        const scoreInfo = createTextTexture(`Score: ${score}`, HUD_FONT_SIZE);
        scoreTextPlane.material.map = scoreInfo.texture;
        scoreTextPlane.geometry = new THREE.PlaneGeometry(scoreInfo.width, scoreInfo.height);
        scoreTextPlane.position.x = HUD_MARGIN + scoreInfo.width / 2;
        lastScore = score;
    }
    // Update Timer Text
    const currentTime = Math.max(0, Math.ceil(remainingTime));
    if (currentTime !== lastTime) {
         if (timerTextPlane.material.map) timerTextPlane.material.map.dispose();
         if (timerTextPlane.geometry) timerTextPlane.geometry.dispose();
        const timerInfo = createTextTexture(`Time: ${currentTime}`, HUD_FONT_SIZE);
        timerTextPlane.material.map = timerInfo.texture;
        timerTextPlane.geometry = new THREE.PlaneGeometry(timerInfo.width, timerInfo.height);
        timerTextPlane.position.x = HUD_MARGIN + timerInfo.width / 2;
        lastTime = currentTime;
    }
    // Update HP Bar
    if (playerHP !== lastHP) {
        const hpPercent = Math.max(0, playerHP / MAX_HP);
        hpBarFgPlane.scale.x = hpPercent;
        if (hpPercent < 0.3) hpBarFgPlane.material.color.setHex(0xf44336); // Red
        else if (hpPercent < 0.6) hpBarFgPlane.material.color.setHex(0xffc107); // Yellow
        else hpBarFgPlane.material.color.setHex(0x4CAF50); // Green
        hpBarFgPlane.material.needsUpdate = true;
        lastHP = playerHP;
    }
}


// --- Event Listeners & Game State --- (Minor adjustments possible)
function setupEventListeners() {
    window.addEventListener('keydown', (event) => {
        if (!gameOver) keyState[event.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (event) => keyState[event.key.toLowerCase()] = false);
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
    document.addEventListener('mousemove', onMouseMove, false);
    startGameButton.addEventListener('click', startGame);
    // Optional: Add click listener to canvas to re-request pointer lock if lost?
    canvasContainer.addEventListener('click', () => {
        if (!isPointerLocked && gameStarted && !gameOver) {
           requestPointerLock();
        }
    });
    console.log("Event listeners set up.");
}

function requestPointerLock() {
     canvasContainer.requestPointerLock = canvasContainer.requestPointerLock || canvasContainer.mozRequestPointerLock || canvasContainer.webkitRequestPointerLock;
    if (canvasContainer.requestPointerLock) {
        canvasContainer.requestPointerLock();
    } else {
        console.warn("Pointer Lock API not supported or available.");
    }
}

function startGame() {
    if (gameStarted) return;
    console.log("Start button clicked!");
    instructionModal.classList.add('hidden');
    gameOverElement.classList.add('hidden'); // Hide game over message if restarting

    // Reset game state variables
    score = 0;
    playerHP = MAX_HP;
    remainingTime = 120; // Reset timer
    gameOver = false;
    gameOverReason = "";
    playerVelocity.set(0,0,0); // Reset velocity
    // Reset plane position and orientation (optional, could continue from last spot)
    playerPlane.position.set(0, 50, 0);
    playerPlane.quaternion.identity(); // Reset rotation to default
    targetQuaternion = playerPlane.quaternion.clone(); // Re-init target quaternion

    // Clear existing objects before spawning new ones
    for (let i = activeObjects.length - 1; i >= 0; i--) {
         removeObject(activeObjects[i], i);
    }
    activeObjects = []; // Ensure array is empty

    requestPointerLock();
    spawnInitialObjects();
    gameStarted = true;
    clock.start(); // Start/restart the clock
    const initialDelta = clock.getDelta(); // Clear any large delta from pause
    console.log("Game Started/Restarted!");
}

function lockChangeAlert() {
     if (document.pointerLockElement === canvasContainer || document.mozPointerLockElement === canvasContainer || document.webkitPointerLockElement === canvasContainer) {
        isPointerLocked = true;
        console.log("Pointer Lock active");
        // Optional: Pause game when lock is lost? clock.stop()?
    } else {
        isPointerLocked = false;
        console.log("Pointer Lock released");
        // Clear input state when lock is lost
        mouseDelta = { x: 0, y: 0 }; pitchInput = 0; yawInput = 0; rollInput = 0;
        Object.keys(keyState).forEach(key => keyState[key] = false);
        // Optional: Show a "Paused" message or pause game explicitly
        // if (gameStarted && !gameOver) { clock.stop(); /* Show pause message */ }
    }
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update Main Camera
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Update HUD Camera
    hudCamera.left = 0;
    hudCamera.right = width;
    hudCamera.top = height;
    hudCamera.bottom = 0;
    hudCamera.updateProjectionMatrix();

    // Resize Renderer
    renderer.setSize(width, height);

    // Reposition HUD Elements
    if (scoreTextPlane && scoreTextPlane.geometry) {
         const scoreWidth = scoreTextPlane.geometry.parameters.width;
         const scoreHeight = scoreTextPlane.geometry.parameters.height;
         scoreTextPlane.position.set( HUD_MARGIN + scoreWidth / 2, height - HUD_MARGIN - scoreHeight / 2, 1);
         if (timerTextPlane && timerTextPlane.geometry) {
             const timerWidth = timerTextPlane.geometry.parameters.width;
             const timerHeight = timerTextPlane.geometry.parameters.height;
             timerTextPlane.position.set( HUD_MARGIN + timerWidth / 2, scoreTextPlane.position.y - scoreHeight / 2 - timerHeight / 2 - HUD_MARGIN * 0.5, 1);
             if (hpLabelTextPlane && hpLabelTextPlane.geometry) {
                 const hpLabelWidth = hpLabelTextPlane.geometry.parameters.width;
                 const hpLabelHeight = hpLabelTextPlane.geometry.parameters.height;
                 hpLabelTextPlane.position.set( HUD_MARGIN + hpLabelWidth / 2, timerTextPlane.position.y - timerHeight / 2 - hpLabelHeight / 2 - HUD_MARGIN * 0.5, 1);
                  if (hpBarBgPlane && hpBarBgPlane.geometry && hpBarFgPlane && hpBarFgPlane.geometry) {
                    const barWidth = hpBarBgPlane.geometry.parameters.width;
                    const barPosX = hpLabelTextPlane.position.x + hpLabelWidth / 2 + HUD_MARGIN * 0.5;
                    hpBarBgPlane.position.set(barPosX + barWidth / 2, hpLabelTextPlane.position.y, 0.9);
                    hpBarFgPlane.position.set(barPosX, hpLabelTextPlane.position.y, 1.0);
                  }
             }
         }
    }
    console.log("Window resized, HUD repositioned.");
}

function onMouseMove(event) {
     if (!isPointerLocked || gameOver || !gameStarted) return;
     mouseDelta.x += event.movementX || event.mozMovementX || event.webkitMovementX || 0;
     mouseDelta.y += event.movementY || event.mozMovementY || event.webkitMovementY || 0;
}

// --- Timer and Game Over ---
function updateTimer(deltaTime) {
    if (gameOver || !gameStarted) return;
    remainingTime -= deltaTime;
    if (remainingTime <= 0) {
        remainingTime = 0;
        if (!gameOver) { // Ensure endGame is called only once
             gameOverReason = "Time's Up!";
             endGame();
        }
    }
}

function endGame() {
    if (gameOver) return; // Prevent multiple calls
    gameOver = true;
    gameStarted = false;
    clock.stop();

    // Do one last HUD update
    updateWebGLHUD();

    // Show HTML Game Over message
    gameOverElement.innerText = `${gameOverReason}\nFinal Score: ${score}\nRefresh page to play again.`; // Changed text slightly
    gameOverElement.classList.remove('hidden');

    // Release pointer lock
    if (isPointerLocked) {
        document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
        if(document.exitPointerLock) {
            document.exitPointerLock();
        }
    }
    console.log("Game Over! Reason:", gameOverReason, "Final Score:", score);
    // Note: Restart logic is currently handled by refreshing the page.
    // A "Restart Game" button could call the startGame() function again.
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate); // Keep loop going

    // Get delta time, but only if clock is running
    const deltaTime = clock.running ? Math.min(clock.getDelta(), 0.1) : 0;

    // Only run game logic if started and not over
    if (gameStarted && !gameOver && deltaTime > 0) {
        updatePlayer(deltaTime);
        updateObjects(deltaTime);
        updateTimer(deltaTime);
        updateCamera(); // Update camera based on player movement
        updateWebGLHUD(); // Update HUD based on game state changes
    } else if (gameOver) {
        // Optionally slowly rotate camera or do something else when game over
    } else if (!gameStarted) {
         // Game not started yet (modal showing?) - update camera maybe?
         updateCamera(true); // Keep camera snapped? Or slowly rotate?
    }


    // Rendering - Always render scenes
    renderer.clear();                 // Clear color and depth
    renderer.render(scene, camera);   // Render main game scene

    renderer.clearDepth();            // Clear depth buffer before HUD
    renderer.render(hudScene, hudCamera); // Render HUD scene on top
}

// --- Start ---
init(); // Initialize everything