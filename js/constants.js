// js/constants.js

// Player & Control Constants
export const PLANE_SIZE = 8;         // Visual scale & collision basis
export const TURN_SPEED = 1.0;       // Sensitivity for Yaw (Mouse X)
export const ROLL_SPEED = 1.8;       // Sensitivity for Roll (A/D Keys)
export const PITCH_SPEED = 1.2;      // Sensitivity for Pitch (Mouse Y)
export const MOUSE_SENSITIVITY = 0.0015; // General mouse sensitivity multiplier
export const ACCELERATION = 1.0;     // How quickly speed factor changes
export const MOVEMENT_DAMPING = 0.96;  // Velocity reduction per frame (closer to 1 = less damping)
export const BASE_SPEED = 60;        // Base speed units/sec at factor 1.0
export const MAX_SPEED_FACTOR = 2.0;
export const MIN_SPEED_FACTOR = 0.5;
export const GROUND_LEVEL = -2;      // Y position of the ground plane mesh

// Camera Constants
export const CAMERA_DISTANCE = 20;
export const CAMERA_HEIGHT = 6;
export const CAMERA_LAG = 0.08;      // Camera smoothing factor

// Game Object Constants
export const OBJECT_SPAWN_RADIUS_MIN = 250;
export const OBJECT_SPAWN_RADIUS_MAX = 700;
export const OBJECT_SPAWN_HEIGHT_MIN = 10;
export const OBJECT_SPAWN_HEIGHT_MAX = 180;
export const MAX_OBJECTS = 45;
export const INITIAL_OBJECTS = 30;
export const RING_POINTS_BASE = 10;
export const RING_POINTS_SIZE_MULTIPLIER = 15;
export const OBSTACLE_DAMAGE_BASE = 15;
export const OBSTACLE_DAMAGE_SIZE_MULTIPLIER = 10;
export const OBSTACLE_SCORE_PENALTY = 5;
export const REMOVAL_DISTANCE_BUFFER = 1.8; // Multiplier for spawn radius max for removal

// HUD Constants
export const HUD_MARGIN = 20;
export const HUD_FONT_SIZE = 24;
export const HUD_ELEMENT_HEIGHT = 30; // Approx height for positioning

// Game State Constants
export const MAX_HP = 100;
export const INITIAL_TIME = 120; // Seconds