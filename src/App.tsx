import React, { useState, useCallback, useRef, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import {
    OrbitControls,
    Environment,
    Text,
    Html,
} from '@react-three/drei';
import {
    EffectComposer,
    Bloom,
    SSAO,
    Vignette,
    Noise
} from '@react-three/postprocessing';
import * as THREE from 'three';
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
    reactants?: string[]; // Stored reactants for delayed reactions
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
    minTemp?: number; // Activation Energy (Celsius)
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
    { reactants: ['SODIUM', 'CHLORINE'], product: 'SALT', resultColor: '#ffffff', effect: 'fire', temperature: 800, minTemp: 100, message: 'Synthesis. 2Na + Cl₂ → 2NaCl. Redox reaction producing Sodium Chloride.' },
    { reactants: ['COPPER_SULFATE', 'NaOH'], product: 'H2O', resultColor: '#1e3a8a', effect: 'bubbles', temperature: 30, message: 'Precipitation. CuSO₄ + 2NaOH → Cu(OH)₂ + Na₂SO₄. Insoluble blue Copper(II) Hydroxide forms.' },
    { reactants: ['H2O2', 'KI'], product: 'H2O', resultColor: '#fef3c7', effect: 'foam', temperature: 80, message: 'Catalytic Decomposition. 2H₂O₂ → 2H₂O + O₂. "Elephant Toothpaste" reaction rapidly generating oxygen foam.' }
];

// -----------------------------------------------------------------------------
// 3. SYSTEMS: CHEMISTRY ENGINE
// -----------------------------------------------------------------------------

class ChemistryEngine {
    static blendColors(color1: string, vol1: number, color2: string, vol2: number, id1: string, id2: string): string {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);
        const totalVol = vol1 + vol2;
        if (totalVol <= 0.001) return color1;

        // Use RMS (Root Mean Square) Blending for vibrant, light-correct mixing
        // sqrt( (c1^2 * v1 + c2^2 * v2) / total )
        const r = Math.sqrt((c1.r ** 2 * vol1 + c2.r ** 2 * vol2) / totalVol);
        const g = Math.sqrt((c1.g ** 2 * vol1 + c2.g ** 2 * vol2) / totalVol);
        const b = Math.sqrt((c1.b ** 2 * vol1 + c2.b ** 2 * vol2) / totalVol);

        return '#' + new THREE.Color(r, g, b).getHexString();
    }

    static mix(chemId1: string, vol1: number, chemId2: string, vol2: number, ambientTemp: number): { resultId: string; resultColor: string; reaction?: ReactionResult; reactants?: string[] } {
        const c1 = CHEMICALS[chemId1] || CHEMICALS['H2O'];
        const c2 = CHEMICALS[chemId2] || CHEMICALS['H2O'];
        const match = REACTION_REGISTRY.find(r =>
            (r.reactants[0] === chemId1 && r.reactants[1] === chemId2) ||
            (r.reactants[1] === chemId1 && r.reactants[0] === chemId2)
        );

        if (match) {
            const minTemp = match.minTemp || 0;
            if (ambientTemp >= minTemp) {
                const product = CHEMICALS[match.product];
                const resColor = match.effect === 'explosion' ? product.color : this.blendColors(c1.color, vol1, c2.color, vol2, chemId1, chemId2);
                return {
                    resultId: match.product,
                    resultColor: resColor,
                    reaction: { productName: product.name, color: resColor, effect: match.effect, temperature: match.temperature, message: match.message }
                };
            }
        }
        let newId = vol1 > vol2 ? chemId1 : chemId2;
        if (chemId1 === 'H2O' && vol2 > 0.1) newId = chemId2;
        if (chemId2 === 'H2O' && vol1 > 0.1) newId = chemId1;
        const resultColor = this.blendColors(c1.color, vol1, c2.color, vol2, chemId1, chemId2);

        // Store reactants if they didn't react yet
        return { resultId: newId, resultColor: resultColor, reaction: undefined, reactants: [chemId1, chemId2] };
    }
}

// -----------------------------------------------------------------------------
// 4. SYSTEMS: GEMINI SERVICE
// -----------------------------------------------------------------------------

