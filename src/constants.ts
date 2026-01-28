import { Chemical, ReactionEntry } from './types';

export const HEATER_POSITION: [number, number, number] = [0, 0.11, 1.0]; // On table, slightly forward

export const CHEMICALS: Record<string, Chemical> = {
    // --- LIQUIDS ---
    'H2O': {
        id: 'H2O',
        name: 'Distilled Water',
        formula: 'H₂O',
        color: '#06b6d4',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 7.0,
        density: 1.0,
        description: 'Universal solvent.'
    },
    'HCl': {
        id: 'HCl',
        name: 'Hydrochloric Acid',
        formula: 'HCl',
        color: '#fef08a',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 1.0,
        density: 1.18,
        description: 'Strong mineral acid.'
    },
    'HNO3': {
        id: 'HNO3',
        name: 'Nitric Acid',
        formula: 'HNO₃',
        color: '#fde68a',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 1.0,
        density: 1.51,
        description: 'Highly corrosive mineral acid.'
    },
    'H2SO4': {
        id: 'H2SO4',
        name: 'Sulfuric Acid',
        formula: 'H₂SO₄',
        color: '#fcd34d',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 0.5,
        density: 1.83,
        description: 'Strong dehydrating acid.'
    },
    'H3PO4': {
        id: 'H3PO4',
        name: 'Phosphoric Acid',
        formula: 'H₃PO₄',
        color: '#fbbf24',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 1.5,
        density: 1.88,
        description: 'Weak mineral acid.'
    },
    'NaOH': {
        id: 'NaOH',
        name: 'Sodium Hydroxide',
        formula: 'NaOH',
        color: '#e2e8f0',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 14.0,
        density: 1.5,
        description: 'Caustic base.'
    },
    'NH3': {
        id: 'NH3',
        name: 'Ammonia',
        formula: 'NH₃',
        color: '#bae6fd',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 11.5,
        density: 0.73,
        description: 'Pungent weak base.'
    },
    'VINEGAR': {
        id: 'VINEGAR',
        name: 'Acetic Acid',
        formula: 'CH₃COOH',
        color: '#f8fafc',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 2.5,
        density: 1.05,
        description: 'Weak organic acid.'
    },
    'BLEACH': {
        id: 'BLEACH',
        name: 'Sodium Hypochlorite',
        formula: 'NaClO',
        color: '#fde047',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 12.5,
        density: 1.11,
        description: 'Strong oxidizer.'
    },
    'H2O2': {
        id: 'H2O2',
        name: 'Hydrogen Peroxide',
        formula: 'H₂O₂',
        color: '#e0f2fe',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 4.5,
        density: 1.45,
        description: 'Strong oxidizer.'
    },
    'AgNO3': {
        id: 'AgNO3',
        name: 'Silver Nitrate',
        formula: 'AgNO₃',
        color: '#94a3b8',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 6.0,
        density: 4.35,
        description: 'Photosensitive compound.'
    },

    // --- SOLIDS ---
    'SODIUM': {
        id: 'SODIUM',
        name: 'Sodium',
        formula: 'Na',
        color: '#e5e7eb', // White/Grey
        type: 'solid',
        meshStyle: 'rock',
        ph: 12.0,
        density: 0.97,
        description: 'Soft, reactive alkali metal.'
    },
    'POTASSIUM': {
        id: 'POTASSIUM',
        name: 'Potassium',
        formula: 'K',
        color: '#94a3b8',
        type: 'solid',
        meshStyle: 'rock',
        ph: 13.0,
        density: 0.86,
        description: 'Highly reactive metal.'
    },
    'MAGNESIUM': {
        id: 'MAGNESIUM',
        name: 'Magnesium',
        formula: 'Mg',
        color: '#e2e8f0',
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 1.74,
        description: 'Lightweight alkaline earth metal.'
    },
    'CALCIUM_CARBONATE': {
        id: 'CALCIUM_CARBONATE',
        name: 'Calcium Carbonate',
        formula: 'CaCO₃',
        color: '#f5f5f4',
        type: 'solid',
        meshStyle: 'mound',
        ph: 9.0,
        density: 2.71,
        description: 'Chalk/Limestone.'
    },
    'SALT': {
        id: 'SALT',
        name: 'Sodium Chloride',
        formula: 'NaCl',
        color: '#ffffff',
        type: 'solid',
        meshStyle: 'crystal',
        ph: 7.0,
        density: 2.16,
        description: 'Common salt.'
    },
    'BAKING_SODA': {
        id: 'BAKING_SODA',
        name: 'Sodium Bicarbonate',
        formula: 'NaHCO₃',
        color: '#ffffff',
        type: 'solid',
        meshStyle: 'mound',
        ph: 8.3,
        density: 2.2,
        description: 'Baking soda.'
    },
    'COPPER': {
        id: 'COPPER',
        name: 'Copper',
        formula: 'Cu',
        color: '#b45309',
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 8.96,
        description: 'Reddish-orange metal.'
    },
    'IRON': {
        id: 'IRON',
        name: 'Iron',
        formula: 'Fe',
        color: '#57534e',
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 7.87,
        description: 'Ferromagnetic metal.'
    },
    'ZINC': {
        id: 'ZINC',
        name: 'Zinc',
        formula: 'Zn',
        color: '#a1a1aa',
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 7.14,
        description: 'Bluish-white metal.'
    },
    'ALUMINUM': {
        id: 'ALUMINUM',
        name: 'Aluminum',
        formula: 'Al',
        color: '#d1d5db',
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 2.70,
        description: 'Silvery-white lightweight metal.'
    },
    'Fe2O3': {
        id: 'Fe2O3',
        name: 'Iron(III) Oxide',
        formula: 'Fe₂O₃',
        color: '#7f1d1d',
        type: 'solid',
        meshStyle: 'mound',
        ph: 7.0,
        density: 5.24,
        description: 'Rust / Hematite.'
    },
    'KI': {
        id: 'KI',
        name: 'Potassium Iodide',
        formula: 'KI',
        color: '#ffffff',
        type: 'solid',
        meshStyle: 'mound',
        ph: 7.0,
        density: 3.12,
        description: 'Iodine salt catalyst.'
    },
    'IODINE': {
        id: 'IODINE',
        name: 'Iodine',
        formula: 'I₂',
        color: '#4c1d95',
        type: 'solid',
        meshStyle: 'crystal',
        ph: 5.5,
        density: 4.93,
        description: 'Lustrous purple-black nonmetal.'
    },
    'KMnO4': {
        id: 'KMnO4',
        name: 'Potassium Permanganate',
        formula: 'KMnO₄',
        color: '#701a75',
        type: 'solid',
        meshStyle: 'crystal',
        ph: 7.0,
        density: 2.70,
        description: 'Strong oxidizer (purple crystals).'
    },
    'GOLD': {
        id: 'GOLD',
        name: 'Gold',
        formula: 'Au',
        color: '#fbbf24', // Golden yellow
        type: 'solid',
        meshStyle: 'rock',
        ph: 7.0,
        density: 19.3,
        description: 'Noble metal.'
    },

    // --- GASES/OTHERS ---
    'CHLORINE': {
        id: 'CHLORINE',
        name: 'Chlorine Gas',
        formula: 'Cl₂',
        color: '#bef264',
        type: 'gas',
        meshStyle: 'canister',
        ph: 4.0,
        density: 0.003,
        description: 'Toxic gas.'
    },
    'COPPER_SULFATE': {
        id: 'COPPER_SULFATE',
        name: 'Copper(II) Sulfate',
        formula: 'CuSO₄',
        color: '#3b82f6',
        type: 'solid',
        meshStyle: 'crystal',
        ph: 4.0,
        density: 3.6,
        description: 'Blue crystals.'
    },
    'MOLTEN_IRON': {
        id: 'MOLTEN_IRON',
        name: 'Molten Iron',
        formula: 'Fe(l)',
        color: '#f59e0b',
        type: 'liquid',
        meshStyle: 'flask',
        ph: 7.0,
        density: 6.98,
        description: 'Superheated liquid iron.'
    }
};

