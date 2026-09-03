import React, { useState } from 'react';
import { usePantry } from '../context/PantryContext';
import { PHYSICAL_SLOTS } from '../data/slotDefinitions';
import { SlotType, PantryItem } from '../types';
import { ItemDetailModal } from './ItemDetailModal';
import { AddPantryItemModal } from './AddPantryItemModal';
import {
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  Layers,
  ChevronLeft,
  PackagePlus,
  ShoppingCart,
  BookmarkCheck,
} from 'lucide-react';

export const PhysicalRackView: React.FC<{ onOpenStockModal: () => void }> = ({ onOpenStockModal }) => {
  const {
    inventory,
    quickStockChange,
    selectedSlotFilter,
    setSelectedSlotFilter,
    searchQuery,
    addShoppingItem,
    shoppingList,
  } = usePantry();

  const [viewMode, setViewMode] = useState<'SLOTS' | 'LIST'>('SLOTS');
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<PantryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialMode, setAddModalInitialMode] = useState<'MANUAL' | 'RECEIPT_AI' | 'SHOPPING_LIST_AI'>('MANUAL');
  const [targetSlotForAdd, setTargetSlotForAdd] = useState<SlotType>('JAR_COLUMN_1');
  const [syncThresholdToast, setSyncThresholdToast] = useState(false);

  // Filter items
  const filteredItems = inventory.filter((item) => {
    const matchesSlot = selectedSlotFilter === 'ALL' || item.slot === selectedSlotFilter;
    const matchesQuery =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.barcode_or_sku && item.barcode_or_sku.includes(searchQuery)) ||
      PHYSICAL_SLOTS[item.slot]?.nameHe.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSlot && matchesQuery;
  });

  // Keep selected item synced with updated inventory state
  const currentDetailItem = selectedItemForDetail
    ? inventory.find((i) => i.id === selectedItemForDetail.id) || null
    : null;

  // Stats
  const totalItems = inventory.length;
  const inStockCount = inventory.filter((i) => i.status === 'IN_STOCK').length;
  const lowCount = inventory.filter((i) => i.status === 'LOW' || (i.quantity <= i.minThreshold && i.quantity > 0)).length;
  const emptyCount = inventory.filter((i) => i.status === 'EMPTY' || i.quantity === 0).length;
  const totalValuation = inventory.reduce((sum, item) => sum + (item.pricePerUnit || 0) * item.quantity, 0);

  // Items below threshold (including empty)
  const itemsBelowThreshold = inventory.filter(
    (item) => item.quantity <= item.minThreshold
  );

  const slotKeys = Object.keys(PHYSICAL_SLOTS) as SlotType[];

  const handleOpenDetail = (item: PantryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedItemForDetail(item);
  };

  const handleOpenAddForSlot = (slotKey: SlotType, mode: 'MANUAL' | 'RECEIPT_AI' | 'SHOPPING_LIST_AI' = 'MANUAL', e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTargetSlotForAdd(slotKey);
    setAddModalInitialMode(mode);
    setIsAddModalOpen(true);
  };

  // Sync all low/empty items to shopping list
  const handleSyncAllBelowThresholdToShopping = () => {
    let addedCount = 0;
    itemsBelowThreshold.forEach((item) => {
      const alreadyInShopping = shoppingList.some(
        (s) => s.item_name.toLowerCase() === item.name.toLowerCase() && !s.isPurchased
      );
      if (!alreadyInShopping) {
        const qtyNeeded = Math.max(1, (item.minThreshold * 2) - item.quantity);
        addShoppingItem({
          item_name: item.name,
          search_query: item.barcode_or_sku ? `${item.name} ${item.barcode_or_sku}` : item.name,
          quantity_needed: qtyNeeded,
          unit: item.unit,
          estimated_price: (item.pricePerUnit || 12) * qtyNeeded,
          department:
            item.department === 'ירקות ופירות'
              ? 'PRODUCE'
              : item.department === 'מצוננים ותחליפים'
              ? 'REFRIGERATED'
              : item.department === 'חד-פעמי ומשק בית'
              ? 'UTILITY'
              : 'PANTRY',
          reason: `סנכרון אוטומטי - כמות (${item.quantity}) מתחת לרף המינימום (${item.minThreshold})`,
          target_slot: item.slot,
          isPurchased: false,
        });
        addedCount++;
      }
    });

    setSyncThresholdToast(true);
    setTimeout(() => {
      setSyncThresholdToast(false);
    }, 4000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Overview Metric Cards & Top Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">סה״כ פריטים מנוהלים</div>
          <div className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-1">{totalItems}</div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-emerald-500" />
            <span>ב-7 סלוטים פיזיים</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-xs">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">זמינים במזווה (תקין)</div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{inStockCount}</div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>מעל רף המינימום</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-xs">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">כמות נמוכה (LOW)</div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{lowCount}</div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>בסמוך או מתחת לרף</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-xs">
          <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">אזלו לחלוטין (EMPTY)</div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{emptyCount}</div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-500" />
            <span>שווי מלאי: ₪{totalValuation.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Threshold Alert & Auto-Sync Bar if items below threshold */}
      {itemsBelowThreshold.length > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
              <BookmarkCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                זוהו {itemsBelowThreshold.length} פריטים שהגיעו לרף התחתון או אזלו
              </div>
              <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                באפשרותך לסנכרן אותם בלחיצה אחת לסל הקניות לרכישה מרוכזת
              </div>
            </div>
          </div>

          <button
            onClick={handleSyncAllBelowThresholdToShopping}
            id="btn-sync-threshold-to-shopping"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>העבר את כל החוסרים לסל הקניות</span>
          </button>
        </div>
      )}

      {syncThresholdToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>כל הפריטים שמתחת לרף התחתון הועברו בהצלחה לרשימת הקניות!</span>
        </div>
      )}

      {/* Main Controls & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-800/60 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700/80">
        {/* Slot Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedSlotFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
              selectedSlotFilter === 'ALL'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300'
            }`}
          >
            כל הסלוטים ({inventory.length})
          </button>
          {slotKeys.map((key) => {
            const slotMeta = PHYSICAL_SLOTS[key];
            const count = inventory.filter((i) => i.slot === key).length;
            const hasShortage = inventory.some((i) => i.slot === key && (i.status === 'EMPTY' || i.quantity <= i.minThreshold));
            return (
              <button
                key={key}
                onClick={() => setSelectedSlotFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap flex items-center gap-1.5 transition-all border ${
                  selectedSlotFilter === key
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <span>{slotMeta.shortName}</span>
                <span className="opacity-75 font-mono text-[11px]">({count})</span>
                {hasShortage && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Add New Item + View Mode Toggle */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
          <button
            onClick={() => {
              setTargetSlotForAdd(selectedSlotFilter === 'ALL' ? 'JAR_COLUMN_1' : selectedSlotFilter);
              setAddModalInitialMode('MANUAL');
              setIsAddModalOpen(true);
            }}
            id="btn-add-pantry-item-main"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-md flex items-center gap-2 transition-all"
          >
            <PackagePlus className="w-4 h-4" />
            <span>הוסף פריט למלאי</span>
          </button>

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-700/60 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('SLOTS')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'SLOTS' ? 'bg-white dark:bg-zinc-800 shadow-xs text-zinc-900 dark:text-white' : 'text-zinc-500'
              }`}
            >
              מבנה מזווה
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'LIST' ? 'bg-white dark:bg-zinc-800 shadow-xs text-zinc-900 dark:text-white' : 'text-zinc-500'
              }`}
            >
              רשימה מהירה
            </button>
          </div>
        </div>
      </div>

      {/* Main Physical Rack / Slot View */}
      {viewMode === 'SLOTS' ? (
        <div className="space-y-6">
          {slotKeys
            .filter((key) => selectedSlotFilter === 'ALL' || selectedSlotFilter === key)
            .map((slotKey) => {
              const slotMeta = PHYSICAL_SLOTS[slotKey];
              const itemsInSlot = filteredItems.filter((i) => i.slot === slotKey);

              return (
                <div
                  key={slotKey}
                  id={`slot-section-${slotKey}`}
                  className="bg-white dark:bg-zinc-800/90 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs overflow-hidden"
                >
                  {/* Slot Header */}
                  <div className={`p-4 border-b border-zinc-200 dark:border-zinc-700/80 flex flex-wrap items-center justify-between gap-2 ${slotMeta.colorBg}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm bg-white dark:bg-zinc-800 border ${slotMeta.colorBorder} ${slotMeta.colorAccent}`}>
                        {slotMeta.badge}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                          {slotMeta.nameHe}
                        </h3>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {slotMeta.descriptionHe}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleOpenAddForSlot(slotKey, 'MANUAL', e)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/90 dark:bg-zinc-800/90 hover:bg-white text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 shadow-xs transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>הוסף לסלוט זה</span>
                      </button>

                      <span className="text-xs px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700">
                        {itemsInSlot.length} פריטים
                      </span>
                    </div>
                  </div>

                  {/* Slot Items Grid */}
                  <div className="p-4">
                    {itemsInSlot.length === 0 ? (
                      <div className="text-center py-8 text-zinc-400 text-xs space-y-2">
                        <div>אין פריטים בסלוט זה כרגע</div>
                        <button
                          onClick={(e) => handleOpenAddForSlot(slotKey, 'MANUAL', e)}
                          className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>הוסף את הפריט הראשון לסלוט זה</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {itemsInSlot.map((item) => {
                          const isLow = item.status === 'LOW' || (item.quantity <= item.minThreshold && item.quantity > 0);
                          const isEmpty = item.status === 'EMPTY' || item.quantity === 0;

                          return (
                            <div
                              key={item.id}
                              id={`item-card-${item.id}`}
                              onClick={(e) => handleOpenDetail(item, e)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                                isEmpty
                                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60'
                                  : isLow
                                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                                  : 'bg-zinc-50/60 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/80 hover:border-emerald-500'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                    <span>{item.department}</span>
                                    {item.barcode_or_sku && (
                                      <>
                                        <span>•</span>
                                        <span className="font-mono text-[10px] bg-zinc-200/60 dark:bg-zinc-700 px-1 rounded">
                                          {item.barcode_or_sku}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                                    isEmpty
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                                      : isLow
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                  }`}
                                >
                                  {isEmpty ? 'אזל (EMPTY)' : isLow ? 'נמוך (LOW)' : 'במלאי'}
                                </span>
                              </div>

                              {/* Quantity and Threshold Controls */}
                              <div className="mt-3.5 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
                                <div>
                                  <div className="text-lg font-black text-zinc-900 dark:text-white flex items-baseline gap-1">
                                    <span>{item.quantity}</span>
                                    <span className="text-xs font-normal text-zinc-500">{item.unit}</span>
                                  </div>
                                  <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                    <span>רף מינימום: {item.minThreshold}</span>
                                    {isLow && <span className="text-amber-600 dark:text-amber-400 font-bold">(מתחת לסף!)</span>}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => quickStockChange(item.id, -1)}
                                    id={`btn-minus-${item.id}`}
                                    className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-200 font-bold flex items-center justify-center transition-all active:scale-95"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => quickStockChange(item.id, 1)}
                                    id={`btn-plus-${item.id}`}
                                    className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center transition-all active:scale-95 shadow-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        /* Flat List View */
        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
              רשימת כל הפריטים ({filteredItems.length})
            </h3>
            <span className="text-xs text-zinc-500">לחץ על פריט לעריכת כל השדות</span>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {filteredItems.map((item) => {
              const slotMeta = PHYSICAL_SLOTS[item.slot];
              const isLow = item.status === 'LOW' || (item.quantity <= item.minThreshold && item.quantity > 0);
              const isEmpty = item.status === 'EMPTY' || item.quantity === 0;

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${slotMeta?.colorBg || ''} ${slotMeta?.colorAccent || ''}`}>
                      {slotMeta?.badge}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                        <span>{slotMeta?.shortName}</span>
                        <span>•</span>
                        <span>{item.department}</span>
                        <span>•</span>
                        <span>סף: {item.minThreshold}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold font-mono text-sm text-zinc-900 dark:text-white">
                        {item.quantity} {item.unit}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isEmpty
                            ? 'bg-rose-100 text-rose-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isEmpty ? 'EMPTY' : isLow ? 'LOW' : 'OK'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenDetail(item)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 flex items-center gap-1"
                    >
                      <span>ערוך / פרטים</span>
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={currentDetailItem}
        isOpen={Boolean(currentDetailItem)}
        onClose={() => setSelectedItemForDetail(null)}
      />

      {/* Add New Item Modal */}
      <AddPantryItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultSlot={targetSlotForAdd}
        initialMode={addModalInitialMode}
      />
    </div>
  );
};
