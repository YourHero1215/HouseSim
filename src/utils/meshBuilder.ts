import * as THREE from 'three';
import { ScannedObjectAsset } from '../types/housesim';

const textureCache = new Map<string, THREE.Texture>();

export function getCachedTexture(dataUrl: string): THREE.Texture {
  if (textureCache.has(dataUrl)) {
    return textureCache.get(dataUrl)!;
  }
  const loader = new THREE.TextureLoader();
  const tex = loader.load(dataUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(dataUrl, tex);
  return tex;
}

/**
 * Builds a complete Three.js Group for a ScannedObjectAsset.
 * Origin (0,0,0) of the returned group sits cleanly at the bottom center of the object
 * so it can rest naturally on floors, tables, counters, and shelves.
 */
export function buildScannedObjectMesh(
  asset: ScannedObjectAsset,
  isActiveState: boolean = false,
  isSelected: boolean = false
): THREE.Group {
  const group = new THREE.Group();
  const { width, height, depth } = asset.dimensions;
  const tex = getCachedTexture(asset.textureDataUrl);

  const primaryColor = new THREE.Color(asset.dominantColor || '#f59e0b');
  const secondaryColor = new THREE.Color(asset.secondaryColor || '#cbd5e1');

  const isGlowing = asset.interactionBehavior === 'toggle_light' && isActiveState;

  const mainMat = new THREE.MeshStandardMaterial({
    map: tex,
    color: 0xffffff,
    roughness: asset.roughness ?? 0.35,
    metalness: asset.metalness ?? 0.15,
    emissive: isGlowing ? primaryColor : new THREE.Color(0x000000),
    emissiveIntensity: isGlowing ? 0.55 : 0,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: asset.roughness ?? 0.4,
    metalness: asset.metalness ?? 0.2,
    emissive: isGlowing ? primaryColor : new THREE.Color(0x000000),
    emissiveIntensity: isGlowing ? 0.35 : 0,
  });

  const profile =
    asset.silhouetteProfile && asset.silhouetteProfile.length > 2
      ? asset.silhouetteProfile
      : [0.6, 0.7, 0.8, 0.85, 0.8, 0.75, 0.7, 0.65];

  if (asset.shapeMode === 'lathe') {
    // Rotational 3D Lathe mesh from vertical silhouette profile
    const points: THREE.Vector2[] = [];
    // Bottom center cap
    points.push(new THREE.Vector2(0.001, 0));
    const maxR = Math.max(width, depth) * 0.5;
    profile.forEach((normW, idx) => {
      const t = idx / (profile.length - 1);
      const r = Math.max(0.025, normW * maxR);
      points.push(new THREE.Vector2(r, t * height));
    });
    // Top center cap
    points.push(new THREE.Vector2(0.001, height));

    const latheGeo = new THREE.LatheGeometry(points, 28);
    const mesh = new THREE.Mesh(latheGeo, mainMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  } else if (asset.shapeMode === 'extrude') {
    // Contoured 3D Silhouette Extrusion + Front/Back Textured Plates
    const shape = new THREE.Shape();
    const halfW = width * 0.5;
    const n = profile.length;

    // Right side bottom-to-top
    shape.moveTo(0, 0);
    for (let i = 0; i < n; i++) {
      const y = (i / (n - 1)) * height;
      const x = Math.max(0.03, profile[i] * halfW);
      shape.lineTo(x, y);
    }
    // Left side top-to-bottom
    for (let i = n - 1; i >= 0; i--) {
      const y = (i / (n - 1)) * height;
      const x = -Math.max(0.03, profile[i] * halfW);
      shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeDepth = Math.max(0.08, depth * 0.75);
    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: extrudeDepth,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.018,
      bevelThickness: 0.018,
    });
    extrudeGeo.translate(0, 0, -extrudeDepth * 0.5);

    const bodyMesh = new THREE.Mesh(extrudeGeo, accentMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Front and Back UV-mapped camera texture planes
    const planeGeo = new THREE.PlaneGeometry(width * 0.92, height * 0.92);
    const faceMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      roughness: asset.roughness ?? 0.35,
      metalness: asset.metalness ?? 0.15,
    });

    const frontFace = new THREE.Mesh(planeGeo, faceMat);
    frontFace.position.set(0, height * 0.5, extrudeDepth * 0.5 + 0.02);
    group.add(frontFace);

    const backFace = new THREE.Mesh(planeGeo, faceMat);
    backFace.position.set(0, height * 0.5, -extrudeDepth * 0.5 - 0.02);
    backFace.rotation.y = Math.PI;
    group.add(backFace);
  } else if (asset.shapeMode === 'voxel') {
    // 3D Depth-Relief Voxel Matrix
    const grid = asset.voxelGrid;
    const rows = grid ? grid.length : 10;
    const cols = grid && grid[0] ? grid[0].length : 10;
    const cellW = width / cols;
    const cellH = height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid?.[r]?.[c];
        if (cell && !cell.active) continue;

        const vDepth = cell ? Math.max(0.04, cell.depth * depth) : depth * 0.6;
        const boxGeo = new THREE.BoxGeometry(cellW * 0.94, cellH * 0.94, vDepth);
        const col = cell
          ? new THREE.Color(`rgb(${cell.r}, ${cell.g}, ${cell.b})`)
          : primaryColor;
        const vMat = new THREE.MeshStandardMaterial({
          color: col,
          roughness: asset.roughness ?? 0.35,
          metalness: asset.metalness ?? 0.15,
        });
        const vMesh = new THREE.Mesh(boxGeo, vMat);
        const x = (c - (cols - 1) / 2) * cellW;
        const y = (rows - 1 - r + 0.5) * cellH;
        vMesh.position.set(x, y, 0);
        vMesh.castShadow = true;
        vMesh.receiveShadow = true;
        group.add(vMesh);
      }
    }
  } else {
    // 'box': Multi-sided textured 3D prism with beveled pedestal
    const boxGeo = new THREE.BoxGeometry(width, height, depth);
    const sideMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      roughness: asset.roughness ?? 0.35,
      metalness: asset.metalness ?? 0.25,
    });
    const materials = [
      sideMat, // right
      sideMat, // left
      accentMat, // top
      sideMat, // bottom
      mainMat, // front (camera texture)
      mainMat, // back (camera texture)
    ];
    const boxMesh = new THREE.Mesh(boxGeo, materials);
    boxMesh.position.y = height * 0.5;
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    group.add(boxMesh);
  }

  // Subtle grounded contact pedestal ring when selected or active
  if (isSelected) {
    const ringGeo = new THREE.RingGeometry(
      Math.max(width, depth) * 0.55,
      Math.max(width, depth) * 0.68,
      32
    );
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.008;
    group.add(ring);
  }

  // If this scanned object is an active light source, attach a real PointLight
  if (isGlowing) {
    const light = new THREE.PointLight(primaryColor, 2.2, 4.5);
    light.position.set(0, height * 0.65, 0);
    group.add(light);
  }

  return group;
}
