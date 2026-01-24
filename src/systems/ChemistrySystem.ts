import * as THREE from 'three';
import { Chemical, ReactionResult } from '../types/ChemistryTypes';
import { CHEMICALS, getChemical } from './ChemicalDatabase';

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

        // Default: Physical mixture
        let resultId = 'MIXTURE';
        // Simple heuristic: if same, keep same. If water + something, keep something (diluted).
        if (chemId1 === chemId2) resultId = chemId1;
        else if (chemId1 === 'H2O') resultId = chemId2;
        else if (chemId2 === 'H2O') resultId = chemId1;

        let resultColor = this.blendColors(c1.color, vol1, c2.color, vol2);
        let reaction: ReactionResult | undefined;

        // Reaction Rules

        // 1. Neutralization (Acid + Base)
        if ((c1.ph < 7 && c2.ph > 7) || (c1.ph > 7 && c2.ph < 7)) {
            // Check for HCl + NaOH specifically
            if ((chemId1 === 'HCl' && chemId2 === 'NaOH') || (chemId1 === 'NaOH' && chemId2 === 'HCl')) {
                resultId = 'H2O'; // Salt water (approx)
                resultColor = '#e0f2fe'; // Pale blue/clear
                reaction = {
                    productName: 'Salt Water (Hot)',
                    color: resultColor,
                    effect: 'smoke',
                    message: 'Neutralization reaction! Heat released.'
                };
            }
        }

        // 2. Indicator
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

        // 3. Water + Potassium (Explosion)
        if ((chemId1 === 'K' && chemId2 === 'H2O') || (chemId1 === 'H2O' && chemId2 === 'K')) {
             resultColor = '#ffffff';
             reaction = {
                 productName: 'Explosion',
                 color: '#ff0000',
                 effect: 'explosion',
                 message: 'Potassium reacts violently with water!'
             };
        }

        return { resultId, resultColor, reaction };
    }
}
