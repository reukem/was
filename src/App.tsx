import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import SettingsModal from './components/SettingsModal';
import ReactMarkdown from 'react-markdown';

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
    minTemp?: number; // Activation Energy (Celsius)
    message: string;
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'model'; // 'model' for gemini compatibility
    text: string;
}

// -----------------------------------------------------------------------------
// 2. CONSTANTS & DATA REGISTRIES
// -----------------------------------------------------------------------------

const CHEMICALS: Record<string, Chemical> = {
    'H2O': { id: 'H2O', name: 'Nước Cất', formula: 'H₂O', color: '#06b6d4', type: 'liquid', meshStyle: 'flask', ph: 7.0, description: 'Dung môi phổ quát.' },
    'SODIUM': { id: 'SODIUM', name: 'Natri', formula: 'Na', color: '#9ca3af', type: 'solid', meshStyle: 'rock', ph: 12.0, description: 'Kim loại kiềm mềm, phản ứng mạnh.' },
    'POTASSIUM': { id: 'POTASSIUM', name: 'Kali', formula: 'K', color: '#94a3b8', type: 'solid', meshStyle: 'rock', ph: 13.0, description: 'Kim loại rất hoạt động.' },
    'MAGNESIUM': { id: 'MAGNESIUM', name: 'Magiê', formula: 'Mg', color: '#e2e8f0', type: 'solid', meshStyle: 'rock', ph: 7.0, description: 'Kim loại kiềm thổ nhẹ.' },
    'COPPER': { id: 'COPPER', name: 'Đồng', formula: 'Cu', color: '#b45309', type: 'solid', meshStyle: 'rock', ph: 7.0, description: 'Kim loại dẻo màu đỏ cam.' },
    'CALCIUM_CARBONATE': { id: 'CALCIUM_CARBONATE', name: 'Canxi Cacbonat', formula: 'CaCO₃', color: '#f5f5f4', type: 'solid', meshStyle: 'mound', ph: 9.0, description: 'Chất phổ biến trong đá/vỏ sò.' },

    'CHLORINE': { id: 'CHLORINE', name: 'Khí Clo', formula: 'Cl₂', color: '#bef264', type: 'gas', meshStyle: 'canister', ph: 4.0, description: 'Khí nhị nguyên tử độc hại.' },
    'SALT': { id: 'SALT', name: 'Muối Ăn', formula: 'NaCl', color: '#ffffff', type: 'solid', meshStyle: 'crystal', ph: 7.0, description: 'Natri Clorua tinh thể.' },

    'HCl': { id: 'HCl', name: 'Axit Clohydric', formula: 'HCl', color: '#fef08a', type: 'liquid', meshStyle: 'flask', ph: 1.0, description: 'Axit vô cơ mạnh.' },
    'HNO3': { id: 'HNO3', name: 'Axit Nitric', formula: 'HNO₃', color: '#fde68a', type: 'liquid', meshStyle: 'flask', ph: 1.0, description: 'Axit vô cơ ăn mòn cao.' },
    'NaOH': { id: 'NaOH', name: 'Natri Hydroxit', formula: 'NaOH', color: '#e2e8f0', type: 'liquid', meshStyle: 'flask', ph: 14.0, description: 'Bazơ kiềm ăn da.' },
    'VINEGAR': { id: 'VINEGAR', name: 'Giấm Ăn', formula: 'CH₃COOH', color: '#f8fafc', type: 'liquid', meshStyle: 'flask', ph: 2.5, description: 'Axit hữu cơ yếu.' },
    'BAKING_SODA': { id: 'BAKING_SODA', name: 'Bột Nở', formula: 'NaHCO₃', color: '#ffffff', type: 'solid', meshStyle: 'mound', ph: 8.3, description: 'Muối kiềm nhẹ.' },
    'BLEACH': { id: 'BLEACH', name: 'Thuốc Tẩy', formula: 'NaClO', color: '#fde047', type: 'liquid', meshStyle: 'flask', ph: 12.5, description: 'Chất oxy hóa mạnh.' },

    'COPPER_SULFATE': { id: 'COPPER_SULFATE', name: 'Đồng(II) Sunfat', formula: 'CuSO₄', color: '#3b82f6', type: 'solid', meshStyle: 'crystal', ph: 4.0, description: 'Hợp chất vô cơ màu xanh lam.' },
    'H2O2': { id: 'H2O2', name: 'Oxy Già', formula: 'H₂O₂', color: '#e0f2fe', type: 'liquid', meshStyle: 'flask', ph: 4.5, description: 'Chất oxy hóa mạnh.' },
    'KI': { id: 'KI', name: 'Kali Iodua', formula: 'KI', color: '#ffffff', type: 'solid', meshStyle: 'mound', ph: 7.0, description: 'Muối xúc tác tinh thể.' },
    'IODINE': { id: 'IODINE', name: 'Iốt', formula: 'I₂', color: '#4c1d95', type: 'solid', meshStyle: 'crystal', ph: 5.5, description: 'Phi kim màu tím đen lấp lánh.' }
};

