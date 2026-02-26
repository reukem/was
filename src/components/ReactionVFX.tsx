// src/components/ReactionVFX.tsx
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ReactionVFXProps {
    color: string;
    position: [number, number, number];
    intensity: number;
    effectType: 'bubbles' | 'smoke' | 'fire' | 'explosion' | 'foam';
}

const ReactionVFX: React.FC<ReactionVFXProps> = ({ color, position, intensity, effectType }) => {
    const group = useRef<THREE.Group>(null);

    const particles = useMemo(() => {
        const count = 20 * intensity;
        return new Array(Math.floor(count)).fill(0).map(() => ({
            position: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            ),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                Math.random() * 0.1,
                (Math.random() - 0.5) * 0.05
            ),
            scale: Math.random() * 0.5 + 0.5
        }));
    }, [intensity]);

    useFrame(() => {
        if (group.current) {
            group.current.children.forEach((child, i) => {
                const p = particles[i];
                child.position.add(p.velocity);
                p.velocity.y += 0.002; // Buoyancy
                child.scale.multiplyScalar(0.98); // Fade
                if (child.scale.x < 0.01) {
                    child.position.set(0,0,0);
                    child.scale.set(1,1,1);
                    p.velocity.set((Math.random()-0.5)*0.05, Math.random()*0.1, (Math.random()-0.5)*0.05);
                }
            });
        }
    });

    return (
        <group ref={group} position={position}>
            {particles.map((p, i) => (
                <mesh key={i} position={p.position}>
                    <sphereGeometry args={[0.05 * p.scale, 8, 8]} />
                    <meshBasicMaterial color={color} transparent opacity={0.6} />
                </mesh>
            ))}
        </group>
    );
};

export default ReactionVFX;
