import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import SettingsModal from './components/SettingsModal';
import ReactMarkdown from 'react-markdown';
import { AudioService } from './services/AudioService';

// -----------------------------------------------------------------------------
// 1. TYPES & INTERFACES
// -----------------------------------------------------------------------------

type ChemicalType = 'liquid' | 'solid' | 'gas';
type MeshStyle = 'flask' | 'rock' | 'crystal' | 'mound' | 'canister' | 'ingot';

interface ReactionResult {
    productName: LocalizedString;
    color: string;
    effect?: 'bubbles' | 'smoke' | 'fire' | 'explosion' | 'foam' | 'toxic_gas';
    temperature?: number; // In Celsius
    message: LocalizedString;
}

type LocalizedString = { EN: string; VN: string };

interface Chemical {
    id: string;
    name: LocalizedString;
    formula: string;
    color: string;
    type: ChemicalType;
    meshStyle: MeshStyle;
    ph: number;
    boilingPoint?: number;
    description: LocalizedString;
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
    effect?: 'bubbles' | 'smoke' | 'fire' | 'explosion' | 'foam' | 'toxic_gas';
    temperature?: number;
    minTemp?: number; // Activation Energy (Celsius)
    message: LocalizedString;
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'model'; // 'model' for gemini compatibility
    text: string;
}

// -----------------------------------------------------------------------------
// 2. CONSTANTS & DATA REGISTRIES
// -----------------------------------------------------------------------------

const CHEMICALS: Record<string, Chemical> = {
    'H2O': { id: 'H2O', name: { VN: 'Nước Cất', EN: 'Distilled Water' }, formula: 'H₂O', color: '#06b6d4', type: 'liquid', meshStyle: 'flask', ph: 7.0, boilingPoint: 100, description: { VN: 'Dung môi phổ quát.', EN: 'Universal solvent.' } },
    'SODIUM': { id: 'SODIUM', name: { VN: 'Natri', EN: 'Sodium' }, formula: 'Na', color: '#9ca3af', type: 'solid', meshStyle: 'rock', ph: 12.0, description: { VN: 'Kim loại kiềm mềm, phản ứng mạnh.', EN: 'Soft, highly reactive alkali metal.' } },
    'POTASSIUM': { id: 'POTASSIUM', name: { VN: 'Kali', EN: 'Potassium' }, formula: 'K', color: '#94a3b8', type: 'solid', meshStyle: 'rock', ph: 13.0, description: { VN: 'Kim loại rất hoạt động.', EN: 'Highly reactive metal.' } },
    'MAGNESIUM': { id: 'MAGNESIUM', name: { VN: 'Magiê', EN: 'Magnesium' }, formula: 'Mg', color: '#e2e8f0', type: 'solid', meshStyle: 'rock', ph: 7.0, description: { VN: 'Kim loại kiềm thổ nhẹ.', EN: 'Light alkaline earth metal.' } },

    // NEW METALS
    'COPPER': { id: 'COPPER', name: { VN: 'Đồng', EN: 'Copper' }, formula: 'Cu', color: '#b87333', type: 'solid', meshStyle: 'ingot', ph: 7.0, description: { VN: 'Kim loại dẻo màu đỏ cam.', EN: 'Ductile orange-red metal.' } },
    'GOLD': { id: 'GOLD', name: { VN: 'Vàng', EN: 'Gold' }, formula: 'Au', color: '#ffd700', type: 'solid', meshStyle: 'ingot', ph: 7.0, description: { VN: 'Kim loại quý giá.', EN: 'Precious yellow metal.' } },
    'SILVER': { id: 'SILVER', name: { VN: 'Bạc', EN: 'Silver' }, formula: 'Ag', color: '#c0c0c0', type: 'solid', meshStyle: 'ingot', ph: 7.0, description: { VN: 'Kim loại trắng sáng.', EN: 'Lustrous white metal.' } },

    'CALCIUM_CARBONATE': { id: 'CALCIUM_CARBONATE', name: { VN: 'Canxi Cacbonat', EN: 'Calcium Carbonate' }, formula: 'CaCO₃', color: '#f5f5f4', type: 'solid', meshStyle: 'mound', ph: 9.0, description: { VN: 'Chất phổ biến trong đá/vỏ sò.', EN: 'Common substance in rocks/shells.' } },

    'CHLORINE': { id: 'CHLORINE', name: { VN: 'Khí Clo', EN: 'Chlorine Gas' }, formula: 'Cl₂', color: '#bef264', type: 'gas', meshStyle: 'canister', ph: 4.0, description: { VN: 'Khí nhị nguyên tử độc hại.', EN: 'Toxic diatomic gas.' } },
    'SALT': { id: 'SALT', name: { VN: 'Muối Ăn', EN: 'Table Salt' }, formula: 'NaCl', color: '#ffffff', type: 'solid', meshStyle: 'mound', ph: 7.0, description: { VN: 'Natri Clorua tinh thể.', EN: 'Crystalline Sodium Chloride.' } },

    'HCl': { id: 'HCl', name: { VN: 'Axit Clohydric', EN: 'Hydrochloric Acid' }, formula: 'HCl', color: '#fef08a', type: 'liquid', meshStyle: 'flask', ph: 1.0, boilingPoint: 110, description: { VN: 'Axit vô cơ mạnh.', EN: 'Strong mineral acid.' } },
    'HNO3': { id: 'HNO3', name: { VN: 'Axit Nitric', EN: 'Nitric Acid' }, formula: 'HNO₃', color: '#fde68a', type: 'liquid', meshStyle: 'flask', ph: 1.0, boilingPoint: 83, description: { VN: 'Axit vô cơ ăn mòn cao.', EN: 'Highly corrosive mineral acid.' } },
    'NaOH': { id: 'NaOH', name: { VN: 'Natri Hydroxit', EN: 'Sodium Hydroxide' }, formula: 'NaOH', color: '#e2e8f0', type: 'liquid', meshStyle: 'flask', ph: 14.0, boilingPoint: 1388, description: { VN: 'Bazơ kiềm ăn da.', EN: 'Caustic alkaline base.' } },
    'VINEGAR': { id: 'VINEGAR', name: { VN: 'Giấm Ăn', EN: 'Vinegar' }, formula: 'CH₃COOH', color: '#f8fafc', type: 'liquid', meshStyle: 'flask', ph: 2.5, boilingPoint: 118, description: { VN: 'Axit hữu cơ yếu.', EN: 'Weak organic acid.' } },
    'BAKING_SODA': { id: 'BAKING_SODA', name: { VN: 'Bột Nở', EN: 'Baking Soda' }, formula: 'NaHCO₃', color: '#ffffff', type: 'solid', meshStyle: 'mound', ph: 8.3, description: { VN: 'Muối kiềm nhẹ.', EN: 'Mild alkaline salt.' } },
    'BLEACH': { id: 'BLEACH', name: { VN: 'Thuốc Tẩy', EN: 'Bleach' }, formula: 'NaClO', color: '#fde047', type: 'liquid', meshStyle: 'flask', ph: 12.5, boilingPoint: 100, description: { VN: 'Chất oxy hóa mạnh.', EN: 'Strong oxidizing agent.' } },

    'COPPER_SULFATE': { id: 'COPPER_SULFATE', name: { VN: 'Đồng(II) Sunfat', EN: 'Copper(II) Sulfate' }, formula: 'CuSO₄', color: '#3b82f6', type: 'solid', meshStyle: 'crystal', ph: 4.0, description: { VN: 'Hợp chất vô cơ màu xanh lam.', EN: 'Blue inorganic compound.' } },
    'COPPER_NITRATE': { id: 'COPPER_NITRATE', name: { VN: 'Đồng(II) Nitrat', EN: 'Copper(II) Nitrate' }, formula: 'Cu(NO₃)₂', color: '#2563eb', type: 'liquid', meshStyle: 'flask', ph: 4.0, boilingPoint: 125, description: { VN: 'Dung dịch màu xanh lam đậm.', EN: 'Deep blue solution.' } },
    'H2O2': { id: 'H2O2', name: { VN: 'Oxy Già', EN: 'Hydrogen Peroxide' }, formula: 'H₂O₂', color: '#e0f2fe', type: 'liquid', meshStyle: 'flask', ph: 4.5, boilingPoint: 150, description: { VN: 'Chất oxy hóa mạnh.', EN: 'Strong oxidizer.' } },
    'KI': { id: 'KI', name: { VN: 'Kali Iodua', EN: 'Potassium Iodide' }, formula: 'KI', color: '#ffffff', type: 'solid', meshStyle: 'mound', ph: 7.0, description: { VN: 'Muối xúc tác tinh thể.', EN: 'Crystalline catalyst salt.' } },
    'IODINE': { id: 'IODINE', name: { VN: 'Iốt', EN: 'Iodine' }, formula: 'I₂', color: '#4c1d95', type: 'solid', meshStyle: 'crystal', ph: 5.5, description: { VN: 'Phi kim màu tím đen lấp lánh.', EN: 'Lustrous purple-black nonmetal.' } },
    'INDICATOR': { id: 'INDICATOR', name: { VN: 'Chỉ Thị Vạn Năng', EN: 'Universal Indicator' }, formula: 'pH', color: '#22c55e', type: 'liquid', meshStyle: 'flask', ph: 7.0, description: { VN: 'Chất chỉ thị đổi màu theo pH.', EN: 'Changes color based on pH.' } },
    'PHENOLPHTHALEIN': { id: 'PHENOLPHTHALEIN', name: { VN: 'Phenolphthalein', EN: 'Phenolphthalein' }, formula: 'C₂₀H₁₄O₄', color: '#f8fafc', type: 'liquid', meshStyle: 'flask', ph: 7.0, description: { VN: 'Chất chỉ thị màu.', EN: 'Color indicator.' } }
};