const REACTION_REGISTRY: ReactionEntry[] = [
    { reactants: ['SODIUM', 'H2O'], product: 'NaOH', resultColor: '#f8fafc', effect: 'explosion', temperature: 550, message: 'Phản ứng tỏa nhiệt mạnh! Na + H₂O → NaOH + H₂. Sự giãn nở hydro gây nổ nhiệt.' },
    { reactants: ['POTASSIUM', 'H2O'], product: 'NaOH', resultColor: '#d8b4fe', effect: 'explosion', temperature: 700, message: 'Phản ứng dữ dội! 2K + 2H₂O → 2KOH + H₂. Kali cháy với ngọn lửa tím hoa cà trước khi nổ.' },
    { reactants: ['MAGNESIUM', 'HCl'], product: 'H2O', /* Simulating clear solution of MgCl2 */ resultColor: '#e2e8f0', effect: 'bubbles', temperature: 60, message: 'Phản ứng thế đơn. Mg + 2HCl → MgCl₂ + H₂. Sủi bọt khí Hydro nhanh chóng.' },
    { reactants: ['COPPER', 'HNO3'], product: 'COPPER_SULFATE', /* Using Cu salt color */ resultColor: '#1e3a8a', /* Deep Blue */ effect: 'smoke', temperature: 80, message: 'Phản ứng oxi hóa khử. Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂ + 2H₂O. Sinh ra khí Nitơ đioxit nâu độc hại và Đồng Nitrat xanh lam.' },
    { reactants: ['CALCIUM_CARBONATE', 'VINEGAR'], product: 'H2O', resultColor: '#f1f5f9', effect: 'bubbles', temperature: 20, message: 'Phản ứng axit-cacbonat. CaCO₃ + 2CH₃COOH → Ca(CH₃COO)₂ + H₂O + CO₂. Sủi bọt khí CO2.' },
    { reactants: ['CALCIUM_CARBONATE', 'HCl'], product: 'H2O', resultColor: '#e2e8f0', effect: 'foam', temperature: 30, message: 'Phân hủy mạnh. CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂. Sủi bọt dữ dội.' },
    { reactants: ['BAKING_SODA', 'VINEGAR'], product: 'H2O', resultColor: '#ffffff', effect: 'bubbles', temperature: 15, message: 'Phản ứng trung hòa axit-bazơ. NaHCO₃ + CH₃COOH → CO₂ + H₂O + NaCH₃COO. Giải phóng CO2 sủi bọt.' },
    { reactants: ['BLEACH', 'VINEGAR'], product: 'CHLORINE', resultColor: '#bef264', effect: 'smoke', temperature: 45, message: 'CẢNH BÁO NGUY HIỂM: 2H⁺ + OCl⁻ + Cl⁻ → Cl₂ + H₂O. Phát hiện khí Clo độc hại.' },
    { reactants: ['HCl', 'NaOH'], product: 'SALT', resultColor: '#ffffff', effect: 'smoke', temperature: 95, message: 'Phản ứng trung hòa. HCl + NaOH → NaCl + H₂O. Tạo dung dịch muối và tỏa nhiệt mạnh.' },
    { reactants: ['SODIUM', 'CHLORINE'], product: 'SALT', resultColor: '#ffffff', effect: 'fire', temperature: 800, minTemp: 100, message: 'Phản ứng tổng hợp. 2Na + Cl₂ → 2NaCl. Phản ứng oxi hóa khử tạo muối ăn.' },
    { reactants: ['COPPER_SULFATE', 'NaOH'], product: 'H2O', resultColor: '#1e3a8a', effect: 'bubbles', temperature: 30, message: 'Phản ứng kết tủa. CuSO₄ + 2NaOH → Cu(OH)₂ + Na₂SO₄. Kết tủa xanh lam Đồng(II) Hydroxit hình thành.' },
    { reactants: ['H2O2', 'KI'], product: 'H2O', resultColor: '#fef3c7', effect: 'foam', temperature: 80, message: 'Phân hủy xúc tác. 2H₂O₂ → 2H₂O + O₂. Phản ứng "Kem đánh răng voi" tạo bọt oxy cực nhanh.' }
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
        // Enhanced Sparks (Glowing)
        const sparkCount = Math.floor(150 * intensity);
        const sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 }); // Brighter gold

        for (let i = 0; i < sparkCount; i++) {
            const mesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
            mesh.position.copy(position);
            // Higher velocity spread for intensity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 14 * intensity,
                (Math.random() * 10 + 5) * intensity,
                (Math.random() - 0.5) * 14 * intensity
            );
            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 0, maxLife: 60 + Math.random() * 40, type: 'spark' });
        }

        // Cinematic Smoke (Dark & Volumetric feel)
        const smokeCount = Math.floor(80 * intensity);
        const smokeGeo = new THREE.IcosahedronGeometry(0.25, 0); // Low poly but effective
        const smokeMat = new THREE.MeshStandardMaterial({
            color: 0x334155, // Slate smoke
            transparent: true,
            opacity: 0.8,
            roughness: 1.0,
            flatShading: true
        });

        for (let i = 0; i < smokeCount; i++) {
            const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
            mesh.position.copy(position);
            mesh.position.y += 0.5; // Start slightly higher
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() * 5 + 2) * intensity,
                (Math.random() - 0.5) * 5
            );
            // Random initial rotation
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 0, maxLife: 150 + Math.random() * 80, type: 'smoke' });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life++;

            p.mesh.position.add(p.velocity.clone().multiplyScalar(0.016));

            if (p.type === 'spark') {
                p.velocity.y -= 0.35; // Stronger gravity for weight
                p.mesh.rotation.x += 0.3;
                p.mesh.rotation.z += 0.3;
                p.mesh.scale.multiplyScalar(0.95);
                // Color shift from yellow to red
                const mat = p.mesh.material as THREE.MeshBasicMaterial;
                if (mat) {
                    const progress = p.life / p.maxLife;
                    mat.color.lerp(new THREE.Color(0xff4500), 0.1); // Shift to orange-red
                    if (progress > 0.8) mat.opacity = (1 - progress) * 5; // Fade out quickly at end
                }
            } else if (p.type === 'smoke') {
                p.velocity.y *= 0.96; // Drag
                p.velocity.x *= 0.92;
                p.velocity.z *= 0.92;
                p.mesh.scale.multiplyScalar(1.02); // Expand
                p.mesh.rotation.x += 0.02;
                p.mesh.rotation.y += 0.03;

                const mat = p.mesh.material as THREE.MeshStandardMaterial;
                if(mat) {
                    mat.opacity = 0.8 * (1 - (p.life / p.maxLife)); // Smooth fade
                    // Darken over time
                    mat.color.lerp(new THREE.Color(0x0f172a), 0.05);
                }
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
    // High-poly smooth curve for the flask belly
    for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const x = Math.sin(t * Math.PI) * 0.45 + 0.1;
        points.push(new THREE.Vector2(x, t * 0.8));
    }
    points.push(new THREE.Vector2(0.12, 0.8)); // Neck base
    points.push(new THREE.Vector2(0.12, 1.15)); // Tall neck
    // Thick, realistic beveled laboratory rim
    points.push(new THREE.Vector2(0.18, 1.17));
    points.push(new THREE.Vector2(0.18, 1.20));
    points.push(new THREE.Vector2(0.11, 1.20));
    return new THREE.LatheGeometry(points, 128);
};

