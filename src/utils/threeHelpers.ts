import * as THREE from 'three';

export const createGlassMaterial = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.9, // Slightly less transmission so the glass shape is visible
        thickness: 0.1,
        ior: 1.5,
        reflectivity: 0.5,
        transparent: true,
        side: THREE.FrontSide,
        clearcoat: 1.0
    });
};

export const createLiquidMaterial = (color: THREE.ColorRepresentation) => {
    // Use MeshStandardMaterial with high opacity and emissive glow for robust visibility
    // This avoids nested transmission artifacts in Three.js
    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.0,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9, // Almost opaque to standout
        side: THREE.DoubleSide,
        emissive: color,
        emissiveIntensity: 0.6 // Very strong glow for "Sci-Fi Lab" visibility
    });
};

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

export const createTable = () => {
    const group = new THREE.Group();

    // Table Base
    const geometry = new THREE.BoxGeometry(12, 0.2, 6);
    const material = new THREE.MeshStandardMaterial({
        color: 0x0f1623, // Darker lab card color
        roughness: 0.8,
        metalness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    group.add(mesh);

    // Sci-Fi Grid
    const grid = new THREE.GridHelper(12, 24, 0x38bdf8, 0x1e293b);
    grid.position.y = 0.11;
    grid.scale.z = 0.5; // Scale to match table aspect ratio (12x6)

    const gridMat = grid.material as THREE.LineBasicMaterial;
    gridMat.opacity = 0.15;
    gridMat.transparent = true;

    group.add(grid);

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
        // Fallback for roundRect if not supported (though widely supported now)
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

export const createTesterMesh = () => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.8, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xfacc15 })
    );
    group.add(body);

    const probe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x475569 })
    );
    probe.position.y = -0.6;
    group.add(probe);

    // Screen
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 128, 64);
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#22c55e';
        ctx.textAlign = 'center';
        ctx.fillText('READY', 64, 40);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.2),
        new THREE.MeshBasicMaterial({ map: texture })
    );
    screen.position.set(0, 0.2, 0.11);
    group.add(screen);

    return { group, texture, canvas };
};
