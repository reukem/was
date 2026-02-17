import * as THREE from 'three';

interface Particle {
    mesh: THREE.Mesh | THREE.Sprite;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    type: 'shockwave' | 'debris' | 'smoke' | 'sparkle' | 'bubble';
    colorStart: THREE.Color;
    colorEnd: THREE.Color;
    scaleStart: number;
    scaleEnd: number;
    rotationSpeed?: number;
}

export class EffectSystem {
    scene: THREE.Scene;
    particles: Particle[] = [];

    // Shared Geometries/Materials for performance
    private debrisGeo: THREE.BoxGeometry;
    private shockwaveGeo: THREE.SphereGeometry;
    private smokeMat: THREE.SpriteMaterial;
    private textureLoader: THREE.TextureLoader;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.debrisGeo = new THREE.BoxGeometry(1, 1, 1); // Scale down in instance
        this.shockwaveGeo = new THREE.SphereGeometry(1, 32, 32);
        this.textureLoader = new THREE.TextureLoader();

        // Procedural Smoke Texture (Soft circle)
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const grd = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            grd.addColorStop(0, 'rgba(255,255,255,1)');
            grd.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 32, 32);
        }
        const texture = new THREE.CanvasTexture(canvas);
        this.smokeMat = new THREE.SpriteMaterial({
            map: texture,
            color: 0x888888,
            transparent: true,
            opacity: 0.6,
            depthWrite: false
        });
    }

    createExplosion(position: THREE.Vector3, intensity: number = 1.0) {
        // 1. Shockwave
        const shockMat = new THREE.MeshBasicMaterial({
            color: 0xffdd88,
            transparent: true,
            opacity: 0.8,
            side: THREE.BackSide
        });
        const shockMesh = new THREE.Mesh(this.shockwaveGeo, shockMat);
        shockMesh.position.copy(position);
        shockMesh.scale.set(0.1, 0.1, 0.1);
        this.scene.add(shockMesh);

        this.particles.push({
            mesh: shockMesh,
            velocity: new THREE.Vector3(0, 0, 0),
            life: 0,
            maxLife: 20,
            type: 'shockwave',
            colorStart: new THREE.Color(0xffdd88),
            colorEnd: new THREE.Color(0xff4400),
            scaleStart: 0.1,
            scaleEnd: 3.0 * intensity
        });

        // 2. Debris (Hot sparks)
        const count = 30 * intensity;
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(
                this.debrisGeo,
                new THREE.MeshBasicMaterial({ color: 0xffaa00 })
            );
            mesh.position.copy(position);
            // Random sphere velocity
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const speed = (Math.random() * 5 + 2) * intensity;

            const velocity = new THREE.Vector3(
                speed * Math.sin(phi) * Math.cos(theta),
                speed * Math.sin(phi) * Math.sin(theta),
                speed * Math.cos(phi)
            );

            mesh.scale.setScalar(0.05 + Math.random() * 0.1);
            this.scene.add(mesh);

            this.particles.push({
                mesh,
                velocity,
                life: 0,
                maxLife: 60 + Math.random() * 20,
                type: 'debris',
                colorStart: new THREE.Color(0xffaa00),
                colorEnd: new THREE.Color(0x333333), // Cooldown to ash
                scaleStart: mesh.scale.x,
                scaleEnd: 0,
                rotationSpeed: Math.random() * 0.5
            });
        }

        // 3. Smoke Puffs
        const smokeCount = 10 * intensity;
        for (let i = 0; i < smokeCount; i++) {
            const sprite = new THREE.Sprite(this.smokeMat.clone());
            sprite.position.copy(position).add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            ));

            const speed = 0.5 * intensity;
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * speed,
                Math.random() * speed + 0.5, // Rise up
                (Math.random() - 0.5) * speed
            );

            sprite.scale.setScalar(0.5 + Math.random());
            this.scene.add(sprite);

            this.particles.push({
                mesh: sprite,
                velocity,
                life: 0,
                maxLife: 100 + Math.random() * 60,
                type: 'smoke',
                colorStart: new THREE.Color(0x888888),
                colorEnd: new THREE.Color(0x222222),
                scaleStart: sprite.scale.x,
                scaleEnd: sprite.scale.x * 3
            });
        }
    }

    createSparkles(position: THREE.Vector3, color: string, count: number = 10) {
        const mat = new THREE.MeshBasicMaterial({ color });
        for(let i=0; i<count; i++) {
            const mesh = new THREE.Mesh(this.debrisGeo, mat);
            mesh.position.copy(position).add(new THREE.Vector3(
                (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2
            ));
            mesh.scale.setScalar(0.02);
            this.scene.add(mesh);

            this.particles.push({
                mesh,
                velocity: new THREE.Vector3(0, -0.2, 0), // Sink/Fall
                life: 0,
                maxLife: 60,
                type: 'sparkle',
                colorStart: new THREE.Color(color),
                colorEnd: new THREE.Color(color),
                scaleStart: 0.02,
                scaleEnd: 0.0,
                rotationSpeed: 0.1
            });
        }
    }

    createBubbles(position: THREE.Vector3, color: string | number, count: number = 5) {
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6 });
        const sphereGeo = new THREE.SphereGeometry(0.05, 8, 8); // Low poly bubbles

        for(let i=0; i<count; i++) {
            const mesh = new THREE.Mesh(sphereGeo, mat.clone());
            // Random offset in circle
            const r = 0.2 * Math.sqrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            mesh.position.set(
                position.x + r * Math.cos(theta),
                position.y + Math.random() * 0.1,
                position.z + r * Math.sin(theta)
            );

            this.scene.add(mesh);

            this.particles.push({
                mesh,
                velocity: new THREE.Vector3(0, 0.5 + Math.random() * 0.5, 0), // Rise up
                life: 0,
                maxLife: 60, // 1 second roughly
                type: 'bubble',
                colorStart: new THREE.Color(color),
                colorEnd: new THREE.Color(0xffffff),
                scaleStart: 0.5 + Math.random() * 0.5, // Relative scale to geometry
                scaleEnd: 0.1, // Pop
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life++;
            const t = p.life / p.maxLife; // 0 to 1

            // Physics
            p.mesh.position.add(p.velocity.clone().multiplyScalar(0.016)); // dt = 16ms approx

            if (p.type === 'debris') {
                p.velocity.y -= 0.15; // Gravity
                p.mesh.rotation.x += p.rotationSpeed || 0;
                p.mesh.rotation.z += p.rotationSpeed || 0;

                // Ground collision
                if (p.mesh.position.y < 0) {
                    p.mesh.position.y = 0;
                    p.velocity.y *= -0.5; // Bounce
                    p.velocity.x *= 0.8; // Friction
                    p.velocity.z *= 0.8;
                }
            } else if (p.type === 'smoke') {
                p.velocity.multiplyScalar(0.98); // Drag
            } else if (p.type === 'bubble') {
                p.velocity.x += (Math.random() - 0.5) * 0.02; // Wobble
                p.velocity.z += (Math.random() - 0.5) * 0.02;
            }

            // Visuals
            // Interpolate Color
            const currentColor = p.colorStart.clone().lerp(p.colorEnd, t);
            if (p.mesh instanceof THREE.Mesh) {
                (p.mesh.material as THREE.MeshBasicMaterial).color.copy(currentColor);
                if ((p.mesh.material as THREE.Material).transparent) {
                     (p.mesh.material as THREE.Material).opacity = 1.0 - t;
                }
            } else if (p.mesh instanceof THREE.Sprite) {
                p.mesh.material.color.copy(currentColor);
                p.mesh.material.opacity = (1.0 - t) * 0.5;
            }

            // Interpolate Scale
            const currentScale = THREE.MathUtils.lerp(p.scaleStart, p.scaleEnd, t);
            p.mesh.scale.setScalar(currentScale);

            // Cleanup
            if (p.life >= p.maxLife) {
                this.scene.remove(p.mesh);
                if (p.mesh instanceof THREE.Mesh) {
                     (p.mesh.geometry as THREE.BufferGeometry).dispose();
                     (p.mesh.material as THREE.Material).dispose();
                }
                this.particles.splice(i, 1);
            }
        }
    }
}
