import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';

const createAnalyzerGeometry = () => {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    const accentGeo = new THREE.BoxGeometry(0.52, 0.1, 0.32);
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 1.0, roughness: 0.2 });
    const topAccent = new THREE.Mesh(accentGeo, accentMat);
    topAccent.position.y = 0.42;
    group.add(topAccent);

    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
    armGeo.rotateX(Math.PI / 2);
    armGeo.translate(0, 0.3, 0.3);
    const arm = new THREE.Mesh(armGeo, bodyMat);
    group.add(arm);

    const probeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.6);
    probeGeo.translate(0, -0.3, 0.5);
    const probe = new THREE.Mesh(probeGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 1.0 }));
    group.add(probe);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const texture = new THREE.CanvasTexture(canvas);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshBasicMaterial({ map: texture }));
    screen.position.set(0, 0.1, 0.17);
    group.add(screen);

    return { group, texture, canvas };
};

interface Analyzer3DProps {
    onDragStart: () => void;
    onDragEnd: () => void;
    updateDisplay: (ctx: CanvasRenderingContext2D) => void;
    position: [number, number, number];
    onPositionChange: (pos: THREE.Vector3) => void;
}

export const Analyzer3D = React.forwardRef<{ group: THREE.Group }, Analyzer3DProps>(({ onDragStart, onDragEnd, updateDisplay, position, onPositionChange }, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    const { camera } = useThree();
    const { group, texture, canvas } = useMemo(() => createAnalyzerGeometry(), []);

    React.useImperativeHandle(ref, () => ({
        group: groupRef.current!
    }));

    // Update display texture
    useEffect(() => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            updateDisplay(ctx);
            texture.needsUpdate = true;
        }
    });

    const bind = useDrag(
        ({ active, event }) => {
            if (active) {
                onDragStart();
                event.stopPropagation();

                const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Ground plane 0

                const x = (event as any).clientX;
                const y = (event as any).clientY;

                const ray = new THREE.Ray();
                ray.origin.copy(camera.position);
                const ndcX = ((x / window.innerWidth) * 2 - 1);
                const ndcY = -((y / window.innerHeight) * 2 - 1);
                ray.direction.set(ndcX, ndcY, 0.5).unproject(camera).sub(ray.origin).normalize();

                const target = new THREE.Vector3();
                ray.intersectPlane(plane, target);

                if (target && groupRef.current) {
                    // Clamp Y to 0 (floor) or table height 0.11 if we want it on table
                    // Analyzer looks like a machine, maybe it sits on table.
                    groupRef.current.position.set(target.x, 0, target.z);
                    onPositionChange(groupRef.current.position);
                }
            } else {
                onDragEnd();
            }
        },
        { filterTaps: true }
    );

    return (
        <primitive
            ref={groupRef}
            object={group}
            position={position}
            {...bind() as any}
            onClick={(e: any) => e.stopPropagation()}
        />
    );
});
