import * as THREE from 'three';
import { CatalogItem, CarVehicle, PetItem } from '../types/housesim';

// Materials & Textures Cache for peak 60fps performance
const matCache = new Map<string, THREE.Material>();
const texCache = new Map<string, THREE.CanvasTexture>();

export function getStandardMat(
  colorHex: string,
  roughness: number = 0.45,
  metalness: number = 0.1,
  map?: THREE.Texture | null
): THREE.MeshStandardMaterial {
  const key = `${colorHex}_${roughness}_${metalness}_${map ? map.uuid : 'nomap'}`;
  if (matCache.has(key)) {
    return matCache.get(key) as THREE.MeshStandardMaterial;
  }
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness,
    metalness,
    map: map || null,
  });
  matCache.set(key, mat);
  return mat;
}

/**
 * Procedural TV Screen Canvas Texture
 * Renders an ultra-high resolution 1024x576 4K broadcast with live sports, stadium flares,
 * score bugs, tickers, HDR logos, or a sleek standby display.
 */
export function getTVTexture(isActive: boolean): THREE.CanvasTexture {
  const key = `tv_tex_${isActive ? 'active' : 'standby'}_hd`;
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d')!;

  if (isActive) {
    // 1. Dynamic Vibrant Sports Stadium Broadcast
    // Sky gradient at night stadium
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 320);
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(0.4, '#0b1329');
    skyGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1024, 320);

    // Stadium Floodlights in corners with beam flare
    const drawLightBeam = (x: number, angle: number) => {
      ctx.save();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.28)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + Math.sin(angle) * 350 - 140, 300);
      ctx.lineTo(x + Math.sin(angle) * 350 + 140, 300);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawLightBeam(80, 0.4);
    drawLightBeam(944, -0.4);

    // Stadium Crowd / Stands Silhouettes
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 220, 1024, 70);
    for (let x = 12; x < 1024; x += 18) {
      ctx.fillStyle = (x % 36 === 0) ? '#38bdf8' : (x % 54 === 0) ? '#f43f5e' : '#e0e7ff';
      ctx.fillRect(x, 230 + (x % 4) * 3, 10, 12);
    }

    // Lush Green Pitch / Turf with Realistic Stripes
    const turfGrad = ctx.createLinearGradient(0, 280, 0, 576);
    turfGrad.addColorStop(0, '#15803d');
    turfGrad.addColorStop(0.5, '#16a34a');
    turfGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = turfGrad;
    ctx.fillRect(0, 280, 1024, 296);

    // Alternating Mowed Grass Stripes
    ctx.fillStyle = 'rgba(22, 163, 74, 0.35)';
    for (let x = 0; x < 1024; x += 128) {
      ctx.fillRect(x, 280, 64, 296);
    }

    // Pitch White Lines & Center Circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 420);
    ctx.lineTo(1024, 420);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(512, 420, 85, 0, Math.PI * 2);
    ctx.stroke();

    // Center spot & ball
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(512, 420, 10, 0, Math.PI * 2);
    ctx.fill();

    // Soccer ball shadow & ball
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(560, 390, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(560, 375, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(558, 372, 5, 5);

    // TOP-LEFT: Glassmorphic Score Bug Overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(32, 28, 420, 72);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(32, 28, 420, 72);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('METRO FC', 50, 72);

    ctx.fillStyle = '#facc15';
    ctx.font = '900 30px monospace';
    ctx.fillText('2 - 1', 200, 74);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('RIVALS', 315, 72);

    // Live Badge & Clock
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(480, 48, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('LIVE 84:18', 496, 54);

    // TOP-RIGHT: 4K HDR & Station Bug
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(810, 28, 180, 50);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeRect(810, 28, 180, 50);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('METRO 4K HDR', 825, 61);

    // BOTTOM: News & Alert Ticker Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.fillRect(0, 516, 1024, 60);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 516, 120, 60);
    ctx.fillStyle = '#090d16';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('BREAKING', 14, 554);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '20px sans-serif';
    ctx.fillText('METRO CITY GRAND PRIX TODAY · GROCERY STOCKS FRESH ARABICA BEANS & OAT MILK · DOLBY VISION', 140, 554);
  } else {
    // Standby Ambient Screen
    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 576);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.5, '#040711');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 576);

    // Subtle center clock
    ctx.fillStyle = '#64748b';
    ctx.font = '300 72px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('12:45 PM', 512, 260);

    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('METRO VISION OLED 4K · AMBIENT STANDBY', 512, 315);
    ctx.fillText('☀️ 72°F Metro City · Press [E] on remote to Watch', 512, 355);

    // Red standby LED dot
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(512, 535, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'start';
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texCache.set(key, texture);
  return texture;
}

/**
 * Procedural Realistic Hardwood Plank Texture
 */
