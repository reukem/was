// src/systems/ChemistryEngine.ts
import * as THREE from 'three';
import { CHEMICALS, REACTION_REGISTRY } from '../constants';
import { ReactionResult, ActiveReaction } from '../types';

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

    static mix(chemId1: string, vol1: number, chemId2: string, vol2: number, ambientTemp: number): { resultId: string; resultColor: string; reaction?: ReactionResult; activeReaction?: ActiveReaction | null } {
        const c1 = CHEMICALS[chemId1] || CHEMICALS['H2O'];
        const c2 = CHEMICALS[chemId2] || CHEMICALS['H2O'];

        // Find reaction match
        const match = REACTION_REGISTRY.find(r =>
            (r.reactants[0] === chemId1 && r.reactants[1] === chemId2) ||
            (r.reactants[1] === chemId1 && r.reactants[0] === chemId2)
        );

        const blendColor = this.blendColors(c1.color, vol1, c2.color, vol2, chemId1, chemId2);

        if (match) {
            const minTemp = match.minTemp || 0;
            if (ambientTemp >= minTemp) {
                const product = CHEMICALS[match.product];
                const resColor = match.effect === 'explosion' ? product.color : blendColor; // Use blend initially, transition to product

                // Construct Reaction Result
                const reactionResult: ReactionResult = {
                    productName: product.name,
                    color: product.color,
                    effect: match.effect,
                    temperature: match.temperature,
                    message: match.message
                };

                // Construct Kinetic Active Reaction
                const activeReaction: ActiveReaction = {
                    startTime: Date.now(),
                    duration: 2000, // 2 seconds reaction time
                    startColor: blendColor,
                    targetColor: product.color,
                    productId: match.product
                };

                return {
                    resultId: match.product, // Immediate logic change, but visual transition via activeReaction
                    resultColor: blendColor, // Start with blend
                    reaction: reactionResult,
                    activeReaction: activeReaction
                };
            }
        }

        // No reaction or too cold
        let newId = vol1 > vol2 ? chemId1 : chemId2;
        if (chemId1 === 'H2O' && vol2 > 0.1) newId = chemId2;
        if (chemId2 === 'H2O' && vol1 > 0.1) newId = chemId1;

        return { resultId: newId, resultColor: blendColor, activeReaction: null };
    }
}
