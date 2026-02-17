import React, { useEffect, useRef, useState, useMemo, forwardRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Text, Caustics, MeshTransmissionMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import { createTable, createBeakerGeometry, createBuretteGeometry, createStandGeometry, createRoughChunkGeometry, createMoundGeometry, createGlassMaterial, createLiquidMaterial, createMetalMaterial, createLabel, createHeaterMesh, createMeniscusGeometry, createNoiseTexture } from '../utils/threeHelpers';
import { EffectSystem } from '../utils/EffectSystem';
import { audioManager } from '../utils/AudioManager';
import { ContainerState, CHEMICALS, HEATER_POSITION } from '../types';
import { CHEMICALS as CHEMS_CONST, HEATER_POSITION as HEAT_CONST } from '../constants';

// Fix imports: CHEMICALS and HEATER_POSITION are in constants, not types
const LOCAL_CHEMICALS = CHEMS_CONST;
const LOCAL_HEATER_POSITION = HEAT_CONST;

// Redefine local geometries
const createTestTubeGeometryLocal = () => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    for (let i = 0; i <= 5; i++) {
        const angle = (i / 5) * (Math.PI / 2);
        points.push(new THREE.Vector2(Math.sin(angle) * 0.15, -Math.cos(angle) * 0.15 + 0.15));
    }
    points.push(new THREE.Vector2(0.15, 1.2));
    points.push(new THREE.Vector2(0.18, 1.2));
    return new THREE.LatheGeometry(points, 32);
};

const createBottleGeometryLocal = () => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.4, 0));
    points.push(new THREE.Vector2(0.4, 0.6));
    points.push(new THREE.Vector2(0.15, 0.7));
    points.push(new THREE.Vector2(0.15, 0.9));
    points.push(new THREE.Vector2(0.18, 0.92));
    return new THREE.LatheGeometry(points, 32);
};

const createJarGeometryLocal = () => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.35, 0));
    points.push(new THREE.Vector2(0.35, 0.5));
    points.push(new THREE.Vector2(0.3, 0.5));
    points.push(new THREE.Vector2(0.3, 0.55));
    return new THREE.LatheGeometry(points, 32);
};

