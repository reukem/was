import * as THREE from 'three';
import { CHEMICALS } from '../constants';
import { REACTION_REGISTRY } from './ReactionRegistry';
import { ReactionResult } from '../types';

export class ChemistryEngine {
    static blendColors(color1: string, vol1: number, color2: string, vol2: number): string {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);

        const totalVol = vol1 + vol2;
        if (totalVol === 0) return color1;

        // If one is water, make it more susceptible to tinting
        const tintFactor1 = color1.toLowerCase() === CHEMICALS['H2O'].color.toLowerCase() ? 0.2 : 1.0;
        const tintFactor2 = color2.toLowerCase() === CHEMICALS['H2O'].color.toLowerCase() ? 0.2 : 1.0;

        const w1 = vol1 * tintFactor1;
        const w2 = vol2 * tintFactor2;
        const totalW = w1 + w2;

        const r = (c1.r * w1 + c2.r * w2) / totalW;
        const g = (c1.g * w1 + c2.g * w2) / totalW;
        const b = (c1.b * w1 + c2.b * w2) / totalW;

        return '#' + new THREE.Color(r, g, b).getHexString();
    }

    static mix(
        chemId1: string,
        vol1: number,
        chemId2: string,
        vol2: number
    ): { resultId: string; resultColor: string; reaction?: ReactionResult } {

        const c1 = CHEMICALS[chemId1] || CHEMICALS['H2O'];
        const c2 = CHEMICALS[chemId2] || CHEMICALS['H2O'];

        // 1. Check for specific molecular reactions in Registry
        const match = REACTION_REGISTRY.find(r =>
            (r.reactants[0] === chemId1 && r.reactants[1] === chemId2) ||
            (r.reactants[1] === chemId1 && r.reactants[0] === chemId2)
        );

        if (match) {
            const product = CHEMICALS[match.product];
            // Explosions and big reactions often result in a dominant product color
            const resColor = match.effect === 'explosion' ? product.color : this.blendColors(c1.color, vol1, c2.color, vol2);
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

        // 2. Special Indicator Logic (Visual pH test)
        if (chemId1 === 'INDICATOR' || chemId2 === 'INDICATOR') {
            const reactant = chemId1 === 'INDICATOR' ? c2 : c1;
            let indicatorColor = '#22c55e'; // Default Neutral Green
            if (reactant.ph < 3) indicatorColor = '#ef4444'; // Strong Acid (Red)
            else if (reactant.ph < 6) indicatorColor = '#f97316'; // Weak Acid (Orange)
            else if (reactant.ph > 11) indicatorColor = '#a855f7'; // Strong Base (Purple)
            else if (reactant.ph > 8) indicatorColor = '#3b82f6'; // Weak Base (Blue)

            return {
                resultId: 'INDICATOR',
                resultColor: indicatorColor,
                reaction: {
                    productName: 'pH Indication',
                    color: indicatorColor,
                    message: `Indicator shift! Detected pH: ${reactant.ph.toFixed(1)}`
                }
            };
        }

        // 3. Realistic Dilution/Blending
        const resultColor = this.blendColors(c1.color, vol1, c2.color, vol2);

        return {
            resultId: vol1 >= vol2 ? chemId1 : chemId2,
            resultColor: resultColor
        };
    }
}