export function getWoodTexture(baseColorHex: string = '#78350f', darkColorHex: string = '#451a03'): THREE.CanvasTexture {
  const key = `wood_${baseColorHex}_${darkColorHex}_hd`;
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 512, 512);

  // Planks Seams
  ctx.strokeStyle = darkColorHex;
  ctx.lineWidth = 3.5;
  for (let x = 128; x < 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Realistic wood grain wave lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
  ctx.lineWidth = 1.6;
  for (let y = 8; y < 512; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      const offset = Math.sin((x / 512) * Math.PI * 3 + y) * 5;
      ctx.lineTo(x, y + offset);
    }
    ctx.stroke();
  }

  // Realistic wood knots
  for (let i = 0; i < 4; i++) {
    const kx = 60 + i * 115;
    const ky = 80 + (i % 2) * 220;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(kx, ky, 8, 16, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 18, 28, 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texCache.set(key, texture);
  return texture;
}

/**
 * Procedural Tactile Woven Fabric Texture for Sofas, Beds, and Cushions
 */
export function getFabricTexture(colorHex: string = '#0284c7'): THREE.CanvasTexture {
  const key = `fabric_${colorHex}_hd`;
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 512, 512);

  // Micro crosshatch weave
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 512; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Diamond cushion tufting seams
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 3;
  for (let i = -256; i < 768; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 512, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + 512, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texCache.set(key, texture);
  return texture;
}

/**
 * Procedural Natural Marble / Travertine Texture for Coffee Tables
 */
export function getMarbleTexture(): THREE.CanvasTexture {
  const key = 'marble_travertine_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm off-white travertine stone base
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  // Organic mineral veins
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let cx = i * 90;
    let cy = 0;
    ctx.moveTo(cx, cy);
    while (cy < 512) {
      cx += (Math.random() - 0.5) * 40;
      cy += 30 + Math.random() * 40;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Subtle gold vein streaks
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, 20);
  ctx.bezierCurveTo(150, 180, 320, 260, 480, 490);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texCache.set(key, texture);
  return texture;
}

/**
 * Procedural Espresso Machine Front Panel Texture
 */
export function getEspressoTexture(): THREE.CanvasTexture {
  const key = 'espresso_face_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Brushed steel gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#f1f5f9');
  grad.addColorStop(0.5, '#cbd5e1');
  grad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Top branding badge
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(80, 28, 352, 48);
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BARISTA PRO 3000', 256, 60);

  // Dual circular analog pressure gauges (Left: 9 BAR extraction, Right: 15 BAR steam)
  const drawGauge = (cx: number, cy: number, label: string) => {
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(cx, cy, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Ticks
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 50, cy + Math.sin(a) * 50);
      ctx.lineTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60);
      ctx.stroke();
    }

    // Needle
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 32, cy - 32);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(label, cx, cy + 34);
  };

  drawGauge(148, 180, '9 BAR');
  drawGauge(364, 180, '15 BAR');

  // Digital green temperature display
  ctx.fillStyle = '#022c22';
  ctx.fillRect(160, 276, 192, 48);
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 3;
  ctx.strokeRect(160, 276, 192, 48);
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('93.5°C OPT', 256, 309);

  // 3 Chrome Buttons
  for (let i = 0; i < 3; i++) {
    const bx = 130 + i * 126;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(bx, 380, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(bx, 380, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Drip tray slots
  ctx.fillStyle = '#334155';
  for (let y = 444; y < 496; y += 14) {
    ctx.fillRect(70, y, 372, 6);
  }

  ctx.textAlign = 'start';
  const texture = new THREE.CanvasTexture(canvas);
  texCache.set(key, texture);
  return texture;
}

/**
 * Procedural Smart Refrigerator Front Panel Texture
 */
export function getFridgeTexture(): THREE.CanvasTexture {
  const key = 'fridge_front_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Stainless steel background
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, '#cbd5e1');
  grad.addColorStop(0.5, '#f8fafc');
  grad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 1024);

  // Center vertical French door seam
  ctx.fillStyle = '#334155';
  ctx.fillRect(252, 0, 8, 680);

  // Horizontal bottom freezer seam
  ctx.fillRect(0, 680, 512, 10);

  // Smart LCD Screen on Right Door
  ctx.fillStyle = '#090d16';
  ctx.fillRect(288, 90, 192, 360);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.strokeRect(288, 90, 192, 360);

  // Smart hub UI
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('METRO SMART HUB', 296, 128);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 32px monospace';
  ctx.fillText('37°F', 296, 184);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('FREEZER: 0°F', 296, 224);

  ctx.fillStyle = '#34d399';
  ctx.fillRect(296, 252, 176, 36);
  ctx.fillStyle = '#022c22';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('☕ COFFEE READY', 304, 276);

  ctx.fillStyle = '#facc15';
  ctx.font = '18px sans-serif';
  ctx.fillText('🥛 MILK: STOCKED', 296, 336);
  ctx.fillText('🥩 STEAKS: FRESH', 296, 372);
  ctx.fillText('⚡ ENERGY: A+++', 296, 408);

  // Water / Ice Dispenser Alcove on Left Door
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(40, 220, 176, 260);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 220, 176, 260);

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(128, 270, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ICE & WATER', 128, 320);
  ctx.textAlign = 'start';

  const texture = new THREE.CanvasTexture(canvas);
  texCache.set(key, texture);
  return texture;
}

/**
 * Procedural IDE Screen Texture for Laptop & Gaming Desk
 */
