# WebGL Flight Simulator - Made with Gemini 2.5 Pro
<img width="962" alt="image" src="https://github.com/user-attachments/assets/a8191fd0-ecee-42c0-93f6-8ad0e6d6f49f" />

A simple flight simulator game built using JavaScript and the Three.js library for WebGL rendering. The goal is to fly a basic aircraft through rings to score points while avoiding obstacles, all before time runs out or the plane's HP reaches zero.

This project demonstrates:
*   Basic 3D scene setup with Three.js.
*   Player controls using mouse (pitch/yaw) and keyboard (roll/speed).
*   Object spawning and collision detection.
*   An in-game Heads-Up Display (HUD) rendered using a separate WebGL orthographic scene overlay.
*   Modular JavaScript code structure using ES6 Modules.
*   Pointer Lock API for immersive controls.

## Features

*   WebGL 3D Rendering via Three.js
*   Basic Blocky Aircraft Model
*   Mouse & Keyboard Flight Controls (Pitch, Yaw, Roll, Speed)
*   Ring Collection and Obstacle Avoidance Gameplay
*   Score, HP, and Timer System
*   WebGL Overlay HUD (Score, Time, HP Bar)
*   Modular JavaScript Codebase
*   Simple Checkered Ground Plane

## Project Structure

```
flight-simulator/
├── index.html             # Main HTML file
├── style.css              # Basic CSS for overlays (modal, game over)
└── js/
    ├── main.js            # Main entry point, animation loop, orchestration
    ├── constants.js       # Game constants (speeds, sizes, points, etc.)
    ├── sceneSetup.js      # Core THREE.js scene, camera, renderer, light setup
    ├── world.js           # Ground plane, environment elements
    ├── player.js          # Player plane creation, update logic, physics
    ├── cameraController.js# Logic for controlling the main camera
    ├── gameObjects.js     # Spawning, updating, collision of rings/obstacles
    ├── hud.js             # HUD scene, elements creation, update logic
    ├── inputController.js # Event listeners, input state management
    └── gameLogic.js       # Game state (score, HP, time), start/end game logic
```

## Setup and Running

1.  **Clone or Download:** Get the project files onto your local machine.
2.  **Local Web Server:** Because this project uses ES6 Modules (`import`/`export`), you **must** run it through a local web server. Opening `index.html` directly from the filesystem (`file://...`) will likely cause errors.
    *   **Options:**
        *   **VS Code Live Server:** If using Visual Studio Code, install the "Live Server" extension, right-click `index.html`, and choose "Open with Live Server".
        *   **Python:** Navigate to the project directory in your terminal and run `python -m http.server`. It will usually serve on `http://localhost:8000`.
        *   **Node.js:** Install a simple server package globally (`npm install -g serve` or `npm install -g http-server`) and run `serve` or `http-server` in the project directory.
3.  **Open in Browser:** Access the URL provided by your local server (e.g., `http://127.0.0.1:5500` or `http://localhost:8000`).

## How to Play

*   **Goal:** Fly through rings to score points. Avoid grey obstacles, which reduce HP and score. Survive until the time runs out or achieve a high score!
*   **Controls:**
    *   **Mouse:** Controls Pitch (Up/Down) and Yaw (Left/Right).
    *   **A / Left Arrow:** Roll Left
    *   **D / Right Arrow:** Roll Right
    *   **W / Up Arrow:** Increase Speed
    *   **S / Down Arrow:** Decrease Speed
*   Click the "Start Flying!" button in the initial modal to begin. The game will request Pointer Lock for mouse controls.

## Potential Future Improvements

*   Load a more detailed 3D aircraft model (e.g., GLTF format).
*   Add sound effects for collecting rings, collisions, engine noise.
*   Implement more complex terrain or skybox.
*   Improve flight physics/aerodynamics model.
*   Add more types of objects or challenges.
*   Refine camera controls (e.g., different views).

---
