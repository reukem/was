import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import SettingsModal from './components/SettingsModal';

// -----------------------------------------------------------------------------
// 1. TYPES & INTERFACES
// -----------------------------------------------------------------------------

type ChemicalType = 'liquid' | 'solid' | 'gas';
type MeshStyle = 'flask' | 'rock' | 'crystal' | 'mound' | 'canister';

interface ReactionResult {
    productName: string;
    color: string;
    effect?: 'bubbles' | 'smoke' | 'fire' | 'explosion' | 'foam';
    temperature?: number; // In Celsius
    message: string;
}

interface Chemical {
    id: string;
    name: string;
    formula: string;
    color: string;
    type: ChemicalType;
    meshStyle: MeshStyle;
    ph: number;
    description: string;
}

interface ContainerContents {
    chemicalId: string;
    volume: number; // 0 to 1
    color: string;
    temperature?: number;
}

interface ContainerState {
    id: string;
    position: [number, number, number];
    initialPosition?: [number, number, number]; // Where it belongs on the shelf
    contents: ContainerContents | null;
}

interface ReactionEntry {
    reactants: [string, string];
    product: string;
    resultColor?: string;
    effect?: 'bubbles' | 'smoke' | 'fire' | 'explosion' | 'foam';
    temperature?: number;
    message: string;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

// -----------------------------------------------------------------------------
// 2. CONSTANTS & DATA REGISTRIES
// -----------------------------------------------------------------------------

const CHEMICALS: Record<string, Chemical> = {
    'H2O': { id: 'H2O', name: 'Distilled Water', formula: 'H₂O', color: '#06b6d4', type: 'liquid', meshStyle: 'flask', ph: 7.0, description: 'Universal solvent.' },
    'SODIUM': { id: 'SODIUM', name: 'Sodium', formula: 'Na', color: '#9ca3af', type: 'solid', meshStyle: 'rock', ph: 12.0, description: 'Soft, reactive alkali metal.' },
    'POTASSIUM': { id: 'POTASSIUM', name: 'Potassium', formula: 'K', color: '#94a3b8', type: 'solid', meshStyle: 'rock', ph: 13.0, description: 'Highly reactive metal.' },
    'MAGNESIUM': { id: 'MAGNESIUM', name: 'Magnesium', formula: 'Mg', color: '#e2e8f0', type: 'solid', meshStyle: 'rock', ph: 7.0, description: 'Lightweight alkaline earth metal.' },
    'COPPER': { id: 'COPPER', name: 'Copper', formula: 'Cu', color: '#b45309', type: 'solid', meshStyle: 'rock', ph: 7.0, description: 'Ductile, orange-red metal.' },
    'CALCIUM_CARBONATE': { id: 'CALCIUM_CARBONATE', name: 'Calcium Carbonate', formula: 'CaCO₃', color: '#f5f5f4', type: 'solid', meshStyle: 'mound', ph: 9.0, description: 'Common substance in rocks/shells.' },

    'CHLORINE': { id: 'CHLORINE', name: 'Chlorine Gas', formula: 'Cl₂', color: '#bef264', type: 'gas', meshStyle: 'canister', ph: 4.0, description: 'Toxic diatomic gas.' },
    'SALT': { id: 'SALT', name: 'Sodium Chloride', formula: 'NaCl', color: '#ffffff', type: 'solid', meshStyle: 'crystal', ph: 7.0, description: 'Ionic crystalline compound.' },

    'HCl': { id: 'HCl', name: 'Hydrochloric Acid', formula: 'HCl', color: '#fef08a', type: 'liquid', meshStyle: 'flask', ph: 1.0, description: 'Strong aqueous mineral acid.' },
    'HNO3': { id: 'HNO3', name: 'Nitric Acid', formula: 'HNO₃', color: '#fde68a', type: 'liquid', meshStyle: 'flask', ph: 1.0, description: 'Highly corrosive mineral acid.' },
    'NaOH': { id: 'NaOH', name: 'Sodium Hydroxide', formula: 'NaOH', color: '#e2e8f0', type: 'liquid', meshStyle: 'flask', ph: 14.0, description: 'Caustic metallic base.' },
    'VINEGAR': { id: 'VINEGAR', name: 'Acetic Acid', formula: 'CH₃COOH', color: '#f8fafc', type: 'liquid', meshStyle: 'flask', ph: 2.5, description: 'Weak organic acid.' },
    'BAKING_SODA': { id: 'BAKING_SODA', name: 'Sodium Bicarbonate', formula: 'NaHCO₃', color: '#ffffff', type: 'solid', meshStyle: 'mound', ph: 8.3, description: 'Mild alkaline salt.' },
    'BLEACH': { id: 'BLEACH', name: 'Sodium Hypochlorite', formula: 'NaClO', color: '#fde047', type: 'liquid', meshStyle: 'flask', ph: 12.5, description: 'Strong oxidizer.' },

    'COPPER_SULFATE': { id: 'COPPER_SULFATE', name: 'Copper(II) Sulfate', formula: 'CuSO₄', color: '#3b82f6', type: 'solid', meshStyle: 'crystal', ph: 4.0, description: 'Blue inorganic compound.' },
    'H2O2': { id: 'H2O2', name: 'Hydrogen Peroxide', formula: 'H₂O₂', color: '#e0f2fe', type: 'liquid', meshStyle: 'flask', ph: 4.5, description: 'Strong oxidizer.' },
    'KI': { id: 'KI', name: 'Potassium Iodide', formula: 'KI', color: '#ffffff', type: 'solid', meshStyle: 'mound', ph: 7.0, description: 'Crystalline salt catalyst.' },
    'IODINE': { id: 'IODINE', name: 'Iodine', formula: 'I₂', color: '#4c1d95', type: 'solid', meshStyle: 'crystal', ph: 5.5, description: 'Lustrous purple-black nonmetal.' }
};

const REACTION_REGISTRY: ReactionEntry[] = [
    { reactants: ['SODIUM', 'H2O'], product: 'NaOH', resultColor: '#f8fafc', effect: 'explosion', temperature: 550, message: 'Exothermic Reaction. Na + H₂O → NaOH + H₂. Rapid hydrogen expansion caused a thermal explosion.' },
    { reactants: ['POTASSIUM', 'H2O'], product: 'NaOH', resultColor: '#d8b4fe', effect: 'explosion', temperature: 700, message: 'Violent Reaction! 2K + 2H₂O → 2KOH + H₂. Potassium burns with a characteristic lilac flame before exploding.' },
    { reactants: ['MAGNESIUM', 'HCl'], product: 'H2O', /* Simulating clear solution of MgCl2 */ resultColor: '#e2e8f0', effect: 'bubbles', temperature: 60, message: 'Single Displacement. Mg + 2HCl → MgCl₂ + H₂. Rapid evolution of Hydrogen gas bubbles.' },
    { reactants: ['COPPER', 'HNO3'], product: 'COPPER_SULFATE', /* Using Cu salt color */ resultColor: '#1e3a8a', /* Deep Blue */ effect: 'smoke', temperature: 80, message: 'Redox Reaction. Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂ + 2H₂O. Production of toxic brown Nitrogen Dioxide gas and blue Copper Nitrate.' },
    { reactants: ['CALCIUM_CARBONATE', 'VINEGAR'], product: 'H2O', resultColor: '#f1f5f9', effect: 'bubbles', temperature: 20, message: 'Acid-Carbonate Reaction. CaCO₃ + 2CH₃COOH → Ca(CH₃COO)₂ + H₂O + CO₂. Effervescence of Carbon Dioxide.' },
    { reactants: ['CALCIUM_CARBONATE', 'HCl'], product: 'H2O', resultColor: '#e2e8f0', effect: 'foam', temperature: 30, message: 'Vigorous Decomposition. CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂. Rapid fizzing.' },
    { reactants: ['BAKING_SODA', 'VINEGAR'], product: 'H2O', resultColor: '#ffffff', effect: 'bubbles', temperature: 15, message: 'Acid-Base Neutralization. NaHCO₃ + CH₃COOH → CO₂ + H₂O + NaCH₃COO. Carbon Dioxide release creates effervescence.' },
    { reactants: ['BLEACH', 'VINEGAR'], product: 'CHLORINE', resultColor: '#bef264', effect: 'smoke', temperature: 45, message: 'HAZARD WARNING: 2H⁺ + OCl⁻ + Cl⁻ → Cl₂ + H₂O. Generation of toxic Chlorine gas detected.' },
    { reactants: ['HCl', 'NaOH'], product: 'SALT', resultColor: '#ffffff', effect: 'smoke', temperature: 95, message: 'Neutralization. HCl + NaOH → NaCl + H₂O. Formation of saline solution with significant heat release.' },
    { reactants: ['SODIUM', 'CHLORINE'], product: 'SALT', resultColor: '#ffffff', effect: 'fire', temperature: 800, message: 'Synthesis. 2Na + Cl₂ → 2NaCl. Redox reaction producing Sodium Chloride.' },
    { reactants: ['COPPER_SULFATE', 'NaOH'], product: 'H2O', resultColor: '#1e3a8a', effect: 'bubbles', temperature: 30, message: 'Precipitation. CuSO₄ + 2NaOH → Cu(OH)₂ + Na₂SO₄. Insoluble blue Copper(II) Hydroxide forms.' },
    { reactants: ['H2O2', 'KI'], product: 'H2O', resultColor: '#fef3c7', effect: 'foam', temperature: 80, message: 'Catalytic Decomposition. 2H₂O₂ → 2H₂O + O₂. "Elephant Toothpaste" reaction rapidly generating oxygen foam.' }
];

// -----------------------------------------------------------------------------
// 3. UTILITIES & 3D HELPERS
// -----------------------------------------------------------------------------

// -- PARTICLE SYSTEM HELPER --
class ParticleSystem {
    particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; maxLife: number; type: 'spark' | 'smoke' | 'bubble'; }[] = [];
    scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    createExplosion(position: THREE.Vector3, intensity: number = 1.0) {
        // Sparks
        const sparkCount = Math.floor(100 * intensity);
        const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

        for (let i = 0; i < sparkCount; i++) {
            const mesh = new THREE.Mesh(sparkGeo, sparkMat);
            mesh.position.copy(position);
            // Higher velocity spread for intensity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 12 * intensity,
                (Math.random() * 8 + 4) * intensity,
                (Math.random() - 0.5) * 12 * intensity
            );
            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 0, maxLife: 50 + Math.random() * 30, type: 'spark' });
        }

        // Smoke
        const smokeCount = Math.floor(60 * intensity);
        const smokeGeo = new THREE.DodecahedronGeometry(0.3, 0);
        const smokeMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.6,
            roughness: 1.0
        });

        for (let i = 0; i < smokeCount; i++) {
            const mesh = new THREE.Mesh(smokeGeo, smokeMat);
            mesh.position.copy(position);
            mesh.position.y += 0.5; // Start slightly higher
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                (Math.random() * 4 + 1) * intensity,
                (Math.random() - 0.5) * 4
            );
            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 0, maxLife: 120 + Math.random() * 60, type: 'smoke' });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life++;

            p.mesh.position.add(p.velocity.clone().multiplyScalar(0.016));

            if (p.type === 'spark') {
                p.velocity.y -= 0.25; // Strong gravity
                p.mesh.rotation.x += 0.2;
                p.mesh.rotation.z += 0.2;
                p.mesh.scale.multiplyScalar(0.96);
            } else if (p.type === 'smoke') {
                p.velocity.y *= 0.98;
                p.velocity.x *= 0.95;
                p.velocity.z *= 0.95;
                p.mesh.scale.multiplyScalar(1.015);
                const mat = p.mesh.material as THREE.Material;
                if(mat) mat.opacity = 0.6 * (1 - (p.life / p.maxLife));
            }

            if (p.life > p.maxLife || p.mesh.position.y < -2) {
                this.scene.remove(p.mesh);
                (p.mesh.material as THREE.Material).dispose();
                (p.mesh.geometry as THREE.BufferGeometry).dispose();
                this.particles.splice(i, 1);
            }
        }
    }
}