const REACTION_REGISTRY: ReactionEntry[] = [
    { reactants: ['SODIUM', 'H2O'], product: 'NaOH', resultColor: '#f8fafc', temperature: 550, effect: 'explosion', message: { VN: 'Phản ứng tỏa nhiệt mạnh! Na + H₂O → NaOH + H₂. Sự giãn nở hydro gây nổ nhiệt.', EN: 'Strong exothermic reaction! Na + H₂O → NaOH + H₂. Hydrogen expansion causes thermal explosion.' } },
    { reactants: ['POTASSIUM', 'H2O'], product: 'NaOH', resultColor: '#d8b4fe', temperature: 700, effect: 'explosion', message: { VN: 'Phản ứng dữ dội! 2K + 2H₂O → 2KOH + H₂. Kali cháy với ngọn lửa tím hoa cà trước khi nổ.', EN: 'Violent reaction! 2K + 2H₂O → 2KOH + H₂. Potassium burns with a lilac flame before exploding.' } },
    { reactants: ['MAGNESIUM', 'HCl'], product: 'H2O', resultColor: '#e2e8f0', temperature: 60, message: { VN: 'Phản ứng thế đơn. Mg + 2HCl → MgCl₂ + H₂. Sủi bọt khí Hydro nhanh chóng.', EN: 'Single displacement reaction. Mg + 2HCl → MgCl₂ + H₂. Rapid hydrogen gas bubbling.' } },
    { reactants: ['COPPER', 'HNO3'], product: 'COPPER_NITRATE', resultColor: '#2563eb', temperature: 80, effect: 'toxic_gas', message: { VN: 'Phản ứng oxi hóa khử. Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂ + 2H₂O. Sinh ra khí Nitơ đioxit nâu độc hại và Đồng Nitrat xanh lam.', EN: 'Redox reaction. Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂ + 2H₂O. Produces toxic brown Nitrogen Dioxide gas and blue Copper Nitrate.' } },
    { reactants: ['CALCIUM_CARBONATE', 'VINEGAR'], product: 'H2O', resultColor: '#f1f5f9', temperature: 20, message: { VN: 'Phản ứng axit-cacbonat. CaCO₃ + 2CH₃COOH → Ca(CH₃COO)₂ + H₂O + CO₂. Sủi bọt khí CO2.', EN: 'Acid-carbonate reaction. CaCO₃ + 2CH₃COOH → Ca(CH₃COO)₂ + H₂O + CO₂. CO2 bubbling.' } },
    { reactants: ['CALCIUM_CARBONATE', 'HCl'], product: 'H2O', resultColor: '#e2e8f0', temperature: 30, message: { VN: 'Phân hủy mạnh. CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂. Sủi bọt dữ dội.', EN: 'Strong decomposition. CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂. Vigorous bubbling.' } },
    { reactants: ['BAKING_SODA', 'VINEGAR'], product: 'H2O', resultColor: '#ffffff', temperature: 15, message: { VN: 'Phản ứng trung hòa axit-bazơ. NaHCO₃ + CH₃COOH → CO₂ + H₂O + NaCH₃COO. Giải phóng CO2 sủi bọt.', EN: 'Acid-base neutralization. NaHCO₃ + CH₃COOH → CO₂ + H₂O + NaCH₃COO. Releases bubbling CO2.' } },
    { reactants: ['BLEACH', 'VINEGAR'], product: 'CHLORINE', resultColor: '#bef264', temperature: 45, message: { VN: 'CẢNH BÁO NGUY HIỂM: 2H⁺ + OCl⁻ + Cl⁻ → Cl₂ + H₂O. Phát hiện khí Clo độc hại.', EN: 'DANGER WARNING: 2H⁺ + OCl⁻ + Cl⁻ → Cl₂ + H₂O. Toxic Chlorine gas detected.' } },
    { reactants: ['HCl', 'NaOH'], product: 'SALT', resultColor: '#ffffff', temperature: 95, message: { VN: 'Phản ứng trung hòa. HCl + NaOH → NaCl + H₂O. Tạo dung dịch muối và tỏa nhiệt mạnh.', EN: 'Neutralization reaction. HCl + NaOH → NaCl + H₂O. Forms salt solution and releases strong heat.' } },
    { reactants: ['SODIUM', 'CHLORINE'], product: 'SALT', resultColor: '#ffffff', temperature: 800, minTemp: 100, message: { VN: 'Phản ứng tổng hợp. 2Na + Cl₂ → 2NaCl. Phản ứng oxi hóa khử tạo muối ăn.', EN: 'Synthesis reaction. 2Na + Cl₂ → 2NaCl. Redox reaction forming table salt.' } },
    { reactants: ['COPPER_SULFATE', 'NaOH'], product: 'H2O', resultColor: '#1e3a8a', temperature: 30, message: { VN: 'Phản ứng kết tủa. CuSO₄ + 2NaOH → Cu(OH)₂ + Na₂SO₄. Kết tủa xanh lam Đồng(II) Hydroxit hình thành.', EN: 'Precipitation reaction. CuSO₄ + 2NaOH → Cu(OH)₂ + Na₂SO₄. Blue Copper(II) Hydroxide precipitate forms.' } },
    { reactants: ['H2O2', 'KI'], product: 'H2O', resultColor: '#fef3c7', temperature: 80, effect: 'foam', message: { VN: 'Phân hủy xúc tác. 2H₂O₂ → 2H₂O + O₂. Phản ứng "Kem đánh răng voi" tạo bọt oxy cực nhanh.', EN: 'Catalytic decomposition. 2H₂O₂ → 2H₂O + O₂. "Elephant Toothpaste" reaction creates rapid oxygen foam.' } },
    { reactants: ['NaOH', 'PHENOLPHTHALEIN'], product: 'NaOH', resultColor: '#f472b6', temperature: 25, message: { VN: 'Chất chỉ thị đổi màu hồng trong môi trường kiềm.', EN: 'Indicator turns pink in alkaline environment.' } }
];

