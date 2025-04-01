// js/cameraController.js
import * as THREE from 'three';
import { camera } from './sceneSetup.js';
import { playerPlane } from './player.js';
import { CAMERA_HEIGHT, CAMERA_DISTANCE, CAMERA_LAG } from './constants.js';

function getPlaneRoll() {
    if (!playerPlane) return 0;
    const euler = new THREE.Euler().setFromQuaternion(playerPlane.quaternion, 'YXZ');
    return euler.z;
}

export function updateCamera(snap = false) {
    if (!playerPlane || !camera) return;

    const roll = getPlaneRoll();
    const baseOffset = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE); // Z positive = behind default object
    const rotatedOffset = baseOffset.clone().applyQuaternion(playerPlane.quaternion);
    const desiredPosition = playerPlane.position.clone().add(rotatedOffset);

    const lookAtOffset = new THREE.Vector3(0, 0, -30); // Look ahead (-Z is forward)
    const lookAtTarget = playerPlane.position.clone().add(lookAtOffset.applyQuaternion(playerPlane.quaternion));

    if (snap) {
        camera.position.copy(desiredPosition);
        camera.lookAt(lookAtTarget);
    } else {
        camera.position.lerp(desiredPosition, CAMERA_LAG);

        const targetQuaternion = new THREE.Quaternion();
        const tempMatrix = new THREE.Matrix4();
        // Use camera.up for the up direction in lookAt
        tempMatrix.lookAt(camera.position, lookAtTarget, camera.up);
        targetQuaternion.setFromRotationMatrix(tempMatrix);
        camera.quaternion.slerp(targetQuaternion, CAMERA_LAG * 1.5); // Adjust lerp factor
    }

    // Apply camera roll *after* other movements
    // Get camera's current forward direction to roll around it
     const cameraForward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
     // Reset any previous roll before applying the new one to avoid accumulation issues
     // This is tricky without storing the "unrolled" state. A simpler approach:
     // Calculate the target orientation *without* roll, then apply roll separately.
     // Let's stick to the slerp + separate roll for now, might need refinement.
     // We need to rotate *back* the previous roll before applying the new one.
     // Or, apply roll based on the difference from the target quaternion's roll.

     // Simpler camera roll: Set camera 'up' vector based on roll
     const targetUp = new THREE.Vector3(0, 1, 0); // Default up
     targetUp.applyQuaternion(playerPlane.quaternion); // Rotate 'up' by plane's orientation
     // Ensure camera.up is smoothly interpolated if desired, or set directly for snappier roll
     camera.up.lerp(targetUp, CAMERA_LAG * 2.0); // Lerp the up vector


     // Re-lookAt after adjusting up vector if not using quaternion slerp for lookAt
     // camera.lookAt(lookAtTarget); // If directly setting lookAt instead of slerping quaternion

}