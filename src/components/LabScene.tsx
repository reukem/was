import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    createTable,
    createBeakerGeometry,
    createGlassMaterial,
    createLiquidMaterial,
    createLemonMesh,
    createBoxMesh,
    createRockMesh,
    createBottleMesh,
    createSoapBottleMesh,
    createTesterMesh,
    createLabel
} from '../utils/GeometryFactory';
import { getChemical } from '../systems/ChemicalDatabase';
import { ContainerState } from '../types/ChemistryTypes';

interface LabSceneProps {
    containers: ContainerState[];
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (sourceId: string, targetId: string) => void;
}

const LabScene: React.FC<LabSceneProps> = ({ containers, onMove, onPour }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    // State management for Three.js objects
    const meshesRef = useRef<Map<string, THREE.Group>>(new Map());
    const liquidsRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const testerRef = useRef<{ mesh: THREE.Group, canvas: HTMLCanvasElement, texture: THREE.CanvasTexture } | null>(null);

    // Interaction Refs
    const raycaster = useRef(new THREE.Raycaster());
    const pointer = useRef(new THREE.Vector2());
    const draggedItem = useRef<{ id: string, offset: THREE.Vector3 } | null>(null);
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)); // Horizontal plane at y=0

    // Refs for callbacks
    const onMoveRef = useRef(onMove);
    const onPourRef = useRef(onPour);
    const [isSceneReady, setIsSceneReady] = useState(false);

    useEffect(() => {
        onMoveRef.current = onMove;
        onPourRef.current = onPour;
    }, [onMove, onPour]);

    // Helper to update screen
    const updateTesterScreen = (tester: {canvas: HTMLCanvasElement, texture: THREE.CanvasTexture}, chemId: string | null, vol?: number) => {
        const ctx = tester.canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0,0,128,64);

        if (chemId) {
             const chem = getChemical(chemId);
             if (chem) {
                 ctx.fillStyle = '#22c55e';
                 ctx.font = 'bold 20px monospace';
                 ctx.textAlign = 'center';
                 ctx.fillText(`pH: ${chem.ph}`, 64, 25);
                 ctx.font = '12px monospace';
                 ctx.fillText(`${chem.name.substring(0, 15)}`, 64, 50);
             }
        } else {
             ctx.fillStyle = '#22c55e';
             ctx.font = 'bold 20px monospace';
             ctx.textAlign = 'center';
             ctx.fillText('READY', 64, 32);
        }
        tester.texture.needsUpdate = true;
    };

    useEffect(() => {
        if (!mountRef.current) return;

        // 1. Setup Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a); // Dark Blue Slate
        scene.fog = new THREE.Fog(0x0f172a, 5, 25);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 5, 8);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2.1;
        controlsRef.current = controls;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        scene.add(dirLight);

        // Table (Work Area)
        const table = createTable();
        table.position.y = -0.1;
        table.name = "TABLE";
        scene.add(table);

        // Shelf
        const shelfGeo = new THREE.BoxGeometry(8, 0.2, 2);
        const shelfMat = new THREE.MeshStandardMaterial({ color: 0x854d0e }); // Wood
        const shelf = new THREE.Mesh(shelfGeo, shelfMat);
        shelf.position.set(0, 0.5, -2);
        shelf.receiveShadow = true;
        scene.add(shelf);

        // Tester Tool
        const { mesh, canvas, texture } = createTesterMesh();
        mesh.userData.id = 'TESTER';
        mesh.position.set(2.5, 0, 0);
        scene.add(mesh);
        testerRef.current = { mesh, canvas, texture };
        meshesRef.current.set('TESTER', mesh);

        // Interaction Handlers
        const onPointerMove = (event: PointerEvent) => {
            pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

            if (draggedItem.current && cameraRef.current) {
                raycaster.current.setFromCamera(pointer.current, cameraRef.current);
                const target = new THREE.Vector3();
                raycaster.current.ray.intersectPlane(plane.current, target);

                if (target) {
                    const id = draggedItem.current.id;
                    const group = meshesRef.current.get(id);
                    if (group) {
                        group.position.copy(target.add(draggedItem.current.offset));
                        group.position.y = 1.0; // Lift
                    }
                }
            }
        };

        const animatePour = (group: THREE.Group) => {
            const startRot = group.rotation.clone();
            const duration = 500;
            const start = performance.now();

            const animate = (time: number) => {
                const elapsed = time - start;
                if (elapsed < duration) {
                    const phase = Math.sin((elapsed / duration) * Math.PI); // 0 -> 1 -> 0
                    // Tilt dependent on position relative to camera? Just tilt X for simplicity
                    group.rotation.x = startRot.x + (phase * Math.PI / 4);
                    requestAnimationFrame(animate);
                } else {
                    group.rotation.x = startRot.x;
                }
            };
            requestAnimationFrame(animate);
        };

        const onPointerDown = (event: PointerEvent) => {
            if (!cameraRef.current || !sceneRef.current) return;
            raycaster.current.setFromCamera(pointer.current, cameraRef.current);

            const objects: THREE.Object3D[] = [];
            meshesRef.current.forEach(group => objects.push(group));

            const intersects = raycaster.current.intersectObjects(objects, true);

            if (intersects.length > 0) {
                let target = intersects[0].object;
                while(target.parent && target.parent.type !== 'Scene') {
                     if (meshesRef.current.has(target.userData.id)) {
                         break;
                     }
                     target = target.parent;
                }

                if (target && meshesRef.current.has(target.userData.id)) {
                    controls.enabled = false;
                    const id = target.userData.id;
                    const intersectionPoint = intersects[0].point;
                    const offset = target.position.clone().sub(intersectionPoint);
                    offset.y = 0;
                    draggedItem.current = { id, offset };
                }
            }
        };

        const onPointerUp = () => {
            if (draggedItem.current) {
                const id = draggedItem.current.id;
                const group = meshesRef.current.get(id);
                if (group) {
                    // Pour detection (only if not Tester)
                    if (id !== 'TESTER') {
                        const myPos = group.position.clone();
                        let poured = false;

                        meshesRef.current.forEach((otherGroup, otherId) => {
                            if (id !== otherId && otherId !== 'TESTER' && !poured) {
                                const dist = myPos.distanceTo(otherGroup.position);
                                if (dist < 1.5) {
                                    onPourRef.current(id, otherId);
                                    poured = true;
                                    animatePour(group);
                                }
                            }
                        });
                    }

                    // Drop logic
                    group.position.y = 0;
                    if (group.position.z < -1) {
                         group.position.y = 0.6; // On Shelf
                    } else {
                         group.position.y = 0; // On Table
                    }

                    // Only update React state if it's a known container
                    if (id !== 'TESTER') {
                        onMoveRef.current(id, [group.position.x, group.position.y, group.position.z]);
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

            // Tester Logic
            if (testerRef.current && meshesRef.current) {
                const testerPos = testerRef.current.mesh.position;
                let found = false;

                // Check proximity to Beakers (not Sources)
                meshesRef.current.forEach((group, id) => {
                    if (id === 'TESTER') return;
                    if (id.startsWith('source_')) return;

                    const dist = testerPos.distanceTo(group.position);
                    if (dist < 1.0) {
                        // Find data in containers prop, since props are updated
                        // But wait, animate closes over initial props?
                        // No, `containers` prop updates trigger the 2nd useEffect.
                        // But we need access to the *latest* containers inside animate loop.
                        // The `animate` function is defined once. `containers` variable is stale!

                        // Fix: We need a ref to containers
                        found = true;
                        // See containersRef hack below
                    }
                });

                // Actually, reading from DOM/Three userData might be safer or use a Ref for containers
            }

            renderer.render(scene, camera);
        };
        // animate(); -> Moved below to wrap containersRef

        const handleResize = () => {
            if (!mountRef.current) return;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
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
            // Stop animation?
            // In a real app we'd cancelAnimationFrame
        };
    }, []);

    // Ref to access latest containers in animate loop
    const containersRef = useRef(containers);
    useEffect(() => {
        containersRef.current = containers;
    }, [containers]);

    // Animate Loop with access to latest state
    useEffect(() => {
        // We need to attach the animate loop here or use a Ref in the main loop
        // Let's use a Ref for the requestAnimationFrame ID
        let rAF: number;

        const animate = () => {
            rAF = requestAnimationFrame(animate);
            if (controlsRef.current) controlsRef.current.update();

            // Tester Logic
            if (testerRef.current && meshesRef.current) {
                const testerPos = testerRef.current.mesh.position;
                let found = false;

                containersRef.current.forEach(container => {
                    const group = meshesRef.current.get(container.id);
                    if (group && !container.id.startsWith('source_')) {
                        const dist = testerPos.distanceTo(group.position);
                        if (dist < 1.0 && container.contents) {
                            found = true;
                            updateTesterScreen(testerRef.current!, container.contents.chemicalId, container.contents.volume);
                        }
                    }
                });

                if (!found) {
                     updateTesterScreen(testerRef.current!, null);
                }
            }

            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();

        return () => {
            cancelAnimationFrame(rAF);
        };
    }, []); // Run once, but it accesses containersRef.current which is updated.

    // Sync React State with Three.js
    useEffect(() => {
        if (!sceneRef.current || !isSceneReady) return;

        // 1. Remove old
        meshesRef.current.forEach((group, id) => {
            if (id === 'TESTER') return; // PROTECT THE TESTER
            if (!containers.find(c => c.id === id)) {
                sceneRef.current?.remove(group);
                meshesRef.current.delete(id);
                liquidsRef.current.delete(id);
            }
        });

        // 2. Add/Update
        containers.forEach(container => {
            let group = meshesRef.current.get(container.id);
            let liquidMesh = liquidsRef.current.get(container.id);

            if (!group) {
                group = new THREE.Group();
                group.userData.id = container.id;

                const isSource = container.id.startsWith('source_');
                const chemId = container.contents?.chemicalId;
                let mesh;

                if (isSource && chemId) {
                    switch(chemId) {
                        case 'LEMON_JUICE': mesh = createLemonMesh(); break;
                        case 'BAKING_SODA': mesh = createBoxMesh(0xf97316); break;
                        case 'VINEGAR': mesh = createBottleMesh(0xffffff); break;
                        case 'SOAP': mesh = createSoapBottleMesh(0xbae6fd); break;
                        case 'BLEACH': mesh = createBottleMesh(0xfde047); break;
                        case 'SUGAR': mesh = createBoxMesh(0xffffff); break;
                        case 'POLONIUM': mesh = createRockMesh(0x94a3b8); break;
                        case 'RADIUM': mesh = createRockMesh(0x4ade80, true); break;
                        default: mesh = createBottleMesh(0xcccccc);
                    }
                    group.add(mesh);

                    const chem = getChemical(chemId);
                    if (chem) {
                        const label = createLabel(chem.name);
                        label.position.y = 1.5;
                        group.add(label);
                    }
                } else {
                    const beakerGeo = createBeakerGeometry(0.5, 1.2);
                    const glassMat = createGlassMaterial();
                    const beaker = new THREE.Mesh(beakerGeo, glassMat);
                    beaker.castShadow = true;
                    beaker.userData.id = container.id;
                    group.add(beaker);

                    const liquidGeo = new THREE.CylinderGeometry(0.45, 0.45, 1, 32);
                    liquidGeo.translate(0, 0.5, 0);
                    const liquidMat = createLiquidMaterial(0xffffff);
                    liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
                    liquidMesh.scale.set(1, 0.01, 1);
                    group.add(liquidMesh);
                    liquidsRef.current.set(container.id, liquidMesh);

                    const label = createLabel("Beaker");
                    label.position.y = 1.5;
                    group.add(label);
                }

                sceneRef.current?.add(group);
                meshesRef.current.set(container.id, group);
            }

            if (draggedItem.current?.id !== container.id) {
                group.position.set(...container.position);
            }

            if (liquidMesh && container.contents) {
                const targetScaleY = Math.max(0.01, container.contents.volume);
                liquidMesh.scale.set(1, targetScaleY, 1);
                (liquidMesh.material as THREE.MeshPhysicalMaterial).color.set(container.contents.color);
            }
        });

    }, [containers, isSceneReady]);

    return (
        <div className="lab-scene">
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default LabScene;
