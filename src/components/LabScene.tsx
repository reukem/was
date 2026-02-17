import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, Vignette, Noise } from '@react-three/postprocessing';
import { createTable, createBeakerGeometry, createBuretteGeometry, createStandGeometry, createRoughChunkGeometry, createMoundGeometry, createGlassMaterial, createLiquidMaterial, createMetalMaterial, createLabel, createHeaterMesh } from '../utils/threeHelpers';
import { EffectSystem } from '../utils/EffectSystem';
import { audioManager } from '../utils/AudioManager';
import { ContainerState } from '../types';
import { CHEMICALS, HEATER_POSITION } from '../constants';

// --- GEOMETRY FACTORIES (Local to avoid circular deps if moved) ---
// Kept locally as they were in the previous file or imported.
// We will rely on imports from threeHelpers for consistency.

const createTestTubeGeometry = () => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    for (let i = 0; i <= 5; i++) {
        const angle = (i / 5) * (Math.PI / 2);
        points.push(new THREE.Vector2(Math.sin(angle) * 0.15, -Math.cos(angle) * 0.15 + 0.15));
    }
    points.push(new THREE.Vector2(0.15, 1.2));
    points.push(new THREE.Vector2(0.18, 1.2));
    return new THREE.LatheGeometry(points, 32); // Higher detail
};

const createBottleGeometry = () => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.4, 0));
    points.push(new THREE.Vector2(0.4, 0.6));
    points.push(new THREE.Vector2(0.15, 0.7));
    points.push(new THREE.Vector2(0.15, 0.9));
    points.push(new THREE.Vector2(0.18, 0.92));
    return new THREE.LatheGeometry(points, 32);
};

const createJarGeometry = () => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.35, 0));
    points.push(new THREE.Vector2(0.35, 0.5));
    points.push(new THREE.Vector2(0.3, 0.5));
    points.push(new THREE.Vector2(0.3, 0.55));
    return new THREE.LatheGeometry(points, 32);
};

const createAnalyzerMachine = () => {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    const accentGeo = new THREE.BoxGeometry(0.52, 0.1, 0.32);
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 1.0, roughness: 0.2 });
    const topAccent = new THREE.Mesh(accentGeo, accentMat);
    topAccent.position.y = 0.42;
    group.add(topAccent);

    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
    armGeo.rotateX(Math.PI / 2);
    armGeo.translate(0, 0.3, 0.3);
    const arm = new THREE.Mesh(armGeo, bodyMat);
    group.add(arm);

    const probeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.6);
    probeGeo.translate(0, -0.3, 0.5);
    const probe = new THREE.Mesh(probeGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 1.0 }));
    const collider = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    collider.position.set(0, -0.3, 0.5);
    collider.userData.type = 'PROBE_SENSOR';
    group.add(collider);
    group.add(probe);

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
    explodedContainerId?: string | null;
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (sourceId: string, targetId: string) => void;
    onToggleValve?: (id: string) => void;
    isHeaterOn?: boolean;
    onToggleHeater?: () => void;
}

