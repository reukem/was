import * as THREE from 'three';

export const createGlassMaterial = () => {
    return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.01,
        transmission: 0.99, // Extremely clear
        thickness: 0.1,    // Thinner glass for better visibility
        ior: 1.45,
        reflectivity: 0.5,
        transparent: true,
        side: THREE.FrontSide, // Front side only helps with transparency artifacts
        clearcoat: 1.0
    });
};

export const createLiquidMaterial = (color: THREE.ColorRepresentation) => {
    return new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.2, // Some light passes through, but mostly opaque to see color
        thickness: 0.5,
        ior: 1.33,
        transparent: true,
        opacity: 0.9,
        emissive: color,
        emissiveIntensity: 0.05 // Slight glow to make it stand out
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
    const geometry = new THREE.BoxGeometry(12, 0.2, 6);
    const material = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.8,
        metalness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
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
