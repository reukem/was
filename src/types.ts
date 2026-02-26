// src/types.ts
export type ChemicalType = 'liquid' | 'solid' | 'gas';
export type MeshStyle = 'flask' | 'rock' | 'crystal' | 'mound' | 'canister';
export type ContainerType = 'beaker' | 'test_tube' | 'bottle' | 'jar' | 'rock' | 'burette';

export interface ReactionResult {
    productName: string;
    color: string;
    effect?: 'bubbles' | 'smoke' | 'fire' | 'explosion' | 'foam';
    temperature?: number; // In Celsius
    message: string;
}

export interface Chemical {
    id: string;
    name: string;
    formula: string;
    color: string;
    type: ChemicalType;
    meshStyle: MeshStyle;
    ph: number;
    description: string;
    thermalDecomposition?: {
        minTemperature: number;
        product: string;
        effect?: 'explosion' | 'smoke' | 'fire' | 'bubbles';
        message: string;
    };
}

export interface ActiveReaction {
    startTime: number;
    duration: number;
    startColor: string;
    targetColor: string;
    productId: string;
}

export interface ContainerContents {
    chemicalId: string;
    volume: number; // 0 to 1
    color: string;
    temperature?: number;
    activeReaction?: ActiveReaction | null;
}

export interface ContainerState {
    id: string;
    type: ContainerType;
    position: [number, number, number];
    initialPosition?: [number, number, number]; // Where it belongs on the shelf
    contents: ContainerContents | null;
    label?: string;
    isValveOpen?: boolean;
    isOnHeater?: boolean;
}

export interface ReactionEntry {
    reactants: [string, string];
    product: string;
    resultColor?: string;
    effect?: 'bubbles' | 'smoke' | 'fire' | 'explosion' | 'foam';
    temperature?: number;
    minTemp?: number; // Activation Energy (Celsius)
    message: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'model'; // 'model' for gemini compatibility
    text: string;
}