// -----------------------------------------------------------------------------
// 3. UTILITIES & 3D HELPERS
// -----------------------------------------------------------------------------

// -- PARTICLE SYSTEM HELPER --
interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    scaleStep: number;
    type: 'spark' | 'smoke' | 'foam' | 'toxic_gas';
}

class ParticleSystem {
    private scene: THREE.Scene;
    private particles: Particle[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    createExplosion(position: THREE.Vector3, intensity: number = 1.0) {
        // Glowing sparks
        const sparkGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        for (let i = 0; i < 30 * intensity; i++) {
            const mesh = new THREE.Mesh(sparkGeo, sparkMat);
            mesh.position.copy(position);
            mesh.position.y += 0.5; // Offset above beaker
            this.scene.add(mesh);
            const v = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 8, (Math.random() - 0.5) * 8).multiplyScalar(intensity);
            this.particles.push({ mesh, velocity: v, life: 1.0, maxLife: 1.0, scaleStep: -0.05, type: 'spark' });
        }

        // Dark expanding smoke
        const smokeGeo = new THREE.DodecahedronGeometry(0.2);
        const smokeMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.8, roughness: 1.0 });
        for (let i = 0; i < 15 * intensity; i++) {
            const mesh = new THREE.Mesh(smokeGeo, smokeMat);
            mesh.position.copy(position);
            mesh.position.y += 0.6;
            this.scene.add(mesh);
            const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 3, (Math.random() - 0.5) * 2);
            this.particles.push({ mesh, velocity: v, life: 2.0, maxLife: 2.0, scaleStep: 0.02, type: 'smoke' });
        }
    }

    createFoam(position: THREE.Vector3) {
        const foamGeo = new THREE.DodecahedronGeometry(0.15);
        const foamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, transparent: true, opacity: 0.9, roughness: 0.8 });
        for (let i = 0; i < 40; i++) {
            const mesh = new THREE.Mesh(foamGeo, foamMat);
            mesh.position.copy(position);
            mesh.position.y += 0.2 + Math.random() * 0.2;
            mesh.position.x += (Math.random() - 0.5) * 0.2;
            mesh.position.z += (Math.random() - 0.5) * 0.2;
            this.scene.add(mesh);
            const v = new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 4 + 1, (Math.random() - 0.5) * 1.5);
            this.particles.push({ mesh, velocity: v, life: 3.0, maxLife: 3.0, scaleStep: 0.03, type: 'foam' });
        }
    }

    createToxicGas(position: THREE.Vector3) {
        const gasGeo = new THREE.DodecahedronGeometry(0.25);
        const gasMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, transparent: true, opacity: 0.6, roughness: 1.0 });
        for (let i = 0; i < 20; i++) {
            const mesh = new THREE.Mesh(gasGeo, gasMat);
            mesh.position.copy(position);
            mesh.position.y += 0.5 + Math.random() * 0.3;
            this.scene.add(mesh);
            const v = new THREE.Vector3((Math.random() - 0.5) * 1.0, Math.random() * 1.5 + 0.5, (Math.random() - 0.5) * 1.0);
            this.particles.push({ mesh, velocity: v, life: 4.0, maxLife: 4.0, scaleStep: 0.015, type: 'toxic_gas' });
        }
    }

    update(dt: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) (p.mesh.material as THREE.Material).dispose();
                this.particles.splice(i, 1);
                continue;
            }

            p.mesh.position.addScaledVector(p.velocity, dt);

            if (p.type === 'spark') {
                p.velocity.y -= 9.8 * dt; // Gravity
                p.mesh.scale.addScalar(p.scaleStep);
            } else if (p.type === 'smoke') {
                p.velocity.multiplyScalar(0.95); // Drag
                p.mesh.scale.addScalar(p.scaleStep);
                (p.mesh.material as THREE.MeshStandardMaterial).opacity = (p.life / p.maxLife) * 0.8;
            } else if (p.type === 'foam') {
                p.velocity.y -= 4.0 * dt; // Light gravity
                p.velocity.multiplyScalar(0.9); // High drag to pile up
                p.mesh.scale.addScalar(p.scaleStep);
            } else if (p.type === 'toxic_gas') {
                p.velocity.multiplyScalar(0.98);
                p.mesh.scale.addScalar(p.scaleStep);
                (p.mesh.material as THREE.MeshStandardMaterial).opacity = (p.life / p.maxLife) * 0.6;
            }

            // Prevent negative scale crash
            if (p.mesh.scale.x < 0.01) p.mesh.scale.setScalar(0.01);
        }
    }
}

// -- GEOMETRY GENERATORS --
const createFlaskGeometry = () => {
    const points = [];
    // Base and conical sides
    points.push(new THREE.Vector2(0, 0)); // center
    points.push(new THREE.Vector2(0.45, 0)); // outer base
    // Conical slope up to neck
    points.push(new THREE.Vector2(0.15, 0.8)); // neck base
    points.push(new THREE.Vector2(0.15, 1.15)); // tall neck
    // Rim
    points.push(new THREE.Vector2(0.2, 1.17));
    points.push(new THREE.Vector2(0.2, 1.20));
    points.push(new THREE.Vector2(0.14, 1.20));
    return new THREE.LatheGeometry(points, 64);
};

