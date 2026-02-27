import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export const ExplosionVFX = ({ position, isActive }: { position: [number, number, number], isActive: boolean }) => {
    // Refs for animation
    const lightRef = useRef<THREE.PointLight>(null);
    const shockwaveRef = useRef<THREE.Mesh>(null);
    // Transient material ref to manipulate opacity without recreating
    const matRef = useRef<THREE.MeshBasicMaterial>(null);

    useFrame((state, delta) => {
        if (!isActive) return;

        // Rapid light decay
        if (lightRef.current) {
            lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 0, delta * 8);
        }

        // Expanding and fading shockwave
        if (shockwaveRef.current && matRef.current) {
            // Expand
            const scale = shockwaveRef.current.scale.x + delta * 15;
            shockwaveRef.current.scale.setScalar(scale);

            // Fade
            matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, 0, delta * 8);
        }
    });

    if (!isActive) return null;

    return (
        <group position={position}>
            {/* The Flash */}
            <pointLight ref={lightRef} color="#ff4400" intensity={100} distance={20} decay={2} />

            {/* The Shockwave */}
            <mesh ref={shockwaveRef}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshBasicMaterial
                    ref={matRef}
                    color="#ff2200"
                    transparent
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Fire Particles */}
            <Sparkles count={300} scale={6} size={12} speed={8} color="#ffaa00" />

            {/* Smoke Particles */}
            <Sparkles count={150} scale={8} size={25} speed={3} color="#444444" opacity={0.6} />
        </group>
    );
};
