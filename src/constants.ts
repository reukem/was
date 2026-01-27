import { Chemical } from './types';

export const CHEMICALS: Record<string, Chemical> = {
    'H2O': {
        id: 'H2O',
        name: 'Distilled Water',
        formula: 'H₂O',
        color: '#06b6d4', // Cyan-500 (More visible)
        type: 'liquid',
        ph: 7.0,
        density: 1.0,
        description: 'Universal solvent. Neutral pH.'
    },
    'SODIUM': {
        id: 'SODIUM',
        name: 'Sodium',
        formula: 'Na',
        color: '#d1d5db',
        type: 'solid',
        ph: 12.0,
        density: 2.0, // Solid range 1.5-5.0
        description: 'Soft, reactive metal.'
    },
    'CHLORINE': {
        id: 'CHLORINE',
        name: 'Chlorine Gas',
        formula: 'Cl₂',
        color: '#bef264',
        type: 'gas',
        ph: 4.0,
        density: 0.003,
        description: 'Toxic yellow-green gas.'
    },
    'SALT': {
        id: 'SALT',
        name: 'Sodium Chloride',
        formula: 'NaCl',
        color: '#ffffff',
        type: 'solid',
        ph: 7.0,
        density: 2.16, // Solid range 1.5-5.0
        description: 'Sodium Chloride solution.'
    },
    'HCl': {
        id: 'HCl',
        name: 'Hydrochloric Acid',
        formula: 'HCl',
        color: '#fef08a',
        type: 'liquid',
        ph: 1.0,
        density: 1.18, // Liquid range 0.8-1.5
        description: 'Strong acid.'
    },
    'NaOH': {
        id: 'NaOH',
        name: 'Sodium Hydroxide',
        formula: 'NaOH',
        color: '#e2e8f0',
        type: 'liquid',
        ph: 14.0,
        density: 1.5, // Liquid range 0.8-1.5
        description: 'Strong base.'
    },
    'VINEGAR': {
        id: 'VINEGAR',
        name: 'Vinegar',
        formula: 'CH₃COOH',
        color: '#ffffff',
        type: 'liquid',
        ph: 2.5,
        density: 1.05, // Liquid range 0.8-1.5
        description: 'Acetic acid.'
    },
    'BAKING_SODA': {
        id: 'BAKING_SODA',
        name: 'Baking Soda',
        formula: 'NaHCO₃',
        color: '#ffffff',
        type: 'solid',
        ph: 8.3,
        density: 2.2, // Solid range 1.5-5.0
        description: 'Sodium Bicarbonate.'
    },
    'BLEACH': {
        id: 'BLEACH',
        name: 'Bleach',
        formula: 'NaClO',
        color: '#fde047',
        type: 'liquid',
        ph: 12.5,
        density: 1.11, // Liquid range 0.8-1.5
        description: 'Sodium Hypochlorite.'
    },
    'INDICATOR': {
        id: 'INDICATOR',
        name: 'Universal Indicator',
        formula: 'pH Sensor',
        color: '#22c55e',
        type: 'liquid',
        ph: 7.0,
        density: 1.0, // Liquid range 0.8-1.5
        description: 'Changes color based on pH.'
    },
    'COPPER_SULFATE': {
        id: 'COPPER_SULFATE',
        name: 'Copper Sulfate',
        formula: 'CuSO₄',
        color: '#3b82f6',
        type: 'liquid',
        ph: 4.0,
        density: 1.2, // Liquid range 0.8-1.5
        description: 'Blue crystalline solution.'
    }
};