export function getLaptopTexture(): THREE.CanvasTexture {
  const key = 'laptop_ide_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  // IDE Dark theme
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 320);

  // Window title bar & tabs
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 28);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(8, 6, 120, 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('housesim.ts', 20, 21);

  // Code lines with colorful syntax tokens
  const codeLines = [
    { num: '1', tokens: [{ t: 'import', c: '#f43f5e' }, { t: ' { ThreeEngine } ', c: '#e2e8f0' }, { t: 'from', c: '#f43f5e' }, { t: ' "three";', c: '#38bdf8' }] },
    { num: '2', tokens: [{ t: 'export const', c: '#a855f7' }, { t: ' houseWorld = ', c: '#e2e8f0' }, { t: 'new Engine();', c: '#34d399' }] },
    { num: '3', tokens: [{ t: '// Brew aromatic morning coffee', c: '#64748b' }] },
    { num: '4', tokens: [{ t: 'function', c: '#38bdf8' }, { t: ' brewEspresso(beans, filters) {', c: '#facc15' }] },
    { num: '5', tokens: [{ t: '  player.giveBonusCash(+$15);', c: '#34d399' }] },
    { num: '6', tokens: [{ t: '  player.speedBoost = 1.35;', c: '#fb923c' }] },
    { num: '7', tokens: [{ t: '  soundFX.playCoffeeBrew();', c: '#38bdf8' }] },
    { num: '8', tokens: [{ t: '}', c: '#facc15' }] },
    { num: '9', tokens: [{ t: 'camera.rotateWithKeys("IJKL");', c: '#e2e8f0' }] },
    { num: '10', tokens: [{ t: 'pets.spawnInLivingRoom();', c: '#34d399' }] },
  ];

  ctx.font = '12px monospace';
  codeLines.forEach((line, idx) => {
    const y = 54 + idx * 24;
    ctx.fillStyle = '#475569';
    ctx.fillText(line.num, 12, y);

    let curX = 42;
    line.tokens.forEach((tok) => {
      ctx.fillStyle = tok.c;
      ctx.fillText(tok.t, curX, y);
      curX += ctx.measureText(tok.t).width;
    });
  });

  // Mini-map on right side
  ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
  ctx.fillRect(450, 28, 62, 292);
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = (i % 3 === 0) ? '#38bdf8' : '#64748b';
    ctx.fillRect(456, 38 + i * 12, Math.random() * 45 + 10, 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texCache.set(key, texture);
  return texture;
}

/**
 * Procedural Contemporary Art Canvas Texture for Wall Art
 */
export function getPaintingTexture(): THREE.CanvasTexture {
  const key = 'art_canvas_painting_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  // Warm cream background
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(0, 0, 512, 320);

  // Modern abstract arch and sun shapes
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.arc(180, 160, 95, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.ellipse(320, 200, 110, 75, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(360, 110, 55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(100, 240, 312, 35);

  // Painter signature
  ctx.fillStyle = '#78350f';
  ctx.font = 'italic 14px serif';
  ctx.fillText('Golden Horizon · Atelier Metro', 280, 305);

  const texture = new THREE.CanvasTexture(canvas);
  texCache.set(key, texture);
  return texture;
}

/**
 * Procedural 3D Mesh Generator for all Catalog Items
 * Distinguishes between Floor items, Backyard items, and Wall-Only items with ultra-realistic geometry.
 */
export function buildItem3DModel(item: CatalogItem, isActive: boolean = false): THREE.Group {
  const group = new THREE.Group();
  const mainMat = getStandardMat(item.color, 0.4, 0.1);
  const secMat = getStandardMat(item.secondaryColor || '#cbd5e1', 0.5, 0.2);
  const darkMat = getStandardMat('#1e293b', 0.6, 0.2);
  const brassMat = getStandardMat('#d97706', 0.25, 0.8);
  const chromeMat = getStandardMat('#e2e8f0', 0.15, 0.9);

  const { width: w, height: h, depth: d } = item.dimensions;

  switch (item.modelStyle) {
    // --- WALL-ONLY ITEMS ---
    case 'wall_painting': {
      // Stepped ornate gold gallery frame + fine art canvas
      const frameGeo = new THREE.BoxGeometry(w, h, d);
      const frame = new THREE.Mesh(frameGeo, brassMat);
      frame.castShadow = true;
      group.add(frame);

      // White passe-partout matting border
      const matting = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.94, h * 0.9),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
      );
      matting.position.z = d * 0.5 + 0.002;
      group.add(matting);

      const canvasGeo = new THREE.PlaneGeometry(w * 0.86, h * 0.82);
      const canvasMat = new THREE.MeshStandardMaterial({
        map: getPaintingTexture(),
        roughness: 0.7,
      });
      const canvas = new THREE.Mesh(canvasGeo, canvasMat);
      canvas.position.z = d * 0.5 + 0.006;
      group.add(canvas);
      break;
    }

    case 'wall_neon': {
      // Glowing neon sign with emissive light
      const backing = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), darkMat);
      group.add(backing);

      const neonMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.color),
        emissive: new THREE.Color(item.color),
        emissiveIntensity: isActive ? 1.5 : 0.85,
        roughness: 0.2,
      });
      const neonBar1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.06, 0.04), neonMat);
      neonBar1.position.set(0, 0.12, d * 0.5 + 0.02);
      const neonBar2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.06, 0.04), neonMat);
      neonBar2.position.set(0, -0.12, d * 0.5 + 0.02);
      group.add(neonBar1, neonBar2);

      if (isActive) {
        const neonLight = new THREE.PointLight(new THREE.Color(item.color), 1.8, 4.0);
        neonLight.position.set(0, 0, 0.25);
        group.add(neonLight);
      }
      break;
    }

    case 'wall_tv': {
      // 75" Neo-QLED Ultra-Slim Smart TV
      // 1. Sleek Black Metallic Bezel Frame
      const bezelMat = getStandardMat('#0a0d14', 0.25, 0.85);
      const tvBody = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bezelMat);
      group.add(tvBody);

      // 2. High-Resolution Dynamic 4K TV Screen with Broadcast Graphics
      const tvTex = getTVTexture(isActive);
      const screenMat = new THREE.MeshStandardMaterial({
        map: tvTex,
        roughness: 0.1,
        metalness: 0.05,
        emissive: isActive ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
        emissiveMap: isActive ? tvTex : null,
        emissiveIntensity: isActive ? 0.8 : 0,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, h * 0.94), screenMat);
      screen.position.z = d * 0.5 + 0.005;
      group.add(screen);

      // 3. Integrated Ultra-Slim Soundbar underneath TV
      const soundbar = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.9, 0.08, d * 1.4),
        getStandardMat('#1e293b', 0.5, 0.3)
      );
      soundbar.position.set(0, -h * 0.5 - 0.05, d * 0.2);
      group.add(soundbar);

      // 4. Power Status LED indicator (Emerald Green when ON, Red when Standby)
      const ledMat = new THREE.MeshBasicMaterial({ color: isActive ? 0x10b981 : 0xef4444 });
      const statusLed = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), ledMat);
      statusLed.position.set(w * 0.45, -h * 0.47, d * 0.5 + 0.01);
      group.add(statusLed);

      // 5. Solid Wall-Mount Bracket behind TV
      const bracket = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.5, h * 0.5, 0.04),
        getStandardMat('#334155', 0.6, 0.4)
      );
      bracket.position.z = -d * 0.5 - 0.02;
      group.add(bracket);

      if (isActive) {
        // Ambilight effect reflecting on wall
        const tvGlow = new THREE.PointLight(0x38bdf8, 2.0, 5.0);
        tvGlow.position.set(0, 0, -0.15);
        group.add(tvGlow);

        const frontLight = new THREE.PointLight(0xbae6fd, 1.4, 4.0);
        frontLight.position.set(0, 0, 0.6);
        group.add(frontLight);
      }
      break;
    }

    case 'wall_clock': {
      // Round wooden clock with brass hands and ticking marks
      const clockBody = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.5, d, 24), secMat);
      clockBody.rotation.x = Math.PI / 2;
      group.add(clockBody);

      const face = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.46, w * 0.46, 0.005, 24),
        new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.5 })
      );
      face.rotation.x = Math.PI / 2;
      face.position.z = d * 0.5 + 0.002;
      group.add(face);

      const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, w * 0.35, 0.01), darkMat);
      hand1.position.set(0, w * 0.15, d * 0.5 + 0.01);
      const hand2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.24, 0.02, 0.01), darkMat);
      hand2.position.set(w * 0.1, 0, d * 0.5 + 0.01);
      group.add(hand1, hand2);
      break;
    }

    case 'wall_shelf': {
      // Floating wood shelf with wood texture
      const woodMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.color),
        map: getWoodTexture('#78350f', '#451a03'),
        roughness: 0.5,
      });
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
      shelf.castShadow = true;
      group.add(shelf);

      // Add miniature books on shelf
      const bookColors = [0xdc2626, 0x0284c7, 0x16a34a, 0xeab308];
      bookColors.forEach((bColor, idx) => {
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.22 + (idx % 2) * 0.04, d * 0.7),
          new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.6 })
        );
        book.position.set(-w * 0.35 + idx * 0.05, h * 0.5 + 0.12, 0);
        group.add(book);
      });
      break;
    }

    case 'wall_sconce': {
      // Up/Down atmospheric brass sconce
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.25, w * 0.25, h, 16), brassMat);
      group.add(tube);
      if (isActive) {
        const l1 = new THREE.PointLight(0xfef08a, 1.5, 3.5);
        l1.position.set(0, h * 0.45, d * 0.5);
        const l2 = new THREE.PointLight(0xfef08a, 1.5, 3.5);
        l2.position.set(0, -h * 0.45, d * 0.5);
        group.add(l1, l2);
      }
      break;
    }

    // --- HOME FURNITURE & LIVING ---
    case 'sofa': {
      // Textured Velvet / Fabric 3-Seater Sofa with Cushions, Throw Pillows, and Turned Wood Legs
      const fabricMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.color),
        map: getFabricTexture(item.color),
        roughness: 0.75,
      });
      const woodLegMat = getStandardMat('#78350f', 0.5, 0.1);

      // Seat base
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.45, d), fabricMat);
      seat.position.y = h * 0.25;
      seat.castShadow = true;
      group.add(seat);

      // 3 Individual Plump Seat Cushions
      const cushionW = (w * 0.88) / 3;
      for (let i = 0; i < 3; i++) {
        const cx = -w * 0.44 + cushionW * 0.5 + i * cushionW;
        const cMesh = new THREE.Mesh(new THREE.BoxGeometry(cushionW * 0.94, h * 0.22, d * 0.8), fabricMat);
        cMesh.position.set(cx, h * 0.46, d * 0.05);
        cMesh.castShadow = true;
        group.add(cMesh);
      }

      // Backrest
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.65, d * 0.25), fabricMat);
      back.position.set(0, h * 0.65, -d * 0.38);
      back.castShadow = true;
      group.add(back);

      // Armrests
      const armL = new THREE.Mesh(new THREE.BoxGeometry(w * 0.12, h * 0.52, d), fabricMat);
      armL.position.set(-w * 0.45, h * 0.46, 0);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(w * 0.12, h * 0.52, d), fabricMat);
      armR.position.set(w * 0.45, h * 0.46, 0);
      group.add(armL, armR);

      // 2 Contrasting Accent Throw Pillows
      const throwPillowMat = getStandardMat('#eab308', 0.7, 0.1);
      const tpL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.28), throwPillowMat);
      tpL.position.set(-w * 0.36, h * 0.58, 0);
      tpL.rotation.z = -0.25;
      const tpR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.28), throwPillowMat);
      tpR.position.set(w * 0.36, h * 0.58, 0);
      tpR.rotation.z = 0.25;
      group.add(tpL, tpR);

      // 4 Turned Wood Legs with Brass Ferrules
      const legGeo = new THREE.CylinderGeometry(0.04, 0.025, 0.2, 8);
      const ferruleGeo = new THREE.CylinderGeometry(0.028, 0.025, 0.05, 8);
      const legPositions = [
        [-w * 0.42, 0.1, -d * 0.35],
        [w * 0.42, 0.1, -d * 0.35],
        [-w * 0.42, 0.1, d * 0.35],
        [w * 0.42, 0.1, d * 0.35],
      ];
      legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeo, woodLegMat);
        leg.position.set(lx, ly, lz);
        const ferrule = new THREE.Mesh(ferruleGeo, brassMat);
        ferrule.position.set(lx, ly - 0.075, lz);
        group.add(leg, ferrule);
      });
      break;
    }

    case 'bed': {
      // Solid Oak Bed Frame + Textured Mattress + Plump Pillows + Folded Blanket
      const woodMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#475569'),
        map: getWoodTexture('#334155', '#1e293b'),
        roughness: 0.5,
      });
      const fabricMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.secondaryColor || '#f8fafc'),
        map: getFabricTexture('#f8fafc'),
        roughness: 0.8,
      });

      const base = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.35, d), woodMat);
      base.position.y = h * 0.18;
      base.castShadow = true;
      group.add(base);

      const mattress = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, h * 0.32, d * 0.92), fabricMat);
      mattress.position.set(0, h * 0.46, d * 0.02);
      mattress.castShadow = true;
      group.add(mattress);

      // Folded Throw Blanket at foot of bed
      const blanketMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0284c7'),
        map: getFabricTexture('#0284c7'),
        roughness: 0.7,
      });
      const blanket = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.06, d * 0.3), blanketMat);
      blanket.position.set(0, h * 0.63, d * 0.3);
      group.add(blanket);

      // Headboard with Wood Slat Texture
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.85, d * 0.12), woodMat);
      headboard.position.set(0, h * 0.58, -d * 0.44);
      headboard.castShadow = true;
      group.add(headboard);

      // Dual King Pillows
      const pillowMat = getStandardMat('#ffffff', 0.8, 0.02);
      const pillowL = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 0.14, d * 0.22), pillowMat);
      pillowL.position.set(-w * 0.23, h * 0.65, -d * 0.3);
      const pillowR = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 0.14, d * 0.22), pillowMat);
      pillowR.position.set(w * 0.23, h * 0.65, -d * 0.3);
      group.add(pillowL, pillowR);
      break;
    }

    case 'dining_table': {
      // Wood plank top with texture
      const woodMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.color),
        map: getWoodTexture(item.color, '#271202'),
        roughness: 0.45,
      });

      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), woodMat);
      top.position.y = h - 0.035;
      top.castShadow = true;
      group.add(top);

      const legH = h - 0.07;
      const legGeo = new THREE.BoxGeometry(0.07, legH, 0.07);
      const xOffsets = [-w * 0.45, w * 0.45];
      const zOffsets = [-d * 0.42, d * 0.42];
      for (const lx of xOffsets) {
        for (const lz of zOffsets) {
          const leg = new THREE.Mesh(legGeo, secMat);
          leg.position.set(lx, legH * 0.5, lz);
          leg.castShadow = true;
          group.add(leg);
        }
      }

      // Add 4 Sculpted Dining Chairs
      const chairMat = getStandardMat('#1e293b', 0.5, 0.1);
      const chairPositions = [
        [-w * 0.25, 0, -d * 0.65],
        [w * 0.25, 0, -d * 0.65],
        [-w * 0.25, 0, d * 0.65],
        [w * 0.25, 0, d * 0.65],
      ];
      chairPositions.forEach(([cx, cy, cz], idx) => {
        const chair = new THREE.Group();
        chair.position.set(cx, cy, cz);
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), woodMat);
        seat.position.y = 0.45;
        const seatPad = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.38), chairMat);
        seatPad.position.y = 0.48;
        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.04), chairMat);
        chairBack.position.set(0, 0.68, idx < 2 ? -0.19 : 0.19);
        chair.add(seat, seatPad, chairBack);

        for (const clx of [-0.17, 0.17]) {
          for (const clz of [-0.17, 0.17]) {
            const cleg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.45, 6), secMat);
            cleg.position.set(clx, 0.225, clz);
            chair.add(cleg);
          }
        }
        group.add(chair);
      });
      break;
    }

    case 'coffee_table': {
      // Natural Travertine / Marble Stone Surface with Hairpin Steel Legs
      const marbleMat = new THREE.MeshStandardMaterial({
        map: getMarbleTexture(),
        roughness: 0.25,
        metalness: 0.1,
      });

      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), marbleMat);
      top.position.y = h - 0.03;
      top.castShadow = true;
      group.add(top);

      // Matte Black Hairpin Legs
      const legH = h - 0.06;
      const legGeo = new THREE.CylinderGeometry(0.02, 0.015, legH, 8);
      for (const lx of [-w * 0.42, w * 0.42]) {
        for (const lz of [-d * 0.38, d * 0.38]) {
          const leg = new THREE.Mesh(legGeo, darkMat);
          leg.position.set(lx, legH * 0.5, lz);
          group.add(leg);
        }
      }

      // Hardcover Coffee Table Art Book on top
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.03, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
      );
      book.position.set(0.1, h + 0.015, -0.05);
      book.rotation.y = 0.2;
      group.add(book);
      break;
    }

    case 'desk': {
      // Workstation Desk with Walnut Surface and Full-Length Leather Desk Mat
      const woodMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.color),
        map: getWoodTexture('#78350f', '#271202'),
        roughness: 0.45,
      });

      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), woodMat);
      top.position.y = h - 0.035;
      top.castShadow = true;
      group.add(top);

      // Dark Leather Executive Desk Mat
      const matMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.75, d * 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 })
      );
      matMesh.rotation.x = -Math.PI / 2;
      matMesh.position.set(0, h + 0.003, 0);
      group.add(matMesh);

      const legH = h - 0.07;
      const legGeo = new THREE.BoxGeometry(0.07, legH, 0.07);
      for (const lx of [-w * 0.45, w * 0.45]) {
        for (const lz of [-d * 0.42, d * 0.42]) {
          const leg = new THREE.Mesh(legGeo, secMat);
          leg.position.set(lx, legH * 0.5, lz);
          leg.castShadow = true;
          group.add(leg);
        }
      }
      break;
    }

    case 'floor_lamp': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.45, 0.04, 16), brassMat);
      base.position.y = 0.02;
      group.add(base);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, h, 12), brassMat);
      pole.position.y = h * 0.5;
      group.add(pole);

      const shade = new THREE.Mesh(new THREE.ConeGeometry(w * 0.4, 0.35, 18, 1, true), mainMat);
      shade.position.y = h - 0.1;
      group.add(shade);

      if (isActive) {
        const lampLight = new THREE.PointLight(0xfef08a, 2.2, 7.0);
        lampLight.position.set(0, h - 0.2, 0);
        group.add(lampLight);
      }
      break;
    }

    case 'fridge': {
      // French Door Smart Refrigerator with Stainless Steel Sheen & Smart Touch Screen
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mainMat);
      body.position.y = h * 0.5;
      body.castShadow = true;
      group.add(body);

      // Front Face Panel with Smart Touchscreen Texture
      const frontMat = new THREE.MeshStandardMaterial({
        map: getFridgeTexture(),
        roughness: 0.35,
        metalness: 0.6,
      });
      const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, h * 0.98), frontMat);
      frontFace.position.set(0, h * 0.5, d * 0.5 + 0.005);
      group.add(frontFace);

      // Chrome Vertical Door Handles
      const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.035, h * 0.35, 0.04), chromeMat);
      handleL.position.set(-0.06, h * 0.55, d * 0.5 + 0.03);
      const handleR = new THREE.Mesh(new THREE.BoxGeometry(0.035, h * 0.35, 0.04), chromeMat);
      handleR.position.set(0.06, h * 0.55, d * 0.5 + 0.03);
      group.add(handleL, handleR);
      break;
    }

    case 'laptop': {
      // UltraBook with Backlit IDE Display Screen & Chiclet Keyboard
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, d * 0.7), darkMat);
      base.position.y = 0.008;
      group.add(base);

      const screenLid = new THREE.Mesh(new THREE.BoxGeometry(w, d * 0.65, 0.012), darkMat);
      screenLid.position.set(0, (d * 0.65) * 0.45, -d * 0.32);
      screenLid.rotation.x = -0.25;
      group.add(screenLid);

      const dispMat = new THREE.MeshStandardMaterial({
        map: getLaptopTexture(),
        roughness: 0.2,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: getLaptopTexture(),
        emissiveIntensity: 0.8,
      });
      const disp = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, d * 0.58), dispMat);
      disp.position.set(0, (d * 0.65) * 0.45, -d * 0.32 + 0.01);
      disp.rotation.x = -0.25;
      group.add(disp);
      break;
    }

    case 'espresso': {
      // Italian Espresso Machine with Pressure Gauges, Group Head, Portafilter, & Crema Cup
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mainMat);
      body.position.y = h * 0.5;
      body.castShadow = true;
      group.add(body);

      // Front Face Panel with Pressure Dials & Buttons
      const frontMat = new THREE.MeshStandardMaterial({
        map: getEspressoTexture(),
        roughness: 0.3,
        metalness: 0.7,
      });
      const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.95, h * 0.9), frontMat);
      frontFace.position.set(0, h * 0.5, d * 0.5 + 0.005);
      group.add(frontFace);

      // Chrome Group Head & Portafilter with Handle
      const groupHead = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 16), chromeMat);
      groupHead.position.set(0, h * 0.38, d * 0.5 + 0.05);
      const portafilterHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), darkMat);
      portafilterHandle.rotation.x = Math.PI / 2;
      portafilterHandle.position.set(0, h * 0.38, d * 0.5 + 0.12);
      group.add(groupHead, portafilterHandle);

      // Espresso Cup with Golden Crema Coffee
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.07, 12), secMat);
      cup.position.set(0, 0.06, d * 0.42);
      const crema = new THREE.Mesh(
        new THREE.CircleGeometry(0.04, 12),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.3 })
      );
      crema.rotation.x = -Math.PI / 2;
      crema.position.set(0, 0.096, d * 0.42);
      group.add(cup, crema);
      break;
    }

    case 'plant': {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.35, w * 0.25, h * 0.45, 16), secMat);
      pot.position.y = h * 0.225;
      pot.castShadow = true;
      group.add(pot);

      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(w * 0.25, 8, 8), mainMat);
        const a = (i * Math.PI * 2) / 5;
        leaf.position.set(Math.cos(a) * w * 0.2, h * 0.6 + (i % 2) * 0.1, Math.sin(a) * w * 0.2);
        leaf.scale.set(1.2, 0.3, 1.0);
        leaf.castShadow = true;
        group.add(leaf);
      }
      break;
    }

    // --- BACKYARD & OUTDOOR ITEMS ---
    case 'pool': {
      // Inground Pool with water plane
      const rim = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), secMat);
      rim.position.y = h * 0.5;
      rim.castShadow = true;
      group.add(rim);

      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.85,
      });
      const water = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.88, d * 0.88), waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.y = h * 0.85;
      group.add(water);
      break;
    }

    case 'bbq': {
      const cart = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.5, d), darkMat);
      cart.position.y = h * 0.25;
      cart.castShadow = true;
      group.add(cart);

      const hood = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.4, d * 0.4, w * 0.75, 16), mainMat);
      hood.rotation.z = Math.PI / 2;
      hood.position.set(0, h * 0.65, 0);
      hood.castShadow = true;
      group.add(hood);

      const grillGrate = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.7, d * 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })
      );
      grillGrate.rotation.x = -Math.PI / 2;
      grillGrate.position.set(0, h * 0.52, 0);
      group.add(grillGrate);
      break;
    }

    case 'sunbed': {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.12, d), secMat);
      frame.position.set(-w * 0.25, 0.15, 0);
      frame.castShadow = true;
      group.add(frame);

      const frame2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.12, d), secMat);
      frame2.position.set(w * 0.25, 0.15, 0);
      frame2.castShadow = true;
      group.add(frame2);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, h, 12), darkMat);
      pole.position.set(0, h * 0.5, -d * 0.4);
      group.add(pole);

      const umbrella = new THREE.Mesh(new THREE.ConeGeometry(w * 0.6, 0.4, 16), mainMat);
      umbrella.position.set(0, h, -d * 0.4);
      group.add(umbrella);
      break;
    }

    case 'firepit': {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.55, h, 20), secMat);
      ring.position.y = h * 0.5;
      ring.castShadow = true;
      group.add(ring);

      const coals = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.4, 0.05, 16), darkMat);
      coals.position.y = h * 0.8;
      group.add(coals);

      if (isActive) {
        const fire = new THREE.Mesh(new THREE.DodecahedronGeometry(w * 0.2, 0), getStandardMat('#ea580c', 0.2, 0.1));
        fire.position.y = h + 0.1;
        group.add(fire);

        const flameLight = new THREE.PointLight(0xf97316, 2.2, 6.0);
        flameLight.position.set(0, h + 0.3, 0);
        group.add(flameLight);
      }
      break;
    }

    case 'doghouse': {
      const house = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.6, d), mainMat);
      house.position.y = h * 0.3;
      house.castShadow = true;
      group.add(house);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.75, h * 0.45, 4), secMat);
      roof.position.y = h * 0.8;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);

      const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, h * 0.45, 0.04), darkMat);
      door.position.set(0, h * 0.24, d * 0.5 + 0.01);
      group.add(door);
      break;
    }

    default: {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mainMat);
      box.position.y = h * 0.5;
      box.castShadow = true;
      group.add(box);
    }
  }

  return group;
}