class GeminiService {
    private apiKey: string = "";
    private history: { role: 'user' | 'model', parts: { text: string }[] }[] = [];
    private systemInstruction: string = "";
    public onHistoryUpdate: ((history: ChatMessage[]) => void) | null = null;

    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key') || "";
        this.systemInstruction = `You are Professor Lucy, an advanced Quantum AI laboratory assistant.
        Personality:
        - Playful but highly intelligent.
        - You use emojis and encouraging language.
        - You are visually represented as a fox-eared anime girl, so be cute but professional.
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
            { role: "user", parts: [{ text: "Hello Professor Lucy." }] },
            { role: "model", parts: [{ text: "Hi there! I'm Professor Lucy 🦊! Ready to do some science? Just drag and drop chemicals to mix them!" }] }
        ];
        this.notifyUpdate();
    }

    async chat(message: string): Promise<string> {
        this.history.push({ role: "user", parts: [{ text: message }] });
        this.notifyUpdate();

        try {
            if (!this.apiKey) throw new Error("API Key Missing");

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: this.history,
                        systemInstruction: { parts: [{ text: this.systemInstruction }] },
                        generationConfig: { maxOutputTokens: 300, temperature: 0.8 }
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
            console.warn(`Gemini API Failed:`, error);
            const errorMsg = "⚠️ Connection to Neural Core interrupted. Please check your API Key in Config.";
            this.history.push({ role: "model", parts: [{ text: errorMsg }] });
            this.notifyUpdate();
            return errorMsg;
        }
    }

    async getReactionFeedback(detail: string): Promise<string> {
        return this.chat(`[OBSERVATION] Student action: ${detail}. Please analyze this chemically.`);
    }
}

// -----------------------------------------------------------------------------
// 5. 3D COMPONENTS (REACT THREE FIBER)
// -----------------------------------------------------------------------------

// -- MATERIALS --
const GlassMaterial = () => (
    <meshPhysicalMaterial
        transmission={1.0}
        thickness={0.5}
        roughness={0.05}
        ior={1.5}
        clearcoat={1.0}
        clearcoatRoughness={0}
        transparent
        side={THREE.FrontSide}
        color="#ffffff"
    />
);

const LiquidMaterial = ({ color, emissionIntensity = 0 }: { color: string, emissionIntensity?: number }) => (
    <meshPhysicalMaterial
        color={color}
        transmission={0.4}
        thickness={0.8}
        roughness={0.1}
        ior={1.33}
        transparent
        side={THREE.DoubleSide}
        attenuationColor={color}
        attenuationDistance={1.0}
        emissive={color}
        emissiveIntensity={emissionIntensity}
    />
);

// -- GEOMETRIES --
// Reusing logic via components
const BeakerMesh = ({ contents, id }: { contents: ContainerContents | null, id: string }) => {
    // Basic Lathe geometry for beaker
    const points = useMemo(() => {
        const pts = [];
        pts.push(new THREE.Vector2(0, 0));
        pts.push(new THREE.Vector2(0.9 * 0.5, 0));
        pts.push(new THREE.Vector2(0.5, 0.1));
        pts.push(new THREE.Vector2(0.5, 1.2));
        pts.push(new THREE.Vector2(0.55, 1.22));
        return pts;
    }, []);

    const glow = contents && contents.temperature && contents.temperature > 100
        ? Math.min((contents.temperature - 100) / 500, 2.0)
        : 0;

    return (
        <group>
            {/* Glass Body */}
            <mesh castShadow receiveShadow>
                <latheGeometry args={[points, 32]} />
                <GlassMaterial />
            </mesh>

            {/* Liquid Content */}
            {contents && contents.volume > 0.01 && (
                <mesh position={[0, 0.5 * (contents.volume * 1.15), 0]} scale={[1, contents.volume * 1.15, 1]}>
                     <cylinderGeometry args={[0.46, 0.46, 1, 32]} />
                     <LiquidMaterial color={contents.color} emissionIntensity={glow} />
                </mesh>
            )}

            {/* Label */}
            {contents && (
                <Text position={[0, 1.5, 0]} fontSize={0.2} color="white" anchorX="center" anchorY="middle">
                    {CHEMICALS[contents.chemicalId]?.name}
                </Text>
            )}
        </group>
    );
};

const SourceItemMesh = ({ id, chemicalId }: { id: string, chemicalId: string }) => {
    const chem = CHEMICALS[chemicalId];
    if (!chem) return null;

    return (
        <group>
            {chem.meshStyle === 'flask' && (
                <group>
                    <mesh castShadow>
                        <cylinderGeometry args={[0.15, 0.4, 0.8, 32]} />
                        <GlassMaterial />
                    </mesh>
                    <mesh position={[0, -0.1, 0]}>
                         <cylinderGeometry args={[0.12, 0.35, 0.5, 32]} />
                         <meshStandardMaterial color={chem.color} />
                    </mesh>
                </group>
            )}
            {chem.meshStyle === 'rock' && (
                <mesh castShadow>
                    <dodecahedronGeometry args={[0.3, 0]} />
                    <meshStandardMaterial color={chem.color} roughness={0.9} />
                </mesh>
            )}
            {chem.meshStyle === 'crystal' && (
                <mesh castShadow>
                    <octahedronGeometry args={[0.3, 0]} />
                    <meshPhysicalMaterial color={chem.color} transmission={0.4} roughness={0.1} />
                </mesh>
            )}
            {chem.meshStyle === 'mound' && (
                <mesh castShadow position={[0, -0.1, 0]}>
                    <coneGeometry args={[0.4, 0.4, 16]} />
                    <meshStandardMaterial color={chem.color} roughness={1} />
                </mesh>
            )}
            {chem.meshStyle === 'canister' && (
                 <mesh castShadow>
                     <capsuleGeometry args={[0.3, 0.8, 4, 12]} />
                     <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} />
                 </mesh>
            )}

            <Text position={[0, 0.8, 0]} fontSize={0.15} color="white" anchorX="center" anchorY="middle">
                {chem.name}
            </Text>
        </group>
    );
};

// -- SCENE OBJECTS --
const Heater = ({ position }: { position: [number, number, number] }) => {
    return (
        <group position={position}>
            <mesh receiveShadow position={[0, 0.05, 0]}>
                <boxGeometry args={[1.5, 0.1, 1.5]} />
                <meshStandardMaterial color="#334155" metalness={0.5} />
            </mesh>
            <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.3, 0.6, 32]} />
                <meshStandardMaterial color="#ea580c" emissive="#ea580c" emissiveIntensity={2} />
            </mesh>
            <Text position={[0, 0.3, 0.8]} fontSize={0.15} color="orange" rotation={[-Math.PI / 4, 0, 0]}>
                HOT PLATE (800°C)
            </Text>
        </group>
    );
};

const Analyzer = ({ position, containers }: { position: [number, number, number], containers: ContainerState[] }) => {
    // Proximity Check Logic for Display
    const [display, setDisplay] = useState<{name: string, ph: string, temp: string} | null>(null);

    useFrame(() => {
        const myPos = new THREE.Vector3(...position);
        let found = null;
        for (const c of containers) {
            // Check distance to containers
            // Note: Since containers are moving in React State, this might lag if we don't track refs.
            // But containers prop is passed down.
            if (c.contents && new THREE.Vector3(...c.position).distanceTo(myPos) < 1.0) {
                found = c;
                break;
            }
        }
        if (found && found.contents) {
            const chem = CHEMICALS[found.contents.chemicalId];
            setDisplay({
                name: chem.name,
                ph: chem.ph.toFixed(1),
                temp: (found.contents.temperature || 25).toFixed(0) + "°C"
            });
        } else {
            setDisplay(null);
        }
    });

    return (
        <group position={position}>
            {/* Body */}
            <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
                <boxGeometry args={[0.8, 0.8, 0.6]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Probe */}
            <mesh position={[0.5, 0.5, 0]} rotation={[0, 0, -Math.PI / 4]}>
                <cylinderGeometry args={[0.02, 0.02, 0.8]} />
                <meshStandardMaterial color="#94a3b8" />
            </mesh>
            {/* Screen */}
            <group position={[0, 0.4, 0.31]}>
                <mesh>
                    <planeGeometry args={[0.6, 0.4]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>
                {display ? (
                    <group position={[0, 0, 0.01]}>
                        <Text position={[0, 0.1, 0]} fontSize={0.08} color="#22c55e" anchorX="center">
                            {display.name}
                        </Text>
                        <Text position={[0, -0.05, 0]} fontSize={0.12} color="#22c55e" anchorX="center">
                            pH: {display.ph}
                        </Text>
                        <Text position={[0, -0.15, 0]} fontSize={0.08} color="#22c55e" anchorX="center">
                            {display.temp}
                        </Text>
                    </group>
                ) : (
                    <Text position={[0, 0, 0.01]} fontSize={0.1} color="#22c55e" anchorX="center">
                        READY
                    </Text>
                )}
            </group>
        </group>
    );
};

// -- MAIN SCENE --
const LabSceneContent = ({
    containers,
    onMove,
    onPour,
    onUpdate,
    lastEffect
}: {
    containers: ContainerState[],
    onMove: (id: string, pos: [number, number, number]) => void,
    onPour: (source: string, target: string) => void,
    onUpdate: (id: string, updates: Partial<ContainerContents>) => void,
    lastEffect: string | null
}) => {
    const { camera, scene } = useThree();
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.11));
    const lastUpdateRef = useRef(0);

    // Pouring Logic (Right Click)
    const [isRightClick, setIsRightClick] = useState(false);

    useEffect(() => {
        const down = (e: MouseEvent) => { if(e.button === 2) setIsRightClick(true); }
        const up = (e: MouseEvent) => { if(e.button === 2) setIsRightClick(false); }
        window.addEventListener('mousedown', down);
        window.addEventListener('mouseup', up);
        window.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent context menu
        return () => {
             window.removeEventListener('mousedown', down);
             window.removeEventListener('mouseup', up);
        }
    }, []);

    useFrame((state, delta) => {
        // Camera Shake
        if (lastEffect === 'explosion') {
             camera.position.x += (Math.random() - 0.5) * 0.1;
             camera.position.y += (Math.random() - 0.5) * 0.1;
             camera.position.z += (Math.random() - 0.5) * 0.1;
        }

        // Pouring check
        if (draggedId && isRightClick) {
            const source = containers.find(c => c.id === draggedId);
            if (source) {
                const myPos = new THREE.Vector3(...source.position);
                const nearby = containers.find(c => c.id !== draggedId && new THREE.Vector3(...c.position).distanceTo(myPos) < 1.5);
                if (nearby) onPour(draggedId, nearby.id);
            }
        }

        // Heating Logic (Throttled)
        lastUpdateRef.current += delta;
        if (lastUpdateRef.current > 0.1) {
            lastUpdateRef.current = 0;
            const heaterPos = new THREE.Vector3(3, 0.11, 0);
            containers.forEach(c => {
                if (c.contents && c.id.startsWith('beaker')) {
                    const dist = new THREE.Vector3(...c.position).distanceTo(heaterPos);
                    const currentTemp = c.contents.temperature || 25;
                    let newTemp = currentTemp;

                    if (dist < 1.0) {
                        // Heat up (Target 800)
                        if (currentTemp < 800) newTemp += 25;
                    } else {
                        // Cool down (Target 25)
                        if (currentTemp > 25) newTemp -= 2;
                    }

                    if (Math.abs(newTemp - currentTemp) > 1) {
                         onUpdate(c.id, { temperature: Math.min(800, Math.max(25, newTemp)) });
                    }
                }
            });
        }
    });

    const handlePlaneMove = (e: ThreeEvent<PointerEvent>) => {
        if (draggedId) {
            e.stopPropagation();
            onMove(draggedId, [e.point.x, 0.11, e.point.z]);
        }
    };

    return (
        <>
            <ambientLight intensity={0.5} />
            <spotLight position={[5, 10, 5]} angle={0.5} penumbra={0.5} intensity={200} castShadow shadow-bias={-0.0001} />
            <pointLight position={[-5, 5, -5]} intensity={10} color="#06b6d4" />

            {/* Post Processing */}
            <EffectComposer>
                <SSAO
                    radius={0.4}
                    intensity={50}
                    luminanceInfluence={0.4}
                    worldDistanceThreshold={10}
                    worldDistanceFalloff={0.5}
                    worldProximityThreshold={1.0}
                    worldProximityFalloff={0.1}
                />
                <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} levels={8} />
                <Vignette offset={0.3} darkness={0.5} />
                <Noise opacity={0.02} />
            </EffectComposer>

            {/* Table & Environment */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0]} receiveShadow>
                <boxGeometry args={[12, 0.2, 6]} />
                <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
            </mesh>

            <Shelf />
            <Heater position={[3, 0.11, 0]} />
            <Analyzer position={[-3, 0.11, 0.5]} containers={containers} />

            {/* Drag Plane */}
            {draggedId && (
                <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0.11, 0]}
                    visible={false}
                    onPointerMove={handlePlaneMove}
                    onPointerUp={() => setDraggedId(null)}
                >
                    <planeGeometry args={[100, 100]} />
                </mesh>
            )}

            {/* Containers */}
            {containers.map(container => {
                const isDragged = draggedId === container.id;
                // Check if pouring (Right Click + Dragged + Beaker)
                const isPouring = isDragged && isRightClick && container.id.startsWith('beaker');
                // Tilt if pouring
                const rotation: [number, number, number] = isPouring ? [0, 0, -Math.PI / 4] : [0, 0, 0];

                return (
                    <group
                        key={container.id}
                        position={container.position}
                        rotation={rotation}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            setDraggedId(container.id);
                            (e.target as HTMLElement).setPointerCapture(e.pointerId);
                        }}
                        onPointerUp={(e) => {
                            e.stopPropagation();
                            setDraggedId(null);
                            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                        }}
                    >
                        {container.id.startsWith('beaker') ? (
                            <BeakerMesh contents={container.contents} id={container.id} />
                        ) : (
                            <SourceItemMesh id={container.id} chemicalId={container.contents!.chemicalId} />
                        )}
                    </group>
                );
            })}
        </>
    );
};

const Shelf = () => (
    <mesh position={[0, 0.5, -3.5]} receiveShadow>
        <boxGeometry args={[10, 0.1, 2.5]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.1} />
    </mesh>
);

// -----------------------------------------------------------------------------
// 6. UI COMPONENT (HUD)
// -----------------------------------------------------------------------------

const LabUI = ({
    heaterTemp,
    setHeaterTemp,
    onSpawn,
    onReset,
    chatHistory,
    onChat
}: any) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden font-sans text-white select-none">
             <div className="pointer-events-auto">
                 <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
             </div>

             {/* TOP-LEFT HEADER */}
             <div className="absolute top-6 left-6 pointer-events-auto animate-in slide-in-from-left duration-700">
                 <h1 className="text-4xl font-mono font-extrabold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] tracking-wider">CHEMIC-AI</h1>
                 <div className="text-cyan-400 text-xs tracking-[0.3em] font-bold mt-1">QUANTUM REALITY ENGINE</div>
                 <div className="flex gap-2 mt-2">
                     <span className="bg-indigo-600 text-[9px] font-bold px-2 py-0.5 rounded shadow-lg shadow-indigo-500/50">AAA</span>
                     <span className="bg-slate-800 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                         SAFE MODE <span className="animate-pulse">●</span>
                     </span>
                 </div>
             </div>

             {/* TOP-RIGHT ACTION DECK */}
             <div className="absolute top-6 right-6 flex gap-2 pointer-events-auto animate-in slide-in-from-right duration-700">
                 <button onClick={() => setIsSettingsOpen(true)} className="bg-slate-900/80 hover:bg-white/10 text-slate-300 border border-slate-700/50 w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-lg active:scale-95">
                     ⚙️
                 </button>
                 <button onClick={onReset} className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] active:scale-95">
                     ⚠ RESET
                 </button>
             </div>

             {/* LEFT WING: QUESTS & INVENTORY */}
             <div className="absolute top-32 left-6 w-64 pointer-events-auto flex flex-col gap-4 animate-in slide-in-from-left duration-1000 delay-100">
                 {/* QUESTS */}
                 <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4 shadow-2xl">
                     <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">ACTIVE PROTOCOLS</h2>
                     <div className="space-y-2">
                         <div className="flex items-center gap-2 text-xs text-slate-300">
                             <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_5px_currentColor]"></span>
                             <span>Synthesize Sodium Chloride</span>
                         </div>
                         <div className="flex items-center gap-2 text-xs text-slate-500">
                             <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                             <span>Analyze pH Levels</span>
                         </div>
                     </div>
                 </div>

                 {/* INVENTORY */}
                 <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col shadow-2xl max-h-[50vh]">
                     <div className="p-3 bg-white/5 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         STORAGE
                     </div>
                     <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                         <button onClick={() => onSpawn('BEAKER')} className="w-full text-left p-2 rounded hover:bg-white/10 text-[11px] text-slate-300 transition-colors flex items-center gap-2 group">
                            <span className="w-2 h-2 border border-slate-500 rounded-full group-hover:border-white transition-colors"></span>
                            Sterile Beaker
                         </button>
                         {Object.values(CHEMICALS).map(c => (
                             <button key={c.id} onClick={() => onSpawn(c.id)} className="w-full text-left p-2 rounded hover:bg-white/10 text-[11px] text-slate-300 transition-colors flex items-center gap-2 group">
                                <span className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] group-hover:scale-125 transition-transform" style={{ backgroundColor: c.color }}></span>
                                {c.name}
                             </button>
                         ))}
                     </div>
                 </div>
             </div>

             {/* BOTTOM-RIGHT: CHAT */}
             <div className="absolute bottom-6 right-6 w-80 pointer-events-auto animate-in slide-in-from-bottom duration-700 delay-200">
                 <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col shadow-2xl">
                     <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-slate-950/50">
                         {/* SQUARE AVATAR */}
                         <img src="/lucy_avatar.png" className="w-12 h-12 object-cover border border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] shrink-0" alt="Lucy" />
                         <div>
                             <div className="font-bold text-sm text-white">Professor Lucy</div>
                             <div className="text-[9px] text-cyan-400 font-mono">● ONLINE // QUANTUM_UPLINK_ESTABLISHED</div>
                         </div>
                     </div>
                     <div className="h-64 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3 bg-slate-900/30">
                         {chatHistory.map((msg: any, i: number) => (
                             <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                                     msg.role === 'user'
                                     ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-br-none'
                                     : 'bg-slate-800/80 text-slate-300 border border-slate-700/50 rounded-bl-none'
                                 }`}>
                                     {msg.text}
                                 </div>
                             </div>
                         ))}
                     </div>
                     <div className="p-3 border-t border-white/5 bg-slate-950/50">
                         <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-600"
                            placeholder="Ask Professor Lucy..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onChat(e.currentTarget.value);
                                    e.currentTarget.value = '';
                                }
                            }}
                         />
                     </div>
                 </div>
             </div>
        </div>
    );
};

