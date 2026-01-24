import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTable, createBeakerGeometry, createGlassMaterial, createLiquidMaterial } from '../utils/GeometryFactory';
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

    // Interaction Refs
    const raycaster = useRef(new THREE.Raycaster());
    const pointer = useRef(new THREE.Vector2());
    const draggedItem = useRef<{ id: string, offset: THREE.Vector3 } | null>(null);
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)); // Horizontal plane at y=0

    // Refs for callbacks to avoid stale closures in event listeners
    const onMoveRef = useRef(onMove);
    const onPourRef = useRef(onPour);

    useEffect(() => {
        onMoveRef.current = onMove;
        onPourRef.current = onPour;
    }, [onMove, onPour]);

    useEffect(() => {
        if (!mountRef.current) return;

        // 1. Setup Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a);
        scene.fog = new THREE.Fog(0x0f172a, 5, 25);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 6, 10);
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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        scene.add(dirLight);

        // Table
        const table = createTable();
        table.position.y = -0.1;
        table.name = "TABLE"; // Identify for raycasting if needed
        scene.add(table);

        // Interaction Handlers
        const onPointerMove = (event: PointerEvent) => {
            pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            pointer.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

            if (draggedItem.current && cameraRef.current) {
                raycaster.current.setFromCamera(pointer.current, cameraRef.current);
                const target = new THREE.Vector3();
                raycaster.current.ray.intersectPlane(plane.current, target);

                if (target) {
                    // Update React State (throttle this in real app, but direct mesh update for smoothness)
                    const id = draggedItem.current.id;
                    const group = meshesRef.current.get(id);
                    if (group) {
                        group.position.copy(target.add(draggedItem.current.offset));
                        // Lift slightly while dragging
                        group.position.y = 1.0;
                    }
                }
            }
        };

        const onPointerDown = (event: PointerEvent) => {
            if (!cameraRef.current || !sceneRef.current) return;
            raycaster.current.setFromCamera(pointer.current, cameraRef.current);

            // Find intersectable objects (beakers)
            const objects: THREE.Object3D[] = [];
            meshesRef.current.forEach(group => objects.push(group));

            const intersects = raycaster.current.intersectObjects(objects, true);

            if (intersects.length > 0) {
                // Find the parent group
                let target = intersects[0].object;
                while(target.parent && target.parent.type !== 'Scene') {
                     if (meshesRef.current.has(target.userData.id)) {
                         break;
                     }
                     target = target.parent;
                }

                if (target && meshesRef.current.has(target.userData.id)) {
                    controls.enabled = false; // Disable orbit
                    const id = target.userData.id;

                    const intersectionPoint = intersects[0].point;
                    const offset = target.position.clone().sub(intersectionPoint);
                    offset.y = 0; // Keep offset horizontal only

                    draggedItem.current = { id, offset };
                }
            }
        };

        const onPointerUp = () => {
            if (draggedItem.current) {
                const id = draggedItem.current.id;
                const group = meshesRef.current.get(id);
                if (group) {
                    // Check for pour target
                    const myPos = group.position.clone();
                    let poured = false;

                    meshesRef.current.forEach((otherGroup, otherId) => {
                        if (id !== otherId && !poured) {
                            const dist = myPos.distanceTo(otherGroup.position);
                            if (dist < 1.5) { // Threshold for pouring
                                onPourRef.current(id, otherId);
                                poured = true;
                                // Visual tilt could go here
                            }
                        }
                    });

                    // Drop to table
                    group.position.y = 0;
                    onMoveRef.current(id, [group.position.x, 0, group.position.z]);
                }
                draggedItem.current = null;
                controls.enabled = true;
            }
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp);

        // Loop
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!mountRef.current) return;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerUp);
            mountRef.current?.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []); // Run once for setup

    // Sync React State with Three.js
    useEffect(() => {
        if (!sceneRef.current) return;

        // 1. Remove old
        meshesRef.current.forEach((group, id) => {
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
                // Create New Beaker
                group = new THREE.Group();
                group.userData.id = container.id; // Tag for interaction

                const beakerGeo = createBeakerGeometry(0.5, 1.2);
                const glassMat = createGlassMaterial();
                const beaker = new THREE.Mesh(beakerGeo, glassMat);
                beaker.castShadow = true;
                beaker.userData.id = container.id; // Tag child too
                group.add(beaker);

                // Create Liquid
                const liquidGeo = new THREE.CylinderGeometry(0.45, 0.45, 1, 32);
                liquidGeo.translate(0, 0.5, 0); // Pivot at bottom
                const liquidMat = createLiquidMaterial(0xffffff);
                liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
                liquidMesh.scale.set(1, 0.01, 1); // Start empty/low
                group.add(liquidMesh);

                sceneRef.current?.add(group);
                meshesRef.current.set(container.id, group);
                liquidsRef.current.set(container.id, liquidMesh);
            }

            // Update Position (Only if not being dragged currently)
            if (draggedItem.current?.id !== container.id) {
                group.position.set(...container.position);
            }

            // Update Liquid
            if (liquidMesh && container.contents) {
                const targetScaleY = Math.max(0.01, container.contents.volume);
                liquidMesh.scale.set(1, targetScaleY, 1);
                (liquidMesh.material as THREE.MeshPhysicalMaterial).color.set(container.contents.color);
            } else if (liquidMesh) {
                liquidMesh.scale.set(1, 0.01, 1); // Empty
            }
        });

    }, [containers]);

    return (
        <div className="lab-scene">
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default LabScene;