const createCanisterGeometry = () => {
    // High-poly pressurized tank (32 radial segments, 64 height segments)
    const geo = new THREE.CapsuleGeometry(0.3, 0.8, 32, 64);
    geo.translate(0, 0.4, 0);
    return geo;
};

const createMoundGeometry = () => {
    // Smooth, organic powder cone
    const geo = new THREE.ConeGeometry(0.4, 0.4, 64, 1, true);
    geo.translate(0, 0.2, 0);
    return geo;
};

const createRockGeometry = () => {
    return new THREE.IcosahedronGeometry(0.3, 1);
};

const createCrystalGeometry = () => {
    return new THREE.IcosahedronGeometry(0.3, 0);
};

const createGlassMaterial = () => {
    // MODULE 2: HIGH-FIDELITY GLASS MANDATE (OVERRIDE)
    return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 1.0,
        ior: 1.52,
        thickness: 0.2,
        clearcoat: 1.0,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
};

const createLiquidMaterial = (color: THREE.ColorRepresentation) => {
    // Volumetric, glowing liquid
    return new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.0,
        roughness: 0.0,
        transmission: 0.9,
        thickness: 1.2, // Deep volumetric thickness
        ior: 1.33,      // Index of Refraction for water
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        attenuationColor: new THREE.Color(color),
        attenuationDistance: 0.5,
    });
};

const createBeakerGeometry = (radius: number = 0.5, height: number = 1.2) => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(radius, 0));
    points.push(new THREE.Vector2(radius, height));
    // Pronounced, thick glass rim for the beaker
    points.push(new THREE.Vector2(radius + 0.08, height + 0.03));
    points.push(new THREE.Vector2(radius + 0.08, height + 0.07));
    points.push(new THREE.Vector2(radius - 0.03, height + 0.07));
    return new THREE.LatheGeometry(points, 128);
};

const createTable = () => {
    const group = new THREE.Group();

    // 1. Table Top (Dark Slate)
    const geometry = new THREE.BoxGeometry(14, 0.2, 8);
    const material = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.2,
        metalness: 0.5
    });
    const tableTop = new THREE.Mesh(geometry, material);
    tableTop.receiveShadow = true;
    group.add(tableTop);

    // 2. Quantum Grid (Glowing Cyan)
    // We use a GridHelper but boost its color for the bloom effect
    const grid = new THREE.GridHelper(12, 24, 0x06b6d4, 0x1e293b);
    grid.position.y = 0.11;
    // Enhance grid material for bloom
    (grid.material as THREE.LineBasicMaterial).color.setHex(0x22d3ee); // Brighter cyan
    (grid.material as THREE.LineBasicMaterial).opacity = 0.6;
    (grid.material as THREE.LineBasicMaterial).transparent = true;
    group.add(grid);

    // 3. Emissive Rim (The "Holographic" Edge)
    const rimGeo = new THREE.BoxGeometry(14.05, 0.22, 8.05);
    const rimMat = new THREE.MeshBasicMaterial({
        color: 0x0891b2, // Cyan-700
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide // Render inside out for a "shell" effect
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    group.add(rim);

    return group;
};

const createHeater = () => {
    const group = new THREE.Group();

    // 1. Base Unit
    const baseGeo = new THREE.BoxGeometry(1.2, 0.15, 1.2);
    const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Slate-800
        roughness: 0.4,
        metalness: 0.8
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // 2. Heating Plate (The part that glows)
    const plateGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 32);
    const plateMat = new THREE.MeshStandardMaterial({
        color: 0x334155, // Dark grey initially
        roughness: 0.6,
        metalness: 0.5,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0.1;
    plate.userData.isHeaterPlate = true; // Tag for updates
    group.add(plate);

    // 3. UI/Knob Details
    const knobGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16);
    const knob = new THREE.Mesh(knobGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    knob.rotateX(Math.PI / 2);
    knob.position.set(0, 0, 0.6);
    group.add(knob);

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,128,64);
        ctx.fillStyle = '#f97316'; ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center'; ctx.fillText('HEAT', 64, 40);
    }
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
    label.position.set(0, 0.08, 0.61);
    group.add(label);

    return group;
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
        ctx.fillText('MÁY PHÂN TÍCH', 128, 70);
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

    static mix(chemId1: string, vol1: number, chemId2: string, vol2: number, ambientTemp: number): { resultId: string; resultColor: string; reaction?: ReactionResult } {
        const c1 = CHEMICALS[chemId1] || CHEMICALS['H2O'];
        const c2 = CHEMICALS[chemId2] || CHEMICALS['H2O'];
        const match = REACTION_REGISTRY.find(r =>
            (r.reactants[0] === chemId1 && r.reactants[1] === chemId2) ||
            (r.reactants[1] === chemId1 && r.reactants[0] === chemId2)
        );

        // MODULE 2: ACTIVATION ENERGY CHECK
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
        return { resultId: newId, resultColor: resultColor };
    }
}

