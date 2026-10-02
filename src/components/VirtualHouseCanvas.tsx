import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CarPhysics,
  CarVehicle,
  CatalogItem,
  NPCData,
  PlacedItem,
  PlacedPet,
} from '../types/housesim';
import {
  buildCar3DModel,
  buildItem3DModel,
  buildPet3DModel,
} from '../utils/world3DBuilder';
import { soundFX } from '../utils/soundEffects';
import { CITY_NPCS } from '../data/catalog';

interface VirtualHouseCanvasProps {
  playerCash: number;
  houseTier: number;
  placedItems: PlacedItem[];
  ownedCars: CarVehicle[];
  activeCarId: string | null;
  placedPets: PlacedPet[];
  activePlacingItem: CatalogItem | null;
  isDrivingCar: boolean;
  onEnterCar: () => void;
  onExitCar: () => void;
  onPlaceItem: (
    item: CatalogItem,
    position: [number, number, number],
    rotationY: number,
    isOnWall: boolean,
    wallNormal?: [number, number, number]
  ) => void;
  onCancelPlacing: () => void;
  onInteractWithNPC: (npc: NPCData) => void;
  onInteractWithPet: (pet: PlacedPet) => void;
  onOpenShop: (tab?: string) => void;
  onOpenWorkplace: () => void;
  onSpeedUpdate: (speedMph: number) => void;
}

interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  name: string;
}

