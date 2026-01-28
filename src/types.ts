export type ChemicalType = 'liquid' | 'solid' | 'gas';
export type MeshStyle = 'flask' | 'rock' | 'crystal' | 'mound' | 'canister';
export type ContainerType = 'beaker' | 'test_tube' | 'bottle' | 'jar' | 'rock' | 'paper_wrap';

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
    meshStyle?: MeshStyle;
    ph: number;
    density: number;
    description: string;
}

export interface ContainerContents {
    chemicalId: string;
    volume: number; // 0 to 1
    color: string;
    temperature: number;
}

export interface ContainerState {
    id: string;
    type: ContainerType;
    position: [number, number, number];
    initialPosition?: [number, number, number]; // Where it belongs on the shelf
    contents: ContainerContents | null;
    label?: string;
}

export interface ReactionEntry {
    reactants: [string, string];
    product: string;
    resultColor?: string;
    effect?: 'bubbles' | 'smoke' | 'fire' | 'explosion' | 'foam';
    temperature?: number;
    minTemperature?: number; // Minimum temp required to trigger reaction
    message: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}