const createAnalyzerMachineLocal = () => {
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

// --- Container3D Component ---
const Container3D = forwardRef<{ group: THREE.Group, liquid: THREE.Mesh | null }, { container: ContainerState, quality: 'high' | 'low' }>(({ container, quality }, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    const liquidRef = useRef<THREE.Mesh>(null);
    const solidRef = useRef<THREE.Mesh>(null);

    React.useImperativeHandle(ref, () => ({
        group: groupRef.current!,
        liquid: liquidRef.current
    }));

    const geometry = useMemo(() => {
        if (container.type === 'beaker') return createBeakerGeometry(0.5, 1.2);
        if (container.type === 'test_tube') return createTestTubeGeometryLocal();
        if (container.type === 'bottle') return createBottleGeometryLocal();
        if (container.type === 'jar') return createJarGeometryLocal();
        if (container.type === 'rock') return createRoughChunkGeometry(0.25);
        if (container.type === 'burette') return createBuretteGeometry();
        return new THREE.BoxGeometry(0.5, 0.5, 0.5);
    }, [container.type]);

    const liquidGeometry = useMemo(() => {
        if (container.type === 'beaker') return createMeniscusGeometry(0.46, 1.0);
        if (container.type === 'test_tube') return createMeniscusGeometry(0.13, 1.1);
        if (container.type === 'bottle') return new THREE.CylinderGeometry(0.38, 0.38, 0.5, 24);
        if (container.type === 'burette') return new THREE.CylinderGeometry(0.05, 0.05, 1, 16);
        return null;
    }, [container.type]);

    const solidTexture = useMemo(() => {
        if (container.type === 'rock' && quality === 'high') return createNoiseTexture();
        return null;
    }, [container.type, quality]);

    const contents = container.contents;
    const chem = contents ? LOCAL_CHEMICALS[contents.chemicalId] : null;
    const isUltra = quality === 'high';
    const isGlass = ['beaker', 'test_tube', 'bottle', 'burette'].includes(container.type);

    useEffect(() => {
        if (groupRef.current) {
            groupRef.current.position.set(...container.position);
        }
    }, []);

    const glassMaterial = useMemo(() => createGlassMaterial(quality), [quality]);

    return (
        <group ref={groupRef} userData={{ id: container.id }} castShadow receiveShadow>
            {container.type === 'burette' && (
                <primitive object={createStandGeometry()} />
            )}

            <group position={container.type === 'burette' ? [0, 1.8, -0.2] : [0,0,0]}>
                {isGlass ? (
                    isUltra ? (
                        <Caustics
                            color="#ffffff"
                            focus={[0, -2, 0]}
                            lightSource={[5, 10, 5]}
                            intensity={0.5}
                            worldRadius={0.6}
                            ior={1.5}
                            backsideIOR={1.1}
                        >
                            <mesh geometry={geometry} castShadow receiveShadow>
                                <MeshTransmissionMaterial
                                    backside
                                    samples={16}
                                    thickness={0.2}
                                    chromaticAberration={0.1}
                                    anisotropy={0.1}
                                    ior={1.5}
                                    color="#ffffff"
                                    resolution={512}
                                />
                            </mesh>
                        </Caustics>
                    ) : (
                        <mesh geometry={geometry} material={glassMaterial} castShadow receiveShadow />
                    )
                ) : container.type === 'rock' ? (
                     <mesh geometry={geometry} ref={solidRef} castShadow>
                         {isUltra && solidTexture ? (
                             <meshStandardMaterial
                                color={chem?.color || '#888'}
                                roughness={0.6}
                                metalness={chem?.id === 'SODIUM' ? 0.8 : 0.1}
                                normalMap={solidTexture}
                                normalScale={new THREE.Vector2(1, 1)}
                                bumpMap={solidTexture}
                                bumpScale={0.05}
                             />
                         ) : (
                             <meshStandardMaterial
                                color={chem?.color || '#888'}
                                roughness={0.9}
                                metalness={['SODIUM','POTASSIUM','IRON'].includes(chem?.id || '') ? 0.7 : 0.0}
                             />
                         )}
                     </mesh>
                ) : container.type === 'jar' ? (
                    <mesh geometry={geometry} material={glassMaterial} castShadow />
                ) : null}

                {liquidGeometry && (
                    <mesh
                        ref={liquidRef}
                        geometry={liquidGeometry}
                        visible={!!contents}
                        position={
                             container.type === 'beaker' || container.type === 'test_tube' ? [0, 0.05, 0] :
                             container.type === 'bottle' ? [0, 0.3, 0] :
                             container.type === 'burette' ? [0, 0.15, 0] : [0,0,0]
                        }
                    >
                        {contents && (
                            <primitive
                                object={createLiquidMaterial(
                                    contents.color,
                                    !!contents.activeReaction,
                                    quality,
                                    0.5
                                )}
                                attach="material"
                            />
                        )}
                    </mesh>
                )}

                {container.type === 'jar' && contents && (
                     <mesh geometry={createMoundGeometry()} scale={[0.8, 0.8, 0.8]}>
                         <meshStandardMaterial color={contents.color} roughness={1} />
                     </mesh>
                )}

                {container.type === 'burette' && (
                     <mesh position={[0, 0.1, 0]} userData={{ type: 'burette_valve' }}>
                         <boxGeometry args={[0.1, 0.04, 0.04]} />
                         <meshStandardMaterial color={container.isValveOpen ? 0x00ff00 : 0xff0000} />
                     </mesh>
                )}
            </group>

            {contents && container.type !== 'rock' && (
                <primitive
                    object={createLabel(chem?.name || '')}
                    position={[0, container.type === 'test_tube' ? 1.4 : 1.6, 0]}
                />
            )}
        </group>
    );
});

interface LabLogicProps {
    containers: ContainerState[];
    meshesMap: React.MutableRefObject<Map<string, { group: THREE.Group, liquid: THREE.Mesh | null }>>;
    lastEffect: string | null;
    lastEffectPos?: [number, number, number] | null;
    explodedContainerId?: string | null;
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (sourceId: string, targetId: string) => void;
    onToggleValve?: (id: string) => void;
    isHeaterOn?: boolean;
    onToggleHeater?: () => void;
}

const LabLogic: React.FC<LabLogicProps> = ({
    containers, meshesMap, lastEffect, lastEffectPos, explodedContainerId,
    onMove, onPour, onToggleValve, isHeaterOn, onToggleHeater
}) => {
    const { scene, camera, gl, raycaster } = useThree();
    const effectSystemRef = useRef<EffectSystem | null>(null);
    const shakeIntensity = useRef(0);

    const draggedItem = useRef<{ id: string, offset: THREE.Vector3, isPouring?: boolean } | null>(null);
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const isRightClickDown = useRef(false);
    const pourStreamRef = useRef<THREE.Mesh | null>(null);
    const containersRef = useRef(containers);

    const onMoveRef = useRef(onMove);
    const onPourRef = useRef(onPour);

    useEffect(() => {
        onMoveRef.current = onMove;
        onPourRef.current = onPour;
        containersRef.current = containers;
    }, [onMove, onPour, containers]);

    const analyzerRef = useRef<{ group: THREE.Group, texture: THREE.CanvasTexture, canvas: HTMLCanvasElement } | null>(null);
    const heaterRef = useRef<{ mesh: THREE.Object3D, light: THREE.PointLight } | null>(null);

    useEffect(() => {
        effectSystemRef.current = new EffectSystem(scene);

        const heater = createHeaterMesh();
        heater.position.set(...LOCAL_HEATER_POSITION);
        heater.userData.id = 'HEATER';
        scene.add(heater);
        const heaterLight = new THREE.PointLight(0xff4400, 0, 5);
        heaterLight.position.set(LOCAL_HEATER_POSITION[0], LOCAL_HEATER_POSITION[1] + 0.5, LOCAL_HEATER_POSITION[2]);
        scene.add(heaterLight);
        heaterRef.current = { mesh: heater, light: heaterLight };

        const analyzer = createAnalyzerMachineLocal();
        analyzer.group.position.set(4, 0, 1.5);
        analyzer.group.userData.id = 'ANALYZER_MACHINE';
        scene.add(analyzer.group);
        analyzerRef.current = analyzer;

        const streamGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 8);
        streamGeo.rotateX(-Math.PI / 2);
        streamGeo.translate(0, 0, 0.5);
        const streamMat = new THREE.MeshPhysicalMaterial({
            color: 0x33aaff, transparent: true, opacity: 0.6, transmission: 0.8, emissive: 0x33aaff
        });
        const streamMesh = new THREE.Mesh(streamGeo, streamMat);
        streamMesh.visible = false;
        scene.add(streamMesh);
        pourStreamRef.current = streamMesh;

        return () => {
            scene.remove(heater); scene.remove(heaterLight);
            scene.remove(analyzer.group);
            scene.remove(streamMesh);
        };
    }, [scene]);

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
             if (event.button === 2) {
                 isRightClickDown.current = true;
                 if (draggedItem.current) draggedItem.current.isPouring = true;
                 return;
             }
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
                            const buretteId = target.parent?.parent?.userData.id;
                            if (buretteId) onToggleValve?.(buretteId);
                            return;
                        }
                        const id = target.userData.id;
                        if (meshesMap.current.has(id)) {
                             const offset = target.position.clone().sub(intersects[0].point);
                             offset.y = 0;
                             draggedItem.current = { id, offset };
                             audioManager.playGlassClink();
                        }
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
                const obj = meshesMap.current.get(id);
                if (obj) {
                    const group = obj.group;
                    const containerData = containersRef.current.find(c => c.id === id);
                    const targetY = (containerData?.type === 'bottle' || containerData?.type === 'jar') ? 0.56 : 0.11;
                    group.position.y = targetY;
                    onMoveRef.current(id, [group.position.x, targetY, group.position.z]);
                    audioManager.playGlassClink();
                }
                draggedItem.current = null;
            }
        };

        const onContextMenu = (e: Event) => e.preventDefault();
        const canvasEl = gl.domElement;
        canvasEl.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('contextmenu', onContextMenu);

        return () => {
            canvasEl.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('contextmenu', onContextMenu);
        };
    }, [gl, raycaster, scene, meshesMap]);

    const updateAnalyzerDisplay = (chemId: string | null, temp?: number) => {
        if (!analyzerRef.current) return;
        const ctx = analyzerRef.current.canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 256, 128);
        ctx.textAlign = 'center';

        if (chemId) {
            const chem = LOCAL_CHEMICALS[chemId];
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

    useFrame((state, delta) => {
        const dt = Math.min(delta, 0.1);
        effectSystemRef.current?.update();

        if (shakeIntensity.current > 0) {
            const shake = shakeIntensity.current;
            camera.position.x += (Math.random() - 0.5) * shake * 0.2;
            camera.position.y += (Math.random() - 0.5) * shake * 0.2;
            shakeIntensity.current *= 0.9;
            if (shakeIntensity.current < 0.01) shakeIntensity.current = 0;
        }

        if (draggedItem.current) {
            const mouseTarget = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane.current, mouseTarget);

            if (mouseTarget) {
                const obj = meshesMap.current.get(draggedItem.current.id);
                if (obj) {
                    const group = obj.group;
                    let targetPos = mouseTarget.add(draggedItem.current.offset);
                    let targetRotZ = 0;
                    let pourTargetId: string | null = null;

                    if (isRightClickDown.current && draggedItem.current.isPouring) {
                        let closestDist = Infinity;
                        let closestId: string | null = null;
                        let closestPos: THREE.Vector3 | null = null;

                        meshesMap.current.forEach((otherObj, otherId) => {
                            if (draggedItem.current?.id !== otherId) {
                                const dist = group.position.distanceTo(otherObj.group.position);
                                if (dist < 1.5 && dist < closestDist) {
                                    closestDist = dist;
                                    closestId = otherId;
                                    closestPos = otherObj.group.position.clone();
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
                                 const targetObj = meshesMap.current.get(pourTargetId);
                                 const targetWorld = targetObj ? targetObj.group.position.clone() : new THREE.Vector3();
                                 targetWorld.y += 0.5;

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

        containersRef.current.forEach(c => {
             const obj = meshesMap.current.get(c.id);
             if (obj) {
                 const { group, liquid } = obj;

                 if (draggedItem.current?.id !== c.id) {
                     group.position.lerp(new THREE.Vector3(...c.position), 0.2);
                 }

                 if (liquid && c.contents) {
                     liquid.visible = true;
                     let targetScaleY = 0;
                     if (c.type === 'burette') {
                         targetScaleY = c.contents.volume * 2.3;
                     } else {
                         targetScaleY = Math.max(0.01, c.contents.volume * (c.type === 'test_tube' ? 1.0 : 1.15));
                     }
                     liquid.scale.y = THREE.MathUtils.lerp(liquid.scale.y, targetScaleY, 0.1);

                     const mat = liquid.material as THREE.MeshPhysicalMaterial;
                     if (mat && mat.emissive) {
                        const baseColor = new THREE.Color(c.contents.color);
                        const temp = c.contents.temperature || 25;
                        if (temp > 100 || c.contents.activeReaction) {
                             const heatFactor = Math.min((temp - 25) / 500, 1.0);
                             const reactionGlow = c.contents.activeReaction ? 0.8 : 0;
                             const totalGlow = Math.min(1.0, heatFactor + reactionGlow);
                             mat.emissive.copy(baseColor).multiplyScalar(totalGlow);
                             mat.emissiveIntensity = totalGlow * 2.0;
                             mat.color.copy(baseColor);
                        } else {
                            mat.emissive.setHex(0x000000);
                             mat.emissiveIntensity = 0;
                             mat.color.copy(baseColor);
                        }
                     }
                 } else if (liquid) {
                     liquid.visible = false;
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

        containersRef.current.forEach(c => {
             if (c.contents && c.contents.temperature && c.contents.temperature > 100) {
                  if (Math.random() < 0.2) {
                      const pos = new THREE.Vector3(...c.position);
                      pos.y += 0.5;
                      effectSystemRef.current?.createBubbles(pos, c.contents.color, 1);
                  }
             }
        });

        if (heaterRef.current) {
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
        }
    });

    useEffect(() => {
        if (!lastEffect) return;
        const position = lastEffectPos ? new THREE.Vector3(...lastEffectPos) : new THREE.Vector3(0, 1, 0);
        if (lastEffect === 'explosion') {
            effectSystemRef.current?.createExplosion(position, 1.5);
            shakeIntensity.current = 1.0;
            const flashLight = new THREE.PointLight(0xffaa00, 10, 20);
            flashLight.position.copy(position).add(new THREE.Vector3(0, 1, 0));
            scene.add(flashLight);
            setTimeout(() => scene.remove(flashLight), 500);
        } else if (lastEffect === 'sparkles') {
            effectSystemRef.current?.createSparkles(position, '#ffd700', 20);
        }
    }, [lastEffect, lastEffectPos, scene]);

    return null;
};

// --- Main Component ---

const Whiteboard: React.FC<{ content: string | null }> = ({ content }) => {
    if (!content) return null;
    return (
        <group position={[0, 2.8, -3.4]}>
            <mesh receiveShadow position={[0, 0, -0.05]}>
                <boxGeometry args={[4.2, 1.2, 0.1]} />
                <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
            </mesh>
            <mesh receiveShadow>
                <planeGeometry args={[4, 1]} />
                <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
            </mesh>
            <Text
                position={[0, 0, 0.01]}
                fontSize={0.25}
                color="#000000"
                anchorX="center"
                anchorY="middle"
                maxWidth={3.8}
            >
                {content}
            </Text>
        </group>
    );
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
    isPerformanceMode?: boolean;
    whiteboardContent?: string | null;
}

const LabScene: React.FC<LabSceneProps> = (props) => {
    const meshesMap = useRef<Map<string, { group: THREE.Group, liquid: THREE.Mesh | null }>>(new Map());

    return (
        <div className="w-full h-full">
            <Canvas
                shadows
                dpr={[1, props.isPerformanceMode ? 1.5 : 2]}
                camera={{ position: [0, 8, 12], fov: 45 }}
                gl={{
                    antialias: false,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.0
                }}
            >
                <color attach="background" args={['#050b14']} />

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

                <LabLogic {...props} meshesMap={meshesMap} />

                <group>
                    {props.containers.map(c => (
                        c.id !== props.explodedContainerId && (
                            <Container3D
                                key={c.id}
                                container={c}
                                quality={props.isPerformanceMode ? 'low' : 'high'}
                                ref={(node) => {
                                    if (node) {
                                        meshesMap.current.set(c.id, node);
                                    } else {
                                        meshesMap.current.delete(c.id);
                                    }
                                }}
                            />
                        )
                    ))}
                </group>

                <Whiteboard content={props.whiteboardContent || null} />

                <OrbitControls makeDefault dampingFactor={0.05} />

                {!props.isPerformanceMode && (
                    <EffectComposer>
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
                )}
            </Canvas>
        </div>
    );
};

export default LabScene;
