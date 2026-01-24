import * as THREE from 'three';

export const createGlassMaterial = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.1,
        transmission: 0.95, // Glass-like transparency
        thickness: 0.5, // Refraction volume
        ior: 1.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transparent: true,
        side: THREE.DoubleSide
    });
};

export const createLiquidMaterial = (color: THREE.ColorRepresentation) => {
    return new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.0,
        roughness: 0.2,
        transmission: 0.5,
        thickness: 0.2,
        ior: 1.33,
        transparent: true
    });
};

export const createBeakerGeometry = (radius: number = 0.5, height: number = 1.2) => {
    const points = [];
    // Bottom
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(radius * 0.9, 0));
    // Corner
    points.push(new THREE.Vector2(radius, 0.1));
    // Side
    points.push(new THREE.Vector2(radius, height));
    // Rim
    points.push(new THREE.Vector2(radius + 0.05, height));
    points.push(new THREE.Vector2(radius + 0.05, height - 0.05));

    // Create the Lathe geometry
    const geometry = new THREE.LatheGeometry(points, 32);
    geometry.computeVertexNormals();
    return geometry;
};

export const createTable = () => {
    const geometry = new THREE.BoxGeometry(10, 0.2, 5);
    const material = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.5,
        metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
};

// --- Native Forms ---

export const createLemonMesh = () => {
    const geometry = new THREE.SphereGeometry(0.4, 32, 16);
    geometry.scale(1, 0.7, 0.7);
    const material = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
};

export const createBoxMesh = (color: THREE.ColorRepresentation) => {
    const geometry = new THREE.BoxGeometry(0.6, 0.8, 0.3);
    const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
};

export const createRockMesh = (color: THREE.ColorRepresentation, glow: boolean = false) => {
    const geometry = new THREE.DodecahedronGeometry(0.3, 0);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.9,
        emissive: glow ? color : 0x000000,
        emissiveIntensity: glow ? 0.5 : 0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
};

export const createBottleMesh = (color: THREE.ColorRepresentation) => {
    const group = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.6, 32);
    bodyGeo.translate(0, 0.3, 0);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: 0.9 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);
    const neckGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 32);
    neckGeo.translate(0, 0.6 + 0.15, 0);
    const neckMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const neck = new THREE.Mesh(neckGeo, neckMat);
    neck.castShadow = true;
    group.add(neck);
    return group;
};

export const createSoapBottleMesh = (color: THREE.ColorRepresentation) => {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.2);
    bodyGeo.translate(0, 0.4, 0);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);
    const pumpGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2);
    pumpGeo.translate(0, 0.9, 0);
    const pump = new THREE.Mesh(pumpGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
    group.add(pump);
    return group;
};

// --- Tools ---

export const createTesterMesh = () => {
    const group = new THREE.Group();

    // Body (Yellow Rugged)
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.8, 0.25);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    // Screen
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0,0,128,64);
        ctx.fillStyle = '#22c55e'; // Green text
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('READY', 64, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const screenGeo = new THREE.PlaneGeometry(0.4, 0.3);
    screenGeo.translate(0, 0.15, 0.13); // Slightly protruding
    const screenMat = new THREE.MeshBasicMaterial({ map: texture });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    group.add(screen);

    // Sensor Probe
    const probeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3);
    probeGeo.translate(0, -0.55, 0);
    const probeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const probe = new THREE.Mesh(probeGeo, probeMat);
    group.add(probe);

    return { mesh: group, canvas, texture };
};
