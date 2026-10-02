import { ScannedObjectAsset, PlacedHouseObject, VoxelCell } from '../types/housesim';

export interface CVAnalysisResult {
  textureDataUrl: string;
  silhouetteProfile: number[];
  voxelGrid: VoxelCell[][];
  dominantColor: string;
  secondaryColor: string;
  suggestedShapeMode: 'lathe' | 'extrude' | 'voxel' | 'box';
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Extracts a 3D volumetric profile, segmented transparent texture, and voxel depth grid
 * from any camera frame or video frame canvas.
 */
export function analyzeFrameTo3DData(
  sourceCanvas: HTMLCanvasElement,
  bgThreshold: number = 38,
  cropMargin: number = 0.12
): CVAnalysisResult {
  const size = 192;
  const workCanvas = document.createElement('canvas');
  workCanvas.width = size;
  workCanvas.height = size;
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true })!;

  // Center-crop square region from sourceCanvas
  const minDim = Math.min(sourceCanvas.width, sourceCanvas.height);
  const cropSize = minDim * (1 - cropMargin * 2);
  const sx = (sourceCanvas.width - cropSize) / 2;
  const sy = (sourceCanvas.height - cropSize) / 2;

  ctx.drawImage(sourceCanvas, sx, sy, cropSize, cropSize, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Sample border perimeter pixels to estimate background color distribution
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let bgCount = 0;

  for (let i = 0; i < size; i += 2) {
    // Top & bottom edges
    const topIdx = i * 4;
    const botIdx = ((size - 1) * size + i) * 4;
    // Left & right edges
    const leftIdx = i * size * 4;
    const rightIdx = (i * size + (size - 1)) * 4;

    for (const idx of [topIdx, botIdx, leftIdx, rightIdx]) {
      if (data[idx + 3] > 20) {
        bgR += data[idx];
        bgG += data[idx + 1];
        bgB += data[idx + 2];
        bgCount++;
      }
    }
  }

  if (bgCount > 0) {
    bgR /= bgCount;
    bgG /= bgCount;
    bgB /= bgCount;
  }

  // Segment foreground pixels and accumulate color stats
  let fgR = 0;
  let fgG = 0;
  let fgB = 0;
  let fgCount = 0;
  let secR = 180;
  let secG = 140;
  let secB = 90;

  const mask = new Uint8Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 30) {
        mask[y * size + x] = 0;
        continue;
      }

      const colorDist = Math.sqrt(
        (r - bgR) * (r - bgR) + (g - bgG) * (g - bgG) + (b - bgB) * (b - bgB)
      );

      // Center radial bias helps preserve object core even if color is close to background
      const nx = (x / size - 0.5) * 2;
      const ny = (y / size - 0.5) * 2;
      const radialDist = Math.sqrt(nx * nx + ny * ny);
      const effectiveThreshold = bgThreshold * (0.65 + 0.55 * radialDist);

      if (colorDist > effectiveThreshold || radialDist < 0.36) {
        mask[y * size + x] = 1;
        fgR += r;
        fgG += g;
        fgB += b;
        fgCount++;
        if (fgCount % 7 === 0) {
          secR = r;
          secG = g;
          secB = b;
        }
      } else {
        mask[y * size + x] = 0;
        // Soften background alpha for clean 3D texture map
        data[idx + 3] = 0;
      }
    }
  }

  // If almost nothing was segmented (e.g. uniform frame), fallback to center subject circle
  if (fgCount < size * size * 0.06) {
    fgR = 0;
    fgG = 0;
    fgB = 0;
    fgCount = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = (x / size - 0.5) * 2;
        const ny = (y / size - 0.5) * 2;
        const idx = (y * size + x) * 4;
        if (nx * nx + ny * ny < 0.68) {
          mask[y * size + x] = 1;
          data[idx + 3] = 255;
          fgR += data[idx];
          fgG += data[idx + 1];
          fgB += data[idx + 2];
          fgCount++;
        } else {
          mask[y * size + x] = 0;
          data[idx + 3] = 0;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Compute 16-slice horizontal silhouette profile (from bottom to top for Three.js Lathe/Extrude)
  const slices = 16;
  const silhouetteProfile: number[] = [];
  let symmetryScore = 0;

  for (let s = 0; s < slices; s++) {
    // s=0 is bottom, s=15 is top
    const yStart = Math.floor(((slices - 1 - s) / slices) * size);
    const yEnd = Math.floor(((slices - s) / slices) * size);

    let minX = size;
    let maxX = 0;
    let activePixels = 0;

    for (let y = yStart; y < yEnd; y++) {
      for (let x = 0; x < size; x++) {
        if (mask[y * size + x]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          activePixels++;
        }
      }
    }

    if (activePixels > 4 && maxX > minX) {
      const widthNorm = Math.max(0.12, Math.min(1.0, (maxX - minX) / (size * 0.85)));
      silhouetteProfile.push(Number(widthNorm.toFixed(3)));
      const centerOffset = Math.abs((minX + maxX) / 2 - size / 2) / size;
      symmetryScore += 1 - centerOffset * 2;
    } else {
      silhouetteProfile.push(0.22);
    }
  }

  // Smooth the silhouette profile slightly to avoid jagged artifacts
  const smoothedProfile = silhouetteProfile.map((val, idx, arr) => {
    const prev = arr[Math.max(0, idx - 1)];
    const next = arr[Math.min(arr.length - 1, idx + 1)];
    return Number(((prev * 0.25 + val * 0.5 + next * 0.25)).toFixed(3));
  });

  // Compute 14x14 Voxel Depth-Relief Grid
  const gridDim = 14;
  const voxelGrid: VoxelCell[][] = [];
  for (let gy = 0; gy < gridDim; gy++) {
    const row: VoxelCell[] = [];
    for (let gx = 0; gx < gridDim; gx++) {
      const px = Math.floor(((gx + 0.5) / gridDim) * size);
      const py = Math.floor(((gy + 0.5) / gridDim) * size);
      const idx = (py * size + px) * 4;
      const isActive = mask[py * size + px] === 1;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Estimate 3D relief depth from luminance + distance to silhouette center
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const cx = (gx / (gridDim - 1) - 0.5) * 2;
      const cy = (gy / (gridDim - 1) - 0.5) * 2;
      const dome = Math.max(0.2, 1 - (cx * cx + cy * cy) * 0.65);
      const depth = Number(Math.max(0.18, Math.min(1.0, dome * 0.7 + lum * 0.3)).toFixed(2));

      row.push({
        r,
        g,
        b,
        depth,
        active: isActive,
      });
    }
    voxelGrid.push(row);
  }

  const avgR = fgCount > 0 ? fgR / fgCount : 210;
  const avgG = fgCount > 0 ? fgG / fgCount : 150;
  const avgB = fgCount > 0 ? fgB / fgCount : 95;

  const avgSymmetry = symmetryScore / slices;
  const suggestedShapeMode = avgSymmetry > 0.82 ? 'lathe' : 'extrude';

  return {
    textureDataUrl: workCanvas.toDataURL('image/png'),
    silhouetteProfile: smoothedProfile,
    voxelGrid,
    dominantColor: rgbToHex(avgR, avgG, avgB),
    secondaryColor: rgbToHex(secR, secG, secB),
    suggestedShapeMode,
  };
}

/**
 * Renders an animated frame of a 3D-like object on a turntable onto a canvas
 * so users can test Video Scanning even without a physical video file handy.
 */
export function renderDemoTurntableFrame(
  canvas: HTMLCanvasElement,
  progress0to1: number,
  presetType: 'botanical_vase' | 'retro_robot' | 'espresso_pot' = 'botanical_vase'
) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const angle = progress0to1 * Math.PI * 2;

  // Studio background
  const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, w * 0.65);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Turntable platter
  ctx.save();
  ctx.translate(w / 2, h * 0.82);
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.28, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // Turntable angle tick marks
  for (let i = 0; i < 12; i++) {
    const a = angle + (i * Math.PI) / 6;
    const tx = Math.cos(a) * w * 0.24;
    const ty = Math.sin(a) * h * 0.045;
    ctx.fillStyle = i === 0 ? '#f59e0b' : '#94a3b8';
    ctx.beginPath();
    ctx.arc(tx, ty, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (presetType === 'botanical_vase') {
    // Ribbed Terracotta & Emerald Ceramic Vase with rotating highlights
    ctx.save();
    ctx.translate(w / 2, h * 0.54);
    const vaseGrad = ctx.createLinearGradient(-w * 0.16, 0, w * 0.16, 0);
    const shift = (Math.sin(angle) + 1) * 0.2;
    vaseGrad.addColorStop(0, '#9a3412');
    vaseGrad.addColorStop(0.3 + shift, '#ea580c');
    vaseGrad.addColorStop(0.6 + shift * 0.5, '#fdba74');
    vaseGrad.addColorStop(1, '#7c2d12');

    ctx.fillStyle = vaseGrad;
    ctx.beginPath();
    ctx.moveTo(-w * 0.09, -h * 0.22);
    ctx.bezierCurveTo(-w * 0.06, -h * 0.12, -w * 0.21, h * 0.05, -w * 0.13, h * 0.25);
    ctx.lineTo(w * 0.13, h * 0.25);
    ctx.bezierCurveTo(w * 0.21, h * 0.05, w * 0.06, -h * 0.12, w * 0.09, -h * 0.22);
    ctx.closePath();
    ctx.fill();

    // Decorative painted geometric band that rotates around the vase
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-w * 0.145, h * 0.06);
    ctx.lineTo(w * 0.145, h * 0.06);
    ctx.stroke();

    for (let i = -2; i <= 2; i++) {
      const offset = Math.sin(angle + i * 0.7) * w * 0.11;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(offset, h * 0.01, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (presetType === 'retro_robot') {
    // Toy Retro Bot rotating
    ctx.save();
    ctx.translate(w / 2, h * 0.52);
    const bodyW = w * (0.24 + Math.abs(Math.cos(angle)) * 0.04);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-bodyW / 2, -h * 0.08, bodyW, h * 0.28);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-bodyW * 0.38, -h * 0.24, bodyW * 0.76, h * 0.15);

    // Eyes shift with rotation angle
    const eyeShift = Math.sin(angle) * (bodyW * 0.18);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(eyeShift - 12, -h * 0.17, 7, 0, Math.PI * 2);
    ctx.arc(eyeShift + 12, -h * 0.17, 7, 0, Math.PI * 2);
    ctx.fill();

    // Chest dial
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(eyeShift - 18, h * 0.01, 36, 24);
    ctx.restore();
  }
}

/**
 * Generates 4 realistic starter scanned 3D objects so the user has an immediate library
 * of scanned items placed around the house and ready to interact with.
 */
export function generateStarterScannedAssets(): ScannedObjectAsset[] {
  const makeCanvasTexture = (drawFn: (ctx: CanvasRenderingContext2D, s: number) => void) => {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    const ctx = c.getContext('2d')!;
    drawFn(ctx, 160);
    return c.toDataURL('image/png');
  };

  // 1. Artisan Ceramic Pour-Over Coffee Carafe
  const mugTex = makeCanvasTexture((ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#d97706');
    g.addColorStop(0.5, '#f59e0b');
    g.addColorStop(1, '#78350f');
    ctx.fillStyle = g;
    ctx.fillRect(20, 16, s - 40, s - 32);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(20, s * 0.55, s - 40, 18);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, s * 0.68, s - 40, 8);
  });

  // 2. Vintage Instant Camera
  const cameraTex = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(16, 24, s - 32, s - 48);
    // Rainbow stripe
    const colors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6'];
    colors.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(s * 0.46, 30 + idx * 6, 16, 6);
    });
    // Camera lens
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.54, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(s * 0.46, s * 0.5, 9, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Sculpted Amber Glass Table Lamp
  const lampTex = makeCanvasTexture((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s * 0.35, 10, s / 2, s / 2, s * 0.5);
    g.addColorStop(0, '#fef08a');
    g.addColorStop(0.5, '#f59e0b');
    g.addColorStop(1, '#92400e');
    ctx.fillStyle = g;
    ctx.fillRect(18, 12, s - 36, s - 24);
  });

  // 4. Vinyl Chime Synth Speaker Cube
  const synthTex = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(12, 12, s - 24, s - 24);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, s - 40, s - 40);
    // Speaker grille circles
    ctx.fillStyle = '#06b6d4';
    for (let y = 42; y <= 118; y += 19) {
      for (let x = 42; x <= 118; x += 19) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  return [
    {
      id: 'scan-preset-carafe',
      name: 'Kyoto Ceramic Carafe',
      category: 'Kitchenware',
      sourceType: 'preset',
      scannedAt: 'Scanned via Chromebook Cam',
      textureDataUrl: mugTex,
      silhouetteProfile: [
        0.58, 0.64, 0.72, 0.78, 0.82, 0.79, 0.71, 0.58, 0.46, 0.38, 0.36, 0.42,
        0.48, 0.52, 0.55, 0.52,
      ],
      dominantColor: '#d97706',
      secondaryColor: '#fef3c7',
      shapeMode: 'lathe',
      dimensions: { width: 0.28, height: 0.38, depth: 0.28 },
      roughness: 0.22,
      metalness: 0.1,
      interactionBehavior: 'spin_animate',
      interactionNote: 'Hand-thrown stoneware pour-over carafe scanned at 16 rotational slices.',
    },
    {
      id: 'scan-preset-camera',
      name: 'Polaroid Land Camera',
      category: 'Collectible',
      sourceType: 'preset',
      scannedAt: 'Scanned via Video Orbit',
      textureDataUrl: cameraTex,
      silhouetteProfile: [
        0.85, 0.88, 0.9, 0.9, 0.88, 0.86, 0.82, 0.78, 0.75, 0.72, 0.68, 0.64,
        0.58, 0.52, 0.44, 0.35,
      ],
      dominantColor: '#f8fafc',
      secondaryColor: '#ef4444',
      shapeMode: 'extrude',
      dimensions: { width: 0.34, height: 0.32, depth: 0.26 },
      roughness: 0.35,
      metalness: 0.2,
      interactionBehavior: 'play_sound',
      interactionNote: 'Pressing E fires the vintage mechanical shutter & flash.',
    },
    {
      id: 'scan-preset-lamp',
      name: 'Murano Mushroom Lamp',
      category: 'Lighting',
      sourceType: 'preset',
      scannedAt: 'Scanned via Chromebook Cam',
      textureDataUrl: lampTex,
      silhouetteProfile: [
        0.42, 0.38, 0.35, 0.32, 0.3, 0.29, 0.31, 0.36, 0.52, 0.78, 0.92, 0.98,
        0.95, 0.84, 0.64, 0.32,
      ],
      dominantColor: '#f59e0b',
      secondaryColor: '#fef08a',
      shapeMode: 'lathe',
      dimensions: { width: 0.38, height: 0.46, depth: 0.38 },
      roughness: 0.18,
      metalness: 0.15,
      interactionBehavior: 'toggle_light',
      interactionNote: 'Emits warm 2700K point-light illumination across the room when toggled with E.',
    },
    {
      id: 'scan-preset-synth',
      name: 'Teenage Field Speaker',
      category: 'Electronics',
      sourceType: 'preset',
      scannedAt: 'Scanned via Video Orbit',
      textureDataUrl: synthTex,
      silhouetteProfile: [
        0.88, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9,
        0.9, 0.88,
      ],
      dominantColor: '#06b6d4',
      secondaryColor: '#1e293b',
      shapeMode: 'box',
      dimensions: { width: 0.32, height: 0.32, depth: 0.22 },
      roughness: 0.28,
      metalness: 0.45,
      interactionBehavior: 'play_sound',
      interactionNote: 'Plays an ambient arpeggio synth chord through Web Audio when triggered with E.',
    },
  ];
}