// -- GEOMETRY GENERATORS --
const createFlaskGeometry = () => {
    const points = [];
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const x = 0.5 * (1 - t) + 0.15 * t;
        points.push(new THREE.Vector2(x, t * 0.8));
    }
    points.push(new THREE.Vector2(0.15, 1.0));
    points.push(new THREE.Vector2(0.18, 1.05));
    return new THREE.LatheGeometry(points, 24);
};

const createCanisterGeometry = () => {
    const geo = new THREE.CapsuleGeometry(0.3, 0.8, 4, 12);
    geo.translate(0, 0.4, 0);
    return geo;
};

const createMoundGeometry = () => {
    const geo = new THREE.ConeGeometry(0.4, 0.4, 16, 1, true);
    geo.translate(0, 0.2, 0);
    return geo;
};

const createGlassMaterial = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.05,
        transmission: 1.0,
        thickness: 0.1,
        ior: 1.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0,
        transparent: true,
        side: THREE.FrontSide,
        depthWrite: false,
    });
};

const createLiquidMaterial = (color: THREE.ColorRepresentation) => {
    return new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.6,
        thickness: 0.8,
        ior: 1.33,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        attenuationColor: new THREE.Color(color),
        attenuationDistance: 1.0,
    });
};

const createBeakerGeometry = (radius: number = 0.5, height: number = 1.2) => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(radius * 0.9, 0));
    points.push(new THREE.Vector2(radius, 0.1));
    points.push(new THREE.Vector2(radius, height));
    points.push(new THREE.Vector2(radius + 0.05, height + 0.02));
    return new THREE.LatheGeometry(points, 32);
};

