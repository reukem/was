import * as THREE from 'three';

export class PhysicsEngine {
    static checkPourCondition(sourcePos: THREE.Vector3, targetPos: THREE.Vector3, sourceId: string, targetId: string): boolean {
        // Simple distance check (XZ plane mainly, but Y diff matters for pouring)
        const distXZ = new THREE.Vector2(sourcePos.x, sourcePos.z).distanceTo(new THREE.Vector2(targetPos.x, targetPos.z));
        const distY = sourcePos.y - targetPos.y; // Source must be above target

        // Heuristic: Distance < 1.4 units (was 0.6), source strictly above target
        if (distXZ < 1.4 && distY > 0.1 && distY < 1.5) {
            return true;
        }
        return false;
    }

    static checkDropCondition(sourcePos: THREE.Vector3, targetPos: THREE.Vector3, sourceType: string): boolean {
        // Similar to pour, but for solid items dropping into containers
        const distXZ = new THREE.Vector2(sourcePos.x, sourcePos.z).distanceTo(new THREE.Vector2(targetPos.x, targetPos.z));
        const distY = sourcePos.y - targetPos.y;

        // Expanded radius to 1.4 units (was 0.4) for easier drop targeting
        if (distXZ < 1.4 && distY > 0.1 && distY < 1.0) {
            return true;
        }
        return false;
    }
}
