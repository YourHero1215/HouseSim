import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
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
  const [isDrivingCar, setIsDrivingCar] = useState(false);
  const [carSpeedMph, setCarSpeedMph] = useState(0);
  const [activePlacingItem, setActivePlacingItem] = useState<CatalogItem | null>(null);

  // Modals
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [workplaceModalOpen, setWorkplaceModalOpen] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);

  // Active NPC Dialogue Overlay
  const [activeNPC, setActiveNPC] = useState<{ npc: NPCData; dialogue: string } | null>(null);
  const [activePetToast, setActivePetToast] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_SAVE,
        JSON.stringify({
          cash: playerCash,
          houseTier,
          currentJobId,
          ownedCarIds,
          activeCarId,
          ownedItemIds,
          placedItems,
          placedPets,
        })
      );
    } catch {}
  }, [playerCash, houseTier, currentJobId, ownedCarIds, activeCarId, ownedItemIds, placedItems, placedPets]);

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
          {isDrivingCar && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-cyan-300 font-mono font-bold flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5" />
                {carSpeedMph} mph
              </span>
            </>
          )}
        </div>

        {/* Zone 3: Primary Action Buttons */}
        <div className="flex items-center gap-2">
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
          onEnterCar={() => setIsDrivingCar(true)}
          onExitCar={() => setIsDrivingCar(false)}
          onPlaceItem={handlePlaceItem}
          onCancelPlacing={() => setActivePlacingItem(null)}
          onInteractWithNPC={handleInteractWithNPC}
          onInteractWithPet={handleInteractWithPet}
          onOpenShop={(_tab) => setShopModalOpen(true)}
          onOpenWorkplace={() => setWorkplaceModalOpen(true)}
          onSpeedUpdate={setCarSpeedMph}
        />

        {/* DRIVING HUD OVERLAY (When inside vehicle) */}
        {isDrivingCar && (
          <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 px-6 py-3 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2 font-mono text-cyan-400 font-bold text-base">
              <Gauge className="w-5 h-5 text-cyan-400 animate-pulse" />
              <span>{carSpeedMph} MPH</span>
            </div>
            <div className="text-xs text-slate-300">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">W/S</kbd> Drive ·{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">A/D</kbd> Steer ·{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white">H</kbd> Horn
            </div>
            <button
              onClick={() => setIsDrivingCar(false)}
              className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors"
            >
              Exit Car [E]
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

        {/* CONTROLS HELPER (Bottom Left) */}
        {!isDrivingCar && (
          <div className="pointer-events-none absolute bottom-5 left-5 z-10 bg-slate-950/85 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1.5 shadow-xl">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white text-[11px]">W / ↑</kbd>
              <span>Forward (into screen)</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white text-[11px]">S / ↓</kbd>
              <span>Backward</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white text-[11px]">A / ←</kbd>
              <span>Left</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-white text-[11px]">D / →</kbd>
              <span>Right</span>
              <span className="text-[11px] text-slate-400">· Shift: Sprint</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5 border-t border-white/5">
              <kbd className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded font-mono text-emerald-300 text-[11px]">E</kbd>
              <span>Enter Car · Enter Shops · Talk to NPCs · Pet Animals</span>
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
