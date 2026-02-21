import * as THREE from 'three';

/**
 * PhysicsEngine
 * Handles precise interaction checks for the chemistry lab simulation.
 */
export const PhysicsEngine = {
    /**
     * Checks if a source container is in a valid pouring position over a target container.
     */
    checkPourCondition: (
        sourcePos: THREE.Vector3,
        targetPos: THREE.Vector3,
        sourceId: string,
        targetId: string
    ): boolean => {
        if (sourceId === targetId) return false;

        // 1. Vertical Check: Source must be above Target
        const verticalClearance = sourcePos.y - targetPos.y;
        if (verticalClearance < 0.5) return false;
        if (verticalClearance > 2.0) return false;

        // 2. Horizontal Overlap (Rim-to-Rim)
        const horizontalDist = new THREE.Vector2(sourcePos.x, sourcePos.z)
            .distanceTo(new THREE.Vector2(targetPos.x, targetPos.z));

        if (horizontalDist > 0.8) return false;

        return true;
    },

    /**
     * Checks if a solid source has been dropped INTO a target container.
     *
     * Condition:
     * 1. Source type must be 'rock' or 'solid'.
     * 2. 2D XZ Distance < 0.5 (Directly intersecting the opening).
     * 3. Y position doesn't matter as much (it's a drop), but source shouldn't be way below target.
     */
    checkDropCondition: (
        sourcePos: THREE.Vector3,
        targetPos: THREE.Vector3,
        sourceType: string | undefined
    ): boolean => {
        // Only rocks can be dropped "into" things this way
        if (sourceType !== 'rock' && sourceType !== 'solid') return false;

        const dist = new THREE.Vector2(sourcePos.x, sourcePos.z).distanceTo(new THREE.Vector2(targetPos.x, targetPos.z));

        // Strict threshold for dropping IN
        return dist < 0.5 && sourcePos.y > targetPos.y - 0.2;
    }
};