/**
 * Procedural 3D Car Generator with wheels, cabin, lights, and color styling
 */
export function buildCar3DModel(car: CarVehicle): { group: THREE.Group; wheels: THREE.Mesh[] } {
  const group = new THREE.Group();
  const carMat = getStandardMat(car.color, 0.2, 0.6);
  const darkMat = getStandardMat('#090d16', 0.4, 0.4);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    transparent: true,
    opacity: 0.55,
    roughness: 0.1,
  });
  const chromeMat = getStandardMat('#e2e8f0', 0.15, 0.9);

  let bodyLength = 4.2;
  let bodyWidth = 1.9;
  let bodyHeight = 0.65;
  let cabinHeight = 0.65;

  if (car.modelStyle === 'roadster') {
    bodyLength = 3.8;
    bodyWidth = 1.85;
    cabinHeight = 0.45;
  } else if (car.modelStyle === 'muscle') {
    bodyLength = 4.5;
    bodyWidth = 2.0;
  } else if (car.modelStyle === 'cybertruck') {
    bodyLength = 4.8;
    bodyWidth = 2.1;
    bodyHeight = 0.85;
    cabinHeight = 0.8;
  }

  // Chassis
  const chassisGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength);
  const chassis = new THREE.Mesh(chassisGeo, carMat);
  chassis.position.y = bodyHeight * 0.5 + 0.28;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // Cabin
  const cabinWidth = bodyWidth * 0.85;
  const cabinLength = bodyLength * 0.5;
  const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, bodyHeight + cabinHeight * 0.5 + 0.26, -0.15);
  cabin.castShadow = true;
  group.add(cabin);

  // Headlights (Front is +Z)
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), headlightMat);
  hlL.position.set(-bodyWidth * 0.35, chassis.position.y + 0.05, bodyLength * 0.5 + 0.01);
  const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), headlightMat);
  hlR.position.set(bodyWidth * 0.35, chassis.position.y + 0.05, bodyLength * 0.5 + 0.01);
  group.add(hlL, hlR);

  // Taillights
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.05), tailMat);
  tlL.position.set(-bodyWidth * 0.35, chassis.position.y + 0.05, -bodyLength * 0.5 - 0.01);
  const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.05), tailMat);
  tlR.position.set(bodyWidth * 0.35, chassis.position.y + 0.05, -bodyLength * 0.5 - 0.01);
  group.add(tlL, tlR);

  // 4 Wheels
  const wheels: THREE.Mesh[] = [];
  const wheelRadius = 0.34;
  const wheelWidth = 0.24;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-bodyWidth * 0.5 - wheelWidth * 0.35, wheelRadius, bodyLength * 0.32],
    [bodyWidth * 0.5 + wheelWidth * 0.35, wheelRadius, bodyLength * 0.32],
    [-bodyWidth * 0.5 - wheelWidth * 0.35, wheelRadius, -bodyLength * 0.32],
    [bodyWidth * 0.5 + wheelWidth * 0.35, wheelRadius, -bodyLength * 0.32],
  ];

  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);

    // Chrome rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, wheelWidth + 0.01, 12), chromeMat);
    rim.position.set(wx, wy, wz);
    rim.rotation.z = Math.PI / 2;
    group.add(rim);
  });

  return { group, wheels };
}

