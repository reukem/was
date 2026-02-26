import * as THREE from 'three';

export const createGlassMaterial = (quality: 'high' | 'low' = 'high') => {
    if (quality === 'low') {
        return new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.1,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
    }
    return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 1.0,
        ior: 1.52,
        thickness: 0.2,
        clearcoat: 1.0,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
};

export const createLiquidMaterial = (color: THREE.ColorRepresentation) => {
    return new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.0,
        roughness: 0.0,
        transmission: 0.9,
        thickness: 1.2,
        ior: 1.33,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        attenuationColor: new THREE.Color(color),
        attenuationDistance: 0.5,
    });
};

export const createBeakerGeometry = (radius: number = 0.5, height: number = 1.2) => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(radius, 0));
    points.push(new THREE.Vector2(radius, height));
    points.push(new THREE.Vector2(radius + 0.08, height + 0.03));
    points.push(new THREE.Vector2(radius + 0.08, height + 0.07));
    points.push(new THREE.Vector2(radius - 0.03, height + 0.07));
    return new THREE.LatheGeometry(points, 64);
};

export const createBuretteGeometry = () => {
    const points = [];
    points.push(new THREE.Vector2(0.02, 0)); // Tip
    points.push(new THREE.Vector2(0.05, 0.2));
    points.push(new THREE.Vector2(0.05, 1.5)); // Body
    points.push(new THREE.Vector2(0.07, 1.52)); // Rim
    return new THREE.LatheGeometry(points, 32);
};

export const createStandGeometry = () => {
    const group = new THREE.Group();
    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    group.add(base);
    // Rod
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0), new THREE.MeshStandardMaterial({ color: 0x888888 }));
    rod.position.y = 1.0;
    rod.position.x = -0.3;
    group.add(rod);
    // Clamp
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x888888 }));
    clamp.position.set(0, 1.8, 0);
    group.add(clamp);
    return group;
};

export const createRoughChunkGeometry = (radius: number = 0.3) => {
    return new THREE.IcosahedronGeometry(radius, 0); // Low detail for "rough" look
};

export const createMoundGeometry = () => {
    const geo = new THREE.ConeGeometry(0.4, 0.4, 32, 1, true);
    geo.translate(0, 0.2, 0);
    return geo;
};

export const createLabel = (text: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.clearRect(0,0, 256, 64);
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.font = 'bold 28px Inter, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1, 0.25, 1);
    return sprite;
};

export const createHeaterMesh = () => {
    const group = new THREE.Group();

    // 1. Base Unit
    const baseGeo = new THREE.BoxGeometry(1.2, 0.15, 1.2);
    const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Slate-800
        roughness: 0.4,
        metalness: 0.8
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // 2. Heating Plate (The part that glows)
    const plateGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 32);
    const plateMat = new THREE.MeshStandardMaterial({
        color: 0x334155, // Dark grey initially
        roughness: 0.6,
        metalness: 0.5,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0.1;
    plate.name = 'HeaterPlate'; // Added name for reference in LabLogic
    group.add(plate);

    // 3. UI/Knob Details
    const knobGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16);
    const knob = new THREE.Mesh(knobGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    knob.rotateX(Math.PI / 2);
    knob.position.set(0, 0, 0.6);
    group.add(knob);

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,128,64);
        ctx.fillStyle = '#f97316'; ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center'; ctx.fillText('HEAT', 64, 40);
    }
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }));
    label.position.set(0, 0.08, 0.61);
    group.add(label);

    return group;
};

export const createNoiseTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        for(let i=0; i<64; i++) {
            for(let j=0; j<64; j++) {
                const v = Math.random() * 255;
                ctx.fillStyle = `rgb(${v},${v},${v})`;
                ctx.fillRect(i,j,1,1);
            }
        }
    }
    return new THREE.CanvasTexture(canvas);
};
