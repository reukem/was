import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createTable, createBeakerGeometry, createGlassMaterial, createLiquidMaterial, createLabel } from '../utils/threeHelpers';
import { ContainerState } from '../types';
import { CHEMICALS } from '../constants';

// --- GEOMETRY GENERATORS (Local for Scene) ---
const createFlaskGeometry = () => {
    const points = [];
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const x = 0.5 * (1 - t) + 0.15 * t;
        points.push(new THREE.Vector2(x, t * 0.8));
    }
    points.push(new THREE.Vector2(0.15, 1.0));
    points.push(new THREE.Vector2(0.18, 1.05));
    return new THREE.LatheGeometry(points, 24);
};

const createCanisterGeometry = () => {
    const geo = new THREE.CapsuleGeometry(0.3, 0.8, 4, 12);
    geo.translate(0, 0.4, 0);
    return geo;
};

const createMoundGeometry = () => {
    const geo = new THREE.ConeGeometry(0.4, 0.4, 16, 1, true);
    geo.translate(0, 0.2, 0);
    return geo;
};

const createAnalyzerMachine = () => {
    const group = new THREE.Group();

    // Body (Black)
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    // Accent (Yellow) - Shifted up to avoid z-fighting
    const accentGeo = new THREE.BoxGeometry(0.52, 0.1, 0.32);
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 1.0, roughness: 0.2 });
    const topAccent = new THREE.Mesh(accentGeo, accentMat);
    topAccent.position.y = 0.42; // Shifted from 0.41
    group.add(topAccent);

    // Arm
    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
    armGeo.rotateX(Math.PI / 2);
    armGeo.translate(0, 0.3, 0.3);
    const arm = new THREE.Mesh(armGeo, bodyMat);
    group.add(arm);

    // Probe
    const probeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.6);
    probeGeo.translate(0, -0.3, 0.5);
    const probe = new THREE.Mesh(probeGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 1.0 }));
    group.add(probe);

    // Screen - Pulled forward
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 256, 128);
        ctx.font = 'bold 30px monospace';
        ctx.fillStyle = '#22c55e';
        ctx.textAlign = 'center';
        ctx.fillText('ANALYZER', 128, 70);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshBasicMaterial({ map: texture }));
    screen.position.set(0, 0.1, 0.17); // Pulled from 0.16
    group.add(screen);

    return { group, texture, canvas };
};

// --- PARTICLE SYSTEM ---
class ParticleSystem {
    particles: {
        mesh: THREE.Mesh;
        velocity: THREE.Vector3;
        life: number;
        maxLife: number;
        type: 'spark' | 'smoke' | 'bubble';
    }[] = [];
    scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    createExplosion(position: THREE.Vector3, intensity: number = 1.0) {
        // Sparks
        const sparkCount = Math.floor(100 * intensity);
        const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

        for (let i = 0; i < sparkCount; i++) {
            const mesh = new THREE.Mesh(sparkGeo, sparkMat);
            mesh.position.copy(position);
            // Higher velocity spread for intensity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 12 * intensity,
                (Math.random() * 8 + 4) * intensity,
                (Math.random() - 0.5) * 12 * intensity
            );
            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 0, maxLife: 50 + Math.random() * 30, type: 'spark' });
        }

        // Smoke
        const smokeCount = Math.floor(60 * intensity);
        const smokeGeo = new THREE.DodecahedronGeometry(0.3, 0);
        const smokeMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.6,
            roughness: 1.0
        });

        for (let i = 0; i < smokeCount; i++) {
            const mesh = new THREE.Mesh(smokeGeo, smokeMat);
            mesh.position.copy(position);
            mesh.position.y += 0.5; // Start slightly higher
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                (Math.random() * 4 + 1) * intensity,
                (Math.random() - 0.5) * 4
            );
            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 0, maxLife: 120 + Math.random() * 60, type: 'smoke' });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life++;

            p.mesh.position.add(p.velocity.clone().multiplyScalar(0.016));

            if (p.type === 'spark') {
                p.velocity.y -= 0.25; // Strong gravity
                p.mesh.rotation.x += 0.2;
                p.mesh.rotation.z += 0.2;
                p.mesh.scale.multiplyScalar(0.96);
            } else if (p.type === 'smoke') {
                p.velocity.y *= 0.98;
                p.velocity.x *= 0.95;
                p.velocity.z *= 0.95;
                p.mesh.scale.multiplyScalar(1.015);
                const mat = p.mesh.material as THREE.Material;
                if(mat) mat.opacity = 0.6 * (1 - (p.life / p.maxLife));
            }

            if (p.life > p.maxLife || p.mesh.position.y < -2) {
                this.scene.remove(p.mesh);
                (p.mesh.material as THREE.Material).dispose();
                (p.mesh.geometry as THREE.BufferGeometry).dispose();
                this.particles.splice(i, 1);
            }
        }
    }
}