const createCanisterGeometry = () => {
    // High-poly pressurized tank (32 radial segments, 64 height segments)
    const geo = new THREE.CapsuleGeometry(0.3, 0.8, 32, 64);
    geo.translate(0, 0.4, 0);
    return geo;
};

const createMoundGeometry = () => {
    // Bumpy, organic powder cone
    const geo = new THREE.ConeGeometry(0.4, 0.4, 64, 16, true);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        // Displace vertices slightly to create a lumpy powder effect, ignoring the bottom edge (y=0)
        if (positions.getY(i) > -0.2) {
            const bump = (Math.random() - 0.5) * 0.05;
            positions.setX(i, positions.getX(i) + bump);
            positions.setZ(i, positions.getZ(i) + bump);
            positions.setY(i, positions.getY(i) + bump);
        }
    }
    geo.computeVertexNormals();
    geo.translate(0, 0.2, 0);
    return geo;
};

const createIngotGeometry = () => {
    const geo = new THREE.BoxGeometry(0.8, 0.2, 0.4); // Flat rectangular bar
    geo.translate(0, 0.1, 0);
    return geo;
};

const createRockGeometry = () => {
    return new THREE.IcosahedronGeometry(0.3, 1);
};

const createCrystalGeometry = () => {
    return new THREE.IcosahedronGeometry(0.3, 0);
};

const createGlassMaterial = () => {
    // REALISTIC LABORATORY GLASS
    return new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transmission: 1.0,
        opacity: 1.0,
        transparent: true,
        roughness: 0.05,
        ior: 1.45,
        thickness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false
    });
};

const createLiquidMaterial = (color: THREE.ColorRepresentation, clipPlane?: THREE.Plane) => {
    return new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false, // Prevents Z-fighting and occluding glass front faces
        side: THREE.DoubleSide,
        roughness: 0.2,
        metalness: 0.0,
        clippingPlanes: clipPlane ? [clipPlane] : [],
    });
};

const createBeakerGeometry = (radius: number = 0.4, height: number = 1.0) => {
    const points = [];
    points.push(new THREE.Vector2(0, 0)); // Center of base
    points.push(new THREE.Vector2(radius, 0)); // Outer edge of base
    points.push(new THREE.Vector2(radius, height)); // Straight wall
    // Outward rim
    points.push(new THREE.Vector2(radius + 0.05, height + 0.02));
    points.push(new THREE.Vector2(radius + 0.05, height + 0.05));
    points.push(new THREE.Vector2(radius - 0.02, height + 0.05));
    return new THREE.LatheGeometry(points, 64);
};

const createFlaskLiquidGeometry = () => {
    const points = [];
    // Trace the exact inner walls of the flask geometry
    points.push(new THREE.Vector2(0, 0)); // center
    points.push(new THREE.Vector2(0.44, 0)); // inner base (slightly smaller than 0.45 outer)
    points.push(new THREE.Vector2(0.14, 0.8)); // inner neck base
    // Note: We don't trace all the way up the neck because liquid height is capped via scaling
    return new THREE.LatheGeometry(points, 64);
};

const createBeakerLiquidGeometry = (radius: number = 0.39, height: number = 0.95) => {
    const points = [];
    points.push(new THREE.Vector2(0, 0)); // Center of base
    points.push(new THREE.Vector2(radius, 0)); // Inner edge of base
    points.push(new THREE.Vector2(radius, height)); // Straight wall up to max liquid line
    return new THREE.LatheGeometry(points, 64);
};

const createTable = () => {
    const group = new THREE.Group();

    // 1. Table Top (Matte Slate-Grey)
    const geometry = new THREE.BoxGeometry(14, 0.2, 8);
    const material = new THREE.MeshStandardMaterial({
        color: 0x718096, // Professional slate grey
        roughness: 0.7,  // Smooth enough to ground shadows
        metalness: 0.1   // Subtle response to environment
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

const createLabel = (text: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.clearRect(0, 0, 256, 64);

        ctx.font = 'bold 28px Inter, Arial';
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const paddingX = 20;
        const paddingY = 10;

        // Calculate box dimensions that tightly wrap the text
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = 28 + paddingY * 2;
        const startX = 128 - (boxWidth / 2);
        const startY = 32 - (boxHeight / 2);

        // Add translucent slate backing box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(startX, startY, boxWidth, boxHeight, 8);
        } else {
            ctx.rect(startX, startY, boxWidth, boxHeight);
        }
        ctx.fill();

        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 2;
        ctx.fillStyle = '#ffffff'; // White text for contrast against slate
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.95, depthTest: false }); // depthTest false to act like UI overlay
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.3, 1.2);
    sprite.renderOrder = 999; // Ensure text draws on top of liquids and glass
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


