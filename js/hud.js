// js/hud.js
import * as THREE from 'three';
import { HUD_MARGIN, HUD_FONT_SIZE, HUD_ELEMENT_HEIGHT, MAX_HP } from './constants.js';

export let hudScene;
export let hudCamera;

let scoreTextPlane, timerTextPlane, hpLabelTextPlane;
let hpBarBgPlane, hpBarFgPlane;
let lastScore = -1, lastTime = -1, lastHP = -1;

// Helper: Creates texture from text
function createTextTexture(text, fontSize = HUD_FONT_SIZE, fontFace = "Arial", textColor = "white", bgColor = "rgba(0,0,0,0)") {
    // ... (keep createTextTexture function exactly as before) ...
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

// Helper: Creates a Plane Mesh for HUD
function createHUDPlane(textureInfo, materialOptions = {}) {
    // ... (keep createHUDPlane function exactly as before) ...
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

export function createHUD() {
    hudScene = new THREE.Scene();
    hudCamera = new THREE.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0, 1, 10);
    hudCamera.position.z = 5;

    // Score Text
    const scoreInfo = createTextTexture("Score: 0");
    scoreTextPlane = createHUDPlane(scoreInfo);
    // ... (rest of createWebGLHUD function exactly as before, adding elements to hudScene) ...
    scoreTextPlane.position.set( HUD_MARGIN + scoreInfo.width / 2, window.innerHeight - HUD_MARGIN - scoreInfo.height / 2, 1);
    hudScene.add(scoreTextPlane);

    // Timer Text
    const timerInfo = createTextTexture("Time: 120"); // Use constant later
    timerTextPlane = createHUDPlane(timerInfo);
    timerTextPlane.position.set( HUD_MARGIN + timerInfo.width / 2, scoreTextPlane.position.y - scoreInfo.height/2 - timerInfo.height/2 - HUD_MARGIN * 0.5, 1);
    hudScene.add(timerTextPlane);

    // HP Label Text
    const hpLabelInfo = createTextTexture("HP:");
    hpLabelTextPlane = createHUDPlane(hpLabelInfo);
    hpLabelTextPlane.position.set( HUD_MARGIN + hpLabelInfo.width / 2, timerTextPlane.position.y - timerInfo.height/2 - hpLabelInfo.height/2 - HUD_MARGIN * 0.5, 1);
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

// Update HUD based on game state passed from gameLogic
export function updateHUD(gameState) {
    // ... (keep updateWebGLHUD function logic exactly as before) ...
    // ... (using gameState.score, gameState.remainingTime, gameState.playerHP) ...
    if (!scoreTextPlane || !timerTextPlane || !hpLabelTextPlane || !hpBarFgPlane || !hpBarBgPlane) {
        return;
    }
    // Update Score Text
    if (gameState.score !== lastScore) {
        // Dispose, create texture, update geometry/material, reposition X
        if (scoreTextPlane.material.map) scoreTextPlane.material.map.dispose();
        if (scoreTextPlane.geometry) scoreTextPlane.geometry.dispose();
        const scoreInfo = createTextTexture(`Score: ${gameState.score}`, HUD_FONT_SIZE);
        scoreTextPlane.material.map = scoreInfo.texture;
        scoreTextPlane.geometry = new THREE.PlaneGeometry(scoreInfo.width, scoreInfo.height);
        scoreTextPlane.position.x = HUD_MARGIN + scoreInfo.width / 2;
        lastScore = gameState.score;
    }
    // Update Timer Text
    const currentTime = Math.max(0, Math.ceil(gameState.remainingTime));
    if (currentTime !== lastTime) {
        // Dispose, create texture, update geometry/material, reposition X
         if (timerTextPlane.material.map) timerTextPlane.material.map.dispose();
         if (timerTextPlane.geometry) timerTextPlane.geometry.dispose();
        const timerInfo = createTextTexture(`Time: ${currentTime}`, HUD_FONT_SIZE);
        timerTextPlane.material.map = timerInfo.texture;
        timerTextPlane.geometry = new THREE.PlaneGeometry(timerInfo.width, timerInfo.height);
        timerTextPlane.position.x = HUD_MARGIN + timerInfo.width / 2;
        lastTime = currentTime;
    }
    // Update HP Bar
    if (gameState.playerHP !== lastHP) {
        // Update scale and color
        const hpPercent = Math.max(0, gameState.playerHP / MAX_HP);
        hpBarFgPlane.scale.x = hpPercent;
        if (hpPercent < 0.3) hpBarFgPlane.material.color.setHex(0xf44336); // Red
        else if (hpPercent < 0.6) hpBarFgPlane.material.color.setHex(0xffc107); // Yellow
        else hpBarFgPlane.material.color.setHex(0x4CAF50); // Green
        hpBarFgPlane.material.needsUpdate = true;
        lastHP = gameState.playerHP;
    }
}

// Function to handle window resizing for HUD elements
export function handleHUDResize() {
    if (!hudCamera || !scoreTextPlane || !timerTextPlane || !hpLabelTextPlane || !hpBarBgPlane || !hpBarFgPlane) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update HUD Camera projection
    hudCamera.left = 0;
    hudCamera.right = width;
    hudCamera.top = height;
    hudCamera.bottom = 0;
    hudCamera.updateProjectionMatrix();

    // Reposition HUD Elements (copy logic from original onWindowResize)
    // ... (Reposition scoreTextPlane, timerTextPlane, hpLabelTextPlane, hpBarBgPlane, hpBarFgPlane based on width/height) ...
    const scoreWidth = scoreTextPlane.geometry.parameters.width;
    const scoreHeight = scoreTextPlane.geometry.parameters.height;
    scoreTextPlane.position.set( HUD_MARGIN + scoreWidth / 2, height - HUD_MARGIN - scoreHeight / 2, 1);

    const timerWidth = timerTextPlane.geometry.parameters.width;
    const timerHeight = timerTextPlane.geometry.parameters.height;
    timerTextPlane.position.set( HUD_MARGIN + timerWidth / 2, scoreTextPlane.position.y - scoreHeight / 2 - timerHeight / 2 - HUD_MARGIN * 0.5, 1);

    const hpLabelWidth = hpLabelTextPlane.geometry.parameters.width;
    const hpLabelHeight = hpLabelTextPlane.geometry.parameters.height;
    hpLabelTextPlane.position.set( HUD_MARGIN + hpLabelWidth / 2, timerTextPlane.position.y - timerHeight / 2 - hpLabelHeight / 2 - HUD_MARGIN * 0.5, 1);

    const barWidth = hpBarBgPlane.geometry.parameters.width;
    const barPosX = hpLabelTextPlane.position.x + hpLabelWidth / 2 + HUD_MARGIN * 0.5;
    hpBarBgPlane.position.set(barPosX + barWidth / 2, hpLabelTextPlane.position.y, 0.9);
    hpBarFgPlane.position.set(barPosX, hpLabelTextPlane.position.y, 1.0); // Left edge position
}