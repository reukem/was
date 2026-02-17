import * as THREE from 'three';

// --- MATERIALS ---

export const createGlassMaterial = (quality: 'high' | 'low' = 'high') => {
    if (quality === 'high') {
        return new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.02, // Ultra smooth
            transmission: 0.98, // Slight opacity to catch light
            thickness: 2.0,  // Thicker for more refraction
            ior: 1.5,
            reflectivity: 0.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0,
            transparent: true,
            side: THREE.FrontSide,
            envMapIntensity: 3.0, // Strong reflections
            attenuationColor: 0xe0f2fe, // Slight blue tint
            attenuationDistance: 1.0,
            depthWrite: false, // Prevent z-fighting with liquid
        });
    } else {
        // Performance Mode: Standard transparent material (no transmission/refraction calculation)
        return new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.1,
            transparent: true,
            opacity: 0.3, // Simple alpha blending
            side: THREE.FrontSide,
            envMapIntensity: 1.0,
            depthWrite: false
        });
    }
};

export const createLiquidMaterial = (
    color: THREE.ColorRepresentation,
    activeReaction?: boolean,
    quality: 'high' | 'low' = 'high',
    attenuationDistance: number = 0.5
) => {
    const baseColor = new THREE.Color(color);
    const emissiveColor = baseColor.clone().multiplyScalar(activeReaction ? 0.8 : 0.2);

    if (quality === 'high') {
        // High-vis "Sci-Fi" Liquid with Glow & Refraction & Beer-Lambert Law (Attenuation)
        // Adjust attenuation color to be a darker/richer version of the base color
        const attColor = baseColor.clone().offsetHSL(0, 0.2, -0.2);

        return new THREE.MeshPhysicalMaterial({
            color: 0xffffff, // With attenuation, base color is white
            metalness: 0.1,
            roughness: 0.2,
            transmission: 0.95, // High transmission for volume rendering
            thickness: 1.5,
            ior: 1.333,
            transparent: true,
            emissive: emissiveColor,
            emissiveIntensity: activeReaction ? 1.5 : 0.1,
            side: THREE.DoubleSide,
            envMapIntensity: 1.0,
            attenuationColor: attColor,
            attenuationDistance: attenuationDistance // Dynamic based on liquid density/type
        });
    } else {
        // Performance Mode: Standard material
        return new THREE.MeshStandardMaterial({
            color: baseColor,
            metalness: 0.0,
            roughness: 0.3,
            transparent: true,
            opacity: 0.8,
            emissive: emissiveColor,
            emissiveIntensity: activeReaction ? 1.0 : 0.2,
            side: THREE.DoubleSide,
            envMapIntensity: 0.5
        });
    }
};

export const createMetalMaterial = (color: THREE.ColorRepresentation, roughness: number = 0.3) => {
    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.9, // High metalness
        roughness: roughness,
        envMapIntensity: 1.0
    });
};

// --- PROCEDURAL TEXTURES (Module 3) ---

export const createNoiseTexture = () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const imageData = ctx.createImageData(size, size);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const val = Math.floor(Math.random() * 255);
            imageData.data[i] = val;     // R
            imageData.data[i+1] = val;   // G
            imageData.data[i+2] = val;   // B
            imageData.data[i+3] = 255;   // A
        }
        ctx.putImageData(imageData, 0, 0);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
};

// --- GEOMETRY ---

export const createBeakerGeometry = (radius: number = 0.5, height: number = 1.2) => {
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(radius * 0.9, 0));
    points.push(new THREE.Vector2(radius, 0.05));
    points.push(new THREE.Vector2(radius, height));
    points.push(new THREE.Vector2(radius + 0.04, height)); // Rim
    points.push(new THREE.Vector2(radius + 0.04, height - 0.02)); // Inner rim
    points.push(new THREE.Vector2(radius - 0.02, height - 0.05)); // Inner wall start
    return new THREE.LatheGeometry(points, 64);
};

export const createMeniscusGeometry = (radius: number, height: number) => {
    // Module 2: Meniscus Curve
    // A solid cylinder but the top vertices curve up near the edge
    const points = [];
    // Bottom center
    points.push(new THREE.Vector2(0, 0));
    // Bottom edge
    points.push(new THREE.Vector2(radius, 0));
    // Side
    points.push(new THREE.Vector2(radius, height));
    // Meniscus Top Edge (curved up)
    points.push(new THREE.Vector2(radius, height + 0.05));
    // Meniscus Inner Curve (back down to height)
    points.push(new THREE.Vector2(radius * 0.9, height));
    // Center Top
    points.push(new THREE.Vector2(0, height));

    // Actually, Lathe makes a shell if not careful. We want a closed volume for liquid.
    // Simpler: Use a cylinder and displace vertices?
    // Or just points for Lathe that close the loop?
    // Lathe revolves around Y.
    // Points: (0,0) -> (R,0) -> (R, H_edge) -> (0, H_center) -> (0,0)

    const meniscusPoints = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(radius, 0),
        new THREE.Vector2(radius, height + 0.05), // Higher at edge
        new THREE.Vector2(0, height) // Lower at center
    ];

    return new THREE.LatheGeometry(meniscusPoints, 32);
};

