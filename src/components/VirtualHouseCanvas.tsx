import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  BuiltinFixture,
  CameraViewMode,
  HumanTelemetry,
  NearbyInteractable,
  PlacedHouseObject,
  ScannedObjectAsset,
  TimeOfDay,
  WallCutawayMode,
} from '../types/housesim';
import { buildScannedObjectMesh } from '../utils/meshBuilder';
import { soundFX } from '../utils/soundEffects';

interface PlacementSurfaceInfo {
  mesh: THREE.Object3D;
  name: string;
  room: string;
  elevationY: number;
}

interface VirtualHouseCanvasProps {
  assets: ScannedObjectAsset[];
  placedObjects: PlacedHouseObject[];
  fixtures: BuiltinFixture[];
  selectedInstanceId: string | null;
  placingAssetId: string | null;
  carriedInstanceId: string | null;
  cameraMode: CameraViewMode;
  timeOfDay: TimeOfDay;
  wallCutaway: WallCutawayMode;
  lowPowerChromebookMode: boolean;
  virtualMoveInput: { x: number; z: number };
  onSelectInstance: (instanceId: string | null) => void;
  onPlaceNewObject: (
    assetId: string,
    position: [number, number, number],
    room: string,
    surfaceName: string
  ) => void;
  onUpdatePlacedObject: (
    instanceId: string,
    patch: Partial<PlacedHouseObject>
  ) => void;
  onTriggerInteraction: (target: NearbyInteractable) => void;
  onToggleCarry: (instanceId: string | null) => void;
  onTelemetryChange: (
    telemetry: HumanTelemetry,
    nearby: NearbyInteractable | null
  ) => void;
}

function getRoomForPosition(x: number, z: number): string {
  if (x < 0 && z >= 0) return 'Living Room';
  if (x >= 0 && z >= 0) return 'Kitchen & Dining';
  if (x < 0 && z < 0) return 'Bedroom & Studio';
  return 'Sunlit Patio & Deck';
}

