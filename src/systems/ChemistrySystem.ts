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

        // --- Reaction Rules ---

        // 1. Baking Soda + Acid (Volcano Effect)
        if ((chemId1 === 'BAKING_SODA' && c2.ph < 7) || (chemId2 === 'BAKING_SODA' && c1.ph < 7)) {
             resultId = 'H2O'; // Ends up mostly as water/salt solution
             resultColor = '#ffffff'; // White foam visual
             reaction = {
                 productName: 'Fizzy Reaction!',
                 color: '#ffffff',
                 effect: 'bubbles',
                 message: 'Baking Soda reacts with acid to make bubbles (CO2)!'
             };
        }

        // 2. Bleach + Acid (Dangerous)
        // Check for specific dangerous mix
        else if ((chemId1 === 'BLEACH' && c2.ph < 7) || (chemId2 === 'BLEACH' && c1.ph < 7)) {
             resultColor = '#bef264'; // Greenish gas color
             reaction = {
                 productName: 'Chlorine Gas (Danger!)',
                 color: '#bef264',
                 effect: 'smoke',
                 message: 'WARNING: Bleach + Acid creates toxic Chlorine gas! Never do this at home!'
             };
        }

        // 3. Neutralization (Generic Acid + Base)
        else if ((c1.ph < 7 && c2.ph > 7) || (c1.ph > 7 && c2.ph < 7)) {
             // If not caught by specific rules above
             resultId = 'H2O';
             // Color tends towards clear/water
             resultColor = this.blendColors('#e0f2fe', 1, resultColor, 0.2);

             reaction = {
                 productName: 'Neutralization',
                 color: resultColor,
                 message: 'Acid and Base neutralized each other.'
             };
        }

        // 4. Indicator
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
