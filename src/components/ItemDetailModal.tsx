import React, { useState, useEffect } from 'react';
import { usePantry } from '../context/PantryContext';
import { PHYSICAL_SLOTS } from '../data/slotDefinitions';
import { PantryItem, ItemStatus, SlotType, DepartmentType } from '../types';
import {
  X,
  Plus,
  Minus,
  ShoppingCart,
  Calendar,
  Layers,
  Tag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Trash2,
  Edit3,
  Save,
  Check,
  RotateCcw,
  DollarSign,
  BookmarkCheck,
  Package,
} from 'lucide-react';

interface ItemDetailModalProps {
  item: PantryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_UNITS = [
  'צנצנת',
  'קופסה',
  'שקית',
  'בקבוק',
  'יח\'',
  'חבילה',
  'מארז',
  'תבנית',
  'עציץ',
  'ק"ג',
  'גרם',
  'ליטר',
];

const DEPARTMENTS: DepartmentType[] = [
  'מוצרי יסוד ומזווה',
  'ירקות ופירות',
  'מצוננים ותחליפים',
  'חד-פעמי ומשק בית',
  'תבלינים ועשבי תיבול',
];

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, isOpen, onClose }) => {
  const {
    quickStockChange,
    setItemStatus,
    updatePantryItem,
    deletePantryItem,
    addShoppingItem,
    shoppingList,
  } = usePantry();

  // Mode: 'VIEW' or 'EDIT'
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editSlot, setEditSlot] = useState<SlotType>('JAR_COLUMN_1');
  const [editDepartment, setEditDepartment] = useState<DepartmentType>('מוצרי יסוד ומזווה');
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editMinThreshold, setEditMinThreshold] = useState<number>(1);
  const [editUnit, setEditUnit] = useState('צנצנת');
  const [editCustomUnit, setEditCustomUnit] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editPricePerUnit, setEditPricePerUnit] = useState('');
  const [editStatus, setEditStatus] = useState<ItemStatus>('IN_STOCK');
  const [editNotes, setEditNotes] = useState('');

  const [addedToast, setAddedToast] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [shoppingQty, setShoppingQty] = useState(1);

  // Initialize form state whenever item changes or modal opens
  useEffect(() => {
    if (item) {
      setEditName(item.name);
      setEditSlot(item.slot);
      setEditDepartment(item.department);
      setEditQuantity(item.quantity);
      setEditMinThreshold(item.minThreshold ?? 1);
      
      if (COMMON_UNITS.includes(item.unit)) {
        setEditUnit(item.unit);
        setEditCustomUnit('');
      } else {
        setEditUnit('אחר');
        setEditCustomUnit(item.unit || '');
      }

      setEditBarcode(item.barcode_or_sku || '');
      setEditExpiryDate(item.expiryDate || '');
      setEditPricePerUnit(item.pricePerUnit !== undefined ? String(item.pricePerUnit) : '');
      setEditStatus(item.status);
      setEditNotes(item.notes || '');
      setIsEditMode(false);
      setSaveSuccessToast(false);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const slotMeta = PHYSICAL_SLOTS[item.slot] || {
    nameHe: 'סלוט כללי',
    shortName: item.slot,
    descriptionHe: 'מיקום פיזי במזווה',
    badge: '📦',
    colorBg: 'bg-zinc-100 dark:bg-zinc-800',
    colorBorder: 'border-zinc-300 dark:border-zinc-600',
    colorAccent: 'text-zinc-800 dark:text-zinc-200',
  };

  const alreadyInShopping = shoppingList.some(
    (s) => s.item_name.toLowerCase() === item.name.toLowerCase() && !s.isPurchased
  );

  const handleSendToShopping = () => {
    addShoppingItem({
      item_name: item.name,
      search_query: item.barcode_or_sku ? `${item.name} ${item.barcode_or_sku}` : item.name,
      quantity_needed: shoppingQty,
      unit: item.unit,
      estimated_price: (item.pricePerUnit || 12) * shoppingQty,
      department:
        item.department === 'ירקות ופירות'
          ? 'PRODUCE'
          : item.department === 'מצוננים ותחליפים'
          ? 'REFRIGERATED'
          : item.department === 'חד-פעמי ומשק בית'
          ? 'UTILITY'
          : 'PANTRY',
      reason: `הועבר מכרטיסיית הפריט בסלוט ${slotMeta.nameHe}`,
      target_slot: item.slot,
      isPurchased: false,
    });

    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
    }, 3000);
  };

  const handleSaveAllFields = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = editName.trim();
    if (!cleanName) return;

    const finalUnit = editCustomUnit.trim() || editUnit;

    let computedStatus = editStatus;
    // Auto sync status based on quantity and threshold if logical
    if (editQuantity === 0) {
      computedStatus = 'EMPTY';
    } else if (editQuantity <= editMinThreshold && editStatus === 'IN_STOCK') {
      computedStatus = 'LOW';
    } else if (editQuantity > editMinThreshold && editStatus === 'LOW') {
      computedStatus = 'IN_STOCK';
    }

    const updates: Partial<PantryItem> = {
      name: cleanName,
      slot: editSlot,
      department: editDepartment,
      quantity: editQuantity,
      minThreshold: editMinThreshold,
      unit: finalUnit,
      status: computedStatus,
      barcode_or_sku: editBarcode.trim() || null,
      expiryDate: editExpiryDate.trim() || undefined,
      pricePerUnit: editPricePerUnit ? parseFloat(editPricePerUnit) : undefined,
      notes: editNotes.trim() || undefined,
    };

    updatePantryItem(item.id, updates);
    setSaveSuccessToast(true);
    setTimeout(() => {
      setSaveSuccessToast(false);
      setIsEditMode(false);
    }, 500);
  };

  const handleDelete = () => {
    if (window.confirm(`האם אתה בטוח שברצונך להסיר את "${item.name}" מהמלאי?`)) {
      deletePantryItem(item.id);
      onClose();
    }
  };

  const slotKeys = Object.keys(PHYSICAL_SLOTS) as SlotType[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
      id="modal-item-detail"
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className={`p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-3 ${slotMeta.colorBg}`}>
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-white dark:bg-zinc-800 border shadow-xs ${slotMeta.colorBorder}`}>
              {slotMeta.badge}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-zinc-800/80 border ${slotMeta.colorBorder} ${slotMeta.colorAccent}`}>
                  <Layers className="w-3 h-3" />
                  {slotMeta.nameHe} ({slotMeta.shortName})
                </span>
                {item.quantity <= item.minThreshold && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                    מתחת לרף תחתון
                  </span>
                )}
              </div>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white mt-1 leading-snug">
                {item.name}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                {slotMeta.descriptionHe}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              id="btn-toggle-edit-mode"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                isEditMode
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'חזור לתצוגה' : 'ערוך את כל השדות'}</span>
            </button>

            <button
              onClick={onClose}
              id="btn-close-item-detail"
              className="w-8 h-8 rounded-full bg-white/80 dark:bg-zinc-800/80 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {saveSuccessToast && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>השדות נשמרו בהצלחה וסונכרנו למסד הנתונים!</span>
          </div>
        )}

        {/* Modal Body: Switch between VIEW and FULL EDIT */}
        {isEditMode ? (
          /* ======================================================== */
          /* FULL EDIT FORM (עריכת כל השדות)                          */
          /* ======================================================== */
          <form onSubmit={handleSaveAllFields} className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>עריכת כל השדות: שנה את הפרטים, רף המינימום או המיקום ולחץ <strong>שמור שינויים</strong>.</span>
            </div>

            {/* 1. Item Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                שם המוצר / פריט <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                id="edit-input-item-name"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
              />
            </div>

            {/* 2. Slot Location & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>סלוט מיקום פיזי</span>
                </label>
                <select
                  value={editSlot}
                  onChange={(e) => setEditSlot(e.target.value as SlotType)}
                  id="edit-select-item-slot"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white"
                >
                  {slotKeys.map((key) => {
                    const meta = PHYSICAL_SLOTS[key];
                    return (
                      <option key={key} value={key}>
                        {meta.badge} - {meta.nameHe}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  מחלקה
                </label>
                <select
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value as DepartmentType)}
                  id="edit-select-item-department"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Quantities & Minimum Threshold (רף תחתון) */}
            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                <span>כמות במלאי ורף תחתון להתראה</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Quantity */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    כמות נוכחית ({editCustomUnit || editUnit})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditQuantity((q) => Math.max(0, q - 1))}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold hover:bg-zinc-100 flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                      id="edit-input-item-quantity"
                      className="w-full text-center py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold font-mono text-sm text-zinc-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setEditQuantity((q) => q + 1)}
                      className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Min Threshold (רף תחתון) */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                    <span>רף תחתון (סף מינימום)</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">התראה על חוסר</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditMinThreshold((t) => Math.max(0, t - 1))}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold hover:bg-zinc-100 flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editMinThreshold}
                      onChange={(e) => setEditMinThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                      id="edit-input-item-threshold"
                      className="w-full text-center py-1.5 bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 rounded-xl font-bold font-mono text-sm text-amber-900 dark:text-amber-300"
                    />
                    <button
                      type="button"
                      onClick={() => setEditMinThreshold((t) => t + 1)}
                      className="w-8 h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                כאשר המלאי מגיע ל-{editMinThreshold} {editCustomUnit || editUnit} או פחות, הסטטוס יוגדר אוטומטית כ-<strong>LOW (כמות נמוכה)</strong>.
              </div>
            </div>

            {/* 4. Unit Type & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  יחידת מידה / אריזה
                </label>
                <select
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  id="edit-select-item-unit"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white"
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  <option value="אחר">אחר (הקלד חופשי)...</option>
                </select>

                {editUnit === 'אחר' && (
                  <input
                    type="text"
                    value={editCustomUnit}
                    onChange={(e) => setEditCustomUnit(e.target.value)}
                    placeholder="הזן יחידה מותאמת..."
                    className="w-full mt-1.5 px-3 py-1.5 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg text-xs text-zinc-900 dark:text-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  סטטוס ידני
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ItemStatus)}
                  id="edit-select-item-status"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white"
                >
                  <option value="IN_STOCK">זמין במלאי (IN_STOCK)</option>
                  <option value="LOW">כמות נמוכה (LOW)</option>
                  <option value="EMPTY">אזל לחלוטין (EMPTY)</option>
                </select>
              </div>
            </div>

            {/* 5. Barcode, Expiry & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-zinc-400" />
                  <span>מק״ט / ברקוד EAN</span>
                </label>
                <input
                  type="text"
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  placeholder="ללא מק״ט"
                  id="edit-input-item-barcode"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-zinc-400" />
                  <span>מחיר ליחידה (₪)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editPricePerUnit}
                  onChange={(e) => setEditPricePerUnit(e.target.value)}
                  placeholder="12.00"
                  id="edit-input-item-price"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  <span>תאריך תפוגה</span>
                </label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  id="edit-input-item-expiry"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            {/* 6. Notes */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>הערת מיקום במזווה / הוראות שימוש</span>
              </label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="למשל: צנצנת מסומנת במדף עליון..."
                id="edit-input-item-notes"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
              />
            </div>

            {/* Edit Actions Bottom */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ביטול עריכה
              </button>

              <button
                type="submit"
                id="btn-save-all-item-fields"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>שמור שינויים</span>
              </button>
            </div>
          </form>
        ) : (
          /* ======================================================== */
          /* STANDARD VIEW & QUICK ACTIONS                            */
          /* ======================================================== */
          <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {/* Main Packaging Quantity & Threshold Card */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    כמות נוכחית במלאי
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                    <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span>רף תחתון מוגדר: <strong>{item.minThreshold} {item.unit}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => quickStockChange(item.id, -1)}
                    disabled={item.quantity <= 0}
                    id="btn-modal-minus"
                    className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 flex items-center justify-center text-lg font-bold shadow-xs hover:bg-zinc-100 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="text-center min-w-[70px]">
                    <span className="text-3xl font-extrabold font-mono text-zinc-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <div className="text-xs font-semibold text-zinc-500 mt-0.5">
                      {item.unit}
                    </div>
                  </div>

                  <button
                    onClick={() => quickStockChange(item.id, 1)}
                    id="btn-modal-plus"
                    className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center text-lg font-bold shadow-xs active:scale-95 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Threshold status warning if low */}
              {item.quantity <= item.minThreshold && (
                <div className="p-2.5 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>המלאי הגיע לרף התחתון או מתחתיו ({item.quantity} מתוך סף {item.minThreshold})</span>
                  </div>
                  {!alreadyInShopping && (
                    <button
                      onClick={handleSendToShopping}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 shrink-0"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>הוסף לסל</span>
                    </button>
                  )}
                </div>
              )}

              {/* Quick Status Bar */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  סטטוס פריט:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setItemStatus(item.id, 'IN_STOCK')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'IN_STOCK'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300'
                    }`}
                  >
                    זמין במלאי
                  </button>
                  <button
                    onClick={() => setItemStatus(item.id, 'LOW')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'LOW'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300'
                    }`}
                  >
                    כמות נמוכה
                  </button>
                  <button
                    onClick={() => setItemStatus(item.id, 'EMPTY')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      item.status === 'EMPTY'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300'
                    }`}
                  >
                    אזל
                  </button>
                </div>
              </div>
            </div>

            {/* Details Grid (Barcode, Expiry, Department, Price) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                <div className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3 text-zinc-500" />
                  <span>מק״ט / ברקוד</span>
                </div>
                <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 mt-1 truncate">
                  {item.barcode_or_sku || 'ללא מק״ט סרוק'}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                <div className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-500" />
                  <span>תוקף מדף</span>
                </div>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1 truncate">
                  {item.expiryDate ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {item.expiryDate}
                    </span>
                  ) : (
                    <span className="text-zinc-400">ללא תאריך</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 col-span-2 sm:col-span-1">
                <div className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-zinc-500" />
                  <span>מחיר ליחידה</span>
                </div>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">
                  {item.pricePerUnit !== undefined ? `₪${item.pricePerUnit.toFixed(2)}` : 'לא הוגדר'}
                </div>
              </div>
            </div>

            {/* Notes & Location Description */}
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                  <span>הערת מיקום / שימוש במזווה:</span>
                </div>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>ערוך שדות</span>
                </button>
              </div>

              <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-white/70 dark:bg-zinc-800/70 p-2.5 rounded-lg border border-zinc-200/70 dark:border-zinc-700/50">
                {item.notes || 'אין הערה מיוחדת לפריט זה. לחץ "ערוך את כל השדות" להוספת מיקום מדויק או סף התראה.'}
              </div>
            </div>

            {/* Feedback Toast */}
            {addedToast && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>הפריט הועבר בהצלחה לרשימת הקניות בענף הקניות!</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer / Primary Action Buttons (Shown in VIEW mode) */}
        {!isEditMode && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/80 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">כמות לקנייה:</span>
              <div className="flex items-center border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 overflow-hidden">
                <button
                  onClick={() => setShoppingQty((q) => Math.max(1, q - 1))}
                  className="px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600"
                >
                  -
                </button>
                <span className="px-2 py-1 text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200">
                  {shoppingQty}
                </span>
                <button
                  onClick={() => setShoppingQty((q) => q + 1)}
                  className="px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleSendToShopping}
              id="btn-move-to-shopping-list"
              className="flex-1 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>העבר לחוסרים ברשימת קניות</span>
              {alreadyInShopping && <span className="text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded-full font-normal">(כבר קיים בסל)</span>}
            </button>

            <button
              onClick={handleDelete}
              title="הסר פריט מהמלאי"
              className="p-3 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