interface LabSceneProps {
    containers: ContainerState[];
    lastEffect: string | null;
    lastEffectPos?: [number, number, number] | null;
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (sourceId: string, targetId: string) => void;
}

const LabScene: React.FC<LabSceneProps> = ({ containers, lastEffect, lastEffectPos, onMove, onPour }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);

    const meshesRef = useRef<Map<string, THREE.Group>>(new Map());
    const liquidsRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const analyzerRef = useRef<{ group: THREE.Group, texture: THREE.CanvasTexture, canvas: HTMLCanvasElement } | null>(null);
    const particleSystemRef = useRef<ParticleSystem | null>(null);

    const raycaster = useRef(new THREE.Raycaster());
    const pointer = useRef(new THREE.Vector2());
    const draggedItem = useRef<{ id: string, offset: THREE.Vector3, originalPos: THREE.Vector3 } | null>(null);
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

    const onMoveRef = useRef(onMove);
    const onPourRef = useRef(onPour);

    // FIX: State variable for scene readiness
    const [isSceneReady, setIsSceneReady] = useState(false);

    useEffect(() => {
        onMoveRef.current = onMove;
        onPourRef.current = onPour;
    }, [onMove, onPour]);

    // Handle Effects (Explosion Shake & Particles)
    useEffect(() => {
        if (!sceneRef.current || !lastEffect) return;

        const position = lastEffectPos ? new THREE.Vector3(...lastEffectPos) : new THREE.Vector3(0, 1, 0);

        if (lastEffect === 'explosion') {
            particleSystemRef.current?.createExplosion(position, 1.5);

            const flashLight = new THREE.PointLight(0xffaa00, 10, 20);
            flashLight.position.copy(position).add(new THREE.Vector3(0, 1, 0));
            sceneRef.current.add(flashLight);

            let intensity = 10;
            const fadeFlash = () => {
                intensity *= 0.8;
                flashLight.intensity = intensity;
                if (intensity > 0.1) requestAnimationFrame(fadeFlash);
                else sceneRef.current?.remove(flashLight);
            };
            fadeFlash();
        }

        if ((lastEffect === 'explosion' || lastEffect === 'foam') && cameraRef.current) {
            const originalPos = cameraRef.current.position.clone();
            let count = 0;
            const shake = () => {
                if (count < 40 && cameraRef.current) {
                    const magnitude = (40 - count) / 60;
                    cameraRef.current.position.x = originalPos.x + (Math.random() - 0.5) * magnitude;
                    cameraRef.current.position.y = originalPos.y + (Math.random() - 0.5) * magnitude;
                    count++;
                    requestAnimationFrame(shake);
                } else if (cameraRef.current) {
                    cameraRef.current.position.copy(originalPos);
                }
            };
            shake();
        }
    }, [lastEffect, lastEffectPos]);

    const updateAnalyzerDisplay = (chemId: string | null, temp?: number) => {
        if (!analyzerRef.current) return;
        const ctx = analyzerRef.current.canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 256, 128);
        ctx.textAlign = 'center';

        if (chemId) {
            const chem = CHEMICALS[chemId];
            ctx.fillStyle = chem.color === '#ffffff' ? '#e2e8f0' : chem.color;
            ctx.font = 'bold 24px monospace';
            ctx.fillText(chem.name.substring(0, 18).toUpperCase(), 128, 40);
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 36px monospace';
            ctx.fillText(`pH: ${chem.ph}`, 128, 80);
            ctx.font = '24px monospace';
            ctx.fillText(`${temp || 25}°C`, 128, 110);
        } else {
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 32px monospace';
            ctx.fillText('STANDBY', 128, 70);
        }
        analyzerRef.current.texture.needsUpdate = true;
    };

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050b14);
        sceneRef.current = scene;

        const pmremGenerator = new THREE.PMREMGenerator(new THREE.WebGLRenderer());
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        pmremGenerator.dispose();

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 8, 12);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const spotLight = new THREE.SpotLight(0xffffff, 200);
        spotLight.position.set(5, 10, 5);
        spotLight.castShadow = true;
        scene.add(spotLight);
        const rectLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
        rectLight.position.set(-5, 5, -5);
        scene.add(rectLight);

        scene.add(createTable());

        const shelf = new THREE.Mesh(
            new THREE.BoxGeometry(10, 0.1, 2.5),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.1 })
        );
        shelf.position.set(0, 0.5, -3.5);
        shelf.receiveShadow = true;
        scene.add(shelf);

        // Analyzer Machine
        const analyzer = createAnalyzerMachine();
        analyzer.group.position.set(4, 0, 1.5);
        analyzer.group.userData.id = 'ANALYZER_MACHINE';
        scene.add(analyzer.group);
        analyzerRef.current = analyzer;
        meshesRef.current.set('ANALYZER_MACHINE', analyzer.group);

        particleSystemRef.current = new ParticleSystem(scene);

        const onPointerMove = (event: PointerEvent) => {
            pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

            if (draggedItem.current && cameraRef.current) {
                raycaster.current.setFromCamera(pointer.current, cameraRef.current);
                const target = new THREE.Vector3();
                raycaster.current.ray.intersectPlane(plane.current, target);

                if (target) {
                    const group = meshesRef.current.get(draggedItem.current.id);
                    if (group) {
                        group.position.copy(target.add(draggedItem.current.offset));
                        // FIX: Lift height increased to 2.5
                        group.position.y = Math.max(0.2, THREE.MathUtils.lerp(group.position.y, 2.5, 0.2));
                    }
                }
            }
        };

        const onPointerDown = () => {
            if (!cameraRef.current) return;
            raycaster.current.setFromCamera(pointer.current, cameraRef.current);
            const objects = Array.from(meshesRef.current.values());
            const intersects = raycaster.current.intersectObjects(objects, true);

            if (intersects.length > 0) {
                let target = intersects[0].object;
                while(target.parent && !target.userData.id) target = target.parent;

                if (target && target.userData.id) {
                    controls.enabled = false;
                    const id = target.userData.id;
                    const offset = target.position.clone().sub(intersects[0].point);
                    offset.y = 0;
                    draggedItem.current = { id, offset, originalPos: target.position.clone() };
                }
            }
        };

        const onPointerUp = () => {
            if (draggedItem.current) {
                const id = draggedItem.current.id;
                const group = meshesRef.current.get(id);
                if (group) {
                    const myPos = group.position.clone();
                    let poured = false;

                    meshesRef.current.forEach((otherGroup, otherId) => {
                        if (id !== otherId && !poured && otherId !== 'ANALYZER_MACHINE') {
                            const dist = myPos.distanceTo(otherGroup.position);
                            if (dist < 1.4) {
                                onPourRef.current(id, otherId);
                                poured = true;
                            }
                        }
                    });

                    const containerData = containers.find(c => c.id === id);
                    if (containerData?.initialPosition) {
                        // Return to shelf
                        const targetPos = new THREE.Vector3(...containerData.initialPosition);
                        const animateReturn = () => {
                             if (!group) return;
                             group.position.lerp(targetPos, 0.1);
                             if (group.position.distanceTo(targetPos) > 0.05) {
                                 requestAnimationFrame(animateReturn);
                             } else {
                                 group.position.copy(targetPos);
                                 onMoveRef.current(id, [targetPos.x, targetPos.y, targetPos.z]);
                             }
                        };
                        animateReturn();
                    } else {
                        // Drop to table (FIX: y=0.11)
                        const targetY = 0.11;
                        const animateDrop = () => {
                            if (!group) return;
                            if (group.position.y > targetY + 0.01) {
                                group.position.y = THREE.MathUtils.lerp(group.position.y, targetY, 0.2);
                                requestAnimationFrame(animateDrop);
                            } else {
                                group.position.y = targetY;
                                onMoveRef.current(id, [group.position.x, targetY, group.position.z]);
                            }
                        };
                        animateDrop();
                    }
                }
                draggedItem.current = null;
                controls.enabled = true;
            }
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp);

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            particleSystemRef.current?.update();

            if (analyzerRef.current) {
                let foundChem = null;
                let foundTemp = 25;
                const analyzerPos = analyzerRef.current.group.position;
                containers.forEach(c => {
                    const cPos = new THREE.Vector3(...c.position);
                    // FIX: Detection radius increased to 2.0
                    if (analyzerPos.distanceTo(cPos) < 2.0 && c.contents) {
                        foundChem = c.contents.chemicalId;
                        foundTemp = c.contents.temperature || 25;
                    }
                });
                updateAnalyzerDisplay(foundChem, foundTemp);
            }

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!cameraRef.current || !rendererRef.current) return;
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        setIsSceneReady(true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerUp);
            mountRef.current?.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);

    useEffect(() => {
        if (!sceneRef.current || !isSceneReady) return;

        // Cleanup
        meshesRef.current.forEach((group, id) => {
            if (id !== 'ANALYZER_MACHINE' && !containers.find(c => c.id === id)) {
                sceneRef.current?.remove(group);
                meshesRef.current.delete(id);
                liquidsRef.current.delete(id);
            }
        });

        containers.forEach(container => {
            let group = meshesRef.current.get(container.id);
            let liquidMesh = liquidsRef.current.get(container.id);

            if (!group) {
                group = new THREE.Group();
                group.userData.id = container.id;

                if (!container.id.startsWith('source_')) {
                    // Beaker
                    const beaker = new THREE.Mesh(createBeakerGeometry(0.5, 1.2), createGlassMaterial());
                    beaker.castShadow = true;
                    beaker.receiveShadow = true;
                    beaker.renderOrder = 2;
                    group.add(beaker);

                    const liquidGeo = new THREE.CylinderGeometry(0.46, 0.46, 1, 32);
                    liquidGeo.translate(0, 0.5, 0);
                    liquidMesh = new THREE.Mesh(liquidGeo, createLiquidMaterial(0xffffff));
                    liquidMesh.scale.set(1, 0.01, 1);
                    liquidMesh.renderOrder = 1;
                    group.add(liquidMesh);
                    liquidsRef.current.set(container.id, liquidMesh);
                } else {
                    // Source Item
                    const chem = CHEMICALS[container.contents?.chemicalId || 'H2O'];
                    const color = chem.color;
                    let mesh;

                    if (chem.meshStyle === 'flask') {
                         const flask = new THREE.Mesh(createFlaskGeometry(), createGlassMaterial());
                         flask.renderOrder = 2;
                         const innerLiquid = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 24), new THREE.MeshStandardMaterial({color}));
                         innerLiquid.position.y = 0.4;
                         flask.add(innerLiquid);
                         mesh = flask;
                    } else if (chem.meshStyle === 'rock') {
                        mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.4, flatShading: true }));
                    } else if (chem.meshStyle === 'crystal') {
                        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshPhysicalMaterial({ color, transmission: 0.4, roughness: 0.1, metalness: 0.1, flatShading: true }));
                    } else if (chem.meshStyle === 'mound') {
                        mesh = new THREE.Mesh(createMoundGeometry(), new THREE.MeshStandardMaterial({ color, roughness: 1.0 }));
                    } else if (chem.meshStyle === 'canister') {
                        mesh = new THREE.Mesh(createCanisterGeometry(), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 }));
                        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.1, 32), new THREE.MeshBasicMaterial({ color }));
                        band.position.y = 0.5;
                        mesh.add(band);
                    } else {
                        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4), new THREE.MeshStandardMaterial({color}));
                    }
                    mesh.castShadow = true;
                    group.add(mesh);
                }

                if (container.contents) {
                    const label = createLabel(CHEMICALS[container.contents.chemicalId].name);
                    label.position.y = 1.6;
                    group.add(label);
                }

                sceneRef.current?.add(group);
                meshesRef.current.set(container.id, group);
                group.position.set(...container.position);
            }

            if (draggedItem.current?.id !== container.id) {
                group.position.lerp(new THREE.Vector3(...container.position), 0.2);
            }

            // Update Liquid Visuals
            if (liquidMesh) {
                if (container.contents) {
                    liquidMesh.visible = true;
                    const targetScaleY = Math.max(0.01, container.contents.volume * 1.15);
                    liquidMesh.scale.y = THREE.MathUtils.lerp(liquidMesh.scale.y, targetScaleY, 0.1);

                    const mat = liquidMesh.material as THREE.MeshPhysicalMaterial;
                    const baseColor = new THREE.Color(container.contents.color);
                    const temp = container.contents.temperature || 25;

                    if (temp > 100) {
                        const heatFactor = Math.min((temp - 100) / 500, 1);
                        const glowColor = new THREE.Color(baseColor).lerp(new THREE.Color(0xff4400), heatFactor);
                        mat.color.copy(glowColor);
                        if ('attenuationColor' in mat) {
                             // @ts-ignore
                             mat.attenuationColor.copy(glowColor);
                        }
                        mat.emissive.copy(new THREE.Color(0xff2200));
                        mat.emissiveIntensity = heatFactor;
                    } else {
                        mat.color.copy(baseColor);
                        if ('attenuationColor' in mat) {
                             // @ts-ignore
                             mat.attenuationColor.copy(baseColor);
                        }
                        mat.emissive.setHex(0x000000);
                        mat.emissiveIntensity = 0;
                    }
                } else {
                    // FIX: Phantom Liquid - Hide if empty
                    liquidMesh.scale.y = THREE.MathUtils.lerp(liquidMesh.scale.y, 0, 0.2);
                    if (liquidMesh.scale.y < 0.01) liquidMesh.visible = false;
                }
            }
        });
    }, [containers, isSceneReady]);

    return <div ref={mountRef} className="w-full h-full relative" />;
};

export default LabScene;
