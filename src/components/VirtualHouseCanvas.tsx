import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ActiveVehicleType,
  BoatPhysics,
  CarPhysics,
  CarVehicle,
  CatalogItem,
  GroceryInventory,
  GroceryItem,
  HelicopterPhysics,
  NPCData,
  PlacedItem,
  PlacedPet,
} from '../types/housesim';
import {
  buildBoat3DModel,
  buildCar3DModel,
  buildHelicopter3DModel,
  buildItem3DModel,
  buildPet3DModel,
} from '../utils/world3DBuilder';
import { soundFX } from '../utils/soundEffects';
import { CITY_NPCS, PETS_CATALOG } from '../data/catalog';

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
  activeVehicle?: ActiveVehicleType;
  onEnterVehicle?: (type: 'car' | 'boat' | 'helicopter') => void;
  onExitVehicle?: () => void;
  onAltitudeUpdate?: (altMeters: number) => void;
  initialBoatPos?: { x: number; z: number; rotationY: number };
  initialHeliPos?: { x: number; y: number; z: number; rotationY: number };
  onSavePositions?: (
    playerPos: [number, number, number],
    carPos: { x: number; z: number; rotationY: number },
    boatPos?: { x: number; z: number; rotationY: number },
    heliPos?: { x: number; y: number; z: number; rotationY: number }
  ) => void;
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
  onOpenGroceryStore?: () => void;
  groceryInventory?: GroceryInventory;
  onBuyGrocery?: (item: GroceryItem, qty?: number) => void;
  onUseGroceryItem?: (itemId: string) => void;
  onSpeedUpdate: (speedMph: number) => void;
  onBonusCash?: (amount: number, reason: string) => void;
  onShowToast?: (message: string) => void;
  initialPlayerPos?: [number, number, number];
  initialCarPos?: { x: number; z: number; rotationY: number };
  carFuel?: number;
  hasGasJug?: boolean;
  onFuelUpdate?: (fuel: number) => void;
  onBuyGasJug?: () => void;
  onRefuelCarWithJug?: () => void;
  onRefuelAtPump?: () => void;
  respawnSignal?: number;
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
  activeVehicle,
  onEnterVehicle,
  onExitVehicle,
  onAltitudeUpdate,
  initialBoatPos,
  initialHeliPos,
  onBonusCash,
  onShowToast,
  onPlaceItem,
  onCancelPlacing,
  onInteractWithNPC,
  onInteractWithPet,
  onOpenShop,
  onOpenWorkplace,
  onOpenGroceryStore,
  groceryInventory = {},
  onBuyGrocery,
  onUseGroceryItem,
  onSpeedUpdate,
  initialPlayerPos,
  initialCarPos,
  onSavePositions,
  carFuel = 100,
  hasGasJug = false,
  onFuelUpdate,
  onBuyGasJug,
  onRefuelCarWithJug,
  onRefuelAtPump,
  respawnSignal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [crashNotification, setCrashNotification] = useState<string | null>(null);
  const [nearbyPrompt, setNearbyPrompt] = useState<{ text: string; icon: string; actionId: string } | null>(null);
  const [placingAngleDeg, setPlacingAngleDeg] = useState<number>(0);
  const placingRotationRef = useRef<number>(0);

  const isExplodingRef = useRef<boolean>(false);
  const explosionTimerRef = useRef<number>(0);
  const cameraShakeRef = useRef<number>(0);
  const espressoSpeedBoostTimerRef = useRef<number>(0);

  // Latest props reference for 60fps animation loop
  const stateRef = useRef({
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
    activeVehicle,
    onEnterVehicle,
    onExitVehicle,
    onAltitudeUpdate,
    onBonusCash,
    onShowToast,
    onPlaceItem,
    onCancelPlacing,
    onInteractWithNPC,
    onInteractWithPet,
    onOpenShop,
    onOpenWorkplace,
    onOpenGroceryStore,
    groceryInventory,
    onBuyGrocery,
    onUseGroceryItem,
    onSpeedUpdate,
    initialPlayerPos,
    initialCarPos,
    initialBoatPos,
    initialHeliPos,
    onSavePositions,
    carFuel,
    hasGasJug,
    onFuelUpdate,
    onBuyGasJug,
    onRefuelCarWithJug,
    onRefuelAtPump,
  });

  useEffect(() => {
    stateRef.current = {
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
      activeVehicle,
      onEnterVehicle,
      onExitVehicle,
      onAltitudeUpdate,
      onBonusCash,
      onShowToast,
      onPlaceItem,
      onCancelPlacing,
      onInteractWithNPC,
      onInteractWithPet,
      onOpenShop,
      onOpenWorkplace,
      onOpenGroceryStore,
      groceryInventory,
      onBuyGrocery,
      onUseGroceryItem,
      onSpeedUpdate,
      initialPlayerPos,
      initialCarPos,
      initialBoatPos,
      initialHeliPos,
      onSavePositions,
      carFuel,
      hasGasJug,
      onFuelUpdate,
      onBuyGasJug,
      onRefuelCarWithJug,
      onRefuelAtPump,
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
  const drivewayRef = useRef<THREE.Mesh | null>(null);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const collidersRef = useRef<BoxCollider[]>([]);

  // Vehicles Physics State (Persisted)
  const carPhysicsRef = useRef<CarPhysics>({
    x: initialCarPos?.x ?? -4.0,
    z: initialCarPos?.z ?? 14.0,
    rotationY: initialCarPos?.rotationY ?? Math.PI / 2,
    speed: 0,
    steering: 0,
  });

  const boatPhysicsRef = useRef<BoatPhysics>({
    x: initialBoatPos?.x ?? -142,
    z: initialBoatPos?.z ?? 110,
    rotationY: initialBoatPos?.rotationY ?? -Math.PI / 2,
    speed: 0,
    steering: 0,
  });

  const helicopterPhysicsRef = useRef<HelicopterPhysics>({
    x: initialHeliPos?.x ?? 125,
    y: initialHeliPos?.y ?? 0.18,
    z: initialHeliPos?.z ?? -50,
    rotationY: initialHeliPos?.rotationY ?? 0,
    speed: 0,
    verticalSpeed: 0,
    tiltPitch: 0,
    tiltRoll: 0,
    rotorSpeed: 0,
  });

  // Vehicle Meshes Refs
  const activeBoatGroupRef = useRef<THREE.Group | null>(null);
  const boatPropellersRef = useRef<THREE.Mesh[]>([]);
  const boatWakeGroupRef = useRef<THREE.Group | null>(null);

  const activeHeliGroupRef = useRef<THREE.Group | null>(null);
  const mainRotorRef = useRef<THREE.Group | null>(null);
  const tailRotorRef = useRef<THREE.Group | null>(null);
  const heliBeaconLightRef = useRef<THREE.PointLight | null>(null);
  const heliGroundRingRef = useRef<THREE.Mesh | null>(null);

  // Interactive City Elements Refs
  const campfireActiveRef = useRef<boolean>(true);
  const campfireFlamesRef = useRef<THREE.Group | null>(null);
  const campfireLightRef = useRef<THREE.PointLight | null>(null);
  const cinemaScreenMeshRef = useRef<THREE.Mesh | null>(null);
  const cinemaChannelRef = useRef<number>(0);
  const fountainSparklesRef = useRef<THREE.Group | null>(null);
  const telescopeActiveRef = useRef<boolean>(false);
  const speedTrapCooldownRef = useRef<number>(0);
  const stuntJumpCooldownRef = useRef<number>(0);

  // Household Pets 3D Refs
  const petsGroupRef = useRef<THREE.Group | null>(null);
  const petRecordsRef = useRef<{
    instanceId: string;
    group: THREE.Group;
    data: PlacedPet;
    targetPos: THREE.Vector3;
    wanderTimer: number;
    legPhase: number;
  }[]>([]);

  // Human Position State (Persisted)
  const humanPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(
      initialPlayerPos ? initialPlayerPos[0] : -10.0,
      0,
      initialPlayerPos ? initialPlayerPos[2] : 7.5
    )
  );
  const humanRotRef = useRef<number>(0);

  // Camera Orbit & Zoom State (0.0 aligns directly with North-South avenues and house hallways)
  const cameraYawRef = useRef<number>(0.0);
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

  // Sync Spawned Household Pets in Player's House
  useEffect(() => {
    const pGroup = petsGroupRef.current;
    if (!pGroup) return;
    while (pGroup.children.length > 0) {
      pGroup.remove(pGroup.children[0]);
    }
    petRecordsRef.current = [];

    placedPets.forEach((pet) => {
      const catalogPet = PETS_CATALOG.find((p) => p.id === pet.petId) || {
        id: pet.petId,
        name: pet.customName,
        breed: 'Household Companion',
        price: 0,
        petType: pet.petType,
        color: pet.petType === 'bunny_lop' ? '#f8fafc' : pet.petType === 'cat_calico' ? '#f59e0b' : '#d97706',
        description: '',
      };

      const petMesh = buildPet3DModel(catalogPet);
      // Spawn safely inside player's house living room (x: ~ -11, z: ~ 8)
      let px = pet.position[0];
      let pz = pet.position[2];
      if (px > -4 || px < -22 || pz < 2 || pz > 14) {
        px = -11.0 + (Math.random() - 0.5) * 2.8;
        pz = 8.0 + (Math.random() - 0.5) * 2.2;
      }
      petMesh.position.set(px, 0, pz);
      petMesh.rotation.y = pet.rotationY || Math.random() * Math.PI * 2;
      pGroup.add(petMesh);

      petRecordsRef.current.push({
        instanceId: pet.instanceId,
        group: petMesh,
        data: pet,
        targetPos: new THREE.Vector3(px, 0, pz),
        wanderTimer: Math.random() * 3 + 1,
        legPhase: 0,
      });
    });
  }, [placedPets]);

  // Sync Ghost Placement Preview Model
  useEffect(() => {
    const ghostGroup = ghostMeshRef.current;
    if (!ghostGroup) return;

    while (ghostGroup.children.length > 0) {
      ghostGroup.remove(ghostGroup.children[0]);
    }

    if (!activePlacingItem) {
      ghostGroup.visible = false;
      setPlacementError(null);
      return;
    }

    const model = buildItem3DModel(activePlacingItem, true);
    // Make transparent preview material
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (Array.isArray(m.material)) {
          m.material = m.material.map((mat) => {
            const clone = mat.clone();
            clone.transparent = true;
            clone.opacity = 0.7;
            return clone;
          });
        } else if (m.material) {
          const clone = m.material.clone();
          clone.transparent = true;
          clone.opacity = 0.7;
          m.material = clone;
        }
      }
    });

    // Circular green placement indicator ring at base
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.75, 24),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ghostGroup.add(ring);
    ghostGroup.add(model);

    // Initial position in front of player
    ghostGroup.position.set(humanPosRef.current.x, 0.05, humanPosRef.current.z);
    ghostGroup.visible = true;
  }, [activePlacingItem]);

  // Handle Vehicle Respawn Signal
  useEffect(() => {
    if (!respawnSignal || respawnSignal === 0) return;

    // Reset Car to Home Driveway
    carPhysicsRef.current.x = -4.0;
    carPhysicsRef.current.z = 14.0;
    carPhysicsRef.current.rotationY = Math.PI / 2;
    carPhysicsRef.current.speed = 0;
    carPhysicsRef.current.steering = 0;
    if (activeCarGroupRef.current) {
      activeCarGroupRef.current.position.set(-4.0, 0, 14.0);
      activeCarGroupRef.current.rotation.y = Math.PI / 2;
    }

    // Reset Boat to Marina Slip
    boatPhysicsRef.current.x = -142;
    boatPhysicsRef.current.z = 110;
    boatPhysicsRef.current.rotationY = -Math.PI / 2;
    boatPhysicsRef.current.speed = 0;
    boatPhysicsRef.current.steering = 0;
    if (activeBoatGroupRef.current) {
      activeBoatGroupRef.current.position.set(-142, 0.25, 110);
      activeBoatGroupRef.current.rotation.y = -Math.PI / 2;
    }

    // Reset Helicopter to Airport Helipad
    helicopterPhysicsRef.current.x = 125;
    helicopterPhysicsRef.current.y = 0.18;
    helicopterPhysicsRef.current.z = -50;
    helicopterPhysicsRef.current.rotationY = 0;
    helicopterPhysicsRef.current.speed = 0;
    helicopterPhysicsRef.current.verticalSpeed = 0;
    helicopterPhysicsRef.current.tiltPitch = 0;
    helicopterPhysicsRef.current.tiltRoll = 0;
    if (activeHeliGroupRef.current) {
      activeHeliGroupRef.current.position.set(125, 0.18, -50);
      activeHeliGroupRef.current.rotation.set(0, 0, 0);
    }
  }, [respawnSignal]);

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

    // Ground Plane: EXPANDED OPEN-WORLD TERRAIN (520m x 520m)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x14231b, roughness: 0.95 });
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    groundMeshRef.current = groundMesh;

    // =========================================================================
    // 1. MASSIVE MULTI-DISTRICT ROAD NETWORK (3 North-South Avenues & 3 Crossways)
    // =========================================================================
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
    const stripeYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const stripeWhite = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });

    const addRoadSegment = (cx: number, cz: number, w: number, d: number, isNorthSouth: boolean) => {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(cx, 0.01, cz);
      road.receiveShadow = true;
      scene.add(road);

      // Center yellow stripe markers
      if (isNorthSouth) {
        for (let z = cz - d * 0.5 + 4; z <= cz + d * 0.5 - 4; z += 6) {
          if (Math.abs(z - (-6)) < 6 || Math.abs(z - (-80)) < 6 || Math.abs(z - 80) < 6) continue;
          const s = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 3.2), stripeYellow);
          s.rotation.x = -Math.PI / 2;
          s.position.set(cx, 0.02, z);
          scene.add(s);
        }
      } else {
        for (let x = cx - w * 0.5 + 4; x <= cx + w * 0.5 - 4; x += 6) {
          if (Math.abs(x - 8.5) < 6 || Math.abs(x - (-75)) < 6 || Math.abs(x - 85) < 6) continue;
          const s = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.24), stripeYellow);
          s.rotation.x = -Math.PI / 2;
          s.position.set(x, 0.02, cz);
          scene.add(s);
        }
      }
    };

    // 3 Major North-South Avenues (Length 350m each)
    addRoadSegment(8.5, 0, 9.5, 350, true); // Central Grand Avenue
    addRoadSegment(-75, 0, 9.0, 350, true); // West Highway (Mountain & Beach)
    addRoadSegment(85, 0, 9.0, 350, true); // East Boulevard (Airport & Speedway)

    // 3 Major East-West Crossways (Length 330m each)
    addRoadSegment(5, -80, 330, 9.0, false); // North Expressway (Mall & Lookout)
    addRoadSegment(5, -6, 330, 9.0, false); // Central Boulevard (Downtown & Shops)
    addRoadSegment(5, 80, 330, 9.0, false); // South Coast Highway (Beach & Cinema)

    // Zebra Crosswalks at Major Intersections
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
    [8.5, -75, 85].forEach((rx) => {
      [-80, -6, 80].forEach((rz) => {
        createCrosswalk(rx, rz + 5.5, true);
        createCrosswalk(rx, rz - 5.5, true);
        createCrosswalk(rx - 5.5, rz, false);
        createCrosswalk(rx + 5.5, rz, false);
      });
    });

    // Sidewalks
    const addSidewalk = (x: number, z: number, w: number, d: number) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), sidewalkMat);
      sw.position.set(x, 0.08, z);
      sw.receiveShadow = true;
      scene.add(sw);
    };

    addSidewalk(1.8, 42, 3.4, 76);
    addSidewalk(1.8, -48, 3.4, 76);
    addSidewalk(15.5, 42, 3.4, 76);
    addSidewalk(15.5, -48, 3.4, 76);

    // Street Lamps along Grand Avenue & Intersections
    for (let z = -140; z <= 140; z += 28) {
      if (Math.abs(z - (-6)) < 12 || Math.abs(z - (-80)) < 12 || Math.abs(z - 80) < 12) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.2, 8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      pole.position.set(15.5, 2.6, z);
      scene.add(pole);

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      lampHead.position.set(15.2, 5.1, z);
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
    drivewayRef.current = driveway;

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

    // 7. Metro Fresh Supermarket & Groceries (x: 28, z: -38)
    createWalkableBuilding('Metro Fresh Supermarket', 28, -38, 16, 13, '#064e3b', '#10b981', 'grocery');

    // Supermarket Wooden Produce Shelves & Crates
    const produceShelf1 = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.1, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
    );
    produceShelf1.position.set(24.5, 0.55, -39);
    cityGroup.add(produceShelf1);

    // Supermarket Refrigerator Display Unit (Milk, Drinks & Gelato)
    const marketFridge = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 2.3, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.3 })
    );
    marketFridge.position.set(34.8, 1.15, -38);
    cityGroup.add(marketFridge);

    // 8. Metro Gas Station & Emergency Refuel Station (x: 28, z: 48)
    const gasCanopy = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 14), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }));
    gasCanopy.position.set(28, 4.4, 48);
    cityGroup.add(gasCanopy);

    // Yellow Canopy Border Trim
    const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.2, 14.2), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    canopyTrim.position.set(28, 4.15, 48);
    cityGroup.add(canopyTrim);

    // Canopy Illuminated Sign "METRO GAS"
    const gasSignMesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.8, 0.25),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    gasSignMesh.position.set(28, 4.8, 41);
    cityGroup.add(gasSignMesh);

    // 4 Canopy Steel Support Pillars
    [
      [21, 43],
      [35, 43],
      [21, 53],
      [35, 53],
    ].forEach(([px, pz], idx) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.25, 4.4, 8),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
      );
      pillar.position.set(px, 2.2, pz);
      cityGroup.add(pillar);
      registerCollider(px - 0.4, px + 0.4, pz - 0.4, pz + 0.4, `Gas Station Pillar ${idx + 1}`);
    });

    // 2 Dual Electronic Gas Pumps with LED Fuel Meters
    for (const pz of [45, 51]) {
      const pumpGroup = new THREE.Group();
      pumpGroup.position.set(28, 0, pz);

      const pumpBody = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 2.0, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
      );
      pumpBody.position.y = 1.0;

      const pumpScreen = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.5, 0.95),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      pumpScreen.position.y = 1.35;

      const pumpTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.45, 0.25, 0.95),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      pumpTop.position.y = 2.05;

      pumpGroup.add(pumpBody, pumpScreen, pumpTop);
      pumpGroup.userData = { isGasPump: true };
      cityGroup.add(pumpGroup);
      registerCollider(27.1, 28.9, pz - 0.6, pz + 0.6, 'Metro Gas Pump');
    }

    // Gas Price Totem / Signpost
    const pricePole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 0.3), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    pricePole.position.set(36, 2.25, 40);
    const priceBoard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 0.4), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    priceBoard.position.set(36, 3.7, 40);
    const priceLcd = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.2), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    priceLcd.position.set(36, 3.7, 40.22);
    cityGroup.add(pricePole, priceBoard, priceLcd);
    registerCollider(35.5, 36.5, 39.5, 40.5, 'Gas Station Price Sign');

    // Gas Station 24/7 Snack & Convenience Mart
    createWalkableBuilding('Metro 24/7 Gas Mart', 15, 48, 11, 10, '#0f172a', '#22c55e', 'furniture');

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

    // =========================================================================
    // 3. EXPANDED OPEN-WORLD DISTRICTS & DESTINATIONS
    // =========================================================================

    // A. SUNSET BEACH & MARINA (South-West: X: -115, Z: 110)
    const beachSand = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.95 })
    );
    beachSand.rotation.x = -Math.PI / 2;
    beachSand.position.set(-115, 0.02, 110);
    beachSand.receiveShadow = true;
    cityGroup.add(beachSand);

    const oceanWater = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      })
    );
    oceanWater.rotation.x = -Math.PI / 2;
    oceanWater.position.set(-165, 0.04, 110);
    cityGroup.add(oceanWater);

    const pierWood = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.4, 55),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
    );
    pierWood.position.set(-125, 0.22, 110);
    pierWood.receiveShadow = true;
    cityGroup.add(pierWood);

    for (let pz = 86; pz <= 134; pz += 12) {
      const postL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 2.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x451a03 })
      );
      postL.position.set(-128.5, -0.6, pz);
      const postR = postL.clone();
      postR.position.x = -121.5;
      cityGroup.add(postL, postR);
    }

    // Marina Docking Gangway connecting Pier to Boat Slip
    const gangway = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.35, 4.0),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 })
    );
    gangway.position.set(-133, 0.22, 110);
    cityGroup.add(gangway);

    // Dock Cleats and Life Buoy
    const buoy = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.1, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444 })
    );
    buoy.position.set(-129, 0.6, 110);
    buoy.rotation.y = Math.PI / 2;
    cityGroup.add(buoy);

    // Beach Lounger & Umbrella
    const loungerGroup = new THREE.Group();
    loungerGroup.position.set(-102, 0.05, 108);
    const lBed = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 2.4), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
    const lPillow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 0.5), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    lPillow.position.set(0, 0.22, 0.85);
    const uPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
    uPole.position.set(1.2, 1.4, 0);
    const uTop = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }));
    uTop.position.set(1.2, 2.7, 0);
    loungerGroup.add(lBed, lPillow, uPole, uTop);
    loungerGroup.userData = { isBeachLounger: true };
    cityGroup.add(loungerGroup);

    // Boardwalk Smoothie & Snack Shack
    const smoothieShack = new THREE.Group();
    smoothieShack.position.set(-110, 0.05, 92);
    const sBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.0, 3.6), new THREE.MeshStandardMaterial({ color: 0x10b981 }));
    sBody.position.y = 1.5;
    const sRoof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    sRoof.rotation.y = Math.PI / 4;
    sRoof.position.y = 3.6;
    const sCounter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.6), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    sCounter.position.set(0, 0.9, 1.9);
    smoothieShack.add(sBody, sRoof, sCounter);
    smoothieShack.userData = { isSmoothieStand: true };
    cityGroup.add(smoothieShack);
    registerCollider(-113, -107, 89, 95, 'Boardwalk Smoothie Shack');

    for (const [px, pz] of [
      [-95, 90],
      [-95, 110],
      [-95, 130],
      [-105, 82],
      [-105, 138],
    ]) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.26, 4.0, 8),
        new THREE.MeshStandardMaterial({ color: 0x92400e })
      );
      trunk.position.set(px, 2.0, pz);
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(2.4, 1.2, 7),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 })
      );
      leaves.position.set(px, 4.2, pz);
      cityGroup.add(trunk, leaves);
      registerCollider(px - 0.3, px + 0.3, pz - 0.3, pz + 0.3, 'Palm Tree');
    }

    // B. GRAND PRIX SPEEDWAY & STUNT ARENA (South-East: X: 125, Z: 35)
    const trackPad = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    trackPad.rotation.x = -Math.PI / 2;
    trackPad.position.set(125, 0.015, 35);
    trackPad.receiveShadow = true;
    cityGroup.add(trackPad);

    const curbMatR = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const curbMatW = new THREE.MeshStandardMaterial({ color: 0xffffff });
    for (let i = 0; i < 18; i++) {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.18, 0.6),
        i % 2 === 0 ? curbMatR : curbMatW
      );
      curb.position.set(88 + i * 2.0, 0.09, -2);
      cityGroup.add(curb);
    }

    const rampGeo = new THREE.BoxGeometry(9.0, 0.4, 14.0);
    const ramp = new THREE.Mesh(
      rampGeo,
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 })
    );
    ramp.rotation.x = -0.22;
    ramp.position.set(125, 1.3, 35);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    cityGroup.add(ramp);

    const bleacher = new THREE.Mesh(
      new THREE.BoxGeometry(32, 4.0, 6.0),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 })
    );
    bleacher.position.set(125, 2.0, 70);
    bleacher.castShadow = true;
    cityGroup.add(bleacher);
    registerCollider(108, 142, 66, 74, 'Speedway Bleachers');

    // C. METRO AIRPORT & FLIGHT CENTER (North-East: X: 125, Z: -115)
    const runway = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 120),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    );
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(125, 0.015, -115);
    runway.receiveShadow = true;
    cityGroup.add(runway);

    for (let rz = -165; rz <= -65; rz += 8) {
      const rStripe = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4.0), stripeWhite);
      rStripe.rotation.x = -Math.PI / 2;
      rStripe.position.set(125, 0.02, rz);
      cityGroup.add(rStripe);
    }

    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(24, 7.5, 20),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
    );
    hangar.position.set(100, 3.75, -115);
    hangar.castShadow = true;
    cityGroup.add(hangar);
    registerCollider(87, 113, -126, -104, 'Airport Hangar');

    const plane = new THREE.Group();
    plane.position.set(125, 0, -115);
    const pFuse = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 11, 10),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc })
    );
    pFuse.rotation.x = Math.PI / 2;
    pFuse.position.y = 1.4;
    const pWings = new THREE.Mesh(
      new THREE.BoxGeometry(15, 0.15, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xdc2626 })
    );
    pWings.position.set(0, 1.5, 0);
    const pTail = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 2.2, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xdc2626 })
    );
    pTail.position.set(0, 2.2, -4.5);
    plane.add(pFuse, pWings, pTail);
    cityGroup.add(plane);
    registerCollider(117, 133, -121, -109, 'Parked Airplane');

    const heliPad = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6, 0.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    heliPad.position.set(125, 0.05, -50);
    cityGroup.add(heliPad);
    const hBarL = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 4.0), stripeYellow);
    hBarL.rotation.x = -Math.PI / 2;
    hBarL.position.set(123.5, 0.06, -50);
    const hBarR = hBarL.clone();
    hBarR.position.x = 126.5;
    const hBarMid = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.6), stripeYellow);
    hBarMid.rotation.x = -Math.PI / 2;
    hBarMid.position.set(125, 0.06, -50);
    cityGroup.add(hBarL, hBarR, hBarMid);

    // D. PINE MOUNTAIN LOOKOUT & CAMPGROUNDS (North-West: X: -115, Z: -115)
    for (let i = 0; i < 22; i++) {
      const mx = -135 + (i % 6) * 10 + (Math.random() - 0.5) * 4;
      const mz = -140 + Math.floor(i / 6) * 12 + (Math.random() - 0.5) * 4;
      const pTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 2.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x451a03 })
      );
      pTrunk.position.set(mx, 1.4, mz);
      const pCone = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, 4.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 })
      );
      pCone.position.set(mx, 4.5, mz);
      cityGroup.add(pTrunk, pCone);
      registerCollider(mx - 0.4, mx + 0.4, mz - 0.4, mz + 0.4, 'Pine Tree');
    }

    const tentMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    for (const [tx, tz] of [
      [-110, -110],
      [-120, -115],
    ]) {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.0, 4), tentMat);
      tent.rotation.y = Math.PI / 4;
      tent.position.set(tx, 1.0, tz);
      cityGroup.add(tent);
      registerCollider(tx - 1.2, tx + 1.2, tz - 1.2, tz + 1.2, 'Camp Tent');
    }

    const fireLight = new THREE.PointLight(0xf97316, 2.2, 14);
    fireLight.position.set(-115, 0.8, -112);
    cityGroup.add(fireLight);
    campfireLightRef.current = fireLight;

    const fireLogs = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.0, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0x1c1917 })
    );
    fireLogs.position.set(-115, 0.15, -112);
    fireLogs.userData = { isCampfire: true };
    cityGroup.add(fireLogs);

    const flameGroup = new THREE.Group();
    flameGroup.position.set(-115, 0.35, -112);
    for (let f = 0; f < 5; f++) {
      const flameMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.9, 5),
        new THREE.MeshBasicMaterial({ color: f % 2 === 0 ? 0xf97316 : 0xfacc15 })
      );
      flameMesh.position.set((Math.random() - 0.5) * 0.3, 0.35, (Math.random() - 0.5) * 0.3);
      flameGroup.add(flameMesh);
    }
    cityGroup.add(flameGroup);
    campfireFlamesRef.current = flameGroup;

    const tower = new THREE.Group();
    tower.position.set(-105, 0, -125);
    for (const [lx, lz] of [
      [-2, -2],
      [2, -2],
      [-2, 2],
      [2, 2],
    ]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 8.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x78350f })
      );
      leg.position.set(lx, 4.25, lz);
      tower.add(leg);
    }
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(6.0, 0.4, 6.0),
      new THREE.MeshStandardMaterial({ color: 0x92400e })
    );
    deck.position.y = 8.5;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.8, 2.2, 4),
      new THREE.MeshStandardMaterial({ color: 0x451a03 })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 11.0;
    tower.add(deck, roof);

    // Scenic Overlook Telescope on Tripod
    const telescope = new THREE.Group();
    telescope.position.set(0, 8.7, 2.4);
    const tStand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0x475569 }));
    tStand.position.y = 0.55;
    const tTube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 }));
    tTube.rotation.x = Math.PI / 2 + 0.25;
    tTube.position.set(0, 1.1, 0);
    telescope.add(tStand, tTube);
    telescope.userData = { isTelescope: true };
    tower.add(telescope);

    cityGroup.add(tower);
    registerCollider(-108, -102, -128, -122, 'Lookout Tower');

    // E. NORTHGATE MEGA SUPERMARKET (North: X: -35, Z: -80)
    createWalkableBuilding('Northgate Supermarket & Mall', -35, -80, 20, 15, '#3b82f6', '#facc15', 'furniture');

    // F. STARLIGHT DRIVE-IN CINEMA (South: X: 8.5, Z: 135)
    const movieScreen = new THREE.Mesh(
      new THREE.BoxGeometry(22, 11, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    movieScreen.position.set(8.5, 6.5, 142);
    cityGroup.add(movieScreen);
    cinemaScreenMeshRef.current = movieScreen;
    registerCollider(-3, 20, 141, 143, 'Drive-In Movie Screen');

    // Drive-In Speaker Post & Channel Switcher
    const speakerPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.3, 6), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    speakerPost.position.set(8.5, 0.65, 125);
    const speakerBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
    speakerBox.position.set(8.5, 1.35, 125);
    speakerBox.userData = { isCinemaSpeaker: true };
    cityGroup.add(speakerPost, speakerBox);

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
    const pDark = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const pShoes = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });

    const pHead = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), pSkin);
    pHead.position.y = 1.55;
    playerGrp.add(pHead);

    // Front Face Visor so facing direction (+Z) is unmistakably clear
    const pVisor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.06), pDark);
    pVisor.position.set(0, 1.57, 0.145);
    playerGrp.add(pVisor);

    // Baseball Cap with Front-Facing Brim (+Z)
    const pCap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), pJacket);
    pCap.position.set(0, 1.71, 0);
    const pBrim = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.14), pJacket);
    pBrim.position.set(0, 1.68, 0.2);
    playerGrp.add(pCap, pBrim);

    // Torso with front zipper
    const pTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.24), pJacket);
    pTorso.position.y = 1.06;
    playerGrp.add(pTorso);

    const pZipper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.02), pDark);
    pZipper.position.set(0, 1.06, 0.125);
    playerGrp.add(pZipper);

    const pLegL = new THREE.Group();
    pLegL.position.set(0.11, 0.74, 0);
    const pLegMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.74, 0.15), pPants);
    pLegMeshL.position.y = -0.37;
    pLegL.add(pLegMeshL);
    // Shoes pointing forward (+Z)
    const pShoeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.22), pShoes);
    pShoeL.position.set(0, -0.7, 0.04);
    pLegL.add(pShoeL);
    playerGrp.add(pLegL);

    const pLegR = new THREE.Group();
    pLegR.position.set(-0.11, 0.74, 0);
    const pLegMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.74, 0.15), pPants);
    pLegMeshR.position.y = -0.37;
    pLegR.add(pLegMeshR);
    const pShoeR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.22), pShoes);
    pShoeR.position.set(0, -0.7, 0.04);
    pLegR.add(pShoeR);
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

    // =========================================================================
    // 6B. SPAWNED DRIVEABLE MARINA YACHT / SPEEDBOAT
    // =========================================================================
    const boatModelData = buildBoat3DModel();
    const boatMeshGroup = boatModelData.group;
    boatMeshGroup.position.set(boatPhysicsRef.current.x, 0.25, boatPhysicsRef.current.z);
    boatMeshGroup.rotation.y = boatPhysicsRef.current.rotationY;
    scene.add(boatMeshGroup);
    activeBoatGroupRef.current = boatMeshGroup;
    boatPropellersRef.current = boatModelData.propellers;
    boatWakeGroupRef.current = boatModelData.wakeGroup;

    // =========================================================================
    // 6C. SPAWNED DRIVEABLE METRO HELICOPTER (Airport Helipad)
    // =========================================================================
    const heliModelData = buildHelicopter3DModel();
    const heliMeshGroup = heliModelData.group;
    heliMeshGroup.position.set(
      helicopterPhysicsRef.current.x,
      helicopterPhysicsRef.current.y,
      helicopterPhysicsRef.current.z
    );
    heliMeshGroup.rotation.y = helicopterPhysicsRef.current.rotationY;
    scene.add(heliMeshGroup);
    activeHeliGroupRef.current = heliMeshGroup;
    mainRotorRef.current = heliModelData.mainRotor;
    tailRotorRef.current = heliModelData.tailRotor;
    heliBeaconLightRef.current = heliModelData.beaconLight;

    // Downwash dust/wind ring on ground under helicopter
    const heliGroundRing = new THREE.Mesh(
      new THREE.RingGeometry(2.0, 5.5, 32),
      new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    heliGroundRing.rotation.x = -Math.PI / 2;
    heliGroundRing.position.set(125, 0.04, -50);
    heliGroundRing.visible = false;
    scene.add(heliGroundRing);
    heliGroundRingRef.current = heliGroundRing;

    // Placed Items Group
    const placedGroup = new THREE.Group();
    scene.add(placedGroup);
    placedGroupRef.current = placedGroup;

    // Spawned Household Pets Group in House
    const petsGroup = new THREE.Group();
    scene.add(petsGroup);
    petsGroupRef.current = petsGroup;

    // Ghost Placement Preview
    const ghostGroup = new THREE.Group();
    ghostGroup.visible = false;
    scene.add(ghostGroup);
    ghostMeshRef.current = ghostGroup;

    // =========================================================================
    // LOW-POLY EXPLOSION SYSTEM (Debris Shards, Expanding Ring & Flash Core)
    // =========================================================================
    const explosionGroup = new THREE.Group();
    scene.add(explosionGroup);

    const explosionLight = new THREE.PointLight(0xff6600, 0, 18);
    scene.add(explosionLight);

    interface ExplosionParticle {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      rotVel: THREE.Vector3;
      life: number;
      maxLife: number;
      initialScale: number;
    }
    const explosionParticles: ExplosionParticle[] = [];

    const triggerHouseExplosion = (crashX: number, crashZ: number) => {
      if (isExplodingRef.current) return;
      isExplodingRef.current = true;
      explosionTimerRef.current = 1.35;
      cameraShakeRef.current = 0.85;
      soundFX.playLowPolyExplosion();
      setCrashNotification('💥 HOUSE CRASH! Respawning at home...');

      explosionLight.position.set(crashX, 1.8, crashZ);
      explosionLight.intensity = 20;

      while (explosionGroup.children.length > 0) {
        explosionGroup.remove(explosionGroup.children[0]);
      }
      explosionParticles.length = 0;

      // 1. Central Low-Poly Fire Core (Expanding Icosahedron)
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff000 });
      const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), coreMat);
      coreMesh.position.set(crashX, 1.2, crashZ);
      explosionGroup.add(coreMesh);
      explosionParticles.push({
        mesh: coreMesh,
        vel: new THREE.Vector3(0, 1.2, 0),
        rotVel: new THREE.Vector3(6, 8, 5),
        life: 0,
        maxLife: 0.6,
        initialScale: 0.9,
      });

      // 2. Low-Poly Expanding Ground Shockwave Ring
      const shockMat = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const shockRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.7, 12), shockMat);
      shockRing.rotation.x = -Math.PI / 2;
      shockRing.position.set(crashX, 0.08, crashZ);
      explosionGroup.add(shockRing);
      explosionParticles.push({
        mesh: shockRing,
        vel: new THREE.Vector3(0, 0, 0),
        rotVel: new THREE.Vector3(0, 0, 0),
        life: 0,
        maxLife: 0.75,
        initialScale: 0.5,
      });

      // 3. Faceted Low-Poly Shards (Tetrahedrons, Icosahedrons, Cubes)
      const shardColors = [0xff4500, 0xffaa00, 0xffeb3b, 0xffffff, 0x334155, 0x0284c7];
      for (let i = 0; i < 42; i++) {
        const col = shardColors[i % shardColors.length];
        const pMat = new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.3,
          metalness: 0.1,
          flatShading: true,
        });

        let geo: THREE.BufferGeometry;
        const type = i % 3;
        if (type === 0) {
          geo = new THREE.TetrahedronGeometry(0.24 + Math.random() * 0.18, 0);
        } else if (type === 1) {
          geo = new THREE.IcosahedronGeometry(0.2 + Math.random() * 0.14, 0);
        } else {
          geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
        }

        const pMesh = new THREE.Mesh(geo, pMat);
        pMesh.position.set(
          crashX + (Math.random() - 0.5) * 0.6,
          0.9 + Math.random() * 0.8,
          crashZ + (Math.random() - 0.5) * 0.6
        );
        pMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        explosionGroup.add(pMesh);

        const angle = Math.random() * Math.PI * 2;
        const spd = 4.5 + Math.random() * 9.0;
        const up = 4.0 + Math.random() * 8.0;

        explosionParticles.push({
          mesh: pMesh,
          vel: new THREE.Vector3(Math.cos(angle) * spd, up, Math.sin(angle) * spd),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14
          ),
          life: 0,
          maxLife: 0.9 + Math.random() * 0.45,
          initialScale: 1.0,
        });
      }

      if (activeCarGroupRef.current) {
        activeCarGroupRef.current.visible = false;
      }
    };

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

      // Camera Keyboard Rotation Keys: I, J, K, L
      if (k === 'i' || k === 'j' || k === 'k' || k === 'l') {
        e.preventDefault();
      }

      // 'R' Key: Rotate Object during placement
      if ((k === 'r' || k === 'R') && !e.repeat && stateRef.current.activePlacingItem) {
        e.preventDefault();
        placingRotationRef.current = (placingRotationRef.current + Math.PI / 2) % (Math.PI * 2);
        const nextDeg = Math.round((placingRotationRef.current * 180) / Math.PI) % 360;
        setPlacingAngleDeg(nextDeg);
        if (ghostMeshRef.current) {
          ghostMeshRef.current.rotation.y = placingRotationRef.current;
        }
        soundFX.playRotateObject();
        stateRef.current.onShowToast?.(`🔄 Rotated ${stateRef.current.activePlacingItem.name} to ${nextDeg}°`);
        return;
      }

      // 'E' Key Interaction
      if (k === 'e' && !e.repeat) {
        const cur = stateRef.current;
        const curVehicle = cur.activeVehicle ?? (cur.isDrivingCar ? 'car' : null);

        // 1. If inside Car:
        if (curVehicle === 'car') {
          e.preventDefault();
          // Check if parked near Gas Station pump to refuel!
          const distToPump = Math.hypot(carPhysicsRef.current.x - 28, carPhysicsRef.current.z - 48);
          if (distToPump < 7.5) {
            if (cur.playerCash < 15) {
              cur.onShowToast?.('❌ Not enough cash! Refueling costs $15.');
              return;
            }
            cur.onBonusCash?.(-15, 'Gas Station Refuel');
            cur.onFuelUpdate?.(100);
            cur.onRefuelAtPump?.();
            soundFX.playFuelPump();
            cur.onShowToast?.('⛽ Tank filled to 100%! Ready to roll.');
            return;
          }

          cur.onExitVehicle ? cur.onExitVehicle() : cur.onExitCar();
          playerGrp.position.set(
            carPhysicsRef.current.x + Math.sin(carPhysicsRef.current.rotationY + Math.PI / 2) * 2.2,
            0,
            carPhysicsRef.current.z + Math.cos(carPhysicsRef.current.rotationY + Math.PI / 2) * 2.2
          );
          humanPosRef.current.copy(playerGrp.position);
          soundFX.playCarEngineStart();
          return;
        }

        // 2. If inside Boat:
        if (curVehicle === 'boat') {
          e.preventDefault();
          cur.onExitVehicle ? cur.onExitVehicle() : cur.onExitCar();
          playerGrp.position.set(-126, 0.25, Math.min(130, Math.max(90, boatPhysicsRef.current.z)));
          humanPosRef.current.copy(playerGrp.position);
          soundFX.playWaterSplash();
          return;
        }

        // 3. If inside Helicopter:
        if (curVehicle === 'helicopter') {
          // STRICT MIDAIR CHECK: Cannot leave helicopter midair!
          if (helicopterPhysicsRef.current.y <= 0.6) {
            e.preventDefault();
            cur.onExitVehicle ? cur.onExitVehicle() : cur.onExitCar();
            playerGrp.position.set(
              helicopterPhysicsRef.current.x + 2.5,
              0,
              helicopterPhysicsRef.current.z
            );
            humanPosRef.current.copy(playerGrp.position);
            soundFX.playCarEngineStart();
            return;
          } else {
            e.preventDefault();
            cur.onShowToast?.('🛬 Descending... Hold [E] until landed on the ground to exit.');
            return;
          }
        }

        // 4. On Foot: Check Interactive Objects in proximity

        // 0. Check Household Pets in House First!
        for (const record of petRecordsRef.current) {
          const dist = humanPosRef.current.distanceTo(record.group.position);
          if (dist < 2.5) {
            e.preventDefault();
            soundFX.playPetChirp();
            cur.onInteractWithPet(record.data);
            cur.onShowToast?.(`💖 You petted ${record.data.customName}! Tail is wagging happily!`);
            record.group.position.y = 0.25;
            return;
          }
        }

        // A. Pour Gas Jug into Stalled Car Tank
        const carDist = humanPosRef.current.distanceTo(
          new THREE.Vector3(carPhysicsRef.current.x, 0, carPhysicsRef.current.z)
        );
        if (carDist < 3.8 && cur.hasGasJug) {
          e.preventDefault();
          cur.onRefuelCarWithJug?.();
          cur.onFuelUpdate?.(65);
          soundFX.playGasPour();
          cur.onShowToast?.('⛽ Poured Fuel Jug into tank (+65% Gas)! Ready to drive.');
          return;
        }

        // B. Gas Station Pump (Buy Emergency Gas Jug on foot)
        const gasStationDist = humanPosRef.current.distanceTo(new THREE.Vector3(28, 0, 48));
        if (gasStationDist < 6.0) {
          e.preventDefault();
          if (cur.hasGasJug) {
            cur.onShowToast?.('🛢️ Filled Gas Jug in hand! Walk back to your car to refuel.');
            return;
          }
          if (cur.playerCash < 20) {
            cur.onShowToast?.('❌ Not enough cash! Emergency Gas Jug costs $20.');
            return;
          }
          cur.onBonusCash?.(-20, 'Emergency Gas Jug');
          cur.onBuyGasJug?.();
          soundFX.playFuelPump();
          cur.onShowToast?.('🛢️ Emergency Fuel Jug purchased & filled! Walk to your car to refuel.');
          return;
        }

        // C. Check Interacting with Placed House Furniture
        for (const placed of cur.placedItems) {
          const itemPos = new THREE.Vector3(placed.position[0], placed.position[1], placed.position[2]);
          const dist = humanPosRef.current.distanceTo(itemPos);
          if (dist < 2.6) {
            e.preventDefault();
            const itemId = placed.itemId;

            // 1. ESPRESSO MAKER (Requires Coffee Beans & Filters)
            if (
              itemId === 'item-espresso-maker' ||
              placed.name.toLowerCase().includes('espresso') ||
              placed.name.toLowerCase().includes('coffee')
            ) {
              const beans = cur.groceryInventory?.['grocery-coffee-beans'] || 0;
              const filters = cur.groceryInventory?.['grocery-coffee-filters'] || 0;
              if (beans > 0 && filters > 0) {
                cur.onUseGroceryItem?.('grocery-coffee-filters');
                soundFX.playCoffeeBrew();
                espressoSpeedBoostTimerRef.current = 45.0; // 45s speed boost!
                cur.onBonusCash?.(25, 'Espresso Artisan');
                cur.onShowToast?.('☕ Fresh double espresso brewed! Movement speed boosted (+35%) & earned +$25 Coffee Artisan bonus!');
              } else {
                soundFX.playInteractChime();
                cur.onShowToast?.('⚠️ Missing Espresso Beans & Filters! Visit Metro Fresh Supermarket down the road to buy ingredients.');
              }
              return;
            }

            // 2. SMART REFRIGERATOR (Grabs cold drinks/snacks)
            if (
              itemId === 'furn-fridge-smart' ||
              placed.name.toLowerCase().includes('fridge') ||
              placed.name.toLowerCase().includes('refrigerator')
            ) {
              const pantryItems = [
                'grocery-milk',
                'grocery-ice-cream',
                'grocery-soda',
                'grocery-apples',
                'grocery-bread',
                'grocery-popcorn',
              ];
              const available = pantryItems.find((id) => (cur.groceryInventory?.[id] || 0) > 0);
              if (available) {
                cur.onUseGroceryItem?.(available);
                soundFX.playSnackEat();
                cur.onBonusCash?.(15, 'Fridge Refreshment');
                cur.onShowToast?.('🧊 Grabbed a cold snack from the smart fridge! Energy recharged (+100%) & earned +$15 bonus!');
              } else {
                soundFX.playInteractChime();
                cur.onShowToast?.('🧊 Refrigerator is empty! Head to Metro Fresh Supermarket to stock up on delicious groceries.');
              }
              return;
            }

            // 3. BACKYARD BBQ GRILL (Requires Steaks / Burger Buns)
            if (
              itemId === 'outdoor-bbq-grill' ||
              placed.name.toLowerCase().includes('grill') ||
              placed.name.toLowerCase().includes('bbq')
            ) {
              const steaks = cur.groceryInventory?.['grocery-bbq-steak'] || 0;
              const buns = cur.groceryInventory?.['grocery-bread'] || 0;
              if (steaks > 0 || buns > 0) {
                if (steaks > 0) cur.onUseGroceryItem?.('grocery-bbq-steak');
                else cur.onUseGroceryItem?.('grocery-bread');
                soundFX.playCookingSizzle();
                cur.onBonusCash?.(40, 'Master Chef BBQ');
                cur.onShowToast?.('🥩 Sizzling gourmet steaks & brioche burgers grilled to perfection! +$40 Master Chef reward!');
              } else {
                soundFX.playInteractChime();
                cur.onShowToast?.('🥩 Need Prime Rib Steaks or Brioche Buns from Metro Fresh Supermarket to fire up the grill!');
              }
              return;
            }

            // 4. MOUNTED 4K OLED TV
            if (itemId === 'wall-mounted-oled-tv' || placed.name.toLowerCase().includes('tv')) {
              soundFX.playInteractChime();
              cur.onBonusCash?.(10, 'TV Entertainment');
              cur.onShowToast?.('📺 Switched to Championship Live Sports on 4K TV! Gained +$10 entertainment bonus!');
              return;
            }

            // 5. WORKSTATION DESK & LAPTOP
            if (
              itemId === 'item-laptop-pro' ||
              itemId === 'furn-gaming-desk' ||
              placed.name.toLowerCase().includes('laptop') ||
              placed.name.toLowerCase().includes('desk')
            ) {
              soundFX.playWorkTask();
              cur.onBonusCash?.(35, 'Freelance Coding');
              cur.onShowToast?.('💻 Finished freelance coding sprint on your workstation! Earned +$35 coding payout!');
              return;
            }

            // 6. VELVET SOFA & PLATFORM BED
            if (
              itemId === 'furn-sofa-velvet' ||
              itemId === 'furn-platform-bed' ||
              placed.name.toLowerCase().includes('sofa') ||
              placed.name.toLowerCase().includes('bed')
            ) {
              soundFX.playInteractChime();
              cur.onShowToast?.('🛋️ Resting comfortably in your cozy home! Energy fully recharged.');
              return;
            }

            // 7. BACKYARD POOL
            if (itemId === 'outdoor-inground-pool' || placed.name.toLowerCase().includes('pool')) {
              soundFX.playWaterSplash();
              cur.onBonusCash?.(20, 'Pool Swim');
              cur.onShowToast?.('🏊 Splashed into your private backyard swimming pool! Refreshing (+20 bonus)!');
              return;
            }

            // 8. RUSTIC FIREPIT
            if (itemId === 'outdoor-firepit' || placed.name.toLowerCase().includes('firepit')) {
              soundFX.playPlaceObject();
              cur.onShowToast?.('🔥 Roasted marshmallows over your stone firepit! Feeling cozy.');
              return;
            }

            // Generic Placed Item interaction
            soundFX.playInteractChime();
            cur.onShowToast?.(`✨ Interacted with ${placed.name}!`);
            return;
          }
        }

        // D. Boat boarding (Marina Slip)
        const boatDist = humanPosRef.current.distanceTo(
          new THREE.Vector3(boatPhysicsRef.current.x, 0, boatPhysicsRef.current.z)
        );
        if (boatDist < 5.5) {
          e.preventDefault();
          cur.onEnterVehicle ? cur.onEnterVehicle('boat') : cur.onEnterCar();
          soundFX.playBoatEngine();
          soundFX.playWaterSplash();
          return;
        }

        // E. Helicopter boarding (Airport Helipad)
        const heliDist = humanPosRef.current.distanceTo(
          new THREE.Vector3(helicopterPhysicsRef.current.x, 0, helicopterPhysicsRef.current.z)
        );
        if (heliDist < 4.5) {
          e.preventDefault();
          cur.onEnterVehicle ? cur.onEnterVehicle('helicopter') : cur.onEnterCar();
          soundFX.playHelicopterThump();
          return;
        }

        // F. Car boarding (Check fuel)
        if (carDist < 3.4) {
          e.preventDefault();
          if (cur.carFuel !== undefined && cur.carFuel <= 0) {
            soundFX.playEngineStall();
            cur.onShowToast?.('⚠️ Car is OUT OF GAS! Walk to the Gas Station (East Road) to buy a Fuel Jug ($20).');
            return;
          }
          cur.onEnterVehicle ? cur.onEnterVehicle('car') : cur.onEnterCar();
          soundFX.playCarEngineStart();
          return;
        }

        // G. Plaza Fountain (Coin Toss)
        const fountainDist = humanPosRef.current.distanceTo(new THREE.Vector3(48, 0, 48));
        if (fountainDist < 4.8) {
          e.preventDefault();
          soundFX.playCoinToss();
          const bonus = Math.random() > 0.4 ? 25 : 15;
          cur.onBonusCash?.(bonus, 'Fountain Wish');
          cur.onShowToast?.(`🍀 You tossed a lucky coin into the fountain! Won +$${bonus}!`);

          // Sparkle burst in 3D
          if (fountainSparklesRef.current) {
            for (let s = 0; s < 12; s++) {
              const spMesh = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.18, 0),
                new THREE.MeshBasicMaterial({ color: s % 2 === 0 ? 0x38bdf8 : 0xfacc15 })
              );
              spMesh.position.set((Math.random() - 0.5) * 2, 0.2, (Math.random() - 0.5) * 2);
              fountainSparklesRef.current.add(spMesh);
              setTimeout(() => {
                fountainSparklesRef.current?.remove(spMesh);
              }, 1200);
            }
          }
          return;
        }

        // H. Campfire
        const campDist = humanPosRef.current.distanceTo(new THREE.Vector3(-115, 0, -112));
        if (campDist < 4.0) {
          e.preventDefault();
          campfireActiveRef.current = !campfireActiveRef.current;
          if (campfireFlamesRef.current) campfireFlamesRef.current.visible = campfireActiveRef.current;
          if (campfireLightRef.current) campfireLightRef.current.intensity = campfireActiveRef.current ? 2.2 : 0;
          soundFX.playPlaceObject();
          cur.onShowToast?.(
            campfireActiveRef.current
              ? '🔥 Campfire rekindled! Glowing warm and cozy.'
              : '🔥 Campfire embers banked.'
          );
          return;
        }

        // I. Mountain Lookout Telescope
        const teleDist = humanPosRef.current.distanceTo(new THREE.Vector3(-105, 0, -125));
        if (teleDist < 4.5) {
          e.preventDefault();
          telescopeActiveRef.current = !telescopeActiveRef.current;
          soundFX.playInteractChime();
          if (telescopeActiveRef.current) {
            cameraPitchRef.current = 0.25;
            cameraYawRef.current = Math.PI * 0.75;
            cameraDistRef.current = 24.0;
            cur.onShowToast?.('🔭 Looking through the Scenic Telescope! Panoramic view of the metropolis.');
          } else {
            cameraPitchRef.current = 0.65;
            cameraYawRef.current = 0.0;
            cameraDistRef.current = 11.0;
          }
          return;
        }

        // J. Drive-In Cinema Speaker
        const cinemaDist = humanPosRef.current.distanceTo(new THREE.Vector3(8.5, 0, 125));
        if (cinemaDist < 7.5) {
          e.preventDefault();
          cinemaChannelRef.current = (cinemaChannelRef.current + 1) % 4;
          const channels = [
            { name: 'NEON SUNSET HIGHWAY', color: 0xf43f5e },
            { name: 'CYBER CITY 2099', color: 0x06b6d4 },
            { name: 'GRAND PRIX NITRO', color: 0xeab308 },
            { name: 'DEEP SPACE ODYSSEY', color: 0x8b5cf6 },
          ];
          const activeCh = channels[cinemaChannelRef.current];
          if (cinemaScreenMeshRef.current) {
            (cinemaScreenMeshRef.current.material as THREE.MeshBasicMaterial).color.setHex(activeCh.color);
          }
          soundFX.playInteractChime();
          cur.onShowToast?.(`🎬 Drive-In Screen switched to: ${activeCh.name}`);
          return;
        }

        // K. Boardwalk Smoothie Stand
        const smoothieDist = humanPosRef.current.distanceTo(new THREE.Vector3(-110, 0, 92));
        if (smoothieDist < 4.2) {
          e.preventDefault();
          soundFX.playWorkTask();
          cur.onBonusCash?.(-8, 'Smoothie');
          cur.onShowToast?.('🥥 Sipped an ice-cold Coconut Mango Smoothie! Feeling energized!');
          return;
        }

        // L. Beach Lounger
        const loungerDist = humanPosRef.current.distanceTo(new THREE.Vector3(-102, 0, 108));
        if (loungerDist < 3.2) {
          e.preventDefault();
          soundFX.playInteractChime();
          cur.onShowToast?.('🏖️ Resting under the beach umbrella listening to the ocean breeze...');
          return;
        }

        // M. NPC Interaction
        for (const npc of npcMeshes) {
          const dist = humanPosRef.current.distanceTo(npc.group.position);
          if (dist < 3.2) {
            cur.onInteractWithNPC(npc.data);
            soundFX.playInteractChime();
            return;
          }
        }

        // N. Pet Interaction
        for (const pet of cur.placedPets) {
          const petVec = new THREE.Vector3(pet.position[0], pet.position[1], pet.position[2]);
          if (humanPosRef.current.distanceTo(petVec) < 2.5) {
            cur.onInteractWithPet(pet);
            soundFX.playPetSound(pet.petType === 'cat_calico' ? 'cat' : pet.petType === 'bunny_lop' ? 'bunny' : 'dog');
            return;
          }
        }

        // O. City Commercial Shops & Supermarket
        for (const bldg of cityGroup.children) {
          if (bldg.userData?.isShop) {
            const dist = humanPosRef.current.distanceTo(bldg.position);
            if (dist < 8.0) {
              if (bldg.userData.shopType === 'workplace') {
                cur.onOpenWorkplace();
              } else if (bldg.userData.shopType === 'grocery') {
                if (cur.onOpenGroceryStore) cur.onOpenGroceryStore();
                else cur.onOpenShop('grocery');
              } else {
                cur.onOpenShop(bldg.userData.shopType);
              }
              soundFX.playInteractChime();
              return;
            }
          }
        }
      }

      // 'F' Key: Emergency Helicopter Disembark / Landing Key
      if (k === 'f' && !e.repeat) {
        const cur = stateRef.current;
        const curVehicle = cur.activeVehicle ?? (cur.isDrivingCar ? 'car' : null);
        if (curVehicle === 'helicopter') {
          e.preventDefault();
          if (helicopterPhysicsRef.current.y > 0.6) {
            cur.onShowToast?.('⚠️ Cannot exit helicopter mid-air! Hold [E] to land safely first.');
            return;
          }
          cur.onExitVehicle ? cur.onExitVehicle() : cur.onExitCar();
          playerGrp.position.set(
            helicopterPhysicsRef.current.x + 2.5,
            0,
            helicopterPhysicsRef.current.z
          );
          humanPosRef.current.copy(playerGrp.position);
          soundFX.playCarEngineStart();
          return;
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
        cameraPitchRef.current = Math.max(0.12, Math.min(1.42, cameraPitchRef.current - dy * 0.0055));
        pointerPos = { x: e.clientX, y: e.clientY };
        return;
      }

      // Handle item placement raycasting
      const activeItem = stateRef.current.activePlacingItem;
      const ghostGroup = ghostMeshRef.current;
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
          // If hovering over ground or other surface, show helpful reminder
          const groundHits = raycaster.intersectObjects(
            [...floorMeshesRef.current, ...backyardMeshesRef.current, groundMeshRef.current].filter(Boolean) as THREE.Object3D[],
            false
          );
          if (groundHits.length > 0) {
            ghostGroup.visible = true;
            ghostGroup.position.set(groundHits[0].point.x, 0.05, groundHits[0].point.z);
            setPlacementError('Point cursor at an interior wall to mount this wall item!');
          }
        }
      } else if (activeItem.placementType === 'backyard_only') {
        const targets = [
          ...backyardMeshesRef.current,
          ...floorMeshesRef.current,
          drivewayRef.current,
          groundMeshRef.current,
        ].filter(Boolean) as THREE.Object3D[];
        const hits = raycaster.intersectObjects(targets, false);
        if (hits.length > 0) {
          const hit = hits[0];
          ghostGroup.visible = true;
          ghostGroup.position.set(hit.point.x, 0.05, hit.point.z);
          ghostGroup.rotation.y = placingRotationRef.current;
          setPlacementError(null);
        }
      } else {
        // Floor, Furniture, Electronics, Everyday, Outdoor items
        const targets = [
          ...floorMeshesRef.current,
          ...backyardMeshesRef.current,
          drivewayRef.current,
          groundMeshRef.current,
        ].filter(Boolean) as THREE.Object3D[];
        const hits = raycaster.intersectObjects(targets, false);
        if (hits.length > 0) {
          const hit = hits[0];
          ghostGroup.visible = true;
          ghostGroup.position.set(hit.point.x, 0.05, hit.point.z);
          ghostGroup.rotation.y = placingRotationRef.current;
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
          stateRef.current.onShowToast?.(`🖼️ Mounted ${activeItem.name} onto wall!`);
        } else {
          stateRef.current.onShowToast?.('⚠️ Please click directly on an interior house wall to mount this item.');
        }
      } else {
        // Floor, Backyard, Outdoor, Everyday items
        const targets = [
          ...floorMeshesRef.current,
          ...backyardMeshesRef.current,
          drivewayRef.current,
          groundMeshRef.current,
        ].filter(Boolean) as THREE.Object3D[];
        const hits = raycaster.intersectObjects(targets, false);
        if (hits.length > 0) {
          const hit = hits[0];
          stateRef.current.onPlaceItem(activeItem, [hit.point.x, 0.05, hit.point.z], placingRotationRef.current, false);
          soundFX.playPlaceObject();
          stateRef.current.onShowToast?.(`🛋️ Placed ${activeItem.name} in your home!`);
        } else {
          // Fallback to player's current position if raycast missed
          const px = humanPosRef.current.x;
          const pz = humanPosRef.current.z;
          stateRef.current.onPlaceItem(activeItem, [px, 0.05, pz], placingRotationRef.current, false);
          soundFX.playPlaceObject();
          stateRef.current.onShowToast?.(`🛋️ Placed ${activeItem.name} at your feet!`);
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
    let saveTimer = 0;

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
      const curVehicle = cur.activeVehicle ?? (cur.isDrivingCar ? 'car' : null);

      // =======================================================================
      // CAMERA ROTATION CONTROLS (I, J, K, L Keys + Mouse Orbit)
      // I: Tilt Up · K: Tilt Down · J: Orbit Left · L: Orbit Right
      // =======================================================================
      const camRotSpeed = 2.4;
      const camPitchSpeed = 1.6;
      if (keys.has('j')) {
        cameraYawRef.current += camRotSpeed * dt;
      }
      if (keys.has('l')) {
        cameraYawRef.current -= camRotSpeed * dt;
      }
      if (keys.has('i')) {
        cameraPitchRef.current = Math.min(1.42, cameraPitchRef.current + camPitchSpeed * dt);
      }
      if (keys.has('k')) {
        cameraPitchRef.current = Math.max(0.12, cameraPitchRef.current - camPitchSpeed * dt);
      }

      // =======================================================================
      // 1A. DRIVEABLE HELICOPTER SIMULATION (q=up, e=down/landing, w/s pitch, a/d yaw)
      // =======================================================================
      if (curVehicle === 'helicopter') {
        playerGrp.visible = false;
        const heliPhys = helicopterPhysicsRef.current;

        // Up & Down Controls:
        // Q = Up (Ascend)
        // E = Down (Descend, and landing)
        if (keys.has('q')) {
          heliPhys.verticalSpeed = Math.min(16.0, heliPhys.verticalSpeed + 22.0 * dt);
        } else if (keys.has('e')) {
          heliPhys.verticalSpeed = Math.max(-14.0, heliPhys.verticalSpeed - 22.0 * dt);
        } else {
          heliPhys.verticalSpeed *= 0.94; // Soft hovering auto-damp
        }

        // Directional Pitch & Forward/Backward (W / S)
        if (keys.has('w') || keys.has('arrowup')) {
          heliPhys.speed = Math.min(45.0, heliPhys.speed + 25.0 * dt);
          heliPhys.tiltPitch = THREE.MathUtils.lerp(heliPhys.tiltPitch, 0.22, 0.1);
        } else if (keys.has('s') || keys.has('arrowdown')) {
          heliPhys.speed = Math.max(-18.0, heliPhys.speed - 22.0 * dt);
          heliPhys.tiltPitch = THREE.MathUtils.lerp(heliPhys.tiltPitch, -0.18, 0.1);
        } else {
          heliPhys.speed *= 0.96;
          heliPhys.tiltPitch = THREE.MathUtils.lerp(heliPhys.tiltPitch, 0, 0.08);
        }

        // Directional Yaw & Roll (A / D)
        if (keys.has('a') || keys.has('arrowleft')) {
          heliPhys.rotationY += 2.4 * dt;
          heliPhys.tiltRoll = THREE.MathUtils.lerp(heliPhys.tiltRoll, -0.18, 0.12);
        } else if (keys.has('d') || keys.has('arrowright')) {
          heliPhys.rotationY -= 2.4 * dt;
          heliPhys.tiltRoll = THREE.MathUtils.lerp(heliPhys.tiltRoll, 0.18, 0.12);
        } else {
          heliPhys.tiltRoll = THREE.MathUtils.lerp(heliPhys.tiltRoll, 0, 0.08);
        }

        // Apply Vertical Altitude & Landing on Ground/Helipad
        heliPhys.y = Math.max(0.18, Math.min(135.0, heliPhys.y + heliPhys.verticalSpeed * dt));
        if (heliPhys.y <= 0.19) {
          heliPhys.y = 0.18;
          heliPhys.verticalSpeed = 0;
        }

        // Apply Horizontal Flight Movement
        heliPhys.x += Math.sin(heliPhys.rotationY) * heliPhys.speed * dt;
        heliPhys.z += Math.cos(heliPhys.rotationY) * heliPhys.speed * dt;

        // Clamp to open map boundaries
        heliPhys.x = Math.max(-235, Math.min(235, heliPhys.x));
        heliPhys.z = Math.max(-235, Math.min(235, heliPhys.z));

        // Update 3D Helicopter Group Position and Tilt
        if (activeHeliGroupRef.current) {
          activeHeliGroupRef.current.position.set(heliPhys.x, heliPhys.y, heliPhys.z);
          activeHeliGroupRef.current.rotation.set(heliPhys.tiltPitch, heliPhys.rotationY, heliPhys.tiltRoll);
        }

        // Spin Main Rotor and Tail Rotor
        if (mainRotorRef.current) mainRotorRef.current.rotation.y += 44.0 * dt;
        if (tailRotorRef.current) tailRotorRef.current.rotation.x += 52.0 * dt;

        // Flashing Anti-Collision Beacon
        if (heliBeaconLightRef.current) {
          heliBeaconLightRef.current.intensity = Math.sin(clock.getElapsedTime() * 9) > 0.35 ? 2.5 : 0;
        }

        // Ground Downwash Dust/Wind Ring
        if (heliGroundRingRef.current) {
          if (heliPhys.y < 16.0) {
            heliGroundRingRef.current.visible = true;
            heliGroundRingRef.current.position.set(heliPhys.x, 0.04, heliPhys.z);
            const scale = Math.max(1.0, heliPhys.y * 0.75);
            heliGroundRingRef.current.scale.set(scale, scale, 1);
            (heliGroundRingRef.current.material as THREE.MeshBasicMaterial).opacity =
              Math.max(0.05, 0.45 * (1 - heliPhys.y / 16.0));
          } else {
            heliGroundRingRef.current.visible = false;
          }
        }

        // Periodic Chopper Blade Thumping Audio
        if (Math.random() < 0.18) {
          soundFX.playHelicopterThump();
        }

        cur.onSpeedUpdate(Math.round(Math.abs(heliPhys.speed)));
        cur.onAltitudeUpdate?.(Math.round(heliPhys.y));

        // Follow Camera in 3D
        const yaw = cameraYawRef.current + heliPhys.rotationY;
        const pitch = cameraPitchRef.current;
        const dist = Math.max(9.5, cameraDistRef.current + Math.min(14, heliPhys.y * 0.15));

        const camTarget = new THREE.Vector3(heliPhys.x, heliPhys.y + 1.2, heliPhys.z);
        const camOffset = new THREE.Vector3(
          heliPhys.x - Math.sin(yaw) * Math.cos(pitch) * dist,
          heliPhys.y + Math.sin(pitch) * dist + 1.4,
          heliPhys.z - Math.cos(yaw) * Math.cos(pitch) * dist
        );
        camera.position.lerp(camOffset, 0.12);
        camera.lookAt(camTarget);

      // =======================================================================
      // 1B. DRIVEABLE MARINA YACHT / SPEEDBOAT SIMULATION
      // =======================================================================
      } else if (curVehicle === 'boat') {
        playerGrp.visible = false;
        const boatPhys = boatPhysicsRef.current;

        // Boat Throttle & Steering Controls
        if (keys.has('w') || keys.has('arrowup')) {
          boatPhys.speed = Math.min(32.0, boatPhys.speed + 18.0 * dt);
        } else if (keys.has('s') || keys.has('arrowdown')) {
          boatPhys.speed = Math.max(-12.0, boatPhys.speed - 14.0 * dt);
        } else {
          boatPhys.speed *= 0.965; // Water hydrodynamic drag
        }

        const maxRudder = 0.85;
        const rudderSpeed = 3.2;
        if (keys.has('a') || keys.has('arrowleft')) {
          boatPhys.steering = Math.max(-maxRudder, boatPhys.steering - rudderSpeed * dt);
        } else if (keys.has('d') || keys.has('arrowright')) {
          boatPhys.steering = Math.min(maxRudder, boatPhys.steering + rudderSpeed * dt);
        } else {
          boatPhys.steering *= 0.8;
        }

        if (Math.abs(boatPhys.speed) > 0.15) {
          boatPhys.rotationY -= boatPhys.steering * Math.sign(boatPhys.speed) * 2.8 * dt;
        }

        const nextBoatX = boatPhys.x + Math.sin(boatPhys.rotationY) * boatPhys.speed * dt;
        const nextBoatZ = boatPhys.z + Math.cos(boatPhys.rotationY) * boatPhys.speed * dt;

        // Water Boundaries: Ocean & Coastal Marina
        // If hitting shoreline / pier, gently cushion bounce
        if (nextBoatX > -122) {
          boatPhys.speed = -boatPhys.speed * 0.3;
          boatPhys.x = -122.5;
        } else {
          boatPhys.x = Math.max(-235, Math.min(-122, nextBoatX));
        }
        boatPhys.z = Math.max(15, Math.min(210, nextBoatZ));

        // Rhythmic water wave bobbing & hull banking into turn
        const waveBob = Math.sin(clock.getElapsedTime() * 2.8) * 0.06;
        const bankRoll = -boatPhys.steering * (boatPhys.speed / 32) * 0.22 + Math.cos(clock.getElapsedTime() * 1.6) * 0.02;

        if (activeBoatGroupRef.current) {
          activeBoatGroupRef.current.position.set(boatPhys.x, 0.25 + waveBob, boatPhys.z);
          activeBoatGroupRef.current.rotation.set(0.04 * (boatPhys.speed / 30), boatPhys.rotationY, bankRoll);
        }

        // Spin dual outboard propellers
        boatPropellersRef.current.forEach((prop) => {
          prop.rotation.z += (boatPhys.speed / 0.15) * dt;
        });

        // Water Wake trailing behind boat
        if (boatWakeGroupRef.current) {
          const isMoving = Math.abs(boatPhys.speed) > 1.2;
          boatWakeGroupRef.current.visible = isMoving;
          if (isMoving) {
            const scaleZ = 1.0 + Math.abs(boatPhys.speed) * 0.08;
            boatWakeGroupRef.current.scale.set(1.0 + Math.abs(boatPhys.speed) * 0.03, 1, scaleZ);
          }
        }

        if (Math.abs(boatPhys.speed) > 2.0 && Math.random() < 0.12) {
          soundFX.playBoatEngine();
        }

        cur.onSpeedUpdate(Math.round(Math.abs(boatPhys.speed)));

        // Camera Follows Boat
        const yaw = cameraYawRef.current + boatPhys.rotationY;
        const pitch = cameraPitchRef.current;
        const dist = cameraDistRef.current + 2.0;

        const camTarget = new THREE.Vector3(boatPhys.x, 1.4, boatPhys.z);
        const camOffset = new THREE.Vector3(
          boatPhys.x - Math.sin(yaw) * Math.cos(pitch) * dist,
          Math.sin(pitch) * dist + 1.5,
          boatPhys.z - Math.cos(yaw) * Math.cos(pitch) * dist
        );
        camera.position.lerp(camOffset, 0.12);
        camera.lookAt(camTarget);

      // =======================================================================
      // 1C. DRIVING CAR SIMULATION WITH SOLID COLLISION
      // =======================================================================
      } else if (curVehicle === 'car') {
        playerGrp.visible = false;
        const carPhys = carPhysicsRef.current;

        // --- ACTIVE EXPLOSION ANIMATION & RESPAWN SEQUENCE ---
        if (isExplodingRef.current) {
          explosionTimerRef.current -= dt;
          explosionLight.intensity = Math.max(0, explosionLight.intensity - dt * 16);

          for (let i = explosionParticles.length - 1; i >= 0; i--) {
            const p = explosionParticles[i];
            p.life += dt;
            const progress = p.life / p.maxLife;

            if (progress >= 1) {
              explosionGroup.remove(p.mesh);
              explosionParticles.splice(i, 1);
              continue;
            }

            p.vel.y -= 16.0 * dt; // Gravity
            p.mesh.position.addScaledVector(p.vel, dt);

            // Ground bounce
            if (p.mesh.position.y < 0.1) {
              p.mesh.position.y = 0.1;
              p.vel.y = -p.vel.y * 0.35;
              p.vel.x *= 0.65;
              p.vel.z *= 0.65;
            }

            p.mesh.rotation.x += p.rotVel.x * dt;
            p.mesh.rotation.y += p.rotVel.y * dt;
            p.mesh.rotation.z += p.rotVel.z * dt;

            const s = Math.max(0.01, p.initialScale * (1 - progress));
            p.mesh.scale.setScalar(s);
          }

          // Camera Shake
          if (cameraShakeRef.current > 0) {
            cameraShakeRef.current = Math.max(0, cameraShakeRef.current - dt * 1.6);
            camera.position.x += (Math.random() - 0.5) * cameraShakeRef.current * 0.5;
            camera.position.y += (Math.random() - 0.5) * cameraShakeRef.current * 0.5;
          }

          // When explosion completes: RESPAWN AT HOUSE!
          if (explosionTimerRef.current <= 0) {
            isExplodingRef.current = false;
            setCrashNotification(null);

            while (explosionGroup.children.length > 0) {
              explosionGroup.remove(explosionGroup.children[0]);
            }
            explosionParticles.length = 0;
            explosionLight.intensity = 0;

            // Reset Car to House Driveway
            carPhys.x = -4.5;
            carPhys.z = 14.0;
            carPhys.rotationY = 0;
            carPhys.speed = 0;
            carPhys.steering = 0;

            if (activeCarGroupRef.current) {
              activeCarGroupRef.current.position.set(-4.5, 0, 14.0);
              activeCarGroupRef.current.rotation.y = 0;
              activeCarGroupRef.current.visible = true;
            }

            // Reset Player to House Driveway
            humanPosRef.current.set(-4.5, 0, 14.0);
            playerGrp.position.set(-4.5, 0, 14.0);

            cameraYawRef.current = 0.0;
            soundFX.playCarEngineStart();
          }

          cur.onSpeedUpdate(0);
          renderer.render(scene, camera);
          return;
        }

        const activeCar = cur.ownedCars.find((c) => c.id === cur.activeCarId) || cur.ownedCars[0] || {
          maxSpeed: 25,
          acceleration: 1.5,
          handling: 1.5,
        };

        const accelRate = activeCar.acceleration * 14;
        const maxSpd = activeCar.maxSpeed;

        // --- FUEL DRAINAGE WHILE DRIVING ---
        if (cur.carFuel !== undefined) {
          if (Math.abs(carPhys.speed) > 0.4) {
            const drainRate = 0.55 + (Math.abs(carPhys.speed) / maxSpd) * 0.75;
            const newFuel = Math.max(0, cur.carFuel - drainRate * dt);
            if (Math.abs(newFuel - cur.carFuel) > 0.05 || newFuel === 0) {
              cur.onFuelUpdate?.(newFuel);
            }
            if (newFuel <= 0 && cur.carFuel > 0) {
              soundFX.playEngineStall();
              cur.onShowToast?.('⚠️ OUT OF GAS! Car has stalled. Walk to the Gas Station (East Road) for an Emergency Gas Jug ($20).');
            }
          }
        }

        // Acceleration & Braking (Disabled when Out of Gas!)
        if (cur.carFuel !== undefined && cur.carFuel <= 0) {
          carPhys.speed = THREE.MathUtils.lerp(carPhys.speed, 0, 0.08);
        } else {
          if (keys.has('w') || keys.has('arrowup')) {
            carPhys.speed = Math.min(maxSpd, carPhys.speed + accelRate * dt);
          } else if (keys.has('s') || keys.has('arrowdown')) {
            carPhys.speed = Math.max(-maxSpd * 0.4, carPhys.speed - accelRate * 1.5 * dt);
          } else {
            carPhys.speed *= 0.96;
          }
        }

        // --- SMOOTH & REALISTIC PROGRESSIVE STEERING (Significantly less sharp) ---
        const maxSteer = 0.52;
        const steerSpeed = activeCar.handling * 1.85;
        if (keys.has('a') || keys.has('arrowleft')) {
          carPhys.steering = Math.max(-maxSteer, carPhys.steering - steerSpeed * dt);
        } else if (keys.has('d') || keys.has('arrowright')) {
          carPhys.steering = Math.min(maxSteer, carPhys.steering + steerSpeed * dt);
        } else {
          carPhys.steering *= 0.86;
        }

        if (Math.abs(carPhys.speed) > 0.1) {
          // Smooth progressive angular rotation speed scaled comfortably by vehicle velocity
          const speedFactor = Math.min(1.0, Math.max(0.32, Math.abs(carPhys.speed) / 7.2));
          carPhys.rotationY -= carPhys.steering * Math.sign(carPhys.speed) * speedFactor * 1.65 * dt;
        }

        // Test Candidate Car Position against Building/Wall Colliders
        const nextCarX = carPhys.x + Math.sin(carPhys.rotationY) * carPhys.speed * dt;
        const nextCarZ = carPhys.z + Math.cos(carPhys.rotationY) * carPhys.speed * dt;

        // Check if car crashed into house wall or city building
        const hitCol = collidersRef.current.find((col) => {
          return (
            nextCarX + 1.2 > col.minX &&
            nextCarX - 1.2 < col.maxX &&
            nextCarZ + 1.2 > col.minZ &&
            nextCarZ - 1.2 < col.maxZ
          );
        });

        if (hitCol) {
          const nameLower = hitCol.name.toLowerCase();
          const isHouseOrBuilding =
            nameLower.includes('house') ||
            nameLower.includes('wall') ||
            nameLower.includes('fence') ||
            nameLower.includes('store') ||
            nameLower.includes('shop') ||
            nameLower.includes('dealership') ||
            nameLower.includes('depot') ||
            nameLower.includes('workplace');

          if (isHouseOrBuilding && Math.abs(carPhys.speed) > 1.2) {
            triggerHouseExplosion(carPhys.x, carPhys.z);
            return;
          } else {
            // Low speed gentle bump
            carPhys.speed = -carPhys.speed * 0.35;
          }
        } else {
          // Expanded 500m Open-World Driving Boundaries
          carPhys.x = Math.max(-175, Math.min(185, nextCarX));
          carPhys.z = Math.max(-185, Math.min(185, nextCarZ));
        }

        carMeshGroup.position.set(carPhys.x, 0, carPhys.z);
        carMeshGroup.rotation.y = carPhys.rotationY;

        const wheelRoll = (carPhys.speed / 0.35) * dt;
        carWheelsRef.current.forEach((w, idx) => {
          w.rotation.x += wheelRoll;
          if (idx < 2) w.rotation.y = -carPhys.steering * 0.7;
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
        // 2. ON-FOOT WALKING SIMULATION WITH SLIDING COLLISION & INTUITIVE CAMERA-RELATIVE CONTROLS
        // W / Up: Moves AWAY from camera into screen (Forward)
        // S / Down: Moves TOWARDS camera out of screen (Backward)
        // A / Left: Moves Screen-Left
        // D / Right: Moves Screen-Right
        // (Character turns to face movement direction; movement is NEVER locked to character facing)
        playerGrp.visible = true;
        cur.onSpeedUpdate(0);

        let inputForward = 0;
        let inputRight = 0;
        if (keys.has('w') || keys.has('arrowup')) inputForward += 1;
        if (keys.has('s') || keys.has('arrowdown')) inputForward -= 1;
        if (keys.has('d') || keys.has('arrowright')) inputRight += 1;
        if (keys.has('a') || keys.has('arrowleft')) inputRight -= 1;

        const isWalking = inputForward !== 0 || inputRight !== 0;
        if (espressoSpeedBoostTimerRef.current > 0) {
          espressoSpeedBoostTimerRef.current -= dt;
        }
        const baseWalkSpeed = keys.has('shift') ? 6.5 : 4.2;
        const walkSpeed = espressoSpeedBoostTimerRef.current > 0 ? baseWalkSpeed * 1.35 : baseWalkSpeed;

        if (isWalking) {
          // Camera horizontal forward vector (from camera position towards player target)
          // Camera position offset: (-sin(yaw) * cos(pitch) * dist, ..., -cos(yaw) * cos(pitch) * dist)
          // Vector towards target (forward into the screen): (+sin(yaw), 0, +cos(yaw))
          // Extract exact horizontal screen-forward and screen-right vectors from the active camera
          camera.updateMatrixWorld();
          const forwardVec = new THREE.Vector3();
          camera.getWorldDirection(forwardVec);
          forwardVec.y = 0;
          forwardVec.normalize();

          // Camera column 0 is local +X axis in world space, which directly points to screen-right
          const rightVec = new THREE.Vector3();
          rightVec.setFromMatrixColumn(camera.matrixWorld, 0);
          rightVec.y = 0;
          rightVec.normalize();

          const moveVec = new THREE.Vector3()
            .addScaledVector(forwardVec, inputForward)
            .addScaledVector(rightVec, inputRight)
            .normalize();

          const curPos = humanPosRef.current;
          const nextX = curPos.x + moveVec.x * walkSpeed * dt;
          const nextZ = curPos.z + moveVec.z * walkSpeed * dt;
          const pRadius = 0.38;

          // Test X axis movement against solid colliders
          if (!checkCollision(nextX, curPos.z, pRadius)) {
            curPos.x = nextX;
          }
          // Test Z axis movement against solid colliders
          if (!checkCollision(curPos.x, nextZ, pRadius)) {
            curPos.z = nextZ;
          }

          playerGrp.position.copy(curPos);

          // Smoothly rotate character to face the direction they are walking
          const targetRot = Math.atan2(moveVec.x, moveVec.z);
          let rotDiff = targetRot - playerGrp.rotation.y;
          while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
          while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
          playerGrp.rotation.y += rotDiff * Math.min(1, dt * 18);
          humanRotRef.current = playerGrp.rotation.y;

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
        // Check proximity for on-foot HUD prompts
        const hPos = humanPosRef.current;
        const distToBoat = hPos.distanceTo(new THREE.Vector3(boatPhysicsRef.current.x, 0, boatPhysicsRef.current.z));
        const distToHeli = hPos.distanceTo(new THREE.Vector3(helicopterPhysicsRef.current.x, 0, helicopterPhysicsRef.current.z));
        const distToCar = hPos.distanceTo(new THREE.Vector3(carPhysicsRef.current.x, 0, carPhysicsRef.current.z));
        const distToGasStation = hPos.distanceTo(new THREE.Vector3(28, 0, 48));
        const distToSupermarket = hPos.distanceTo(new THREE.Vector3(28, 0, -38));
        const distToFountain = hPos.distanceTo(new THREE.Vector3(48, 0, 48));
        const distToCamp = hPos.distanceTo(new THREE.Vector3(-115, 0, -112));
        const distToCinema = hPos.distanceTo(new THREE.Vector3(8.5, 0, 125));
        const distToSmoothie = hPos.distanceTo(new THREE.Vector3(-110, 0, 92));
        const distToTele = hPos.distanceTo(new THREE.Vector3(-105, 0, -125));

        // Check if near any household pet in house
        let nearbyPetPrompt: { text: string; icon: string; actionId: string } | null = null;
        for (const record of petRecordsRef.current) {
          const dist = hPos.distanceTo(record.group.position);
          if (dist < 2.5) {
            const pet = record.data;
            const icon = pet.petType === 'bunny_lop' ? '🐰' : pet.petType === 'cat_calico' ? '🐱' : '🐶';
            nearbyPetPrompt = {
              text: `Press [E] to Pet & Cuddle ${pet.customName || 'Pet'} (❤️ Happiness 100%)`,
              icon,
              actionId: `pet_${record.instanceId}`,
            };
            break;
          }
        }

        // Check if near any placed furniture in house
        let nearbyFurniturePrompt: { text: string; icon: string; actionId: string } | null = null;
        for (const placed of cur.placedItems) {
          const itemPos = new THREE.Vector3(placed.position[0], placed.position[1], placed.position[2]);
          if (hPos.distanceTo(itemPos) < 2.5) {
            const id = placed.itemId;
            if (id === 'item-espresso-maker' || placed.name.toLowerCase().includes('espresso') || placed.name.toLowerCase().includes('coffee')) {
              nearbyFurniturePrompt = { text: 'Press [E] to Brew Fresh Espresso (Requires Beans & Filters)', icon: '☕', actionId: 'espresso' };
            } else if (id === 'furn-fridge-smart' || placed.name.toLowerCase().includes('fridge')) {
              nearbyFurniturePrompt = { text: 'Press [E] to Open Refrigerator & Grab Chilled Snack', icon: '🧊', actionId: 'fridge' };
            } else if (id === 'outdoor-bbq-grill' || placed.name.toLowerCase().includes('grill') || placed.name.toLowerCase().includes('bbq')) {
              nearbyFurniturePrompt = { text: 'Press [E] to Sizzle Prime Steaks & Brioche Burgers', icon: '🥩', actionId: 'bbq' };
            } else if (id === 'wall-mounted-oled-tv' || placed.name.toLowerCase().includes('tv')) {
              nearbyFurniturePrompt = { text: 'Press [E] to Toggle 4K TV Channel (+$10)', icon: '📺', actionId: 'tv' };
            } else if (id === 'item-laptop-pro' || id === 'furn-gaming-desk' || placed.name.toLowerCase().includes('laptop') || placed.name.toLowerCase().includes('desk')) {
              nearbyFurniturePrompt = { text: 'Press [E] to Work Freelance Coding Sprint (+$35)', icon: '💻', actionId: 'laptop' };
            } else if (id === 'furn-sofa-velvet' || id === 'furn-platform-bed' || placed.name.toLowerCase().includes('sofa') || placed.name.toLowerCase().includes('bed')) {
              nearbyFurniturePrompt = { text: 'Press [E] to Sit & Rest (Recharge Energy)', icon: '🛋️', actionId: 'rest' };
            } else if (id === 'outdoor-inground-pool' || placed.name.toLowerCase().includes('pool')) {
              nearbyFurniturePrompt = { text: 'Press [E] to Dive into Swimming Pool', icon: '🏊', actionId: 'pool' };
            } else if (id === 'outdoor-firepit' || placed.name.toLowerCase().includes('firepit')) {
              nearbyFurniturePrompt = { text: 'Press [E] to Roast Marshmallows at Firepit', icon: '🔥', actionId: 'firepit' };
            }
            break;
          }
        }

        if (nearbyPetPrompt) {
          setNearbyPrompt(nearbyPetPrompt);
        } else if (nearbyFurniturePrompt) {
          setNearbyPrompt(nearbyFurniturePrompt);
        } else if (distToCar < 3.8 && cur.hasGasJug) {
          setNearbyPrompt({ text: 'Press [E] to Pour Gas Jug into Car Tank', icon: '⛽', actionId: 'refuel_jug' });
        } else if (distToCar < 3.4 && cur.carFuel !== undefined && cur.carFuel <= 0) {
          setNearbyPrompt({ text: '⚠️ Car is OUT OF GAS! Walk to Gas Station for Fuel Jug', icon: '🛢️', actionId: 'out_of_gas' });
        } else if (distToGasStation < 6.0) {
          if (cur.hasGasJug) {
            setNearbyPrompt({ text: '🛢️ Filled Gas Jug in hand (Walk back to Car)', icon: '⛽', actionId: 'have_jug' });
          } else {
            setNearbyPrompt({ text: 'Press [E] to Buy Emergency Fuel Jug ($20)', icon: '🛢️', actionId: 'buy_jug' });
          }
        } else if (distToSupermarket < 7.5) {
          setNearbyPrompt({ text: 'Press [E] to Shop Supermarket Groceries / Work Shift', icon: '🏪', actionId: 'supermarket' });
        } else if (distToBoat < 5.5) {
          setNearbyPrompt({ text: 'Press [E] to Board & Drive Yacht', icon: '⛵', actionId: 'boat' });
        } else if (distToHeli < 4.5) {
          setNearbyPrompt({ text: 'Press [E] to Board & Pilot Helicopter', icon: '🚁', actionId: 'heli' });
        } else if (distToCar < 3.4) {
          setNearbyPrompt({ text: 'Press [E] to Enter Car', icon: '🚗', actionId: 'car' });
        } else if (distToFountain < 4.8) {
          setNearbyPrompt({ text: 'Press [E] to Toss Coin in Fountain ($1)', icon: '🪙', actionId: 'fountain' });
        } else if (distToCamp < 4.0) {
          setNearbyPrompt({ text: 'Press [E] to Tend / Toggle Campfire', icon: '🔥', actionId: 'camp' });
        } else if (distToCinema < 7.5) {
          setNearbyPrompt({ text: 'Press [E] to Switch Cinema Movie', icon: '🎬', actionId: 'cinema' });
        } else if (distToSmoothie < 4.2) {
          setNearbyPrompt({ text: 'Press [E] to Buy Coconut Smoothie ($8)', icon: '🥥', actionId: 'smoothie' });
        } else if (distToTele < 4.5) {
          setNearbyPrompt({ text: 'Press [E] to Look through Scenic Telescope', icon: '🔭', actionId: 'telescope' });
        } else {
          setNearbyPrompt(null);
        }

        camera.position.lerp(camPos, 0.1);
        camera.lookAt(camTarget);
      }

      // =======================================================================
      // 3. INTERACTIVE CITY DYNAMICS & EVENTS
      // =======================================================================
      // A. Campfire animation
      if (campfireFlamesRef.current && campfireActiveRef.current) {
        campfireFlamesRef.current.children.forEach((c, idx) => {
          c.scale.y = 0.8 + Math.sin(clock.getElapsedTime() * 7 + idx * 1.5) * 0.35;
        });
      }

      // B. Cinema Movie Screen pulse
      if (cinemaScreenMeshRef.current) {
        (cinemaScreenMeshRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.85 + Math.sin(clock.getElapsedTime() * 2.5) * 0.15;
      }

      // C. Speedway Stunt Ramp Detection
      if (curVehicle === 'car' && stuntJumpCooldownRef.current <= 0) {
        const distToRamp = Math.hypot(carPhysicsRef.current.x - 125, carPhysicsRef.current.z - 35);
        if (distToRamp < 6.0 && Math.abs(carPhysicsRef.current.speed) > 18) {
          stuntJumpCooldownRef.current = 5.0;
          soundFX.playSpeedRadar();
          cur.onBonusCash?.(35, 'Stunt Airtime');
          cur.onShowToast?.('🚀 SPEEDWAY STUNT AIRTIME! Ramp jumped! +$35 Cash Bonus!');
        }
      }
      if (stuntJumpCooldownRef.current > 0) stuntJumpCooldownRef.current -= dt;

      // D. Speed Trap Radar Detection
      if (speedTrapCooldownRef.current <= 0) {
        const vPos =
          curVehicle === 'helicopter'
            ? helicopterPhysicsRef.current
            : curVehicle === 'boat'
            ? boatPhysicsRef.current
            : curVehicle === 'car'
            ? carPhysicsRef.current
            : null;
        if (vPos && Math.abs(vPos.speed) > 25) {
          const distToRadar = Math.hypot(vPos.x - 115, vPos.z - 35);
          if (distToRadar < 14) {
            speedTrapCooldownRef.current = 6.0;
            soundFX.playSpeedRadar();
            cur.onShowToast?.(`🚨 SPEED RADAR: ${Math.round(Math.abs(vPos.speed))} MPH recorded! Nice speed!`);
          }
        }
      }
      if (speedTrapCooldownRef.current > 0) speedTrapCooldownRef.current -= dt;

      // 4. SCRIPTED AIMLESS WALKING NPCS
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

      // 5. HOUSEHOLD PETS LIVING & WANDERING IN HOUSE
      const pPos = humanPosRef.current;
      petRecordsRef.current.forEach((record) => {
        const pGrp = record.group;
        const parts = pGrp.userData as { tail?: THREE.Mesh; legs?: THREE.Mesh[]; head?: THREE.Mesh; petType?: string };

        // Tail wagging animation
        if (parts && parts.tail) {
          parts.tail.rotation.y = Math.sin(clock.getElapsedTime() * 12) * 0.45;
        }

        const distToPlayer = pGrp.position.distanceTo(pPos);
        const isPlayerInHouse = pPos.x > -22 && pPos.x < -6 && pPos.z > 2 && pPos.z < 14;

        // If player is inside the house and close to pet (< 3.0m), turn to face player
        if (isPlayerInHouse && distToPlayer < 3.0) {
          const lookDir = new THREE.Vector3().subVectors(pPos, pGrp.position);
          lookDir.y = 0;
          if (lookDir.lengthSq() > 0.001) {
            pGrp.rotation.y = Math.atan2(lookDir.x, lookDir.z);
          }

          // Gentle breathing or hopping
          if (parts.petType === 'bunny_lop') {
            pGrp.position.y = Math.abs(Math.sin(clock.getElapsedTime() * 7)) * 0.12;
          } else {
            pGrp.position.y = Math.sin(clock.getElapsedTime() * 4) * 0.02;
          }

          if (parts.legs) {
            parts.legs.forEach((l) => (l.rotation.x = 0));
          }
        } else {
          // Wander peacefully around the house living room
          record.wanderTimer -= dt;
          if (record.wanderTimer <= 0) {
            record.wanderTimer = 3.5 + Math.random() * 4.5;
            // Target spot inside house interior (centered around x: -11, z: 8)
            const randX = -13.5 + Math.random() * 5.0;
            const randZ = 5.5 + Math.random() * 4.5;
            record.targetPos.set(randX, 0, randZ);
          }

          const moveDir = new THREE.Vector3().subVectors(record.targetPos, pGrp.position);
          moveDir.y = 0;
          const distToTarget = moveDir.length();

          if (distToTarget > 0.25) {
            moveDir.normalize();
            const petWalkSpeed = parts.petType === 'bunny_lop' ? 1.4 : 1.1;
            pGrp.position.addScaledVector(moveDir, petWalkSpeed * dt);
            pGrp.rotation.y = Math.atan2(moveDir.x, moveDir.z);

            record.legPhase += dt * 8;
            if (parts.legs && parts.legs.length >= 4) {
              const swing = Math.sin(record.legPhase) * 0.45;
              parts.legs[0].rotation.x = swing;
              parts.legs[1].rotation.x = -swing;
              parts.legs[2].rotation.x = -swing;
              parts.legs[3].rotation.x = swing;
            }
            if (parts.petType === 'bunny_lop') {
              pGrp.position.y = Math.abs(Math.sin(record.legPhase * 2)) * 0.14;
            }
          } else {
            if (parts.legs) {
              parts.legs.forEach((l) => (l.rotation.x = 0));
            }
            pGrp.position.y = 0;
          }
        }
      });

      // Periodically auto-save player & vehicle positions
      saveTimer += dt;
      if (saveTimer >= 2.5) {
        saveTimer = 0;
        stateRef.current.onSavePositions?.(
          [humanPosRef.current.x, 0, humanPosRef.current.z],
          { x: carPhysicsRef.current.x, z: carPhysicsRef.current.z, rotationY: carPhysicsRef.current.rotationY },
          { x: boatPhysicsRef.current.x, z: boatPhysicsRef.current.z, rotationY: boatPhysicsRef.current.rotationY },
          {
            x: helicopterPhysicsRef.current.x,
            y: helicopterPhysicsRef.current.y,
            z: helicopterPhysicsRef.current.z,
            rotationY: helicopterPhysicsRef.current.rotationY,
          }
        );
      }

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

      {/* Crash Explosion & Respawn Banner */}
      {crashNotification && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-2xl bg-rose-600/95 backdrop-blur-md text-white font-extrabold shadow-2xl border-2 border-amber-400 animate-bounce flex items-center gap-3">
          <span className="text-2xl">💥</span>
          <span className="tracking-wide text-sm font-display">{crashNotification}</span>
        </div>
      )}

      {/* Navigation & Controls Guide HUD */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-col gap-1 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-[11px] text-slate-300 font-mono shadow-xl">
        <div className="flex items-center gap-1.5 text-white font-bold font-sans text-xs">
          <span>🎮 Controls</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 font-bold">WASD</span>
          <span>Move</span>
          <span className="text-slate-500">·</span>
          <span className="text-sky-400 font-bold">I J K L</span>
          <span>Rotate Camera</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
          <span>Right-Click Drag: Orbit</span>
          <span>·</span>
          <span>Wheel: Zoom</span>
          <span>·</span>
          <span>[R]: Rotate Placing</span>
          <span>·</span>
          <span>[E]: Interact</span>
        </div>
      </div>

      {/* Interactive Proximity Action Prompt */}
      {nearbyPrompt && !stateRef.current.activeVehicle && !stateRef.current.isDrivingCar && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 bg-slate-950/90 backdrop-blur-md border border-amber-400/60 rounded-2xl shadow-2xl flex items-center gap-3 animate-pulse">
          <span className="text-xl">{nearbyPrompt.icon}</span>
          <span className="text-xs font-bold text-amber-300 tracking-wide font-display">
            {nearbyPrompt.text}
          </span>
        </div>
      )}

      {/* Placing Item Guide Banner */}
      {activePlacingItem && (
        <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2.5 bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl border border-white/20">
          <span>
            Placing: <strong>{activePlacingItem.name}</strong> ({activePlacingItem.placementType === 'wall_only' ? 'Point on an Interior Wall' : 'Click Ground or Button'})
          </span>
          <button
            onClick={() => {
              placingRotationRef.current = (placingRotationRef.current + Math.PI / 2) % (Math.PI * 2);
              const nextDeg = Math.round((placingRotationRef.current * 180) / Math.PI) % 360;
              setPlacingAngleDeg(nextDeg);
              if (ghostMeshRef.current) {
                ghostMeshRef.current.rotation.y = placingRotationRef.current;
              }
              soundFX.playRotateObject();
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-black shadow-md transition-transform hover:scale-105 flex items-center gap-1"
            title="Press [R] on keyboard or click to rotate 90°"
          >
            <span>🔄</span>
            <span>Rotate [R] ({placingAngleDeg}°)</span>
          </button>
          <button
            onClick={() => {
              const px = humanPosRef.current.x;
              const pz = humanPosRef.current.z;
              onPlaceItem(activePlacingItem, [px, 0.05, pz], placingRotationRef.current, false);
              soundFX.playPlaceObject();
              onShowToast?.(`🛋️ Placed ${activePlacingItem.name} at your feet!`);
            }}
            className="px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-400 text-xs font-black shadow-md transition-transform hover:scale-105"
          >
            Place at Feet 📍
          </button>
          <button
            onClick={onCancelPlacing}
            className="px-2.5 py-1 rounded-xl bg-slate-950/70 hover:bg-slate-950 text-white text-xs font-semibold"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
