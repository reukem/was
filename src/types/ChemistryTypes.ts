export type ChemicalType = 'liquid' | 'solid' | 'gas';

export interface ReactionResult {
    productName: string;
    color: string;
    effect?: 'bubbles' | 'smoke' | 'fire' | 'explosion';
    message: string;
}

export interface Chemical {
    id: string;
    name: string;
    formula: string;
    color: string; // Hex color
    type: ChemicalType;
    ph: number;
    description: string;
}

export interface ContainerState {
    id: string;
    position: [number, number, number];
    rotation: [number, number, number]; // Euler angles
    contents: {
        chemicalId: string;
        volume: number; // 0 to 1 (relative to beaker size)
        color: string; // Current visual color
    } | null;
}