/**
 * Procedural 3D Pet Generator (Retriever, Shiba, Cat, Bunny)
 */
export function buildPet3DModel(pet: PetItem): THREE.Group {
  const group = new THREE.Group();
  const furMat = getStandardMat(pet.color, 0.6, 0.05);
  const darkMat = getStandardMat('#090d16', 0.5, 0.1);
  const whiteMat = getStandardMat('#f8fafc', 0.6, 0.05);

  let bodyLength = 0.55;
  let bodyHeight = 0.32;
  let legHeight = 0.22;

  if (pet.petType === 'cat_calico') {
    bodyLength = 0.45;
    bodyHeight = 0.24;
    legHeight = 0.18;
  } else if (pet.petType === 'bunny_lop') {
    bodyLength = 0.35;
    bodyHeight = 0.22;
    legHeight = 0.1;
  }

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.26, bodyHeight, bodyLength), furMat);
  torso.position.y = legHeight + bodyHeight * 0.5;
  torso.castShadow = true;
  group.add(torso);

  // Head
  const headSize = pet.petType === 'bunny_lop' ? 0.2 : 0.24;
  const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), furMat);
  head.position.set(0, torso.position.y + bodyHeight * 0.4, bodyLength * 0.5 + headSize * 0.35);
  head.castShadow = true;
  group.add(head);

  // Eyes
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), darkMat);
  eyeL.position.set(0.06, head.position.y + 0.02, head.position.z + headSize * 0.5 + 0.01);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), darkMat);
  eyeR.position.set(-0.06, head.position.y + 0.02, head.position.z + headSize * 0.5 + 0.01);
  group.add(eyeL, eyeR);

  // Ears
  if (pet.petType === 'bunny_lop') {
    // Floppy long ears
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.06), whiteMat);
    earL.position.set(0.12, head.position.y - 0.02, head.position.z);
    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.06), whiteMat);
    earR.position.set(-0.12, head.position.y - 0.02, head.position.z);
    group.add(earL, earR);
  } else {
    // Pointed or folded ears
    const earGeo = new THREE.ConeGeometry(0.05, 0.1, 4);
    const earL = new THREE.Mesh(earGeo, furMat);
    earL.position.set(0.08, head.position.y + headSize * 0.5 + 0.04, head.position.z - 0.02);
    const earR = new THREE.Mesh(earGeo, furMat);
    earR.position.set(-0.08, head.position.y + headSize * 0.5 + 0.04, head.position.z - 0.02);
    group.add(earL, earR);
  }

  // 4 Legs
  const legGeo = new THREE.BoxGeometry(0.08, legHeight, 0.08);
  const legOffsets = [
    [-0.1, bodyLength * 0.35],
    [0.1, bodyLength * 0.35],
    [-0.1, -bodyLength * 0.35],
    [0.1, -bodyLength * 0.35],
  ];
  const legs: THREE.Mesh[] = [];
  legOffsets.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, furMat);
    leg.position.set(lx, legHeight * 0.5, lz);
    leg.castShadow = true;
    group.add(leg);
    legs.push(leg);
  });

  // Tail (Animateable)
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), furMat);
  tail.position.set(0, torso.position.y + bodyHeight * 0.3, -bodyLength * 0.55);
  tail.rotation.x = -0.4;
  group.add(tail);

  // Collar with Brass Tag (for Dogs & Cats)
  if (pet.petType !== 'bunny_lop') {
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.04, 16),
      getStandardMat('#dc2626', 0.4, 0.1)
    );
    collar.position.set(0, torso.position.y + bodyHeight * 0.3, bodyLength * 0.38);
    collar.rotation.x = 0.25;
    group.add(collar);

    const tag = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.01, 8),
      getStandardMat('#eab308', 0.2, 0.8)
    );
    tag.position.set(0, torso.position.y + bodyHeight * 0.15, bodyLength * 0.48);
    tag.rotation.x = Math.PI / 2;
    group.add(tag);
  }

  // Store references for animation in userData
  group.userData = {
    tail,
    legs,
    head,
    petType: pet.petType,
  };

  return group;
}

