import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CHEMICALS } from '../constants';
import { ContainerState } from '../types';
import { PhysicsEngine } from '../systems/PhysicsEngine';
import { ExplosionVFX } from './ExplosionVFX';

// -----------------------------------------------------------------------------
// 1. ASSETS & MATERIALS (PHASE 1: TRIPLE-A UPGRADE)
// -----------------------------------------------------------------------------

const GLASS_MATERIAL_PROPS = {
    transmission: 1,
    thickness: 0.2,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    ior: 1.5,
    transparent: true,
    color: '#ffffff'
};

const LIQUID_MATERIAL_PROPS = {
    metalness: 0.1,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
};

// Recreated Geometries (Declarative)
const FlaskGeometry = ({ children }: { children?: React.ReactNode }) => {
    const points = useMemo(() => {
        const p = [];
        for (let i = 0; i <= 40; i++) {
            const t = i / 40;
            const x = Math.sin(t * Math.PI) * 0.45 + 0.1;
            p.push(new THREE.Vector2(x, t * 0.8));
        }
        p.push(new THREE.Vector2(0.12, 0.8));
        p.push(new THREE.Vector2(0.12, 1.15));
        p.push(new THREE.Vector2(0.18, 1.17));
        p.push(new THREE.Vector2(0.18, 1.20));
        p.push(new THREE.Vector2(0.11, 1.20));
        return p;
    }, []);
    return (
        <group>
             <mesh castShadow receiveShadow>
                <latheGeometry args={[points, 128]} />
                <meshPhysicalMaterial {...GLASS_MATERIAL_PROPS} />
            </mesh>
            {children}
        </group>
    );
};

const BeakerGeometry = ({ children }: { children?: React.ReactNode }) => {
    const points = useMemo(() => {
        const p = [];
        p.push(new THREE.Vector2(0, 0));
        p.push(new THREE.Vector2(0.5, 0));
        p.push(new THREE.Vector2(0.5, 1.2));
        p.push(new THREE.Vector2(0.58, 1.23));
        p.push(new THREE.Vector2(0.58, 1.27));
        p.push(new THREE.Vector2(0.47, 1.27));
        return p;
    }, []);
    return (
        <group>
            <mesh castShadow receiveShadow>
                <latheGeometry args={[points, 128]} />
                <meshPhysicalMaterial {...GLASS_MATERIAL_PROPS} />
            </mesh>
            {children}
        </group>
    );
};

const Liquid = ({ color, volume, isFlask }: { color: string; volume: number; isFlask?: boolean }) => {
    if (volume <= 0.01) return null;

    // Scale height based on volume
    const height = Math.max(0.1, volume * (isFlask ? 0.8 : 1.1));
    const radius = isFlask ? 0.4 : 0.46;

    return (
        <mesh position={[0, height / 2 + 0.05, 0]} castShadow>
            {isFlask ? <coneGeometry args={[radius, height, 32]} /> : <cylinderGeometry args={[radius, radius, height, 32]} />}
            <meshStandardMaterial {...LIQUID_MATERIAL_PROPS} color={color} />
        </mesh>
    );
};

// -----------------------------------------------------------------------------
// 2. SCENE COMPONENTS
// -----------------------------------------------------------------------------

const Table = () => (
    <group>
        {/* Table Top */}
        <mesh receiveShadow position={[0, -0.1, 0]}>
            <boxGeometry args={[14, 0.2, 8]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.5} />
        </mesh>
        {/* Quantum Grid */}
        <gridHelper args={[12, 24, 0xf59e0b, 0x4a044e]} position={[0, 0.01, 0]}>
            <meshBasicMaterial transparent opacity={0.6} color={0xfbbf24} />
        </gridHelper>
        {/* Emissive Rim */}
        <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[14.05, 0.22, 8.05]} />
            <meshBasicMaterial color={0xea580c} transparent opacity={0.3} side={THREE.BackSide} />
        </mesh>
        {/* Shelf */}
        <mesh position={[0, 0.5, -3.5]} receiveShadow>
            <boxGeometry args={[10, 0.1, 2.5]} />
            <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.1} />
        </mesh>
    </group>
);

const Heater = ({ temp }: { temp: number }) => {
    // Glow calculation
    const t = (temp - 25) / 975;
    const glowColor = new THREE.Color().setHSL(0.05 + (0.05 * (1 - t)), 1.0, 0.5 * t);

    return (
        <group position={[-1.5, 0.19, 0]}>
             <mesh castShadow receiveShadow>
                <boxGeometry args={[1.2, 0.15, 1.2]} />
                <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
             </mesh>
             {/* Plate */}
             <mesh position={[0, 0.1, 0]}>
                 <cylinderGeometry args={[0.5, 0.5, 0.05, 32]} />
                 <meshStandardMaterial
                    color="#334155"
                    emissive={glowColor}
                    emissiveIntensity={t * 2.0}
                    roughness={0.6}
                    metalness={0.5}
                 />
             </mesh>
             {/* Label */}
             <Html position={[0, 0.2, 0.7]} center transform scale={0.2}>
                 <div className="bg-slate-900 text-orange-500 font-mono text-xs px-2 py-1 rounded border border-orange-500/50">
                     HEAT: {temp}°C
                 </div>
             </Html>
        </group>
    );
};

