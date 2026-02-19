import React, { useEffect, useRef, useState, useMemo, forwardRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Text, Caustics, MeshTransmissionMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import { createBeakerGeometry, createBuretteGeometry, createStandGeometry, createRoughChunkGeometry, createMoundGeometry, createGlassMaterial, createLiquidMaterial, createMetalMaterial, createLabel, createHeaterMesh, createMeniscusGeometry, createNoiseTexture } from '../utils/threeHelpers';
import { EffectSystem } from '../utils/EffectSystem';
import { audioManager } from '../utils/AudioManager';
import { ContainerState } from '../types';
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
const Container3D = forwardRef<{ group: THREE.Group, liquid: THREE.Mesh | null }, { container: ContainerState, quality: 'high' | 'low', onPointerDown?: (e: any) => void }>(({ container, quality, onPointerDown }, ref) => {
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
        <group ref={groupRef} userData={{ id: container.id }} castShadow receiveShadow onPointerDown={onPointerDown}>
            {container.type === 'burette' && (
                <primitive object={createStandGeometry()} />
            )}

            <group position={container.type === 'burette' ? [0, 1.8, -0.2] : [0,0,0]}>
                {isGlass ? (
                    isUltra ? (
                        <Caustics
                            color="#ffffff"
                            lightSource={[5, 10, 5]}
                            intensity={0.5}
                            worldRadius={0.6}
                            ior={1.5}
                            backsideIOR={1.1}
                            causticsOnly={false}
                            backside={false}
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
    handlePlanePointerUp: (e: any) => void;
    handlePlanePointerMove: (e: any) => void;
}

const LabLogic: React.FC<LabLogicProps> = ({
    containers, meshesMap, lastEffect, lastEffectPos, explodedContainerId,
    onMove, onPour, onToggleValve, isHeaterOn, onToggleHeater,
    handlePlanePointerUp, handlePlanePointerMove
}) => {
    const { scene, camera, gl, raycaster } = useThree();
    const effectSystemRef = useRef<EffectSystem | null>(null);
    const shakeIntensity = useRef(0);
    const pourStreamRef = useRef<THREE.Mesh | null>(null);

    // Callbacks refs
    const onMoveRef = useRef(onMove);
    const onPourRef = useRef(onPour);

    useEffect(() => {
        onMoveRef.current = onMove;
        onPourRef.current = onPour;
    }, [onMove, onPour]);

    const analyzerRef = useRef<{ group: THREE.Group, texture: THREE.CanvasTexture, canvas: HTMLCanvasElement } | null>(null);
    const heaterRef = useRef<{ mesh: THREE.Object3D, light: THREE.PointLight } | null>(null);

    // Initial Scene Setup (Phase 2: Furniture Restoration & Logic Objects)
    useEffect(() => {
        effectSystemRef.current = new EffectSystem(scene);

        // --- PHASE 2: FURNITURE RESTORATION ---
        // 1. The Main Table & Grid (Imperative)
        const tableMesh = new THREE.Mesh(
            new THREE.BoxGeometry(12, 0.2, 6),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 })
        );
        tableMesh.receiveShadow = true;

        const grid = new THREE.GridHelper(10, 20, 0x38bdf8, 0x1e293b);
        grid.position.y = 0.11; // Relative to mesh center
        tableMesh.add(grid);

        scene.add(tableMesh);

        // 2. The Source Chemical Shelf (Imperative)
        const shelf = new THREE.Mesh(
            new THREE.BoxGeometry(10, 0.1, 2.5),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.1 })
        );
        shelf.position.set(0, 0.5, -3.5);
        shelf.receiveShadow = true;
        scene.add(shelf);

        // Logic Objects (Heater, Analyzer, Stream)
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
            scene.remove(tableMesh);
            scene.remove(shelf);
            scene.remove(heater); scene.remove(heaterLight);
            scene.remove(analyzer.group);
            scene.remove(streamMesh);
        };
    }, [scene]);

    // Imperative Raycasting for Drag Start on imperative objects (if any)
    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
             if (event.button === 0) {
                 const intersects = raycaster.intersectObjects(scene.children, true);
                 if (intersects.length > 0) {
                     let target = intersects[0].object;
                     while(target.parent && !target.userData.id) target = target.parent;
                     if (target.userData.id === 'HEATER') {
                         onToggleHeater?.();
                     } else if (target.userData.type === 'burette_valve') {
                         const buretteId = target.parent?.parent?.userData.id;
                         if (buretteId) onToggleValve?.(buretteId);
                     }
                 }
             }
        };
        const canvasEl = gl.domElement;
        canvasEl.addEventListener('pointerdown', onPointerDown);
        return () => canvasEl.removeEventListener('pointerdown', onPointerDown);
    }, [gl, raycaster, scene, onToggleHeater, onToggleValve]);

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
        effectSystemRef.current?.update();

        if (shakeIntensity.current > 0) {
            const shake = shakeIntensity.current;
            camera.position.x += (Math.random() - 0.5) * shake * 0.2;
            camera.position.y += (Math.random() - 0.5) * shake * 0.2;
            shakeIntensity.current *= 0.9;
            if (shakeIntensity.current < 0.01) shakeIntensity.current = 0;
        }

        // Analyzer Logic
        if (analyzerRef.current) {
            let foundChem = null;
            let foundTemp = 25;
            const probeTipWorld = new THREE.Vector3(0, -0.6, 0.5);
            probeTipWorld.applyMatrix4(analyzerRef.current.group.matrixWorld);

            containers.forEach(c => {
                const cPos = new THREE.Vector3(...c.position);
                if (probeTipWorld.distanceTo(cPos) < 0.8 && c.contents) {
                    foundChem = c.contents.chemicalId;
                    foundTemp = c.contents.temperature || 25;
                }
            });
            updateAnalyzerDisplay(foundChem, foundTemp);
        }

        // Bubbles
        containers.forEach(c => {
             if (c.contents && c.contents.temperature && c.contents.temperature > 100) {
                  if (Math.random() < 0.2) {
                      const pos = new THREE.Vector3(...c.position);
                      pos.y += 0.5;
                      effectSystemRef.current?.createBubbles(pos, c.contents.color, 1);
                  }
             }
        });

        // Heater Visuals
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
    const orbitControlsRef = useRef<any>(null);
    const dragInfo = useRef<{ id: string, offset: THREE.Vector3 } | null>(null);

    // Invisible Raycast Plane for dragging (Phase 1)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.11); // Plane at y=0.11
    const raycaster = new THREE.Raycaster();

    // -- Handler for Drag Start --
    const handleContainerPointerDown = (e: any, id: string) => {
        e.stopPropagation();
        if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;

        // Use the object position relative to the intersection point for offset
        const objectPos = meshesMap.current.get(id)?.group.position.clone();
        if (objectPos) {
            const offset = objectPos.sub(e.point);
            offset.y = 0; // Keep drag planar
            dragInfo.current = { id, offset };
            audioManager.playGlassClink();
        }
    };

    // -- Handler for Drag Move --
    // Attached to a large invisible plane to catch moves
    const handlePlanePointerMove = (e: any) => {
        if (dragInfo.current && dragInfo.current.id) {
            e.stopPropagation();
            const { id, offset } = dragInfo.current;
            const obj = meshesMap.current.get(id);
            if (obj) {
                // e.point is intersection on the plane
                const newPos = e.point.clone().add(offset);

                // Clamp Y (Tactile Restoration)
                const containerData = props.containers.find(c => c.id === id);
                const targetY = (containerData?.type === 'bottle' || containerData?.type === 'jar') ? 0.56 : 0.11;
                newPos.y = targetY; // Strictly clamp

                // Direct Mutation (Phase 1)
                obj.group.position.copy(newPos);
            }
        }
    };

    // -- Handler for Drag End --
    const handlePlanePointerUp = (e: any) => {
        if (dragInfo.current && dragInfo.current.id) {
            e.stopPropagation();
            const id = dragInfo.current.id;
            const obj = meshesMap.current.get(id);

            if (obj) {
                // 1. Sync State (Phase 1: ONLY on up)
                props.onMove(id, [obj.group.position.x, obj.group.position.y, obj.group.position.z]);
                audioManager.playGlassClink();

                // 2. Proximity Check (Module 3)
                let closestId: string | null = null;
                let minDst = Infinity;
                meshesMap.current.forEach((other, otherId) => {
                    if (otherId !== id) {
                        const dist = obj.group.position.distanceTo(other.group.position);
                        if (dist < 1.5 && dist < minDst) { // Threshold 1.5
                            minDst = dist;
                            closestId = otherId;
                        }
                    }
                });

                if (closestId) {
                    props.onPour(id, closestId);
                }
            }

            dragInfo.current = null;
            if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
        }
    };

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

                <LabLogic
                    {...props}
                    meshesMap={meshesMap}
                    handlePlanePointerUp={handlePlanePointerUp}
                    handlePlanePointerMove={handlePlanePointerMove}
                />

                {/* Invisible Drag Plane for catching raycasts */}
                <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0.11, 0]}
                    visible={false}
                    onPointerUp={handlePlanePointerUp}
                    onPointerMove={handlePlanePointerMove}
                >
                    <planeGeometry args={[100, 100]} />
                    <meshBasicMaterial color="red" wireframe />
                </mesh>

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
                                onPointerDown={(e) => handleContainerPointerDown(e, c.id)}
                            />
                        )
                    ))}
                </group>

                <Whiteboard content={props.whiteboardContent || null} />

                <OrbitControls ref={orbitControlsRef} makeDefault dampingFactor={0.05} />

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