// Internal component managing the Three.js Logic
const LabLogic: React.FC<LabSceneProps> = ({ containers, lastEffect, lastEffectPos, explodedContainerId, onMove, onPour, onToggleValve, isHeaterOn, onToggleHeater }) => {
    const { scene, camera, gl, pointer, raycaster } = useThree();

    // Refs for imperative management
    const meshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
    const liquidsRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const audioNodesRef = useRef<Map<string, { boiling: THREE.PositionalAudio | null, reaction: THREE.PositionalAudio | null }>>(new Map());
    const analyzerRef = useRef<{ group: THREE.Group, texture: THREE.CanvasTexture, canvas: HTMLCanvasElement } | null>(null);
    const heaterRef = useRef<{ mesh: THREE.Object3D, light: THREE.PointLight } | null>(null);
    const effectSystemRef = useRef<EffectSystem | null>(null);
    const shakeIntensity = useRef(0);

    const draggedItem = useRef<{ id: string, offset: THREE.Vector3, originalPos: THREE.Vector3, isPouring?: boolean } | null>(null);
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const isRightClickDown = useRef(false);
    const pourStreamRef = useRef<THREE.Mesh | null>(null);
    const containersRef = useRef(containers);

    // Callbacks ref
    const onMoveRef = useRef(onMove);
    const onPourRef = useRef(onPour);

    // Sync Props
    useEffect(() => {
        onMoveRef.current = onMove;
        onPourRef.current = onPour;
        containersRef.current = containers;
    }, [onMove, onPour, containers]);

    // Init Scene Objects (Once)
    useEffect(() => {
        // Audio
        const listener = new THREE.AudioListener();
        camera.add(listener);
        audioManager.setListener(listener);

        // Lab Table
        const table = createTable();
        scene.add(table);

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

        // Shelf
        const shelf = new THREE.Mesh(
            new THREE.BoxGeometry(10, 0.1, 2.5),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.1 })
        );
        shelf.position.set(0, 0.5, -3.5);
        shelf.receiveShadow = true;
        scene.add(shelf);

        // Analyzer
        const analyzer = createAnalyzerMachine();
        analyzer.group.position.set(4, 0, 1.5);
        analyzer.group.userData.id = 'ANALYZER_MACHINE';
        scene.add(analyzer.group);
        analyzerRef.current = analyzer;
        meshesRef.current.set('ANALYZER_MACHINE', analyzer.group);

        // Pour Stream VFX
        const streamGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 8);
        streamGeo.rotateX(-Math.PI / 2);
        streamGeo.translate(0, 0, 0.5);
        const streamMat = new THREE.MeshPhysicalMaterial({
            color: 0x33aaff,
            transparent: true,
            opacity: 0.6,
            transmission: 0.8,
            roughness: 0.1,
            emissive: 0x33aaff,
            emissiveIntensity: 0.5
        });
        const streamMesh = new THREE.Mesh(streamGeo, streamMat);
        streamMesh.visible = false;
        scene.add(streamMesh);
        pourStreamRef.current = streamMesh;

        effectSystemRef.current = new EffectSystem(scene);

        // Cleanup
        return () => {
            camera.remove(listener);
            scene.remove(table);
            if (heaterRef.current) { scene.remove(heaterRef.current.mesh); scene.remove(heaterRef.current.light); }
            scene.remove(shelf);
            if (analyzerRef.current) scene.remove(analyzerRef.current.group);
            scene.remove(streamMesh);
        };
    }, [scene, camera]);

    // Input Handling (Pointer)
    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
             // R3F handles pointer coords in state, but we are attaching global listener for now to gl canvas
             // Actually, we can use the raycaster from useFrame or here?
             // Let's rely on standard logic but use the event to get coords if not using R3F events
             // Better: Use `raycaster` from useThree() which is updated by R3F!

             if (event.button === 2) {
                 isRightClickDown.current = true;
                 if (draggedItem.current) draggedItem.current.isPouring = true;
                 return;
             }

             // Raycaster is updated by R3F every frame based on pointer
             // So we just check intersections
             const intersects = raycaster.intersectObjects(scene.children, true);

             if (intersects.length > 0) {
                 let target = intersects[0].object;
                 while(target.parent && !target.userData.id) target = target.parent;

                 if (target && target.userData.id) {
                     if (event.button === 0) {
                        if (target.userData.id === 'HEATER') {
                            onToggleHeater?.();
                            return;
                        }
                        if (target.userData.type === 'burette_valve') {
                            const buretteId = target.parent?.userData.id;
                            if (buretteId) onToggleValve?.(buretteId);
                            return;
                        }

                        // Drag logic
                        const id = target.userData.id;
                        // Use the intersection point for offset
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
                return;
            }
            if (draggedItem.current && event.button === 0) {
                const id = draggedItem.current.id;
                const group = meshesRef.current.get(id);
                // Drop Logic
                if (group) {
                    const containerData = containersRef.current.find(c => c.id === id);
                    const targetY = (containerData?.type === 'bottle' || containerData?.type === 'jar') ? 0.56 : 0.11;

                    // Simple drop (no animation loop needed inside UseFrame if we just set target and let physics handle? No, explicit drop)
                    group.position.y = targetY;
                    onMoveRef.current(id, [group.position.x, targetY, group.position.z]);
                    audioManager.playGlassClink();
                }
                draggedItem.current = null;
            }
        };

        // Context Menu
        const onContextMenu = (e: Event) => e.preventDefault();

        const canvasEl = gl.domElement;
        canvasEl.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp); // Window to catch release outside canvas
        window.addEventListener('contextmenu', onContextMenu);

        return () => {
            canvasEl.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('contextmenu', onContextMenu);
        };
    }, [gl, raycaster, scene, onToggleHeater, onToggleValve]);


    // Helper to update Analyzer
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


    // Main Loop
    useFrame((state, delta) => {
        const dt = Math.min(delta, 0.1);
        effectSystemRef.current?.update();

        // Shake Camera
        if (shakeIntensity.current > 0) {
            const shake = shakeIntensity.current;
            camera.position.x += (Math.random() - 0.5) * shake * 0.2;
            camera.position.y += (Math.random() - 0.5) * shake * 0.2;
            shakeIntensity.current *= 0.9;
            if (shakeIntensity.current < 0.01) shakeIntensity.current = 0;
            // Note: Camera resets needed? OrbitControls might fight this.
            // In R3F, OrbitControls updates camera in its own useFrame.
            // We just add noise.
        }

        // Dragging & Pouring
        if (draggedItem.current) {
            const mouseTarget = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane.current, mouseTarget);

            if (mouseTarget) {
                const group = meshesRef.current.get(draggedItem.current.id);
                if (group) {
                    let targetPos = mouseTarget.add(draggedItem.current.offset);
                    let targetRotZ = 0;
                    let pourTargetId: string | null = null;

                    if (isRightClickDown.current && draggedItem.current.isPouring) {
                        let closestDist = Infinity;
                        let closestId: string | null = null;
                        let closestPos: THREE.Vector3 | null = null;

                        meshesRef.current.forEach((otherGroup, otherId) => {
                            if (draggedItem.current?.id !== otherId && otherId !== 'ANALYZER_MACHINE') {
                                const dist = group.position.distanceTo(otherGroup.position);
                                if (dist < 1.5 && dist < closestDist) {
                                    closestDist = dist;
                                    closestId = otherId;
                                    closestPos = otherGroup.position.clone();
                                }
                            }
                        });

                        if (closestId && closestPos) {
                            pourTargetId = closestId;
                            targetPos = (closestPos as THREE.Vector3).clone().add(new THREE.Vector3(-0.6, 1.2, 0));
                            targetRotZ = -Math.PI / 2.5;
                        }
                    }

                    group.position.lerp(targetPos, 10 * dt);
                    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, targetRotZ, 10 * dt);

                    // Pour Stream
                    if (pourTargetId && Math.abs(group.rotation.z - targetRotZ) < 0.5) {
                        const sourceC = containersRef.current.find(c => c.id === draggedItem.current?.id);
                        if (sourceC && sourceC.contents && (sourceC.contents.volume > 0 || sourceC.type === 'rock')) {
                             onPourRef.current(sourceC.id, pourTargetId, 0.5 * dt);

                             if (pourStreamRef.current) {
                                 pourStreamRef.current.visible = true;

                                 const lipLocal = new THREE.Vector3(0.5, 1.1, 0);
                                 if (sourceC.type === 'test_tube') lipLocal.set(0.15, 1.1, 0);
                                 else if (sourceC.type === 'bottle') lipLocal.set(0.2, 0.9, 0);

                                 const startWorld = lipLocal.applyMatrix4(group.matrixWorld);
                                 const targetWorld = meshesRef.current.get(pourTargetId)!.position.clone();
                                 targetWorld.y += 0.5; // Approx target height

                                 pourStreamRef.current.position.copy(startWorld);
                                 pourStreamRef.current.lookAt(targetWorld);
                                 const length = startWorld.distanceTo(targetWorld);
                                 pourStreamRef.current.scale.set(1, 1, length);

                                 const mat = pourStreamRef.current.material as THREE.MeshPhysicalMaterial;
                                 mat.color.set(sourceC.contents.color);
                                 mat.emissive.set(sourceC.contents.color);

                                 if (Math.random() < 0.1) audioManager.playPour(0.1);
                             }
                        } else {
                            if (pourStreamRef.current) pourStreamRef.current.visible = false;
                        }
                    } else {
                        if (pourStreamRef.current) pourStreamRef.current.visible = false;
                    }
                }
            }
        } else {
             if (pourStreamRef.current) pourStreamRef.current.visible = false;
        }

        // Bubbles & Analyzer Logic
        // ... (Similar to before)
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
            const probeTipWorld = new THREE.Vector3(0, -0.6, 0.5);
            probeTipWorld.applyMatrix4(analyzerRef.current.group.matrixWorld);

            containersRef.current.forEach(c => {
                const cPos = new THREE.Vector3(...c.position);
                if (probeTipWorld.distanceTo(cPos) < 0.8 && c.contents) {
                    foundChem = c.contents.chemicalId;
                    foundTemp = c.contents.temperature || 25;
                }
            });
            updateAnalyzerDisplay(foundChem, foundTemp);
        }
    });

    // Effects Trigger
    useEffect(() => {
        if (!lastEffect) return;
        const position = lastEffectPos ? new THREE.Vector3(...lastEffectPos) : new THREE.Vector3(0, 1, 0);

        if (lastEffect === 'explosion') {
            effectSystemRef.current?.createExplosion(position, 1.5);
            shakeIntensity.current = 1.0;
            const flashLight = new THREE.PointLight(0xffaa00, 10, 20);
            flashLight.position.copy(position).add(new THREE.Vector3(0, 1, 0));
            scene.add(flashLight);
            setTimeout(() => scene.remove(flashLight), 500); // Simple timeout for cleanup
        } else if (lastEffect === 'sparkles') {
            effectSystemRef.current?.createSparkles(position, '#ffd700', 20);
        }
    }, [lastEffect, lastEffectPos, scene]);

    // Heater Visuals
    useEffect(() => {
        if (!heaterRef.current) return;
        const { mesh, light } = heaterRef.current;
        light.intensity = isHeaterOn ? 2.0 : 0;
        mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                 const m = child.material as THREE.MeshStandardMaterial;
                 if ('emissive' in m) {
                     if (isHeaterOn && child.name === 'HeaterPlate') {
                         m.emissive.setHex(0xff3300);
                         m.emissiveIntensity = 2.0;
                     } else if (child.name === 'HeaterPlate') {
                         m.emissive.setHex(0x000000);
                         m.emissiveIntensity = 0;
                     }
                 }
            }
        });
    }, [isHeaterOn]);

    // Container Sync (Create/Remove Meshes)
    useEffect(() => {
        // Remove deleted
        meshesRef.current.forEach((group, id) => {
            if (id !== 'ANALYZER_MACHINE' && id !== 'HEATER' && !containers.find(c => c.id === id)) {
                scene.remove(group);
                meshesRef.current.delete(id);
                liquidsRef.current.delete(id);
            }
        });

        // Create/Update
        containers.forEach(container => {
            let group = meshesRef.current.get(container.id);
            let liquidMesh = liquidsRef.current.get(container.id);

            if (container.id === explodedContainerId) {
                if (group) group.visible = false;
                return;
            } else if (group) {
                group.visible = true;
            }

            if (!group) {
                group = new THREE.Group();
                group.userData.id = container.id;
                let mesh;

                // --- Mesh Creation Logic from previous file ---
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
                    const liquidGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.5, 24);
                    liquidGeo.translate(0, 0.3, 0);
                    const contents = container.contents ? CHEMICALS[container.contents.chemicalId] : null;
                    const color = contents ? contents.color : 0xffffff;
                    liquidMesh = new THREE.Mesh(liquidGeo, createLiquidMaterial(color));
                    group.add(liquidMesh);
                    liquidsRef.current.set(container.id, liquidMesh);
                } else if (container.type === 'jar') {
                    mesh = new THREE.Mesh(createJarGeometry(), createGlassMaterial());
                    group.add(mesh);
                    if (container.contents) {
                        const mound = new THREE.Mesh(createMoundGeometry(), new THREE.MeshStandardMaterial({ color: container.contents.color, roughness: 1.0 }));
                        mound.scale.set(0.8, 0.8, 0.8);
                        group.add(mound);
                    }
                } else if (container.type === 'rock') {
                    const chem = container.contents ? CHEMICALS[container.contents.chemicalId] : null;
                    const color = chem ? chem.color : 0x888888;
                    const isMetal = ['SODIUM', 'POTASSIUM', 'IRON', 'MAGNESIUM', 'ZINC', 'COPPER', 'ALUMINUM', 'GOLD'].includes(chem?.id || '');
                    const geo = createRoughChunkGeometry(0.25);
                    const mat = isMetal ? createMetalMaterial(color, 0.3) : new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
                    mesh = new THREE.Mesh(geo, mat);
                    mesh.castShadow = true;
                    group.add(mesh);
                } else if (container.type === 'burette') {
                    const stand = createStandGeometry();
                    group.add(stand);
                    const buretteGeo = createBuretteGeometry();
                    buretteGeo.translate(0, 1.8, -0.2);
                    mesh = new THREE.Mesh(buretteGeo, createGlassMaterial());
                    group.add(mesh);
                    const liquidGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 16);
                    liquidGeo.translate(0, 0.5, 0);
                    liquidMesh = new THREE.Mesh(liquidGeo, createLiquidMaterial(0xffffff));
                    liquidMesh.position.set(0, 1.95, -0.2);
                    group.add(liquidMesh);
                    liquidsRef.current.set(container.id, liquidMesh);
                    const valveGeo = new THREE.BoxGeometry(0.1, 0.04, 0.04);
                    const valve = new THREE.Mesh(valveGeo, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
                    valve.position.set(0, 1.9, -0.2);
                    valve.userData.type = 'burette_valve';
                    group.add(valve);
                }

                if (mesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
                if (container.contents && container.type !== 'rock') {
                    const label = createLabel(CHEMICALS[container.contents.chemicalId].name);
                    label.position.y = container.type === 'test_tube' ? 1.4 : 1.6;
                    group.add(label);
                }

                scene.add(group);
                meshesRef.current.set(container.id, group);
                group.position.set(...container.position);
            }

            // Sync Position if not dragging
            if (draggedItem.current?.id !== container.id) {
                group.position.lerp(new THREE.Vector3(...container.position), 0.2);
            }

            // Update Liquid Visuals
            if (liquidMesh && container.contents) {
                liquidMesh.visible = true;
                let targetScaleY = 0;
                if (container.type === 'burette') {
                    targetScaleY = container.contents.volume * 2.3;
                    const valve = group?.children.find(c => c.userData.type === 'burette_valve');
                    if (valve) {
                        valve.rotation.z = container.isValveOpen ? Math.PI / 2 : 0;
                        (valve.material as THREE.MeshStandardMaterial).color.setHex(container.isValveOpen ? 0x00ff00 : 0xff0000);
                    }
                } else {
                    targetScaleY = Math.max(0.01, container.contents.volume * (container.type === 'test_tube' ? 1.0 : 1.15));
                }
                liquidMesh.scale.y = THREE.MathUtils.lerp(liquidMesh.scale.y, targetScaleY, 0.1);

                const mat = liquidMesh.material as THREE.MeshPhysicalMaterial;
                const baseColor = new THREE.Color(container.contents.color);
                const temp = container.contents.temperature || 25;

                // Emissive / Glow
                if (temp > 100 || container.contents.activeReaction) {
                    const heatFactor = Math.min((temp - 25) / 500, 1.0);
                    const reactionGlow = container.contents.activeReaction ? 0.8 : 0;
                    const totalGlow = Math.min(1.0, heatFactor + reactionGlow);

                    mat.emissive.copy(baseColor).multiplyScalar(totalGlow);
                    mat.emissiveIntensity = totalGlow * 2.0;
                    mat.color.copy(baseColor);
                } else {
                    mat.emissive.setHex(0x000000);
                    mat.emissiveIntensity = 0;
                    mat.color.copy(baseColor);
                }
            } else if (liquidMesh) {
                liquidMesh.visible = false;
            }
        });
    }, [containers, scene]);

    return null;
}

