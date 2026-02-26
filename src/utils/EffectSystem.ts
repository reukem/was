// src/utils/EffectSystem.ts
import * as THREE from 'three';

export class EffectSystem {
    particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; maxLife: number; type: 'spark' | 'smoke' | 'bubble' | 'sparkle'; }[] = [];
    scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    createExplosion(position: THREE.Vector3, intensity: number = 1.0) {
        // Enhanced Sparks (Glowing)
        const sparkCount = Math.floor(150 * intensity);
        const sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 }); // Brighter gold

        for (let i = 0; i < sparkCount; i++) {
            const mesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
            mesh.position.copy(position);
            // Higher velocity spread for intensity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 14 * intensity,
                (Math.random() * 10 + 5) * intensity,
                (Math.random() - 0.5) * 14 * intensity
            );
            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 0, maxLife: 60 + Math.random() * 40, type: 'spark' });
        }

        // Cinematic Smoke (Dark & Volumetric feel)
        const smokeCount = Math.floor(80 * intensity);
        const smokeGeo = new THREE.IcosahedronGeometry(0.25, 0); // Low poly but effective
        const smokeMat = new THREE.MeshStandardMaterial({
            color: 0x334155, // Slate smoke
            transparent: true,
            opacity: 0.8,
            roughness: 1.0,
            flatShading: true
        });

        for (let i = 0; i < smokeCount; i++) {
            const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
            mesh.position.copy(position);
            mesh.position.y += 0.5; // Start slightly higher
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() * 5 + 2) * intensity,
                (Math.random() - 0.5) * 5
            );
            // Random initial rotation
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 0, maxLife: 150 + Math.random() * 80, type: 'smoke' });
        }
    }

    createBubbles(position: THREE.Vector3, color: string, count: number = 5) {
        const bubbleGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const bubbleMat = new THREE.MeshPhysicalMaterial({
            color: color,
            transmission: 0.9,
            opacity: 0.8,
            transparent: true,
            roughness: 0,
            metalness: 0
        });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(bubbleGeo, bubbleMat.clone());
            mesh.position.copy(position).add(new THREE.Vector3((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2));
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.2 + 0.1,
                (Math.random() - 0.5) * 0.1
            );
            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 0, maxLife: 100 + Math.random() * 50, type: 'bubble' });
        }
    }

    createSparkles(position: THREE.Vector3, color: string, count: number = 20) {
        const sparkGeo = new THREE.PlaneGeometry(0.1, 0.1);
        const sparkMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
            mesh.position.copy(position);
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 0, maxLife: 60, type: 'sparkle' });
        }
    }


    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life++;

            p.mesh.position.add(p.velocity.clone().multiplyScalar(0.016));

            if (p.type === 'spark') {
                p.velocity.y -= 0.35; // Stronger gravity for weight
                p.mesh.rotation.x += 0.3;
                p.mesh.rotation.z += 0.3;
                p.mesh.scale.multiplyScalar(0.95);
                const mat = p.mesh.material as THREE.MeshBasicMaterial;
                if (mat) {
                    const progress = p.life / p.maxLife;
                    mat.color.lerp(new THREE.Color(0xff4500), 0.1); // Shift to orange-red
                    if (progress > 0.8) mat.opacity = (1 - progress) * 5; // Fade out quickly at end
                }
            } else if (p.type === 'smoke') {
                p.velocity.y *= 0.96; // Drag
                p.velocity.x *= 0.92;
                p.velocity.z *= 0.92;
                p.mesh.scale.multiplyScalar(1.02); // Expand
                p.mesh.rotation.x += 0.02;
                p.mesh.rotation.y += 0.03;

                const mat = p.mesh.material as THREE.MeshStandardMaterial;
                if(mat) {
                    mat.opacity = 0.8 * (1 - (p.life / p.maxLife)); // Smooth fade
                    mat.color.lerp(new THREE.Color(0x0f172a), 0.05);
                }
            } else if (p.type === 'bubble') {
                 p.velocity.y *= 1.01; // Accelerate up
                 p.mesh.scale.multiplyScalar(1.01);
                 if (p.life > p.maxLife * 0.8) {
                     (p.mesh.material as THREE.MeshPhysicalMaterial).opacity *= 0.9;
                 }
            } else if (p.type === 'sparkle') {
                 p.mesh.rotation.z += 0.2;
                 p.mesh.scale.multiplyScalar(0.95);
            }

            if (p.life > p.maxLife || p.mesh.position.y < -2 || p.mesh.position.y > 10) {
                this.scene.remove(p.mesh);
                (p.mesh.material as THREE.Material).dispose();
                (p.mesh.geometry as THREE.BufferGeometry).dispose();
                this.particles.splice(i, 1);
            }
        }
    }
}
