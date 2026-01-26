export type ChemicalType = 'liquid' | 'solid' | 'gas';

export interface ReactionResult {
    productName: string;
    color: string;
    effect?: 'bubbles' | 'smoke' | 'fire' | 'explosion';
    temperature?: number; // In Celsius
    message: string;
}

export interface Chemical {
    id: string;
    name: string;
    formula: string;
    color: string;
    type: ChemicalType;
    ph: number;
    density: number;
    description: string;
}

export interface ContainerContents {
    chemicalId: string;
    volume: number; // 0 to 1
    color: string;
    temperature?: number;
}

export interface ContainerState {
    id: string;
    position: [number, number, number];
    initialPosition?: [number, number, number]; // Where it belongs on the shelf
    contents: ContainerContents | null;
}
