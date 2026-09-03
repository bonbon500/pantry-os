import React, { useState } from 'react';
import { usePantry } from '../context/PantryContext';
import { PHYSICAL_SLOTS } from '../data/slotDefinitions';
import { ShoppingListItem, SlotType, PantryItem } from '../types';
import {
  ShoppingCart,
  CheckSquare,
  Square,
  Search,
  Copy,
  Check,
  Plus,
  Trash2,
  ArrowDownCircle,
  Tag,
  DollarSign,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  Eye,
  Filter,
  ArrowLeftRight,
} from 'lucide-react';

export const ShoppingBranchView: React.FC = () => {
  const {
    shoppingList,
    inventory,
    toggleShoppingItem,
    removeShoppingItem,
    addShoppingItem,
    convertShoppingItemToStock,
    convertAllPurchasedToStock,
  } = usePantry();

  const [newItemName, setNewItemName] = useState('');
  const [newDepartment, setNewDepartment] = useState<'PRODUCE' | 'PANTRY' | 'REFRIGERATED' | 'UTILITY'>('PANTRY');
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);
  const [glanceSlotFilter, setGlanceSlotFilter] = useState<SlotType | 'ALL'>('ALL');
  const [glanceSearch, setGlanceSearch] = useState('');
  const [activeMobileView, setActiveMobileView] = useState<'SHOPPING' | 'GLANCE'>('SHOPPING');

  const purchasedCount = shoppingList.filter((i) => i.isPurchased).length;
  const unpurchasedCount = shoppingList.filter((i) => !i.isPurchased).length;
  const totalEstimatedCost = shoppingList
    .filter((i) => !i.isPurchased)
    .reduce((sum, item) => sum + (item.estimated_price || 0), 0);

  const handleCopySearchQuery = (item: ShoppingListItem) => {
    navigator.clipboard.writeText(item.search_query);
    setCopiedQueryId(item.id);
    setTimeout(() => setCopiedQueryId(null), 2000);
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    addShoppingItem({
      item_name: newItemName.trim(),
      search_query: newItemName.trim(),
      quantity_needed: 1,
      unit: 'יח\'',
      estimated_price: 12.0,
      department: newDepartment,
      reason: 'הוספה ידנית לסל חוסרים',
      isPurchased: false,
    });

    setNewItemName('');
  };

  // Quick add from Pantry Glance widget into Shopping List
  const handleQuickAddFromGlance = (pantryItem: PantryItem) => {
    addShoppingItem({
      item_name: pantryItem.name,
      search_query: pantryItem.barcode_or_sku ? `${pantryItem.name} ${pantryItem.barcode_or_sku}` : pantryItem.name,
      quantity_needed: pantryItem.minThreshold || 1,
      unit: pantryItem.unit,
      estimated_price: (pantryItem.pricePerUnit || 10) * (pantryItem.minThreshold || 1),
      department:
        pantryItem.department === 'ירקות ופירות'
          ? 'PRODUCE'
          : pantryItem.department === 'מצוננים ותחליפים'
          ? 'REFRIGERATED'
          : pantryItem.department === 'חד-פעמי ומשק בית'
          ? 'UTILITY'
          : 'PANTRY',
      reason: `הוסף ישירות מווידג'ט מצב מלאי (סלוט ${pantryItem.slot})`,
      target_slot: pantryItem.slot,
      isPurchased: false,
    });
  };

  // Filter items in Pantry Glance
  const glanceFilteredItems = inventory.filter((item) => {
    const matchesSlot = glanceSlotFilter === 'ALL' || item.slot === glanceSlotFilter;
    const matchesQuery =
      glanceSearch.trim() === '' ||
      item.name.toLowerCase().includes(glanceSearch.toLowerCase()) ||
      (item.barcode_or_sku && item.barcode_or_sku.includes(glanceSearch));
    return matchesSlot && matchesQuery;
  });

  const slotKeys = Object.keys(PHYSICAL_SLOTS) as SlotType[];

  return (
    <div className="space-y-6">
      {/* Header Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs">
          <div className="text-xs text-zinc-500 font-medium">פריטים חסרים בסל</div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {unpurchasedCount} פריטים
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            מבוסס אך ורק על חוסרים ומנות מתוכננות
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs">
          <div className="text-xs text-zinc-500 font-medium">אומדן עלות משוערת</div>
          <div className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-1">
            ₪{totalEstimatedCost.toFixed(2)}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-500" />
            <span>לפי מחירי ממוצע קטלוג סופר</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs text-emerald-600 font-medium">סומנו כנרכשו</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">{purchasedCount} פריטים</div>
          </div>
          {purchasedCount > 0 && (
            <button
              onClick={convertAllPurchasedToStock}
              id="btn-convert-all-stock"
              className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>העבר את כל המסומנים למלאי (STOCK_IN)</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Toggle Tabs (Visible only on smaller screens) */}
      <div className="flex md:hidden bg-zinc-200 dark:bg-zinc-800 p-1 rounded-2xl">
        <button
          onClick={() => setActiveMobileView('SHOPPING')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeMobileView === 'SHOPPING'
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>צ'קליסט קניות ({shoppingList.length})</span>
        </button>
        <button
          onClick={() => setActiveMobileView('GLANCE')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeMobileView === 'GLANCE'
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>מבט מלאי שקט ({inventory.length})</span>
        </button>
      </div>

      {/* SPLIT-VIEW CONTAINER (Side-by-Side on Desktop, Stack on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* RIGHT / MAIN COLUMN (7 cols): Active Shopping Checklist & Quick Form     */}
        {/* ========================================================================= */}
        <div
          className={`lg:col-span-7 space-y-4 ${
            activeMobileView === 'GLANCE' ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Manual Quick Add Form */}
          <form
            onSubmit={handleAddManual}
            className="bg-white dark:bg-zinc-800/90 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs flex flex-col sm:flex-row items-center gap-2.5"
          >
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="הוסף מוצר חסר ידנית (למשל: 'שמן קוקוס', 'קופסת עגבניות')..."
                className="w-full pl-3 pr-3 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <select
              value={newDepartment}
              onChange={(e: any) => setNewDepartment(e.target.value)}
              className="py-2.5 px-3 text-xs bg-zinc-50 dark:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none w-full sm:w-auto"
            >
              <option value="PANTRY">מזווה יבש (PANTRY)</option>
              <option value="PRODUCE">ירקות ופירות (PRODUCE)</option>
              <option value="REFRIGERATED">מצונן ומקרר (REFRIGERATED)</option>
              <option value="UTILITY">חד-פעמי ומשק בית (UTILITY)</option>
            </select>

            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף לחוסרים</span>
            </button>
          </form>

          {/* Shopping Checklist Card */}
          <div className="bg-white dark:bg-zinc-800/90 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                  צ'קליסט קניות פעיל (חוסרים בלבד)
                </h3>
              </div>
              <span className="text-xs text-zinc-400 font-semibold">
                {shoppingList.length} סה״כ פריטים
              </span>
            </div>

            {shoppingList.length === 0 ? (
              <div className="text-center py-14 text-zinc-400 text-xs space-y-2">
                <Check className="w-10 h-10 mx-auto text-emerald-500/50" />
                <p className="font-bold text-zinc-700 dark:text-zinc-300">אין חוסרים כרגע!</p>
                <p>כל המזווה והמקרר מלאים. תוכל להוסיף מוצרים באמצעות ווידג'ט המלאי משמאל.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-700/60">
                {shoppingList.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.isPurchased
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/15 opacity-75'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/40'
                    }`}
                  >
                    {/* Item Details with Checkbox */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleShoppingItem(item.id)}
                        id={`chk-shop-${item.id}`}
                        className="mt-0.5 text-zinc-400 hover:text-emerald-600 transition-colors"
                      >
                        {item.isPurchased ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`font-bold text-sm text-zinc-900 dark:text-white truncate ${
                              item.isPurchased ? 'line-through text-zinc-400 dark:text-zinc-500' : ''
                            }`}
                          >
                            {item.item_name}
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold shrink-0">
                            {item.quantity_needed} {item.unit || 'יח\''}
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                          {item.reason}
                        </p>

                        {/* Search Query Pill with Copy Action */}
                        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                          <span className="text-zinc-400">שאילתת סופר:</span>
                          <span className="font-mono bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-600">
                            {item.search_query}
                          </span>
                          <button
                            onClick={() => handleCopySearchQuery(item)}
                            title="העתק שאילתת חיפוש לסופר"
                            className="p-1 text-zinc-400 hover:text-emerald-600 transition-colors"
                          >
                            {copiedQueryId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions on Item */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-200 dark:border-zinc-700">
                      <div className="text-left sm:text-right pl-2">
                        <div className="text-xs font-extrabold text-zinc-900 dark:text-white font-mono">
                          ₪{item.estimated_price ? item.estimated_price.toFixed(1) : '0.0'}
                        </div>
                        <div className="text-[10px] text-zinc-400">{item.department}</div>
                      </div>

                      {/* Convert to Stock Button */}
                      <button
                        onClick={() => convertShoppingItemToStock(item.id)}
                        title="קניתי - העבר לסלוט הפיזי במזווה"
                        className="px-2.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <ArrowDownCircle className="w-3.5 h-3.5" />
                        <span>למלאי</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => removeShoppingItem(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LEFT / SECONDARY COLUMN (5 cols): Silent Live Pantry Glance Widget        */}
        {/* ========================================================================= */}
        <div
          className={`lg:col-span-5 space-y-3 ${
            activeMobileView === 'SHOPPING' ? 'hidden md:block' : 'block'
          }`}
        >
          <div className="bg-white dark:bg-zinc-800/90 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-xs overflow-hidden">
            {/* Widget Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-800/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                    מצב מלאי שקט (Quick Pantry Glance)
                  </h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                  {inventory.length} פריטים
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                הצצה במלאי הקיים בכל 7 הסלוטים. לחץ <strong>+</strong> להוספה מהירה לרשימת הקניות.
              </p>

              {/* Search & Slot Filter in Glance */}
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={glanceSearch}
                    onChange={(e) => setGlanceSearch(e.target.value)}
                    placeholder="סנן מוצר במלאי..."
                    className="w-full pr-8 pl-3 py-1.5 text-xs bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                {/* Slot Tabs in Glance */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    onClick={() => setGlanceSlotFilter('ALL')}
                    className={`px-2 py-1 text-[11px] font-bold rounded-lg whitespace-nowrap transition-colors ${
                      glanceSlotFilter === 'ALL'
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    הכל
                  </button>
                  {slotKeys.map((key) => {
                    const slotMeta = PHYSICAL_SLOTS[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setGlanceSlotFilter(key)}
                        className={`px-2 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors border ${
                          glanceSlotFilter === key
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {slotMeta.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Glance Items List */}
            <div className="p-2 divide-y divide-zinc-100 dark:divide-zinc-700/40 max-h-[560px] overflow-y-auto custom-scrollbar">
              {glanceFilteredItems.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  לא נמצאו מוצרים התואמים לסינון
                </div>
              ) : (
                glanceFilteredItems.map((item) => {
                  const slotMeta = PHYSICAL_SLOTS[item.slot];
                  const alreadyInList = shoppingList.some(
                    (s) => s.item_name.toLowerCase() === item.name.toLowerCase() && !s.isPurchased
                  );

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/40 rounded-xl transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.status === 'IN_STOCK'
                              ? 'bg-emerald-500'
                              : item.status === 'LOW'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                            {item.name}
                          </h5>
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                            <span>{slotMeta.shortName}</span>
                            <span>•</span>
                            <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Add to Shopping List Button */}
                      <button
                        onClick={() => handleQuickAddFromGlance(item)}
                        title="הוסף מוצר זה לרשימת הקניות"
                        className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all ${
                          alreadyInList
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-zinc-100 hover:bg-emerald-600 hover:text-white text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{alreadyInList ? 'בסל' : 'הוסף'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