export const createRoughChunkGeometry = (radius: number = 0.3) => {
    const geometry = new THREE.IcosahedronGeometry(radius, 2); // Higher detail
    const posAttribute = geometry.attributes.position;

    // Simple vertex displacement for "rock" look
    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        const z = posAttribute.getZ(i);

        // Random noise factor
        const scale = 1.0 + (Math.random() - 0.5) * 0.2;

        posAttribute.setXYZ(i, x * scale, y * scale, z * scale);
    }

    geometry.computeVertexNormals();
    return geometry;
};

export const createMoundGeometry = (radius: number = 0.3, height: number = 0.4) => {
    const points = [];
    for(let i=0; i<=20; i++) {
        const t = i/20;
        const x = radius * (1-t);
        const y = height * (1 - Math.cos(t * Math.PI / 2));
        points.push(new THREE.Vector2(x, y));
    }
    return new THREE.LatheGeometry(points, 32);
};

// --- ENVIRONMENT ---

export const createTable = () => {
    const group = new THREE.Group();

    // Table Top (Detailed)
    const topGeo = new THREE.BoxGeometry(14, 0.25, 8);
    const topMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Slate 900
        roughness: 0.7,
        metalness: 0.4,
        bumpScale: 0.02
    });
    const tableTop = new THREE.Mesh(topGeo, topMat);
    tableTop.receiveShadow = true;
    tableTop.castShadow = true;
    group.add(tableTop);

    // Legs (Modern industrial style)
    const legGeo = new THREE.CylinderGeometry(0.15, 0.1, 4, 16);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });

    const positions = [
        [-6, -2.1, -3],
        [6, -2.1, -3],
        [-6, -2.1, 3],
        [6, -2.1, 3]
    ];

    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(pos[0], pos[1], pos[2]);
        leg.castShadow = true;
        leg.receiveShadow = true;
        group.add(leg);
    });

    // Decorative Grid (Subtle sci-fi overlay)
    const grid = new THREE.GridHelper(14, 28, 0x38bdf8, 0x1e293b);
    grid.position.y = 0.13; // Slightly above surface to avoid z-fighting
    grid.scale.z = 8/14;
    const gridMat = grid.material as THREE.LineBasicMaterial;
    gridMat.opacity = 0.08; // Very subtle
    gridMat.transparent = true;
    gridMat.depthWrite = false; // Prevent z-fighting issues
    group.add(grid);

    return group;
};

export const createHeaterMesh = () => {
    const group = new THREE.Group();

    // Base - Modern dark metallic
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.25, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 })
    );
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Heating Element (Ceramic Plate)
    const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.05, 64),
        new THREE.MeshStandardMaterial({
            color: 0x222222,
            emissive: 0xff3300,
            emissiveIntensity: 0.0 // Starts off
        })
    );
    plate.position.y = 0.15;
    plate.name = "HeaterPlate"; // For easy access to material
    group.add(plate);

    // Controls / UI on Heater
    const knob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 })
    );
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0, 0, 0.61);
    group.add(knob);

    // Digital Display (Canvas Texture)
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 128, 64);
        ctx.font = 'bold 30px monospace';
        ctx.fillStyle = '#ff0000'; // Red LED
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('---', 64, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const display = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.2),
        new THREE.MeshBasicMaterial({ map: texture })
    );
    display.position.set(0.4, 0.13, 0.61);
    display.name = "HeaterDisplay";
    group.add(display);

    return group;
};

export const createBuretteGeometry = () => {
    // High-poly Burette
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.015, 0)); // Tip
    points.push(new THREE.Vector2(0.025, 0.2)); // Valve area
    points.push(new THREE.Vector2(0.05, 0.3)); // Tube start
    points.push(new THREE.Vector2(0.05, 3.0)); // Tube top
    points.push(new THREE.Vector2(0.06, 3.0)); // Wall thickness
    points.push(new THREE.Vector2(0.06, 0.3));
    return new THREE.LatheGeometry(points, 32);
};

export const createStandGeometry = () => {
    // Detailed Retort Stand
    const group = new THREE.Group();

    // Heavy Base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.15, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.3, roughness: 0.6 })
    );
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Chrome Rod
    const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 3.5, 16),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 })
    );
    rod.position.set(0, 1.75, -0.2);
    rod.castShadow = true;
    group.add(rod);

    // Clamp Mechanism
    const clampGroup = new THREE.Group();
    clampGroup.position.set(0, 2.2, -0.2);

    const clampBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    clampGroup.add(clampBody);

    const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
    );
    arm.rotation.z = Math.PI / 2;
    arm.position.x = 0.2;
    clampGroup.add(arm);

    // Jaws
    const jaw = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.01, 8, 24, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xef4444 }) // Rubber coating
    );
    jaw.rotation.y = Math.PI / 2;
    jaw.position.x = 0.4;
    clampGroup.add(jaw);

    group.add(clampGroup);

    return group;
};

export const createLabel = (text: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(0, 0, 256, 64, 16);
        else ctx.rect(0, 0, 256, 64);
        ctx.fill();

        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.3, 1);
    return sprite;
};