const Analyzer = ({ containers }: { containers: ContainerState[] }) => {
    const pos = new THREE.Vector3(4, 0, 1.5);
    // Find closest container
    const closest = useMemo<ContainerState | null>(() => {
        let min = Infinity;
        let found: ContainerState | null = null;
        containers.forEach(c => {
            const d = new THREE.Vector3(...c.position).distanceTo(pos);
            if (d < 1.5 && d < min) {
                min = d;
                found = c;
            }
        });
        return found;
    }, [containers]);

    const displayData = closest && closest.contents
        ? {
            name: CHEMICALS[closest.contents.chemicalId].name,
            ph: CHEMICALS[closest.contents.chemicalId].ph,
            temp: closest.contents.temperature || 25
          }
        : { name: 'CHỜ', ph: '--', temp: '--' };

    return (
        <group position={[4, 0.4, 1.5]}>
             <mesh castShadow>
                 <boxGeometry args={[0.5, 0.8, 0.3]} />
                 <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.8} />
             </mesh>
             {/* Screen */}
             <Html position={[0, 0.1, 0.16]} transform scale={0.1} center>
                 <div className="w-64 h-32 bg-slate-900 border-2 border-green-500 rounded p-2 flex flex-col items-center justify-center font-mono text-green-400">
                     <div className="text-lg font-bold text-center leading-none mb-2">{displayData.name}</div>
                     <div className="text-2xl font-bold">pH: {displayData.ph}</div>
                     <div className="text-sm">{displayData.temp}°C</div>
                 </div>
             </Html>
        </group>
    );
};

// -----------------------------------------------------------------------------
// 3. INTERACTIVE CONTAINER COMPONENT
// -----------------------------------------------------------------------------

const DraggableContainer = ({
    container,
    onMove,
    onPour,
    onDrop,
    containers
}: {
    container: ContainerState;
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (src: string, tgt: string) => void;
    onDrop: (src: string, tgt: string) => void;
    containers: ContainerState[];
}) => {
    const group = useRef<THREE.Group>(null);
    const [dragging, setDragging] = useState(false);
    const { camera, raycaster, gl } = useThree();
    const planeNormal = new THREE.Vector3(0, 1, 0);
    const planeConstant = 0; // y = 0 plane (table)
    const plane = useMemo(() => new THREE.Plane(planeNormal, planeConstant), []);

    // Drag Logic
    const bind = {
        onPointerDown: (e: any) => {
            e.stopPropagation();
            // @ts-ignore
            e.target.setPointerCapture(e.pointerId);
            setDragging(true);
        },
        onPointerUp: (e: any) => {
            e.stopPropagation();
            // @ts-ignore
            e.target.releasePointerCapture(e.pointerId);
            setDragging(false);
            if (group.current) {
                // Check interactions
                const myPos = group.current.position;
                let interacted = false;

                // 1. Drop/Pour Check
                containers.forEach(other => {
                    if (other.id !== container.id) {
                        const targetPos = new THREE.Vector3(...other.position);
                        const myChem = CHEMICALS[container.contents?.chemicalId || ''];

                        if (PhysicsEngine.checkDropCondition(myPos, targetPos, myChem?.type || 'liquid')) {
                             onDrop(container.id, other.id);
                             interacted = true;
                        } else if (PhysicsEngine.checkPourCondition(myPos, targetPos, container.id, other.id)) {
                             onPour(container.id, other.id);
                             interacted = true;
                        }
                    }
                });

                // 2. Heater Snap
                if (!interacted) {
                    const heaterPos = new THREE.Vector3(-1.5, 0, 0);
                    const distToHeater = new THREE.Vector2(myPos.x, myPos.z).distanceTo(new THREE.Vector2(heaterPos.x, heaterPos.z));
                    if (distToHeater < 0.6) {
                        onMove(container.id, [-1.5, 0.42, 0]); // Snap to heater
                    } else if (container.initialPosition) {
                         // Return to shelf if source
                         onMove(container.id, container.initialPosition);
                    } else {
                         // Drop to table
                         onMove(container.id, [myPos.x, 0.11, myPos.z]);
                    }
                }
            }
        },
        onPointerMove: (e: any) => {
            if (dragging && group.current) {
                e.stopPropagation();
                // R3F updates raycaster automatically before this event
                // But we need intersection with the plane, not just the object
                const planeIntersect = new THREE.Vector3();
                const result = raycaster.ray.intersectPlane(plane, planeIntersect);
                if (result) {
                    // Smooth lift effect with ref-based update for performance
                    // Lock Y axis to prevent sinking, but lift slightly to show 'held' state
                    group.current.position.set(result.x, 0.5, result.z);
                }
            }
        }
    };

    // Sync position when not dragging
    useFrame(() => {
        if (!dragging && group.current) {
             group.current.position.lerp(new THREE.Vector3(...container.position), 0.1);
        }
    });

    const chem = container.contents ? CHEMICALS[container.contents.chemicalId] : null;

    return (
        <group ref={group} {...bind} position={container.position}>
             {/* Render Geometry based on type */}
             {!container.id.startsWith('source_') ? (
                 <BeakerGeometry>
                     {container.contents && (
                         <Liquid
                            color={container.contents.color}
                            volume={container.contents.volume}
                         />
                     )}
                     {container.contents && (
                         <Html position={[0, 1.5, 0]} center>
                            <div className="text-white text-[10px] font-bold drop-shadow-md whitespace-nowrap bg-black/50 px-1 rounded">
                                {CHEMICALS[container.contents.chemicalId].name}
                            </div>
                         </Html>
                     )}
                 </BeakerGeometry>
             ) : (
                 // Source Containers (Shelf items)
                 <group>
                     {chem?.meshStyle === 'flask' && (
                         <FlaskGeometry>
                             <Liquid color={chem.color} volume={0.8} isFlask />
                         </FlaskGeometry>
                     )}
                     {chem?.meshStyle === 'rock' && (
                         <mesh castShadow receiveShadow>
                             <icosahedronGeometry args={[0.3, 1]} />
                             <meshStandardMaterial color={chem.color} roughness={0.9} />
                         </mesh>
                     )}
                     {chem?.meshStyle === 'mound' && (
                         <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
                             <coneGeometry args={[0.4, 0.4, 64]} />
                             <meshStandardMaterial color={chem.color} roughness={1} />
                         </mesh>
                     )}
                     {/* Labels for shelf items */}
                     <Html position={[0, 1.2, 0]} center>
                        <div className="text-white text-xs font-bold drop-shadow-md whitespace-nowrap">
                            {chem?.name}
                        </div>
                     </Html>
                 </group>
             )}
        </group>
    );
};

