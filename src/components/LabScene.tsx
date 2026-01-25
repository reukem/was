import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createTable, createBeakerGeometry, createGlassMaterial, createLiquidMaterial, createLabel, createTesterMesh } from '../utils/threeHelpers';
import { ContainerState } from '../types';
import { CHEMICALS } from '../constants';

interface LabSceneProps {
    containers: ContainerState[];
    lastEffect: string | null;
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (sourceId: string, targetId: string) => void;
}

const LabScene: React.FC<LabSceneProps> = ({ containers, lastEffect, onMove, onPour }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);

    const meshesRef = useRef<Map<string, THREE.Group>>(new Map());
    const liquidsRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const testerRef = useRef<{ group: THREE.Group, texture: THREE.CanvasTexture, canvas: HTMLCanvasElement } | null>(null);

    const raycaster = useRef(new THREE.Raycaster());
    const pointer = useRef(new THREE.Vector2());
    const draggedItem = useRef<{ id: string, offset: THREE.Vector3, originalPos: THREE.Vector3 } | null>(null);
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

    const onMoveRef = useRef(onMove);
    const onPourRef = useRef(onPour);

    useEffect(() => {
        onMoveRef.current = onMove;
        onPourRef.current = onPour;
    }, [onMove, onPour]);

    // Handle Effects (Explosion Shake & Heat Glow)
    useEffect(() => {
        if (lastEffect === 'explosion' && cameraRef.current) {
            const originalPos = cameraRef.current.position.clone();
            let count = 0;
            const shake = () => {
                if (count < 25 && cameraRef.current) {
                    cameraRef.current.position.x = originalPos.x + (Math.random() - 0.5) * 0.7;
                    cameraRef.current.position.y = originalPos.y + (Math.random() - 0.5) * 0.7;
                    count++;
                    requestAnimationFrame(shake);
                } else if (cameraRef.current) {
                    cameraRef.current.position.copy(originalPos);
                }
            };
            shake();
        }
    }, [lastEffect]);

    const updateTesterDisplay = (chemId: string | null, temp?: number) => {
        if (!testerRef.current) return;
        const ctx = testerRef.current.canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = '#22c55e';
        ctx.textAlign = 'center';
        if (chemId) {
            const chem = CHEMICALS[chemId];
            ctx.font = 'bold 16px monospace';
            ctx.fillText(`pH: ${chem.ph}`, 64, 20);
            ctx.font = 'bold 14px monospace';
            ctx.fillText(`${temp || 25}°C`, 64, 40);
            ctx.font = '10px monospace';
            ctx.fillText(chem.name.substring(0, 15).toUpperCase(), 64, 55);
        } else {
            ctx.font = 'bold 20px monospace';
            ctx.fillText('READY', 64, 40);
        }
        testerRef.current.texture.needsUpdate = true;
    };

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 7, 12);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.localClippingEnabled = true;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2.2;
        controlsRef.current = controls;

        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const spotLight = new THREE.SpotLight(0xffffff, 2.0);
        spotLight.position.set(5, 15, 5);
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        scene.add(spotLight);

        scene.add(createTable());

        const shelf = new THREE.Mesh(
            new THREE.BoxGeometry(10, 0.1, 2.5),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
        );
        shelf.position.set(0, 0.5, -3.5);
        shelf.receiveShadow = true;
        scene.add(shelf);

        const tester = createTesterMesh();
        tester.group.position.set(4, 0, 1.5);
        tester.group.userData.id = 'TESTER_TOOL';
        scene.add(tester.group);
        testerRef.current = tester;
        meshesRef.current.set('TESTER_TOOL', tester.group);

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
                        group.position.y = THREE.MathUtils.lerp(group.position.y, 1.2, 0.2);
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
                        if (id !== otherId && !poured && otherId !== 'TESTER_TOOL') {
                            const dist = myPos.distanceTo(otherGroup.position);
                            if (dist < 1.6) {
                                onPourRef.current(id, otherId);
                                poured = true;
                            }
                        }
                    });

                    const containerData = containers.find(c => c.id === id);
                    if (containerData?.initialPosition) {
                        const initPos = new THREE.Vector3(...containerData.initialPosition);
                        const duration = 20;
                        let frame = 0;
                        const returnAnim = () => {
                            if (frame < duration && group) {
                                group.position.lerp(initPos, 0.2);
                                frame++;
                                requestAnimationFrame(returnAnim);
                            } else if (group) {
                                group.position.copy(initPos);
                                onMoveRef.current(id, [initPos.x, initPos.y, initPos.z]);
                            }
                        };
                        returnAnim();
                    } else {
                        group.position.y = 0;
                        onMoveRef.current(id, [group.position.x, 0, group.position.z]);
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

            if (testerRef.current) {
                let foundChem = null;
                let foundTemp = 25;
                const testerPos = testerRef.current.group.position;
                containers.forEach(c => {
                    const cPos = new THREE.Vector3(...c.position);
                    if (testerPos.distanceTo(cPos) < 1.5 && c.contents) { // Increased distance to 1.5
                        foundChem = c.contents.chemicalId;
                        foundTemp = c.contents.temperature || 25;
                    }
                });
                updateTesterDisplay(foundChem, foundTemp);
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
        if (!sceneRef.current) return;

        meshesRef.current.forEach((group, id) => {
            if (id !== 'TESTER_TOOL' && !containers.find(c => c.id === id)) {
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

                const isBeaker = !container.id.startsWith('source_');

                if (isBeaker) {
                    const beakerGeo = createBeakerGeometry(0.5, 1.2);
                    const beaker = new THREE.Mesh(beakerGeo, createGlassMaterial());
                    beaker.castShadow = true;
                    // Important for glass transparency sorting
                    beaker.renderOrder = 2;
                    group.add(beaker);

                    const liquidGeo = new THREE.CylinderGeometry(0.48, 0.48, 1, 32);
                    liquidGeo.translate(0, 0.5, 0);
                    liquidMesh = new THREE.Mesh(liquidGeo, createLiquidMaterial(0xffffff));
                    liquidMesh.scale.set(1, 0.01, 1);
                    liquidMesh.renderOrder = 1; // Liquid rendered before glass for correct transparency
                    group.add(liquidMesh);
                    liquidsRef.current.set(container.id, liquidMesh);
                } else {
                    const chem = CHEMICALS[container.contents?.chemicalId || 'H2O'];
                    const color = chem.color;
                    const mesh = chem.type === 'solid'
                        ? new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }))
                        : new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5), new THREE.MeshStandardMaterial({ color, roughness: 0.3 }));
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
                group.position.set(...container.position);
            }

            if (liquidMesh && container.contents) {
                const targetScaleY = Math.max(0.01, container.contents.volume * 1.15);
                liquidMesh.scale.y = THREE.MathUtils.lerp(liquidMesh.scale.y, targetScaleY, 0.1);

                const baseColor = new THREE.Color(container.contents.color);
                const mat = liquidMesh.material as THREE.MeshPhysicalMaterial;

                // Heat glow effect
                const temp = container.contents.temperature || 25;
                if (temp > 100) {
                    const heatFactor = Math.min((temp - 100) / 500, 1);
                    const glowColor = new THREE.Color(baseColor).lerp(new THREE.Color(0xff4400), heatFactor);
                    mat.color.copy(glowColor);
                    mat.emissive.copy(new THREE.Color(0xff0000));
                    mat.emissiveIntensity = heatFactor * 0.8;
                } else {
                    mat.color.copy(baseColor);
                    mat.emissive.set(baseColor);
                    mat.emissiveIntensity = 0.05;
                }
            }
        });
    }, [containers]);

    return <div ref={mountRef} className="w-full h-full relative" />;
};

export default LabScene;