export const VirtualHouseCanvas: React.FC<VirtualHouseCanvasProps> = ({
  assets,
  placedObjects,
  fixtures,
  selectedInstanceId,
  placingAssetId,
  carriedInstanceId,
  cameraMode,
  timeOfDay,
  wallCutaway,
  lowPowerChromebookMode,
  virtualMoveInput,
  onSelectInstance,
  onPlaceNewObject,
  onUpdatePlacedObject,
  onTriggerInteraction,
  onToggleCarry,
  onTelemetryChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglLost, setWebglLost] = useState(false);
  const [hoverSurfaceLabel, setHoverSurfaceLabel] = useState<string | null>(null);

  // Refs to keep latest state accessible inside the 60fps requestAnimationFrame loop
  const stateRef = useRef({
    assets,
    placedObjects,
    fixtures,
    selectedInstanceId,
    placingAssetId,
    carriedInstanceId,
    cameraMode,
    timeOfDay,
    wallCutaway,
    virtualMoveInput,
    onSelectInstance,
    onPlaceNewObject,
    onUpdatePlacedObject,
    onTriggerInteraction,
    onToggleCarry,
    onTelemetryChange,
  });

  useEffect(() => {
    stateRef.current = {
      assets,
      placedObjects,
      fixtures,
      selectedInstanceId,
      placingAssetId,
      carriedInstanceId,
      cameraMode,
      timeOfDay,
      wallCutaway,
      virtualMoveInput,
      onSelectInstance,
      onPlaceNewObject,
      onUpdatePlacedObject,
      onTriggerInteraction,
      onToggleCarry,
      onTelemetryChange,
    };
  });

  // Scene object refs for reactive updates without tearing down WebGL context
  const placedGroupRef = useRef<THREE.Group | null>(null);
  const placedMeshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const ghostGroupRef = useRef<THREE.Group | null>(null);
  const carriedMountRef = useRef<THREE.Group | null>(null);
  const wallMeshesRef = useRef<{ mesh: THREE.Mesh; side: string }[]>([]);
  const fixtureRefs = useRef<{
    tvScreenMat?: THREE.MeshBasicMaterial;
    tvLight?: THREE.PointLight;
    floorLampLight?: THREE.PointLight;
    floorLampShadeMat?: THREE.MeshStandardMaterial;
    bedLampLight?: THREE.PointLight;
    bedLampShadeMat?: THREE.MeshStandardMaterial;
    fridgeDoorPivot?: THREE.Group;
    patioDoorMesh?: THREE.Mesh;
    chromebookLidPivot?: THREE.Group;
    espressoSteamGroup?: THREE.Group;
  }>({});
  const envRefs = useRef<{
    scene?: THREE.Scene;
    sunLight?: THREE.DirectionalLight;
    hemiLight?: THREE.HemisphereLight;
    ambientLight?: THREE.AmbientLight;
    renderer?: THREE.WebGLRenderer;
  }>({});

  // Sync placed 3D objects whenever `placedObjects`, `assets`, `selectedInstanceId`, or `carriedInstanceId` change
  useEffect(() => {
    const placedGroup = placedGroupRef.current;
    const carriedMount = carriedMountRef.current;
    if (!placedGroup || !carriedMount) return;

    // Clear previous meshes
    while (placedGroup.children.length > 0) {
      placedGroup.remove(placedGroup.children[0]);
    }
    while (carriedMount.children.length > 0) {
      carriedMount.remove(carriedMount.children[0]);
    }
    placedMeshMapRef.current.clear();

    placedObjects.forEach((placed) => {
      const asset = assets.find((a) => a.id === placed.assetId);
      if (!asset) return;

      const isSelected = placed.instanceId === selectedInstanceId;
      const meshGroup = buildScannedObjectMesh(
        asset,
        placed.isActiveState,
        isSelected
      );
      meshGroup.userData = {
        placedInstanceId: placed.instanceId,
        assetId: placed.assetId,
        behavior: asset.interactionBehavior,
        isActiveState: placed.isActiveState,
      };

      if (placed.instanceId === carriedInstanceId) {
        // Mount directly in the human character's hands
        meshGroup.position.set(0, 0, 0);
        meshGroup.scale.setScalar(placed.scale * 0.85);
        carriedMount.add(meshGroup);
      } else {
        meshGroup.position.set(
          placed.position[0],
          placed.position[1],
          placed.position[2]
        );
        meshGroup.rotation.y = placed.rotationY;
        meshGroup.scale.setScalar(placed.scale);
        placedGroup.add(meshGroup);
        placedMeshMapRef.current.set(placed.instanceId, meshGroup);
      }
    });
  }, [placedObjects, assets, selectedInstanceId, carriedInstanceId]);

  // Rebuild placement ghost preview when `placingAssetId` changes
  useEffect(() => {
    const ghostGroup = ghostGroupRef.current;
    if (!ghostGroup) return;
    while (ghostGroup.children.length > 0) {
      ghostGroup.remove(ghostGroup.children[0]);
    }

    if (!placingAssetId) {
      ghostGroup.visible = false;
      setHoverSurfaceLabel(null);
      return;
    }

    const asset = assets.find((a) => a.id === placingAssetId);
    if (!asset) return;

    const previewMesh = buildScannedObjectMesh(asset, true, true);
    previewMesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (Array.isArray(m.material)) {
          m.material = m.material.map((mat) => {
            const c = mat.clone();
            c.transparent = true;
            c.opacity = 0.72;
            return c;
          });
        } else if (m.material) {
          const c = m.material.clone();
          c.transparent = true;
          c.opacity = 0.72;
          m.material = c;
        }
      }
    });
    ghostGroup.add(previewMesh);
    ghostGroup.visible = true;
  }, [placingAssetId, assets]);

  // Sync Time-of-Day atmosphere lighting
  useEffect(() => {
    const { scene, sunLight, hemiLight, ambientLight } = envRefs.current;
    if (!scene || !sunLight || !hemiLight || !ambientLight) return;

    if (timeOfDay === 'day') {
      scene.background = new THREE.Color(0x0c1424);
      scene.fog = new THREE.FogExp2(0x0c1424, 0.015);
      sunLight.color.setHex(0xfffbeb);
      sunLight.intensity = 2.1;
      sunLight.position.set(12, 18, 10);
      hemiLight.color.setHex(0xe0f2fe);
      hemiLight.groundColor.setHex(0x334155);
      hemiLight.intensity = 0.95;
      ambientLight.intensity = 0.55;
    } else if (timeOfDay === 'sunset') {
      scene.background = new THREE.Color(0x1a1025);
      scene.fog = new THREE.FogExp2(0x1a1025, 0.018);
      sunLight.color.setHex(0xf97316);
      sunLight.intensity = 1.8;
      sunLight.position.set(-16, 9, 8);
      hemiLight.color.setHex(0xfdba74);
      hemiLight.groundColor.setHex(0x1e1b4b);
      hemiLight.intensity = 0.75;
      ambientLight.intensity = 0.4;
    } else {
      // Night mode
      scene.background = new THREE.Color(0x060911);
      scene.fog = new THREE.FogExp2(0x060911, 0.022);
      sunLight.color.setHex(0x38bdf8);
      sunLight.intensity = 0.35;
      sunLight.position.set(-10, 15, -10);
      hemiLight.color.setHex(0x1e293b);
      hemiLight.groundColor.setHex(0x090d16);
      hemiLight.intensity = 0.35;
      ambientLight.intensity = 0.25;
    }
  }, [timeOfDay]);

  // Sync pixel ratio for Chromebook Low-Power / High-FPS mode
  useEffect(() => {
    const renderer = envRefs.current.renderer;
    if (!renderer) return;
    renderer.setPixelRatio(
      lowPowerChromebookMode ? 1.0 : Math.min(window.devicePixelRatio, 1.75)
    );
  }, [lowPowerChromebookMode]);

  // Main Three.js Scene Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1424);
    scene.fog = new THREE.FogExp2(0x0c1424, 0.015);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 120);
    camera.position.set(0, 11, 13);

    const renderer = new THREE.WebGLRenderer({
      antialias: !lowPowerChromebookMode,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(
      lowPowerChromebookMode ? 1.0 : Math.min(window.devicePixelRatio, 1.75)
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // WebGL Context Lost / Restored safety listeners
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      handleContextRestored
    );

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 0.95);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.1);
    sunLight.position.set(12, 18, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 45;
    const d = 14;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    envRefs.current = {
      scene,
      sunLight,
      hemiLight,
      ambientLight,
      renderer,
    };

    // Placement Surfaces Registry (Floors + Tables + Counters + Desk + Shelves)
    const placementSurfaces: PlacementSurfaceInfo[] = [];

    const registerSurface = (
      mesh: THREE.Object3D,
      name: string,
      room: string,
      elevationY: number
    ) => {
      placementSurfaces.push({ mesh, name, room, elevationY });
    };

    // Procedural Wood / Tile / Rug / Grass Canvas Textures
    const makeFloorPattern = (
      baseHex: string,
      lineHex: string,
      mode: 'wood' | 'tile' | 'deck'
    ) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = lineHex;
      ctx.lineWidth = 2;

      if (mode === 'wood') {
        for (let y = 0; y < 256; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(256, y);
          ctx.stroke();
          const offset = (y / 32) % 2 === 0 ? 64 : 160;
          ctx.beginPath();
          ctx.moveTo(offset, y);
          ctx.lineTo(offset, y + 32);
          ctx.stroke();
        }
      } else if (mode === 'tile') {
        for (let i = 0; i <= 256; i += 64) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 256);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(256, i);
          ctx.stroke();
        }
      } else {
        for (let y = 0; y < 256; y += 24) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(256, y);
          ctx.stroke();
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      return tex;
    };

    const woodTex = makeFloorPattern('#855836', '#6b4426', 'wood');
    const tileTex = makeFloorPattern('#334155', '#1e293b', 'tile');
    const bedroomWoodTex = makeFloorPattern('#71492f', '#593822', 'wood');
    const deckTex = makeFloorPattern('#7c3f23', '#582b16', 'deck');

    // Exterior Lawn & Ground Surround
    const groundGeo = new THREE.PlaneGeometry(54, 54);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x162922,
      roughness: 0.92,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -0.06;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Subtle architectural grid lines around exterior
    const gridHelper = new THREE.GridHelper(48, 48, 0x1e293b, 0x1e293b);
    gridHelper.position.y = -0.04;
    scene.add(gridHelper);

    // 4 Room Floors (Total House Footprint: X from -9 to +9 (18m), Z from -6 to +6 (12m))
    const makeRoomFloor = (
      x: number,
      z: number,
      w: number,
      d: number,
      tex: THREE.Texture,
      roomName: string
    ) => {
      const geo = new THREE.BoxGeometry(w, 0.1, d);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.55,
        metalness: 0.05,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, -0.05, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
      registerSurface(mesh, `${roomName} Floor`, roomName, 0.0);
    };

    makeRoomFloor(-4.5, 3.0, 9, 6, woodTex, 'Living Room');
    makeRoomFloor(4.5, 3.0, 9, 6, tileTex, 'Kitchen & Dining');
    makeRoomFloor(-4.5, -3.0, 9, 6, bedroomWoodTex, 'Bedroom & Studio');
    makeRoomFloor(4.5, -3.0, 9, 6, deckTex, 'Sunlit Patio & Deck');

    // House Walls with Doorways & Windows
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.75,
      transparent: true,
      opacity: 1.0,
    });
    const wallMeshes: { mesh: THREE.Mesh; side: string }[] = [];

    const addWallSegment = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      side: string
    ) => {
      const mat = wallMat.clone();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      wallMeshes.push({ mesh, side });
      return mesh;
    };

    const wallH = 2.9;
    const wallT = 0.2;

    // North Exterior Wall (Bedroom part z = -6, x = -9..0)
    addWallSegment(-4.5, wallH / 2, -6, 9, wallH, wallT, 'north');
    // West Exterior Wall (x = -9, z = -6..6) with picture window cutout
    addWallSegment(-9, wallH / 2, -3.2, wallT, wallH, 5.6, 'west');
    addWallSegment(-9, wallH / 2, 4.6, wallT, wallH, 2.8, 'west');
    addWallSegment(-9, 0.45, 1.4, wallT, 0.9, 3.6, 'west'); // Window sill
    addWallSegment(-9, 2.55, 1.4, wallT, 0.7, 3.6, 'west'); // Window header

    // Glass pane for Living Room West Window
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.26,
      roughness: 0.05,
      transmission: 0.6,
    });
    const westWindow = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.3, 3.5),
      glassMat
    );
    westWindow.position.set(-9, 1.55, 1.4);
    scene.add(westWindow);

    // South Front Wall (z = 6, x = -9..9) with large windows & front entry
    addWallSegment(-5.2, wallH / 2, 6, 7.6, wallH, wallT, 'south');
    addWallSegment(5.2, wallH / 2, 6, 7.6, wallH, wallT, 'south');
    addWallSegment(0, 2.5, 6, 2.8, 0.8, wallT, 'south'); // Front entry header

    // East Exterior Wall (Kitchen part x = 9, z = 0..6)
    addWallSegment(9, wallH / 2, 3.0, wallT, wallH, 6.0, 'east');

    // Interior Center North-South Wall (x = 0, z = -6..6) with 2 Doorways!
    // Doorway 1 in Bedroom/Patio at z = -3.0; Doorway 2 in Living/Kitchen at z = 2.6
    addWallSegment(0, wallH / 2, -4.9, wallT, wallH, 2.2, 'interior');
    addWallSegment(0, wallH / 2, -0.4, wallT, wallH, 3.2, 'interior');
    addWallSegment(0, wallH / 2, 4.9, wallT, wallH, 2.2, 'interior');

    // Interior East-West Wall (z = 0, x = -9..9) with 2 Doorways!
    // Doorway 1 between Living Room & Bedroom at x = -2.2
    addWallSegment(-6.2, wallH / 2, 0, 5.6, wallH, wallT, 'interior');
    addWallSegment(-0.4, wallH / 2, 0, 1.2, wallH, wallT, 'interior');
    // Kitchen to Patio Wall (x = 0..9, z = 0) with Sliding Glass Patio Door at x = 4.5
    addWallSegment(1.6, wallH / 2, 0, 3.2, wallH, wallT, 'interior');
    addWallSegment(7.6, wallH / 2, 0, 2.8, wallH, wallT, 'interior');

    // Interactive Sliding Patio Glass Door (at x = 4.6, z = 0)
    const patioDoorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 2.4, 0.1),
      new THREE.MeshPhysicalMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.38,
        roughness: 0.1,
      })
    );
    patioDoorMesh.position.set(4.6, 1.2, 0);
    scene.add(patioDoorMesh);
    fixtureRefs.current.patioDoorMesh = patioDoorMesh;

    wallMeshesRef.current = wallMeshes;

    // =========================================================================
    // ROOM 1: LIVING ROOM FURNITURE & INTERACTIVE FIXTURES
    // =========================================================================
    const darkWalnutMat = new THREE.MeshStandardMaterial({
      color: 0x432818,
      roughness: 0.45,
    });
    const fabricSofaMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.8,
    });

    // Living Room Woven Area Rug
    const rugMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.02, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    );
    rugMesh.position.set(-4.5, 0.01, 2.5);
    rugMesh.receiveShadow = true;
    scene.add(rugMesh);

    // L-Shaped Sectional Sofa
    const sofaGroup = new THREE.Group();
    const sofaBase = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.42, 1.05),
      fabricSofaMat
    );
    sofaBase.position.set(0, 0.21, 0);
    sofaBase.castShadow = true;
    sofaBase.receiveShadow = true;
    sofaGroup.add(sofaBase);

    const sofaBack = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.48, 0.22),
      fabricSofaMat
    );
    sofaBack.position.set(0, 0.64, -0.42);
    sofaBack.castShadow = true;
    sofaGroup.add(sofaBack);

    const chaiseBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.42, 1.85),
      fabricSofaMat
    );
    chaiseBase.position.set(-1.08, 0.21, 0.42);
    chaiseBase.castShadow = true;
    sofaGroup.add(chaiseBase);

    // Accent Throw Pillows
    const pillowMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.7,
    });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.16), pillowMat);
    p1.position.set(-1.1, 0.56, -0.22);
    p1.rotation.z = 0.15;
    sofaGroup.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.16), pillowMat);
    p2.position.set(1.1, 0.56, -0.22);
    p2.rotation.z = -0.15;
    sofaGroup.add(p2);

    sofaGroup.position.set(-4.5, 0, 1.15);
    scene.add(sofaGroup);
    registerSurface(sofaBase, 'Sofa Cushion', 'Living Room', 0.42);

    // Walnut Coffee Table (Valid Placement Surface at y = 0.52m)
    const coffeeTableTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.06, 0.95),
      darkWalnutMat
    );
    coffeeTableTop.position.set(-4.5, 0.49, 2.55);
    coffeeTableTop.castShadow = true;
    coffeeTableTop.receiveShadow = true;
    scene.add(coffeeTableTop);
    registerSurface(coffeeTableTop, 'Coffee Table', 'Living Room', 0.52);

    // Coffee Table Legs
    for (const [lx, lz] of [
      [-0.75, -0.38],
      [0.75, -0.38],
      [-0.75, 0.38],
      [0.75, 0.38],
    ]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.02, 0.48, 12),
        brassMat
      );
      leg.position.set(-4.5 + lx, 0.24, 2.55 + lz);
      scene.add(leg);
    }

    // Media Console & 65" Smart OLED TV (along South Wall z = 5.4, facing North)
    const mediaConsole = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.56, 0.58),
      darkWalnutMat
    );
    mediaConsole.position.set(-4.5, 0.28, 5.45);
    mediaConsole.castShadow = true;
    mediaConsole.receiveShadow = true;
    scene.add(mediaConsole);
    registerSurface(mediaConsole, 'Media Console', 'Living Room', 0.56);

    const tvFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.22, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2 })
    );
    tvFrame.position.set(-4.5, 1.42, 5.55);
    scene.add(tvFrame);

    // Animated TV Canvas Texture
    const tvCanvas = document.createElement('canvas');
    tvCanvas.width = 256;
    tvCanvas.height = 144;
    const tvCtx = tvCanvas.getContext('2d')!;
    const tvTex = new THREE.CanvasTexture(tvCanvas);
    tvTex.colorSpace = THREE.SRGBColorSpace;

    const tvScreenMat = new THREE.MeshBasicMaterial({ map: tvTex });
    const tvScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 1.12),
      tvScreenMat
    );
    tvScreen.position.set(-4.5, 1.42, 5.51);
    tvScreen.rotation.y = Math.PI;
    scene.add(tvScreen);

    const tvLight = new THREE.PointLight(0x38bdf8, 1.4, 5.0);
    tvLight.position.set(-4.5, 1.45, 4.9);
    scene.add(tvLight);
    fixtureRefs.current.tvScreenMat = tvScreenMat;
    fixtureRefs.current.tvLight = tvLight;

    // Living Room Brass Floor Lamp (Interactive Fixture)
    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.26, 0.05, 20),
      brassMat
    );
    lampBase.position.set(-7.4, 0.025, 4.8);
    scene.add(lampBase);
    const lampStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.85, 12),
      brassMat
    );
    lampStem.position.set(-7.4, 0.95, 4.8);
    scene.add(lampStem);
    const floorLampShadeMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });
    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.36, 24, 1, true),
      floorLampShadeMat
    );
    lampShade.position.set(-7.4, 1.88, 4.8);
    scene.add(lampShade);

    const floorLampLight = new THREE.PointLight(0xfbbf24, 2.4, 7.5);
    floorLampLight.position.set(-7.2, 1.75, 4.6);
    scene.add(floorLampLight);
    fixtureRefs.current.floorLampLight = floorLampLight;
    fixtureRefs.current.floorLampShadeMat = floorLampShadeMat;

    // Multi-Tier Bookshelf on West Wall (x = -8.3, z = 0.2..2.2) - 3 Placement Surfaces!
    const shelfLevels = [0.45, 0.94, 1.42];
    shelfLevels.forEach((sy, idx) => {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.04, 1.8),
        darkWalnutMat
      );
      plank.position.set(-8.5, sy - 0.02, 1.1);
      plank.castShadow = true;
      plank.receiveShadow = true;
      scene.add(plank);
      registerSurface(
        plank,
        `Bookshelf Tier ${idx + 1}`,
        'Living Room',
        sy
      );
    });

    // =========================================================================
    // ROOM 2: KITCHEN & DINING FURNITURE & FIXTURES
    // =========================================================================
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.2,
      metalness: 0.05,
    });
    const cabinetMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.25,
      metalness: 0.75,
    });

    // Marble Kitchen Island (Valid Placement Surface at y = 0.96m)
    const islandBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.9, 1.1),
      cabinetMat
    );
    islandBase.position.set(2.8, 0.45, 1.7);
    islandBase.castShadow = true;
    islandBase.receiveShadow = true;
    scene.add(islandBase);

    const islandTop = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.06, 1.25),
      marbleMat
    );
    islandTop.position.set(2.8, 0.93, 1.7);
    islandTop.castShadow = true;
    islandTop.receiveShadow = true;
    scene.add(islandTop);
    registerSurface(islandTop, 'Kitchen Island', 'Kitchen & Dining', 0.96);

    // Interactive Espresso Machine on Kitchen Island
    const espressoBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.38, 0.32),
      steelMat
    );
    espressoBody.position.set(3.8, 1.15, 1.7);
    espressoBody.castShadow = true;
    scene.add(espressoBody);

    const espressoSteamGroup = new THREE.Group();
    espressoSteamGroup.position.set(3.8, 1.35, 1.7);
    scene.add(espressoSteamGroup);
    fixtureRefs.current.espressoSteamGroup = espressoSteamGroup;

    // Kitchen Back Counter along East Wall (x = 8.3, z = 1.2..4.5)
    const counterBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 3.8),
      cabinetMat
    );
    counterBase.position.set(8.35, 0.45, 3.6);
    counterBase.castShadow = true;
    scene.add(counterBase);

    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.06, 3.85),
      marbleMat
    );
    counterTop.position.set(8.35, 0.93, 3.6);
    counterTop.receiveShadow = true;
    scene.add(counterTop);
    registerSurface(counterTop, 'Kitchen Counter', 'Kitchen & Dining', 0.96);

    // Interactive Stainless Steel Refrigerator (x = 8.25, z = 0.95)
    const fridgeBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 2.05, 0.95),
      steelMat
    );
    fridgeBody.position.set(8.25, 1.025, 0.95);
    fridgeBody.castShadow = true;
    scene.add(fridgeBody);

    const fridgeDoorPivot = new THREE.Group();
    fridgeDoorPivot.position.set(7.77, 1.025, 0.48);
    const fridgeDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.98, 0.92),
      steelMat
    );
    fridgeDoor.position.set(0, 0, 0.46);
    fridgeDoorPivot.add(fridgeDoor);
    scene.add(fridgeDoorPivot);
    fixtureRefs.current.fridgeDoorPivot = fridgeDoorPivot;

    // Walnut Dining Table (Valid Placement Surface at y = 0.78m)
    const diningTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.06, 1.2),
      darkWalnutMat
    );
    diningTop.position.set(4.6, 0.75, 4.4);
    diningTop.castShadow = true;
    diningTop.receiveShadow = true;
    scene.add(diningTop);
    registerSurface(diningTop, 'Dining Table', 'Kitchen & Dining', 0.78);

    for (const [dx, dz] of [
      [-0.95, -0.48],
      [0.95, -0.48],
      [-0.95, 0.48],
      [0.95, 0.48],
    ]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.025, 0.74, 12),
        darkWalnutMat
      );
      leg.position.set(4.6 + dx, 0.37, 4.4 + dz);
      scene.add(leg);
    }

    // Warm Kitchen Pendant Light
    const kitchenLight = new THREE.PointLight(0xfef08a, 1.6, 8.0);
    kitchenLight.position.set(3.8, 2.5, 2.8);
    scene.add(kitchenLight);

    // =========================================================================
    // ROOM 3: BEDROOM & STUDY STUDIO (North-West Wing: x = -9..0, z = -6..0)
    // =========================================================================
    // Platform Bed (x = -6.8, z = -2.2)
    const bedFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.32, 2.1),
      darkWalnutMat
    );
    bedFrame.position.set(-6.8, 0.16, -2.1);
    bedFrame.castShadow = true;
    bedFrame.receiveShadow = true;
    scene.add(bedFrame);

    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.24, 1.95),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75 })
    );
    mattress.position.set(-6.75, 0.42, -2.1);
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    scene.add(mattress);
    registerSurface(mattress, 'Platform Bed', 'Bedroom & Studio', 0.54);

    // Nightstand (x = -8.2, z = -3.6, surface at y = 0.56m)
    const nightstand = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.56, 0.65),
      darkWalnutMat
    );
    nightstand.position.set(-8.2, 0.28, -3.6);
    nightstand.castShadow = true;
    nightstand.receiveShadow = true;
    scene.add(nightstand);
    registerSurface(nightstand, 'Nightstand', 'Bedroom & Studio', 0.56);

    // Interactive Bedside Reading Lamp
    const bedLampShadeMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.8,
      roughness: 0.35,
    });
    const bedLampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.2, 0.24, 18),
      bedLampShadeMat
    );
    bedLampShade.position.set(-8.2, 0.78, -3.6);
    scene.add(bedLampShade);

    const bedLampLight = new THREE.PointLight(0xfbbf24, 1.8, 6.0);
    bedLampLight.position.set(-8.0, 0.9, -3.5);
    scene.add(bedLampLight);
    fixtureRefs.current.bedLampLight = bedLampLight;
    fixtureRefs.current.bedLampShadeMat = bedLampShadeMat;

    // Study Desk (x = -5.8, z = -5.4, surface at y = 0.78m)
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.06, 0.85),
      darkWalnutMat
    );
    deskTop.position.set(-5.8, 0.75, -5.35);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    scene.add(deskTop);
    registerSurface(deskTop, 'Study Desk', 'Bedroom & Studio', 0.78);

    for (const [lx, lz] of [
      [-0.85, -0.35],
      [0.85, -0.35],
      [-0.85, 0.35],
      [0.85, 0.35],
    ]) {
      const dLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.74, 0.05),
        cabinetMat
      );
      dLeg.position.set(-5.8 + lx, 0.37, -5.35 + lz);
      scene.add(dLeg);
    }

    // Interactive Chromebook Laptop on Study Desk (x = -5.4, y = 0.78, z = -5.35)
    const cbBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.018, 0.25),
      steelMat
    );
    cbBase.position.set(-5.3, 0.79, -5.3);
    scene.add(cbBase);

    const cbLidPivot = new THREE.Group();
    cbLidPivot.position.set(-5.3, 0.8, -5.42);
    const cbLid = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.24, 0.014),
      steelMat
    );
    cbLid.position.set(0, 0.12, 0);
    const cbScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.33, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    cbScreen.position.set(0, 0.12, 0.009);
    cbLidPivot.add(cbLid);
    cbLidPivot.add(cbScreen);
    cbLidPivot.rotation.x = -0.22;
    scene.add(cbLidPivot);
    fixtureRefs.current.chromebookLidPivot = cbLidPivot;

    // =========================================================================
    // ROOM 4: SUNLIT OUTDOOR DECK & PATIO (North-East Wing: x = 0..9, z = -6..0)
    // =========================================================================
    const patioTableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.05, 24),
      darkWalnutMat
    );
    patioTableTop.position.set(4.8, 0.62, -3.5);
    patioTableTop.castShadow = true;
    patioTableTop.receiveShadow = true;
    scene.add(patioTableTop);
    registerSurface(
      patioTableTop,
      'Patio Lounge Table',
      'Sunlit Patio & Deck',
      0.65
    );

    const patioPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.35, 0.6, 16),
      cabinetMat
    );
    patioPedestal.position.set(4.8, 0.3, -3.5);
    scene.add(patioPedestal);

    // Stylized Exterior Trees & Greenery around the Deck
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.8,
    });
    for (const [tx, tz, scale] of [
      [11.2, -4.5, 1.2],
      [10.8, 2.5, 1.0],
      [-11.5, 3.2, 1.3],
      [-11.0, -4.2, 0.95],
      [3.2, -8.5, 1.15],
    ]) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.26, 1.6, 10),
        darkWalnutMat
      );
      trunk.position.set(tx, 0.8, tz);
      trunk.castShadow = true;
      scene.add(trunk);

      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.15 * scale, 1),
        foliageMat
      );
      crown.position.set(tx, 2.3 * scale, tz);
      crown.castShadow = true;
      scene.add(crown);
    }

    // =========================================================================
    // ARTICULATED 3D HUMAN CHARACTER
    // =========================================================================
    const humanGroup = new THREE.Group();
    humanGroup.position.set(-2.2, 0, 2.5);
    scene.add(humanGroup);

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfdba74,
      roughness: 0.55,
    });
    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.6,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.75,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.8,
    });

    // Head + Hair + Direction Visor/Eyes
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.54, 0);
    const headMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.3, 0.28),
      skinMat
    );
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    const hairCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.12, 0.3),
      hairMat
    );
    hairCap.position.set(0, 0.12, -0.01);
    headGroup.add(hairCap);

    // Eyes facing +Z (forward direction of character)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), eyeMat);
    leftEye.position.set(0.06, 0.02, 0.145);
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), eyeMat);
    rightEye.position.set(-0.06, 0.02, 0.145);
    headGroup.add(leftEye, rightEye);
    humanGroup.add(headGroup);

    // Torso
    const torsoMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.58, 0.24),
      jacketMat
    );
    torsoMesh.position.set(0, 1.06, 0);
    torsoMesh.castShadow = true;
    humanGroup.add(torsoMesh);

    // Left & Right Articulated Arms
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(0.28, 1.3, 0);
    const leftArmMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.52, 0.13),
      jacketMat
    );
    leftArmMesh.position.set(0, -0.22, 0);
    leftArmMesh.castShadow = true;
    leftArmPivot.add(leftArmMesh);
    humanGroup.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(-0.28, 1.3, 0);
    const rightArmMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.52, 0.13),
      jacketMat
    );
    rightArmMesh.position.set(0, -0.22, 0);
    rightArmMesh.castShadow = true;
    rightArmPivot.add(rightArmMesh);
    humanGroup.add(rightArmPivot);

    // Left & Right Articulated Legs
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(0.11, 0.76, 0);
    const leftLegMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.74, 0.16),
      pantsMat
    );
    leftLegMesh.position.set(0, -0.37, 0);
    leftLegMesh.castShadow = true;
    leftLegPivot.add(leftLegMesh);
    humanGroup.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(-0.11, 0.76, 0);
    const rightLegMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.74, 0.16),
      pantsMat
    );
    rightLegMesh.position.set(0, -0.37, 0);
    rightLegMesh.castShadow = true;
    rightLegPivot.add(rightLegMesh);
    humanGroup.add(rightLegPivot);

    // Carried Object Mount (in front of the human's hands)
    const carriedMount = new THREE.Group();
    carriedMount.position.set(0, 1.02, 0.44);
    humanGroup.add(carriedMount);
    carriedMountRef.current = carriedMount;

    // Proximity Interaction Ring on the floor/object
    const proximityRingGeo = new THREE.RingGeometry(0.32, 0.42, 32);
    proximityRingGeo.rotateX(-Math.PI / 2);
    const proximityRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const proximityRing = new THREE.Mesh(proximityRingGeo, proximityRingMat);
    proximityRing.visible = false;
    scene.add(proximityRing);

    // Container for Placed Scanned Objects & Ghost Placement Preview
    const placedGroup = new THREE.Group();
    scene.add(placedGroup);
    placedGroupRef.current = placedGroup;

    const ghostGroup = new THREE.Group();
    ghostGroup.visible = false;
    scene.add(ghostGroup);
    ghostGroupRef.current = ghostGroup;

    // Trigger initial render of placed objects
    stateRef.current.placedObjects.forEach((placed) => {
      const asset = stateRef.current.assets.find((a) => a.id === placed.assetId);
      if (!asset) return;
      const g = buildScannedObjectMesh(
        asset,
        placed.isActiveState,
        placed.instanceId === stateRef.current.selectedInstanceId
      );
      g.userData = {
        placedInstanceId: placed.instanceId,
        assetId: placed.assetId,
        behavior: asset.interactionBehavior,
        isActiveState: placed.isActiveState,
      };
      g.position.set(placed.position[0], placed.position[1], placed.position[2]);
      g.rotation.y = placed.rotationY;
      g.scale.setScalar(placed.scale);
      placedGroup.add(g);
      placedMeshMapRef.current.set(placed.instanceId, g);
    });

    // =========================================================================
    // INPUT CONTROLS: WASD / Arrow Keys / E Interaction / Mouse Orbit & Raycast
    // =========================================================================
    const keysPressed = new Set<string>();
    let latestNearby: NearbyInteractable | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when typing in an input field
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key.toLowerCase();
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(
          key
        )
      ) {
        keysPressed.add(key);
      }

      if (e.key === 'Shift') {
        keysPressed.add('shift');
      }

      // 'E' key: Interact with nearest object OR put down carried object
      if (key === 'e' && !e.repeat) {
        e.preventDefault();
        if (stateRef.current.carriedInstanceId) {
          // Drop carried object onto surface in front of human
          const dropX =
            humanGroup.position.x + Math.sin(humanGroup.rotation.y) * 0.85;
          const dropZ =
            humanGroup.position.z + Math.cos(humanGroup.rotation.y) * 0.85;
          const room = getRoomForPosition(dropX, dropZ);
          stateRef.current.onUpdatePlacedObject(
            stateRef.current.carriedInstanceId,
            {
              position: [Number(dropX.toFixed(2)), 0, Number(dropZ.toFixed(2))],
              room,
              surfaceName: `${room} Floor`,
            }
          );
          stateRef.current.onToggleCarry(null);
          soundFX.playPlaceObject();
        } else if (latestNearby) {
          stateRef.current.onTriggerInteraction(latestNearby);
        }
      }

      // 'G' key: Pick up or put down nearest scanned object
      if (key === 'g' && !e.repeat) {
        e.preventDefault();
        if (stateRef.current.carriedInstanceId) {
          const dropX =
            humanGroup.position.x + Math.sin(humanGroup.rotation.y) * 0.85;
          const dropZ =
            humanGroup.position.z + Math.cos(humanGroup.rotation.y) * 0.85;
          const room = getRoomForPosition(dropX, dropZ);
          stateRef.current.onUpdatePlacedObject(
            stateRef.current.carriedInstanceId,
            {
              position: [Number(dropX.toFixed(2)), 0, Number(dropZ.toFixed(2))],
              room,
              surfaceName: `${room} Floor`,
            }
          );
          stateRef.current.onToggleCarry(null);
          soundFX.playPlaceObject();
        } else if (latestNearby && latestNearby.type === 'scanned') {
          stateRef.current.onToggleCarry(latestNearby.id);
          soundFX.playPlaceObject();
        }
      }

      // 'R' key: Rotate selected placed object by 45 degrees
      if (key === 'r' && !e.repeat && stateRef.current.selectedInstanceId) {
        const current = stateRef.current.placedObjects.find(
          (p) => p.instanceId === stateRef.current.selectedInstanceId
        );
        if (current) {
          stateRef.current.onUpdatePlacedObject(current.instanceId, {
            rotationY: current.rotationY + Math.PI / 4,
          });
          soundFX.playSwitchToggle(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.delete(key);
      if (e.key === 'Shift') keysPressed.delete('shift');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Camera Orbit & Pointer Raycasting
    let cameraYaw = 0.35;
    let cameraPitch = 0.68;
    let cameraDist = 11.5;
    const orbitTarget = new THREE.Vector3(-1.5, 0.8, 1.5);
    let isPointerDown = false;
    let pointerDownPos = { x: 0, y: 0 };
    let isDraggingCamera = false;

    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    const getSurfaceIntersection = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);

      const surfaceMeshes = placementSurfaces.map((s) => s.mesh);
      const hits = raycaster.intersectObjects(surfaceMeshes, false);
      if (hits.length > 0) {
        const hit = hits[0];
        const info = placementSurfaces.find((s) => s.mesh === hit.object);
        if (info) {
          return {
            point: new THREE.Vector3(
              hit.point.x,
              info.elevationY,
              hit.point.z
            ),
            surfaceName: info.name,
            room: getRoomForPosition(hit.point.x, hit.point.z),
          };
        }
      }
      return null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      isDraggingCamera = false;
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Update ghost preview position if user is placing a scanned object
      if (stateRef.current.placingAssetId && ghostGroupRef.current) {
        const hitInfo = getSurfaceIntersection(e.clientX, e.clientY);
        if (hitInfo) {
          ghostGroupRef.current.visible = true;
          ghostGroupRef.current.position.copy(hitInfo.point);
          setHoverSurfaceLabel(`${hitInfo.surfaceName} (${hitInfo.room})`);
        }
      }

      if (!isPointerDown) return;
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        isDraggingCamera = true;
      }

      if (isDraggingCamera) {
        cameraYaw -= dx * 0.007;
        cameraPitch = Math.max(
          0.18,
          Math.min(1.38, cameraPitch + dy * 0.006)
        );
        pointerDownPos = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isPointerDown) return;
      isPointerDown = false;

      if (!isDraggingCamera) {
        // Click action: either place a new scanned object OR select an existing placed object
        if (stateRef.current.placingAssetId) {
          const hitInfo = getSurfaceIntersection(e.clientX, e.clientY);
          if (hitInfo) {
            stateRef.current.onPlaceNewObject(
              stateRef.current.placingAssetId,
              [
                Number(hitInfo.point.x.toFixed(2)),
                Number(hitInfo.point.y.toFixed(2)),
                Number(hitInfo.point.z.toFixed(2)),
              ],
              hitInfo.room,
              hitInfo.surfaceName
            );
            soundFX.playPlaceObject();
          }
          return;
        }

        // Check if clicking a placed scanned object
        const rect = renderer.domElement.getBoundingClientRect();
        mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouseNDC, camera);

        const hits = raycaster.intersectObjects(placedGroup.children, true);
        if (hits.length > 0) {
          let obj: THREE.Object3D | null = hits[0].object;
          while (obj && !obj.userData?.placedInstanceId) {
            obj = obj.parent;
          }
          if (obj?.userData?.placedInstanceId) {
            stateRef.current.onSelectInstance(obj.userData.placedInstanceId);
            soundFX.playSwitchToggle(true);
            return;
          }
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDist = Math.max(4.0, Math.min(24.0, cameraDist + e.deltaY * 0.01));
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('wheel', handleWheel, {
      passive: false,
    });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // =========================================================================
    // 60FPS SIMULATION & ANIMATION LOOP
    // =========================================================================
    let animId = 0;
    let clock = new THREE.Clock();
    let walkCycleTime = 0;
    let lastTelemetryTime = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      const {
        fixtures: curFixtures,
        placedObjects: curPlaced,
        cameraMode: curCamMode,
        wallCutaway: curCutaway,
        carriedInstanceId: curCarried,
        virtualMoveInput: vMove,
      } = stateRef.current;

      // 1. Compute Human Movement Vector (WASD + Arrow Keys + Virtual Touch D-Pad)
      let moveForward = 0;
      let moveRight = 0;
      if (keysPressed.has('w') || keysPressed.has('arrowup')) moveForward += 1;
      if (keysPressed.has('s') || keysPressed.has('arrowdown')) moveForward -= 1;
      if (keysPressed.has('d') || keysPressed.has('arrowright')) moveRight += 1;
      if (keysPressed.has('a') || keysPressed.has('arrowleft')) moveRight -= 1;

      moveForward += vMove.z;
      moveRight += vMove.x;

      const isMoving = Math.abs(moveForward) > 0.05 || Math.abs(moveRight) > 0.05;
      const speed = keysPressed.has('shift') ? 5.4 : 3.5;

      if (isMoving) {
        // Align movement direction with camera horizontal forward/right
        const forwardVec = new THREE.Vector3(
          -Math.sin(cameraYaw),
          0,
          -Math.cos(cameraYaw)
        ).normalize();
        const rightVec = new THREE.Vector3(
          Math.cos(cameraYaw),
          0,
          -Math.sin(cameraYaw)
        ).normalize();

        const moveVec = new THREE.Vector3()
          .addScaledVector(forwardVec, moveForward)
          .addScaledVector(rightVec, moveRight)
          .normalize();

        const nextX = humanGroup.position.x + moveVec.x * speed * dt;
        const nextZ = humanGroup.position.z + moveVec.z * speed * dt;

        // House Boundary & Wall Doorway Collision Check
        const clampedX = Math.max(-8.45, Math.min(8.45, nextX));
        const clampedZ = Math.max(-5.5, Math.min(5.45, nextZ));

        // Check interior walls with doorway gaps so human walks through doorways cleanly
        let allowX = true;
        let allowZ = true;

        // North-South center wall at x = 0: Doorways at z in [-3.8, -2.0] and [1.2, 3.8]
        if (
          Math.sign(humanGroup.position.x) !== Math.sign(clampedX) ||
          Math.abs(clampedX) < 0.32
        ) {
          const inDoor1 = clampedZ > -3.8 && clampedZ < -2.0;
          const inDoor2 = clampedZ > 1.2 && clampedZ < 3.8;
          if (!inDoor1 && !inDoor2) {
            allowX = false;
          }
        }

        // East-West center wall at z = 0: Doorway 1 at x in [-3.4, -1.0]; Patio door at x in [3.2, 6.0]
        const patioOpen =
          curFixtures.find((f) => f.id === 'fixture-patio-door')?.isActive ??
          true;
        if (
          Math.sign(humanGroup.position.z) !== Math.sign(clampedZ) ||
          Math.abs(clampedZ) < 0.32
        ) {
          const inWestDoor = clampedX > -3.4 && clampedX < -1.0;
          const inPatioDoor = patioOpen && clampedX > 3.2 && clampedX < 6.0;
          if (!inWestDoor && !inPatioDoor) {
            allowZ = false;
          }
        }

        if (allowX) humanGroup.position.x = clampedX;
        if (allowZ) humanGroup.position.z = clampedZ;

        // Smoothly rotate human character toward movement vector
        const targetAngle = Math.atan2(moveVec.x, moveVec.z);
        let diff = targetAngle - humanGroup.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        humanGroup.rotation.y += diff * Math.min(1, dt * 12);

        // Articulated limb swing animation
        walkCycleTime += dt * speed * 3.2;
        const swing = Math.sin(walkCycleTime) * 0.62;
        leftLegPivot.rotation.x = swing;
        rightLegPivot.rotation.x = -swing;

        if (curCarried) {
          // Raise arms forward when carrying a scanned object
          leftArmPivot.rotation.x = -1.15;
          rightArmPivot.rotation.x = -1.15;
        } else {
          leftArmPivot.rotation.x = -swing * 0.85;
          rightArmPivot.rotation.x = swing * 0.85;
        }
        headGroup.position.y = 1.54 + Math.abs(Math.cos(walkCycleTime)) * 0.03;
      } else {
        // Idle breathing pose
        leftLegPivot.rotation.x *= 0.85;
        rightLegPivot.rotation.x *= 0.85;
        if (curCarried) {
          leftArmPivot.rotation.x = -1.15;
          rightArmPivot.rotation.x = -1.15;
        } else {
          leftArmPivot.rotation.x = Math.sin(elapsed * 2) * 0.04;
          rightArmPivot.rotation.x = -Math.sin(elapsed * 2) * 0.04;
        }
        headGroup.position.y = 1.54 + Math.sin(elapsed * 2.2) * 0.012;
      }

      // 2. Animate Active Scanned Objects (e.g. spin_animate)
      placedMeshMapRef.current.forEach((meshGroup) => {
        if (
          meshGroup.userData.behavior === 'spin_animate' &&
          meshGroup.userData.isActiveState
        ) {
          meshGroup.rotation.y += dt * 1.8;
        }
      });

      // 3. Animate Built-in House Fixtures
      const tvActive =
        curFixtures.find((f) => f.id === 'fixture-tv')?.isActive ?? true;
      if (fixtureRefs.current.tvLight) {
        fixtureRefs.current.tvLight.intensity = tvActive ? 1.4 : 0;
      }
      if (tvActive) {
        // Render ambient wave visualizer onto the Living Room TV canvas
        const grad = tvCtx.createLinearGradient(0, 0, 256, 144);
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(0.5, '#4f46e5');
        grad.addColorStop(1, '#0f172a');
        tvCtx.fillStyle = grad;
        tvCtx.fillRect(0, 0, 256, 144);
        tvCtx.strokeStyle = '#38bdf8';
        tvCtx.lineWidth = 3;
        tvCtx.beginPath();
        for (let x = 0; x <= 256; x += 16) {
          const y = 72 + Math.sin(x * 0.04 + elapsed * 3.0) * 28;
          if (x === 0) tvCtx.moveTo(x, y);
          else tvCtx.lineTo(x, y);
        }
        tvCtx.stroke();
        tvTex.needsUpdate = true;
      } else {
        tvCtx.fillStyle = '#090d16';
        tvCtx.fillRect(0, 0, 256, 144);
        tvTex.needsUpdate = true;
      }

      const floorLampActive =
        curFixtures.find((f) => f.id === 'fixture-floor-lamp')?.isActive ?? true;
      if (
        fixtureRefs.current.floorLampLight &&
        fixtureRefs.current.floorLampShadeMat
      ) {
        fixtureRefs.current.floorLampLight.intensity = floorLampActive ? 2.4 : 0;
        fixtureRefs.current.floorLampShadeMat.emissiveIntensity =
          floorLampActive ? 0.85 : 0;
      }

      const bedLampActive =
        curFixtures.find((f) => f.id === 'fixture-bed-lamp')?.isActive ?? true;
      if (
        fixtureRefs.current.bedLampLight &&
        fixtureRefs.current.bedLampShadeMat
      ) {
        fixtureRefs.current.bedLampLight.intensity = bedLampActive ? 1.8 : 0;
        fixtureRefs.current.bedLampShadeMat.emissiveIntensity = bedLampActive
          ? 0.8
          : 0;
      }

      const fridgeOpen =
        curFixtures.find((f) => f.id === 'fixture-fridge')?.isActive ?? false;
      if (fixtureRefs.current.fridgeDoorPivot) {
        const targetRot = fridgeOpen ? -1.35 : 0;
        fixtureRefs.current.fridgeDoorPivot.rotation.y +=
          (targetRot - fixtureRefs.current.fridgeDoorPivot.rotation.y) * 0.12;
      }

      const patioOpenState =
        curFixtures.find((f) => f.id === 'fixture-patio-door')?.isActive ?? true;
      if (fixtureRefs.current.patioDoorMesh) {
        const targetX = patioOpenState ? 6.2 : 4.6;
        fixtureRefs.current.patioDoorMesh.position.x +=
          (targetX - fixtureRefs.current.patioDoorMesh.position.x) * 0.12;
      }

      const cbActive =
        curFixtures.find((f) => f.id === 'fixture-chromebook')?.isActive ?? true;
      if (fixtureRefs.current.chromebookLidPivot) {
        const targetLidRot = cbActive ? -0.25 : 1.52;
        fixtureRefs.current.chromebookLidPivot.rotation.x +=
          (targetLidRot - fixtureRefs.current.chromebookLidPivot.rotation.x) *
          0.14;
      }

      // 4. Camera Choreography (Follow Cam, First-Person Eye Level, or Architect Orbit)
      if (curCamMode === 'first_person') {
        humanGroup.visible = false;
        const eyeX = humanGroup.position.x;
        const eyeY = 1.62;
        const eyeZ = humanGroup.position.z;
        camera.position.set(eyeX, eyeY, eyeZ);
        const lookX = eyeX + Math.sin(humanGroup.rotation.y) * 4;
        const lookZ = eyeZ + Math.cos(humanGroup.rotation.y) * 4;
        camera.lookAt(lookX, 1.48, lookZ);
      } else if (curCamMode === 'follow') {
        humanGroup.visible = true;
        orbitTarget.lerp(
          new THREE.Vector3(
            humanGroup.position.x,
            1.1,
            humanGroup.position.z
          ),
          0.1
        );
        const camX =
          orbitTarget.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDist;
        const camY = orbitTarget.y + Math.sin(cameraPitch) * cameraDist;
        const camZ =
          orbitTarget.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDist;
        camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.12);
        camera.lookAt(orbitTarget);
      } else {
        // Architect Dollhouse Orbit View
        humanGroup.visible = true;
        orbitTarget.lerp(new THREE.Vector3(0, 0.8, 0), 0.08);
        const camX =
          orbitTarget.x +
          Math.sin(cameraYaw) * Math.cos(cameraPitch) * (cameraDist * 1.35);
        const camY =
          orbitTarget.y + Math.sin(cameraPitch) * (cameraDist * 1.35);
        const camZ =
          orbitTarget.z +
          Math.cos(cameraYaw) * Math.cos(cameraPitch) * (cameraDist * 1.35);
        camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.12);
        camera.lookAt(orbitTarget);
      }

      // 5. Smart Wall Cutaway (keeps interior rooms unobstructed)
      wallMeshesRef.current.forEach(({ mesh, side }) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (curCutaway === 'down') {
          mesh.scale.y = 0.22;
          mesh.position.y = (wallH * 0.22) / 2;
          mat.opacity = 0.85;
        } else if (curCutaway === 'full') {
          mesh.scale.y = 1.0;
          mesh.position.y = wallH / 2;
          mat.opacity = 1.0;
        } else {
          // 'auto': lower front/blocking walls based on camera direction
          const isBlockingSouth = side === 'south' && camera.position.z > 2;
          const isBlockingEast = side === 'east' && camera.position.x > 4;
          const isBlockingWest = side === 'west' && camera.position.x < -4;
          const isBlockingNorth = side === 'north' && camera.position.z < -2;
          if (
            isBlockingSouth ||
            isBlockingEast ||
            isBlockingWest ||
            isBlockingNorth
          ) {
            mesh.scale.y = 0.25;
            mesh.position.y = (wallH * 0.25) / 2;
            mat.opacity = 0.65;
          } else {
            mesh.scale.y = 1.0;
            mesh.position.y = wallH / 2;
            mat.opacity = 1.0;
          }
        }
      });

      // 6. Find Nearest Interactable Object (within 2.35 meters of Human)
      let bestCandidate: NearbyInteractable | null = null;
      let bestDist = 2.35;

      for (const placed of curPlaced) {
        if (placed.instanceId === curCarried) continue;
        const dx = placed.position[0] - humanGroup.position.x;
        const dz = placed.position[2] - humanGroup.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < bestDist) {
          bestDist = dist;
          const asset = stateRef.current.assets.find(
            (a) => a.id === placed.assetId
          );
          const behaviorLabel =
            asset?.interactionBehavior === 'toggle_light'
              ? placed.isActiveState
                ? 'Turn Off Light'
                : 'Turn On Light'
              : asset?.interactionBehavior === 'play_sound'
              ? 'Play Sound & Inspect'
              : asset?.interactionBehavior === 'spin_animate'
              ? placed.isActiveState
                ? 'Stop Spin'
                : 'Spin & Inspect'
              : 'Inspect 3D Scan';
          bestCandidate = {
            type: 'scanned',
            id: placed.instanceId,
            name: placed.name,
            prompt: behaviorLabel,
            distance: Number(dist.toFixed(2)),
            room: placed.room,
            canPickUp: true,
          };
        }
      }

      for (const fix of curFixtures) {
        const dx = fix.position[0] - humanGroup.position.x;
        const dz = fix.position[2] - humanGroup.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < bestDist) {
          bestDist = dist;
          bestCandidate = {
            type: 'fixture',
            id: fix.id,
            name: fix.name,
            prompt: fix.interactionPrompt,
            distance: Number(dist.toFixed(2)),
            room: fix.room,
            canPickUp: false,
          };
        }
      }

      latestNearby = bestCandidate;

      if (bestCandidate) {
        proximityRing.visible = true;
        if (bestCandidate.type === 'scanned') {
          const p = curPlaced.find((o) => o.instanceId === bestCandidate!.id);
          if (p) {
            proximityRing.position.set(
              p.position[0],
              p.position[1] + 0.015,
              p.position[2]
            );
          }
        } else {
          const f = curFixtures.find((o) => o.id === bestCandidate!.id);
          if (f) {
            proximityRing.position.set(f.position[0], 0.02, f.position[2]);
          }
        }
        const pulse = 1 + Math.sin(elapsed * 6) * 0.08;
        proximityRing.scale.setScalar(pulse);
      } else {
        proximityRing.visible = false;
      }

      // Report telemetry to React HUD at ~12Hz to avoid excessive re-renders
      if (elapsed - lastTelemetryTime > 0.08) {
        lastTelemetryTime = elapsed;
        stateRef.current.onTelemetryChange(
          {
            x: Number(humanGroup.position.x.toFixed(2)),
            z: Number(humanGroup.position.z.toFixed(2)),
            rotationY: Number(humanGroup.rotation.y.toFixed(2)),
            currentRoom: getRoomForPosition(
              humanGroup.position.x,
              humanGroup.position.z
            ),
            isMoving,
            carriedInstanceId: curCarried,
          },
          bestCandidate
        );
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost
      );
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored
      );
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Surface Placement Cursor Banner when placing a scanned object */}
      {placingAssetId && hoverSurfaceLabel && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-amber-500/95 text-slate-950 text-xs font-semibold shadow-lg">
          Click to place on {hoverSurfaceLabel}
        </div>
      )}

      {/* WebGL Context Lost Fallback */}
      {webglLost && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            3D WebGL Viewport Paused
          </h2>
          <p className="text-sm text-slate-300 max-w-md mb-4">
            Your Chromebook GPU temporarily suspended the WebGL context. Click
            below to restore the 3D virtual house.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold hover:bg-amber-400 transition-colors"
          >
            Restore 3D Viewport
          </button>
        </div>
      )}
    </div>
  );
};
