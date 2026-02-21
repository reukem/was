import * as THREE from 'three';

/**
 * PhysicsEngine
 * Handles precise interaction checks for the chemistry lab simulation.
 */
export const PhysicsEngine = {
    /**
     * Checks if a source container is in a valid pouring position over a target container.
     *
     * Condition:
     * 1. Source is physically above the target (Y axis).
     * 2. Source is horizontally aligned with the target's opening (XZ plane).
     * 3. Source is not the same as target.
     *
     * @param sourcePos World position of the source container (e.g. Beaker A)
     * @param targetPos World position of the target container (e.g. Beaker B)
     * @param sourceId ID of source
     * @param targetId ID of target
     * @returns boolean
     */
    checkPourCondition: (
        sourcePos: THREE.Vector3,
        targetPos: THREE.Vector3,
        sourceId: string,
        targetId: string
    ): boolean => {
        if (sourceId === targetId) return false;

        // 1. Vertical Check: Source must be above Target
        // Beaker height is roughly 1.0 unit.
        // We expect source bottom to be near target top.
        // Let's say source.y > target.y + 0.5
        const verticalClearance = sourcePos.y - targetPos.y;
        if (verticalClearance < 0.5) return false;
        if (verticalClearance > 2.0) return false; // Too high to pour accurately?

        // 2. Horizontal Overlap (Rim-to-Rim)
        // Beaker radius is roughly 0.5.
        // Pouring happens if horizontal distance is small enough.
        const horizontalDist = new THREE.Vector2(sourcePos.x, sourcePos.z)
            .distanceTo(new THREE.Vector2(targetPos.x, targetPos.z));

        // Threshold: overlapping radii.
        // If dist < (r1 + r2) * factor.
        // Let's be generous but precise enough: 0.8 units
        if (horizontalDist > 0.8) return false;

        return true;
    }
};
