// src/components/Analyzer3D.tsx
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Analyzer3DProps {
    position: [number, number, number];
    updateDisplay?: (ctx: CanvasRenderingContext2D) => void;
}

export const Analyzer3D = React.forwardRef<THREE.Group, Analyzer3DProps>(({ position, updateDisplay }, ref) => {
    const internalRef = useRef<THREE.Group>(null);

    // Create canvas and texture once
    const { canvas, texture } = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const texture = new THREE.CanvasTexture(canvas);
        return { canvas, texture };
    }, []);

    useFrame(() => {
        if (updateDisplay) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                updateDisplay(ctx);
                texture.needsUpdate = true;
            }
        }
    });

    React.useImperativeHandle(ref, () => internalRef.current!);

    return (
        <group ref={internalRef} position={position} userData={{ id: 'ANALYZER', type: 'machine' }}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[0.5, 0.8, 0.3]} />
                <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.41, 0]} castShadow>
                <boxGeometry args={[0.52, 0.1, 0.32]} />
                <meshStandardMaterial color="#facc15" metalness={1.0} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.3, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.4]} />
                <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[0, -0.3, 0.5]}>
                <cylinderGeometry args={[0.01, 0.01, 0.6]} />
                <meshStandardMaterial color="#94a3b8" metalness={1.0} />
            </mesh>
            <mesh position={[0, 0.1, 0.16]}>
                <planeGeometry args={[0.4, 0.25]} />
                <meshBasicMaterial map={texture} />
            </mesh>
        </group>
    );
});
