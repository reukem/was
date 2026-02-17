import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createTable, createBeakerGeometry, createRoughChunkGeometry, createMoundGeometry, createGlassMaterial, createLiquidMaterial, createMetalMaterial, createLabel, createHeaterMesh } from '../utils/threeHelpers';
import { EffectSystem } from '../utils/EffectSystem';
import { audioManager } from '../utils/AudioManager';
import { ContainerState } from '../types';
import { CHEMICALS, HEATER_POSITION } from '../constants';

const createTestTubeGeometry = () => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    // Round bottom
    for (let i = 0; i <= 5; i++) {
        const angle = (i / 5) * (Math.PI / 2);
        points.push(new THREE.Vector2(Math.sin(angle) * 0.15, -Math.cos(angle) * 0.15 + 0.15));
    }
    points.push(new THREE.Vector2(0.15, 1.2));
    points.push(new THREE.Vector2(0.18, 1.2)); // Lip
    return new THREE.LatheGeometry(points, 16);
};

const createBottleGeometry = () => {
    // Simple reagent bottle
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.4, 0));
    points.push(new THREE.Vector2(0.4, 0.6));
    points.push(new THREE.Vector2(0.15, 0.7));
    points.push(new THREE.Vector2(0.15, 0.9));
    points.push(new THREE.Vector2(0.18, 0.92));
    return new THREE.LatheGeometry(points, 24);
};

const createJarGeometry = () => {
    // Wide mouth jar
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.35, 0));
    points.push(new THREE.Vector2(0.35, 0.5));
    points.push(new THREE.Vector2(0.3, 0.5));
    points.push(new THREE.Vector2(0.3, 0.55));
    return new THREE.LatheGeometry(points, 24);
};

const createAnalyzerMachine = () => {
    const group = new THREE.Group();
    // Body (Black)
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    // Accent (Yellow)
    const accentGeo = new THREE.BoxGeometry(0.52, 0.1, 0.32);
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 1.0, roughness: 0.2 });
    const topAccent = new THREE.Mesh(accentGeo, accentMat);
    topAccent.position.y = 0.42;
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
    // Add collision volume to probe for better detection
    const collider = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    collider.position.set(0, -0.3, 0.5);
    collider.userData.type = 'PROBE_SENSOR';
    group.add(collider);
    group.add(probe);

    // Screen
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
    screen.position.set(0, 0.1, 0.17);
    group.add(screen);

    return { group, texture, canvas };
};

interface LabSceneProps {
    containers: ContainerState[];
    lastEffect: string | null;
    lastEffectPos?: [number, number, number] | null;
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (sourceId: string, targetId: string) => void;
    isHeaterOn?: boolean;
    onToggleHeater?: () => void;
}

