import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  DollarSign,
  Coffee,
  Check,
  Sparkles,
  Plus,
  AlertCircle,
  Package,
  Store,
} from 'lucide-react';
import { GroceryItem, GroceryInventory } from '../types/housesim';
import { GROCERY_ITEMS } from '../data/catalog';
import { soundFX } from '../utils/soundEffects';

interface GroceryStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerCash: number;
  groceryInventory: GroceryInventory;
  onBuyGrocery: (item: GroceryItem, qty?: number) => void;
  onOpenWorkplace?: () => void;
}

export const GroceryStoreModal: React.FC<GroceryStoreModalProps> = ({
  isOpen,
  onClose,
  playerCash,
  groceryInventory,
  onBuyGrocery,
  onOpenWorkplace,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const handlePurchase = (item: GroceryItem, qty: number = 1) => {
    const totalCost = item.price * qty;
    if (playerCash < totalCost) {
      showToast(`❌ Not enough cash! Need $${totalCost} for ${qty}x ${item.name}.`);
      return;
    }
    soundFX.playRegisterScan();
    onBuyGrocery(item, qty);
    showToast(`🛒 Purchased ${qty}x ${item.name} for $${totalCost}! Stored in your pantry.`);
  };

  const handleBuyEssentialsBundle = () => {
    const bundleItems = [
      { id: 'grocery-coffee-beans', qty: 2 },
      { id: 'grocery-coffee-filters', qty: 2 },
      { id: 'grocery-milk', qty: 2 },
      { id: 'grocery-bbq-steak', qty: 1 },
      { id: 'grocery-bread', qty: 1 },
      { id: 'grocery-apples', qty: 1 },
    ];
    let totalCost = 0;
    const resolved: { item: GroceryItem; qty: number }[] = [];
    bundleItems.forEach((b) => {
      const found = GROCERY_ITEMS.find((g) => g.id === b.id);
      if (found) {
        totalCost += found.price * b.qty;
        resolved.push({ item: found, qty: b.qty });
      }
    });

    if (playerCash < totalCost) {
      showToast(`❌ Need $${totalCost} for the Chef Essentials Bundle!`);
      return;
    }

    soundFX.playRegisterScan();
    resolved.forEach(({ item, qty }) => onBuyGrocery(item, qty));
    showToast(`🎉 Bought Chef Kitchen Bundle (Beans, Filters, Milk, Steaks & Buns) for $${totalCost}!`);
  };

  const filteredItems = GROCERY_ITEMS.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const categories = [
    { id: 'all', label: 'All Aisles', icon: '🏪' },
    { id: 'ingredient', label: 'Pantry & Coffee Beans', icon: '☕' },
    { id: 'beverage', label: 'Drinks & Milks', icon: '🥛' },
    { id: 'perishable', label: 'Fresh Meats & Treats', icon: '🥩' },
    { id: 'snack', label: 'Snacks & Sweets', icon: '🍿' },
  ];

  const totalGroceryCount = Object.values(groceryInventory).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-display">Metro Fresh Supermarket & Groceries</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  OPEN 24/7
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Stock your kitchen with coffee beans, filters, oat milk, prime steaks, and snacks for home appliances!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-sm font-semibold">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>${playerCash.toLocaleString()}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Promo Bundle Banner */}
        <div className="px-6 py-2.5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-amber-950/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-white">Kitchen Starter Bundle:</strong> 2x Coffee Beans, 2x Filters, 2x Oat Milk, 1x Steaks, 1x Buns & Apples.
            </span>
          </div>
          <button
            onClick={handleBuyEssentialsBundle}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-bold text-xs hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-md"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Buy Full Chef Bundle ($65)
          </button>
        </div>

        {/* Status Toast */}
        {toast && (
          <div className="px-6 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            {toast}
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-950 border-b border-white/5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white bg-slate-900/70 hover:bg-slate-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
          <div className="ml-auto text-xs text-slate-400 flex items-center gap-1 font-mono">
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>Pantry: {totalGroceryCount} items</span>
          </div>
        </div>

        {/* Grocery Aisles Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const ownedCount = groceryInventory[item.id] || 0;
            return (
              <div
                key={item.id}
                className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl p-1.5 rounded-xl bg-slate-900 border border-white/5">
                        {item.icon}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight">{item.name}</h3>
                        {ownedCount > 0 && (
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            In Pantry: {ownedCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold text-sm shrink-0">
                      ${item.price}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-2">{item.description}</p>

                  <div className="p-2 rounded-xl bg-slate-900/90 border border-white/5 text-[11px] text-amber-300/90 leading-snug">
                    💡 {item.usageTip}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handlePurchase(item, 1)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Buy 1 (${item.price})
                  </button>
                  <button
                    onClick={() => handlePurchase(item, 3)}
                    className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-white/10"
                    title={`Buy 3x for $${item.price * 3}`}
                  >
                    +3x (${item.price * 3})
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info & Workplace Job promotion */}
        <div className="px-6 py-3 border-t border-white/10 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>💼 Want to work as a Supermarket Associate?</span>
            {onOpenWorkplace && (
              <button
                onClick={() => {
                  onClose();
                  onOpenWorkplace();
                }}
                className="text-amber-400 font-bold hover:underline"
              >
                Apply for Supermarket Job ($140/shift + tips) →
              </button>
            )}
          </div>
          <span className="font-mono text-[11px] text-slate-500">Metro Fresh Grocery Co.</span>
        </div>
      </div>
    </div>
  );
};
