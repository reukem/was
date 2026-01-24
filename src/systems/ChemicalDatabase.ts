import { Chemical, ReactionResult } from '../types/ChemistryTypes';

export const CHEMICALS: Record<string, Chemical> = {
    'H2O': {
        id: 'H2O',
        name: 'Distilled Water',
        formula: 'H₂O',
        color: '#a5f3fc', // Very light blue/clear
        type: 'liquid',
        ph: 7.0,
        description: 'Universal solvent. Neutral pH.'
    },
    'HCl': {
        id: 'HCl',
        name: 'Hydrochloric Acid',
        formula: 'HCl',
        color: '#fef08a', // Slight yellow
        type: 'liquid',
        ph: 1.0,
        description: 'Strong acid. Corrosive.'
    },
    'NaOH': {
        id: 'NaOH',
        name: 'Sodium Hydroxide',
        formula: 'NaOH',
        color: '#e2e8f0', // Clear/White tint
        type: 'liquid',
        ph: 14.0,
        description: 'Strong base. Caustic.'
    },
    'INDICATOR': {
        id: 'INDICATOR',
        name: 'Universal Indicator',
        formula: 'C₂₀H₁₄O₄', // Phenolphthalein-ish simplification
        color: '#22c55e', // Green (Neutral)
        type: 'liquid',
        ph: 7.0,
        description: 'Changes color based on pH.'
    },
    'CuSO4': {
        id: 'CuSO4',
        name: 'Copper Sulfate',
        formula: 'CuSO₄',
        color: '#3b82f6', // Bright Blue
        type: 'liquid',
        ph: 4.5, // Weakly acidic
        description: 'Blue salt solution.'
    },
    'K': {
        id: 'K',
        name: 'Potassium',
        formula: 'K',
        color: '#d1d5db',
        type: 'solid',
        ph: 7,
        description: 'Highly reactive metal.'
    }
};

export const getChemical = (id: string): Chemical | undefined => CHEMICALS[id];
