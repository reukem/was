// src/components/LabScene.tsx
import React, { useEffect, useRef, useState, useMemo, forwardRef, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Text, Caustics, MeshTransmissionMaterial, Html, DragControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { createBeakerGeometry, createBuretteGeometry, createStandGeometry, createRoughChunkGeometry, createMoundGeometry, createGlassMaterial, createLabel, createHeaterMesh, createNoiseTexture } from '../utils/threeHelpers';
import { EffectSystem } from '../utils/EffectSystem';
import { audioManager } from '../utils/AudioManager';
import { ContainerState } from '../types';
import { CHEMICALS as CHEMS_CONST, HEATER_POSITION as HEAT_CONST } from '../constants';
import ReactionVFX from './ReactionVFX';
import { PhysicsEngine } from '../systems/PhysicsEngine';
import { Analyzer3D } from './Analyzer3D';

const LOCAL_CHEMICALS = CHEMS_CONST;
const LOCAL_HEATER_POSITION = HEAT_CONST;

// --- Local Geometries ---
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

// --- Container3D Component ---
interface Container3DProps {
    container: ContainerState;
    quality: 'high' | 'low';
}

const Container3D = forwardRef<{ group: THREE.Group }, Container3DProps>(({ container, quality }, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    const solidRef = useRef<THREE.Mesh>(null);
    const glassMaterialRef = useRef<THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial | null>(null);

    React.useImperativeHandle(ref, () => ({
        group: groupRef.current!
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

    const liquidProps = useMemo(() => {
        if (container.type === 'beaker') return { radius: 0.46, height: 1.0 };
        if (container.type === 'test_tube') return { radius: 0.13, height: 1.1 };
        if (container.type === 'bottle') return { radius: 0.38, height: 0.5 };
        if (container.type === 'burette') return { radius: 0.05, height: 1.0 };
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

    // Sync position only if significantly different to avoid fighting DragControls
    useEffect(() => {
        if (groupRef.current) {
            const currentPos = groupRef.current.position;
            const targetPos = new THREE.Vector3(...container.position);
            if (currentPos.distanceTo(targetPos) > 0.01) {
                groupRef.current.position.set(...container.position);
            }
        }
    }, [container.position]);

    // Optimized Material Handling
    if (!glassMaterialRef.current) {
        glassMaterialRef.current = createGlassMaterial(quality);
    }

    useEffect(() => {
        if (glassMaterialRef.current) {
            const newMat = createGlassMaterial(quality);
            glassMaterialRef.current.copy(newMat);
            glassMaterialRef.current.needsUpdate = true;
            newMat.dispose();
        }
    }, [quality]);

    return (
        <group
            ref={groupRef}
            userData={{ id: container.id, type: container.type }}
            castShadow
            receiveShadow
        >
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
                        <mesh geometry={geometry} material={glassMaterialRef.current} castShadow receiveShadow />
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
                    <mesh geometry={geometry} material={glassMaterialRef.current} castShadow />
                ) : null}

                {liquidProps && contents && (
                    <mesh position={[0, (liquidProps.height * contents.volume * 0.5) - (liquidProps.height * 0.5), 0]}>
                        <cylinderGeometry args={[liquidProps.radius, liquidProps.radius, liquidProps.height * Math.max(0.01, contents.volume), 32]} />
                        <meshPhysicalMaterial
                            color={contents.color}
                            transmission={0.9}
                            roughness={0.1}
                            metalness={0.0}
                            ior={1.33}
                            thickness={0.5}
                            transparent
                        />
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
    meshesMap: React.MutableRefObject<Map<string, { group: THREE.Group }>>;
    lastEffect: string | null;
    lastEffectPos?: [number, number, number] | null;
    explodedContainerId?: string | null;
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (sourceId: string, targetId: string) => void;
    onDrop: (sourceId: string, targetId: string) => void;
    onToggleValve?: (id: string) => void;
    isHeaterOn?: boolean;
    onToggleHeater?: () => void;
    setAnalyzerPosition: (pos: THREE.Vector3) => void;
    analyzerPosition: THREE.Vector3;
    heaterTemp?: number;
}

const LabLogic: React.FC<LabLogicProps> = ({
    containers, meshesMap, lastEffect, lastEffectPos, explodedContainerId,
    onMove, onPour, onToggleValve, isHeaterOn, onToggleHeater,
    setAnalyzerPosition, analyzerPosition, heaterTemp
}) => {
    const { scene, camera, gl, raycaster } = useThree();
    const effectSystemRef = useRef<EffectSystem | null>(null);
    const shakeIntensity = useRef(0);
    const pourStreamRef = useRef<THREE.Mesh | null>(null);
    const heaterRef = useRef<{ mesh: THREE.Object3D, light: THREE.PointLight } | null>(null);

    // Initial Scene Setup
    useEffect(() => {
        effectSystemRef.current = new EffectSystem(scene);

        // --- FURNITURE & STATIC OBJECTS ---
        // Restore table visibility and interaction (by NOT disabling raycast)
        const tableMesh = new THREE.Mesh(
            new THREE.BoxGeometry(12, 0.2, 6),
            new THREE.MeshPhysicalMaterial({
                color: 0x111827,
                roughness: 0.4,
                metalness: 0.8,
                clearcoat: 0.5,
                clearcoatRoughness: 0.1
            })
        );
        tableMesh.receiveShadow = true;

        const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(12, 0.2, 6));
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        edges.scale.set(1.001, 1.001, 1.001);
        tableMesh.add(edges);

        const grid = new THREE.GridHelper(10, 20, 0x06b6d4, 0x1e293b);
        grid.position.y = 0.11;
        tableMesh.add(grid);

        scene.add(tableMesh);

        const shelf = new THREE.Mesh(
            new THREE.BoxGeometry(10, 0.1, 2.5),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.1 })
        );
        shelf.position.set(0, 0.5, -3.5);
        shelf.receiveShadow = true;
        scene.add(shelf);

        // Logic Objects
        const heater = createHeaterMesh();
        heater.position.set(...LOCAL_HEATER_POSITION);
        heater.userData.id = 'HEATER';
        scene.add(heater);
        const heaterLight = new THREE.PointLight(0xff4400, 0, 5);
        heaterLight.position.set(LOCAL_HEATER_POSITION[0], LOCAL_HEATER_POSITION[1] + 0.5, LOCAL_HEATER_POSITION[2]);
        scene.add(heaterLight);
        heaterRef.current = { mesh: heater, light: heaterLight };

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
            scene.remove(streamMesh);
        };
    }, [scene]);

    // Handle clicks for static logic objects (Heater, Valve)
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

    useFrame(() => {
        effectSystemRef.current?.update();

        if (shakeIntensity.current > 0) {
            const shake = shakeIntensity.current;
            camera.position.x += (Math.random() - 0.5) * shake * 0.2;
            camera.position.y += (Math.random() - 0.5) * shake * 0.2;
            shakeIntensity.current *= 0.9;
            if (shakeIntensity.current < 0.01) shakeIntensity.current = 0;
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
            const temp = heaterTemp || 300;
            const intensity = isHeaterOn ? (temp / 300) : 0;
            const hotColor = new THREE.Color().setHSL(0.05 + (temp/2000)*0.1, 1.0, 0.5 + (temp/2000)*0.5);
            light.intensity = intensity * 1.5;
            light.color = hotColor;

            mesh.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                     const m = child.material as THREE.MeshStandardMaterial;
                     if ('emissive' in m) {
                         if (isHeaterOn && child.name === 'HeaterPlate') {
                             m.emissive.setHex(hotColor.getHex());
                             m.emissiveIntensity = intensity * 2.0;
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
    onDrop: (sourceId: string, targetId: string) => void;
    onToggleValve?: (id: string) => void;
    isHeaterOn?: boolean;
    onToggleHeater?: () => void;
    isPerformanceMode?: boolean;
    whiteboardContent?: string | null;
    heaterTemp?: number;
}

const LabScene: React.FC<LabSceneProps> = (props) => {
    const meshesMap = useRef<Map<string, { group: THREE.Group }>>(new Map());
    const orbitControlsRef = useRef<any>(null);
    const [analyzerPos, setAnalyzerPos] = useState(new THREE.Vector3(4, 0, 1.5));

    return (
        <div className="w-full h-full">
            <Canvas
                shadows
                dpr={[1, props.isPerformanceMode ? 1.5 : 2]}
                camera={{ position: [0, 8, 12], fov: 45 }}
                gl={{
                    antialias: true,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.2
                }}
            >
                <color attach="background" args={['#0f172a']} />

                <Suspense fallback={<Html center><div className="text-white font-mono text-xs">LOADING LAB...</div></Html>}>
                    <Environment preset="city" background={false} blur={0.8} />

                <directionalLight
                    position={[5, 10, 5]}
                    intensity={0.8}
                    castShadow
                    shadow-bias={-0.0001}
                    shadow-mapSize={[1024, 1024]}
                />
                <pointLight position={[-5, 5, -5]} intensity={0.4} color="#06b6d4" />

                <LabLogic
                    {...props}
                    meshesMap={meshesMap}
                    analyzerPosition={analyzerPos}
                    setAnalyzerPosition={setAnalyzerPos}
                />

                {/* 🧪 1. INDIVIDUAL DRAG CONTROL FOR THE ANALYZER */}
                {/* @ts-ignore */}
                <DragControls
                    axisLock="y"
                    onDragStart={() => {
                        if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
                    }}
                    onDragEnd={(e) => {
                        if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
                        let target = e.object;
                        while(target.parent && !target.userData.id) target = target.parent;
                        if (target && target.userData.id === 'ANALYZER') {
                            setAnalyzerPos(target.position.clone());
                        }
                    }}
                >
                    <Analyzer3D
                        position={[analyzerPos.x, analyzerPos.y, analyzerPos.z]}
                        updateDisplay={(ctx) => {
                            ctx.fillStyle = '#0f172a';
                            ctx.fillRect(0, 0, 256, 128);
                            ctx.textAlign = 'center';

                            let foundChem = null;
                            let foundTemp = 25;

                            props.containers.forEach(c => {
                                const cPos = new THREE.Vector3(...c.position);
                                if (analyzerPos.distanceTo(cPos) < 1.2 && c.contents) {
                                    foundChem = c.contents.chemicalId;
                                    foundTemp = c.contents.temperature || 25;
                                }
                            });

                            if (foundChem) {
                                const chem = LOCAL_CHEMICALS[foundChem];
                                ctx.fillStyle = chem.color === '#ffffff' ? '#e2e8f0' : chem.color;
                                ctx.font = 'bold 24px monospace';
                                ctx.fillText('SCANNING...', 128, 40);
                                ctx.fillStyle = '#22c55e';
                                ctx.font = 'bold 36px monospace';
                                ctx.fillText(`pH: ${chem.ph}`, 128, 80);
                                ctx.font = '24px monospace';
                                ctx.fillText(`${foundTemp.toFixed(0)}°C`, 128, 110);
                            } else {
                                ctx.fillStyle = '#94a3b8';
                                ctx.font = 'bold 32px monospace';
                                ctx.fillText('READY', 128, 70);
                            }
                        }}
                    />
                </DragControls>

                {/* 🧪 2. INDIVIDUAL DRAG CONTROLS FOR EACH BEAKER */}
                {props.containers.map(c => (
                    c.id !== props.explodedContainerId && (
                        /* @ts-ignore */
                        <DragControls
                            key={c.id}
                            axisLock="y"
                            onDragStart={() => {
                                if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
                            }}
                            onDragEnd={(e) => {
                                if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
                                let target = e.object;

                                // Climb the tree to find the top-level Container group!
                                while(target.parent && !target.userData.id) target = target.parent;

                                if (target && target.userData.id) {
                                    const id = target.userData.id;

                                    // Update global state
                                    props.onMove(id, [target.position.x, target.position.y, target.position.z]);

                                    // Trigger physics drop/pour checks
                                    const sourcePos = target.position;
                                    const sourceType = target.userData.type;

                                    meshesMap.current.forEach((other, otherId) => {
                                        if (otherId !== id) {
                                            if (PhysicsEngine.checkPourCondition(sourcePos, other.group.position, id, otherId)) {
                                                props.onPour(id, otherId);
                                            }
                                            else if (PhysicsEngine.checkDropCondition(sourcePos, other.group.position, sourceType)) {
                                                props.onDrop(id, otherId);
                                            }
                                        }
                                    });
                                }
                            }}
                        >
                            <Container3D
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
                        </DragControls>
                    )
                ))}

                {props.lastEffect && props.lastEffectPos && (
                    <ReactionVFX
                        color={props.lastEffect === 'smoke' ? '#aaaaaa' : props.lastEffect === 'bubbles' ? '#ffffff' : '#ffaa00'}
                        position={new THREE.Vector3(...props.lastEffectPos).add(new THREE.Vector3(0, 0.5, 0)).toArray() as [number, number, number]}
                        intensity={props.lastEffect === 'explosion' ? 5.0 : 1.0}
                        effectType={props.lastEffect as any}
                    />
                )}

                <Whiteboard content={props.whiteboardContent || null} />

                <OrbitControls ref={orbitControlsRef} makeDefault dampingFactor={0.05} />

                    {!props.isPerformanceMode && (
                        <EffectComposer>
                            <Bloom
                                luminanceThreshold={1.2}
                                mipmapBlur
                                intensity={0.6}
                                radius={0.4}
                            />
                            <Vignette
                                eskil={false}
                                offset={0.1}
                                darkness={0.4}
                            />
                        </EffectComposer>
                    )}
                </Suspense>
            </Canvas>
        </div>
    );
};

export default LabScene;
