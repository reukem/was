import { ReactionResult } from '../types';

export interface ReactionEntry {
    reactants: [string, string];
    product: string;
    resultColor?: string;
    effect?: 'bubbles' | 'smoke' | 'fire' | 'explosion';
    temperature?: number;
    message: string;
}

export const REACTION_REGISTRY: ReactionEntry[] = [
    {
        reactants: ['SODIUM', 'H2O'],
        product: 'NaOH',
        resultColor: '#f8fafc',
        effect: 'explosion',
        temperature: 550, // Massive heat spike
        message: 'DANGER! Sodium reacts violently with water to produce hydrogen gas and EXTREME HEAT (over 500°C)! BOOM! 💥🔥'
    },
    {
        reactants: ['BAKING_SODA', 'VINEGAR'],
        product: 'H2O',
        resultColor: '#ffffff',
        effect: 'bubbles',
        temperature: 15, // Endothermic reaction feels cold
        message: 'The classic volcano! Baking soda and vinegar create lots of carbon dioxide gas. 🌋'
    },
    {
        reactants: ['BLEACH', 'VINEGAR'],
        product: 'CHLORINE',
        resultColor: '#bef264',
        effect: 'smoke',
        temperature: 45,
        message: 'CAUTION! Mixing bleach and acid creates toxic chlorine gas. Never do this in real life! ⚠️'
    },
    {
        reactants: ['HCl', 'NaOH'],
        product: 'SALT',
        resultColor: '#ffffff',
        effect: 'smoke',
        temperature: 95, // Exothermic neutralization
        message: 'Neutralization! A strong acid and base react to form salt and water, releasing significant heat. 🧂♨️'
    },
    {
        reactants: ['SODIUM', 'CHLORINE'],
        product: 'SALT',
        resultColor: '#ffffff',
        effect: 'fire',
        temperature: 800,
        message: 'Synthesis! Reactive sodium and toxic chlorine unite to make simple table salt with an intense flash of heat.'
    }
];