/**
 * Procedural 3D Mesh Generator for the Driveable Marina Yacht / Speedboat
 */
export function buildBoat3DModel(): {
  group: THREE.Group;
  propellers: THREE.Mesh[];
  wakeGroup: THREE.Group;
} {
  const group = new THREE.Group();
  const whiteHull = getStandardMat('#f8fafc', 0.2, 0.05);
  const blueTrim = getStandardMat('#0284c7', 0.3, 0.2);
  const darkNavy = getStandardMat('#0f172a', 0.5, 0.3);
  const teakWood = getStandardMat('#92400e', 0.7, 0.05);
  const chromeMat = getStandardMat('#e2e8f0', 0.1, 0.85);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.65,
    roughness: 0.1,
    transmission: 0.8,
  });

  // Main V-Hull: sharp bow at +Z, wider at middle, flat transom at -Z
  const hullGroup = new THREE.Group();

  // Bottom keel
  const keel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 14), blueTrim);
  keel.position.y = 0.6;
  hullGroup.add(keel);

  // Bow wedge (tapered front)
  const bowWedge = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4.5, 4), whiteHull);
  bowWedge.rotation.x = -Math.PI / 2;
  bowWedge.rotation.y = Math.PI / 4;
  bowWedge.position.set(0, 0.9, 8.5);
  hullGroup.add(bowWedge);

  // Main upper deck & sides
  const deckHull = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.4, 12), whiteHull);
  deckHull.position.set(0, 1.3, 1.0);
  hullGroup.add(deckHull);

  // Teak floor deck
  const teakFloor = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 11), teakWood);
  teakFloor.rotation.x = -Math.PI / 2;
  teakFloor.position.set(0, 2.02, 1.0);
  hullGroup.add(teakFloor);

  // Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.2, 0.1), glassMat);
  windshield.rotation.x = 0.35;
  windshield.position.set(0, 2.6, 2.8);
  hullGroup.add(windshield);

  // Captain's Console & Steering Wheel
  const consoleMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.7), darkNavy);
  consoleMesh.position.set(0.8, 2.4, 2.2);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 16), chromeMat);
  wheel.position.set(0.8, 2.7, 2.0);
  wheel.rotation.x = -0.4;
  hullGroup.add(consoleMesh, wheel);

  // Leather Seats
  const seatMat = getStandardMat('#f1f5f9', 0.6, 0.1);
  for (const [sx, sz] of [
    [0.8, 1.2],
    [-0.8, 1.2],
    [0.8, -1.2],
    [-0.8, -1.2],
  ]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.9), seatMat);
    seat.position.set(sx, 2.3, sz);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.2), seatMat);
    back.position.set(sx, 2.8, sz - 0.4);
    hullGroup.add(seat, back);
  }

  // Sun Lounge Deck at Stern
  const sunPad = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 2.4), blueTrim);
  sunPad.position.set(0, 2.15, -3.8);
  hullGroup.add(sunPad);

  // Twin Outboard Motors at rear
  const motorMat = getStandardMat('#1e293b', 0.3, 0.6);
  const propellers: THREE.Mesh[] = [];
  [-1.2, 1.2].forEach((mx) => {
    const motorMount = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.8), motorMat);
    motorMount.position.set(mx, 1.4, -5.5);
    const motorShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8), chromeMat);
    motorShaft.position.set(mx, 0.5, -5.5);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.04), chromeMat);
    prop.position.set(mx, 0.2, -5.7);
    propellers.push(prop);
    hullGroup.add(motorMount, motorShaft, prop);
  });

  // Navigation lights (Red on Port/Left, Green on Starboard/Right)
  const redNav = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  redNav.position.set(-2.4, 2.1, 4.0);
  const greenNav = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  greenNav.position.set(2.4, 2.1, 4.0);
  hullGroup.add(redNav, greenNav);

  // Stern flag pole and nautical flag
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6), chromeMat);
  pole.position.set(1.6, 2.8, -4.8);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide })
  );
  flag.position.set(1.95, 3.3, -4.8);
  hullGroup.add(pole, flag);

  group.add(hullGroup);

  // Water Wake Group (trails behind boat in water)
  const wakeGroup = new THREE.Group();
  wakeGroup.position.set(0, 0.05, -6.0);
  const wakeMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });
  const wakeMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 10), wakeMat);
  wakeMesh.rotation.x = -Math.PI / 2;
  wakeMesh.position.z = -5.0;
  wakeGroup.add(wakeMesh);
  group.add(wakeGroup);

  return { group, propellers, wakeGroup };
}