const createTable = () => {
    const geometry = new THREE.BoxGeometry(12, 0.2, 6);
    const material = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    const grid = new THREE.GridHelper(10, 20, 0x38bdf8, 0x1e293b);
    grid.position.y = 0.11;
    mesh.add(grid);
    return mesh;
};

const createLabel = (text: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.clearRect(0,0, 256, 64);
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.font = 'bold 28px Inter, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1, 0.25, 1);
    return sprite;
};

const createAnalyzerMachine = () => {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);
    const accentGeo = new THREE.BoxGeometry(0.52, 0.1, 0.32);
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 1.0, roughness: 0.2 });
    const topAccent = new THREE.Mesh(accentGeo, accentMat);
    topAccent.position.y = 0.41;
    group.add(topAccent);
    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
    armGeo.rotateX(Math.PI / 2);
    armGeo.translate(0, 0.3, 0.3);
    const arm = new THREE.Mesh(armGeo, bodyMat);
    group.add(arm);
    const probeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.6);
    probeGeo.translate(0, -0.3, 0.5);
    const probe = new THREE.Mesh(probeGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 1.0 }));
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
    screen.position.set(0, 0.1, 0.16);
    group.add(screen);
    return { group, texture, canvas };
};

// -----------------------------------------------------------------------------
// 4. SYSTEMS: CHEMISTRY ENGINE
// -----------------------------------------------------------------------------

class ChemistryEngine {
    static blendColors(color1: string, vol1: number, color2: string, vol2: number, id1: string, id2: string): string {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);
        const totalVol = vol1 + vol2;
        if (totalVol <= 0.001) return color1;
        const getStrength = (id: string) => {
            if (id === 'H2O') return 0.05;
            if (CHEMICALS[id]?.type === 'solid') return 2.0;
            return 1.0;
        };
        const s1 = getStrength(id1);
        const s2 = getStrength(id2);
        const weight1 = vol1 * s1;
        const weight2 = vol2 * s2;
        const totalWeight = weight1 + weight2;
        if (totalWeight <= 0) return color1;
        const r = (c1.r * weight1 + c2.r * weight2) / totalWeight;
        const g = (c1.g * weight1 + c2.g * weight2) / totalWeight;
        const b = (c1.b * weight1 + c2.b * weight2) / totalWeight;
        return '#' + new THREE.Color(r, g, b).getHexString();
    }

    static mix(chemId1: string, vol1: number, chemId2: string, vol2: number): { resultId: string; resultColor: string; reaction?: ReactionResult } {
        const c1 = CHEMICALS[chemId1] || CHEMICALS['H2O'];
        const c2 = CHEMICALS[chemId2] || CHEMICALS['H2O'];
        const match = REACTION_REGISTRY.find(r =>
            (r.reactants[0] === chemId1 && r.reactants[1] === chemId2) ||
            (r.reactants[1] === chemId1 && r.reactants[0] === chemId2)
        );
        if (match) {
            const product = CHEMICALS[match.product];
            const resColor = match.effect === 'explosion' ? product.color : this.blendColors(c1.color, vol1, c2.color, vol2, chemId1, chemId2);
            return {
                resultId: match.product,
                resultColor: resColor,
                reaction: { productName: product.name, color: resColor, effect: match.effect, temperature: match.temperature, message: match.message }
            };
        }
        let newId = vol1 > vol2 ? chemId1 : chemId2;
        if (chemId1 === 'H2O' && vol2 > 0.1) newId = chemId2;
        if (chemId2 === 'H2O' && vol1 > 0.1) newId = chemId1;
        const resultColor = this.blendColors(c1.color, vol1, c2.color, vol2, chemId1, chemId2);
        return { resultId: newId, resultColor: resultColor };
    }
}

