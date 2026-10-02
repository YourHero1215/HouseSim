import * as THREE from 'three';
import { CatalogItem, CarVehicle, PetItem } from '../types/housesim';

// Materials Cache for high-performance rendering
const matCache = new Map<string, THREE.Material>();

function getStandardMat(colorHex: string, roughness: number = 0.45, metalness: number = 0.1): THREE.MeshStandardMaterial {
  const key = `${colorHex}_${roughness}_${metalness}`;
  if (matCache.has(key)) {
    return matCache.get(key) as THREE.MeshStandardMaterial;
  }
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness,
    metalness,
  });
  matCache.set(key, mat);
  return mat;
}

/**
 * Procedural 3D Mesh Generator for all Catalog Items
 * Distinguishes between Floor items, Backyard items, and Wall-Only items.
 */
export function buildItem3DModel(item: CatalogItem, isActive: boolean = false): THREE.Group {
  const group = new THREE.Group();
  const mainMat = getStandardMat(item.color, 0.4, 0.1);
  const secMat = getStandardMat(item.secondaryColor || '#cbd5e1', 0.5, 0.2);
  const darkMat = getStandardMat('#1e293b', 0.6, 0.2);
  const brassMat = getStandardMat('#d97706', 0.25, 0.8);

  const { width: w, height: h, depth: d } = item.dimensions;

  switch (item.modelStyle) {
    // --- WALL-ONLY ITEMS ---
    case 'wall_painting': {
      // Elegant gold frame + painted canvas plane
      const frameGeo = new THREE.BoxGeometry(w, h, d);
      const frame = new THREE.Mesh(frameGeo, brassMat);
      frame.castShadow = true;
      group.add(frame);

      const canvasGeo = new THREE.PlaneGeometry(w * 0.9, h * 0.88);
      const canvasMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.color),
        roughness: 0.8,
      });
      const canvas = new THREE.Mesh(canvasGeo, canvasMat);
      canvas.position.z = d * 0.5 + 0.005;
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
      // 75" Flat TV flush mounted to wall
      const tvBody = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), darkMat);
      group.add(tvBody);

      const screenMat = new THREE.MeshBasicMaterial({
        color: isActive ? 0x38bdf8 : 0x090d16,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.95, h * 0.92), screenMat);
      screen.position.z = d * 0.5 + 0.005;
      group.add(screen);

      if (isActive) {
        const tvGlow = new THREE.PointLight(0x38bdf8, 1.4, 5.0);
        tvGlow.position.set(0, 0, 0.4);
        group.add(tvGlow);
      }
      break;
    }

    case 'wall_clock': {
      // Round wooden clock
      const clockBody = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.5, d, 24), secMat);
      clockBody.rotation.x = Math.PI / 2;
      group.add(clockBody);

      const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, w * 0.35, 0.01), darkMat);
      hand1.position.set(0, w * 0.15, d * 0.5 + 0.01);
      const hand2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.24, 0.02, 0.01), darkMat);
      hand2.position.set(w * 0.1, 0, d * 0.5 + 0.01);
      group.add(hand1, hand2);
      break;
    }

    case 'wall_shelf': {
      // Floating wood shelf
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mainMat);
      shelf.castShadow = true;
      group.add(shelf);
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

    // --- HOME FURNITURE & APPLIANCES ---
    case 'sofa': {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.45, d), mainMat);
      seat.position.y = h * 0.25;
      seat.castShadow = true;
      group.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.65, d * 0.25), mainMat);
      back.position.set(0, h * 0.65, -d * 0.38);
      back.castShadow = true;
      group.add(back);

      const armL = new THREE.Mesh(new THREE.BoxGeometry(w * 0.12, h * 0.5, d), mainMat);
      armL.position.set(-w * 0.45, h * 0.45, 0);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(w * 0.12, h * 0.5, d), mainMat);
      armR.position.set(w * 0.45, h * 0.45, 0);
      group.add(armL, armR);
      break;
    }

    case 'bed': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.35, d), darkMat);
      base.position.y = h * 0.18;
      base.castShadow = true;
      group.add(base);

      const mattress = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, h * 0.3, d * 0.92), secMat);
      mattress.position.set(0, h * 0.45, d * 0.02);
      mattress.castShadow = true;
      group.add(mattress);

      const headboard = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.8, d * 0.12), darkMat);
      headboard.position.set(0, h * 0.55, -d * 0.44);
      headboard.castShadow = true;
      group.add(headboard);
      break;
    }

    case 'dining_table':
    case 'coffee_table':
    case 'desk': {
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), mainMat);
      top.position.y = h - 0.03;
      top.castShadow = true;
      group.add(top);

      const legH = h - 0.06;
      const legGeo = new THREE.BoxGeometry(0.06, legH, 0.06);
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
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mainMat);
      body.position.y = h * 0.5;
      body.castShadow = true;
      group.add(body);

      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, h * 0.4, 0.04), darkMat);
      handle.position.set(w * 0.4, h * 0.5, d * 0.5 + 0.03);
      group.add(handle);
      break;
    }

    case 'laptop': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, d * 0.7), darkMat);
      base.position.y = 0.008;
      group.add(base);

      const screen = new THREE.Mesh(new THREE.BoxGeometry(w, d * 0.65, 0.012), darkMat);
      screen.position.set(0, (d * 0.65) * 0.45, -d * 0.32);
      screen.rotation.x = -0.25;
      group.add(screen);

      const disp = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, d * 0.55), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      disp.position.set(0, (d * 0.65) * 0.45, -d * 0.32 + 0.01);
      disp.rotation.x = -0.25;
      group.add(disp);
      break;
    }

    case 'espresso': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mainMat);
      body.position.y = h * 0.5;
      body.castShadow = true;
      group.add(body);

      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.07, 12), secMat);
      cup.position.set(0, 0.1, d * 0.35);
      group.add(cup);
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
  legOffsets.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, furMat);
    leg.position.set(lx, legHeight * 0.5, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Tail
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), furMat);
  tail.position.set(0, torso.position.y + bodyHeight * 0.3, -bodyLength * 0.55);
  tail.rotation.x = -0.4;
  group.add(tail);

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

