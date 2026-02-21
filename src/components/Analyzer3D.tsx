import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

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
    updateDisplay: (ctx: CanvasRenderingContext2D, worldPos: THREE.Vector3) => void;
    position: [number, number, number];
    // Add missing props that LabScene is passing (even if not used by DragControls directly, TS complains if we spread)
    onDragStart?: (e: any) => void;
    onDragEnd?: () => void;
    onPositionChange?: (pos: THREE.Vector3) => void;
}

export const Analyzer3D = React.forwardRef<{ group: THREE.Group }, Analyzer3DProps>(({ updateDisplay, position }, ref) => {
    const localRef = useRef<THREE.Group>(null);
    const { group, texture, canvas } = useMemo(() => createAnalyzerGeometry(), []);

    React.useImperativeHandle(ref, () => ({
        group: localRef.current!
    }));

    // Initial position
    useEffect(() => {
        if (localRef.current) {
            localRef.current.position.set(...position);
        }
    }, [position]); // Only update when parent state changes (drop)

    // Real-time display update
    useFrame(() => {
        if (localRef.current) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Pass current world position to update callback
                updateDisplay(ctx, localRef.current.position);
                texture.needsUpdate = true;
            }
        }
    });

    return (
        <primitive
            ref={localRef}
            object={group}
            // We attach userData so DragControls can identify it
            userData={{ id: 'ANALYZER', type: 'tool' }}
        />
    );
});