export const REACTION_REGISTRY: ReactionEntry[] = [
    {
        reactants: ['SODIUM', 'H2O'],
        product: 'NaOH',
        resultColor: '#f8fafc',
        effect: 'explosion',
        temperature: 550,
        message: 'Exothermic Reaction. 2Na + 2H₂O → 2NaOH + H₂. Rapid hydrogen expansion caused a thermal explosion.'
    },
    {
        reactants: ['POTASSIUM', 'H2O'],
        product: 'NaOH',
        resultColor: '#d8b4fe',
        effect: 'explosion',
        temperature: 700,
        message: 'Violent Reaction! 2K + 2H₂O → 2KOH + H₂. Potassium burns with a characteristic lilac flame before exploding.'
    },
    {
        reactants: ['MAGNESIUM', 'HCl'],
        product: 'H2O',
        resultColor: '#e2e8f0',
        effect: 'bubbles',
        temperature: 60,
        message: 'Single Displacement. Mg + 2HCl → MgCl₂ + H₂. Rapid evolution of Hydrogen gas bubbles.'
    },
    {
        reactants: ['COPPER', 'HNO3'],
        product: 'COPPER_SULFATE',
        resultColor: '#1e3a8a',
        effect: 'smoke',
        temperature: 80,
        message: 'Redox Reaction. Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂ + 2H₂O. Production of toxic brown Nitrogen Dioxide gas.'
    },
    {
        reactants: ['CALCIUM_CARBONATE', 'VINEGAR'],
        product: 'H2O',
        resultColor: '#f1f5f9',
        effect: 'bubbles',
        temperature: 20,
        message: 'Acid-Carbonate Reaction. CaCO₃ + 2CH₃COOH → Ca(CH₃COO)₂ + H₂O + CO₂. Effervescence of Carbon Dioxide.'
    },
    {
        reactants: ['CALCIUM_CARBONATE', 'HCl'],
        product: 'H2O',
        resultColor: '#e2e8f0',
        effect: 'foam',
        temperature: 30,
        message: 'Vigorous Decomposition. CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂. Rapid fizzing.'
    },
    {
        reactants: ['BAKING_SODA', 'VINEGAR'],
        product: 'H2O',
        resultColor: '#ffffff',
        effect: 'bubbles',
        temperature: 15,
        message: 'Acid-Base Neutralization. NaHCO₃ + CH₃COOH → CO₂ + H₂O + NaCH₃COO. CO₂ release.'
    },
    {
        reactants: ['BLEACH', 'VINEGAR'],
        product: 'CHLORINE',
        resultColor: '#bef264',
        effect: 'smoke',
        temperature: 45,
        message: 'HAZARD WARNING: 2H⁺ + OCl⁻ + Cl⁻ → Cl₂ + H₂O. Generation of toxic Chlorine gas detected.'
    },
    {
        reactants: ['HCl', 'NaOH'],
        product: 'SALT',
        resultColor: '#ffffff',
        effect: 'smoke',
        temperature: 95,
        message: 'Neutralization. HCl + NaOH → NaCl + H₂O. Formation of saline solution with significant heat release.'
    },
    {
        reactants: ['SODIUM', 'CHLORINE'],
        product: 'SALT',
        resultColor: '#ffffff',
        effect: 'fire',
        temperature: 800,
        message: 'Synthesis. 2Na + Cl₂ → 2NaCl. Redox reaction producing Sodium Chloride.'
    },
    {
        reactants: ['COPPER_SULFATE', 'NaOH'],
        product: 'H2O',
        resultColor: '#1e3a8a',
        effect: 'bubbles',
        temperature: 30,
        message: 'Precipitation. CuSO₄ + 2NaOH → Cu(OH)₂ + Na₂SO₄. Insoluble blue Copper(II) Hydroxide forms.'
    },
    {
        reactants: ['H2O2', 'KI'],
        product: 'H2O',
        resultColor: '#fef3c7',
        effect: 'foam',
        temperature: 90,
        message: 'Catalytic Decomposition. 2H₂O₂ → 2H₂O + O₂. "Elephant Toothpaste" reaction.'
    },
    {
        reactants: ['Fe2O3', 'ALUMINUM'],
        product: 'MOLTEN_IRON',
        resultColor: '#f59e0b',
        effect: 'explosion',
        temperature: 2500,
        minTemperature: 500, // Requires activation energy (heater)
        message: 'Thermite Reaction! Fe₂O₃ + 2Al → 2Fe + Al₂O₃. Extreme heat produces molten iron.'
    },
    {
        reactants: ['AgNO3', 'SALT'],
        product: 'H2O',
        resultColor: '#f8fafc',
        effect: 'smoke',
        temperature: 25,
        message: 'Precipitation. AgNO₃ + NaCl → AgCl(s) + NaNO₃. Formation of white Silver Chloride precipitate.'
    },
    {
        reactants: ['ZINC', 'HCl'],
        product: 'H2O',
        resultColor: '#e2e8f0',
        effect: 'bubbles',
        temperature: 40,
        message: 'Single Displacement. Zn + 2HCl → ZnCl₂ + H₂. Hydrogen gas evolution.'
    },
    {
        reactants: ['IRON', 'H2SO4'],
        product: 'H2O',
        resultColor: '#bef264',
        effect: 'bubbles',
        temperature: 50,
        message: 'Redox. Fe + H₂SO₄ → FeSO₄ + H₂. Formation of Ferrous Sulfate and Hydrogen.'
    },
    {
        reactants: ['NH3', 'HCl'],
        product: 'H2O',
        resultColor: '#f1f5f9',
        effect: 'smoke',
        temperature: 30,
        message: 'Gas Phase Reaction. NH₃ + HCl → NH₄Cl. Formation of white Ammonium Chloride smoke.'
    }
];
