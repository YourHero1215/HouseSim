export type ItemCategory =
  | 'furniture'
  | 'wall_decor'
  | 'electronics'
  | 'outdoor'
  | 'car'
  | 'pet'
  | 'everyday';

export type PlacementType =
  | 'floor'
  | 'wall_only'
  | 'table_or_floor'
  | 'backyard_only'
  | 'driveway_only';

export interface CatalogItem {
  id: string;
  name: string;
  category: ItemCategory;
  price: number; // in Dollars ($)
  description: string;
  placementType: PlacementType;
  dimensions: { width: number; height: number; depth: number };
  color: string;
  secondaryColor?: string;
  modelStyle: string;
  interactiveAction?: string;
}

export interface PlacedItem {
  instanceId: string;
  itemId: string;
  name: string;
  category: ItemCategory;
  placementType: PlacementType;
  position: [number, number, number];
  rotationY: number;
  wallNormal?: [number, number, number];
  isOnWall: boolean;
  zone: 'interior' | 'backyard' | 'driveway';
  scale: number;
  isActiveState: boolean;
}

export interface CarVehicle {
  id: string;
  name: string;
  price: number;
  color: string;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  modelStyle: 'sedan' | 'roadster' | 'muscle' | 'cybertruck';
  description: string;
}

export interface PetItem {
  id: string;
  name: string;
  breed: string;
  price: number;
  petType: 'dog_retriever' | 'dog_shiba' | 'cat_calico' | 'bunny_lop';
  color: string;
  description: string;
}

export interface PlacedPet {
  instanceId: string;
  petId: string;
  customName: string;
  petType: 'dog_retriever' | 'dog_shiba' | 'cat_calico' | 'bunny_lop';
  position: [number, number, number];
  rotationY: number;
  happiness: number;
  isFollowing: boolean;
}

export interface JobInfo {
  id: string;
  title: string;
  workplaceName: string;
  basePay: number; // Dollars per shift ($)
  shiftDurationSec: number;
  taskType: 'coffee' | 'courier' | 'coding' | 'architect';
  description: string;
}

export interface NPCData {
  id: string;
  name: string;
  role: string;
  outfitColor: string;
  position: [number, number, number];
  rotationY: number;
  waypoints: [number, number][];
  currentWaypointIdx: number;
  dialogueList: string[];
}

export interface HouseTierInfo {
  tier: number;
  name: string;
  price: number;
  description: string;
  unlockedRooms: string[];
  hasBackyard: boolean;
}

export interface PlayerState {
  cash: number; // Dollars ($)
  currentJobId: string | null;
  houseTier: number; // 1, 2, or 3
  ownedCarIds: string[];
  activeCarId: string | null;
  ownedPetIds: string[];
  inventory: string[]; // list of CatalogItem ids
}

export interface CarPhysics {
  x: number;
  z: number;
  rotationY: number;
  speed: number;
  steering: number;
}
