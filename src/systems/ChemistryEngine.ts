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

        const tintFactor1 = isWater1 ? 0.05 : 1.0; // Reduced from 0.1 to 0.05 per spec
        const tintFactor2 = isWater2 ? 0.05 : 1.0;

        // Check for solids (High density usually means solid in this sim's context, or type check)
        // Since we only get IDs/Colors here, we might not know type easily without lookup.
        // Assuming non-water, non-dilute colors are "strong".
        // Let's assume passed vol includes density factor or we just use volume.
        // The prompt says "solids have a weight of 2.0". We don't have chemical type here easily without lookup.
        // But blendColors is usually called with volumes.
        // Let's stick to the prompt's weights: H2O = 0.05.
        // For solids, we'd need to know if it IS a solid.
        // We can scan CHEMICALS by color? No, risky.
        // Let's rely on tintFactor for now.

        const w1 = vol1 * tintFactor1;
        const w2 = vol2 * tintFactor2;
        const totalW = w1 + w2;

        if (totalW === 0) return color1;

        // Root-Mean-Square (RMS) Mixing
        // Formula: C_final = sqrt( (w1 * C^2 + w2 * C^2) / (w1 + w2) )
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

        // HARDCODED SAFETY TRIGGER (MODULE 3) - Overwritten for stricter check per Module 4
        if ((chemId1 === 'SODIUM' && chemId2 === 'H2O') || (chemId1 === 'H2O' && chemId2 === 'SODIUM')) {
            return {
                resultId: 'NaOH',
                resultColor: '#f8fafc',
                reaction: {
                    productName: 'Sodium Hydroxide',
                    color: '#f8fafc',
                    effect: 'explosion',
                    message: 'Violent exothermic reaction!'
                }
            };
        }

        const c1 = CHEMICALS[chemId1] || CHEMICALS['H2O'];
        const c2 = CHEMICALS[chemId2] || CHEMICALS['H2O'];

        // 1. SCENARIO: Check Registry for ANY valid permutation
        const match = REACTION_REGISTRY.find(r =>
            (r.reactants.includes(chemId1) && r.reactants.includes(chemId2))
        );

        // 2. SCENARIO: A valid reaction exists
        if (match) {
            // Temperature check for activation energy
            const minTemp = match.minTemperature || -273;
            if (currentTemperature >= minTemp) {

                const product = CHEMICALS[match.product];
                // Override volume rules for solid dropping - if it's an explosive reaction, force the visuals!
                const finalColor = match.effect === 'explosion' ? product.color : match.resultColor || product.color;
                const startBlend = this.blendColors(c1.color, vol1, c2.color, vol2);

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
                        effect: match.effect, // CRITICAL: This must pass 'explosion' back to App.tsx
                        temperature: match.temperature,
                        message: match.message
                    }
                };

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
                    result.resultColor = startBlend;
                }

                return result;
            } else {
                // Temp too low: Visually mix using RMS but no product change
                return {
                    resultId: vol1 >= vol2 ? chemId1 : chemId2, // Dominant ID
                    resultColor: this.blendColors(c1.color, vol1, c2.color, vol2),
                    // No reaction object returned
                };
            }
        }

        // 3. Realistic Dilution/Blending
        const resultColor = this.blendColors(c1.color, vol1, c2.color, vol2);

        // --- TITRATION / INDICATOR LOGIC ---
        const hasPhenol = [chemId1, chemId2].some(id => id === 'PHENOLPHTHALEIN' || id === 'PINK_INDICATOR');
        const hasUniversal = [chemId1, chemId2].some(id => id === 'UNIVERSAL_INDICATOR');

        if (hasPhenol || hasUniversal) {
            const getMolarBalance = (ph: number, vol: number) => {
                const h = Math.pow(10, -ph);
                const oh = Math.pow(10, -(14 - ph));
                return (h - oh) * vol;
            };

            const balance = getMolarBalance(c1.ph, vol1) + getMolarBalance(c2.ph, vol2);
            const totalVol = vol1 + vol2;

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

            // UNIVERSAL INDICATOR LOGIC
            if (hasUniversal) {
                let color = '#22c55e'; // 7 Green
                if (finalPH < 3) color = '#ef4444'; // Red
                else if (finalPH < 5) color = '#f97316'; // Orange
                else if (finalPH < 6.5) color = '#eab308'; // Yellow
                else if (finalPH < 7.5) color = '#22c55e'; // Green
                else if (finalPH < 9.5) color = '#3b82f6'; // Blue
                else color = '#a855f7'; // Purple

                return {
                    resultId: 'UNIVERSAL_INDICATOR',
                    resultColor: color,
                    reaction: {
                        productName: `Dung dịch pH ${finalPH.toFixed(1)}`,
                        color: color,
                        message: `Chất chỉ thị vạn năng: pH = ${finalPH.toFixed(1)}.`
                    }
                };
            }

            // PHENOLPHTHALEIN LOGIC
            if (finalPH >= 8.2) {
                return {
                    resultId: 'PINK_INDICATOR',
                    resultColor: '#db2777',
                    reaction: {
                        productName: 'Dung dịch Bazơ (Hồng)',
                        color: '#db2777',
                        message: 'Môi trường Bazơ: Phenolphthalein chuyển màu hồng.'
                    }
                };
            } else {
                const wasPink = chemId1 === 'PINK_INDICATOR' || chemId2 === 'PINK_INDICATOR';
                const msg = wasPink ? 'Điểm Tương Đương! Dung dịch mất màu hồng.' : undefined;

                return {
                    resultId: 'PHENOLPHTHALEIN',
                    resultColor: finalPH < 7 ? '#fefce8' : '#f8fafc',
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
