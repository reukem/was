import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleProps {
    index: number;
    color: string;
    intensity: number;
    type: 'smoke' | 'fire' | 'bubbles' | 'explosion' | 'sparkles';
}

const Particle: React.FC<ParticleProps> = ({ index, color, intensity, type }) => {
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

        if (type === 'fire') {
            // FIRE: Fast upward, taper to point
            const y = life * 3.0 * intensity;
            const spread = life * 0.2;
            const x = (Math.random() - 0.5) * spread;
            const z = (Math.random() - 0.5) * spread;
            ref.current.position.set(x, y, z);

            // Scale: Start big, shrink to 0
            const s = (1.0 - life) * radius * 3.0 * intensity;
            ref.current.scale.set(s, s, s);

            // Color: Yellow -> Red -> Dark
            const fireColor = new THREE.Color('#facc15').lerp(new THREE.Color('#ef4444'), life);
            ref.current.color.copy(fireColor);
        }
        else if (type === 'bubbles') {
            // BUBBLES: Slow rise inside liquid, wobble
            const y = (life * 1.0) % 1.0; // Stay within height 1.0 roughly
            const wobble = Math.sin(t * 10.0) * 0.05;
            ref.current.position.set(
                Math.sin(angleOffset) * 0.2 + wobble,
                y,
                Math.cos(angleOffset) * 0.2 + wobble
            );

            // Pop at top
            let s = radius * 0.5;
            if (y > 0.9) s *= (1.0 - y) * 10.0; // Pop
            ref.current.scale.set(s, s, s);
            ref.current.color.set(color);
        }
        else {
            // SMOKE / GENERIC
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
        }
    });

    return <Instance ref={ref} />;
};

interface ReactionVFXProps {
  color: string;
  position: [number, number, number];
  intensity?: number;
  effectType?: 'smoke' | 'fire' | 'bubbles' | 'explosion' | 'sparkles';
}

const ReactionVFX: React.FC<ReactionVFXProps> = ({ color, position, intensity = 1.0, effectType = 'smoke' }) => {
  // Use low-poly sphere (Icosahedron detail 0) for volumetric puff
  const particleGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
      color: 0xffffff, // Tinted by instance color
      transparent: true,
      opacity: effectType === 'fire' ? 0.8 : 0.4,
      depthWrite: false, // Important for "smoke" blending
      blending: THREE.AdditiveBlending
  }), [effectType]);

  // Create 20 instances
  const particles = useMemo(() => Array.from({ length: 20 }), []);

  return (
    <group position={position}>
      <Instances range={20} geometry={particleGeo} material={material}>
        {particles.map((_, i) => (
          <Particle key={i} index={i} color={color} intensity={intensity} type={effectType} />
        ))}
      </Instances>
    </group>
  );
};

export default ReactionVFX;
