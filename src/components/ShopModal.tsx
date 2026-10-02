import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Car,
  Home,
  Dog,
  Palette,
  Sun,
  Hammer,
  Check,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import {
  CarVehicle,
  CatalogItem,
  HouseTierInfo,
  PetItem,
} from '../types/housesim';
import {
  CARS_CATALOG,
  CATALOG_ITEMS,
  HOUSE_TIERS,
  PETS_CATALOG,
} from '../data/catalog';
import { soundFX } from '../utils/soundEffects';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerCash: number;
  currentHouseTier: number;
  ownedCarIds: string[];
  ownedPetIds: string[];
  onBuyItem: (item: CatalogItem) => void;
  onBuyCar: (car: CarVehicle) => void;
  onBuyPet: (pet: PetItem) => void;
  onUpgradeHouse: (tier: HouseTierInfo) => void;
}

type ShopTab =
  | 'furniture'
  | 'wall_decor'
  | 'outdoor'
  | 'everyday'
  | 'cars'
  | 'pets'
  | 'house_upgrade';

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  playerCash,
  currentHouseTier,
  ownedCarIds,
  ownedPetIds,
  onBuyItem,
  onBuyCar,
  onBuyPet,
  onUpgradeHouse,
}) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('furniture');
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setPurchaseToast(msg);
    setTimeout(() => setPurchaseToast(null), 3000);
  };

  const handleBuyCatalogItem = (item: CatalogItem) => {
    if (playerCash < item.price) {
      triggerToast(`Not enough dollars ($) for ${item.name}! You need $${item.price}.`);
      return;
    }
    soundFX.playCashRegister();
    onBuyItem(item);
    triggerToast(`Purchased ${item.name} for $${item.price}! Added to your inventory.`);
  };

  const handleBuyCar = (car: CarVehicle) => {
    if (ownedCarIds.includes(car.id)) {
      triggerToast(`You already own the ${car.name}!`);
      return;
    }
    if (playerCash < car.price) {
      triggerToast(`Not enough dollars ($) for ${car.name}! You need $${car.price}.`);
      return;
    }
    soundFX.playCashRegister();
    soundFX.playCarEngineStart();
    onBuyCar(car);
    triggerToast(`Bought the ${car.name}! Spawned in your driveway.`);
  };

  const handleBuyPet = (pet: PetItem) => {
    if (ownedPetIds.includes(pet.id)) {
      triggerToast(`You already adopted ${pet.name}!`);
      return;
    }
    if (playerCash < pet.price) {
      triggerToast(`Not enough dollars ($) for ${pet.name}! You need $${pet.price}.`);
      return;
    }
    soundFX.playCashRegister();
    soundFX.playPetSound(pet.petType === 'cat_calico' ? 'cat' : pet.petType === 'bunny_lop' ? 'bunny' : 'dog');
    onBuyPet(pet);
    triggerToast(`Adopted ${pet.name} for $${pet.price}!`);
  };

  const handleUpgradeHouse = (tierInfo: HouseTierInfo) => {
    if (currentHouseTier >= tierInfo.tier) {
      triggerToast(`You already own ${tierInfo.name}!`);
      return;
    }
    if (playerCash < tierInfo.price) {
      triggerToast(`Not enough cash ($) to upgrade! You need $${tierInfo.price}.`);
      return;
    }
    soundFX.playCashRegister();
    soundFX.playHouseUpgrade();
    onUpgradeHouse(tierInfo);
    triggerToast(`House upgraded to ${tierInfo.name}!`);
  };

  const tabs: { id: ShopTab; label: string; icon: React.ReactNode }[] = [
    { id: 'furniture', label: 'Furniture & Living', icon: <Home className="w-3.5 h-3.5" /> },
    { id: 'wall_decor', label: 'Wall Decor & Art', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'outdoor', label: 'Backyard & Pools', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'everyday', label: 'Everyday Items', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { id: 'cars', label: 'Auto Dealership', icon: <Car className="w-3.5 h-3.5" /> },
    { id: 'pets', label: 'Pet Adoption Haven', icon: <Dog className="w-3.5 h-3.5" /> },
    { id: 'house_upgrade', label: 'House Expansion', icon: <Hammer className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-5xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">City Commercial District & Stores</h2>
              <p className="text-xs text-slate-400">
                Buy furniture, wall-mounted decor, drivable cars, pets, and expand your house
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-sm font-semibold">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>{playerCash.toLocaleString()}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-950 border-b border-white/5 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toast Feedback */}
        {purchaseToast && (
          <div className="px-6 py-2 bg-amber-500/20 border-b border-amber-500/30 text-amber-200 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            {purchaseToast}
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* 1. CARS STORE */}
          {activeTab === 'cars' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CARS_CATALOG.map((car) => {
                const isOwned = ownedCarIds.includes(car.id);
                return (
                  <div
                    key={car.id}
                    className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-base font-bold text-white font-display">{car.name}</h3>
                        <span className="font-mono text-emerald-400 font-bold">${car.price.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">{car.description}</p>

                      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-slate-900/90 p-2.5 rounded-xl border border-white/5">
                        <div>
                          <span className="text-slate-500 block">Top Speed</span>
                          <span className="text-slate-200 font-bold">{car.maxSpeed} mph</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Acceleration</span>
                          <span className="text-slate-200 font-bold">{car.acceleration}x</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Handling</span>
                          <span className="text-slate-200 font-bold">{car.handling}x</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[11px] text-amber-300">Drivable on all city roads [E]</span>
                      {isOwned ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          Owned & Ready
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBuyCar(car)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                        >
                          Buy for ${car.price.toLocaleString()}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. PETS STORE */}
          {activeTab === 'pets' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PETS_CATALOG.map((pet) => {
                const isOwned = ownedPetIds.includes(pet.id);
                return (
                  <div
                    key={pet.id}
                    className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <h3 className="text-base font-bold text-white font-display">{pet.name}</h3>
                          <span className="text-xs text-slate-400">{pet.breed}</span>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold">${pet.price.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{pet.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[11px] text-emerald-400">Follows you & roam house/yard</span>
                      {isOwned ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          Adopted
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBuyPet(pet)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                        >
                          Adopt for ${pet.price.toLocaleString()}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. HOUSE EXPANSION CONTRACTOR */}
          {activeTab === 'house_upgrade' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                Expand your property to unlock new rooms, more wall space for art, a private garage driveway, and a fenced backyard for swimming pools and pets!
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {HOUSE_TIERS.map((tierInfo) => {
                  const isCurrent = currentHouseTier === tierInfo.tier;
                  const isUnlocked = currentHouseTier >= tierInfo.tier;
                  return (
                    <div
                      key={tierInfo.tier}
                      className={`bg-slate-950/80 border rounded-2xl p-5 flex flex-col justify-between space-y-4 ${
                        isCurrent
                          ? 'border-amber-400/80 shadow-lg shadow-amber-500/5'
                          : isUnlocked
                          ? 'border-emerald-500/40'
                          : 'border-white/10'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-mono text-amber-400 font-bold">TIER {tierInfo.tier}</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {tierInfo.price === 0 ? 'Starter' : `$${tierInfo.price.toLocaleString()}`}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white font-display mb-2">{tierInfo.name}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">{tierInfo.description}</p>

                        <div className="space-y-1.5 border-t border-white/5 pt-3">
                          <span className="text-[11px] font-semibold text-slate-300 block">Features:</span>
                          {tierInfo.unlockedRooms.map((room, i) => (
                            <div key={i} className="text-xs text-slate-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              {room}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2">
                        {isCurrent ? (
                          <div className="py-2 px-3 text-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                            Current Active Residence
                          </div>
                        ) : isUnlocked ? (
                          <div className="py-2 px-3 text-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                            Unlocked
                          </div>
                        ) : (
                          <button
                            onClick={() => handleUpgradeHouse(tierInfo)}
                            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                          >
                            Expand to Tier {tierInfo.tier} (${tierInfo.price.toLocaleString()})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. CATALOG ITEMS (Furniture, Wall Decor, Outdoor Pools/BBQ, Everyday) */}
          {activeTab !== 'cars' && activeTab !== 'pets' && activeTab !== 'house_upgrade' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATALOG_ITEMS.filter((item) => {
                if (activeTab === 'furniture') return item.category === 'furniture';
                if (activeTab === 'wall_decor') return item.category === 'wall_decor';
                if (activeTab === 'outdoor') return item.category === 'outdoor';
                return item.category === 'everyday' || item.category === 'electronics';
              }).map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="text-sm font-bold text-white font-display">{item.name}</h3>
                      <span className="font-mono text-emerald-400 font-bold">${item.price.toLocaleString()}</span>
                    </div>

                    {/* Placement restriction pill */}
                    <div className="mb-2">
                      {item.placementType === 'wall_only' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                          Wall Mounted Only
                        </span>
                      ) : item.placementType === 'backyard_only' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                          Backyard Outdoor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                          Floor / Surface
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[11px] text-slate-500">
                      {item.dimensions.width}m × {item.dimensions.depth}m
                    </span>
                    <button
                      onClick={() => handleBuyCatalogItem(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Buy (${item.price})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
