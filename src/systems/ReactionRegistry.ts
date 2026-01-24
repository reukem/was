export interface ReactionEntry {
    reactants: [string, string]; // IDs of the two reactants
    product: string; // ID of the product
    resultColor?: string; // Optional override for visual color
    effect?: 'bubbles' | 'smoke' | 'fire' | 'explosion';
    message: string;
}

export const REACTION_REGISTRY: ReactionEntry[] = [
    // 1. Synthesis of Table Salt (Sodium + Chlorine)
    {
        reactants: ['SODIUM', 'CHLORINE'],
        product: 'SALT',
        resultColor: '#ffffff',
        effect: 'fire',
        message: 'Synthesis Reaction! Sodium (metal) reacts with Chlorine (gas) to create harmless Table Salt (NaCl). This releases a lot of heat!'
    },

    // 2. Sodium + Water (Explosive)
    {
        reactants: ['SODIUM', 'H2O'],
        product: 'NaOH', // Sodium Hydroxide solution
        resultColor: '#e2e8f0',
        effect: 'explosion',
        message: 'Exothermic Reaction! Sodium reacts violently with water to produce Hydrogen gas and Sodium Hydroxide. BOOM!'
    },

    // 3. Neutralization (HCl + NaOH)
    {
        reactants: ['HCl', 'NaOH'],
        product: 'H2O', // Technically Salt Water, but primarily Water visual
        resultColor: '#e0f2fe',
        message: 'Neutralization! Hydrochloric Acid and Sodium Hydroxide react to form Salt and Water.'
    },

    // 4. Baking Soda + Vinegar (Classic)
    {
        reactants: ['BAKING_SODA', 'VINEGAR'],
        product: 'H2O', // Plus CO2
        resultColor: '#ffffff',
        effect: 'bubbles',
        message: 'Acid-Base Reaction! Baking Soda (Base) reacts with Vinegar (Acid) to release Carbon Dioxide bubbles.'
    },

    // 5. Baking Soda + Lemon Juice
    {
        reactants: ['BAKING_SODA', 'LEMON_JUICE'],
        product: 'H2O',
        resultColor: '#ffffff',
        effect: 'bubbles',
        message: 'Fizzy! The Citric Acid in lemon juice reacts with the Baking Soda.'
    },

    // 6. Dangerous: Bleach + Vinegar
    {
        reactants: ['BLEACH', 'VINEGAR'],
        product: 'CHLORINE', // Gas
        resultColor: '#bef264',
        effect: 'smoke',
        message: 'DANGER: Mixing Bleach and Acid creates toxic Chlorine gas! Never do this!'
    },
    // 7. Dangerous: Bleach + Lemon Juice
    {
        reactants: ['BLEACH', 'LEMON_JUICE'],
        product: 'CHLORINE',
        resultColor: '#bef264',
        effect: 'smoke',
        message: 'DANGER: Mixing Bleach and Acid creates toxic Chlorine gas! Never do this!'
    },
    // 8. Dangerous: Bleach + HCl
    {
        reactants: ['BLEACH', 'HCl'],
        product: 'CHLORINE',
        resultColor: '#bef264',
        effect: 'smoke',
        message: 'EXTREME DANGER: Mixing Bleach and Strong Acid creates deadly Chlorine gas!'
    },

    // 9. Hydrogen + Oxygen (Rocket Fuel / Water synthesis)
    // Note: Usually needs a spark, but we simulate it on mix for fun/simplicity
    {
        reactants: ['HYDROGEN', 'OXYGEN'],
        product: 'H2O',
        resultColor: '#a5f3fc',
        effect: 'explosion',
        message: 'Combustion! Hydrogen burns in Oxygen to create pure Water. This is rocket science!'
    }
];