// --- MAIN EXPORT ---
const LabScene: React.FC<LabSceneProps> = (props) => {
    return (
        <div className="w-full h-full">
            <Canvas
                shadows
                dpr={[1, 2]}
                camera={{ position: [0, 8, 12], fov: 45 }}
                gl={{
                    antialias: false, // Postprocessing handles AA usually, or we use SMAA
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.0
                }}
            >
                <color attach="background" args={['#050b14']} />

                {/* Module 1: Environment & Lighting */}
                <Environment preset="city" blur={0.7} background />

                <ambientLight intensity={0.2} />
                <spotLight
                    position={[5, 10, 5]}
                    angle={0.5}
                    penumbra={1}
                    castShadow
                    intensity={150}
                    shadow-bias={-0.0001}
                />
                <rectAreaLight
                    width={4}
                    height={4}
                    color={'#38bdf8'}
                    intensity={2.0}
                    position={[-5, 5, -5]}
                    lookAt={() => new THREE.Vector3(0,0,0)}
                />

                <LabLogic {...props} />

                <OrbitControls makeDefault dampingFactor={0.05} />

                {/* Module 3: Post-Processing */}
                <EffectComposer disableNormalPass>
                    {/* Bloom for glowing liquids and heater */}
                    <Bloom
                        luminanceThreshold={1.0}
                        mipmapBlur
                        intensity={1.2}
                        radius={0.6}
                    />
                    <DepthOfField
                        target={[0, 0, 0]}
                        focalLength={0.02}
                        bokehScale={3}
                        height={480}
                    />
                    <Vignette
                        eskil={false}
                        offset={0.1}
                        darkness={0.6}
                    />
                </EffectComposer>
            </Canvas>
        </div>
    );
};

export default LabScene;
