import React from 'react';
import { X, Package, Check, Trash2, RotateCw } from 'lucide-react';
import { CatalogItem, PlacedItem } from '../types/housesim';
import { CATALOG_ITEMS } from '../data/catalog';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownedItemIds: string[];
  placedItems: PlacedItem[];
  onStartPlacing: (item: CatalogItem) => void;
  onRemovePlacedItem: (instanceId: string) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  ownedItemIds,
  placedItems,
  onStartPlacing,
  onRemovePlacedItem,
}) => {
  if (!isOpen) return null;

  // Resolve CatalogItems for all owned items
  const ownedCatalogItems = ownedItemIds
    .map((id) => CATALOG_ITEMS.find((c) => c.id === id))
    .filter((item): item is CatalogItem => item !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">Property Inventory & Furnishings</h2>
              <p className="text-xs text-slate-400">
                Place owned furniture, wall-mounted decor, or backyard outdoor items
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Ready to Place */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span>Unplaced Storage Items</span>
              <span className="text-xs font-mono text-amber-400">({ownedCatalogItems.length})</span>
            </h3>

            {ownedCatalogItems.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-400">
                You have no items in storage. Walk to the city shops or open the Stores catalog to buy furniture, wall art, and outdoor items!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ownedCatalogItems.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-semibold text-white text-xs">{item.name}</span>
                        {item.placementType === 'wall_only' && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                            Wall Only
                          </span>
                        )}
                        {item.placementType === 'backyard_only' && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            Backyard
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                    </div>

                    <button
                      onClick={() => {
                        onStartPlacing(item);
                        onClose();
                      }}
                      className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Place in {item.placementType === 'wall_only' ? 'Wall' : item.placementType === 'backyard_only' ? 'Backyard' : 'House'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Placed Items in House & Backyard */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span>Placed Items on Property</span>
              <span className="text-xs font-mono text-emerald-400">({placedItems.length})</span>
            </h3>

            {placedItems.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-950/40 text-xs text-slate-500">
                No items placed yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {placedItems.map((placed) => (
                  <div
                    key={placed.instanceId}
                    className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{placed.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {placed.isOnWall ? 'Mounted on Wall' : placed.zone === 'backyard' ? 'Backyard' : 'Interior Floor'}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemovePlacedItem(placed.instanceId)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                      title="Return item to storage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
