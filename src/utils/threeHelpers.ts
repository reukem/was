import * as THREE from 'three';

// --- MATERIALS ---

export const createGlassMaterial = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.05,
        roughness: 0.05,
        transmission: 0.98, // High transmission for realism
        thickness: 0.5,     // Realistic thickness for refraction
        ior: 1.5,           // Glass IOR
        reflectivity: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0,
        transparent: true,
        side: THREE.FrontSide, // Often better for closed volumes in PBR
    });
};

export const createLiquidMaterial = (color: THREE.ColorRepresentation) => {
    // High-vis "Sci-Fi" Liquid
    return new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.4, // Semi-transparent
        thickness: 0.2,
        ior: 1.33,
        transparent: true,
        emissive: color,
        emissiveIntensity: 0.4, // Reduced slightly for realism
        side: THREE.DoubleSide
    });
};

export const createMetalMaterial = (color: THREE.ColorRepresentation, roughness: number = 0.2) => {
    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: 1.0,
        roughness: roughness,
        envMapIntensity: 1.0
    });
};

// --- GEOMETRY ---

export const createBeakerGeometry = (radius: number = 0.5, height: number = 1.2) => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(radius * 0.9, 0));
    points.push(new THREE.Vector2(radius, 0.05));
    points.push(new THREE.Vector2(radius, height));
    points.push(new THREE.Vector2(radius + 0.04, height));
    points.push(new THREE.Vector2(radius + 0.04, height - 0.02));
    return new THREE.LatheGeometry(points, 32);
};

export const createRoughChunkGeometry = (radius: number = 0.3) => {
    const geometry = new THREE.IcosahedronGeometry(radius, 1); // Detail 1 = ~80 faces
    const posAttribute = geometry.attributes.position;

    // Simple vertex displacement for "rock" look
    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        const z = posAttribute.getZ(i);

        // Random noise factor
        const scale = 1.0 + (Math.random() - 0.5) * 0.4; // +/- 20% variation

        posAttribute.setXYZ(i, x * scale, y * scale, z * scale);
    }

    geometry.computeVertexNormals();
    return geometry;
};

export const createMoundGeometry = (radius: number = 0.3, height: number = 0.4) => {
    // A cone-like mound for powders
    const geometry = new THREE.ConeGeometry(radius, height, 32, 4, true);
    // Open ended? No, we want a solid look, usually seated in a jar.
    // Let's use Lathe for a soft mound
    const points = [];
    for(let i=0; i<=10; i++) {
        const t = i/10;
        const x = radius * (1-t);
        const y = height * (1 - Math.cos(t * Math.PI / 2)); // Ease out
        points.push(new THREE.Vector2(x, y));
    }
    return new THREE.LatheGeometry(points, 32);
};

// --- ENVIRONMENT ---

export const createTable = () => {
    const group = new THREE.Group();

    // Table Base
    const geometry = new THREE.BoxGeometry(12, 0.2, 6);
    const material = new THREE.MeshStandardMaterial({
        color: 0x0f1623,
        roughness: 0.8,
        metalness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    group.add(mesh);

    // Sci-Fi Grid
    const grid = new THREE.GridHelper(12, 24, 0x38bdf8, 0x1e293b);
    grid.position.y = 0.11;
    grid.scale.z = 0.5;

    const gridMat = grid.material as THREE.LineBasicMaterial;
    gridMat.opacity = 0.15;
    gridMat.transparent = true;

    group.add(grid);

    return group;
};

export const createHeaterMesh = () => {
    const group = new THREE.Group();

    // Base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.2, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.5 })
    );
    group.add(base);

    // Heating Element (Plate)
    const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.05, 32),
        new THREE.MeshStandardMaterial({
            color: 0x333333,
            emissive: 0xff4400,
            emissiveIntensity: 0.2 // Glows when hot (static for now, logic could pulse it)
        })
    );
    plate.position.y = 0.12;
    group.add(plate);

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 128, 64);
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HOT PLATE', 64, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: texture }));
    label.position.set(0, 0.11, 0.51);
    group.add(label);

    return group;
};

export const createLabel = (text: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(0, 0, 256, 64, 12);
        } else {
             ctx.rect(0, 0, 256, 64);
        }
        ctx.fill();
        ctx.font = 'bold 32px Inter, Arial';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1, 0.25, 1);
    return sprite;
};