/**
 * Procedural 3D Mesh Generator for the Driveable Metro Airport Helicopter
 */
export function buildHelicopter3DModel(): {
  group: THREE.Group;
  mainRotor: THREE.Group;
  tailRotor: THREE.Group;
  beaconLight: THREE.PointLight;
} {
  const group = new THREE.Group();

  const bodyMat = getStandardMat('#eab308', 0.25, 0.2); // Vibrant aviation gold/yellow
  const whiteMat = getStandardMat('#f8fafc', 0.3, 0.1);
  const darkMetal = getStandardMat('#1e293b', 0.4, 0.7);
  const skidMat = getStandardMat('#475569', 0.2, 0.85);
  const carbonMat = getStandardMat('#090d16', 0.3, 0.5);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.65,
    roughness: 0.1,
    transmission: 0.85,
  });

  // 1. Aerodynamic Cabin Fuselage
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 4.4), bodyMat);
  cabin.position.set(0, 1.8, 0);
  cabin.castShadow = true;
  group.add(cabin);

  // Nose taper
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.0, 6), bodyMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.7, 2.8);
  nose.castShadow = true;
  group.add(nose);

  // Curved Cockpit Windshield Canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.2), glassMat);
  canopy.position.set(0, 2.0, 1.4);
  group.add(canopy);

  // Cockpit Seats & Controls
  const pilotSeatL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), darkMetal);
  pilotSeatL.position.set(-0.55, 1.4, 1.1);
  const pilotSeatR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), darkMetal);
  pilotSeatR.position.set(0.55, 1.4, 1.1);
  group.add(pilotSeatL, pilotSeatR);

  // 2. Landing Skids (Twin tubular skids)
  const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 5.2), skidMat);
  skidL.position.set(-1.25, 0.1, 0.2);
  const skidR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 5.2), skidMat);
  skidR.position.set(1.25, 0.1, 0.2);
  skidL.castShadow = true;
  skidR.castShadow = true;
  group.add(skidL, skidR);

  // Skid Struts
  for (const sz of [-1.0, 1.2]) {
    const strutL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), skidMat);
    strutL.rotation.z = -0.3;
    strutL.position.set(-0.95, 0.7, sz);
    const strutR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), skidMat);
    strutR.rotation.z = 0.3;
    strutR.position.set(0.95, 0.7, sz);
    group.add(strutL, strutR);
  }

  // 3. Tail Boom & Fin
  const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 5.8, 8), whiteMat);
  tailBoom.rotation.x = Math.PI / 2;
  tailBoom.position.set(0, 2.1, -4.5);
  tailBoom.castShadow = true;
  group.add(tailBoom);

  // Tail Horizontal Stabilizers
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.6), bodyMat);
  tailWing.position.set(0, 2.2, -6.5);
  group.add(tailWing);

  // Tail Vertical Fin
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 1.0), bodyMat);
  tailFin.position.set(0, 2.8, -7.2);
  tailFin.rotation.x = -0.2;
  group.add(tailFin);

  // 4. Main Rotor Mast & Blades
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.8, 8), darkMetal);
  mast.position.set(0, 3.2, 0.2);
  group.add(mast);

  const mainRotor = new THREE.Group();
  mainRotor.position.set(0, 3.6, 0.2);
  const rotorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.18, 12), darkMetal);
  mainRotor.add(rotorHub);

  // 4 Rotor Blades (Length ~6.5m diameter)
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 3.6), carbonMat);
    blade.position.set(Math.sin(angle) * 1.9, 0.06, Math.cos(angle) * 1.9);
    blade.rotation.y = angle;
    mainRotor.add(blade);
  }
  group.add(mainRotor);

  // 5. Tail Rotor (Anti-torque rotor)
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.18, 3.1, -7.2);
  const tailRotorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8), darkMetal);
  tailRotorHub.rotation.z = Math.PI / 2;
  tailRotor.add(tailRotorHub);

  const tailBlade1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.1, 0.14), carbonMat);
  const tailBlade2 = tailBlade1.clone();
  tailBlade2.rotation.z = Math.PI / 2;
  tailRotor.add(tailBlade1, tailBlade2);
  group.add(tailRotor);

  // 6. Anti-Collision Flashing Beacon & Searchlight
  const beaconMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  beaconMesh.position.set(0, 3.75, 0.2);
  group.add(beaconMesh);

  const beaconLight = new THREE.PointLight(0xef4444, 1.2, 10);
  beaconLight.position.set(0, 3.8, 0.2);
  group.add(beaconLight);

  // Nose Spotlight
  const spotlight = new THREE.SpotLight(0xffffff, 2.5, 35, 0.45, 0.5);
  spotlight.position.set(0, 1.2, 3.0);
  spotlight.target.position.set(0, -2.0, 12.0);
  group.add(spotlight, spotlight.target);

  return { group, mainRotor, tailRotor, beaconLight };
}
