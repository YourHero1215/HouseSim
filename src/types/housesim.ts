export type ItemCategory =
  | 'furniture'
  | 'wall_decor'
  | 'electronics'
  | 'outdoor'
  | 'car'
  | 'pet'
  | 'everyday'
  | 'grocery';

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

export interface GroceryItem {
  id: string;
  name: string;
  price: number;
  icon: string;
  category: 'beverage' | 'ingredient' | 'snack' | 'perishable';
  description: string;
  usageTip: string;
}

export type GroceryInventory = Record<string, number>;

export interface CustomerOrder {
  id: string;
  customerName: string;
  customerAvatar: string;
  orderTitle: string;
  itemsRequested: string[];
  totalTip: number;
  dialogue: string;
  satisfaction: number;
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

export interface ShiftTask {
  id: string;
  title: string;
  description: string;
  customerName?: string;
  customerGreeting?: string;
  customerSpeech?: string;
  requiredItem?: string;
  targetLocation: string;
  targetPos: [number, number, number];
  rewardCash: number;
  completed: boolean;
}

export interface ActiveShift {
  jobId: string;
  jobTitle: string;
  workplaceName: string;
  tasks: ShiftTask[];
  currentTaskIdx: number;
  tasksCompleted: number;
  totalTasks: number;
  timeRemainingSec: number;
  totalEarnedShiftCash: number;
}

export interface JobInfo {
  id: string;
  title: string;
  workplaceName: string;
  basePay: number; // Dollars per shift ($)
  shiftDurationSec: number;
  taskType: 'clerk' | 'coffee' | 'courier' | 'coding' | 'architect' | 'mechanic';
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
  y?: number;
  z: number;
  rotationY: number;
  pitchX?: number;
  speed: number;
  steering: number;
  vy?: number;
  fuel?: number; // 0 to 100%
}

export type ActiveVehicleType = 'car' | 'boat' | 'helicopter' | null;

export interface BoatPhysics {
  x: number;
  z: number;
  rotationY: number;
  speed: number;
  steering: number;
}

export interface HelicopterPhysics {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  speed: number;
  verticalSpeed: number;
  tiltPitch: number;
  tiltRoll: number;
  rotorSpeed: number;
}