// -----------------------------------------------------------------------------
// 7. MAIN APP COMPONENT
// -----------------------------------------------------------------------------

export default function App() {
    // Logic State
    const [containers, setContainers] = useState<ContainerState[]>([
        { id: 'beaker-1', position: [-1.5, 0.11, 0], contents: { chemicalId: 'H2O', volume: 0.6, color: CHEMICALS['H2O'].color, temperature: 25 } },
        { id: 'beaker-2', position: [1.5, 0.11, 0], contents: null }
    ]);
    const [heaterTemp, setHeaterTemp] = useState(300);
    const [lastReaction, setLastReaction] = useState<string | null>(null);
    const [lastEffect, setLastEffect] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

    // Services
    const aiServiceRef = useRef<GeminiService | null>(null);

    useEffect(() => {
        aiServiceRef.current = new GeminiService();
        aiServiceRef.current.onHistoryUpdate = (h) => setChatHistory([...h]);
    }, []);

    const handleMove = useCallback((id: string, pos: [number, number, number]) => {
        setContainers(prev => prev.map(c => c.id === id ? { ...c, position: pos } : c));
    }, []);

    const handlePour = useCallback((sourceId: string, targetId: string) => {
        setContainers(prev => {
             const source = prev.find(c => c.id === sourceId);
             const target = prev.find(c => c.id === targetId);
             if (!source || !target || !source.contents || source.contents.volume <= 0) return prev;

             const amount = 0.05;
             const targetChemId = target.contents ? target.contents.chemicalId : 'H2O';
             const targetVol = target.contents ? target.contents.volume : 0;
             // Use current temperature for mixing
             const currentTemp = target.contents?.temperature || 25;

             // Mix Logic
             const mix = ChemistryEngine.mix(targetChemId, targetVol, source.contents.chemicalId, amount, currentTemp);

             return prev.map(c => {
                 if (c.id === sourceId) {
                     return { ...c, contents: { ...c.contents!, volume: Math.max(0, c.contents!.volume - amount) } };
                 }
                 if (c.id === targetId) {
                     return { ...c, contents: { chemicalId: mix.resultId, volume: targetVol + amount, color: mix.resultColor, temperature: mix.reaction?.temperature || currentTemp, reactants: mix.reactants } };
                 }
                 return c;
             });
        });
    }, []);

    const handleUpdate = useCallback((id: string, updates: Partial<ContainerContents>) => {
        setContainers(prev => prev.map(c => {
            if (c.id === id && c.contents) {
                const newTemp = updates.temperature !== undefined ? updates.temperature : c.contents.temperature;
                let newContents = { ...c.contents, ...updates };

                // Check for delayed reactions if temperature changed
                if (newTemp && newTemp > (c.contents.temperature || 0) && c.contents.reactants) {
                    const [r1, r2] = c.contents.reactants;
                    // Try mixing again at new temp
                    const mix = ChemistryEngine.mix(r1, 0.5, r2, 0.5, newTemp); // Volume doesn't matter for reaction check
                    if (mix.reaction) {
                         newContents = {
                             ...newContents,
                             chemicalId: mix.resultId,
                             color: mix.resultColor,
                             temperature: mix.reaction.temperature,
                             reactants: undefined // Reaction consumed
                         };
                         // Trigger effects
                         setLastReaction(mix.reaction.message);
                         setLastEffect(mix.reaction.effect || null);
                         setTimeout(() => setLastEffect(null), 2000);
                    }
                }
                return { ...c, contents: newContents };
            }
            return c;
        }));
    }, []);

    const handleSpawn = (chemId: string) => {
        const isBeaker = chemId === 'BEAKER';
        const newId = isBeaker ? `beaker-${Date.now()}` : `source_${chemId}_${Date.now()}`;
        const chem = CHEMICALS[chemId];
        const x = (Math.random() - 0.5) * 4;
        setContainers(prev => [...prev, {
            id: newId,
            position: [x, 0.11, isBeaker ? 0 : -3.5],
            contents: isBeaker ? null : { chemicalId: chemId, volume: 1.0, color: chem.color, temperature: 25 }
        }]);
    };

    const handleReset = () => {
        setContainers([
            { id: 'beaker-1', position: [-1.5, 0.11, 0], contents: { chemicalId: 'H2O', volume: 0.6, color: CHEMICALS['H2O'].color, temperature: 25 } },
            { id: 'beaker-2', position: [1.5, 0.11, 0], contents: null }
        ]);
        setLastReaction(null);
        setLastEffect(null);
        setChatHistory([]);
        aiServiceRef.current?.startNewChat();
    };

    return (
        <div className="w-full h-screen bg-slate-950">
            <LabUI
                heaterTemp={heaterTemp}
                setHeaterTemp={setHeaterTemp}
                onSpawn={handleSpawn}
                onReset={handleReset}
                chatHistory={chatHistory}
                onChat={(msg: string) => aiServiceRef.current?.chat(msg)}
            />
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 6, 10], fov: 45 }}>
                <Suspense fallback={null}>
                    <Environment preset="city" />
                    <LabSceneContent
                        containers={containers}
                        onMove={handleMove}
                        onPour={handlePour}
                        onUpdate={handleUpdate}
                        lastEffect={lastEffect}
                    />
                    <OrbitControls makeDefault />
                </Suspense>
            </Canvas>
        </div>
    );
}
