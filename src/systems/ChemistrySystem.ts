import * as THREE from 'three';
import { Chemical, ReactionResult } from '../types/ChemistryTypes';
import { CHEMICALS, getChemical } from './ChemicalDatabase';
import { REACTION_REGISTRY } from './ReactionRegistry';

export class ChemistrySystem {

    // Helper to blend colors
    static blendColors(color1: string, vol1: number, color2: string, vol2: number): string {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);

        const totalVol = vol1 + vol2;
        if (totalVol === 0) return color1;

        const r = (c1.r * vol1 + c2.r * vol2) / totalVol;
        const g = (c1.g * vol1 + c2.g * vol2) / totalVol;
        const b = (c1.b * vol1 + c2.b * vol2) / totalVol;

        return '#' + new THREE.Color(r, g, b).getHexString();
    }

    static mix(
        chemId1: string,
        vol1: number,
        chemId2: string,
        vol2: number
    ): { resultId: string; resultColor: string; reaction?: ReactionResult } {

        const c1 = getChemical(chemId1);
        const c2 = getChemical(chemId2);

        if (!c1 || !c2) return { resultId: 'H2O', resultColor: '#ffffff' };

        // 1. Check Registry for Specific Reactions
        const registryMatch = REACTION_REGISTRY.find(r =>
            (r.reactants.includes(chemId1) && r.reactants.includes(chemId2) && chemId1 !== chemId2)
        );

        if (registryMatch) {
            const product = getChemical(registryMatch.product);
            return {
                resultId: registryMatch.product,
                resultColor: registryMatch.resultColor || product?.color || '#ffffff',
                reaction: {
                    productName: product?.name || 'Unknown Product',
                    color: registryMatch.resultColor || product?.color || '#ffffff',
                    effect: registryMatch.effect,
                    message: registryMatch.message
                }
            };
        }

        // 2. Default: Physical mixture (Dilution/Mixing)
        let resultId = 'MIXTURE';

        // Logic: Keep the "Solute" if mixing with water, or dominant volume?
        // Simple logic: If mixing with water, keep the chemical but it's diluted (same ID).
        if (chemId1 === 'H2O') resultId = chemId2;
        else if (chemId2 === 'H2O') resultId = chemId1;
        // If mixing two different non-water things that don't react:
        else if (chemId1 === chemId2) resultId = chemId1;
        else resultId = 'MIXTURE'; // Generic Brown Sludge

        let resultColor = this.blendColors(c1.color, vol1, c2.color, vol2);
        let reaction: ReactionResult | undefined;

        // 3. Fallback Logic: Indicator
        if (chemId1 === 'INDICATOR' || chemId2 === 'INDICATOR') {
            const other = chemId1 === 'INDICATOR' ? c2 : c1;
            resultId = 'INDICATOR'; // It dominates visual
            if (other.ph < 3) {
                resultColor = '#ef4444'; // Red
                reaction = { productName: 'Acidic Indicator', color: resultColor, message: 'Indicator turned RED (Acidic).' };
            } else if (other.ph > 10) {
                resultColor = '#a855f7'; // Purple
                reaction = { productName: 'Basic Indicator', color: resultColor, message: 'Indicator turned PURPLE (Basic).' };
            } else if (other.ph < 7) {
                 resultColor = '#f97316'; // Orange
                 reaction = { productName: 'Slightly Acidic', color: resultColor, message: 'Indicator turned ORANGE.' };
            } else if (other.ph > 7) {
                 resultColor = '#3b82f6'; // Blue
                 reaction = { productName: 'Slightly Basic', color: resultColor, message: 'Indicator turned BLUE.' };
            }
        }

        return { resultId, resultColor, reaction };
    }
}
