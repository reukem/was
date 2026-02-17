import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Text } from '@react-three/drei';

interface MolecularViewProps {
    mode: 'dissolve' | 'neutralization' | 'precipitation' | 'generic';
    onClose: () => void;
}

const AtomInstances: React.FC<{ count: number; color: string; radius: number; speed: number; type: 'water' | 'ion_pos' | 'ion_neg' }> = ({ count, color, radius, speed, type }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Initial positions
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 10;
            const z = (Math.random() - 0.5) * 10;
            temp.push({
                pos: new THREE.Vector3(x, y, z),
                vel: new THREE.Vector3((Math.random()-0.5)*speed, (Math.random()-0.5)*speed, (Math.random()-0.5)*speed),
                rot: new THREE.Euler(Math.random(), Math.random(), Math.random())
            });
        }
        return temp;
    }, [count, speed]);

    useFrame((state) => {
        if (!meshRef.current) return;

        particles.forEach((p, i) => {
            // Physics Update
            p.pos.add(p.vel);

            // Bounds check (Cube)
            if (Math.abs(p.pos.x) > 5) p.vel.x *= -1;
            if (Math.abs(p.pos.y) > 5) p.vel.y *= -1;
            if (Math.abs(p.pos.z) > 5) p.vel.z *= -1;

            // Simple attraction for dissolving (Water attacks Ions)
            if (type === 'water') {
                // Water jiggles
                p.rot.x += 0.01;
                p.rot.y += 0.01;
            }

            dummy.position.copy(p.pos);
            dummy.rotation.copy(p.rot);
            dummy.scale.setScalar(1.0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <sphereGeometry args={[radius, 16, 16]} />
            <meshStandardMaterial color={color} roughness={0.2} metalness={0.5} />
        </instancedMesh>
    );
};

// Water Molecule (H2O) - Red O + 2 White H
// Using Instances for just Oxygen for now, simplistic.
// Better: Group logic. But InstancedMesh is faster.
// Let's stick to abstract spheres for "Atoms" to match the prompt "green and grey spheres".

const MolecularScene: React.FC<{ mode: string }> = ({ mode }) => {
    return (
        <group>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <OrbitControls autoRotate autoRotateSpeed={0.5} />

            {/* Background Grid */}
            <gridHelper args={[20, 20, 0x444444, 0x222222]} rotation={[Math.PI/2, 0, 0]} />

            {mode === 'dissolve' && (
                <>
                    {/* Water (Blueish) */}
                    <AtomInstances count={200} color="#3b82f6" radius={0.15} speed={0.05} type="water" />
                    {/* Na+ (Grey) */}
                    <AtomInstances count={30} color="#94a3b8" radius={0.3} speed={0.02} type="ion_pos" />
                    {/* Cl- (Green) */}
                    <AtomInstances count={30} color="#22c55e" radius={0.4} speed={0.02} type="ion_neg" />

                    <Text position={[0, 4, 0]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">
                        Hòa tan NaCl trong Nước
                    </Text>
                    <Text position={[0, 3.5, 0]} fontSize={0.3} color="#aaa" anchorX="center" anchorY="middle">
                        Các phân tử nước phân cực tách các ion Na+ và Cl- ra khỏi mạng tinh thể
                    </Text>
                </>
            )}

            {mode === 'neutralization' && (
                <>
                    {/* H+ (White/Red) */}
                    <AtomInstances count={50} color="#ef4444" radius={0.1} speed={0.1} type="ion_pos" />
                    {/* OH- (Blue) */}
                    <AtomInstances count={50} color="#3b82f6" radius={0.2} speed={0.08} type="ion_neg" />
                    {/* Water Result */}
                    <AtomInstances count={100} color="#06b6d4" radius={0.15} speed={0.02} type="water" />

                    <Text position={[0, 4, 0]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">
                        Phản ứng Trung Hòa
                    </Text>
                    <Text position={[0, 3.5, 0]} fontSize={0.3} color="#aaa" anchorX="center" anchorY="middle">
                         H⁺ + OH⁻ → H₂O
                    </Text>
                </>
            )}

             {mode === 'generic' && (
                <>
                    <AtomInstances count={100} color="#ffffff" radius={0.2} speed={0.05} type="water" />
                    <AtomInstances count={50} color="#ff0000" radius={0.2} speed={0.05} type="ion_pos" />
                </>
             )}
        </group>
    );
};

const MolecularView: React.FC<MolecularViewProps> = ({ mode, onClose }) => {
    return (
        <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col animate-in fade-in duration-700">
            <div className="absolute top-4 right-4 z-[110]">
                <button
                    onClick={onClose}
                    className="bg-slate-800 text-white px-4 py-2 rounded-full border border-white/20 hover:bg-slate-700 transition-all font-bold"
                >
                    ĐÓNG (CLOSE) ✕
                </button>
            </div>

            <div className="absolute top-4 left-4 z-[110] pointer-events-none">
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 tracking-tighter">
                    MOLECULAR ZOOM // {mode.toUpperCase()}
                </h2>
                <p className="text-xs text-slate-500 font-mono">QUANTUM REALITY ENGINE V1.0</p>
            </div>

            <div className="flex-1 cursor-move">
                <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
                    <MolecularScene mode={mode} />
                </Canvas>
            </div>
        </div>
    );
};

export default MolecularView;
