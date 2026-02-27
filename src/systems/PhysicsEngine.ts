import * as THREE from 'three';

export class PhysicsEngine {
    static checkPourCondition(sourcePos: THREE.Vector3, targetPos: THREE.Vector3, sourceId: string, targetId: string): boolean {
        const distXZ = new THREE.Vector2(sourcePos.x, sourcePos.z).distanceTo(new THREE.Vector2(targetPos.x, targetPos.z));
        const distY = sourcePos.y - targetPos.y;
        if (distXZ < 1.4 && distY > 0.1 && distY < 1.5) {
            return true;
        }
        return false;
    }

    static checkDropCondition(sourcePos: any, targetPos: any, sourceType: string) {
        const p1 = Array.isArray(sourcePos) ? new THREE.Vector3(...sourcePos) : sourcePos;
        const p2 = Array.isArray(targetPos) ? new THREE.Vector3(...targetPos) : targetPos;

        // Ignore Y-axis (height) for forgiving drops
        const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.z - p2.z, 2));
        return dist < 1.4 && (sourceType === 'rock' || sourceType === 'solid');
    }
}
