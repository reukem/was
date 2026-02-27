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

        // 1. THE FLASH (1.5s decay)
        if (lightRef.current) {
            const intensity = Math.max(0, 50 * (1 - elapsed / 1.5));
            lightRef.current.intensity = intensity;
        }

        // 2. THE SHOCKWAVE (1.0s expansion & fade)
        if (shockwaveRef.current) {
            if (elapsed < 1.0) {
                const scale = 1 + elapsed * 15; // Expand fast
                shockwaveRef.current.scale.set(scale, scale, scale);

                const opacity = Math.max(0, 1 - elapsed / 1.0);
                (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
            } else {
                shockwaveRef.current.visible = false;
            }
        }

        // 3. CAMERA SHAKE (1.0s decay)
        if (elapsed < 1.0) {
            const shakeIntensity = 0.5 * (1 - elapsed / 1.0);
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
            {/* THE FLASH */}
            <pointLight ref={lightRef} distance={10} decay={2} color="#ffaa00" />

            {/* THE SHOCKWAVE */}
            <mesh ref={shockwaveRef}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
            </mesh>

            {/* THE SPARKS */}
            <Sparkles
                count={100}
                scale={6}
                size={6}
                speed={2}
                opacity={1}
                color="#ff3300"
                noise={0.2}
            />
        </group>
    );
};
