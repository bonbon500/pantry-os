import React, { useState, useRef } from 'react';
import { usePantry } from '../context/PantryContext';
import { PHYSICAL_SLOTS } from '../data/slotDefinitions';
import { SlotType, DepartmentType, ItemStatus, PantryItem } from '../types';
import {
  X,
  Plus,
  PackagePlus,
  Layers,
  Tag,
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle2,
  BookmarkCheck,
  Upload,
  Camera,
  Sparkles,
  Loader2,
  FileSpreadsheet,
  Check,
  RotateCcw,
  ArrowRight,
  ListFilter,
  Package,
} from 'lucide-react';

interface AddPantryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSlot?: SlotType;
  initialMode?: 'MANUAL' | 'RECEIPT_AI' | 'SHOPPING_LIST_AI';
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

interface ExtractedItemCandidate {
  id: string;
  name: string;
  slot: SlotType;
  department: DepartmentType;
  quantity: number;
  minThreshold: number;
  unit: string;
  barcode_or_sku?: string | null;
  pricePerUnit?: number;
  expiryDate?: string;
  selected: boolean;
}

export const AddPantryItemModal: React.FC<AddPantryItemModalProps> = ({
  isOpen,
  onClose,
  defaultSlot = 'JAR_COLUMN_1',
  initialMode = 'MANUAL',
}) => {
  const { addNewPantryItem, executeEngineCommand, isProcessing, inventory } = usePantry();

  // Mode: Manual form, Receipt scan (OCR/Image/Text), Shopping list extraction
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'RECEIPT_AI' | 'SHOPPING_LIST_AI'>('MANUAL');

  // Manual Form State
  const [name, setName] = useState('');
  const [slot, setSlot] = useState<SlotType>(defaultSlot);
  const [department, setDepartment] = useState<DepartmentType>('מוצרי יסוד ומזווה');
  const [quantity, setQuantity] = useState<number>(2);
  const [minThreshold, setMinThreshold] = useState<number>(1);
  const [unit, setUnit] = useState<string>('צנצנת');
  const [customUnit, setCustomUnit] = useState<string>('');
  const [barcode, setBarcode] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [pricePerUnit, setPricePerUnit] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // AI Extraction State (Receipt / Shopping list)
  const [rawText, setRawText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [extractedCandidates, setExtractedCandidates] = useState<ExtractedItemCandidate[]>([]);
  const [extractionStep, setExtractionStep] = useState<'INPUT' | 'REVIEW'>('INPUT');
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset or adjust on modal open
  React.useEffect(() => {
    if (isOpen) {
      setSlot(defaultSlot);
      setActiveTab(initialMode);
      setExtractionStep('INPUT');
      setExtractedCandidates([]);
      setRawText('');
      setImageBase64(null);
      setImageFileName(null);
      setErrorMessage(null);
      setSuccessToast(null);

      // Auto unit based on slot
      if (defaultSlot === 'JAR_COLUMN_1') {
        setUnit('צנצנת');
        setDepartment('מוצרי יסוד ומזווה');
      } else if (defaultSlot === 'CANNED_COLUMN_2') {
        setUnit('קופסה');
        setDepartment('מוצרי יסוד ומזווה');
      } else if (defaultSlot === 'KANBAN_BACKUP_3') {
        setUnit('מארז');
        setDepartment('מוצרי יסוד ומזווה');
      } else if (defaultSlot === 'UTILITY_DRAWER_1' || defaultSlot === 'UTILITY_DRAWER_2') {
        setUnit('חבילה');
        setDepartment('חד-פעמי ומשק בית');
      } else if (defaultSlot === 'FRESH_OR_REFRIGERATED') {
        setUnit('יח\'');
        setDepartment('מצוננים ותחליפים');
      } else if (defaultSlot === 'FREEZER_ZONE') {
        setUnit('מארז / שקית');
        setDepartment('מצוננים ותחליפים');
      } else if (defaultSlot === 'GARDEN_HERBS') {
        setUnit('עציץ');
        setDepartment('תבלינים ועשבי תיבול');
      }
    }
  }, [isOpen, defaultSlot, initialMode]);

  if (!isOpen) return null;

  // Preset receipt samples
  const sampleReceipts = [
    {
      title: 'קבלת סופר שופרסל מלאה (מוצרי יסוד, ירקות, שימורים)',
      text: `שופרסל דיל סניף גבעתיים
תאריך: 25/08/2026
7290000104821 אורז בסמטי 1 קג 11.90
7290008432190 טחינה הר ברכה 500ג 18.90
8005110000104 עגבניות מרוסקות מוטי 7.90
7290004128911 עדשים שחורות בלוגה 14.50
קוד שקילה 4011 עגבניות חממה 1.2 קג 9.48
קוד שקילה 4022 בצל יבש 1.5 קג 8.85
7290001092837 גלילי נייר ניקול 19.90
7290012938471 טופו קשה קדיתא 13.90
7290005234190 שמן זית כתית מעולה 750 מ"ל 39.90
שקיות גופיה 4 יח 0.40
מע״מ 17% כלול
סה״כ לתשלום: 144.78 ש״ח`,
    },
    {
      title: 'רשימת קניות שבועית / סיכום הודעה',
      text: `רשימת קניות לבית:
- 2 חבילות פסטה פנה ברילה
- 3 קופסאות שימורי טונה בשמן
- 1 שקית עדשים ירוקות
- 2 ק"ג מלפפונים
- 1 עציץ בזיליקום למרפסת
- 2 חבילות נייר סופג ניקול
- 1 שמן קנולה 1 ליטר
- 2 גבינת פטה 5%`,
    },
  ];

  // Manual submit handler
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage('נא להזין שם לפריט');
      return;
    }

    if (quantity < 0) {
      setErrorMessage('הכמות במלאי לא יכולה להיות שלילית');
      return;
    }

    if (minThreshold < 0) {
      setErrorMessage('רף תחתון למלאי לא יכול להיות שלילי');
      return;
    }

    const finalUnit = customUnit.trim() || unit;

    let status: ItemStatus = 'IN_STOCK';
    if (quantity === 0) {
      status = 'EMPTY';
    } else if (quantity <= minThreshold) {
      status = 'LOW';
    }

    const newItemData: Omit<PantryItem, 'id' | 'lastUpdated'> = {
      name: cleanName,
      slot,
      department,
      quantity,
      minThreshold,
      unit: finalUnit,
      status,
      barcode_or_sku: barcode.trim() || null,
      expiryDate: expiryDate.trim() || undefined,
      pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : undefined,
      notes: notes.trim() || undefined,
    };

    addNewPantryItem(newItemData);

    setSuccessToast(`הפריט "${cleanName}" נוסף בהצלחה למזווה בסלוט ${PHYSICAL_SLOTS[slot]?.nameHe || ''}!`);
    setTimeout(() => {
      setName('');
      setBarcode('');
      setExpiryDate('');
      setPricePerUnit('');
      setNotes('');
      setCustomUnit('');
      setQuantity(2);
      setMinThreshold(1);
      onClose();
    }, 500);
  };

  // Image Upload Handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Run AI Extraction for Receipt or Shopping List
  const handleRunAiExtraction = async () => {
    setErrorMessage(null);

    if (!rawText.trim() && !imageBase64) {
      setErrorMessage('נא להזין טקסט של קבלה / רשימת קניות או להעלות תמונה / צילום קבלה');
      return;
    }

    const inputType = activeTab === 'RECEIPT_AI' ? 'receipt_ocr' : 'shopping_list_import';
    const promptPrefix =
      activeTab === 'RECEIPT_AI'
        ? `חלץ את כל הפריטים מקבלה זו, זהה מק״ט/ברקוד או קוד שקילה, מחיר, כמות, וסווג כל פריט בדיוק לאחד מ-7 הסלוטים הפיזיים במזווה (JAR_COLUMN_1, CANNED_COLUMN_2, KANBAN_BACKUP_3, UTILITY_DRAWER_1, UTILITY_DRAWER_2, FRESH_OR_REFRIGERATED, GARDEN_HERBS):\n`
        : `חלץ את כל המוצרים מרשימת הקניות שלפניך, הפוך אותם לפריטי מלאי מסווגים ל-7 הסلوטים הפיזיים במזווה, עם כמות, יחידה ורף תחתון מתאים:\n`;

    const fullPrompt = promptPrefix + (rawText || 'ראה תמונה מצורפת לחילוץ פריטים');

    const result = await executeEngineCommand(
      fullPrompt,
      inputType,
      imageBase64 || undefined,
      'image/jpeg'
    );

    if (result && result.payload && Array.isArray(result.payload.inventory_mutations)) {
      const candidates: ExtractedItemCandidate[] = result.payload.inventory_mutations.map((m, idx) => {
        const qty = Math.max(1, Math.abs(parseFloat(m.quantity_delta) || 1));
        const rawSlot = m.target_slot as SlotType;
        const validSlot: SlotType = PHYSICAL_SLOTS[rawSlot] ? rawSlot : 'CANNED_COLUMN_2';

        // Compute appropriate department
        let dept: DepartmentType = 'מוצרי יסוד ומזווה';
        if (validSlot === 'FRESH_OR_REFRIGERATED') {
          dept = m.item_name.includes('טופו') || m.item_name.includes('ביצים') || m.item_name.includes('גבינ') || m.item_name.includes('חלב')
            ? 'מצוננים ותחליפים'
            : 'ירקות ופירות';
        } else if (validSlot === 'UTILITY_DRAWER_1' || validSlot === 'UTILITY_DRAWER_2') {
          dept = 'חד-פעמי ומשק בית';
        } else if (validSlot === 'GARDEN_HERBS') {
          dept = 'תבלינים ועשבי תיבול';
        }

        // Recommend default threshold based on category
        let threshold = 1;
        if (validSlot === 'JAR_COLUMN_1') threshold = 1;
        if (validSlot === 'CANNED_COLUMN_2') threshold = 2;
        if (validSlot === 'KANBAN_BACKUP_3') threshold = 1;
        if (validSlot === 'UTILITY_DRAWER_1' || validSlot === 'UTILITY_DRAWER_2') threshold = 1;

        return {
          id: 'cand-' + Date.now() + '-' + idx,
          name: m.item_name,
          slot: validSlot,
          department: dept,
          quantity: qty,
          minThreshold: threshold,
          unit: m.unit === 'UNITS' ? (validSlot === 'JAR_COLUMN_1' ? 'צנצנת' : validSlot === 'CANNED_COLUMN_2' ? 'קופסה' : 'יח\'') : m.unit || 'יח\'',
          barcode_or_sku: m.barcode_or_sku || null,
          selected: true,
        };
      });

      if (candidates.length === 0) {
        setErrorMessage('לא זוהו פריטים ברורים. נסה להעלות תמונה ברורה יותר או להדביק טקסט עם פירוט פריטים.');
        return;
      }

      setExtractedCandidates(candidates);
      setAiSummary(result.user_summary || `חולצו ${candidates.length} פריטים בהצלחה.`);
      setExtractionStep('REVIEW');
    } else {
      setErrorMessage('אירעה שגיאה בעיבוד הנתונים. נסה שוב או הוסף פריט ידנית.');
    }
  };

  // Toggle selection of a candidate
  const handleToggleCandidate = (id: string) => {
    setExtractedCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  // Update candidate field during review
  const handleUpdateCandidate = (id: string, updates: Partial<ExtractedItemCandidate>) => {
    setExtractedCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Confirm and save all selected extracted items to pantry
  const handleConfirmAddAllExtracted = () => {
    const selectedItems = extractedCandidates.filter((c) => c.selected);
    if (selectedItems.length === 0) {
      setErrorMessage('נא לבחור לפחות פריט אחד להוספה למלאי');
      return;
    }

    selectedItems.forEach((c) => {
      let status: ItemStatus = 'IN_STOCK';
      if (c.quantity === 0) status = 'EMPTY';
      else if (c.quantity <= c.minThreshold) status = 'LOW';

      addNewPantryItem({
        name: c.name,
        slot: c.slot,
        department: c.department,
        quantity: c.quantity,
        minThreshold: c.minThreshold,
        unit: c.unit,
        status,
        barcode_or_sku: c.barcode_or_sku || null,
        pricePerUnit: c.pricePerUnit,
        notes: `נקלט מחילוץ ${activeTab === 'RECEIPT_AI' ? 'קבלה' : 'רשימת קניות'}`,
      });
    });

    setSuccessToast(`נוספו ${selectedItems.length} פריטים בהצלחה למזווה וסונכרנו לענן!`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const slotKeys = Object.keys(PHYSICAL_SLOTS) as SlotType[];
  const selectedSlotMeta = PHYSICAL_SLOTS[slot];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
      id="modal-add-pantry-item-main"
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-inner">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">הוספת פריטים למלאי המזווה</h2>
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                  סיווג אוטומטי ל-7 סלוטים
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                הוספה ידנית מדויקת או חילוץ חכם מקבלות סופר ורשימות קניות
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="btn-close-add-item-modal"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection Bar (בולט וראשי) */}
        <div className="p-3 bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('MANUAL');
              setExtractionStep('INPUT');
            }}
            id="tab-add-manual"
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'MANUAL'
                ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-md border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-600" />
            <span>הוספה ידנית רגילה</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('RECEIPT_AI');
              setExtractionStep('INPUT');
            }}
            id="tab-add-receipt"
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'RECEIPT_AI'
                ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-md border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>העלאת קבלה ו-OCR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('SHOPPING_LIST_AI');
              setExtractionStep('INPUT');
            }}
            id="tab-add-shopping-list"
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'SHOPPING_LIST_AI'
                ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-md border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>חילוץ מרשימת קניות</span>
          </button>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successToast && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* ======================================================== */}
          {/* TAB 1: MANUAL ADDITION FORM                              */}
          {/* ======================================================== */}
          {activeTab === 'MANUAL' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  שם הפריט / המוצר <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="למשל: עדשים שחורות, עגבניות מרוסקות, שמן זית..."
                  required
                  id="input-manual-item-name"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white font-medium"
                />
              </div>

              {/* Physical Slot Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>סלוט מיקום פיזי במזווה</span>
                </label>
                <select
                  value={slot}
                  onChange={(e) => setSlot(e.target.value as SlotType)}
                  id="select-manual-item-slot"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
                >
                  {slotKeys.map((key) => {
                    const meta = PHYSICAL_SLOTS[key];
                    return (
                      <option key={key} value={key}>
                        {meta.badge} - {meta.nameHe} ({meta.shortName})
                      </option>
                    );
                  })}
                </select>
                {selectedSlotMeta && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    {selectedSlotMeta.descriptionHe}
                  </p>
                )}
              </div>

              {/* Quantities & Threshold Card */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl space-y-3.5">
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                  <span>הגדרת כמויות ורף תחתון למלאי (התראת סף)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Quantity */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      כמות נוכחית במלאי
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(0, q - 1))}
                        className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold hover:bg-zinc-100 flex items-center justify-center"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                        id="input-manual-item-quantity"
                        className="w-full text-center py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold font-mono text-base text-zinc-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Minimum Threshold (רף תחתון) */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                      <span>רף תחתון למלאי (סף מינימום)</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">התראה כשהכמות נמוכה</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMinThreshold((t) => Math.max(0, t - 1))}
                        className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold hover:bg-zinc-100 flex items-center justify-center"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={minThreshold}
                        onChange={(e) => setMinThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                        id="input-manual-item-min-threshold"
                        className="w-full text-center py-2 bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 rounded-xl font-bold font-mono text-base text-amber-900 dark:text-amber-300"
                      />
                      <button
                        type="button"
                        onClick={() => setMinThreshold((t) => t + 1)}
                        className="w-9 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  כאשר הכמות תגיע ל-{minThreshold} {customUnit || unit} או פחות, המערכת תסמן את הפריט כ-<strong>LOW</strong> ותאפשר סנכרון ישיר לרשימת הקניות.
                </p>
              </div>

              {/* Unit & Department Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    יחידת מידה / אריזה
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      id="select-manual-item-unit"
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value="אחר">אחר (הקלד חופשי)...</option>
                    </select>

                    {unit === 'אחר' && (
                      <input
                        type="text"
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        placeholder="הזן יחידה (למשל: בקבוקון, קרטון)..."
                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg text-xs text-zinc-900 dark:text-white"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    מחלקה
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                    id="select-manual-item-department"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Barcode, Price, Expiry Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-zinc-400" />
                    <span>מק״ט / ברקוד EAN</span>
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="7290001234567"
                    id="input-manual-item-barcode"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-white"
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
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    placeholder="12.90"
                    id="input-manual-item-price"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    <span>תאריך תפוגה</span>
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    id="input-manual-item-expiry"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>הערת מיקום במזווה / הוראות שימוש</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="למשל: מדף אמצעי צד ימין, מיועד לתבשילי קדרה..."
                  id="input-manual-item-notes"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  id="btn-submit-manual-pantry-item"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>הוסף פריט למזווה</span>
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 2 & 3: RECEIPT OCR & SHOPPING LIST AI EXTRACTION     */}
          {/* ======================================================== */}
          {(activeTab === 'RECEIPT_AI' || activeTab === 'SHOPPING_LIST_AI') && (
            <div>
              {extractionStep === 'INPUT' ? (
                <div className="space-y-4">
                  {/* Explanation Banner */}
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                      {activeTab === 'RECEIPT_AI' ? (
                        <span>
                          <strong>חילוץ אוטומטי מקבלות:</strong> העלה צילום/סריקת קבלה (שופרסל, רמי לוי, יוחננוף ועוד) או הדבק טקסט. מנוע ה-AI יחלץ אוטומטית שמות מוצרים, מק״טים, כמויות, וישבץ כל פריט בסלוט הפיזי המתאים ובקטגוריה הנכונה.
                        </span>
                      ) : (
                        <span>
                          <strong>חילוץ מרשימת קניות:</strong> הדבק רשימת קניות חופשית (טקסט, וואטסאפ או פתק). המערכת תסווג את כל הפריטים לסלוטים הפיזיים במזווה, תקבע רפי מינימום ותאפשר הוספה מהירה במכה אחת.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Upload Image Section (especially for Receipt) */}
                  {activeTab === 'RECEIPT_AI' && (
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>העלאת תמונה / צילום קבלה (OCR)</span>
                      </label>

                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer bg-zinc-50/50 dark:bg-zinc-800/40 transition-colors"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                          id="input-file-receipt-image"
                        />
                        {imageBase64 ? (
                          <div className="flex items-center justify-center gap-3">
                            <img
                              src={imageBase64}
                              alt="Receipt preview"
                              className="w-16 h-16 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xs"
                            />
                            <div className="text-right">
                              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                תמונה הועלתה בהצלחה!
                              </div>
                              <div className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                                {imageFileName || 'קבלה מוכנה לפענוח'}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageBase64(null);
                                  setImageFileName(null);
                                }}
                                className="text-[10px] text-rose-500 hover:underline mt-0.5"
                              >
                                הסר תמונה
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="py-2">
                            <Upload className="w-8 h-8 mx-auto text-zinc-400 mb-1.5" />
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                              לחץ כאן לבחירת קובץ תמונה של קבלה
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              תומך JPG, PNG, צילומי מסך מהאפליקציה או צילום ישיר
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Text Input / Paste area */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {activeTab === 'RECEIPT_AI' ? 'או הדבק את טקסט הקבלה:' : 'הדבק את רשימת הקניות / פריטים:'}
                      </label>
                      <span className="text-[11px] text-zinc-400">טקסט חופשי / הודעה</span>
                    </div>

                    <textarea
                      rows={5}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder={
                        activeTab === 'RECEIPT_AI'
                          ? 'שופרסל דיל...\n7290000104821 אורז בסמטי 11.90\n7290008432190 טחינה הר ברכה 18.90...'
                          : 'רשימת קניות:\n- 2 חבילות פסטה\n- 3 קופסאות שימורי עגבניות\n- 1 שמן זית\n- 2 ק"ג בצל...'
                      }
                      id="textarea-ai-extract-input"
                      className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
                    />
                  </div>

                  {/* Preset Sample Buttons for Quick Trial */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                    <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-2">
                      💡 דוגמאות מוכנות לבדיקה מהירה בלחיצה אחת:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sampleReceipts.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setRawText(sample.text);
                            setImageBase64(null);
                          }}
                          className="px-2.5 py-1 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg text-[11px] text-zinc-700 dark:text-zinc-200 hover:border-emerald-500 transition-colors text-right"
                        >
                          {sample.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Extraction Trigger Button */}
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      ביטול
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing || (!rawText.trim() && !imageBase64)}
                      onClick={handleRunAiExtraction}
                      id="btn-run-ai-extraction"
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>מחלץ ומסווג פריטים...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>חלץ מוצרים וסווג לסלוטים</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* ======================================================== */
                /* STEP 2: REVIEW CANDIDATES BEFORE ADDING                  */
                /* ======================================================== */
                <div className="space-y-4">
                  {aiSummary && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{aiSummary}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        פריטים שחולצו ({extractedCandidates.filter((c) => c.selected).length} נבחרו מתוך {extractedCandidates.length})
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        באפשרותך לערוך את הסלוט, הכמות והרף התחתון של כל פריט לפני האישור
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExtractedCandidates((prev) =>
                            prev.map((c) => ({ ...c, selected: true }))
                          )
                        }
                        className="text-[11px] text-emerald-600 font-bold hover:underline"
                      >
                        בחר הכל
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() =>
                          setExtractedCandidates((prev) =>
                            prev.map((c) => ({ ...c, selected: false }))
                          )
                        }
                        className="text-[11px] text-zinc-500 font-medium hover:underline"
                      >
                        בטל בחירה
                      </button>
                    </div>
                  </div>

                  {/* Candidate Items List */}
                  <div className="space-y-2.5 max-h-[46vh] overflow-y-auto custom-scrollbar p-1">
                    {extractedCandidates.map((cand) => {
                      const slotMeta = PHYSICAL_SLOTS[cand.slot];
                      return (
                        <div
                          key={cand.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            cand.selected
                              ? 'bg-white dark:bg-zinc-800/90 border-emerald-400 dark:border-emerald-600/80 shadow-xs'
                              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            {/* Checkbox + Name */}
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={cand.selected}
                                onChange={() => handleToggleCandidate(cand.id)}
                                className="w-4 h-4 mt-1 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                              />
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={cand.name}
                                  onChange={(e) =>
                                    handleUpdateCandidate(cand.id, { name: e.target.value })
                                  }
                                  className="w-full px-2 py-1 bg-transparent font-bold text-sm text-zinc-900 dark:text-white border-b border-transparent hover:border-zinc-300 focus:border-emerald-500 focus:outline-none"
                                />
                                <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                                  {cand.barcode_or_sku && (
                                    <span className="font-mono bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.2 rounded text-[10px]">
                                      מק״ט: {cand.barcode_or_sku}
                                    </span>
                                  )}
                                  <span>{cand.department}</span>
                                </div>
                              </div>
                            </div>

                            {/* Slot Badge Select */}
                            <div className="shrink-0">
                              <select
                                value={cand.slot}
                                onChange={(e) =>
                                  handleUpdateCandidate(cand.id, { slot: e.target.value as SlotType })
                                }
                                className="px-2 py-1 bg-zinc-100 dark:bg-zinc-700 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-600 focus:outline-none"
                              >
                                {slotKeys.map((k) => (
                                  <option key={k} value={k}>
                                    {PHYSICAL_SLOTS[k].badge} {PHYSICAL_SLOTS[k].shortName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Quantities, Unit & Threshold Row */}
                          <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500 font-medium">כמות:</span>
                              <div className="flex items-center border border-zinc-200 dark:border-zinc-600 rounded-lg bg-zinc-50 dark:bg-zinc-700 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateCandidate(cand.id, {
                                      quantity: Math.max(1, cand.quantity - 1),
                                    })
                                  }
                                  className="px-2 py-0.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 font-bold"
                                >
                                  -
                                </button>
                                <span className="px-2 py-0.5 font-bold font-mono text-zinc-900 dark:text-white">
                                  {cand.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateCandidate(cand.id, { quantity: cand.quantity + 1 })
                                  }
                                  className="px-2 py-0.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 font-bold"
                                >
                                  +
                                </button>
                              </div>
                              <input
                                type="text"
                                value={cand.unit}
                                onChange={(e) =>
                                  handleUpdateCandidate(cand.id, { unit: e.target.value })
                                }
                                className="w-16 px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg text-center font-medium text-zinc-800 dark:text-zinc-200"
                              />
                            </div>

                            {/* Minimum Threshold */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                <BookmarkCheck className="w-3.5 h-3.5" />
                                <span>רף תחתון:</span>
                              </span>
                              <div className="flex items-center border border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateCandidate(cand.id, {
                                      minThreshold: Math.max(0, cand.minThreshold - 1),
                                    })
                                  }
                                  className="px-1.5 py-0.5 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-bold"
                                >
                                  -
                                </button>
                                <span className="px-2 py-0.5 font-bold font-mono text-amber-900 dark:text-amber-300">
                                  {cand.minThreshold}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateCandidate(cand.id, {
                                      minThreshold: cand.minThreshold + 1,
                                    })
                                  }
                                  className="px-1.5 py-0.5 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions for Step 2 */}
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setExtractionStep('INPUT')}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>חזור לעריכת טקסט/תמונה</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmAddAllExtracted}
                      id="btn-confirm-add-extracted-items"
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        הוסף {extractedCandidates.filter((c) => c.selected).length} פריטים למלאי המזווה
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
