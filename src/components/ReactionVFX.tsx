import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleProps {
    index: number;
    color: string;
    intensity: number;
}

const Particle: React.FC<ParticleProps> = ({ index, color, intensity }) => {
    const ref = useRef<any>(null);
    const speed = useMemo(() => 0.5 + Math.random() * 0.5, []);
    const offset = useMemo(() => Math.random() * 100, []);
    const radius = useMemo(() => 0.1 + Math.random() * 0.2, []);
    const angleOffset = useMemo(() => Math.random() * Math.PI * 2, []);

    useFrame((state) => {
        if (!ref.current) return;

        // Time
        const t = state.clock.elapsedTime * speed + offset;
        const life = t % 2.0; // 2 second cycle

        // 1. Upward Motion
        const y = life * 1.5 * intensity;

        // 2. Spiral / Turbulence
        const angle = t * 3.0 + angleOffset;
        const spread = life * 0.4 * intensity;
        const x = Math.sin(angle) * spread;
        const z = Math.cos(angle) * spread;

        ref.current.position.set(x, y, z);

        // 3. Scale Lifecycle (Grow -> Shrink)
        let s = 0;
        if (life < 0.2) s = life * 5.0; // Fade in
        else if (life > 1.5) s = (2.0 - life) * 2.0; // Fade out
        else s = 1.0;

        s *= radius * intensity;
        ref.current.scale.set(s, s, s);

        // 4. Color
        ref.current.color.set(color);
    });

    return <Instance ref={ref} />;
};

interface ReactionVFXProps {
  color: string;
  position: [number, number, number];
  intensity?: number;
}

const ReactionVFX: React.FC<ReactionVFXProps> = ({ color, position, intensity = 1.0 }) => {
  // Use low-poly sphere (Icosahedron detail 0) for volumetric puff
  const particleGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
      color: 0xffffff, // Tinted by instance color
      transparent: true,
      opacity: 0.4,
      depthWrite: false, // Important for "smoke" blending
      blending: THREE.AdditiveBlending
  }), []);

  // Create 20 instances
  const particles = useMemo(() => Array.from({ length: 20 }), []);

  return (
    <group position={position}>
      <Instances range={20} geometry={particleGeo} material={material}>
        {particles.map((_, i) => (
          <Particle key={i} index={i} color={color} intensity={intensity} />
        ))}
      </Instances>
    </group>
  );
};

export default ReactionVFX;
