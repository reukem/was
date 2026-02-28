import * as THREE from 'three';
import { CHEMICALS, REACTION_REGISTRY } from '../constants';
import { ReactionResult } from '../types';

export class ChemistryEngine {
    static blendColors(color1: string, vol1: number, color2: string, vol2: number, id1: string, id2: string): string {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);

        // Parse channels to 0-255 scale
        const r1 = c1.r * 255;
        const g1 = c1.g * 255;
        const b1 = c1.b * 255;

        const r2 = c2.r * 255;
        const g2 = c2.g * 255;
        const b2 = c2.b * 255;

        const totalVol = vol1 + vol2;
        if (totalVol <= 0.001) return color1;

        const getStrength = (id: string) => {
            if (id === 'H2O') return 0.05;
            if (CHEMICALS[id]?.type === 'solid') return 2.0;
            // Strong colorants
            if (id === 'CuSO4_LIQUID' || id === 'COPPER_SULFATE') return 3.0;
            return 1.0;
        };

        const s1 = getStrength(id1);
        const s2 = getStrength(id2);
        const v1 = vol1 * s1;
        const v2 = vol2 * s2;
        const vTotal = v1 + v2;

        if (vTotal <= 0) return color1;

        // Apply RMS Math: C_final = Math.sqrt((V1 * C1^2 + V2 * C2^2) / (V1 + V2))
        const finalR = Math.sqrt((v1 * Math.pow(r1, 2) + v2 * Math.pow(r2, 2)) / vTotal);
        const finalG = Math.sqrt((v1 * Math.pow(g1, 2) + v2 * Math.pow(g2, 2)) / vTotal);
        const finalB = Math.sqrt((v1 * Math.pow(b1, 2) + v2 * Math.pow(b2, 2)) / vTotal);

        // Convert back to 0-1 scale for Three.Color
        const resultColor = new THREE.Color(finalR / 255, finalG / 255, finalB / 255);
        return '#' + resultColor.getHexString();
    }

    static mix(targetId: string, targetVol: number, sourceId: string, sourceVol: number, ambientTemp: number): { resultId: string; resultColor: string; reaction?: ReactionResult } {
        // Resolve H2O defaults if missing
        const c1 = CHEMICALS[targetId] || CHEMICALS['H2O'];
        const c2 = CHEMICALS[sourceId] || CHEMICALS['H2O'];
        const tVol = targetVol || 0;
        const sVol = sourceVol || 0;

        // 1. CHECK REACTION REGISTRY
        // Try both permutations (A+B or B+A)
        const match = REACTION_REGISTRY.find(r =>
            (r.reactants[0] === targetId && r.reactants[1] === sourceId) ||
            (r.reactants[1] === targetId && r.reactants[0] === sourceId)
        );

        if (match) {
            // Check Activation Energy
            const minTemp = match.minTemp || 0;
            if (ambientTemp >= minTemp) {
                const product = CHEMICALS[match.product];
                // If explosion, color might just be black/charred, but let's use product color or blend
                let resColor = product.color;

                if (match.effect !== 'explosion') {
                     resColor = match.resultColor || product.color;
                }

                return {
                    resultId: match.product,
                    resultColor: resColor,
                    reaction: {
                        productName: product.name,
                        color: resColor,
                        effect: match.effect,
                        temperature: match.temperature,
                        message: match.message
                    }
                };
            }
        }

        // 2. NO REACTION (PHYSICAL MIXING)
        // Dominant species logic:
        let newId = targetId;

        // H2O Dilution Logic
        if (targetId === 'H2O' && sourceId !== 'H2O') {
            newId = sourceId; // Water takes the identity of solute
            // Special case: Dissolving CuSO4 solid into water creates CuSO4_LIQUID
            if (sourceId === 'COPPER_SULFATE' || sourceId === 'CuSO4') {
                newId = 'CuSO4_LIQUID';
            }
        } else if (sourceId === 'H2O' && targetId !== 'H2O') {
            newId = targetId; // Dilution keeps solute identity
             if (targetId === 'COPPER_SULFATE' || targetId === 'CuSO4') {
                newId = 'CuSO4_LIQUID';
            }
        } else if (sVol > tVol) {
            newId = sourceId; // Larger volume dominates
        }

        // Blend colors
        const finalColor = ChemistryEngine.blendColors(c1.color, targetVol, c2.color, sourceVol, targetId, sourceId);

        return {
            resultId: newId,
            resultColor: finalColor
        };
    }
}
