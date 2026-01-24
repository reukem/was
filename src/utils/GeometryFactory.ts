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
