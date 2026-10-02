import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Briefcase,
  Package,
  Car,
  Home,
  Dog,
  Gauge,
  MessageSquare,
  Sparkles,
  Volume2,
  VolumeX,
  Save,
  Check,
  RotateCcw,
  Compass,
  Navigation,
  Anchor,
  Flame,
  Film,
  MapPin,
  Coins,
  Fuel,
} from 'lucide-react';
import {
  ActiveVehicleType,
  CarVehicle,
  CatalogItem,
  HouseTierInfo,
  JobInfo,
  NPCData,
  PetItem,
  PlacedItem,
  PlacedPet,
} from './types/housesim';
import {
  CARS_CATALOG,
  CATALOG_ITEMS,
  HOUSE_TIERS,
  JOBS_LIST,
  PETS_CATALOG,
} from './data/catalog';
import { VirtualHouseCanvas } from './components/VirtualHouseCanvas';
import { ShopModal } from './components/ShopModal';
import { WorkplaceModal } from './components/WorkplaceModal';
import { InventoryModal } from './components/InventoryModal';
import { soundFX } from './utils/soundEffects';

const STORAGE_KEY_SAVE = 'housesim_life_save_v2';

export default function App() {
  // Player Economy & State
  const [playerCash, setPlayerCash] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVE);
      if (saved) return JSON.parse(saved).cash ?? 650;
    } catch {}
    return 650; // Starting cash in dollars ($)
  });

  const [houseTier, setHouseTier] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVE);
      if (saved) return JSON.parse(saved).houseTier ?? 1;
    } catch {}
    return 1;
  });

  const [currentJobId, setCurrentJobId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVE);
      if (saved) return JSON.parse(saved).currentJobId ?? 'job-barista';
    } catch {}
    return 'job-barista';
  });

  const [ownedCarIds, setOwnedCarIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVE);
      if (saved) return JSON.parse(saved).ownedCarIds ?? ['car-sedan-metro'];
    } catch {}
    return ['car-sedan-metro'];
  });

  const [activeCarId, setActiveCarId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVE);
      if (saved) return JSON.parse(saved).activeCarId ?? 'car-sedan-metro';
    } catch {}
    return 'car-sedan-metro';
  });

  const [ownedItemIds, setOwnedItemIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVE);
      if (saved) return JSON.parse(saved).ownedItemIds ?? [];
    } catch {}
    return ['wall-art-golden-abstract', 'furn-sofa-velvet', 'item-espresso-maker'];
  });

  const [placedItems, setPlacedItems] = useState<PlacedItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVE);
      if (saved && Array.isArray(JSON.parse(saved).placedItems)) {
        return JSON.parse(saved).placedItems;
      }
    } catch {}
    return [
      {
        instanceId: 'init-sofa',
        itemId: 'furn-sofa-velvet',
        name: 'Mid-Century Velvet Sofa',
        category: 'furniture',
        placementType: 'floor',
        position: [-10.5, 0.05, 7.5],
        rotationY: 0,
        isOnWall: false,
        zone: 'interior',
        scale: 1.0,
        isActiveState: false,
      },
    ];
  });

  const [placedPets, setPlacedPets] = useState<PlacedPet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVE);
      if (saved && Array.isArray(JSON.parse(saved).placedPets)) {
        return JSON.parse(saved).placedPets;
      }
    } catch {}
    return [];
  });

  // Driving & Interaction States
  const [activeVehicle, setActiveVehicle] = useState<ActiveVehicleType>(null);
  const isDrivingCar = activeVehicle === 'car';
  const [vehicleSpeed, setVehicleSpeed] = useState(0);
  const [helicopterAltitude, setHelicopterAltitude] = useState(0);
  const [cityToast, setCityToast] = useState<string | null>(null);
  const [activePlacingItem, setActivePlacingItem] = useState<CatalogItem | null>(null);

  // Car Fuel & Gas Jug System
  const [carFuel, setCarFuel] = useState<number>(() => {
    try {
      const s = localStorage.getItem('housesim_car_fuel');
      if (s) return parseFloat(s);
    } catch {}
    return 100;
  });

  const [hasGasJug, setHasGasJug] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('housesim_gas_jug');
      if (s) return JSON.parse(s);
    } catch {}
    return false;
  });

  const [respawnSignal, setRespawnSignal] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem('housesim_car_fuel', carFuel.toString());
    } catch {}
  }, [carFuel]);

  useEffect(() => {
    try {
      localStorage.setItem('housesim_gas_jug', JSON.stringify(hasGasJug));
    } catch {}
  }, [hasGasJug]);

  // Modals
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [workplaceModalOpen, setWorkplaceModalOpen] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);

  // Active NPC Dialogue Overlay
  const [activeNPC, setActiveNPC] = useState<{ npc: NPCData; dialogue: string } | null>(null);
  const [activePetToast, setActivePetToast] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  // Persistent Player & Multi-Vehicle Positions
  const [savedPositions, setSavedPositions] = useState<{
    playerPos: [number, number, number];
    carPos: { x: number; z: number; rotationY: number };
    boatPos: { x: number; z: number; rotationY: number };
    heliPos: { x: number; y: number; z: number; rotationY: number };
  }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVE);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          playerPos: parsed.playerPos || [-10.0, 0, 7.5],
          carPos: parsed.carPos || { x: -4.0, z: 14.0, rotationY: Math.PI / 2 },
          boatPos: parsed.boatPos || { x: -142, z: 110, rotationY: -Math.PI / 2 },
          heliPos: parsed.heliPos || { x: 125, y: 0.18, z: -50, rotationY: 0 },
        };
      }
    } catch {}
    return {
      playerPos: [-10.0, 0, 7.5],
      carPos: { x: -4.0, z: 14.0, rotationY: Math.PI / 2 },
      boatPos: { x: -142, z: 110, rotationY: -Math.PI / 2 },
      heliPos: { x: 125, y: 0.18, z: -50, rotationY: 0 },
    };
  });

  const latestPositionsRef = useRef(savedPositions);

  const handleSavePositions = (
    playerPos: [number, number, number],
    carPos: { x: number; z: number; rotationY: number },
    boatPos?: { x: number; z: number; rotationY: number },
    heliPos?: { x: number; y: number; z: number; rotationY: number }
  ) => {
    const updated = {
      playerPos,
      carPos,
      boatPos: boatPos || latestPositionsRef.current.boatPos,
      heliPos: heliPos || latestPositionsRef.current.heliPos,
    };
    latestPositionsRef.current = updated;
    setSavedPositions(updated);
  };

  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Execute Save to LocalStorage
  const executeSave = (isManual = false) => {
    try {
      const dataToSave = {
        cash: playerCash,
        houseTier,
        currentJobId,
        ownedCarIds,
        activeCarId,
        ownedItemIds,
        placedItems,
        placedPets,
        playerPos: latestPositionsRef.current.playerPos,
        carPos: latestPositionsRef.current.carPos,
        boatPos: latestPositionsRef.current.boatPos,
        heliPos: latestPositionsRef.current.heliPos,
        carFuel,
        hasGasJug,
        lastSaved: new Date().toLocaleTimeString(),
      };
      localStorage.setItem(STORAGE_KEY_SAVE, JSON.stringify(dataToSave));
      if (isManual) {
        setIsSaving(true);
        soundFX.playPlaceObject();
        setSaveToast('Progress saved to localStorage!');
        setTimeout(() => {
          setIsSaving(false);
          setSaveToast(null);
        }, 2500);
      }
    } catch {}
  };

  // Auto-Save whenever important simulation state changes
  useEffect(() => {
    executeSave(false);
  }, [
    playerCash,
    houseTier,
    currentJobId,
    ownedCarIds,
    activeCarId,
    ownedItemIds,
    placedItems,
    placedPets,
    savedPositions,
    carFuel,
    hasGasJug,
  ]);

  // Vehicle Enter / Exit Handlers
  const handleEnterVehicle = (type: 'car' | 'boat' | 'helicopter') => {
    setActiveVehicle(type);
  };

  const handleExitVehicle = () => {
    if (activeVehicle === 'helicopter' && helicopterAltitude > 1) {
      handleShowCityToast('⚠️ Cannot exit helicopter mid-air! Hold [E] to land safely on the ground first.');
      return;
    }
    setActiveVehicle(null);
  };

  // Respawn All Vehicles to Spawn Points
  const handleRespawnVehicles = () => {
    setRespawnSignal((prev) => prev + 1);
    soundFX.playPlaceObject();
    handleShowCityToast('🔄 All vehicles (Car, Boat, Helicopter) respawned to their bays!');
    if (activeVehicle === 'helicopter' && helicopterAltitude > 1) {
      setActiveVehicle(null);
    }
  };

  // Gas Station & Refuel Handlers
  const handleBuyGasJug = () => {
    setHasGasJug(true);
  };

  const handleRefuelCarWithJug = () => {
    setHasGasJug(false);
    setCarFuel((prev) => Math.min(100, prev + 65));
  };

  const handleRefuelAtPump = () => {
    setCarFuel(100);
  };

  // City Bonuses & Toast Feedback
  const handleBonusCash = (amount: number, _reason: string) => {
    setPlayerCash((prev) => Math.max(0, prev + amount));
  };

  const handleShowCityToast = (message: string) => {
    setCityToast(message);
    setTimeout(() => {
      setCityToast(null);
    }, 3800);
  };

  // Quick Travel / GPS Waypoint
  const handleQuickTravel = (coords: [number, number, number], name: string) => {
    handleExitVehicle();
    const updated = {
      ...latestPositionsRef.current,
      playerPos: coords,
    };
    latestPositionsRef.current = updated;
    setSavedPositions(updated);
    soundFX.playInteractChime();
    handleShowCityToast(`📍 Traveled to ${name}`);
  };

  // Shop Handlers
  const handleBuyItem = (item: CatalogItem) => {
    setPlayerCash((prev) => prev - item.price);
    setOwnedItemIds((prev) => [...prev, item.id]);
  };

  const handleBuyCar = (car: CarVehicle) => {
    setPlayerCash((prev) => prev - car.price);
    setOwnedCarIds((prev) => [...prev, car.id]);
    setActiveCarId(car.id);
  };

  const handleBuyPet = (pet: PetItem) => {
    setPlayerCash((prev) => prev - pet.price);
    const newPet: PlacedPet = {
      instanceId: `pet-${Date.now()}`,
      petId: pet.id,
      customName: pet.name,
      petType: pet.petType,
      position: [-8, 0, 7],
      rotationY: 0,
      happiness: 100,
      isFollowing: true,
    };
    setPlacedPets((prev) => [...prev, newPet]);
  };

  const handleUpgradeHouse = (tierInfo: HouseTierInfo) => {
    setPlayerCash((prev) => prev - tierInfo.price);
    setHouseTier(tierInfo.tier);
  };

  // Workplace Handlers
  const handleEarnCash = (amount: number, _reason: string) => {
    setPlayerCash((prev) => prev + amount);
  };

  // Placement Handlers
  const handlePlaceItem = (
    item: CatalogItem,
    position: [number, number, number],
    rotationY: number,
    isOnWall: boolean,
    wallNormal?: [number, number, number]
  ) => {
    const newPlaced: PlacedItem = {
      instanceId: `placed-${Date.now()}`,
      itemId: item.id,
      name: item.name,
      category: item.category,
      placementType: item.placementType,
      position,
      rotationY,
      wallNormal,
      isOnWall,
      zone: item.placementType === 'backyard_only' ? 'backyard' : 'interior',
      scale: 1.0,
      isActiveState: true,
    };

    setPlacedItems((prev) => [...prev, newPlaced]);
    // Remove from unplaced inventory
    const idx = ownedItemIds.indexOf(item.id);
    if (idx !== -1) {
      setOwnedItemIds((prev) => {
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
      });
    }
    setActivePlacingItem(null);
  };

  const handleRemovePlacedItem = (instanceId: string) => {
    const found = placedItems.find((p) => p.instanceId === instanceId);
    if (found) {
      setOwnedItemIds((prev) => [...prev, found.itemId]);
      setPlacedItems((prev) => prev.filter((p) => p.instanceId !== instanceId));
      soundFX.playPlaceObject();
    }
  };

  // Interactions
  const handleInteractWithNPC = (npc: NPCData) => {
    const randomLine = npc.dialogueList[Math.floor(Math.random() * npc.dialogueList.length)];
    setActiveNPC({ npc, dialogue: randomLine });
  };

  const handleInteractWithPet = (pet: PlacedPet) => {
    setActivePetToast(`You petted ${pet.customName}! ❤️ Happiness increased.`);
    setTimeout(() => setActivePetToast(null), 3000);
  };

  const currentJob = JOBS_LIST.find((j) => j.id === currentJobId);
  const currentTierInfo = HOUSE_TIERS.find((t) => t.tier === houseTier) || HOUSE_TIERS[0];
  const ownedCarsList = CARS_CATALOG.filter((c) => ownedCarIds.includes(c.id));

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-slate-950 select-none">
      {/* =====================================================================
          TOP BAR CONTRACT (Zone 1: Brand — Zone 2: Nav Status — Zone 3: Actions)
          ===================================================================== */}
      <header className="z-30 flex items-center justify-between px-5 py-3 bg-slate-950/90 backdrop-blur-md border-b border-white/10 shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <a href="#top" className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap">
          HouseSim
        </a>

        {/* Zone 2: Clean unboxed metadata with typographic separators */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-1 font-mono text-emerald-400 font-bold">
            <DollarSign className="w-3.5 h-3.5" />
            <span>${playerCash.toLocaleString()}</span>
          </div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>{currentTierInfo.name}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-amber-300">{currentJob?.title || 'Unemployed'}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Auto-Saved
          </span>
          {activeVehicle && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-cyan-300 font-mono font-bold flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5" />
                {vehicleSpeed} {activeVehicle === 'boat' ? 'kts' : 'mph'}
              </span>
            </>
          )}
        </div>

        {/* Zone 3: Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => executeSave(true)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 rounded-lg hover:bg-emerald-900/80 transition-colors whitespace-nowrap"
            title="Save Game to localStorage"
          >
            {isSaving ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5 text-emerald-400" />}
            Save
          </button>
          <button
            onClick={() => setShopModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Stores
          </button>
          <button
            onClick={() => setWorkplaceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 border border-white/10 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
            Work ($)
          </button>
          <button
            onClick={() => setInventoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 border border-white/10 rounded-lg hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            Furnish
          </button>
          <button
            onClick={() => {
              const n = !muted;
              setMuted(n);
              soundFX.muted = n;
            }}
            className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
            aria-label="Toggle sound"
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN 3D SIMULATION CANVAS
          ===================================================================== */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <VirtualHouseCanvas
          playerCash={playerCash}
          houseTier={houseTier}
          placedItems={placedItems}
          ownedCars={ownedCarsList}
          activeCarId={activeCarId}
          placedPets={placedPets}
          activePlacingItem={activePlacingItem}
          isDrivingCar={isDrivingCar}
          activeVehicle={activeVehicle}
          onEnterVehicle={handleEnterVehicle}
          onExitVehicle={handleExitVehicle}
          onEnterCar={() => handleEnterVehicle('car')}
          onExitCar={handleExitVehicle}
          onPlaceItem={handlePlaceItem}
          onCancelPlacing={() => setActivePlacingItem(null)}
          onInteractWithNPC={handleInteractWithNPC}
          onInteractWithPet={handleInteractWithPet}
          onOpenShop={(_tab) => setShopModalOpen(true)}
          onOpenWorkplace={() => setWorkplaceModalOpen(true)}
          onSpeedUpdate={setVehicleSpeed}
          onAltitudeUpdate={setHelicopterAltitude}
          initialPlayerPos={savedPositions.playerPos}
          initialCarPos={savedPositions.carPos}
          initialBoatPos={savedPositions.boatPos}
          initialHeliPos={savedPositions.heliPos}
          onSavePositions={handleSavePositions}
          onBonusCash={handleBonusCash}
          onShowToast={handleShowCityToast}
          carFuel={carFuel}
          hasGasJug={hasGasJug}
          onFuelUpdate={setCarFuel}
          onBuyGasJug={handleBuyGasJug}
          onRefuelCarWithJug={handleRefuelCarWithJug}
          onRefuelAtPump={handleRefuelAtPump}
          respawnSignal={respawnSignal}
        />

        {/* CITY GPS FAST TRAVEL & VEHICLE RESPAWN NAVIGATOR */}
        <div className="pointer-events-auto absolute top-4 right-4 z-20 hidden md:flex items-center gap-1.5 bg-slate-950/95 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-1.5 px-2 py-1 text-slate-400 text-[11px] font-bold border-r border-white/10 mr-0.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
            <span>Map & Travel:</span>
          </div>
          <button
            onClick={() => handleQuickTravel([-10.0, 0, 7.5], 'Home Driveway')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all hover:scale-105"
            title="Fast travel to Home"
          >
            <span>🏡</span>
            <span>Home</span>
          </button>
          <button
            onClick={() => handleQuickTravel([28, 0, 48], 'Metro Gas Station')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-500/30 text-red-200 text-xs font-semibold transition-all hover:scale-105"
            title="Fast travel to Gas Station"
          >
            <span>⛽</span>
            <span>Gas Station</span>
          </button>
          <button
            onClick={() => handleQuickTravel([-126, 0.25, 110], 'Marina Yacht Pier')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-950/70 hover:bg-sky-900 border border-sky-500/30 text-sky-200 text-xs font-semibold transition-all hover:scale-105"
            title="Fast travel to Marina Boat"
          >
            <span>⛵</span>
            <span>Marina Boat</span>
          </button>
          <button
            onClick={() => handleQuickTravel([122, 0.1, -48], 'Airport Helipad')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-500/30 text-amber-200 text-xs font-semibold transition-all hover:scale-105"
            title="Fast travel to Helicopter Helipad"
          >
            <span>🚁</span>
            <span>Helipad</span>
          </button>
          <button
            onClick={() => handleQuickTravel([115, 0.1, 35], 'Speedway Arena')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/30 text-rose-200 text-xs font-semibold transition-all hover:scale-105"
            title="Fast travel to Speedway"
          >
            <span>🏎️</span>
            <span>Speedway</span>
          </button>
          <button
            onClick={() => handleQuickTravel([48, 0.1, 48], 'City Plaza Fountain')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all hover:scale-105"
            title="Fast travel to City Hall & Fountain"
          >
            <span>🪙</span>
            <span>Fountain</span>
          </button>
          <button
            onClick={() => handleQuickTravel([-110, 0.1, -110], 'Pine Mountain Campfire')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-200 text-xs font-semibold transition-all hover:scale-105"
            title="Fast travel to Mountain Campfire"
          >
            <span>🌲</span>
            <span>Campfire</span>
          </button>
          <button
            onClick={() => handleQuickTravel([8.5, 0.1, 125], 'Starlight Cinema')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-500/30 text-purple-200 text-xs font-semibold transition-all hover:scale-105"
            title="Fast travel to Drive-In Cinema"
          >
            <span>🎬</span>
            <span>Cinema</span>
          </button>
          {/* RESPAWN VEHICLES BUTTON */}
          <button
            onClick={handleRespawnVehicles}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md hover:scale-105 border border-cyan-300/40 ml-1"
            title="Respawn all vehicles (Car, Boat, Helicopter) back to their bays"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Respawn Vehicles</span>
          </button>
        </div>

        {/* SAVE CONFIRMATION TOAST */}
        {saveToast && (
          <div className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-2xl flex items-center gap-2 animate-bounce border border-emerald-300">
            <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>{saveToast}</span>
          </div>
        )}

        {/* CITY EVENT / REWARD TOAST */}
        {cityToast && (
          <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce border-2 border-white/40">
            <span>✨</span>
            <span className="font-display tracking-wide">{cityToast}</span>
          </div>
        )}

        {/* CAR DRIVING HUD OVERLAY WITH FUEL GAUGE */}
        {activeVehicle === 'car' && (
          <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col md:flex-row items-center gap-4 bg-slate-950/95 backdrop-blur-md border border-cyan-500/40 px-6 py-3 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3 border-r border-white/10 pr-3">
              <div className="flex items-center gap-2 font-mono text-cyan-400 font-bold text-base">
                <Gauge className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span>{vehicleSpeed} MPH</span>
              </div>
              {/* FUEL GAUGE */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/10 font-mono text-xs">
                <Fuel className={`w-4 h-4 ${carFuel > 35 ? 'text-emerald-400' : carFuel > 12 ? 'text-amber-400' : 'text-rose-500 animate-bounce'}`} />
                <div className="w-20 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/10">
                  <div
                    className={`h-full transition-all duration-300 ${
                      carFuel > 40 ? 'bg-emerald-500' : carFuel > 15 ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'
                    }`}
                    style={{ width: `${Math.round(carFuel)}%` }}
                  />
                </div>
                <span className={`font-bold ${carFuel > 15 ? 'text-slate-200' : 'text-rose-400 animate-pulse'}`}>
                  {Math.round(carFuel)}%
                </span>
              </div>
            </div>

            {/* Out of Gas Alert */}
            {carFuel <= 0 && (
              <div className="px-3 py-1 bg-rose-600/90 text-white font-black text-xs rounded-xl animate-pulse border border-rose-400">
                ⚠️ OUT OF GAS! Walk to Gas Station for Fuel Jug
              </div>
            )}

            <div className="text-xs text-slate-300">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">W/S</kbd> Drive ·{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">A/D</kbd> Steer ·{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">H</kbd> Horn
            </div>
            <button
              onClick={handleExitVehicle}
              className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors"
            >
              Exit Car [E]
            </button>
          </div>
        )}

        {/* BOAT CRUISING HUD OVERLAY */}
        {activeVehicle === 'boat' && (
          <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-slate-950/95 backdrop-blur-md border border-sky-400/50 px-6 py-3 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2 font-mono text-sky-400 font-bold text-base">
              <Anchor className="w-5 h-5 text-sky-400 animate-bounce" />
              <span>{vehicleSpeed} KTS</span>
            </div>
            <div className="text-xs text-slate-300">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">W/S</kbd> Throttle ·{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">A/D</kbd> Rudder Turn
            </div>
            <button
              onClick={handleExitVehicle}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              Exit Boat [E]
            </button>
          </div>
        )}

        {/* HELICOPTER FLIGHT HUD OVERLAY */}
        {activeVehicle === 'helicopter' && (
          <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-slate-950/95 backdrop-blur-md border border-amber-400/60 px-6 py-3.5 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3 font-mono text-amber-400 font-bold text-sm border-r border-white/10 pr-3">
              <Navigation className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">ALTITUDE</span>
                <span>{helicopterAltitude}m</span>
              </div>
              <div className="ml-2">
                <span className="text-[10px] text-slate-400 block font-sans">AIRSPEED</span>
                <span>{vehicleSpeed} MPH</span>
              </div>
            </div>
            <div className="text-xs text-slate-300 space-y-0.5">
              <div>
                <kbd className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-mono font-bold">Q</kbd> Ascend ↑ ·{' '}
                <kbd className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded font-mono font-bold">E</kbd> Descend / Land ↓
              </div>
              <div className="text-[11px] text-slate-400">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">W/S</kbd> Pitch/Fly ·{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">A/D</kbd> Turn
              </div>
            </div>
            <button
              onClick={handleExitVehicle}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors flex items-center gap-1.5 shadow-lg"
            >
              Land & Disembark [E / F]
            </button>
          </div>
        )}

        {/* NPC DIALOGUE BUBBLE OVERLAY */}
        {activeNPC && (
          <div className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-md bg-slate-950/95 backdrop-blur-md border border-amber-500/40 p-4 rounded-2xl shadow-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm text-white font-display">{activeNPC.npc.name}</span>
                <span className="text-xs text-slate-400">({activeNPC.npc.role})</span>
              </div>
              <button
                onClick={() => setActiveNPC(null)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              "{activeNPC.dialogue}"
            </p>
          </div>
        )}

        {/* PET INTERACTION TOAST */}
        {activePetToast && (
          <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-emerald-500/90 text-slate-950 font-semibold text-xs rounded-xl shadow-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {activePetToast}
          </div>
        )}

        {/* GAS JUG INVENTORY BADGE ON FOOT */}
        {hasGasJug && !activeVehicle && (
          <div className="pointer-events-auto absolute top-20 left-6 z-30 flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 rounded-2xl font-extrabold text-xs shadow-2xl border-2 border-white animate-pulse">
            <Fuel className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>🛢️ Filled Fuel Jug in Hand — Bring to your car & press [E] to refuel!</span>
          </div>
        )}

        {/* CONTROLS HELPER (Bottom Left) */}
        {!activeVehicle && (
          <div className="pointer-events-none absolute bottom-5 left-5 z-10 bg-slate-950/85 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1.5 shadow-xl">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white text-[11px]">W / ↑</kbd>
              <span>Forward</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white text-[11px]">S / ↓</kbd>
              <span>Backward</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white text-[11px]">A / ←</kbd>
              <span>Left</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white text-[11px]">D / →</kbd>
              <span>Right</span>
              <span className="text-[11px] text-slate-400">· Shift: Sprint</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5 border-t border-white/5">
              <kbd className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded font-mono text-emerald-300 text-[11px]">E</kbd>
              <span>Drive Boat ⛵ · Pilot Helicopter 🚁 · Drive Car 🚗 · Interact with City</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-amber-300/90 pt-0.5 border-t border-white/5">
              <span>Right-Click + Drag: Rotate Camera POV · Scroll: Zoom In/Out</span>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          MODALS
          ===================================================================== */}
      <ShopModal
        isOpen={shopModalOpen}
        onClose={() => setShopModalOpen(false)}
        playerCash={playerCash}
        currentHouseTier={houseTier}
        ownedCarIds={ownedCarIds}
        ownedPetIds={placedPets.map((p) => p.petId)}
        onBuyItem={handleBuyItem}
        onBuyCar={handleBuyCar}
        onBuyPet={handleBuyPet}
        onUpgradeHouse={handleUpgradeHouse}
      />

      <WorkplaceModal
        isOpen={workplaceModalOpen}
        onClose={() => setWorkplaceModalOpen(false)}
        currentJobId={currentJobId}
        onSelectJob={(job) => setCurrentJobId(job.id)}
        onEarnCash={handleEarnCash}
      />

      <InventoryModal
        isOpen={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
        ownedItemIds={ownedItemIds}
        placedItems={placedItems}
        onStartPlacing={(item) => setActivePlacingItem(item)}
        onRemovePlacedItem={handleRemovePlacedItem}
      />
    </div>
  );
}
