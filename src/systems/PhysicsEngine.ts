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
     * 1. Source type must be 'rock' or 'solid' or 'jar' (if it holds solids).
     * 2. 2D XZ Distance < 0.6 (Generous drop radius).
     * 3. Y position is less critical for a drop, but should be vaguely above/near.
     */
    checkDropCondition: (
        sourcePos: THREE.Vector3,
        targetPos: THREE.Vector3,
        sourceType: string | undefined
    ): boolean => {
        // Solids/Rocks/Jars can be dropped "into" things
        // Note: 'jar' usually pours, but for this simulation, dragging a jar onto a beaker might be interpreted as dumping its solid contents.
        if (sourceType !== 'rock' && sourceType !== 'solid' && sourceType !== 'jar') return false;

        const dist = new THREE.Vector2(sourcePos.x, sourcePos.z).distanceTo(new THREE.Vector2(targetPos.x, targetPos.z));

        // Generous threshold for dropping IN (0.6 radius)
        // Ignore Y-axis strict check as per user request ("dead drop" fix)
        return dist < 0.6;
    }
};
