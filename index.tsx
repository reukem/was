import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

// --- Global Constants ---
const INITIAL_TIME = 90;
const INITIAL_ENERGY = 100;
const PASS_READINESS = 100;

type GameStatus = 'START' | 'PLAYING' | 'WON' | 'LOST_ENERGY' | 'LOST_TIME';

const App: React.FC = () => {
    const [status, setStatus] = useState<GameStatus>('START');
    const [readiness, setReadiness] = useState(0);
    const [energy, setEnergy] = useState(INITIAL_ENERGY);
    const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
    const [isLightOn, setIsLightOn] = useState(true);
    const [isJittering, setIsJittering] = useState(false);
    const [floatingTexts, setFloatingTexts] = useState<{id: number, text: string, x: number, y: number, color: string}[]>([]);
    const [logs, setLogs] = useState<string[]>(["KERNEL_BOOT_SUCCESS", "RENDER_INIT_STABLE", "READY_FOR_OPERATOR"]);

    const stateRef = useRef({ status, isLightOn, readiness, energy });
    useEffect(() => { stateRef.current = { status, isLightOn, readiness, energy }; }, [status, isLightOn, readiness, energy]);

    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const composerRef = useRef<EffectComposer | null>(null);
    const rgbShiftPassRef = useRef<ShaderPass | null>(null);
    const lampLightRef = useRef<THREE.SpotLight | null>(null);
    const fillLightRef = useRef<THREE.PointLight | null>(null);
    const volumetricConeRef = useRef<THREE.Mesh | null>(null);
    const clockHandRef = useRef<THREE.Mesh | null>(null);
    const interactablesRef = useRef<THREE.Object3D[]>([]);

    const addLog = (msg: string) => {
        setLogs(prev => [msg, ...prev].slice(0, 6));
    };

    const triggerFloatingText = (text: string, x: number, y: number, color: string = '#60a5fa') => {
        const id = Date.now();
        setFloatingTexts(prev => [...prev, { id, text, x, y, color }]);
        setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1500);
    };

    const handleStudy = useCallback((e?: {clientX: number, clientY: number}) => {
        if (stateRef.current.status !== 'PLAYING' || !stateRef.current.isLightOn) return;
        setReadiness(prev => {
            const next = prev + 5;
            if (next >= PASS_READINESS) setStatus('WON');
            return Math.min(next, PASS_READINESS);
        });
        setEnergy(prev => Math.max(0, prev - 6));
        addLog(`EXE: STUDY_SESSION [R+5, E-6]`);
        if (e) triggerFloatingText("+5 READINESS", e.clientX, e.clientY, '#34d399');
    }, []);

    const handleSleep = useCallback((e?: {clientX: number, clientY: number}) => {
        if (stateRef.current.status !== 'PLAYING') return;
        setEnergy(prev => Math.min(INITIAL_ENERGY, prev + 20));
        addLog("SYS: RECOVERY_INIT");
        if (e) triggerFloatingText("+20 ENERGY", e.clientX, e.clientY, '#fbbf24');
    }, []);

    const handleCoffee = useCallback((e?: {clientX: number, clientY: number}) => {
        if (stateRef.current.status !== 'PLAYING') return;
        setReadiness(prev => Math.min(PASS_READINESS, prev + 12));
        setEnergy(prev => Math.max(0, prev - 12));
        setIsJittering(true);
        addLog("ALRT: NEURAL_OVERDRIVE");
        setTimeout(() => setIsJittering(false), 2500);
        if (e) triggerFloatingText("CAFFEINE_SPIKE", e.clientX, e.clientY, '#60a5fa');
    }, []);

    const toggleLight = useCallback(() => {
        if (stateRef.current.status !== 'PLAYING') return;
        setIsLightOn(prev => !prev);
        addLog(isLightOn ? "ENV: LIGHT_OFF" : "ENV: LIGHT_ON");
    }, [isLightOn]);

    const startGame = () => {
        setReadiness(0);
        setEnergy(INITIAL_ENERGY);
        setTimeLeft(INITIAL_TIME);
        setIsLightOn(true);
        setStatus('PLAYING');
        addLog("SIM_ACTIVE: MISSION_CRITICAL");
    };

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000103);
        scene.fog = new THREE.FogExp2(0x000103, 0.035);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(7, 4.5, 9);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true, 
            powerPreference: "high-performance"
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(pixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.8;
        mountRef.current.appendChild(renderer.domElement);

        const composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.4, 0.4, 0.3
        );
        composer.addPass(bloomPass);

        const rgbShiftPass = new ShaderPass(RGBShiftShader);
        rgbShiftPass.uniforms['amount'].value = 0.0012;
        composer.addPass(rgbShiftPass);
        rgbShiftPassRef.current = rgbShiftPass;
        composerRef.current = composer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2.05;
        controls.enableZoom = true;
        controls.enablePan = false;

        const ambient = new THREE.AmbientLight(0x223355, 0.2); 
        scene.add(ambient);

        const moonLight = new THREE.DirectionalLight(0xaaccff, 0.8);
        moonLight.position.set(-15, 25, -12);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.set(1024, 1024);
        scene.add(moonLight);

        const moon = new THREE.Group();
        const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        const moonGlow = new THREE.Mesh(
            new THREE.SphereGeometry(3.5, 32, 32), 
            new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending })
        );
        moon.add(moonMesh, moonGlow);
        moon.position.set(-30, 28, -40);
        scene.add(moon);

        const lampLight = new THREE.SpotLight(0xffcc44, 40, 25, Math.PI / 3.8, 0.25, 1.2);
        lampLight.position.set(2.8, 2.2, -3.2);
        lampLight.target.position.set(1.5, 0.2, -2.5);
        lampLight.castShadow = true;
        scene.add(lampLight);
        scene.add(lampLight.target);
        lampLightRef.current = lampLight;

        const lampFill = new THREE.PointLight(0xff9944, 1, 8);
        lampFill.position.set(2.8, 1.5, -3.2);
        scene.add(lampFill);
        fillLightRef.current = lampFill;

        const beam = new THREE.Mesh(
            new THREE.ConeGeometry(2.2, 7, 32, 1, true),
            new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
        );
        beam.position.set(2.8, -1.3, -3.2);
        beam.rotation.x = Math.PI;
        scene.add(beam);
        volumetricConeRef.current = beam;

        const pbrMats = {
            darkOak: new THREE.MeshPhysicalMaterial({ color: 0x1a120b, roughness: 0.3, metalness: 0.05 }),
            brushedMetal: new THREE.MeshPhysicalMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 }),
            plasterWall: new THREE.MeshStandardMaterial({ color: 0x141422, roughness: 0.9 }),
            velvet: new THREE.MeshPhysicalMaterial({ color: 0x050508, roughness: 1 })
        };

        const roomFloor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), pbrMats.velvet);
        roomFloor.rotation.x = -Math.PI / 2;
        roomFloor.position.y = -1;
        roomFloor.receiveShadow = true;
        scene.add(roomFloor);

        const roomWall = new THREE.Mesh(new THREE.BoxGeometry(30, 25, 0.5), pbrMats.plasterWall);
        roomWall.position.set(0, 8, -8);
        roomWall.receiveShadow = true;
        scene.add(roomWall);

        const deskGroup = new THREE.Group();
        const deskTop = new THREE.Mesh(new THREE.BoxGeometry(6, 0.25, 3), pbrMats.darkOak);
        deskTop.position.set(1.5, 0.2, -2.5);
        deskTop.castShadow = true; deskTop.receiveShadow = true;
        deskGroup.add(deskTop);

        const legOffsets = [[-2.7, -1.3], [2.7, -1.3], [-2.7, 1.3], [2.7, 1.3]];
        legOffsets.forEach(([ox, oz]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.25, 16), pbrMats.darkOak);
            leg.position.set(1.5 + ox, -0.45, -2.5 + oz);
            leg.castShadow = true;
            deskGroup.add(leg);
        });
        scene.add(deskGroup);

        const interactables: THREE.Object3D[] = [];

        const laptopGroup = new THREE.Group();
        const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.1), pbrMats.brushedMetal);
        laptopBase.position.y = 0.38;
        const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.05, 0.04), new THREE.MeshBasicMaterial({ color: 0x4080ff }));
        laptopScreen.position.set(0, 0.9, -0.52);
        laptopScreen.rotation.x = 0.25;
        laptopGroup.add(laptopBase, laptopScreen);
        laptopGroup.position.set(1.5, 0, -2.5);
        laptopGroup.userData = { type: 'laptop' };
        scene.add(laptopGroup);
        interactables.push(laptopGroup);

        const mugGroup = new THREE.Group();
        const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.45, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1 }));
        mugBody.position.set(3.5, 0.55, -1.8);
        mugGroup.add(mugBody);
        mugGroup.userData = { type: 'coffee' };
        scene.add(mugGroup);
        interactables.push(mugGroup);

        const bedGroup = new THREE.Group();
        const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 9), pbrMats.darkOak);
        bedFrame.position.set(-5, -0.4, 2);
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.8, 8.8), new THREE.MeshStandardMaterial({ color: 0x101525 }));
        mattress.position.set(-5, 0.2, 2);
        bedGroup.add(bedFrame, mattress);
        bedGroup.userData = { type: 'bed' };
        scene.add(bedGroup);
        interactables.push(bedGroup);

        const lampStructure = new THREE.Group();
        const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), pbrMats.brushedMetal);
        basePlate.position.set(2.8, 0.38, -3.2);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), pbrMats.brushedMetal);
        stem.position.set(2.8, 1.3, -3.2);
        const lightHead = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0x0c0c0c }));
        lightHead.position.set(2.8, 2.2, -3.2);
        lampStructure.add(basePlate, stem, lightHead);
        lampStructure.userData = { type: 'lamp' };
        scene.add(lampStructure);
        interactables.push(lampStructure);

        interactablesRef.current = interactables;

        const particleCount = 1000;
        const particleGeo = new THREE.BufferGeometry();
        const particlePos = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount * 3; i++) particlePos[i] = (Math.random() - 0.5) * 20;
        particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
        const dust = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0x888888, size: 0.02, transparent: true, opacity: 0.3 }));
        scene.add(dust);

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Improved selection with better hitbox scaling
        const handleInteraction = (e: PointerEvent) => {
            if (stateRef.current.status !== 'PLAYING') return;
            
            // Check if user clicked a UI button - if so, ignore 3D interaction
            if ((e.target as HTMLElement).closest('button')) return;

            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            
            const intersections = raycaster.intersectObjects(interactablesRef.current, true);
            if (intersections.length > 0) {
                let hitObj = intersections[0].object;
                while (hitObj.parent && !hitObj.userData.type) hitObj = hitObj.parent;
                const hitType = hitObj.userData.type;
                
                if (hitType === 'laptop') handleStudy(e);
                if (hitType === 'bed') handleSleep(e);
                if (hitType === 'lamp') toggleLight();
                if (hitType === 'coffee') handleCoffee(e);
            }
        };
        
        // Attaching to container for better broad detection
        mountRef.current.addEventListener('pointerdown', handleInteraction);

        let lastTime = 0;
        const frame = (time: number) => {
            const req = requestAnimationFrame(frame);
            const dt = (time - lastTime) / 1000;
            lastTime = time;
            controls.update();
            if (isJittering && cameraRef.current) {
                cameraRef.current.position.x += (Math.random() - 0.5) * 0.1;
                cameraRef.current.position.y += (Math.random() - 0.5) * 0.1;
                if (rgbShiftPassRef.current) rgbShiftPassRef.current.uniforms['amount'].value = 0.01;
            } else if (rgbShiftPassRef.current) {
                rgbShiftPassRef.current.uniforms['amount'].value = 0.0012;
            }
            dust.rotation.y += 0.0002;
            composer.render();
        };
        const animId = requestAnimationFrame(frame);

        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(animId);
            mountRef.current?.removeEventListener('pointerdown', handleInteraction);
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, [handleStudy, handleSleep, toggleLight, handleCoffee, isJittering]);

    useEffect(() => {
        if (lampLightRef.current) lampLightRef.current.intensity = isLightOn ? 40 : 0.2;
        if (fillLightRef.current) fillLightRef.current.intensity = isLightOn ? 1 : 0.05;
        if (volumetricConeRef.current) volumetricConeRef.current.visible = isLightOn;
    }, [isLightOn]);

    useEffect(() => {
        let timer: number;
        if (status === 'PLAYING') {
            timer = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { setStatus('LOST_TIME'); return 0; }
                    return prev - 1;
                });
                setEnergy(prev => {
                    if (prev <= 0.4) { setStatus('LOST_ENERGY'); return 0; }
                    return prev - 0.5;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [status]);

    return (
        <div className={`game-container ${energy < 25 ? 'critical-energy' : ''} ${isJittering ? 'jitter-mode' : ''}`}>
            <div className="vignette-fx" />
            <div className="film-grain" />
            
            {/* 3D Scene Wrapper */}
            <div ref={mountRef} className="render-target" />

            {floatingTexts.map(ft => (
                <div key={ft.id} className="combat-text" style={{ left: ft.x, top: ft.y, color: ft.color }}>{ft.text}</div>
            ))}

            {status === 'PLAYING' && (
                <div className="hud-overlay">
                    <div className="scanline-overlay" />
                    <div className="hud-border" />
                    <div className="hud-top">
                        <div className="metadata"><span className="blink-tag" /> NODE_001 // LOCAL_DORM</div>
                        <div className="timer-block">
                            <div className="timer-label">TIME_TO_DAWN</div>
                            <div className="timer-value">{timeLeft}s</div>
                        </div>
                    </div>
                    <div className="stats-container">
                        <div className="stat-card">
                            <div className="stat-info">MASTERY // {readiness}%</div>
                            <div className="stat-track"><div className="stat-fill blue" style={{ width: `${readiness}%` }} /></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-info">STAMINA // {Math.floor(energy)}%</div>
                            <div className="stat-track"><div className="stat-fill gold" style={{ width: `${energy}%` }} /></div>
                        </div>
                    </div>
                    <div className="log-panel">
                        {logs.map((msg, i) => <div key={i} className="log-entry">&gt; {msg}</div>)}
                    </div>
                    <div className="action-row">
                        <button className="action-btn high-end" onClick={() => handleStudy()}>EXEC_STUDY</button>
                        <button className="action-btn high-end" onClick={() => handleSleep()}>INIT_REST</button>
                        <button className="action-btn high-end" onClick={() => handleCoffee()}>FUEL_UP</button>
                        <button className="action-btn high-end" onClick={() => toggleLight()}>LAMP_CTRL</button>
                    </div>
                </div>
            )}

            {(status === 'START' || status === 'WON' || status.startsWith('LOST')) && (
                <div className="cinematic-splash">
                    <div className="splash-content">
                        <h1 className="glitch-title-large" data-text={status === 'START' ? 'EDINBURGH_CRUNCH' : status === 'WON' ? 'PASSED' : 'FAILED'}>
                            {status === 'START' ? 'EDINBURGH_CRUNCH' : status === 'WON' ? 'PASSED' : 'FAILED'}
                        </h1>
                        <p className="splash-desc">
                            {status === 'START' && "Infiltrate the final week simulation. Reach 100% mastery before the sunrise. Manage your bio-energy carefully."}
                            {status === 'WON' && "Evaluation complete. Honours degree confirmed."}
                            {status === 'LOST_ENERGY' && "Neural flatline. You failed to balance the crunch."}
                            {status === 'LOST_TIME' && "Exam deadline reached. You were too late."}
                        </p>
                        <button className="launch-btn-cinematic" onClick={startGame}>
                            {status === 'START' ? 'BOOT_SEQUENCE' : 'RETRY_SESSION'}
                        </button>
                    </div>
                </div>
            )}
            <div className="watermark">U_STATION // RENDER_STABLE // 4K_REALISTIC</div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);