export const VirtualHouseCanvas: React.FC<VirtualHouseCanvasProps> = ({
  playerCash,
  houseTier,
  placedItems,
  ownedCars,
  activeCarId,
  placedPets,
  activePlacingItem,
  isDrivingCar,
  onEnterCar,
  onExitCar,
  onPlaceItem,
  onCancelPlacing,
  onInteractWithNPC,
  onInteractWithPet,
  onOpenShop,
  onOpenWorkplace,
  onSpeedUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);

  // Latest props reference for 60fps animation loop
  const stateRef = useRef({
    houseTier,
    placedItems,
    ownedCars,
    activeCarId,
    placedPets,
    activePlacingItem,
    isDrivingCar,
    onEnterCar,
    onExitCar,
    onPlaceItem,
    onCancelPlacing,
    onInteractWithNPC,
    onInteractWithPet,
    onOpenShop,
    onOpenWorkplace,
    onSpeedUpdate,
  });

  useEffect(() => {
    stateRef.current = {
      houseTier,
      placedItems,
      ownedCars,
      activeCarId,
      placedPets,
      activePlacingItem,
      isDrivingCar,
      onEnterCar,
      onExitCar,
      onPlaceItem,
      onCancelPlacing,
      onInteractWithNPC,
      onInteractWithPet,
      onOpenShop,
      onOpenWorkplace,
      onSpeedUpdate,
    };
  });

  // Groups and Colliders Refs
  const placedGroupRef = useRef<THREE.Group | null>(null);
  const houseGroupRef = useRef<THREE.Group | null>(null);
  const cityGroupRef = useRef<THREE.Group | null>(null);
  const activeCarGroupRef = useRef<THREE.Group | null>(null);
  const carWheelsRef = useRef<THREE.Mesh[]>([]);
  const ghostMeshRef = useRef<THREE.Group | null>(null);
  const wallMeshesRef = useRef<THREE.Mesh[]>([]);
  const floorMeshesRef = useRef<THREE.Mesh[]>([]);
  const backyardMeshesRef = useRef<THREE.Mesh[]>([]);
  const collidersRef = useRef<BoxCollider[]>([]);

  // Car Physics State
  const carPhysicsRef = useRef<CarPhysics>({
    x: -4.0,
    z: 14.0,
    rotationY: Math.PI / 2,
    speed: 0,
    steering: 0,
  });

  // Human Position State
  const humanPosRef = useRef<THREE.Vector3>(new THREE.Vector3(-10.0, 0, 7.5));
  const humanRotRef = useRef<number>(0);

  // Camera Orbit & Zoom State
  const cameraYawRef = useRef<number>(0.15);
  const cameraPitchRef = useRef<number>(0.65);
  const cameraDistRef = useRef<number>(11.0);
  const isInsideBuildingRef = useRef<boolean>(false);

  // Sync Placed Items
  useEffect(() => {
    const group = placedGroupRef.current;
    if (!group) return;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    placedItems.forEach((placed) => {
      const mockCatalogItem: CatalogItem = {
        id: placed.itemId,
        name: placed.name,
        category: placed.category,
        price: 0,
        description: '',
        placementType: placed.placementType,
        dimensions: { width: 1, height: 1, depth: 1 },
        color: '#d97706',
        modelStyle: placed.itemId.replace(/^[a-z]+-([a-z]+)-?.*/, '$1') || 'box',
      };
      const model = buildItem3DModel(mockCatalogItem, placed.isActiveState);
      model.position.set(placed.position[0], placed.position[1], placed.position[2]);
      model.rotation.y = placed.rotationY;
      if (placed.isOnWall && placed.wallNormal) {
        model.rotation.y = Math.atan2(placed.wallNormal[0], placed.wallNormal[2]);
      }
      model.scale.setScalar(placed.scale);
      group.add(model);
    });
  }, [placedItems]);

  // Main Scene Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    scene.fog = new THREE.FogExp2(0x0b1120, 0.009);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 240);
    camera.position.set(-6, 12, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Suppress right-click context menu so right-click can smoothly rotate camera POV
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sunLight.position.set(35, 55, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 160;
    const d = 55;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Master Colliders Registry
    const colliders: BoxCollider[] = [];
    const registerCollider = (minX: number, maxX: number, minZ: number, maxZ: number, name: string) => {
      colliders.push({
        minX: Math.min(minX, maxX),
        maxX: Math.max(minX, maxX),
        minZ: Math.min(minZ, maxZ),
        maxZ: Math.max(minZ, maxZ),
        name,
      });
    };

    // Ground Plane
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x14231b, roughness: 0.95 });
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // =========================================================================
    // 1. EXPANDED MULTI-BLOCK CITY ROAD SYSTEM (Avenues & Cross-Streets)
    // =========================================================================
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
    const stripeYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const stripeWhite = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });

    // Main North-South Avenue (x: 4 to 13, z: -85 to +85)
    const mainAve = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 180), roadMat);
    mainAve.rotation.x = -Math.PI / 2;
    mainAve.position.set(8.5, 0.01, 0);
    mainAve.receiveShadow = true;
    scene.add(mainAve);

    // Main Avenue Centerlines
    for (let z = -80; z <= 80; z += 5) {
      if (Math.abs(z - (-6)) < 6) continue; // Skip intersection center
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.8), stripeYellow);
      s.rotation.x = -Math.PI / 2;
      s.position.set(8.5, 0.02, z);
      scene.add(s);
    }

    // Cross East-West Boulevard (x: -45 to 75, z: -10 to -2)
    const crossBlvd = new THREE.Mesh(new THREE.PlaneGeometry(120, 8.5), roadMat);
    crossBlvd.rotation.x = -Math.PI / 2;
    crossBlvd.position.set(15, 0.012, -6);
    crossBlvd.receiveShadow = true;
    scene.add(crossBlvd);

    // Zebra Crosswalks at 4-Way Intersection
    const createCrosswalk = (cx: number, cz: number, isHoriz: boolean) => {
      for (let i = -3; i <= 3; i++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2.2), stripeWhite);
        stripe.rotation.x = -Math.PI / 2;
        if (isHoriz) {
          stripe.rotation.z = Math.PI / 2;
          stripe.position.set(cx + i * 1.1, 0.025, cz);
        } else {
          stripe.position.set(cx, 0.025, cz + i * 1.1);
        }
        scene.add(stripe);
      }
    };
    createCrosswalk(8.5, 2.5, true); // South crosswalk
    createCrosswalk(8.5, -14.5, true); // North crosswalk
    createCrosswalk(2.0, -6, false); // West crosswalk
    createCrosswalk(15.0, -6, false); // East crosswalk

    // Sidewalks
    const addSidewalk = (x: number, z: number, w: number, d: number) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), sidewalkMat);
      sw.position.set(x, 0.08, z);
      sw.receiveShadow = true;
      scene.add(sw);
    };

    addSidewalk(1.8, 42, 3.4, 76); // West sidewalk South
    addSidewalk(1.8, -48, 3.4, 76); // West sidewalk North
    addSidewalk(15.5, 42, 3.4, 76); // East sidewalk South
    addSidewalk(15.5, -48, 3.4, 76); // East sidewalk North

    // Street Lamps along Sidewalks
    for (let z = -70; z <= 70; z += 24) {
      if (Math.abs(z - (-6)) < 12) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.2, 8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      pole.position.set(16.4, 2.6, z);
      scene.add(pole);

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      lampHead.position.set(16.1, 5.1, z);
      scene.add(lampHead);
    }

    // =========================================================================
    // 2. THE RESIDENCE & BACKYARD (Open-Top Dollhouse Cutaway Architecture)
    // =========================================================================
    const houseGroup = new THREE.Group();
    scene.add(houseGroup);
    houseGroupRef.current = houseGroup;

    // Driveway connected to Road
    const driveway = new THREE.Mesh(new THREE.BoxGeometry(11, 0.05, 6.0), roadMat);
    driveway.position.set(-4.5, 0.02, 14);
    driveway.receiveShadow = true;
    scene.add(driveway);

    // Rebuild House with Real Doorway Openings and Solid Wall Colliders
    const rebuildHouse = (tier: number) => {
      while (houseGroup.children.length > 0) {
        houseGroup.remove(houseGroup.children[0]);
      }
      wallMeshesRef.current = [];
      floorMeshesRef.current = [];
      backyardMeshesRef.current = [];

      const floorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 });
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
      const lawnMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
      const fenceMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7 });

      // Wall height is comfortable cutaway (2.8m) with open roof for interior camera view!
      const wallH = 2.8;

      const addWallWithCollider = (
        x: number,
        z: number,
        w: number,
        d: number,
        name: string
      ) => {
        const wMesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
        wMesh.position.set(x, wallH * 0.5, z);
        wMesh.castShadow = true;
        wMesh.receiveShadow = true;
        houseGroup.add(wMesh);
        wallMeshesRef.current.push(wMesh);
        registerCollider(x - w * 0.5, x + w * 0.5, z - d * 0.5, z + d * 0.5, name);
      };

      if (tier === 1) {
        // --- TIER 1: Starter Studio ---
        const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 8), floorMat);
        floor.position.set(-11, 0.05, 8);
        floor.receiveShadow = true;
        houseGroup.add(floor);
        floorMeshesRef.current.push(floor);

        // Walls with Doorway at South (x = -9.5)
        addWallWithCollider(-11, 4, 10, 0.25, 'House North Wall');
        addWallWithCollider(-16, 8, 0.25, 8, 'House West Wall');
        addWallWithCollider(-6, 8, 0.25, 8, 'House East Wall');
        addWallWithCollider(-14, 12, 4.0, 0.25, 'House South Left Wall');
        addWallWithCollider(-7.5, 12, 3.0, 0.25, 'House South Right Wall');
        // Doorway gap between x: -12.0 and -9.0 for entry!
      } else if (tier === 2) {
        // --- TIER 2: 2-Wing Residence + Backyard ---
        const floorMain = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 12), floorMat);
        floorMain.position.set(-13, 0.05, 6);
        floorMain.receiveShadow = true;
        houseGroup.add(floorMain);
        floorMeshesRef.current.push(floorMain);

        // Backyard Lawn
        const backyardLawn = new THREE.Mesh(new THREE.BoxGeometry(14, 0.05, 12), lawnMat);
        backyardLawn.position.set(-13, 0.02, -6);
        backyardLawn.receiveShadow = true;
        houseGroup.add(backyardLawn);
        backyardMeshesRef.current.push(backyardLawn);

        // Backyard Fences (with open gate at North-East)
        const fenceW = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 12), fenceMat);
        fenceW.position.set(-20, 0.7, -6);
        const fenceN = new THREE.Mesh(new THREE.BoxGeometry(10, 1.4, 0.15), fenceMat);
        fenceN.position.set(-15, 0.7, -12);
        const fenceE = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 12), fenceMat);
        fenceE.position.set(-6, 0.7, -6);
        houseGroup.add(fenceW, fenceN, fenceE);

        registerCollider(-20.1, -19.9, -12, 0, 'Backyard West Fence');
        registerCollider(-20, -10, -12.1, -11.9, 'Backyard North Fence');
        registerCollider(-6.1, -5.9, -12, 0, 'Backyard East Fence');

        // House Exterior Walls with Doorways
        addWallWithCollider(-15.5, 0, 9, 0.25, 'House Rear Wall Left');
        // Doorway gap to backyard between x: -11 and -9
        addWallWithCollider(-7.5, 0, 3, 0.25, 'House Rear Wall Right');
        addWallWithCollider(-20, 6, 0.25, 12, 'House West Wall');
        addWallWithCollider(-6, 6, 0.25, 12, 'House East Wall');
        addWallWithCollider(-16, 12, 8, 0.25, 'House Front Left');
        // Front Entrance door gap between x: -12 and -10
        addWallWithCollider(-8, 12, 4, 0.25, 'House Front Right');

        // Center room divider wall
        addWallWithCollider(-13, 6, 0.25, 8, 'Interior Divider Wall');
      } else {
        // --- TIER 3: Luxury Villa + Enclosed Estate Backyard ---
        const floorMain = new THREE.Mesh(new THREE.BoxGeometry(18, 0.1, 16), floorMat);
        floorMain.position.set(-15, 0.05, 6);
        floorMain.receiveShadow = true;
        houseGroup.add(floorMain);
        floorMeshesRef.current.push(floorMain);

        // Huge Green Backyard for Swimming Pools & BBQ
        const backyardLawn = new THREE.Mesh(new THREE.BoxGeometry(22, 0.05, 20), lawnMat);
        backyardLawn.position.set(-15, 0.02, -12);
        backyardLawn.receiveShadow = true;
        houseGroup.add(backyardLawn);
        backyardMeshesRef.current.push(backyardLawn);

        // Estate Perimeter Stone Fences
        const fenceW = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.8, 20), fenceMat);
        fenceW.position.set(-26, 0.9, -12);
        const fenceN = new THREE.Mesh(new THREE.BoxGeometry(16, 1.8, 0.25), fenceMat);
        fenceN.position.set(-18, 0.9, -22);
        const fenceE = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.8, 20), fenceMat);
        fenceE.position.set(-4, 0.9, -12);
        houseGroup.add(fenceW, fenceN, fenceE);

        registerCollider(-26.2, -25.8, -22, -2, 'Estate West Fence');
        registerCollider(-26, -10, -22.2, -21.8, 'Estate North Fence');
        registerCollider(-4.2, -3.8, -22, -2, 'Estate East Fence');

        // House Exterior Walls
        addWallWithCollider(-18, -2, 12, 0.25, 'House Rear Wall Left');
        // Large glass sliding door gap to backyard between x: -12 and -8
        addWallWithCollider(-7, -2, 2, 0.25, 'House Rear Wall Right');
        addWallWithCollider(-24, 6, 0.25, 16, 'House West Wall');
        addWallWithCollider(-6, 6, 0.25, 16, 'House East Wall');
        addWallWithCollider(-19, 14, 10, 0.25, 'House Front Left');
        // Grand Entrance door gap between x: -14 and -10
        addWallWithCollider(-8, 14, 4, 0.25, 'House Front Right');

        // Interior Wing Dividers
        addWallWithCollider(-15, 6, 0.25, 10, 'Grand Foyer Wall');
      }
    };

    rebuildHouse(houseTier);

    // =========================================================================
    // 3. EXPANDED CITY DISTRICT BUILDINGS & SHOPS (Open-Top Walkable Interiors)
    // =========================================================================
    const cityGroup = new THREE.Group();
    scene.add(cityGroup);
    cityGroupRef.current = cityGroup;

    // Helper for Walkable Open-Roof Commercial Buildings
    const createWalkableBuilding = (
      name: string,
      cx: number,
      cz: number,
      w: number,
      d: number,
      colorHex: string,
      signColor: string,
      shopType: string
    ) => {
      const bldgH = 3.6; // Open-top cutaway height for effortless viewing!
      const wallT = 0.25;
      const bldgMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex), roughness: 0.65 });
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

      // Interior Floor
      const fl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), floorMat);
      fl.position.set(cx, 0.06, cz);
      fl.receiveShadow = true;
      fl.userData = { isShop: true, shopType, name };
      cityGroup.add(fl);

      // 4 Walls with an Open Entry Doorway at front (z - d/2)
      const doorW = 3.0;
      const frontWallPartW = (w - doorW) / 2;

      // North Wall
      const wallN = new THREE.Mesh(new THREE.BoxGeometry(w, bldgH, wallT), bldgMat);
      wallN.position.set(cx, bldgH * 0.5, cz + d * 0.5);
      wallN.castShadow = true;
      cityGroup.add(wallN);
      registerCollider(cx - w * 0.5, cx + w * 0.5, cz + d * 0.5 - wallT, cz + d * 0.5 + wallT, `${name} North`);

      // West Wall
      const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallT, bldgH, d), bldgMat);
      wallW.position.set(cx - w * 0.5, bldgH * 0.5, cz);
      wallW.castShadow = true;
      cityGroup.add(wallW);
      registerCollider(cx - w * 0.5 - wallT, cx - w * 0.5 + wallT, cz - d * 0.5, cz + d * 0.5, `${name} West`);

      // East Wall
      const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallT, bldgH, d), bldgMat);
      wallE.position.set(cx + w * 0.5, bldgH * 0.5, cz);
      wallE.castShadow = true;
      cityGroup.add(wallE);
      registerCollider(cx + w * 0.5 - wallT, cx + w * 0.5 + wallT, cz - d * 0.5, cz + d * 0.5, `${name} East`);

      // Front Walls (Left and Right of Doorway)
      const frontL = new THREE.Mesh(new THREE.BoxGeometry(frontWallPartW, bldgH, wallT), bldgMat);
      frontL.position.set(cx - doorW * 0.5 - frontWallPartW * 0.5, bldgH * 0.5, cz - d * 0.5);
      const frontR = new THREE.Mesh(new THREE.BoxGeometry(frontWallPartW, bldgH, wallT), bldgMat);
      frontR.position.set(cx + doorW * 0.5 + frontWallPartW * 0.5, bldgH * 0.5, cz - d * 0.5);
      cityGroup.add(frontL, frontR);
      registerCollider(cx - w * 0.5, cx - doorW * 0.5, cz - d * 0.5 - wallT, cz - d * 0.5 + wallT, `${name} Front L`);
      registerCollider(cx + doorW * 0.5, cx + w * 0.5, cz - d * 0.5 - wallT, cz - d * 0.5 + wallT, `${name} Front R`);

      // Storefront Signboard
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.75, 0.7, 0.15),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(signColor) })
      );
      sign.position.set(cx, bldgH - 0.4, cz - d * 0.5 - 0.1);
      cityGroup.add(sign);

      // Interior Cashier Register Counter (Solid Collider)
      const counter = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.9, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
      );
      counter.position.set(cx, 0.45, cz + d * 0.25);
      cityGroup.add(counter);
      registerCollider(cx - 1.3, cx + 1.3, cz + d * 0.25 - 0.5, cz + d * 0.25 + 0.5, `${name} Counter`);
    };

    // 1. Auto Motors Dealership & Outdoor Car Lot (x: 28, z: -20)
    createWalkableBuilding('Auto Motors Dealership', 28, -20, 14, 12, '#1e293b', '#f97316', 'cars');

    // 2. Furnish & Home Mega-Store (x: 28, z: 4)
    createWalkableBuilding('Furnish & Home Goods', 28, 4, 14, 12, '#334155', '#38bdf8', 'furniture');

    // 3. Wall Decor & Art Studio (x: 28, z: 24)
    createWalkableBuilding('Wall Decor & Art Studio', 28, 24, 14, 11, '#475569', '#a855f7', 'wall_decor');

    // 4. Pet Haven Adoption Center (x: 48, z: 20)
    createWalkableBuilding('Pet Adoption Haven', 48, 20, 13, 11, '#065f46', '#34d399', 'pets');

    // 5. City Career & Job Center (x: 48, z: 4)
    createWalkableBuilding('City Career & Work Hub', 48, 4, 15, 12, '#1e1b4b', '#fbbf24', 'workplace');

    // 6. Grand City Bank & Financial Center (x: 48, z: -20)
    createWalkableBuilding('Grand City Bank', 48, -20, 15, 13, '#1c1917', '#eab308', 'bank');

    // 7. Metro Gas Station & EV Fast Charging (x: 28, z: 48)
    const gasCanopy = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    gasCanopy.position.set(28, 4.2, 48);
    cityGroup.add(gasCanopy);
    // Gas Pumps (Colliders)
    for (const pz of [45, 51]) {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
      pump.position.set(28, 0.9, pz);
      cityGroup.add(pump);
      registerCollider(27.3, 28.7, pz - 0.5, pz + 0.5, 'Gas Pump');
    }

    // 8. Central City Park & Plaza (x: 46, z: 48, 24m x 24m)
    const parkFloor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 }));
    parkFloor.rotation.x = -Math.PI / 2;
    parkFloor.position.set(48, 0.05, 48);
    cityGroup.add(parkFloor);

    // Stone Plaza Fountain (Solid Collider)
    const fountain = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 0.9, 20), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    fountain.position.set(48, 0.45, 48);
    cityGroup.add(fountain);
    registerCollider(44.3, 51.7, 44.3, 51.7, 'Park Fountain');

    // Park Trees
    for (const [tx, tz] of [
      [39, 39],
      [57, 39],
      [39, 57],
      [57, 57],
      [48, 38],
    ]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x78350f }));
      trunk.position.set(tx, 1.1, tz);
      cityGroup.add(trunk);
      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
      foliage.position.set(tx, 3.0, tz);
      cityGroup.add(foliage);
      registerCollider(tx - 0.4, tx + 0.4, tz - 0.4, tz + 0.4, 'Park Tree');
    }

    collidersRef.current = colliders;

    // =========================================================================
    // 4. SCRIPTED AIMLESS WALKING NPCS (Not AI)
    // =========================================================================
    const npcMeshes: { group: THREE.Group; data: NPCData; legL: THREE.Group; legR: THREE.Group }[] = [];

    CITY_NPCS.forEach((npc) => {
      const npcGrp = new THREE.Group();
      npcGrp.position.set(npc.position[0], 0, npc.position[2]);

      const skinMat = new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.5 });
      const outfitMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(npc.outfitColor), roughness: 0.6 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), skinMat);
      head.position.y = 1.55;
      npcGrp.add(head);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.24), outfitMat);
      torso.position.y = 1.06;
      npcGrp.add(torso);

      const legL = new THREE.Group();
      legL.position.set(0.11, 0.74, 0);
      const legMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.74, 0.15), darkMat);
      legMeshL.position.y = -0.37;
      legL.add(legMeshL);
      npcGrp.add(legL);

      const legR = new THREE.Group();
      legR.position.set(-0.11, 0.74, 0);
      const legMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.74, 0.15), darkMat);
      legMeshR.position.y = -0.37;
      legR.add(legMeshR);
      npcGrp.add(legR);

      scene.add(npcGrp);
      npcMeshes.push({ group: npcGrp, data: npc, legL, legR });
    });

    // =========================================================================
    // 5. HUMAN PLAYER CHARACTER
    // =========================================================================
    const playerGrp = new THREE.Group();
    playerGrp.position.copy(humanPosRef.current);
    scene.add(playerGrp);

    const pSkin = new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.5 });
    const pJacket = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const pPants = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    const pHead = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), pSkin);
    pHead.position.y = 1.55;
    playerGrp.add(pHead);

    const pTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.24), pJacket);
    pTorso.position.y = 1.06;
    playerGrp.add(pTorso);

    const pLegL = new THREE.Group();
    pLegL.position.set(0.11, 0.74, 0);
    const pLegMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.74, 0.15), pPants);
    pLegMeshL.position.y = -0.37;
    pLegL.add(pLegMeshL);
    playerGrp.add(pLegL);

    const pLegR = new THREE.Group();
    pLegR.position.set(-0.11, 0.74, 0);
    const pLegMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.74, 0.15), pPants);
    pLegMeshR.position.y = -0.37;
    pLegR.add(pLegMeshR);
    playerGrp.add(pLegR);

    // =========================================================================
    // 6. SPAWNED CAR VEHICLE
    // =========================================================================
    const carModelData = buildCar3DModel(
      ownedCars.find((c) => c.id === activeCarId) || {
        id: 'starter-car',
        name: 'Metro City Cruiser',
        price: 1800,
        color: '#0284c7',
        maxSpeed: 24,
        acceleration: 1.4,
        handling: 1.5,
        modelStyle: 'sedan',
        description: '',
      }
    );
    const carMeshGroup = carModelData.group;
    carMeshGroup.position.set(carPhysicsRef.current.x, 0, carPhysicsRef.current.z);
    carMeshGroup.rotation.y = carPhysicsRef.current.rotationY;
    scene.add(carMeshGroup);
    activeCarGroupRef.current = carMeshGroup;
    carWheelsRef.current = carModelData.wheels;

    // Placed Items Group
    const placedGroup = new THREE.Group();
    scene.add(placedGroup);
    placedGroupRef.current = placedGroup;

    // Ghost Placement Preview
    const ghostGroup = new THREE.Group();
    ghostGroup.visible = false;
    scene.add(ghostGroup);
    ghostMeshRef.current = ghostGroup;

    // =========================================================================
    // 7. INPUT HANDLING & RIGHT-CLICK DRAG / SCROLL ZOOM CAMERA POV
    // =========================================================================
    const keys = new Set<string>();
    let isRightClickDragging = false;
    let pointerPos = { x: 0, y: 0 };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const k = e.key.toLowerCase();
      keys.add(k);

      // 'E' Key Interaction
      if (k === 'e' && !e.repeat) {
        e.preventDefault();
        const cur = stateRef.current;

        if (cur.isDrivingCar) {
          cur.onExitCar();
          playerGrp.position.set(
            carPhysicsRef.current.x + Math.sin(carPhysicsRef.current.rotationY + Math.PI / 2) * 2.2,
            0,
            carPhysicsRef.current.z + Math.cos(carPhysicsRef.current.rotationY + Math.PI / 2) * 2.2
          );
          humanPosRef.current.copy(playerGrp.position);
          soundFX.playCarEngineStart();
          return;
        }

        // Check if near car to Enter
        const carDist = humanPosRef.current.distanceTo(
          new THREE.Vector3(carPhysicsRef.current.x, 0, carPhysicsRef.current.z)
        );
        if (carDist < 3.2) {
          cur.onEnterCar();
          soundFX.playCarEngineStart();
          return;
        }

        // Check if near NPC
        for (const npc of npcMeshes) {
          const dist = humanPosRef.current.distanceTo(npc.group.position);
          if (dist < 3.0) {
            cur.onInteractWithNPC(npc.data);
            soundFX.playInteractChime();
            return;
          }
        }

        // Check if near Pet
        for (const pet of cur.placedPets) {
          const petVec = new THREE.Vector3(pet.position[0], pet.position[1], pet.position[2]);
          if (humanPosRef.current.distanceTo(petVec) < 2.5) {
            cur.onInteractWithPet(pet);
            soundFX.playPetSound(pet.petType === 'cat_calico' ? 'cat' : pet.petType === 'bunny_lop' ? 'bunny' : 'dog');
            return;
          }
        }

        // Check if near Shop entrance or interior counter
        for (const bldg of cityGroup.children) {
          if (bldg.userData?.isShop) {
            const dist = humanPosRef.current.distanceTo(bldg.position);
            if (dist < 8.0) {
              if (bldg.userData.shopType === 'workplace') {
                cur.onOpenWorkplace();
              } else {
                cur.onOpenShop(bldg.userData.shopType);
              }
              soundFX.playInteractChime();
              return;
            }
          }
        }
      }

      if (k === 'h' && stateRef.current.isDrivingCar) {
        soundFX.playCarHorn();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
    };

    // Right-Click Drag Orbit Camera POV
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2) {
        // Right click
        isRightClickDragging = true;
        pointerPos = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isRightClickDragging) {
        const dx = e.clientX - pointerPos.x;
        const dy = e.clientY - pointerPos.y;
        cameraYawRef.current -= dx * 0.0065;
        cameraPitchRef.current = Math.max(0.12, Math.min(1.42, cameraPitchRef.current + dy * 0.0055));
        pointerPos = { x: e.clientX, y: e.clientY };
        return;
      }

      // Handle item placement raycasting
      const activeItem = stateRef.current.activePlacingItem;
      if (!activeItem || !ghostGroup) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const mouseNDC = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouseNDC, camera);

      if (activeItem.placementType === 'wall_only') {
        const wallHits = raycaster.intersectObjects(wallMeshesRef.current, false);
        if (wallHits.length > 0) {
          const hit = wallHits[0];
          ghostGroup.visible = true;
          ghostGroup.position.copy(hit.point);
          ghostGroup.position.y = 1.6;
          if (hit.face) {
            ghostGroup.rotation.y = Math.atan2(hit.face.normal.x, hit.face.normal.z);
          }
          setPlacementError(null);
        } else {
          setPlacementError('This item can ONLY be mounted on an interior wall!');
        }
      } else if (activeItem.placementType === 'backyard_only') {
        const yardHits = raycaster.intersectObjects(backyardMeshesRef.current, false);
        if (yardHits.length > 0) {
          const hit = yardHits[0];
          ghostGroup.visible = true;
          ghostGroup.position.set(hit.point.x, 0.05, hit.point.z);
          setPlacementError(null);
        } else {
          setPlacementError('This item must be placed outside in your backyard!');
        }
      } else {
        const floorHits = raycaster.intersectObjects([...floorMeshesRef.current, ...backyardMeshesRef.current], false);
        if (floorHits.length > 0) {
          const hit = floorHits[0];
          ghostGroup.visible = true;
          ghostGroup.position.set(hit.point.x, 0.05, hit.point.z);
          setPlacementError(null);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 2) {
        isRightClickDragging = false;
        return;
      }

      const activeItem = stateRef.current.activePlacingItem;
      if (!activeItem) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const mouseNDC = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouseNDC, camera);

      if (activeItem.placementType === 'wall_only') {
        const wallHits = raycaster.intersectObjects(wallMeshesRef.current, false);
        if (wallHits.length > 0) {
          const hit = wallHits[0];
          const normal = hit.face ? [hit.face.normal.x, hit.face.normal.y, hit.face.normal.z] : [0, 0, 1];
          const rotY = Math.atan2(normal[0], normal[2]);
          stateRef.current.onPlaceItem(activeItem, [hit.point.x, 1.6, hit.point.z], rotY, true, normal as [number, number, number]);
          soundFX.playPlaceObject();
        }
      } else if (activeItem.placementType === 'backyard_only') {
        const yardHits = raycaster.intersectObjects(backyardMeshesRef.current, false);
        if (yardHits.length > 0) {
          const hit = yardHits[0];
          stateRef.current.onPlaceItem(activeItem, [hit.point.x, 0.05, hit.point.z], 0, false);
          soundFX.playPlaceObject();
        }
      } else {
        const floorHits = raycaster.intersectObjects([...floorMeshesRef.current, ...backyardMeshesRef.current], false);
        if (floorHits.length > 0) {
          const hit = floorHits[0];
          stateRef.current.onPlaceItem(activeItem, [hit.point.x, 0.05, hit.point.z], 0, false);
          soundFX.playPlaceObject();
        }
      }
    };

    // Scroll Wheel Zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistRef.current = Math.max(3.5, Math.min(26.0, cameraDistRef.current + e.deltaY * 0.015));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // =========================================================================
    // 8. 60FPS SIMULATION WITH COLLISION DETECTION & INTERIOR VIEW CAMERA
    // =========================================================================
    let animId = 0;
    const clock = new THREE.Clock();
    let walkPhase = 0;

    // Fast Axis-Aligned Bounding Box Collision Check
    const checkCollision = (cx: number, cz: number, radius: number): boolean => {
      for (const col of collidersRef.current) {
        if (
          cx + radius > col.minX &&
          cx - radius < col.maxX &&
          cz + radius > col.minZ &&
          cz - radius < col.maxZ
        ) {
          return true;
        }
      }
      return false;
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const cur = stateRef.current;

      // 1. DRIVING CAR SIMULATION WITH SOLID COLLISION
      if (cur.isDrivingCar) {
        playerGrp.visible = false;
        const carPhys = carPhysicsRef.current;
        const activeCar = cur.ownedCars.find((c) => c.id === cur.activeCarId) || cur.ownedCars[0] || {
          maxSpeed: 25,
          acceleration: 1.5,
          handling: 1.5,
        };

        const accelRate = activeCar.acceleration * 14;
        const maxSpd = activeCar.maxSpeed;

        if (keys.has('w') || keys.has('arrowup')) {
          carPhys.speed = Math.min(maxSpd, carPhys.speed + accelRate * dt);
        } else if (keys.has('s') || keys.has('arrowdown')) {
          carPhys.speed = Math.max(-maxSpd * 0.4, carPhys.speed - accelRate * 1.5 * dt);
        } else {
          carPhys.speed *= 0.96;
        }

        const steerSpeed = activeCar.handling * 2.2;
        if (keys.has('a') || keys.has('arrowleft')) {
          carPhys.steering = Math.max(-0.55, carPhys.steering - steerSpeed * dt);
        } else if (keys.has('d') || keys.has('arrowright')) {
          carPhys.steering = Math.min(0.55, carPhys.steering + steerSpeed * dt);
        } else {
          carPhys.steering *= 0.8;
        }

        if (Math.abs(carPhys.speed) > 0.1) {
          carPhys.rotationY += carPhys.steering * (carPhys.speed / maxSpd) * 2.5 * dt;
        }

        // Test Candidate Car Position against Building/Wall Colliders
        const nextCarX = carPhys.x + Math.sin(carPhys.rotationY) * carPhys.speed * dt;
        const nextCarZ = carPhys.z + Math.cos(carPhys.rotationY) * carPhys.speed * dt;

        // Car collision radius ~1.2m
        if (checkCollision(nextCarX, nextCarZ, 1.2)) {
          // Bump and bounce with friction
          carPhys.speed = -carPhys.speed * 0.35;
        } else {
          carPhys.x = Math.max(-55, Math.min(75, nextCarX));
          carPhys.z = Math.max(-85, Math.min(85, nextCarZ));
        }

        carMeshGroup.position.set(carPhys.x, 0, carPhys.z);
        carMeshGroup.rotation.y = carPhys.rotationY;

        const wheelRoll = (carPhys.speed / 0.35) * dt;
        carWheelsRef.current.forEach((w, idx) => {
          w.rotation.x += wheelRoll;
          if (idx < 2) w.rotation.y = carPhys.steering * 0.8;
        });

        cur.onSpeedUpdate(Math.round(Math.abs(carPhys.speed)));

        // Camera Follows Car using Yaw & Pitch Orbit
        const yaw = cameraYawRef.current + carPhys.rotationY;
        const pitch = cameraPitchRef.current;
        const dist = cameraDistRef.current;

        const camTarget = new THREE.Vector3(carPhys.x, 1.2, carPhys.z);
        const camOffset = new THREE.Vector3(
          carPhys.x - Math.sin(yaw) * Math.cos(pitch) * dist,
          Math.sin(pitch) * dist + 1.2,
          carPhys.z - Math.cos(yaw) * Math.cos(pitch) * dist
        );
        camera.position.lerp(camOffset, 0.12);
        camera.lookAt(camTarget);
      } else {
        // 2. ON-FOOT WALKING SIMULATION WITH SLIDING COLLISION & CAMERA-RELATIVE CONTROLS
        playerGrp.visible = true;
        cur.onSpeedUpdate(0);

        let inputX = 0;
        let inputZ = 0;
        if (keys.has('w') || keys.has('arrowup')) inputZ -= 1;
        if (keys.has('s') || keys.has('arrowdown')) inputZ += 1;
        if (keys.has('a') || keys.has('arrowleft')) inputX -= 1;
        if (keys.has('d') || keys.has('arrowright')) inputX += 1;

        const isWalking = inputX !== 0 || inputZ !== 0;
        const walkSpeed = keys.has('shift') ? 6.5 : 4.2;

        if (isWalking) {
          // Camera-Relative Movement (W moves forward in camera view direction!)
          const yaw = cameraYawRef.current;
          const forwardVec = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
          const rightVec = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
          const moveVec = new THREE.Vector3()
            .addScaledVector(forwardVec, -inputZ)
            .addScaledVector(rightVec, inputX)
            .normalize();

          const curPos = humanPosRef.current;
          const nextX = curPos.x + moveVec.x * walkSpeed * dt;
          const nextZ = curPos.z + moveVec.z * walkSpeed * dt;
          const pRadius = 0.38;

          // Test X axis movement
          if (!checkCollision(nextX, curPos.z, pRadius)) {
            curPos.x = nextX;
          }
          // Test Z axis movement
          if (!checkCollision(curPos.x, nextZ, pRadius)) {
            curPos.z = nextZ;
          }

          playerGrp.position.copy(curPos);

          const targetRot = Math.atan2(moveVec.x, moveVec.z);
          playerGrp.rotation.y = targetRot;
          humanRotRef.current = targetRot;

          walkPhase += dt * walkSpeed * 3;
          const swing = Math.sin(walkPhase) * 0.6;
          pLegL.rotation.x = swing;
          pLegR.rotation.x = -swing;
        } else {
          pLegL.rotation.x = 0;
          pLegR.rotation.x = 0;
        }

        // Check if player is inside the House or inside any City Shop
        const px = playerGrp.position.x;
        const pz = playerGrp.position.z;
        const insideHouse = px > -25 && px < -5 && pz > 0 && pz < 15;
        const insideShop = px > 20 && px < 56 && pz > -28 && pz < 32;
        const isInside = insideHouse || insideShop;
        isInsideBuildingRef.current = isInside;

        // Camera Follows Human with Orbit POV + Automatic Interior Adjustment
        const yaw = cameraYawRef.current;
        const basePitch = cameraPitchRef.current;
        const baseDist = cameraDistRef.current;

        // When entering a building, automatically lower pitch and pull camera inside for clear visibility!
        const effectivePitch = isInside ? Math.min(basePitch, 0.48) : basePitch;
        const effectiveDist = isInside ? Math.min(baseDist, 6.2) : baseDist;

        const camTarget = new THREE.Vector3(playerGrp.position.x, isInside ? 1.3 : 1.5, playerGrp.position.z);
        const camPos = new THREE.Vector3(
          playerGrp.position.x - Math.sin(yaw) * Math.cos(effectivePitch) * effectiveDist,
          camTarget.y + Math.sin(effectivePitch) * effectiveDist,
          playerGrp.position.z - Math.cos(yaw) * Math.cos(effectivePitch) * effectiveDist
        );
        camera.position.lerp(camPos, 0.1);
        camera.lookAt(camTarget);
      }

      // 3. SCRIPTED AIMLESS WALKING NPCS
      npcMeshes.forEach((npcObj) => {
        const data = npcObj.data;
        const targetWp = data.waypoints[data.currentWaypointIdx];
        const targetVec = new THREE.Vector3(targetWp[0], 0, targetWp[1]);

        const dir = new THREE.Vector3().subVectors(targetVec, npcObj.group.position);
        const dist = dir.length();

        if (dist < 0.6) {
          data.currentWaypointIdx = (data.currentWaypointIdx + 1) % data.waypoints.length;
        } else {
          dir.normalize();
          npcObj.group.position.addScaledVector(dir, 1.8 * dt);
          npcObj.group.rotation.y = Math.atan2(dir.x, dir.z);

          const swing = Math.sin(clock.getElapsedTime() * 5 + data.currentWaypointIdx) * 0.5;
          npcObj.legL.rotation.x = swing;
          npcObj.legR.rotation.x = -swing;
        }
      });

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      <div ref={containerRef} className="w-full h-full cursor-default select-none" />

      {/* Placement Restriction Error Banner */}
      {placementError && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-rose-500/90 text-white text-xs font-bold shadow-xl border border-white/20">
          {placementError}
        </div>
      )}

      {/* Placing Item Guide Banner */}
      {activePlacingItem && (
        <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-amber-500 text-slate-950 px-4 py-2 rounded-xl font-semibold text-xs shadow-xl">
          <span>
            Placing: <strong>{activePlacingItem.name}</strong> ({activePlacingItem.placementType === 'wall_only' ? 'Point on an Interior Wall' : activePlacingItem.placementType === 'backyard_only' ? 'Point in the Backyard' : 'Click to Place'})
          </span>
          <button
            onClick={onCancelPlacing}
            className="px-2 py-0.5 rounded bg-slate-950 text-white text-xs font-bold"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