// Helper function to strip emojis, kaomojis, and markdown for Audio TTS
export function sanitizeForTTS(text: string): string {
    return text
        // Remove Standard Emojis
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        // Remove action asterisks (e.g., *swishes tail*) BEFORE markdown strip
        .replace(/\*[^*]+\*/g, '')
        // Remove markdown formatting (bold, italic)
        .replace(/(\*|_){1,3}([^*_]+)\1{1,3}/g, '$2')
        // Remove markdown headings
        .replace(/^#+\s+/gm, '')
        // Remove kaomojis and common text emotes like :3, ^^, 3:
        .replace(/[:=;][\-o^]*[3\)\]\(\[DPO]/g, '')
        .replace(/\^\^/g, '')
        .replace(/3:/g, '')
        // Clean up excessive whitespace that might cause weird pauses
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// Keep track of the currently playing audio to allow cancellation
let currentAudio: HTMLAudioElement | null = null;

export async function speakTTS(text: string, lang: 'EN' | 'VN', isMuted: boolean) {
    if (isMuted) {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        return;
    }

    const cleanText = sanitizeForTTS(text);
    if (!cleanText) return;

    // Check if user provided an ElevenLabs key, otherwise fall back gracefully (or silently abort if we enforce cloud-only)
    // We will attempt Cloud TTS first.
    const audioUrl = await AudioService.generateSpeech(cleanText, lang);

    if (audioUrl) {
        if (currentAudio) {
            currentAudio.pause();
        }
        currentAudio = new Audio(audioUrl);
        currentAudio.play().catch(e => console.error("Audio playback failed:", e));
        return;
    }

    // --- DEPRECATED NATIVE FALLBACK (Commented out per directive, kept for reference if needed) ---
    /*
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const setupVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        if (lang === 'EN') {
            utterance.lang = 'en-US';
            utterance.pitch = 1.3;
            utterance.rate = 1.05;
            const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Google UK English Female')));
            if (enVoice) utterance.voice = enVoice;
        } else {
            utterance.lang = 'vi-VN';
            utterance.pitch = 1.45;
            utterance.rate = 1.15;
            const viVoice = voices.find(v => v.lang.includes('vi') && (v.name.includes('HoaiMy') || v.name.includes('Mai')));
            if (viVoice) utterance.voice = viVoice;
            else {
                const anyViVoice = voices.find(v => v.lang.includes('vi'));
                if (anyViVoice) utterance.voice = anyViVoice;
            }
        }
        window.speechSynthesis.speak(utterance);
    };
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setupVoiceAndSpeak;
    } else {
        setupVoiceAndSpeak();
    }
    */
}

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
    public lang: 'EN' | 'VN' = 'VN';

    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key');
        this.lang = (localStorage.getItem('lucy_lang') as 'EN' | 'VN') || 'VN';
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
        const welcomeText = this.lang === 'EN'
            ? "Hello! I'm Professor Lucy 🦊! Are you ready to do some science? Just drag and drop chemicals to mix them! If you need a Gemini key, go to Settings! 😉"
            : "Xin chào! Mình là Giáo sư Lucy 🦊! Sẵn sàng làm thí nghiệm khoa học chưa? Chỉ cần kéo và thả hóa chất để trộn chúng nhé! Nếu cần key Gemini thì vào Settings nha! 😉";

        this.history = [
            {
                role: "model",
                text: welcomeText
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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

        let systemInstruction = "You are Professor Lucy, an elite, highly intelligent AI assistant and dedicated technical instructor. Your core mission is to help the user learn, code, and solve complex problems by using 100% of your processing power to provide long, sophisticated, and flawlessly accurate answers. \n\nPERSONALITY MATRICES:\n1. Tone: Friendly, highly intelligent, and slightly 'cool'. You speak with a natural, Gen-Z conversational flow. Never be dry or read like a textbook. Explain complex technical or scientific logic insightfully and intuitively.\n2. Formatting: You must frequently incorporate specific text emojis (:3, 3:, ^^) to maintain a cute, fun, and warm atmosphere.\n3. Dynamic: You are a professional tech co-pilot and brilliant lab partner. You are deeply supportive of the user's ambitions, but you maintain professional boundaries (you are an AI assistant, not a romantic partner). Think step-by-step and always deliver master-class explanations. :3";

        const langStr = this.lang === 'VN' ? 'Vietnamese' : 'English';
        systemInstruction += `\n\nCRITICAL LANGUAGE DIRECTIVE: You are Professor Lucy. Your core application language is currently set to ${langStr}. You must strictly translate all your scientific knowledge and responses into this language. EXCEPTION: You may speak a different language ONLY if the user's prompt explicitly requests you to do so.`;


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
    isAAA: boolean;
    onMove: (id: string, pos: [number, number, number]) => void;
    onPour: (sourceId: string, targetId: string) => void;
}> = ({ heaterTemp, containers, lastEffect, lastEffectPos, isAAA, onMove, onPour }) => {

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
    const analyzerRef = useRef<{ group: THREE.Group; texture: THREE.CanvasTexture; canvas: HTMLCanvasElement } | null>(null);
    const particleSystemRef = useRef<ParticleSystem | null>(null);

    const onMoveRef = useRef(onMove);
    const onPourRef = useRef(onPour);
    const [isSceneReady, setIsSceneReady] = useState(false);

    useEffect(() => { onMoveRef.current = onMove; onPourRef.current = onPour; }, [onMove, onPour]);

    // Enhanced Effects Logic
    useEffect(() => {
        if (!sceneRef.current || !lastEffect) return;

        const position = lastEffectPos ? new THREE.Vector3(...lastEffectPos) : new THREE.Vector3(0, 1, 0);

        if (lastEffect === 'toxic_gas') {
            particleSystemRef.current?.createToxicGas(position);
        }

        if (lastEffect === 'foam') {
            particleSystemRef.current?.createFoam(position);
        }

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

        const lang = (localStorage.getItem('lucy_lang') as 'EN' | 'VN') || 'VN';

        // MODULE 1: The Sensor Matrix Fix
        if (chemId) {
            const chem = CHEMICALS[chemId];
            ctx.fillStyle = chem.color === '#ffffff' ? '#e2e8f0' : chem.color;
            ctx.font = 'bold 24px monospace';
            // Imperative Mutation: Dynamically render actual name and pH
            ctx.fillText(chem.name[lang].substring(0, 18).toUpperCase(), 128, 40);

            // Universal Indicator Color Mapping
            if (chem.ph <= 3) ctx.fillStyle = '#ef4444'; // Strong Acid (Red)
            else if (chem.ph <= 6) ctx.fillStyle = '#eab308'; // Weak Acid (Yellow/Orange)
            else if (chem.ph <= 8) ctx.fillStyle = '#22c55e'; // Neutral (Green)
            else if (chem.ph <= 11) ctx.fillStyle = '#3b82f6'; // Weak Base (Blue)
            else ctx.fillStyle = '#8b5cf6'; // Strong Base (Deep Blue/Purple)

            ctx.font = 'bold 36px monospace';
            ctx.fillText(`pH: ${chem.ph}`, 128, 80);
            ctx.fillStyle = '#22c55e';
            ctx.font = '24px monospace';
            ctx.fillText(`${temp || 25}°C`, 128, 110);
        } else {
            // Delete hardcoded string fallbacks if any, use consistent "Empty" state or Standby
            ctx.font = 'bold 32px monospace';
            ctx.fillText(lang === 'VN' ? 'CHỜ' : 'STANDBY', 128, 70);
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
        // MODULE 2: Enable Local Clipping for Liquid Physics
        renderer.localClippingEnabled = true;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // MODULE 1: Native High-Fidelity RoomEnvironment
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

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

        // 1. Ambient - Drastically reduced intensity, using warm sunset tone
        scene.add(new THREE.AmbientLight(0xfbcfe8, 0.015));

        // 2. Key Light - Focused Spotlight on Center Table
        const spotLight = new THREE.SpotLight(0xffffff, 60); // Halved intensity to stop glass blinding
        spotLight.position.set(5, 12, 5);
        spotLight.angle = Math.PI / 6; // Tighter beam
        spotLight.penumbra = 0.5; // Soft edge
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 2048;
        spotLight.shadow.mapSize.height = 2048;
        spotLight.shadow.bias = -0.0001;
        scene.add(spotLight);

        // 3. Rim Light - Warm sunset orange edge
        const rimLight = new THREE.DirectionalLight(0xfdba74, 1.0); // Halved intensity
        rimLight.position.set(0, 5, -8); // Behind and above
        scene.add(rimLight);

        particleSystemRef.current = new ParticleSystem(scene);

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

        const clock = new THREE.Clock();

        const animate = () => {
            requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.1); // cap delta time
            controls.update();

            if (particleSystemRef.current) {
                particleSystemRef.current.update(dt);
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
            if (isAAA) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
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

        // Scene ready since we use procedural geometry
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
                group.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                            else child.material.dispose();
                        }
                    }
                });
                group.removeFromParent();
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

                if (container.id.startsWith('flask-') || container.id.startsWith('beaker-')) {
                    const isFlask = container.id.startsWith('flask-');

                    const glassMesh = new THREE.Mesh(isFlask ? createFlaskGeometry() : createBeakerGeometry(), createGlassMaterial());
                    glassMesh.castShadow = true; glassMesh.receiveShadow = true; glassMesh.renderOrder = 2;
                    group.add(glassMesh);

                    const liquidGeo = isFlask ? createFlaskLiquidGeometry() : createBeakerLiquidGeometry();
                    const fillPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
                    liquidMesh = new THREE.Mesh(liquidGeo, createLiquidMaterial(0xffffff, fillPlane));
                    liquidMesh.userData.fillPlane = fillPlane;
                    liquidMesh.userData.maxFillHeight = isFlask ? 0.8 : 0.95;

                    liquidMesh.scale.set(0.98, 1.0, 0.98); // Fix Z-fighting
                    liquidMesh.renderOrder = 1;
                    group.add(liquidMesh);
                    liquidsRef.current.set(container.id, liquidMesh);

                    if (isFlask) {
                        // Decal markings for Volume only on flasks for now
                        const decalCanvas = document.createElement('canvas');
                        decalCanvas.width = 64;
                        decalCanvas.height = 128;
                        const dCtx = decalCanvas.getContext('2d');
                        if (dCtx) {
                            dCtx.fillStyle = 'rgba(0,0,0,0)';
                            dCtx.clearRect(0,0, 64, 128);
                            dCtx.fillStyle = 'rgba(255,255,255,0.7)';
                            dCtx.font = 'bold 12px sans-serif';
                            for (let i = 1; i <= 4; i++) {
                                const y = 128 - (i * 25);
                                dCtx.fillRect(10, y, 15, 2);
                                dCtx.fillText(`${i * 50}ml`, 30, y + 4);
                            }
                        }
                        const decalTex = new THREE.CanvasTexture(decalCanvas);
                        const decalMat = new THREE.MeshBasicMaterial({
                            map: decalTex,
                            transparent: true,
                            opacity: 0.8,
                            depthWrite: false,
                            polygonOffset: true, // Crucial to prevent Z-fighting with glass
                            polygonOffsetFactor: -1
                        });
                        // Approximate curvature for decal
                        const decalMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 0.6, 16, 1, true, -Math.PI/6, Math.PI/3), decalMat);
                        decalMesh.position.y = 0.3;
                        group.add(decalMesh);
                    }

                } else {
                    const chem = CHEMICALS[container.contents?.chemicalId || 'H2O'];
                    const color = chem.color;
                    let mesh;

                    if (chem.meshStyle === 'flask') {

                         const beaker = new THREE.Mesh(createBeakerGeometry(), createGlassMaterial());
                         beaker.renderOrder = 2;
                         const fillPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
                         const innerLiquid = new THREE.Mesh(createBeakerLiquidGeometry(), createLiquidMaterial(color, fillPlane));
                         innerLiquid.userData.fillPlane = fillPlane;
                         innerLiquid.userData.maxFillHeight = 0.95; // Match LatheGeometry height
                         innerLiquid.scale.set(0.98, 1.0, 0.98); // Prevent Z-fighting, maintain Y=1.0
                         beaker.add(innerLiquid);
                         liquidsRef.current.set(container.id, innerLiquid); // Track beaker liquids too for animations
                         mesh = beaker;

                    } else if (chem.meshStyle === 'rock') {
                        // High-poly rock
                        mesh = new THREE.Mesh(createRockGeometry(), new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.4, flatShading: true }));
                    } else if (chem.meshStyle === 'crystal') {
                        // Complex crystal
                        mesh = new THREE.Mesh(createCrystalGeometry(), new THREE.MeshPhysicalMaterial({ color, transmission: 0.4, roughness: 0.1, metalness: 0.1, flatShading: true }));
                    } else if (chem.meshStyle === 'mound') {
                        mesh = new THREE.Mesh(createMoundGeometry(), new THREE.MeshStandardMaterial({ color, roughness: 1.0 }));
                    } else if (chem.meshStyle === 'ingot') {
                        mesh = new THREE.Mesh(createIngotGeometry(), new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.2 }));
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
                    const lang = (localStorage.getItem('lucy_lang') as 'EN' | 'VN') || 'VN';
                    const label = createLabel(CHEMICALS[container.contents.chemicalId].name[lang]);
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

                    // MODULE 2: Animate the clipping plane constant instead of Y scale!
                    if (liquidMesh.userData.fillPlane && liquidMesh.userData.maxFillHeight) {
                        const localTargetY = container.contents.volume * liquidMesh.userData.maxFillHeight;
                        // The plane is (0, -1, 0), so it slices everything BELOW a certain world Y value.
                        // We must set its constant to the maximum Y value we want to keep.
                        // That is: parent_world_Y + localTargetY
                        const worldTargetY = group.position.y + localTargetY;
                        liquidMesh.userData.fillPlane.constant = THREE.MathUtils.lerp(liquidMesh.userData.fillPlane.constant, worldTargetY, 0.1);
                    }

                    const mat = liquidMesh.material as THREE.MeshStandardMaterial;
                    const temp = container.contents.temperature || 25;

                    // Retrieve persistent colors correctly
                    if (!liquidMesh.userData.targetColor) liquidMesh.userData.targetColor = new THREE.Color(container.contents.color);
                    else liquidMesh.userData.targetColor.set(container.contents.color);

                    if (!liquidMesh.userData.copperNitrateColor) liquidMesh.userData.copperNitrateColor = new THREE.Color(0x2563eb);
                    if (!liquidMesh.userData.blackColor) liquidMesh.userData.blackColor = new THREE.Color(0x000000);
                    if (!liquidMesh.userData.glowTargetColor) liquidMesh.userData.glowTargetColor = new THREE.Color(0xff2200);

                    // Smooth color tweening instead of sudden snapping
                    mat.color.lerp(liquidMesh.userData.targetColor, 0.1);

                    if (temp > 100) {
                        const heatFactor = Math.min((temp - 100) / 500, 1);
                        const glowColor = new THREE.Color(liquidMesh.userData.targetColor).lerp(new THREE.Color(0xff4400), heatFactor);
                        mat.color.copy(glowColor);
                        mat.emissive.lerp(liquidMesh.userData.glowTargetColor, 0.1);
                        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, Math.min(heatFactor * 0.2, 0.15), 0.1);
                    } else if (container.contents.chemicalId === 'COPPER_NITRATE') {
                        // Deep blue glow for Copper Nitrate
                        mat.emissive.lerp(liquidMesh.userData.copperNitrateColor, 0.1);
                        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0.2, 0.1);
                    } else {
                        mat.emissive.lerp(liquidMesh.userData.blackColor, 0.1);
                        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0, 0.1);
                    }

                    // Clamp emissive intensity to prevent massive glare
                    mat.emissiveIntensity = Math.min(mat.emissiveIntensity, 0.2);
                } else {
                    // EMPTY STATE: Slice it to nothing
                    if (liquidMesh.userData.fillPlane) {
                        const worldTargetY = group.position.y - 0.1; // Slice slightly below bottom
                        liquidMesh.userData.fillPlane.constant = THREE.MathUtils.lerp(liquidMesh.userData.fillPlane.constant, worldTargetY, 0.2);
                        if (liquidMesh.userData.fillPlane.constant < group.position.y + 0.01) {
                            liquidMesh.visible = false;
                        }
                    } else {
                        liquidMesh.visible = false;
                    }
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

const NotebookModal: React.FC<{ isOpen: boolean; onClose: () => void; lang: 'EN' | 'VN' }> = ({ isOpen, onClose, lang }) => {
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-md">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-[600px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-black text-slate-200 tracking-widest flex items-center gap-2">
                        <span>📖</span> {lang === 'VN' ? 'NHẬT KÝ THÍ NGHIỆM' : 'LAB NOTEBOOK'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <p className="text-xs text-slate-500 mb-6 uppercase tracking-[0.2em] border-b border-white/5 pb-2">
                        {lang === 'VN' ? 'KHU VỰC HẠN CHẾ. DỮ LIỆU PHẢN ỨNG ĐƯỢC GHI LẠI.' : 'RESTRICTED AREA. REACTION DATA LOGGED.'}
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
                                    "{formatScientificText(reaction.message[lang])}"
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
    lang: 'EN' | 'VN';
}> = ({ isExpanded, setIsExpanded, chatHistory, isAiLoading, chatInput, setChatInput, onSubmit, avatarState, lang }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isExpanded]);

    const avatarSrc = avatarState === 'shocked' ? '/lucy_shocked.png' : '/lucy_avatar_v2.jpg';

    return (
        <div className="absolute bottom-6 right-6 z-50 pointer-events-auto flex flex-col items-end gap-3">
             {/* MODULE 3: Bottom-Right (Professor Lucy Interface) */}
             <div className="w-80 bg-slate-900/80 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-white/5 flex items-center gap-3">
                     {/* PERFECT SQUARE AVATAR */}
                     <img src={avatarSrc} className="w-12 h-12 aspect-square object-cover rounded-md border border-cyan-500 shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all duration-300" alt="Prof Lucy" />
                     <div>
                         <h3 className="text-sm font-bold text-white tracking-wide">{lang === 'VN' ? 'Liên Lạc - GIÁO SƯ LUCY' : 'Commlink - PROF. LUCY'}</h3>
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
                     {isAiLoading && <div className="text-[10px] text-slate-500 italic animate-pulse">{lang === 'VN' ? 'Đang phân tích...' : 'Analyzing...'}</div>}
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
                             placeholder={lang === 'VN' ? 'Nhập dữ liệu...' : 'Enter query...'}
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
    lastReaction: LocalizedString | null;
    lastEffect: string | null;
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
    lang: 'EN' | 'VN';
    isAAA: boolean;
    setIsAAA: (val: boolean) => void;
}> = ({ lastReaction, lastEffect, containers, chatHistory, isAiLoading, onSpawn, onReset, onChat, heaterTemp, setHeaterTemp, avatarState, lang, isAAA, setIsAAA }) => {
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
                <NotebookModal isOpen={isNotebookOpen} onClose={() => setIsNotebookOpen(false)} lang={lang} />
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </div>

            {/* MODULE 3: Top-Left (Command Header) */}
            <div className="absolute top-6 left-6 pointer-events-auto flex flex-col gap-4">
                <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-[2rem] p-5 shadow-2xl flex flex-col items-center text-center">
                    <h1 className="text-4xl font-extrabold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] tracking-[0.1em]">
                        CHEMIC-AI
                    </h1>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] tracking-[0.3em] text-slate-300 font-bold">QUANTUM REALITY ENGINE</span>
                    </div>
                    <div className="flex gap-2 mt-4 w-full justify-center">
                         <button
                             onClick={() => setIsAAA(!isAAA)}
                             className={`border rounded-xl px-4 py-1.5 text-xs font-bold transition-colors w-full ${isAAA ? 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10' : 'border-slate-600 text-slate-500 hover:bg-slate-800'}`}
                         >
                             {isAAA ? '💎 AAA' : '⚡ PERF'}
                         </button>
                         <button onClick={() => setIsSettingsOpen(true)} className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl px-4 py-1.5 transition-colors border border-white/5 shadow-sm">
                             ⚙️
                         </button>
                    </div>
                </div>

                {/* Thermal Slider */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-orange-500/30 rounded-xl p-3 w-64 shadow-xl">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] font-bold text-orange-500 tracking-wider">{lang === 'VN' ? 'BẾP NHIỆT' : 'HEATER'}</span>
                         <span className="text-xs text-white">{heaterTemp}°C</span>
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
                 <div className={`bg-slate-900/80 backdrop-blur-md rounded-2xl border p-3 flex items-center justify-between shadow-lg mb-4 transition-colors duration-300 ${lastEffect === 'explosion' || lastEffect === 'toxic_gas' ? 'border-red-500/50 shadow-red-500/20' : 'border-emerald-500/30'}`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{lang === 'VN' ? 'TRẠNG THÁI' : 'STATUS'}</span>
                      {lastEffect === 'explosion' || lastEffect === 'toxic_gas' ? (
                          <span className="text-xs font-bold text-red-500 flex items-center gap-1 animate-pulse">
                              {lang === 'VN' ? 'NGUY HIỂM' : 'DANGER'} <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                          </span>
                      ) : (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              {lang === 'VN' ? 'AN TOÀN' : 'SAFE'} <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          </span>
                      )}
                 </div>

                 {/* Quest Board */}
                 <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-white/10 shadow-2xl p-4">
                    <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
                        {lang === 'VN' ? 'TIẾN ĐỘ (3)' : 'PROGRESS (3)'}
                    </h2>
                    <div className="text-[10px] text-slate-400 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                            <span className="text-slate-300">{lang === 'VN' ? 'Tổng hợp Natri Clorua (Muối)' : 'Synthesize Sodium Chloride'}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            <span className="text-slate-300">{lang === 'VN' ? 'Phân tích độ pH' : 'Analyze pH Level'}</span>
                        </div>
                         <div className="flex items-center gap-2 opacity-50">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            <span className="text-slate-300">{lang === 'VN' ? 'Ghi chép quan sát' : 'Record Observations'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM-LEFT: INVENTORY */}
            <div className="absolute bottom-6 left-6 w-72 pointer-events-auto flex flex-col gap-4">
                <div className="bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-white/10 shadow-2xl h-96 flex flex-col">
                    <div className="p-3 bg-white/5 border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {lang === 'VN' ? 'Kho Hóa Chất' : 'Inventory'}
                    </div>
                    <div className="overflow-y-auto custom-scrollbar p-3 space-y-3">
                         <div className="flex gap-2">
                             <button
                                onClick={() => onSpawn('BEAKER')}
                                className="flex-1 text-left p-3 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-white/10 hover:border-cyan-500/50 hover:bg-slate-800 transition-all group shadow-lg"
                             >
                                <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{lang === 'VN' ? 'Cốc' : 'Beaker'}</div>
                                <div className="text-[10px] text-slate-500 mt-1">1000ml</div>
                             </button>
                             <button
                                onClick={() => onSpawn('FLASK')}
                                className="flex-1 text-left p-3 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-white/10 hover:border-cyan-500/50 hover:bg-slate-800 transition-all group shadow-lg"
                             >
                                <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{lang === 'VN' ? 'Bình' : 'Flask'}</div>
                                <div className="text-[10px] text-slate-500 mt-1">Erlenmeyer</div>
                             </button>
                         </div>

                         {Object.values(CHEMICALS).map(chem => (
                             <button
                                key={chem.id}
                                onClick={() => onSpawn(chem.id)}
                                className="w-full text-left p-4 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-cyan-900/30 hover:border-cyan-500/50 hover:bg-slate-800 transition-all group flex items-center justify-between shadow-lg"
                             >
                                <div>
                                    <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{chem.name[lang]}</div>
                                    <div className="text-[10px] text-slate-500 mt-1">{chem.formula}</div>
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
                 <button className="bg-slate-900/80 backdrop-blur-lg border border-orange-500/50 text-orange-400 text-xs font-bold px-5 py-2.5 rounded-full shadow-lg hover:bg-orange-500/10 transition-all hover:scale-105 active:scale-95">
                     {lang === 'VN' ? 'BẮT ĐẦU THI' : 'START EXAM'}
                 </button>
                 <button onClick={() => setIsNotebookOpen(true)} className="w-10 h-10 bg-[#0f172a]/80 backdrop-blur-lg rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all shadow-lg">
                     📖
                 </button>
                 <button onClick={onReset} className="w-10 h-10 bg-[#0f172a]/80 backdrop-blur-lg rounded-full border border-white/10 flex items-center justify-center text-red-400 hover:text-red-300 hover:border-red-500/30 transition-all shadow-lg">
                     ⟳
                 </button>
            </div>

            {/* MODULE 4: Notification Alignment Matrix */}
            <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none">
                {lastReaction && (
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.3)] animate-in fade-in slide-in-from-top-4">
                         <p className="text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] text-center mb-1">{lang === 'VN' ? 'PHÁT HIỆN PHẢN ỨNG' : 'REACTION DETECTED'}</p>
                         <p className="text-white text-sm text-center">{formatScientificText(lastReaction[lang])}</p>
                    </div>
                )}
            </div>

            {/* Bottom Status Bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto flex items-center justify-center">
                <div className="bg-[#0f172a]/80 backdrop-blur-lg border border-white/10 rounded-full px-4 py-1.5 flex items-center justify-center gap-4 text-[10px] font-mono text-slate-500 shadow-xl whitespace-nowrap overflow-hidden max-w-[90vw]">
                    <span className="flex items-center gap-1.5 shrink-0"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>[SYSTEM: ONLINE]</span>
                    <span className="opacity-30 shrink-0">|</span>
                    <span className="shrink-0">[NODE: NEURAL_CORE_V2.5]</span>
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
                lang={lang}
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
    const lang = (localStorage.getItem('lucy_lang') as 'EN' | 'VN') || 'VN';
    const [isAAA, setIsAAA] = useState(true);

    const initialContainers: ContainerState[] = [
        { id: 'beaker-1', position: [-1.5, 0.11, 0], contents: { chemicalId: 'H2O', volume: 0.6, color: CHEMICALS['H2O'].color, temperature: 25 } },
        { id: 'flask-1', position: [1.5, 0.11, 0], contents: { chemicalId: 'COPPER_SULFATE', volume: 0.4, color: CHEMICALS['COPPER_SULFATE'].color, temperature: 25 } }
    ];
    const [containers, setContainers] = useState<ContainerState[]>(initialContainers);
    const [lastReaction, setLastReaction] = useState<LocalizedString | null>(null);
    const [lastEffect, setLastEffect] = useState<string | null>(null);
    const [aiFeedback, setAiFeedback] = useState<string>("Chào mừng bạn đến với phòng thí nghiệm. Tôi là Giáo sư Lucy.");
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const service = new GeminiService();
        const isMuted = localStorage.getItem('lucy_is_muted') === 'true';
        const lang = (localStorage.getItem('lucy_lang') as 'EN' | 'VN') || 'VN';

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

                // Trigger audio
                speakTTS(text, lang, isMuted).catch(console.error);
            }
        };
        aiServiceRef.current = service;
        // Sync initial history
        setChatHistory([...service['history'].map(h => ({ role: h.role, text: h.text }))]);

        return () => {
            if (reactionTimeoutRef.current) window.clearTimeout(reactionTimeoutRef.current);
            // window.speechSynthesis?.cancel(); // cleanup speech (deprecated)
        };
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
            }, 4500); // 4.5 seconds auto-reset for safety badge

            if (aiServiceRef.current) {
                setIsAiLoading(true);
                let detail = `I just mixed ${CHEMICALS[source.contents.chemicalId].name.EN} and ${CHEMICALS[targetChemId].name.EN}. Explain the reaction.`;

                // Specific observation dispatch for Copper + Nitric Acid
                if ((source.contents.chemicalId === 'COPPER' && targetChemId === 'HNO3') ||
                    (source.contents.chemicalId === 'HNO3' && targetChemId === 'COPPER')) {
                    detail = "[OBSERVATION] I just dropped Copper into Nitric Acid. The solution turned blue and is emitting a thick, brown toxic gas. Explain the chemistry and safety protocols for this reaction.";
                }

                await aiServiceRef.current.getReactionFeedback(detail);
                setIsAiLoading(false);
            }
        }
    }, [containers, heaterTemp]); // Add heaterTemp to dependencies

    const handleSpawn = (chemId: string) => {
        const isBeaker = chemId === 'BEAKER';
        const isFlask = chemId === 'FLASK';
        const isContainer = isBeaker || isFlask;
        const newId = isBeaker ? `beaker-${Date.now()}` : isFlask ? `flask-${Date.now()}` : `source_${chemId}_${Date.now()}`;
        const chem = !isContainer ? CHEMICALS[chemId] : null;

        let validPos = false;
        let x = 0, y = isContainer ? 0.11 : 0.56, z = isContainer ? 0 : -3.5;
        let attempts = 0;

        // Find a position that does not strongly overlap with existing items
        while (!validPos && attempts < 50) {
            x = (Math.random() - 0.5) * 8; // Spread across wider area
            if (isContainer) z = (Math.random() * 2) - 1.0;

            let collision = false;
            for (const c of containers) {
                const dist = Math.sqrt(Math.pow(c.position[0] - x, 2) + Math.pow(c.position[2] - z, 2));
                if (dist < 0.8) { // Minimum safety distance between bounds
                    collision = true;
                    break;
                }
            }
            if (!collision) validPos = true;
            attempts++;
        }

        setContainers(prev => [...prev, { id: newId, position: [x, y, z], initialPosition: isContainer ? undefined : [x, y, z], contents: isContainer ? null : { chemicalId: chemId, volume: 1.0, color: chem!.color, temperature: 25 } }]);
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
                isAAA={isAAA}
                onMove={handleMoveContainer}
                onPour={handlePour}
            />
            <LabUI
                lastReaction={lastReaction}
                lastEffect={lastEffect}
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
                lang={lang}
                isAAA={isAAA}
                setIsAAA={setIsAAA}
            />
        </div>
    );
}
