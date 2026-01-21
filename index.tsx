import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Types ---
type GameStatus = 'START' | 'PLAYING' | 'WON' | 'LOST_ENERGY' | 'LOST_TIME';

// --- Constants ---
const INITIAL_TIME = 60;
const INITIAL_ENERGY = 100;
const PASS_READINESS = 100;

const App: React.FC = () => {
    // Game State
    const [status, setStatus] = useState<GameStatus>('START');
    const [readiness, setReadiness] = useState(0);
    const [energy, setEnergy] = useState(INITIAL_ENERGY);
    const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
    const [isLightOn, setIsLightOn] = useState(true);
    
    // Three.js Refs
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const lampLightRef = useRef<THREE.PointLight | null>(null);
    const laptopScreenRef = useRef<THREE.Mesh | null>(null);

    // --- Three.js Initialization ---
    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050508);
        scene.fog = new THREE.FogExp2(0x050508, 0.08);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(5, 5, 5);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.maxPolarAngle = Math.PI / 2.1;
        controls.minDistance = 3;
        controls.maxDistance = 12;

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.15);
        scene.add(ambient);

        const moonlight = new THREE.DirectionalLight(0x4444ff, 0.3);
        moonlight.position.set(-5, 10, -5);
        scene.add(moonlight);

        const lampLight = new THREE.PointLight(0xffaa00, 2, 8);
        lampLight.position.set(2, 0.8, -1.5);
        lampLight.castShadow = true;
        scene.add(lampLight);
        lampLightRef.current = lampLight;

        // Room Geometry
        const mats = {
            floor: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }),
            wall: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 }),
            wood: new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.7 }),
            fabric: new THREE.MeshStandardMaterial({ color: 0x1e293b }),
            screenOff: new THREE.MeshStandardMaterial({ color: 0x111111 }),
            screenOn: new THREE.MeshBasicMaterial({ color: 0x60a5fa }),
            gold: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 })
        };

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), mats.floor);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;
        floor.receiveShadow = true;
        scene.add(floor);

        const wallB = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.2), mats.wall);
        wallB.position.set(0, 2, -5);
        wallB.receiveShadow = true;
        scene.add(wallB);

        const wallL = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.2), mats.wall);
        wallL.rotation.y = Math.PI / 2;
        wallL.position.set(-5, 2, 0);
        wallL.receiveShadow = true;
        scene.add(wallL);

        // Desk
        const desk = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 1.5), mats.wood);
        desk.position.set(1.5, -0.1, -1.5);
        desk.castShadow = true;
        desk.receiveShadow = true;
        scene.add(desk);

        const legGeo = new THREE.BoxGeometry(0.1, 0.9, 0.1);
        const l1 = new THREE.Mesh(legGeo, mats.wood); l1.position.set(0.1, -0.55, -0.8);
        const l2 = new THREE.Mesh(legGeo, mats.wood); l2.position.set(2.9, -0.55, -0.8);
        const l3 = new THREE.Mesh(legGeo, mats.wood); l3.position.set(0.1, -0.55, -2.2);
        const l4 = new THREE.Mesh(legGeo, mats.wood); l4.position.set(2.9, -0.55, -2.2);
        scene.add(l1, l2, l3, l4);

        // Bed
        const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 5), mats.wood);
        bedFrame.position.set(-3, -0.75, 0);
        scene.add(bedFrame);
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.4, 4.8), mats.fabric);
        mattress.position.set(-3, -0.4, 0);
        scene.add(mattress);

        // Laptop
        const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.6), new THREE.MeshStandardMaterial({color: 0x333333}));
        laptopBase.position.set(1.5, 0, -1.5);
        scene.add(laptopBase);
        const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05), mats.screenOn);
        laptopScreen.position.set(1.5, 0.25, -1.8);
        laptopScreen.rotation.x = 0.15;
        scene.add(laptopScreen);
        laptopScreenRef.current = laptopScreen;

        // Lamp
        const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8), mats.gold);
        lampPole.position.set(2.5, 0.35, -2);
        scene.add(lampPole);
        const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 16), mats.fabric);
        lampShade.position.set(2.5, 0.8, -2);
        scene.add(lampShade);

        // Particles
        const pointsGeo = new THREE.BufferGeometry();
        const coords = [];
        for(let i=0; i<500; i++) {
            coords.push((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20);
        }
        pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
        const pointsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.3 });
        const points = new THREE.Points(pointsGeo, pointsMat);
        scene.add(points);

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            points.rotation.y += 0.001;
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);

    // Update 3D components based on state
    useEffect(() => {
        if (lampLightRef.current) lampLightRef.current.intensity = isLightOn ? 2 : 0;
        if (laptopScreenRef.current) {
            laptopScreenRef.current.material = isLightOn ? 
                new THREE.MeshBasicMaterial({ color: 0x60a5fa }) : 
                new THREE.MeshStandardMaterial({ color: 0x111111 });
        }
    }, [isLightOn]);

    // Game Loop
    useEffect(() => {
        let timer: number;
        if (status === 'PLAYING') {
            timer = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setStatus('LOST_TIME');
                        return 0;
                    }
                    return prev - 1;
                });
                setEnergy(prev => {
                    const decay = 0.4;
                    if (prev <= decay) {
                        setStatus('LOST_ENERGY');
                        return 0;
                    }
                    return prev - decay;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [status]);

    // Interactions
    const handleStudy = useCallback(() => {
        if (status !== 'PLAYING') return;
        if (!isLightOn) return;
        
        setReadiness(prev => {
            const next = prev + 5;
            if (next >= PASS_READINESS) setStatus('WON');
            return Math.min(next, PASS_READINESS);
        });
        setEnergy(prev => Math.max(0, prev - 10));
    }, [status, isLightOn]);

    const handleSleep = useCallback(() => {
        if (status !== 'PLAYING') return;
        setEnergy(prev => Math.min(INITIAL_ENERGY, prev + 25));
    }, [status]);

    const toggleLight = useCallback(() => {
        if (status !== 'PLAYING') return;
        setIsLightOn(!isLightOn);
    }, [isLightOn, status]);

    const startGame = () => {
        setReadiness(0);
        setEnergy(INITIAL_ENERGY);
        setTimeLeft(INITIAL_TIME);
        setIsLightOn(true);
        setStatus('PLAYING');
    };

    return (
        <div className="game-container">
            <div ref={mountRef} className="three-mount" />

            {/* HUD */}
            {status === 'PLAYING' && (
                <div className="hud">
                    <div className="hud-header">
                        <div className="title">EDINBURGH CRUNCH</div>
                        <div className="timer">{timeLeft}s</div>
                    </div>
                    
                    <div className="stats">
                        <div className="stat-group">
                            <div className="stat-label">READINESS <span>{readiness}%</span></div>
                            <div className="bar-bg"><div className="bar-fill readiness" style={{width: `${readiness}%`}} /></div>
                        </div>
                        <div className="stat-group">
                            <div className="stat-label">ENERGY <span>{Math.floor(energy)}%</span></div>
                            <div className="bar-bg"><div className="bar-fill energy" style={{width: `${energy}%`}} /></div>
                        </div>
                    </div>

                    <div className="actions">
                        <button className={`action-btn ${!isLightOn ? 'disabled' : ''}`} onClick={handleStudy}>
                            <span className="icon">📚</span> Study
                        </button>
                        <button className="action-btn" onClick={handleSleep}>
                            <span className="icon">💤</span> Sleep
                        </button>
                        <button className="action-btn" onClick={toggleLight}>
                            <span className="icon">💡</span> {isLightOn ? 'Off' : 'On'}
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {(status === 'START' || status === 'WON' || status.startsWith('LOST')) && (
                <div className="modal-overlay">
                    <div className="modal">
                        {status === 'START' && (
                            <>
                                <h1>EXAM CRUNCH</h1>
                                <p>You have 60 seconds to reach 100% readiness. Don't pass out from exhaustion.</p>
                                <button className="start-btn" onClick={startGame}>BEGIN SESSION</button>
                            </>
                        )}
                        {status === 'WON' && (
                            <>
                                <h1 className="success">PASSED!</h1>
                                <p>Congratulations! You survived finals week at Edinburgh.</p>
                                <button className="start-btn" onClick={startGame}>RETRY</button>
                            </>
                        )}
                        {status === 'LOST_ENERGY' && (
                            <>
                                <h1 className="fail">COLLAPSED</h1>
                                <p>You neglected your sleep. Balance is vital for an engineer.</p>
                                <button className="start-btn" onClick={startGame}>TRY AGAIN</button>
                            </>
                        )}
                        {status === 'LOST_TIME' && (
                            <>
                                <h1 className="fail">FAILED</h1>
                                <p>The clock hit zero. The exam was harder than expected.</p>
                                <button className="start-btn" onClick={startGame}>TRY AGAIN</button>
                            </>
                        )}
                    </div>
                </div>
            )}
            
            <div className="watermark">Project: Edinburgh Sim v2.0</div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);