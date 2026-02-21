import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

const LiquidMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(0.2, 0.6, 1.0),
    uVelocity: new THREE.Vector2(0, 0),
  },
  // Vertex Shader
  `
    uniform float uTime;
    uniform vec2 uVelocity;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Slosh logic: tilt top surface based on velocity
      // Assume cylinder height 1, centered at 0 (y from -0.5 to 0.5)
      // We only displace top vertices (y > 0.0)

      float heightFactor = smoothstep(0.0, 0.5, pos.y);
      float tilt = dot(pos.xz, uVelocity) * 2.0;

      pos.y += tilt * heightFactor;

      vElevation = pos.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform vec3 uColor;
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      // Foam Logic
      float foamNoise = sin(vUv.x * 20.0 + uTime * 3.0) * 0.02;

      // Assume standard cylinder mapping for side: vUv.y goes 0->1
      // Top rim is roughly vUv.y=1

      float foam = smoothstep(0.92 + foamNoise, 0.98, vUv.y);
      vec3 finalColor = mix(uColor, vec3(1.0), foam * 0.5);

      // Simple internal glow
      float fresnel = pow(1.0 - vUv.y, 4.0) * 0.1;
      finalColor += fresnel;

      gl_FragColor = vec4(finalColor, 0.85); // Slightly transparent

      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }
  `
);

extend({ LiquidMaterial });

// Add to JSX Intrinsic Elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      liquidMaterial: any;
    }
  }
}

interface LiquidProps {
  color: string;
  fillLevel: number; // 0 to 1 (volume fraction)
  radius: number;
  height: number;
}

const Liquid: React.FC<LiquidProps> = ({ color, fillLevel, radius, height }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);

  // Physics State for Sloshing
  const lastPos = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector2(0, 0));

  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    // 1. Calculate World Velocity
    const currentPos = new THREE.Vector3();
    meshRef.current.getWorldPosition(currentPos);

    // Initialize if first frame
    if (lastPos.current.lengthSq() === 0 && currentPos.lengthSq() !== 0) {
        lastPos.current.copy(currentPos);
        return;
    }

    const diff = new THREE.Vector3().subVectors(currentPos, lastPos.current);
    // Instantaneous velocity (units per second)
    const rawVel = new THREE.Vector2(diff.x, diff.z).divideScalar(Math.max(0.016, delta));

    // 2. Smooth / Inertia (Liquid lags behind)
    // Target tilt is opposite to movement
    // Scale down effect to match realistic slosh
    const targetTilt = rawVel.multiplyScalar(-0.05);
    velocity.current.lerp(targetTilt, 0.1);

    // Clamp to prevent visual artifacts
    // velocity.current.clampLength(0, 0.5);

    // Update Uniforms
    if (materialRef.current) {
        materialRef.current.uVelocity.set(velocity.current.x, velocity.current.y);
        materialRef.current.uTime = state.clock.elapsedTime;
        materialRef.current.uColor.set(color);
    }

    lastPos.current.copy(currentPos);
  });

  // Calculate actual visual height based on fillLevel
  // The cylinder geometry is centered at 0, height `height`.
  // To simulate filling from bottom up:
  // Scale Y by fillLevel.
  // Translate Y by -height/2 * (1 - fillLevel).
  const yOffset = -height/2 * (1 - fillLevel);

  return (
    <mesh ref={meshRef} position={[0, yOffset, 0]} scale={[1, Math.max(0.01, fillLevel), 1]}>
      <cylinderGeometry args={[radius, radius, height, 32]} />
      {/* @ts-ignore */}
      <liquidMaterial ref={materialRef} transparent />
    </mesh>
  );
};

export default Liquid;
