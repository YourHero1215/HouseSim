export type ScanShapeMode = 'lathe' | 'extrude' | 'voxel' | 'box';

export type InteractionBehavior =
  | 'inspect'
  | 'toggle_light'
  | 'play_sound'
  | 'spin_animate';

export interface VoxelCell {
  r: number;
  g: number;
  b: number;
  depth: number;
  active: boolean;
}

export interface ScannedObjectAsset {
  id: string;
  name: string;
  category: 'Decor' | 'Electronics' | 'Kitchenware' | 'Lighting' | 'Collectible';
  sourceType: 'camera' | 'video' | 'preset';
  scannedAt: string;
  textureDataUrl: string;
  multiAngleFrames?: string[];
  silhouetteProfile: number[]; // 16 vertical slices, 0.05..1.0 normalized width
  voxelGrid?: VoxelCell[][]; // 14x14 depth/color grid
  dominantColor: string;
  secondaryColor: string;
  shapeMode: ScanShapeMode;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  roughness: number;
  metalness: number;
  interactionBehavior: InteractionBehavior;
  interactionNote: string;
  lidarCompensationMethod?: 'photogrammetry' | 'ai_monocular_depth' | 'silhouette_lathe' | 'voxel_relief';
  lidarExplanation?: string;
}

export interface PlacedHouseObject {
  instanceId: string;
  assetId: string;
  name: string;
  room: string;
  position: [number, number, number];
  rotationY: number;
  scale: number;
  isActiveState: boolean;
  surfaceName: string;
}

export interface BuiltinFixture {
  id: string;
  name: string;
  room: string;
  position: [number, number, number];
  interactionPrompt: string;
  isActive: boolean;
  description: string;
}

export type CameraViewMode = 'follow' | 'first_person' | 'orbit';
export type TimeOfDay = 'day' | 'sunset' | 'night';
export type WallCutawayMode = 'auto' | 'down' | 'full';

export interface HumanTelemetry {
  x: number;
  z: number;
  rotationY: number;
  currentRoom: string;
  isMoving: boolean;
  carriedInstanceId: string | null;
}

export interface NearbyInteractable {
  type: 'scanned' | 'fixture';
  id: string;
  name: string;
  prompt: string;
  distance: number;
  room: string;
  canPickUp: boolean;
}
