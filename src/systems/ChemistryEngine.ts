import * as THREE from 'three';
import { CHEMICALS, REACTION_REGISTRY } from '../constants';
import { ReactionResult, ActiveReaction } from '../types';

export class ChemistryEngine {
    static blendColors(color1: string, vol1: number, color2: string, vol2: number): string {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);

        const totalVol = vol1 + vol2;
        if (totalVol === 0) return color1;

        // "Solvent Tinting" - Liquids like water take on color easily
        // If a chemical is water, its "weight" in the color mix is reduced, allowing the solute to dominate
        const waterColor = CHEMICALS['H2O'].color.toLowerCase();
        const isWater1 = color1.toLowerCase() === waterColor;
        const isWater2 = color2.toLowerCase() === waterColor;

        const tintFactor1 = isWater1 ? 0.1 : 1.0;
        const tintFactor2 = isWater2 ? 0.1 : 1.0;

        const w1 = vol1 * tintFactor1;
        const w2 = vol2 * tintFactor2;
        const totalW = w1 + w2;

        if (totalW === 0) return color1;

        // Root-Mean-Square (RMS) Mixing for more realistic light/liquid blending
        // This prevents the "muddy" look of simple linear interpolation
        const r = Math.sqrt((c1.r ** 2 * w1 + c2.r ** 2 * w2) / totalW);
        const g = Math.sqrt((c1.g ** 2 * w1 + c2.g ** 2 * w2) / totalW);
        const b = Math.sqrt((c1.b ** 2 * w1 + c2.b ** 2 * w2) / totalW);

        return '#' + new THREE.Color(r, g, b).getHexString();
    }

    static mix(
        chemId1: string,
        vol1: number,
        chemId2: string,
        vol2: number,
        currentTemperature: number = 20 // Default ambient
    ): { resultId: string; resultColor: string; reaction?: ReactionResult; activeReaction?: ActiveReaction } {

        const c1 = CHEMICALS[chemId1] || CHEMICALS['H2O'];
        const c2 = CHEMICALS[chemId2] || CHEMICALS['H2O'];

        // 1. Check for specific molecular reactions in Registry
        const match = REACTION_REGISTRY.find(r =>
            (r.reactants[0] === chemId1 && r.reactants[1] === chemId2) ||
            (r.reactants[1] === chemId1 && r.reactants[0] === chemId2)
        );

        // Check Temperature Activation Energy
        if (match) {
            const minTemp = match.minTemperature || -273; // Absolute zero if not specified

            if (currentTemperature >= minTemp) {
                const product = CHEMICALS[match.product];
                // Initial blend color (before reaction completes)
                const startBlend = this.blendColors(c1.color, vol1, c2.color, vol2);

                // Explosions and big reactions often result in a dominant product color
                const finalColor = match.effect === 'explosion' ? product.color : match.resultColor || product.color;

                // Prepare result
                const result: {
                    resultId: string;
                    resultColor: string;
                    reaction: ReactionResult;
                    activeReaction?: ActiveReaction
                } = {
                    resultId: match.product,
                    resultColor: finalColor,
                    reaction: {
                        productName: product.name,
                        color: finalColor,
                        effect: match.effect,
                        temperature: match.temperature,
                        message: match.message
                    }
                };

                // Add Kinetics if duration is specified
                if (match.duration && match.duration > 0) {
                    result.activeReaction = {
                        startTime: Date.now(),
                        duration: match.duration,
                        startColor: startBlend,
                        targetColor: finalColor,
                        productId: match.product,
                        productName: product.name,
                        effect: match.effect,
                        message: match.message
                    };
                    // If kinetic, start with the blend color, not the final color
                    result.resultColor = startBlend;
                }

                return result;
            }
            // If match exists but temp is too low, fall through to blending (no reaction yet)
        }

        // 3. Realistic Dilution/Blending
        const resultColor = this.blendColors(c1.color, vol1, c2.color, vol2);

        // --- TITRATION / INDICATOR LOGIC ---
        // Check if Phenolphthalein is present in either reactant
        const hasIndicator = [chemId1, chemId2].some(id => id === 'PHENOLPHTHALEIN' || id === 'PINK_INDICATOR');

        if (hasIndicator) {
            // Calculate approximate final pH
            // Molarity approximation:
            // [H+] = 10^(-pH)
            // [OH-] = 10^(-(14-pH))
            // Net moles H+ = (Vol1 * [H+]1) + (Vol2 * [H+]2) - (Vol1 * [OH-]1) - (Vol2 * [OH-]2)
            // If Net > 0, Acidic. If Net < 0, Basic.

            const getMolarBalance = (ph: number, vol: number) => {
                const h = Math.pow(10, -ph);
                const oh = Math.pow(10, -(14 - ph));
                return (h - oh) * vol;
            };

            const balance = getMolarBalance(c1.ph, vol1) + getMolarBalance(c2.ph, vol2);
            const totalVol = vol1 + vol2;

            // Reconstruct pH (Roughly)
            // If balance > 0 (Acidic), [H+] = balance / totalVol
            // If balance < 0 (Basic), [OH-] = -balance / totalVol

            let finalPH = 7.0;
            if (Math.abs(balance) > 1e-10) {
                if (balance > 0) {
                    finalPH = -Math.log10(balance / totalVol);
                } else {
                    const ohConc = -balance / totalVol;
                    const pOH = -Math.log10(ohConc);
                    finalPH = 14 - pOH;
                }
            }

            // Phenolphthalein Turn point: 8.2
            if (finalPH >= 8.2) {
                return {
                    resultId: 'PINK_INDICATOR',
                    resultColor: '#db2777', // Pink
                    reaction: {
                        productName: 'Dung dịch Bazơ (Hồng)',
                        color: '#db2777',
                        message: 'Môi trường Bazơ: Phenolphthalein chuyển màu hồng.'
                    }
                };
            } else {
                // Return to clear / dominant acid color
                // If we went from Pink to Clear (Titration Endpoint)
                const wasPink = chemId1 === 'PINK_INDICATOR' || chemId2 === 'PINK_INDICATOR';
                const msg = wasPink ? 'Điểm Tương Đương! Dung dịch mất màu hồng.' : undefined;

                return {
                    resultId: 'PHENOLPHTHALEIN', // Or a neutral mix ID
                    resultColor: finalPH < 7 ? '#fefce8' : '#f8fafc', // Slight yellow for acid, clear for neutral
                    reaction: wasPink ? {
                        productName: 'Dung dịch Trung Hòa',
                        color: '#f8fafc',
                        message: msg || ''
                    } : undefined
                };
            }
        }

        return {
            resultId: vol1 >= vol2 ? chemId1 : chemId2,
            resultColor: resultColor
        };
    }
}