export function getInitialPlacedObjects(): PlacedHouseObject[] {
  return [
    {
      instanceId: 'placed-init-1',
      assetId: 'scan-preset-lamp',
      name: 'Murano Mushroom Lamp',
      room: 'Living Room',
      position: [-4.5, 0.52, 2.2],
      rotationY: 0.4,
      scale: 1.0,
      isActiveState: true,
      surfaceName: 'Coffee Table',
    },
    {
      instanceId: 'placed-init-2',
      assetId: 'scan-preset-carafe',
      name: 'Kyoto Ceramic Carafe',
      room: 'Kitchen & Dining',
      position: [2.5, 0.96, 1.5],
      rotationY: 0.0,
      scale: 1.0,
      isActiveState: false,
      surfaceName: 'Kitchen Island',
    },
    {
      instanceId: 'placed-init-3',
      assetId: 'scan-preset-camera',
      name: 'Polaroid Land Camera',
      room: 'Bedroom & Studio',
      position: [-6.8, 0.78, -5.8],
      rotationY: 0.6,
      scale: 1.0,
      isActiveState: false,
      surfaceName: 'Study Desk',
    },
    {
      instanceId: 'placed-init-4',
      assetId: 'scan-preset-synth',
      name: 'Teenage Field Speaker',
      room: 'Living Room',
      position: [-8.2, 0.94, 0.2],
      rotationY: 1.57,
      scale: 1.0,
      isActiveState: false,
      surfaceName: 'Bookshelf Tier 2',
    },
  ];
}