const LabScene: React.FC<LabSceneProps> = ({ containers, lastEffect, lastEffectPos, onMove, onPour, isHeaterOn, onToggleHeater }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);

    const meshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
    const liquidsRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const analyzerRef = useRef<{ group: THREE.Group, texture: THREE.CanvasTexture, canvas: HTMLCanvasElement } | null>(null);
    const heaterRef = useRef<{ mesh: THREE.Object3D, light: THREE.PointLight } | null>(null);
    const effectSystemRef = useRef<EffectSystem | null>(null);
    const shakeIntensity = useRef(0);

    const raycaster = useRef(new THREE.Raycaster());
    const pointer = useRef(new THREE.Vector2());
    const draggedItem = useRef<{ id: string, offset: THREE.Vector3, originalPos: THREE.Vector3, isPouring?: boolean } | null>(null);
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

    const isRightClickDown = useRef(false);
    const pourInterval = useRef<number | null>(null);
    const containersRef = useRef(containers);

    const onMoveRef = useRef(onMove);
    const onPourRef = useRef(onPour);

    const [isSceneReady, setIsSceneReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        onMoveRef.current = onMove;
        onPourRef.current = onPour;
        containersRef.current = containers;
    }, [onMove, onPour, containers]);

    // Handle Effects
    useEffect(() => {
        if (!sceneRef.current || !lastEffect) return;
        const position = lastEffectPos ? new THREE.Vector3(...lastEffectPos) : new THREE.Vector3(0, 1, 0);

        if (lastEffect === 'explosion') {
            effectSystemRef.current?.createExplosion(position, 1.5);
            shakeIntensity.current = 1.0;

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
        } else if (lastEffect === 'sparkles') {
            effectSystemRef.current?.createSparkles(position, '#ffd700', 20);
        }
    }, [lastEffect, lastEffectPos]);

    // Handle Heater Visuals
    useEffect(() => {
        if (!heaterRef.current) return;
        const { mesh, light } = heaterRef.current;

        light.intensity = isHeaterOn ? 2.0 : 0;

        mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                 const m = child.material as THREE.MeshStandardMaterial;
                 if ('emissive' in m) {
                     if (isHeaterOn) {
                         m.emissive.setHex(0xff2200);
                         m.emissiveIntensity = 2.0;
                     } else {
                         m.emissive.setHex(0x000000);
                         m.emissiveIntensity = 0;
                     }
                 }
            }
        });
    }, [isHeaterOn]);

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
            ctx.fillText('SCANNING...', 128, 40);
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 36px monospace';
            ctx.fillText(`pH: ${chem.ph}`, 128, 80);
            ctx.font = '24px monospace';
            ctx.fillText(`${temp || 25}°C`, 128, 110);
        } else {
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 32px monospace';
            ctx.fillText('READY', 128, 70);
        }
        analyzerRef.current.texture.needsUpdate = true;
    };

    useEffect(() => {
        if (!mountRef.current) return;

        try {
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x050b14);
            sceneRef.current = scene;

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

            // FIX: Ensure renderer is ready before using PMREM for Environment Map
            try {
                const pmremGenerator = new THREE.PMREMGenerator(renderer);
                const envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
                scene.environment = envMap;
                scene.background = envMap; // Avoid black void
                pmremGenerator.dispose();
            } catch (e) {
                console.error("Failed to generate PMREM:", e);
                scene.background = new THREE.Color(0x111827);
            }

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

            // Heater
            const heater = createHeaterMesh();
            heater.position.set(...HEATER_POSITION);
            heater.userData.id = 'HEATER';
            scene.add(heater);
            meshesRef.current.set('HEATER', heater);

            const heaterLight = new THREE.PointLight(0xff4400, 0, 5);
            heaterLight.position.set(HEATER_POSITION[0], HEATER_POSITION[1] + 0.5, HEATER_POSITION[2]);
            scene.add(heaterLight);
            heaterRef.current = { mesh: heater, light: heaterLight };

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

            effectSystemRef.current = new EffectSystem(scene);

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
                            group.position.y = Math.max(0.2, THREE.MathUtils.lerp(group.position.y, 2.5, 0.2));

                            if (isRightClickDown.current && draggedItem.current.isPouring) {
                                 meshesRef.current.forEach((otherGroup, otherId) => {
                                    if (draggedItem.current?.id !== otherId && otherId !== 'ANALYZER_MACHINE') {
                                        if (group.position.distanceTo(otherGroup.position) < 1.4) {
                                            group.rotation.z = -Math.PI / 4;
                                            group.position.y += 0.5;
                                        }
                                    }
                                });
                            } else {
                                group.rotation.set(0, 0, 0);
                            }
                        }
                    }
                }
            };

            const onPointerDown = (event: PointerEvent) => {
                if (!cameraRef.current) return;

                if (event.button === 2) {
                    isRightClickDown.current = true;
                    if (draggedItem.current) {
                        draggedItem.current.isPouring = true;
                        if (!pourInterval.current) {
                            pourInterval.current = window.setInterval(() => {
                                if (draggedItem.current && isRightClickDown.current) {
                                    const id = draggedItem.current.id;
                                    const group = meshesRef.current.get(id);
                                    if (group) {
                                        meshesRef.current.forEach((otherGroup, otherId) => {
                                            if (id !== otherId && otherId !== 'ANALYZER_MACHINE') {
                                                const dist = group.position.distanceTo(otherGroup.position);
                                                if (dist < 1.4) {
                                                    onPourRef.current(id, otherId);
                                                    audioManager.playPour(0.1);
                                                }
                                            }
                                        });
                                    }
                                }
                            }, 200);
                        }
                    }
                    return;
                }

                raycaster.current.setFromCamera(pointer.current, cameraRef.current);
                const objects = Array.from(meshesRef.current.values());
                const intersects = raycaster.current.intersectObjects(objects, true);

                if (intersects.length > 0) {
                    let target = intersects[0].object;
                    while(target.parent && !target.userData.id) target = target.parent;

                    if (target && target.userData.id) {
                        if (event.button === 0) {
                            if (target.userData.id === 'HEATER') {
                                onToggleHeater?.();
                                return;
                            }
                            controls.enabled = false;
                            const id = target.userData.id;
                            const offset = target.position.clone().sub(intersects[0].point);
                            offset.y = 0;
                            draggedItem.current = { id, offset, originalPos: target.position.clone() };
                            audioManager.playGlassClink();
                        }
                    }
                }
            };

            const onPointerUp = (event: PointerEvent) => {
                 if (event.button === 2) {
                    isRightClickDown.current = false;
                    if (draggedItem.current) draggedItem.current.isPouring = false;
                    if (pourInterval.current) {
                        clearInterval(pourInterval.current);
                        pourInterval.current = null;
                    }
                    if (draggedItem.current) {
                        const group = meshesRef.current.get(draggedItem.current.id);
                        if (group) group.rotation.set(0, 0, 0);
                    }
                    return;
                }

                if (draggedItem.current && event.button === 0) {
                    const id = draggedItem.current.id;
                    const group = meshesRef.current.get(id);
                    if (group) {
                        const containerData = containers.find(c => c.id === id);
                        if (containerData?.initialPosition) {
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
                            const targetY = 0.11;
                            const animateDrop = () => {
                                if (!group) return;
                                if (group.position.y > targetY + 0.01) {
                                    group.position.y = THREE.MathUtils.lerp(group.position.y, targetY, 0.2);
                                    requestAnimationFrame(animateDrop);
                                } else {
                                    group.position.y = targetY;
                                    onMoveRef.current(id, [group.position.x, targetY, group.position.z]);
                                    audioManager.playGlassClink();
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
            const onContextMenu = (e: Event) => e.preventDefault();
            window.addEventListener('contextmenu', onContextMenu);

            const animate = () => {
                requestAnimationFrame(animate);
                controls.update();
                effectSystemRef.current?.update();

                if (shakeIntensity.current > 0) {
                    const shake = shakeIntensity.current;
                    camera.position.x += (Math.random() - 0.5) * shake * 0.5;
                    camera.position.y += (Math.random() - 0.5) * shake * 0.5;
                    camera.position.z += (Math.random() - 0.5) * shake * 0.5;
                    shakeIntensity.current *= 0.9;
                    if (shakeIntensity.current < 0.01) shakeIntensity.current = 0;
                }

                // Boiling Bubbles
                containersRef.current.forEach(c => {
                    if (c.contents && c.contents.temperature && c.contents.temperature > 100) {
                         if (Math.random() < 0.2) {
                             const pos = new THREE.Vector3(...c.position);
                             pos.y += 0.5;
                             effectSystemRef.current?.createBubbles(pos, c.contents.color, 1);
                         }
                    }
                });

                if (analyzerRef.current) {
                    let foundChem = null;
                    let foundTemp = 25;
                    const analyzerGroup = analyzerRef.current.group;
                    const probeTipWorld = new THREE.Vector3(0, -0.6, 0.5);
                    probeTipWorld.applyMatrix4(analyzerGroup.matrixWorld);

                    containersRef.current.forEach(c => {
                        const cPos = new THREE.Vector3(...c.position);
                        if (probeTipWorld.distanceTo(cPos) < 0.8 && c.contents) {
                            foundChem = c.contents.chemicalId;
                            foundTemp = c.contents.temperature || 25;
                        }
                    });

                    if (foundChem && analyzerRef.current.userData?.lastState !== 'SCANNING') {
                        audioManager.playScan();
                        analyzerRef.current.userData = { lastState: 'SCANNING' };
                    } else if (!foundChem) {
                        analyzerRef.current.userData = { lastState: 'IDLE' };
                    }

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

            // Cleanup function closure
            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerdown', onPointerDown);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('contextmenu', onContextMenu);
                if (mountRef.current && renderer.domElement) {
                    mountRef.current.removeChild(renderer.domElement);
                }
                renderer.dispose();
            };

        } catch (err) {
            console.error("Three.js Init Error:", err);
            setError("Failed to initialize 3D Engine. Your browser might not support WebGL.");
        }
    }, []);

    useEffect(() => {
        if (!sceneRef.current || !isSceneReady) return;

        // Cleanup removed containers
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
                let mesh;

                // Determine Geometry based on Container Type
                if (container.type === 'beaker') {
                    mesh = new THREE.Mesh(createBeakerGeometry(0.5, 1.2), createGlassMaterial());
                    mesh.renderOrder = 2;
                    group.add(mesh);

                    const liquidGeo = new THREE.CylinderGeometry(0.46, 0.46, 1, 32);
                    liquidGeo.translate(0, 0.5, 0);
                    liquidMesh = new THREE.Mesh(liquidGeo, createLiquidMaterial(0xffffff));
                    liquidMesh.scale.set(1, 0.01, 1);
                    liquidMesh.renderOrder = 1;
                    group.add(liquidMesh);
                    liquidsRef.current.set(container.id, liquidMesh);

                } else if (container.type === 'test_tube') {
                    mesh = new THREE.Mesh(createTestTubeGeometry(), createGlassMaterial());
                    mesh.renderOrder = 2;
                    group.add(mesh);

                    const liquidGeo = new THREE.CylinderGeometry(0.13, 0.13, 1.1, 16);
                    liquidGeo.translate(0, 0.5, 0);
                    liquidMesh = new THREE.Mesh(liquidGeo, createLiquidMaterial(0xffffff));
                    liquidMesh.scale.set(1, 0.01, 1);
                    liquidMesh.renderOrder = 1;
                    group.add(liquidMesh);
                    liquidsRef.current.set(container.id, liquidMesh);

                } else if (container.type === 'bottle') {
                    mesh = new THREE.Mesh(createBottleGeometry(), createGlassMaterial());
                    group.add(mesh);
                    // Inner liquid (static for source bottles for now, or use liquidMesh)
                    // Let's use liquidMesh but keep it simple
                    const liquidGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.5, 24);
                    liquidGeo.translate(0, 0.3, 0);
                    const contents = container.contents ? CHEMICALS[container.contents.chemicalId] : null;
                    const color = contents ? contents.color : 0xffffff;
                    liquidMesh = new THREE.Mesh(liquidGeo, new THREE.MeshStandardMaterial({ color: color }));
                    group.add(liquidMesh);

                } else if (container.type === 'jar') {
                    mesh = new THREE.Mesh(createJarGeometry(), createGlassMaterial());
                    group.add(mesh);
                    // Powder mound inside
                    if (container.contents) {
                        const mound = new THREE.Mesh(createMoundGeometry(), new THREE.MeshStandardMaterial({ color: container.contents.color, roughness: 1.0 }));
                        mound.scale.set(0.8, 0.8, 0.8);
                        group.add(mound);
                    }

                } else if (container.type === 'rock') {
                    // Raw element chunk
                    const chem = container.contents ? CHEMICALS[container.contents.chemicalId] : null;
                    const color = chem ? chem.color : 0x888888;
                    // Determine if metal based on simple heuristic or ID
                    const isMetal = ['SODIUM', 'POTASSIUM', 'IRON', 'MAGNESIUM', 'ZINC', 'COPPER', 'ALUMINUM', 'GOLD'].includes(chem?.id || '');

                    const geo = createRoughChunkGeometry(0.25);
                    const mat = isMetal
                        ? createMetalMaterial(color, 0.3)
                        : new THREE.MeshStandardMaterial({ color, roughness: 0.9 });

                    mesh = new THREE.Mesh(geo, mat);
                    mesh.castShadow = true;
                    group.add(mesh);
                }

                if (mesh) {
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                }

                // Label
                if (container.contents && container.type !== 'rock') {
                    const label = createLabel(CHEMICALS[container.contents.chemicalId].name);
                    label.position.y = container.type === 'test_tube' ? 1.4 : 1.6;
                    group.add(label);
                } else if (container.type === 'rock' && container.contents) {
                    const label = createLabel(CHEMICALS[container.contents.chemicalId].name);
                    label.position.y = 0.6;
                    label.scale.set(0.6, 0.15, 1);
                    group.add(label);
                }

                sceneRef.current?.add(group);
                meshesRef.current.set(container.id, group);
                group.position.set(...container.position);
            }

            if (draggedItem.current?.id !== container.id) {
                group.position.lerp(new THREE.Vector3(...container.position), 0.2);
            }

            // Update Liquid Visuals for Vessels
            if (liquidMesh && (container.type === 'beaker' || container.type === 'test_tube')) {
                if (container.contents) {
                    liquidMesh.visible = true;
                    const targetScaleY = Math.max(0.01, container.contents.volume * (container.type === 'test_tube' ? 1.0 : 1.15));
                    liquidMesh.scale.y = THREE.MathUtils.lerp(liquidMesh.scale.y, targetScaleY, 0.1);

                    const mat = liquidMesh.material as THREE.MeshPhysicalMaterial;
                    const baseColor = new THREE.Color(container.contents.color);
                    const temp = container.contents.temperature || 25;

                    if (temp > 100) {
                        const heatFactor = Math.min((temp - 100) / 500, 1);
                        const glowColor = new THREE.Color(baseColor).lerp(new THREE.Color(0xff4400), heatFactor);
                        mat.color.copy(glowColor);
                        if ('attenuationColor' in mat) { // @ts-ignore
                             mat.attenuationColor.copy(glowColor); }
                        mat.emissive.copy(new THREE.Color(0xff2200));
                        mat.emissiveIntensity = heatFactor;
                    } else {
                        mat.color.copy(baseColor);
                        if ('attenuationColor' in mat) { // @ts-ignore
                             mat.attenuationColor.copy(baseColor); }
                        mat.emissive.setHex(0x000000);
                        mat.emissiveIntensity = 0;
                    }
                } else {
                    liquidMesh.scale.y = THREE.MathUtils.lerp(liquidMesh.scale.y, 0, 0.2);
                    if (liquidMesh.scale.y < 0.01) liquidMesh.visible = false;
                }
            }
        });
    }, [containers, isSceneReady]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-950 text-red-500 font-mono p-8 text-center border border-red-900">
                <div>
                    <h2 className="text-xl font-bold mb-2">CRITICAL SYSTEM FAILURE</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return <div ref={mountRef} className="w-full h-full relative" />;
};

export default LabScene;
