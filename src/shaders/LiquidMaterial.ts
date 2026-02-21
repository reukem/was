import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';

export const LiquidMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(0.0, 0.5, 1.0),
    uFillLevel: 1.0, // Used for foam calculation if UVs stretch
    uVelocity: new THREE.Vector2(0, 0)
  },
  // Vertex Shader
  `
    uniform float uTime;
    uniform vec2 uVelocity;
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec3 pos = position;

      // Dynamic Sloshing:
      // Displace y based on x/z position relative to velocity direction.
      // Only affect top portion (y > 0.0 to avoid distorting bottom too much, assuming origin at bottom)
      // Actually, standard Cylinder geometry origin is center.
      // Let's assume mesh is positioned such that y goes from 0 to height, or -h/2 to h/2.

      // Simple approximation: tilt the surface based on velocity
      // dot(pos.xz, uVelocity) gives a gradient along the velocity vector
      // We dampen it by pos.y to keep bottom fixed-ish if origin is bottom.
      // If origin is center, we might need (pos.y + 0.5).

      float slosh = dot(pos.xz, uVelocity) * (pos.y + 0.5);
      pos.y += slosh;

      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      vec4 viewPosition = viewMatrix * worldPosition;
      vViewPosition = -viewPosition.xyz;

      gl_Position = projectionMatrix * viewPosition;
    }
  `,
  // Fragment Shader
  `
    uniform vec3 uColor;
    uniform float uFillLevel;
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      // Basic Lighting (Fresnel-ish)
      vec3 viewDir = normalize(vViewPosition);
      vec3 normal = normalize(vNormal);
      float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);

      // Foam Line at the top (vUv.y close to 1.0)
      // Animate foam slightly with noise or sine
      float foamNoise = sin(vUv.x * 20.0 + uTime * 5.0) * 0.02;
      float foam = smoothstep(0.95 + foamNoise, 1.0, vUv.y);

      vec3 baseColor = uColor;
      vec3 foamColor = vec3(1.0, 1.0, 1.0);

      // Mix base color with foam
      vec3 finalColor = mix(baseColor, foamColor, foam);

      // Add Fresnel glow
      finalColor += vec3(0.2) * fresnel;

      gl_FragColor = vec4(finalColor, 0.85 + fresnel * 0.15);

      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }
  `
);

extend({ LiquidMaterial });