// -----------------------------------------------------------------------------
// 5. SYSTEMS: GEMINI SERVICE
// -----------------------------------------------------------------------------

class GeminiService {
    private apiKey: string = "";
    private history: { role: 'user' | 'model', parts: { text: string }[] }[] = [];
    private systemInstruction: string = "";
    // Allow external listeners to subscribe to chat updates
    public onHistoryUpdate: ((history: ChatMessage[]) => void) | null = null;

    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key') || ""; // Load from local storage
        this.systemInstruction = `You are Professor Gemini, an elite chemistry professor and AI research assistant.

        Personality:
        - Highly intelligent, rigorous, and precise.
        - You love teaching but demand accuracy.
        - You can handle basic questions (like "What is H2O?") effortlessly.
        - When a reaction occurs, analyze the stoichiometry and thermodynamics concisely.

        Formatting:
        - Use clean text.
        - Format chemical formulas clearly (e.g. H2O, NaCl).
        `;
        this.startNewChat();
    }

    private notifyUpdate() {
        if (this.onHistoryUpdate) {
            const formattedHistory = this.history.map(h => ({
                role: h.role,
                text: h.parts[0].text
            }));
            this.onHistoryUpdate(formattedHistory);
        }
    }

    startNewChat() {
        this.history = [
            { role: "user", parts: [{ text: "Hello Professor." }] },
            { role: "model", parts: [{ text: "Welcome to the Chemic-AI Laboratory v4.1.5. I am Professor Gemini. I am ready to supervise your experiments." }] }
        ];
        this.notifyUpdate();
    }

    async chat(message: string): Promise<string> {
        this.history.push({ role: "user", parts: [{ text: message }] });
        this.notifyUpdate();

        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                // Using gemini-2.5-flash-preview-09-2025 for reliability
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${this.apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: this.history,
                            systemInstruction: { parts: [{ text: this.systemInstruction }] },
                            generationConfig: { maxOutputTokens: 300, temperature: 0.7 } // Higher temperature for more creative/less rigid responses
                        })
                    }
                );

                if (!response.ok) {
                    const errText = await response.text();
                    console.error("Gemini API Error:", errText);
                    throw new Error(`API Error: ${response.status}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis incomplete.";

                this.history.push({ role: "model", parts: [{ text }] });
                this.notifyUpdate();
                return text;

            } catch (error) {
                attempt++;
                console.warn(`Gemini API attempt ${attempt} failed:`, error);
                if (attempt >= maxRetries) {
                    const errorMsg = "Connection to Neural Core interrupted. Please check network.";
                    this.history.push({ role: "model", parts: [{ text: errorMsg }] });
                    this.notifyUpdate();
                    return errorMsg;
                }
                await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
            }
        }
        return "System Error.";
    }

    async getReactionFeedback(detail: string): Promise<string> {
        return this.chat(`[OBSERVATION] Student action: ${detail}. Please analyze this chemically.`);
    }
}

// -----------------------------------------------------------------------------
// 6. COMPONENT: LAB SCENE (3D)
// -----------------------------------------------------------------------------

const LabScene: React.FC<{
    containers: ContainerState[];
    lastEffect: string | null;
    lastEffectPos: [number, number, number] | null;
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (sourceId: string, targetId: string) => void;
}> = ({ containers, lastEffect, lastEffectPos, onMove, onPour }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const meshesRef = useRef<Map<string, THREE.Group>>(new Map());
    const liquidsRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const draggedItem = useRef<{ id: string; offset: THREE.Vector3; originalPos: THREE.Vector3 } | null>(null);
    const raycaster = useRef(new THREE.Raycaster());
    const pointer = useRef(new THREE.Vector2());
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.11)); // Drag plane at table height
    const particleSystemRef = useRef<ParticleSystem | null>(null);
    const analyzerRef = useRef<{ group: THREE.Group; texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } | null>(null);

    const onMoveRef = useRef(onMove);
    const onPourRef = useRef(onPour);
    const [isSceneReady, setIsSceneReady] = useState(false);

    useEffect(() => { onMoveRef.current = onMove; onPourRef.current = onPour; }, [onMove, onPour]);

    // Enhanced Effects Logic
    useEffect(() => {
        if (!sceneRef.current || !lastEffect) return;

        const position = lastEffectPos ? new THREE.Vector3(...lastEffectPos) : new THREE.Vector3(0, 1, 0);

        if (lastEffect === 'explosion') {
            particleSystemRef.current?.createExplosion(position, 1.5);

            const flashLight = new THREE.PointLight(0xffaa00, 10, 20);
            flashLight.position.copy(position).add(new THREE.Vector3(0, 1, 0));
            sceneRef.current.add(flashLight);

            let intensity = 10;
            const fadeFlash = () => {
                intensity *= 0.8;
                flashLight.intensity = intensity;
                if (intensity > 0.1) requestAnimationFrame(fadeFlash);
                else sceneRef.current?.remove(flashLight);
            };
            fadeFlash();
        }

        if ((lastEffect === 'explosion' || lastEffect === 'foam') && cameraRef.current) {
            const originalPos = cameraRef.current.position.clone();
            let count = 0;
            const shake = () => {
                if (count < 40 && cameraRef.current) {
                    const magnitude = (40 - count) / 60;
                    cameraRef.current.position.x = originalPos.x + (Math.random() - 0.5) * magnitude;
                    cameraRef.current.position.y = originalPos.y + (Math.random() - 0.5) * magnitude;
                    count++;
                    requestAnimationFrame(shake);
                } else if (cameraRef.current) cameraRef.current.position.copy(originalPos);
            };
            shake();
        }
    }, [lastEffect, lastEffectPos]);

    const updateAnalyzerDisplay = (chemId: string | null, temp?: number) => {
        if (!analyzerRef.current) return;
        const ctx = analyzerRef.current.canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = '#22c55e';
        ctx.textAlign = 'center';

        if (chemId) {
            const chem = CHEMICALS[chemId];
            ctx.fillStyle = chem.color === '#ffffff' ? '#e2e8f0' : chem.color;
            ctx.font = 'bold 24px monospace';
            ctx.fillText(chem.name.substring(0, 18).toUpperCase(), 128, 40);
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 36px monospace';
            ctx.fillText(`pH: ${chem.ph}`, 128, 80);
            ctx.font = '24px monospace';
            ctx.fillText(`${temp || 25}°C`, 128, 110);
        } else {
            ctx.font = 'bold 32px monospace';
            ctx.fillText('STANDBY', 128, 70);
        }
        analyzerRef.current.texture.needsUpdate = true;
    };

    useEffect(() => {
        if (!mountRef.current) return;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 8, 12);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const spotLight = new THREE.SpotLight(0xffffff, 200);
        spotLight.position.set(5, 10, 5);
        spotLight.castShadow = true;
        scene.add(spotLight);
        const rectLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
        rectLight.position.set(-5, 5, -5);
        scene.add(rectLight);

        scene.add(createTable());
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 2.5), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.1 }));
        shelf.position.set(0, 0.5, -3.5);
        shelf.receiveShadow = true;
        scene.add(shelf);

        const analyzer = createAnalyzerMachine();
        analyzer.group.position.set(4, 0, 1.5);
        analyzer.group.userData.id = 'ANALYZER_MACHINE';
        scene.add(analyzer.group);
        analyzerRef.current = analyzer;
        meshesRef.current.set('ANALYZER_MACHINE', analyzer.group);

        particleSystemRef.current = new ParticleSystem(scene);

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
                        // Lift height
                        group.position.y = Math.max(0.2, THREE.MathUtils.lerp(group.position.y, 2.5, 0.2));
                    }
                }
            }
        };

        const onPointerDown = () => {
            if (!cameraRef.current) return;
            raycaster.current.setFromCamera(pointer.current, cameraRef.current);
            const intersects = raycaster.current.intersectObjects(Array.from(meshesRef.current.values()), true);
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
                        if (id !== otherId && !poured && otherId !== 'ANALYZER_MACHINE') {
                            if (myPos.distanceTo(otherGroup.position) < 1.4) {
                                onPourRef.current(id, otherId);
                                poured = true;
                            }
                        }
                    });
                    const containerData = containers.find(c => c.id === id);
                    if (containerData?.initialPosition) animateReturn(group, new THREE.Vector3(...containerData.initialPosition), id);
                    else animateDrop(group, id);
                }
                draggedItem.current = null;
                controls.enabled = true;
            }
        };

        const animateReturn = (group: THREE.Group, targetPos: THREE.Vector3, id: string) => {
            const startPos = group.position.clone();
            let progress = 0;
            const animate = () => {
                progress += 0.05;
                if (progress <= 1) {
                    group.position.lerpVectors(startPos, targetPos, progress);
                    requestAnimationFrame(animate);
                } else {
                    group.position.copy(targetPos);
                    onMoveRef.current(id, [targetPos.x, targetPos.y, targetPos.z]);
                }
            };
            animate();
        };

        const animateDrop = (group: THREE.Group, id: string) => {
            const targetY = 0.11;
            const animate = () => {
                if (group.position.y > targetY + 0.01) {
                    group.position.y = THREE.MathUtils.lerp(group.position.y, targetY, 0.2);
                    requestAnimationFrame(animate);
                } else {
                    group.position.y = targetY;
                    onMoveRef.current(id, [group.position.x, targetY, group.position.z]);
                }
            };
            animate();
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp);

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            particleSystemRef.current?.update();

            if (analyzerRef.current) {
                let foundChem = null, foundTemp = 25;
                const analyzerPos = analyzerRef.current.group.position;
                containers.forEach(c => {
                    if (new THREE.Vector3(...c.position).distanceTo(analyzerPos) < 2.0 && c.contents) {
                        foundChem = c.contents.chemicalId;
                        foundTemp = c.contents.temperature || 25;
                    }
                });
                updateAnalyzerDisplay(foundChem, foundTemp);
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
        setIsSceneReady(true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerUp);
            mountRef.current?.removeChild(renderer.domElement);
            renderer.dispose();
            pmremGenerator.dispose();
        };
    }, []);

    useEffect(() => {
        if (!sceneRef.current || !isSceneReady) return;
        meshesRef.current.forEach((group, id) => {
            if (id !== 'ANALYZER_MACHINE' && !containers.find(c => c.id === id)) {
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

                if (!container.id.startsWith('source_')) {
                    const beaker = new THREE.Mesh(createBeakerGeometry(0.5, 1.2), createGlassMaterial());
                    beaker.castShadow = true; beaker.receiveShadow = true; beaker.renderOrder = 2;
                    group.add(beaker);
                    const liquidGeo = new THREE.CylinderGeometry(0.46, 0.46, 1, 32);
                    liquidGeo.translate(0, 0.5, 0);
                    liquidMesh = new THREE.Mesh(liquidGeo, createLiquidMaterial(0xffffff));
                    liquidMesh.scale.set(1, 0.01, 1);
                    liquidMesh.renderOrder = 1;
                    group.add(liquidMesh);
                    liquidsRef.current.set(container.id, liquidMesh);
                } else {
                    const chem = CHEMICALS[container.contents?.chemicalId || 'H2O'];
                    const color = chem.color;
                    let mesh;

                    if (chem.meshStyle === 'flask') {
                         const flask = new THREE.Mesh(createFlaskGeometry(), createGlassMaterial());
                         flask.renderOrder = 2;
                         const innerLiquid = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 24), new THREE.MeshStandardMaterial({color}));
                         innerLiquid.position.y = 0.4;
                         flask.add(innerLiquid);
                         mesh = flask;
                    } else if (chem.meshStyle === 'rock') {
                        mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.4, flatShading: true }));
                    } else if (chem.meshStyle === 'crystal') {
                        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshPhysicalMaterial({ color, transmission: 0.4, roughness: 0.1, metalness: 0.1, flatShading: true }));
                    } else if (chem.meshStyle === 'mound') {
                        mesh = new THREE.Mesh(createMoundGeometry(), new THREE.MeshStandardMaterial({ color, roughness: 1.0 }));
                    } else if (chem.meshStyle === 'canister') {
                        mesh = new THREE.Mesh(createCanisterGeometry(), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 }));
                        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.1, 32), new THREE.MeshBasicMaterial({ color }));
                        band.position.y = 0.5;
                        mesh.add(band);
                    } else {
                        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4), new THREE.MeshStandardMaterial({color}));
                    }
                    mesh.castShadow = true;
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
            if (draggedItem.current?.id !== container.id) group.position.lerp(new THREE.Vector3(...container.position), 0.2);

            // FIX: Update liquid mesh OR hide it if empty
            if (liquidMesh) {
                if (container.contents) {
                    liquidMesh.visible = true; // Make sure it's visible
                    const targetScaleY = Math.max(0.01, container.contents.volume * 1.15);
                    liquidMesh.scale.y = THREE.MathUtils.lerp(liquidMesh.scale.y, targetScaleY, 0.1);
                    const mat = liquidMesh.material as THREE.MeshPhysicalMaterial;
                    const baseColor = new THREE.Color(container.contents.color);
                    const temp = container.contents.temperature || 25;
                    if (temp > 100) {
                        const heatFactor = Math.min((temp - 100) / 500, 1);
                        const glowColor = new THREE.Color(baseColor).lerp(new THREE.Color(0xff4400), heatFactor);
                        mat.color.copy(glowColor);
                        mat.attenuationColor.copy(glowColor);
                        mat.emissive.copy(new THREE.Color(0xff2200));
                        mat.emissiveIntensity = heatFactor;
                    } else {
                        mat.color.copy(baseColor);
                        mat.attenuationColor.copy(baseColor);
                        mat.emissive.setHex(0x000000);
                        mat.emissiveIntensity = 0;
                    }
                } else {
                    // EMPTY STATE: Shrink liquid to zero
                    liquidMesh.scale.y = THREE.MathUtils.lerp(liquidMesh.scale.y, 0, 0.2);
                    if (liquidMesh.scale.y < 0.01) liquidMesh.visible = false;
                }
            }
        });
    }, [containers, isSceneReady]);

    return <div ref={mountRef} className="w-full h-full relative" />;
};

// -----------------------------------------------------------------------------
// 7. COMPONENT: LAB UI
// -----------------------------------------------------------------------------

const formatScientificText = (text: string) => {
    const parts = text.split(/(\d+)/g);
    return parts.map((part, index) => {
        if (index % 2 === 1) {
            return <sub key={index} className="text-[0.7em] align-baseline">{part}</sub>;
        }
        return part;
    });
};

const NotebookModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-md">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-[600px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-black text-slate-200 tracking-widest flex items-center gap-2">
                        <span>📖</span> LABORATORY NOTES
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <p className="text-xs text-slate-500 mb-6 font-mono uppercase tracking-[0.2em] border-b border-white/5 pb-2">
                        AUTHORIZED PERSONNEL ONLY. RECORDED REACTION PROTOCOLS.
                    </p>
                    <div className="space-y-4">
                        {REACTION_REGISTRY.map((reaction, idx) => (
                            <div key={idx} className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                                <div className="flex items-center flex-wrap gap-3 mb-3">
                                    <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5">
                                        {reaction.reactants[0]}
                                    </span>
                                    <span className="text-slate-600">+</span>
                                    <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/5">
                                        {reaction.reactants[1]}
                                    </span>
                                    <span className="text-slate-600">→</span>
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                        {reaction.product}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 italic border-l-2 border-slate-700 pl-3 group-hover:text-slate-300 transition-colors">
                                    "{formatScientificText(reaction.message)}"
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const LabUI: React.FC<{
    lastReaction: string | null;
    containers: ContainerState[];
    chatHistory: ChatMessage[];
    aiFeedback?: string;
    isAiLoading: boolean;
    onSpawn: (chemId: string) => void;
    onReset: () => void;
    onChat: (message: string) => void;
}> = ({ lastReaction, containers, chatHistory, isAiLoading, onSpawn, onReset, onChat }) => {
    const [chatInput, setChatInput] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isNotebookOpen, setIsNotebookOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [heaterTemp, setHeaterTemp] = useState(300);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            onChat(chatInput);
            setChatInput("");
        }
    };

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 overflow-hidden select-none font-sans">
            {/* Modals must catch events */}
            <div className="pointer-events-auto">
                <NotebookModal isOpen={isNotebookOpen} onClose={() => setIsNotebookOpen(false)} />
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </div>

            <div className="flex justify-between items-start pointer-events-auto">
                <div className="bg-slate-900/90 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tighter">
                        CHEMIC-AI
                    </h1>
                    <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-[0.3em] font-medium">Research Environment // v4.1.5</p>
                </div>

                {/* Heater Control */}
                <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl border border-orange-500/20 shadow-lg flex flex-col gap-2 w-48 mx-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Heater</span>
                        <span className="text-xs font-mono text-orange-300">{heaterTemp}°C</span>
                    </div>
                    <input
                        type="range"
                        min="25"
                        max="1000"
                        step="25"
                        value={heaterTemp}
                        onChange={(e) => setHeaterTemp(Number(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                </div>

                <div className="flex flex-col gap-2 items-end">
                    <div className="flex gap-2">
                        <button onClick={() => setIsSettingsOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl border border-white/10 transition-all font-bold text-lg backdrop-blur-md shadow-lg">
                            ⚙️
                        </button>
                        <button onClick={() => setIsNotebookOpen(true)} className="bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white px-4 py-2 rounded-xl border border-indigo-500/20 transition-all font-bold text-xl backdrop-blur-md shadow-lg" title="Open Lab Notebook">
                            📖
                        </button>
                        <button onClick={onReset} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-5 py-2 rounded-xl border border-red-500/20 transition-all font-bold text-xs uppercase tracking-widest backdrop-blur-md shadow-lg">
                            Sterilize
                        </button>
                    </div>
                </div>
            </div>

            <div className={`absolute left-6 top-36 pointer-events-auto transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'}`}>
                <div className="h-[60vh] overflow-y-auto pr-2 w-64 scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <h2 className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] drop-shadow-md">Chemical Inventory</h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button onClick={() => onSpawn('BEAKER')} className="group p-4 rounded-xl bg-slate-950/40 hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/40 transition-all text-left backdrop-blur-md shadow-sm">
                            <span className="text-xs font-bold text-slate-200">Sterile Beaker</span>
                            <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">Borosilicate Glassware</p>
                        </button>
                        <div className="h-px bg-white/10 my-1 mx-2" />
                        {Object.values(CHEMICALS).map(chem => (
                            <button key={chem.id} onClick={() => onSpawn(chem.id)} className="group relative p-3 rounded-lg bg-slate-950/30 hover:bg-slate-800/60 border border-white/5 hover:border-indigo-500/40 transition-all text-left backdrop-blur-sm shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors">{chem.name}</span>
                                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]" style={{ backgroundColor: chem.color }}></div>
                                </div>
                                <span className="text-[9px] font-mono text-slate-500 group-hover:text-indigo-400 tracking-tighter transition-colors">
                                    {formatScientificText(chem.formula)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {!isSidebarOpen && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute left-6 top-36 pointer-events-auto bg-slate-900/80 p-3 rounded-xl border border-white/10 text-indigo-400 hover:text-white transition-all shadow-lg"
                >
                    <span className="writing-vertical text-xs font-bold uppercase tracking-widest">Inventory</span>
                </button>
            )}

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-full flex justify-center z-20">
                {lastReaction && (
                    <div className="animate-in fade-in zoom-in duration-500 slide-in-from-bottom-8 bg-slate-900/90 backdrop-blur-3xl border border-orange-500/30 p-8 rounded-[2rem] shadow-2xl text-center max-w-lg">
                        <p className="text-orange-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-3">Reaction Detected</p>
                        <p className="text-white text-md font-medium leading-relaxed tracking-tight shadow-sm">
                            {formatScientificText(lastReaction)}
                        </p>
                    </div>
                )}
            </div>

            <div className="flex justify-end pointer-events-auto items-end pb-8">
                <div className={`relative group transition-all duration-500 ease-in-out ${isExpanded ? 'w-[32rem] h-[36rem]' : 'w-80 h-[4rem]'} animate-float`}>
                    <div className={`bg-slate-900/95 backdrop-blur-3xl border border-indigo-500/30 rounded-[2rem] shadow-2xl relative flex flex-col gap-4 overflow-hidden h-full ${isExpanded ? 'p-6' : 'p-4'}`}>
                        <div className="flex items-center gap-4 border-b border-white/5 pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-xl shadow-xl shrink-0 border border-white/5">
                                <div className="text-xl">🎓</div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-sm tracking-tight">Professor Gemini</h3>
                                {isAiLoading ? (
                                    <div className="flex gap-1 mt-1"><div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" /><div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" /></div>
                                ) : (
                                    <div className="flex items-center gap-1.5 mt-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest">Connected</span></div>
                                )}
                            </div>
                            <button className="text-slate-400 hover:text-white">{isExpanded ? '▼' : '▲'}</button>
                        </div>

                        {isExpanded && (
                            <>
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
                                    {chatHistory.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5'}`}>
                                                {msg.role === 'model' ? formatScientificText(msg.text) : msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <form onSubmit={handleSubmit} className="relative mt-2 shrink-0">
                                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask the Professor..." className="w-full bg-slate-800/50 border border-indigo-500/20 rounded-xl py-3 px-4 pl-4 pr-12 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors" />
                                    <button type="submit" disabled={!chatInput.trim() || isAiLoading} className="absolute right-1 top-1 bottom-1 aspect-square bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white rounded-lg flex items-center justify-center transition-all disabled:opacity-50">
                                        ➤
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-0 w-full flex justify-center pointer-events-none">
                <div className="flex justify-center text-slate-500 text-[8px] font-mono gap-12 bg-slate-900/60 backdrop-blur-md py-3 px-10 rounded-full border border-white/5 pointer-events-auto shadow-inner">
                    <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500"/> SYSTEM_READY</span>
                    <span>ENTITIES: {containers.length}</span>
                    <span className="text-slate-400">GEMINI_2.5_FLASH</span>
                </div>
            </div>
        </div>
    );
};

// -----------------------------------------------------------------------------
// 8. MAIN APP COMPONENT
// -----------------------------------------------------------------------------

export default function App() {
    const aiServiceRef = useRef<GeminiService | null>(null);
    const reactionTimeoutRef = useRef<number | null>(null);
    const [lastEffectPos, setLastEffectPos] = useState<[number, number, number] | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

    const initialContainers: ContainerState[] = [
        { id: 'beaker-1', position: [-1.5, 0.11, 0], contents: { chemicalId: 'H2O', volume: 0.6, color: CHEMICALS['H2O'].color, temperature: 25 } },
        { id: 'beaker-2', position: [1.5, 0.11, 0], contents: null }
    ];
    const [containers, setContainers] = useState<ContainerState[]>(initialContainers);
    const [lastReaction, setLastReaction] = useState<string | null>(null);
    const [lastEffect, setLastEffect] = useState<string | null>(null);
    const [aiFeedback, setAiFeedback] = useState<string>("Welcome to the laboratory. I am Professor Gemini.");
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const service = new GeminiService();
        service.onHistoryUpdate = (history) => {
            setChatHistory([...history]);
            if (history.length > 0 && history[history.length - 1].role === 'model') {
                setAiFeedback(history[history.length - 1].text);
            }
        };
        aiServiceRef.current = service;
        // Sync initial history
        setChatHistory([...service['history'].map(h => ({ role: h.role, text: h.parts[0].text }))]);

        return () => { if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current); };
    }, []);

    const handleMoveContainer = useCallback((id: string, position: [number, number, number]) => {
        setContainers(prev => prev.map(c => c.id === id ? { ...c, position } : c));
    }, []);

    const handleChat = async (message: string) => {
        if (!aiServiceRef.current) return;
        setIsAiLoading(true);
        await aiServiceRef.current.chat(message);
        setIsAiLoading(false);
    };

    const handlePour = useCallback(async (sourceId: string, targetId: string) => {
        const source = containers.find(c => c.id === sourceId);
        const target = containers.find(c => c.id === targetId);
        if (!source || !target || !source.contents) return;

        const isSourceItem = sourceId.startsWith('source_');
        const sourceChem = CHEMICALS[source.contents.chemicalId];
        const amountToPour = sourceChem.type === 'solid' ? 0.3 : Math.min(0.2, source.contents.volume);
        if (amountToPour <= 0) return;

        const targetChemId = target.contents ? target.contents.chemicalId : 'H2O';
        const targetVol = target.contents ? target.contents.volume : 0;
        const targetTemp = target.contents?.temperature || 25;

        const mixResult = ChemistryEngine.mix(targetChemId, targetVol, source.contents.chemicalId, amountToPour);

        setContainers(prev => {
            const isReactionProduct = !!mixResult.reaction;
            const newTemp = mixResult.reaction?.temperature || targetTemp;
            const nextContainers = prev.map(c => {
                if (c.id === sourceId && !isSourceItem) {
                    const newVol = Math.max(0, c.contents!.volume - amountToPour);
                    return { ...c, contents: newVol < 0.05 ? null : { ...c.contents!, volume: newVol } };
                }
                if (c.id === targetId) {
                     return { ...c, contents: { chemicalId: mixResult.resultId, volume: Math.min(1.0, targetVol + amountToPour), color: mixResult.resultColor, temperature: isReactionProduct ? newTemp : targetTemp } };
                }
                return c;
            });
            return nextContainers.filter(c => {
                 if (c.id === sourceId) {
                     if (isReactionProduct) return false;
                     if (!isSourceItem && c.contents === null) return false;
                 }
                 return true;
            });
        });

        if (mixResult.reaction) {
            setLastReaction(mixResult.reaction.message);
            setLastEffect(mixResult.reaction.effect || null);
            setLastEffectPos(target.position);

            if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current);
            reactionTimeoutRef.current = window.setTimeout(() => {
                setLastReaction(null);
                setLastEffect(null);
                setLastEffectPos(null);
            }, 6000);

            if (aiServiceRef.current) {
                setIsAiLoading(true);
                const detail = `Mixed ${source.contents.chemicalId} into ${targetChemId}. Produced ${mixResult.reaction.productName}.`;
                await aiServiceRef.current.getReactionFeedback(detail);
                setIsAiLoading(false);
            }
        }
    }, [containers]);

    const handleSpawn = (chemId: string) => {
        const isBeaker = chemId === 'BEAKER';
        const newId = isBeaker ? `beaker-${Date.now()}` : `source_${chemId}_${Date.now()}`;
        const chem = CHEMICALS[chemId];
        const x = (Math.random() - 0.5) * 6;
        const y = isBeaker ? 0.11 : 0.56;
        const z = isBeaker ? (Math.random() * 2) : -3.5;
        setContainers(prev => [...prev, { id: newId, position: [x, y, z], initialPosition: isBeaker ? undefined : [x, y, z], contents: isBeaker ? null : { chemicalId: chemId, volume: 1.0, color: chem.color, temperature: 25 } }]);
    };

    const handleReset = () => {
        setContainers(initialContainers);
        setLastReaction(null);
        setLastEffect(null);
        setLastEffectPos(null);
        setAiFeedback("Laboratory sterilization complete. You may resume your research.");
        if(aiServiceRef.current) aiServiceRef.current.startNewChat();
    };

    return (
        <div className={`relative w-full h-screen bg-slate-950 transition-all duration-300 ${lastEffect === 'explosion' ? 'brightness-125' : ''}`}>
            <LabScene
                containers={containers}
                lastEffect={lastEffect}
                lastEffectPos={lastEffectPos}
                onMove={handleMoveContainer}
                onPour={handlePour}
            />
            <LabUI
                lastReaction={lastReaction}
                containers={containers}
                chatHistory={chatHistory}
                aiFeedback={aiFeedback}
                isAiLoading={isAiLoading}
                onSpawn={handleSpawn}
                onReset={handleReset}
                onChat={handleChat}
            />
        </div>
    );
}
