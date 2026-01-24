import { Chemical, ReactionResult } from '../types/ChemistryTypes';

export const CHEMICALS: Record<string, Chemical> = {
    // Basics
    'H2O': {
        id: 'H2O',
        name: 'Water',
        formula: 'H₂O',
        color: '#a5f3fc', // Very light blue/clear
        type: 'liquid',
        ph: 7.0,
        description: 'Universal solvent. Neutral pH.'
    },

    // Acids
    'LEMON_JUICE': {
        id: 'LEMON_JUICE',
        name: 'Lemon Juice',
        formula: 'C₆H₈O₇', // Citric Acid
        color: '#fef08a', // Yellow
        type: 'liquid',
        ph: 2.2,
        description: 'Sour juice from a lemon. Contains Citric Acid.'
    },
    'VINEGAR': {
        id: 'VINEGAR',
        name: 'Vinegar',
        formula: 'CH₃COOH', // Acetic Acid
        color: '#fffcfa', // Clear/Off-white
        type: 'liquid',
        ph: 2.5,
        description: 'Mild acid used in cooking. Contains Acetic Acid.'
    },

    // Bases
    'BAKING_SODA': {
        id: 'BAKING_SODA',
        name: 'Baking Soda',
        formula: 'NaHCO₃',
        color: '#ffffff',
        type: 'solid',
        ph: 8.3,
        description: 'White powder. Basic. Reacts fizzily with acids.'
    },
    'SOAP': {
        id: 'SOAP',
        name: 'Liquid Soap',
        formula: 'C₁₇H₃₅COONa',
        color: '#bae6fd', // Light Blue
        type: 'liquid',
        ph: 9.5,
        description: 'Slippery cleaner. Basic.'
    },
    'BLEACH': {
        id: 'BLEACH',
        name: 'Bleach',
        formula: 'NaClO',
        color: '#fde047', // Pale Yellow
        type: 'liquid',
        ph: 12.5,
        description: 'Strong base. Very strong cleaner. DO NOT MIX WITH ACIDS.'
    },

    // Neutrals
    'SUGAR': {
        id: 'SUGAR',
        name: 'Sugar',
        formula: 'C₁₂H₂₂O₁₁',
        color: '#ffffff',
        type: 'solid',
        ph: 7.0,
        description: 'Sweet granules. Neutral.'
    },

    // Radioactive
    'POLONIUM': {
        id: 'POLONIUM',
        name: 'Polonium',
        formula: 'Po',
        color: '#94a3b8', // Silver metal
        type: 'solid',
        ph: 7.0,
        description: 'Radioactive metal. Discovered by Marie Curie.'
    },
    'RADIUM': {
        id: 'RADIUM',
        name: 'Radium',
        formula: 'Ra',
        color: '#4ade80', // Glowing Green (Stylized)
        type: 'solid',
        ph: 7.0,
        description: 'Glowing radioactive metal. Also discovered by Marie Curie.'
    },

    // Legacy/Technical
    'INDICATOR': {
        id: 'INDICATOR',
        name: 'Universal Indicator',
        formula: 'Solution',
        color: '#22c55e', // Green (Neutral)
        type: 'liquid',
        ph: 7.0,
        description: 'Changes color based on pH.'
    },
    'HCl': {
        id: 'HCl',
        name: 'Hydrochloric Acid',
        formula: 'HCl',
        color: '#fef08a',
        type: 'liquid',
        ph: 1.0,
        description: 'Strong acid. Corrosive.'
    },
    'NaOH': {
        id: 'NaOH',
        name: 'Sodium Hydroxide',
        formula: 'NaOH',
        color: '#e2e8f0',
        type: 'liquid',
        ph: 14.0,
        description: 'Strong base. Caustic.'
    }
};

export const getChemical = (id: string): Chemical | undefined => CHEMICALS[id];