// -----------------------------------------------------------------------------
// 4. MAIN SCENE
// -----------------------------------------------------------------------------

const LabScene: React.FC<{
    heaterTemp: number;
    containers: ContainerState[];
    lastEffect: string | null;
    lastEffectPos: [number, number, number] | null;
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (src: string, tgt: string) => void;
    onDrop: (src: string, tgt: string) => void;
}> = ({ heaterTemp, containers, lastEffect, lastEffectPos, onMove, onPour, onDrop }) => {

    // Scene Setup Component to handle specific WebGL directives
    const SceneSetup = () => {
        const { gl, scene } = useThree();
        useEffect(() => {
             // CRITICAL FIX: Ensure transparent background for CSS sunset to show through
             gl.setClearColor(0x000000, 0);
             scene.background = null;
        }, [gl, scene]);
        return null;
    };

    return (
        <Canvas
            shadows
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
            camera={{ position: [0, 8, 12], fov: 45 }}
            style={{ background: 'transparent' }}
        >
            <SceneSetup />
            <ExplosionVFX position={lastEffectPos || [0, 0, 0]} isActive={lastEffect === 'explosion'} />
            {/* LIGHTING: SUNSET HACKER HYBRID */}
            <ambientLight intensity={0.6} color="#bae6fd" />
            <spotLight
                position={[5, 12, 5]}
                angle={Math.PI / 5}
                penumbra={0.6}
                intensity={120}
                castShadow
                color="#ffedd5"
                shadow-bias={-0.0001}
            />
            <directionalLight position={[0, 5, -8]} intensity={2.5} color="#fdc4b6" />
            <pointLight position={[6, 4, -2]} intensity={1.0} color="#fbcfe8" />
            <pointLight position={[-6, 4, -2]} intensity={1.0} color="#fdba74" />

            <Environment preset="studio" background={false} />

            <group position={[0, 0, 0]}>
                <Table />
                <Heater temp={heaterTemp} />
                <Analyzer containers={containers} />

                {containers.map(container => (
                    <DraggableContainer
                        key={container.id}
                        container={container}
                        onMove={onMove}
                        onPour={onPour}
                        onDrop={onDrop}
                        containers={containers}
                    />
                ))}
            </group>

            <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
        </Canvas>
    );
};

export default LabScene;
