import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface ExplosionVFXProps {
    position: [number, number, number];
    isActive: boolean;
    onComplete?: () => void;
}

export const ExplosionVFX: React.FC<ExplosionVFXProps> = ({ position, isActive, onComplete }) => {
    const lightRef = useRef<THREE.PointLight>(null);
    const shockwaveRef = useRef<THREE.Mesh>(null);
    const [active, setActive] = useState(false);
    const startTimeRef = useRef(0);
    const { camera } = useThree();
    const originalCamPos = useRef(camera.position.clone());

    useEffect(() => {
        if (isActive) {
            setActive(true);
            startTimeRef.current = Date.now();
            originalCamPos.current.copy(camera.position);

            // Auto-reset after max duration (1.5s)
            const timer = setTimeout(() => {
                setActive(false);
                if (onComplete) onComplete();
                // Ensure camera returns to original position
                camera.position.copy(originalCamPos.current);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isActive, camera, onComplete]);

    useFrame(() => {
        if (!active) return;

        const elapsed = (Date.now() - startTimeRef.current) / 1000;

        // 1. THE FLASH (Thermal Decay)
        if (lightRef.current) {
            // Clamp starting intensity to 10 and lerp to 0 over 0.8s
            const intensity = Math.max(0, 10 * (1 - elapsed / 0.8));
            lightRef.current.intensity = intensity;
        }

        // 2. THE SHOCKWAVE (Additive Expansion)
        if (shockwaveRef.current) {
            // Cap max scale to 2.5
            const scale = Math.min(2.5, 1 + elapsed * 10);
            shockwaveRef.current.scale.set(scale, scale, scale);

            // Fade opacity to 0 rapidly
            const opacity = Math.max(0, 1 - elapsed / 0.5);
            (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;

            if (opacity <= 0) {
                shockwaveRef.current.visible = false;
            }
        }

        // 3. CAMERA SHAKE (Clamped)
        if (elapsed < 0.5) { // Shorter shake duration
            const shakeIntensity = 0.05 * (1 - elapsed / 0.5); // Max 0.05 units
            const xOffset = (Math.random() - 0.5) * shakeIntensity;
            const yOffset = (Math.random() - 0.5) * shakeIntensity;
            const zOffset = (Math.random() - 0.5) * shakeIntensity;

            camera.position.set(
                originalCamPos.current.x + xOffset,
                originalCamPos.current.y + yOffset,
                originalCamPos.current.z + zOffset
            );
        } else {
            // Reset camera after shake ends
            camera.position.lerp(originalCamPos.current, 0.1);
        }
    });

    if (!active) return null;

    return (
        <group position={position}>
            {/* THE FLASH: Thermal Orange/Red */}
            <pointLight ref={lightRef} distance={5} decay={2} color="#ff4400" />

            {/* THE SHOCKWAVE: Additive Blending */}
            <mesh ref={shockwaveRef}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshBasicMaterial
                    color="#ff2200"
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* THE SPARKS: Higher Velocity */}
            <Sparkles
                count={150}
                scale={3}
                size={8}
                speed={4}
                opacity={1}
                color="#ffaa00"
                noise={2}
            />
        </group>
    );
};
