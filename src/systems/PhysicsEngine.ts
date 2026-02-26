// src/systems/PhysicsEngine.ts
import * as THREE from 'three';

export class PhysicsEngine {
    static checkPourCondition(sourcePos: THREE.Vector3, targetPos: THREE.Vector3, sourceId: string, targetId: string): boolean {
        // Simple distance check (XZ plane mainly, but Y diff matters for pouring)
        const distXZ = new THREE.Vector2(sourcePos.x, sourcePos.z).distanceTo(new THREE.Vector2(targetPos.x, targetPos.z));
        const distY = sourcePos.y - targetPos.y; // Source must be above target

        // Heuristic: Distance < 0.6 units, source strictly above target
        if (distXZ < 0.6 && distY > 0.1 && distY < 1.5) {
            return true;
        }
        return false;
    }

    static checkDropCondition(sourcePos: THREE.Vector3, targetPos: THREE.Vector3, sourceType: string): boolean {
        // Similar to pour, but for solid items dropping into containers
        const distXZ = new THREE.Vector2(sourcePos.x, sourcePos.z).distanceTo(new THREE.Vector2(targetPos.x, targetPos.z));
        const distY = sourcePos.y - targetPos.y;

        if (distXZ < 0.4 && distY > 0.1 && distY < 1.0) {
            return true;
        }
        return false;
    }
}
