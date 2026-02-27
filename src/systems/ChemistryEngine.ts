import * as THREE from 'three';
import { CHEMICALS, REACTION_REGISTRY } from '../constants';
import { ReactionResult } from '../types';

export class ChemistryEngine {
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
        // If one is H2O and other is not, the other takes precedence unless very diluted
        let newId = targetId;

        if (targetId === 'H2O' && sourceId !== 'H2O' && sVol > 0.1) {
            newId = sourceId;
        } else if (sourceId === 'H2O' && targetId !== 'H2O' && tVol > 0.1) {
            newId = targetId; // Keep target
        } else if (sVol > tVol) {
            newId = sourceId;
        }

        // Blend colors
        const finalColor = ChemistryEngine.blendColors(c1.color, targetVol, c2.color, sourceVol, targetId, sourceId);

        return {
            resultId: newId,
            resultColor: finalColor
        };
    }
}