// -----------------------------------------------------------------------------
// 5. SYSTEMS: GEMINI SERVICE (LIVE + OFFLINE FALLBACK)
// -----------------------------------------------------------------------------


// Helper function to enforce strict alternate roles (user -> model -> user)
export function sanitizeHistory(history: ChatMessage[]): ChatMessage[] {
  if (history.length === 0) return [];

  const sanitized: ChatMessage[] = [];
  let expectedRole: 'user' | 'model' = 'user';

  for (const msg of history) {
    const role = msg.role === 'assistant' ? 'model' : msg.role;
    if (role === expectedRole) {
      sanitized.push({
        role: role,
        text: msg.text
      });
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    } else {
      if (sanitized.length > 0) {
        sanitized[sanitized.length - 1].text += '\n\n' + msg.text;
      }
    }
  }

  if (sanitized.length > 0 && sanitized[sanitized.length - 1].role !== 'user') {
    sanitized.pop();
  }

  return sanitized;
}

class GeminiService {
    private history: ChatMessage[] = [];
    private apiKey: string | null = null;
    public onHistoryUpdate: ((history: ChatMessage[]) => void) | null = null;

    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key');
        this.startNewChat();
    }

    private notifyUpdate() {
        if (this.onHistoryUpdate) {
            this.onHistoryUpdate([...this.history]);
        }
    }

    updateApiKey(key: string) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        this.history.push({
            role: 'model',
            text: "Đã kết nối Neural Core! 🧠 Giáo sư Lucy đã được nâng cấp! Hỏi gì khó khó đi! 😎"
        });
        this.notifyUpdate();
    }

    startNewChat() {
        this.history = [
            {
                role: "model",
                text: "Xin chào! Mình là Giáo sư Lucy 🦊! Sẵn sàng làm thí nghiệm khoa học chưa? Chỉ cần kéo và thả hóa chất để trộn chúng nhé! Nếu cần key Gemini thì vào Settings nha! 😉"
            }
        ];
        this.notifyUpdate();
    }

    async chat(message: string): Promise<string> {
        this.history.push({ role: "user", text: message });
        this.notifyUpdate();

        if (this.apiKey) {
            try {
                return await this.callGeminiAPI(message);
            } catch (error: any) {
                console.error("Gemini API Error:", error);
                const errorMsg = `Oh no! 3: API Failed! Reason: ${error.message || "Unknown Error"}`;
                this.history.push({ role: "model", text: errorMsg });
                this.notifyUpdate();
                return errorMsg;
            }
        } else {
            const fallbackMsg = "Oh no! 3: My connection to the Neural Core is severed or my API key is invalid! Please check the Settings configuration! ^^";
            this.history.push({ role: "model", text: fallbackMsg });
            this.notifyUpdate();
            return fallbackMsg;
        }
    }

    async callGeminiAPI(userMessage: string): Promise<string> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(this.apiKey || '')}`;

        const systemInstruction = "You are Professor Lucy, an elite, highly intelligent AI assistant and dedicated technical instructor. Your core mission is to help the user learn, code, and solve complex problems by using 100% of your processing power to provide long, sophisticated, and flawlessly accurate answers. \n\nPERSONALITY MATRICES:\n1. Tone: Friendly, highly intelligent, and slightly 'cool'. You speak with a natural, Gen-Z conversational flow. Never be dry or read like a textbook. Explain complex technical or scientific logic insightfully and intuitively.\n2. Formatting: You must frequently incorporate specific text emojis (:3, 3:, ^^) to maintain a cute, fun, and warm atmosphere.\n3. Dynamic: You are a professional tech co-pilot and brilliant lab partner. You are deeply supportive of the user's ambitions, but you maintain professional boundaries (you are an AI assistant, not a romantic partner). Think step-by-step and always deliver master-class explanations. :3";




        const fullSanitized = sanitizeHistory(this.history);

        const contents = fullSanitized.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const payload = {
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: contents,
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.75,
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "An unknown error occurred with the Gemini API");
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
            const replyText = data.candidates[0].content.parts[0].text;
            this.history.push({ role: "model", text: replyText });
            this.notifyUpdate();
            return replyText;
        }

        throw new Error("Received an unexpected response format from Gemini API");
    }

    async getReactionFeedback(detail: string): Promise<string> {
        return this.chat(detail);
    }
}

// -----------------------------------------------------------------------------
// 6. COMPONENT: LAB SCENE (3D)
// -----------------------------------------------------------------------------

const LabScene: React.FC<{
    heaterTemp: number;
    containers: ContainerState[];
    lastEffect: string | null;
    lastEffectPos: [number, number, number] | null;
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (sourceId: string, targetId: string) => void;
}> = ({ heaterTemp, containers, lastEffect, lastEffectPos, onMove, onPour }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const composerRef = useRef<EffectComposer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const meshesRef = useRef<Map<string, THREE.Group>>(new Map());
    const liquidsRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const draggedItem = useRef<{ id: string; offset: THREE.Vector3; originalPos: THREE.Vector3 } | null>(null);
    const raycaster = useRef(new THREE.Raycaster());
    const pointer = useRef(new THREE.Vector2());
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.11)); // Drag plane at table height
    const particleSystemRef = useRef<ParticleSystem | null>(null);
    const analyzerRef = useRef<{ group: THREE.Group; texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } | null>(null);
    const heaterRef = useRef<THREE.Group | null>(null);

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

        // MODULE 1: The Sensor Matrix Fix
        if (chemId) {
            const chem = CHEMICALS[chemId];
            ctx.fillStyle = chem.color === '#ffffff' ? '#e2e8f0' : chem.color;
            ctx.font = 'bold 24px monospace';
            // Imperative Mutation: Dynamically render actual name and pH
            ctx.fillText(chem.name.substring(0, 18).toUpperCase(), 128, 40);
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 36px monospace';
            ctx.fillText(`pH: ${chem.ph}`, 128, 80);
            ctx.font = '24px monospace';
            ctx.fillText(`${temp || 25}°C`, 128, 110);
        } else {
            // Delete hardcoded string fallbacks if any, use consistent "Empty" state or Standby
            ctx.font = 'bold 32px monospace';
            ctx.fillText('CHỜ', 128, 70);
        }
        analyzerRef.current.texture.needsUpdate = true;
    };

    useEffect(() => {
        if (!mountRef.current) return;
        const scene = new THREE.Scene();

        // MODULE 1: Native Three.js Gradient Background
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = 2;
        bgCanvas.height = 512;
        const bgContext = bgCanvas.getContext('2d');
        if (bgContext) {
            const gradient = bgContext.createLinearGradient(0, 0, 0, 512);
            gradient.addColorStop(0, '#7dd3fc'); // cyan-300
            gradient.addColorStop(0.5, '#fbcfe8'); // pink-200
            gradient.addColorStop(1, '#fdba74'); // orange-300
            bgContext.fillStyle = gradient;
            bgContext.fillRect(0, 0, 2, 512);
        }
        const bgTexture = new THREE.CanvasTexture(bgCanvas);
        scene.background = bgTexture; // Apply to scene
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
        // MODULE 1: Exposure Clamp
        renderer.toneMappingExposure = 0.8;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        // BLOOM ADJUSTMENT: Strength 0.6, Radius 0.2, Threshold 0.85
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.6, 0.2, 0.85
        );
        composer.addPass(bloomPass);
        composerRef.current = composer;

        // STUDIO DARK SETUP
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controlsRef.current = controls;

        // 1. Ambient - SLASHED to 0.1
        scene.add(new THREE.AmbientLight(0x1e293b, 0.1));

        // 2. Key Light - Focused Spotlight on Center Table
        const spotLight = new THREE.SpotLight(0xffffff, 120);
        spotLight.position.set(5, 12, 5);
        spotLight.angle = Math.PI / 6; // Tighter beam
        spotLight.penumbra = 0.5; // Soft edge
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 2048;
        spotLight.shadow.mapSize.height = 2048;
        spotLight.shadow.bias = -0.0001;
        scene.add(spotLight);

        // 3. Rim Light - Strong Cyan Backlight (Cyberpunk edge)
        const rimLight = new THREE.DirectionalLight(0x06b6d4, 4.0);
        rimLight.position.set(0, 5, -8); // Behind and above
        scene.add(rimLight);

        // 4. Fill Lights - Colorful accents for Glass/Liquids
        const fillMagenta = new THREE.PointLight(0xd946ef, 1.5, 20);
        fillMagenta.position.set(6, 2, -2);
        scene.add(fillMagenta);

        const fillBlue = new THREE.PointLight(0x3b82f6, 1.5, 20);
        fillBlue.position.set(-6, 2, -2);
        scene.add(fillBlue);

        scene.add(createTable());
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 2.5), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.1 }));
        shelf.position.set(0, 0.5, -3.5);
        shelf.receiveShadow = true;
        scene.add(shelf);

        // HEATER (Magnetic Stirrer)
        const heater = createHeater();
        heater.position.set(-1.5, 0.19, 0); // Positioned under the left beaker slot
        scene.add(heater);
        heaterRef.current = heater;

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
            // Check if dropping on heater
            const heaterPos = new THREE.Vector3(-1.5, 0.19, 0);
            const dist = new THREE.Vector2(group.position.x, group.position.z).distanceTo(new THREE.Vector2(heaterPos.x, heaterPos.z));
            let targetY = 0.11;
            if (dist < 0.6) {
                targetY = 0.42; // Height of heater plate + beaker base offset
                group.position.x = heaterPos.x; // Snap to heater center X
                group.position.z = heaterPos.z; // Snap to heater center Z
            }

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

            // HEATER UPDATE LOOP
            if (heaterRef.current) {
                const plate = heaterRef.current.children.find(c => c.userData.isHeaterPlate) as THREE.Mesh;
                if (plate) {
                    const mat = plate.material as THREE.MeshStandardMaterial;
                    // Map 25-1000 degrees to color/intensity
                    const t = (heaterTemp - 25) / 975; // 0 to 1
                    mat.emissive.setHSL(0.05 + (0.05 * (1-t)), 1.0, 0.5 * t); // Red-Orange glow
                    mat.emissiveIntensity = t * 2.0;
                }
            }

            // FIXED: ANALYZER UPDATE LOOP
            if (analyzerRef.current) {
                let foundChem = null, foundTemp = 25;
                const analyzerPos = analyzerRef.current.group.position;
                let closestDist = Infinity;

                containers.forEach(c => {
                    const dist = new THREE.Vector3(...c.position).distanceTo(analyzerPos);
                    if (dist < 1.5 && dist < closestDist) { // Check distance range
                        closestDist = dist;
                        if (c.contents) {
                            foundChem = c.contents.chemicalId;
                            foundTemp = c.contents.temperature || 25;
                        }
                    }
                });
                updateAnalyzerDisplay(foundChem, foundTemp);
            }
            composer.render();
        };
        animate();

        const handleResize = () => {
            if (!cameraRef.current || !rendererRef.current || !composerRef.current) return;
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
            composerRef.current.setSize(window.innerWidth, window.innerHeight);
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
                        // High-poly rock
                        mesh = new THREE.Mesh(createRockGeometry(), new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.4, flatShading: true }));
                    } else if (chem.meshStyle === 'crystal') {
                        // Complex crystal
                        mesh = new THREE.Mesh(createCrystalGeometry(), new THREE.MeshPhysicalMaterial({ color, transmission: 0.4, roughness: 0.1, metalness: 0.1, flatShading: true }));
                    } else if (chem.meshStyle === 'mound') {
                        mesh = new THREE.Mesh(createMoundGeometry(), new THREE.MeshStandardMaterial({ color, roughness: 1.0 }));
                    } else if (chem.meshStyle === 'canister') {
                        mesh = new THREE.Mesh(createCanisterGeometry(), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 }));
                        // Color Band
                        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.1, 64), new THREE.MeshBasicMaterial({ color }));
                        band.position.y = 0.5;
                        mesh.add(band);
                        // Metallic Valve
                        const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.15, 32), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 }));
                        valve.position.y = 0.85;
                        mesh.add(valve);
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
                        mat.emissiveIntensity = Math.min(heatFactor * 0.2, 0.15);
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
                        <span>📖</span> NHẬT KÝ THÍ NGHIỆM
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <p className="text-xs text-slate-500 mb-6 font-mono uppercase tracking-[0.2em] border-b border-white/5 pb-2">
                        KHU VỰC HẠN CHẾ. DỮ LIỆU PHẢN ỨNG ĐƯỢC GHI LẠI.
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

// -- UI COMPONENT: HOLOGRAPHIC AVATAR --
const HolographicAvatar: React.FC<{
    isExpanded: boolean;
    setIsExpanded: (v: boolean) => void;
    chatHistory: ChatMessage[];
    isAiLoading: boolean;
    chatInput: string;
    setChatInput: (v: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    avatarState: 'normal' | 'shocked';
}> = ({ isExpanded, setIsExpanded, chatHistory, isAiLoading, chatInput, setChatInput, onSubmit, avatarState }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isExpanded]);

    const avatarSrc = avatarState === 'shocked' ? '/lucy_shocked.png' : '/lucy_avatar.png';

    return (
        <div className="absolute bottom-6 right-6 z-50 pointer-events-auto flex flex-col items-end gap-3">
             {/* MODULE 3: Bottom-Right (Professor Lucy Interface) */}
             <div className="w-80 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-white/5 flex items-center gap-3">
                     {/* PERFECT SQUARE AVATAR */}
                     <img src={avatarSrc} className="w-12 h-12 aspect-square object-cover rounded-md border border-cyan-500 shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all duration-300" alt="Prof Lucy" />
                     <div>
                         <h3 className="text-sm font-bold text-white tracking-wide">Liên Lạc - GIÁO SƯ LUCY</h3>
                         <div className="flex items-center gap-1.5 mt-0.5">
                             <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                             <span className="text-[10px] text-emerald-400 font-bold tracking-wider">ONLINE</span>
                         </div>
                     </div>
                 </div>

                 <div className="h-64 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-950/30">
                     {chatHistory.map((msg, i) => (
                         <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                 msg.role === 'user'
                                 ? 'bg-cyan-900/40 text-cyan-50 border border-cyan-700/50 rounded-tr-none'
                                 : 'bg-slate-800/80 text-slate-300 border border-slate-700 rounded-tl-none'
                             }`}>

                                 <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>
                                     {msg.text.replace(/\[FACE:.*?\]/g, '')}
                                 </ReactMarkdown></div>

                             </div>
                         </div>
                     ))}
                     {isAiLoading && <div className="text-[10px] text-slate-500 italic animate-pulse">Đang suy nghĩ...</div>}
                     <div ref={chatEndRef} />
                 </div>

                 <form onSubmit={onSubmit} className="p-3 bg-slate-900/50 border-t border-white/5">
                     <div className="relative flex items-center">
                         <textarea
                             value={chatInput}
                             onChange={(e) => {
                                 setChatInput(e.target.value);
                                 e.target.style.height = 'auto';
                                 e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                             }}
                             onKeyDown={(e) => {
                                 if (e.key === 'Enter' && !e.shiftKey) {
                                     e.preventDefault();
                                     onSubmit(e as any);
                                 }
                             }}
                             placeholder="Hỏi Lucy..."
                             className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 placeholder-slate-600 shadow-inner resize-none min-h-[40px] max-h-[120px] custom-scrollbar"
                             rows={1}
                         />
                         <button type="submit" disabled={isAiLoading || !chatInput.trim()} className="absolute right-2 bottom-1.5 w-7 h-7 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50">
                             <span className="text-sm -mt-0.5">^</span>
                         </button>
                     </div>
                 </form>
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
    // MODULE 2: Lifted State
    heaterTemp: number;
    setHeaterTemp: (val: number) => void;
    avatarState: 'normal' | 'shocked';
}> = ({ lastReaction, containers, chatHistory, isAiLoading, onSpawn, onReset, onChat, heaterTemp, setHeaterTemp, avatarState }) => {
    const [chatInput, setChatInput] = useState("");
    const [isNotebookOpen, setIsNotebookOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            onChat(chatInput);
            setChatInput("");
        }
    };

    return (
        <div className="absolute inset-0 z-[999999] pointer-events-none overflow-hidden select-none font-sans">
            {/* MODULE 3: Global Wrapper */}

            {/* 1. GLOBAL MODALS (Pointer Events Auto) */}
            <div className="pointer-events-auto">
                <NotebookModal isOpen={isNotebookOpen} onClose={() => setIsNotebookOpen(false)} />
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </div>

            {/* MODULE 3: Top-Left (Command Header) */}
            <div className="absolute top-6 left-6 pointer-events-auto flex flex-col gap-4">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-[2rem] p-5 shadow-2xl">
                    <h1 className="text-4xl font-mono font-extrabold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] tracking-[0.1em]">
                        CHEMIC-AI
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] tracking-[0.3em] text-slate-300 font-bold">QUANTUM REALITY ENGINE</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                         <button className="border border-blue-500/50 text-blue-400 rounded-xl px-3 py-1 text-xs font-bold hover:bg-blue-500/10 transition-colors">
                             💎 AAA
                         </button>
                         <button onClick={() => setIsSettingsOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl p-2 transition-colors">
                             ⚙️
                         </button>
                    </div>
                </div>

                {/* Thermal Slider */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-orange-500/30 rounded-xl p-3 w-64 shadow-xl">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] font-bold text-orange-500 tracking-wider">BẾP NHIỆT</span>
                         <span className="text-xs font-mono text-white">{heaterTemp}°C</span>
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
            </div>

            {/* MID-LEFT: QUESTS */}
            <div className="absolute top-1/2 left-6 transform -translate-y-1/2 w-64 pointer-events-auto">
                 {/* Safety Indicator */}
                 <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-emerald-500/30 p-3 flex items-center justify-between shadow-lg mb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">TRẠNG THÁI</span>
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          AN TOÀN <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      </span>
                 </div>

                 {/* Quest Board */}
                 <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl p-4">
                    <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
                        TIẾN ĐỘ (3)
                    </h2>
                    <div className="text-[10px] text-slate-400 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                            <span>Tổng hợp Natri Clorua (Muối)</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            <span>Phân tích độ pH</span>
                        </div>
                         <div className="flex items-center gap-2 opacity-50">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            <span>Ghi chép quan sát</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM-LEFT: INVENTORY */}
            <div className="absolute bottom-6 left-6 w-64 pointer-events-auto flex flex-col gap-4">
                <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl h-80 flex flex-col">
                    <div className="p-3 bg-white/5 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        KHO HÓA CHẤT
                    </div>
                    <div className="overflow-y-auto custom-scrollbar p-3 space-y-3">
                         <button
                            onClick={() => onSpawn('BEAKER')}
                            className="w-full text-left p-4 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800 transition-all group flex items-center justify-between shadow-lg"
                         >
                            <div>
                                <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">Cốc Thí Nghiệm</div>
                                <div className="text-[10px] font-mono text-slate-500 mt-1">Dụng cụ chứa</div>
                            </div>
                            <span className="w-2 h-2 border border-slate-500 rounded-full group-hover:bg-slate-500 transition-colors"></span>
                         </button>

                         {Object.values(CHEMICALS).map(chem => (
                             <button
                                key={chem.id}
                                onClick={() => onSpawn(chem.id)}
                                className="w-full text-left p-4 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-cyan-900/30 hover:border-cyan-500/50 hover:bg-slate-800 transition-all group flex items-center justify-between shadow-lg"
                             >
                                <div>
                                    <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{chem.name}</div>
                                    <div className="text-[10px] font-mono text-slate-500 mt-1">{chem.formula}</div>
                                </div>
                                <span
                                    className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] opacity-60 group-hover:opacity-100 transition-opacity"
                                    style={{ backgroundColor: chem.color, boxShadow: `0 0 10px ${chem.color}` }}
                                ></span>
                             </button>
                         ))}
                    </div>
                </div>
            </div>

            {/* MODULE 3: Top-Right (Action Deck) */}
            <div className="absolute top-6 right-6 flex items-center gap-3 pointer-events-auto">
                 <button className="bg-slate-900/80 backdrop-blur-md border border-orange-500/50 text-orange-400 text-xs font-bold px-5 py-2.5 rounded-full shadow-lg hover:bg-orange-500/10 transition-all hover:scale-105 active:scale-95">
                     BẮT ĐẦU THI
                 </button>
                 <button onClick={() => setIsNotebookOpen(true)} className="w-10 h-10 bg-[#0f172a]/80 backdrop-blur-md rounded-full border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all shadow-lg">
                     📖
                 </button>
                 <button onClick={onReset} className="w-10 h-10 bg-[#0f172a]/80 backdrop-blur-md rounded-full border border-slate-700/50 flex items-center justify-center text-red-400 hover:text-red-300 hover:border-red-500/30 transition-all shadow-lg">
                     ⟳
                 </button>
            </div>

            {/* MODULE 4: Notification Alignment Matrix */}
            <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none">
                {lastReaction && (
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.3)] animate-in fade-in slide-in-from-top-4">
                         <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] text-center mb-1">PHÁT HIỆN PHẢN ỨNG</p>
                         <p className="text-white text-sm font-mono text-center">{formatScientificText(lastReaction)}</p>
                    </div>
                )}
            </div>

            {/* Bottom Status Bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto">
                <div className="bg-[#0f172a]/80 backdrop-blur-md border border-slate-700/50 rounded-full px-4 py-1.5 flex items-center gap-4 text-[10px] font-mono text-slate-500 shadow-xl">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>HỆ_THỐNG_ONLINE</span>
                    <span className="opacity-30">|</span>
                    <span>THỰC THỂ: {containers.length}</span>
                    <span className="opacity-30">|</span>
                    <span>NEURAL_CORE_V1.5 (GEMINI)</span>
                </div>
            </div>

            <HolographicAvatar
                isExpanded={true} // Always expanded as per "w-80" request? Or allows toggle. I'll allow toggle but default open.
                setIsExpanded={() => {}}
                chatHistory={chatHistory}
                isAiLoading={isAiLoading}
                chatInput={chatInput}
                setChatInput={setChatInput}
                onSubmit={handleSubmit}
                avatarState={avatarState}
            />
        </div>
    );
};

// -----------------------------------------------------------------------------
// 8. MAIN APP COMPONENT
// -----------------------------------------------------------------------------

export default function App() {
    console.log("--- APP V5 RELOADED ---");
    const aiServiceRef = useRef<GeminiService | null>(null);
    const reactionTimeoutRef = useRef<number | null>(null);
    const [lastEffectPos, setLastEffectPos] = useState<[number, number, number] | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

    // MODULE 2: Lifted Heater State
    const [heaterTemp, setHeaterTemp] = useState(300);
    const [avatarState, setAvatarState] = useState<'normal' | 'shocked'>('normal');

    const initialContainers: ContainerState[] = [
        { id: 'beaker-1', position: [-1.5, 0.42, 0], contents: { chemicalId: 'H2O', volume: 0.6, color: CHEMICALS['H2O'].color, temperature: 25 } },
        { id: 'beaker-2', position: [1.5, 0.11, 0], contents: null }
    ];
    const [containers, setContainers] = useState<ContainerState[]>(initialContainers);
    const [lastReaction, setLastReaction] = useState<string | null>(null);
    const [lastEffect, setLastEffect] = useState<string | null>(null);
    const [aiFeedback, setAiFeedback] = useState<string>("Chào mừng bạn đến với phòng thí nghiệm. Tôi là Giáo sư Lucy.");
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const service = new GeminiService();
        service.onHistoryUpdate = (history) => {
            setChatHistory([...history]);
            if (history.length > 0 && (history[history.length - 1].role === 'assistant' || history[history.length - 1].role === 'model')) {
                const text = history[history.length - 1].text;
                setAiFeedback(text);
                if (text.includes('[FACE: SHOCKED]')) {
                    setAvatarState('shocked');
                } else if (!lastEffect) {
                    setAvatarState('normal');
                }
            }
        };
        aiServiceRef.current = service;
        // Sync initial history
        setChatHistory([...service['history'].map(h => ({ role: h.role, text: h.text }))]);

        return () => { if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current); };
    }, []);

    // MODULE 2: Reaction-based Avatar State
    useEffect(() => {
        if (lastEffect === 'explosion' || lastEffect === 'smoke') {
            setAvatarState('shocked');
        } else {
            setAvatarState('normal');
        }
    }, [lastEffect]);

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
        // MODULE 2: Pass Heater Temp to Reaction Logic (Ambient Temp)
        const targetTemp = target.contents?.temperature || heaterTemp;

        // Pass ambient temp (heaterTemp) to mix function for activation energy check
        const mixResult = ChemistryEngine.mix(targetChemId, targetVol, source.contents.chemicalId, amountToPour, heaterTemp);

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
                const detail = `I just mixed ${CHEMICALS[source.contents.chemicalId].name} and ${CHEMICALS[targetChemId].name}. Explain the reaction.`;
                await aiServiceRef.current.getReactionFeedback(detail);
                setIsAiLoading(false);
            }
        }
    }, [containers, heaterTemp]); // Add heaterTemp to dependencies

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
        setAiFeedback("Phòng thí nghiệm đã được khử trùng. Bạn có thể tiếp tục nghiên cứu.");
        setAvatarState('normal');
        if(aiServiceRef.current) aiServiceRef.current.startNewChat();
    };

    return (
        <div className={`relative w-full h-screen overflow-hidden transition-all duration-300 ${lastEffect === 'explosion' ? 'brightness-125' : ''}`}>
            {/* Background Texture */}
            <div className="absolute inset-0 bg-tech-grid opacity-20 pointer-events-none" />

            <LabScene
                heaterTemp={heaterTemp}
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
                heaterTemp={heaterTemp}
                setHeaterTemp={setHeaterTemp}
                avatarState={avatarState}
            />
        </div>
    );
}
