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
            <pointLight ref={lightRef} color="#ff4400" intensity={50} distance={10} decay={2} />
            <mesh ref={shockwaveRef}>
                <sphereGeometry args={[0.3, 32, 32]} />
                <meshBasicMaterial
                    ref={matRef}
                    color="#ff2200"
                    transparent
                    opacity={1}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
            <Sparkles count={200} scale={4} size={6} speed={6} noise={2} color="#ffaa00" />
        </group>
    );
};
