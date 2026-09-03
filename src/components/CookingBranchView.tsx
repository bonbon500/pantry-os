import React, { useState, useRef, useEffect } from 'react';
import { usePantry } from '../context/PantryContext';
import { PHYSICAL_SLOTS } from '../data/slotDefinitions';
import { CookingDish, PantryItem, RecipeSuggestion } from '../types';
import {
  CookingPot,
  Sparkles,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  ChefHat,
  Loader2,
  Check,
  Layers,
  ArrowRight,
  ShoppingCart,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface AnalyzedIngredient {
  name: string;
  quantityNeeded: number;
  unit: string;
  matchedItem: PantryItem | null;
  isAvailable: boolean;
  shortageCount: number;
}

export const CookingBranchView: React.FC = () => {
  const {
    dishes,
    inventory,
    quickStockChange,
    addShoppingItem,
    shoppingList,
    historyLogs,
    setActiveTab,
  } = usePantry();

  const [cookingPlanText, setCookingPlanText] = useState('');
  const [selectedPresetDish, setSelectedPresetDish] = useState<CookingDish | null>(dishes[0] || null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedIngredients, setAnalyzedIngredients] = useState<AnalyzedIngredient[]>([]);
  const [activePlanTitle, setActivePlanTitle] = useState<string>('שקשוקת עגבניות ביתית עשירה עם בזיליקום');
  const [cookingFeedback, setCookingFeedback] = useState<{
    type: 'success' | 'partial';
    message: string;
    deductedItems: string[];
    missingItems: string[];
  } | null>(null);

  const [zeroWasteSuggestions, setZeroWasteSuggestions] = useState<RecipeSuggestion[]>([]);
  const [isGeneratingZeroWaste, setIsGeneratingZeroWaste] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Analyze plan ingredients against inventory
  const analyzePlan = (planTitle: string, explicitIngredients?: { itemName: string; quantity: number; unit: string }[]) => {
    setActivePlanTitle(planTitle);

    let rawIngredients: { itemName: string; quantity: number; unit: string }[] = [];

    if (explicitIngredients && explicitIngredients.length > 0) {
      rawIngredients = explicitIngredients;
    } else {
      // Decompose natural language title into key ingredients by scanning inventory keywords
      const words = planTitle.toLowerCase();
      const detected = inventory.filter((item) => {
        const itemName = item.name.toLowerCase();
        // check partial word matches
        return (
          words.includes(itemName) ||
          itemName.split(' ').some((w) => w.length > 2 && words.includes(w))
        );
      });

      if (detected.length > 0) {
        rawIngredients = detected.map((item) => ({
          itemName: item.name,
          quantity: 1,
          unit: item.unit,
        }));
      } else {
        // Fallback default sample decomposition
        rawIngredients = [
          { itemName: 'עגבניות חממה טריות', quantity: 2, unit: 'יח\'' },
          { itemName: 'בצל יבש מובחר', quantity: 1, unit: 'יח\'' },
          { itemName: 'שמן זית כתית מעולה 750 מ"ל', quantity: 1, unit: 'בקבוק' },
          { itemName: 'טופו במרקם קשה (קדיתא)', quantity: 1, unit: 'חבילה' },
        ];
      }
    }

    const analyzed: AnalyzedIngredient[] = rawIngredients.map((ing) => {
      const match = inventory.find(
        (inv) =>
          inv.name.toLowerCase().includes(ing.itemName.toLowerCase()) ||
          ing.itemName.toLowerCase().includes(inv.name.toLowerCase())
      );

      const availableQty = match ? match.quantity : 0;
      const isAvailable = availableQty >= ing.quantity;
      const shortage = isAvailable ? 0 : ing.quantity - availableQty;

      return {
        name: match ? match.name : ing.itemName,
        quantityNeeded: ing.quantity,
        unit: match ? match.unit : ing.unit,
        matchedItem: match || null,
        isAvailable,
        shortageCount: shortage,
      };
    });

    setAnalyzedIngredients(analyzed);

    // Auto-add any missing items to shopping list
    analyzed.forEach((ing) => {
      if (!ing.isAvailable && ing.shortageCount > 0) {
        const alreadyInShopping = shoppingList.some(
          (s) => s.item_name.toLowerCase() === ing.name.toLowerCase() && !s.isPurchased
        );
        if (!alreadyInShopping) {
          addShoppingItem({
            item_name: ing.name,
            search_query: ing.name,
            quantity_needed: Math.max(1, ing.shortageCount),
            unit: ing.unit,
            estimated_price: ing.matchedItem?.pricePerUnit ? ing.matchedItem.pricePerUnit * ing.shortageCount : 12.5,
            department:
              ing.matchedItem?.department === 'ירקות ופירות'
                ? 'PRODUCE'
                : ing.matchedItem?.department === 'מצוננים ותחליפים'
                ? 'REFRIGERATED'
                : ing.matchedItem?.department === 'חד-פעמי ומשק בית'
                ? 'UTILITY'
                : 'PANTRY',
            reason: `חסר לתוכנית בישול: "${planTitle}"`,
            target_slot: ing.matchedItem?.slot || 'CANNED_COLUMN_2',
            isPurchased: false,
          });
        }
      }
    });
  };

  // Initial analyze with first preset
  useEffect(() => {
    if (dishes.length > 0 && analyzedIngredients.length === 0) {
      analyzePlan(dishes[0].name, dishes[0].ingredients);
    }
  }, [dishes]);

  // Voice recording handler
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('הדפדפן אינו תומך בזיהוי קולי. אנא הקלד את תוכנית הבישול בתיבת הטקסט.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'he-IL';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCookingPlanText(transcript);
        handleCustomPlanSubmit(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed:', err);
      setIsRecording(false);
    }
  };

  // Handle custom plan input
  const handleCustomPlanSubmit = (textToAnalyze?: string) => {
    const text = textToAnalyze || cookingPlanText;
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      analyzePlan(text.trim());
      setIsAnalyzing(false);
    }, 300);
  };

  // One-click Finish Cooking: Decrement used packaging units from inventory
  const handleFinishCooking = () => {
    const deducted: string[] = [];
    const missing: string[] = [];

    analyzedIngredients.forEach((ing) => {
      if (ing.matchedItem && ing.matchedItem.quantity > 0) {
        const deductQty = Math.min(ing.matchedItem.quantity, ing.quantityNeeded);
        quickStockChange(ing.matchedItem.id, -deductQty);
        deducted.push(`${ing.name} (-${deductQty} ${ing.unit})`);
      } else {
        missing.push(`${ing.name} (חסר ${ing.shortageCount} ${ing.unit})`);
      }
    });

    if (missing.length === 0) {
      setCookingFeedback({
        type: 'success',
        message: `🎉 הבישול הושלם בהצלחה! כל ${deducted.length} האריזות/היחידות נגרעו מהסלוטים הפיזיים במזווה ובמקרר.`,
        deductedItems: deducted,
        missingItems: [],
      });
    } else {
      setCookingFeedback({
        type: 'partial',
        message: `⚠️ הבישול בוצע ונגרעו חומרי הגלם הזמינים. חוסרים הועברו ישירות לענף הקניות.`,
        deductedItems: deducted,
        missingItems: missing,
      });
    }

    // Refresh analysis with new inventory state
    setTimeout(() => {
      analyzePlan(activePlanTitle);
    }, 200);

    setTimeout(() => {
      setCookingFeedback(null);
    }, 7000);
  };

  // Zero-waste suggestions
  const handleGenerateZeroWaste = async () => {
    setIsGeneratingZeroWaste(true);
    try {
      const res = await fetch('/api/engine/zero-waste-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItems: inventory,
          servings: 4,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setZeroWasteSuggestions(data);
        }
      }
    } catch (err) {
      console.error('Failed to generate zero waste recipes:', err);
    } finally {
      setIsGeneratingZeroWaste(false);
    }
  };

  const totalIngredients = analyzedIngredients.length;
  const availableCount = analyzedIngredients.filter((i) => i.isAvailable).length;
  const missingCount = totalIngredients - availableCount;
  const allAvailable = totalIngredients > 0 && missingCount === 0;

  return (
    <div className="space-y-6">
      {/* 1. Quick Cooking Plan Input Area (Text + Voice) */}
      <div className="bg-white dark:bg-zinc-800/90 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-700/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                תכנון בישול, פירוק לגורמים וגריעת מלאי
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                הקלד או אמור בקול מה בכוונתך לבשל — המערכת תפרק את המנה לרכיבים באריזות פשוטות ותאמת מול המלאי
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              ניהול יחידות פשוט (ללא גרמים)
            </span>
          </div>
        </div>

        {/* Input Bar with Mic */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCustomPlanSubmit();
          }}
          className="flex items-center gap-2.5"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={cookingPlanText}
              onChange={(e) => setCookingPlanText(e.target.value)}
              placeholder="למשל: 'מכין מוקפץ טופו ופלפלים עם סויה ואורז בסמטי'..."
              className="w-full pl-4 pr-4 py-3.5 text-sm bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-medium"
            />
          </div>

          {/* Speech Recognition Button */}
          <button
            type="button"
            onClick={toggleRecording}
            id="btn-voice-cooking-input"
            title={isRecording ? 'עצור הקלטה' : 'הקלט תוכנית בישול בקול'}
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-center shrink-0 ${
              isRecording
                ? 'bg-rose-600 text-white border-rose-600 animate-pulse shadow-lg ring-4 ring-rose-500/30'
                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Analyze / Submit Button */}
          <button
            type="submit"
            id="btn-analyze-cooking-plan"
            className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-2xl shadow-md flex items-center gap-2 shrink-0 transition-all"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>פרק ובדוק מצאי</span>
          </button>
        </form>

        {/* Fast Preset Buttons */}
        <div className="mt-3.5 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">תוכניות מהירות:</span>
          {dishes.map((dish) => (
            <button
              key={dish.id}
              onClick={() => {
                setSelectedPresetDish(dish);
                setCookingPlanText(dish.name);
                analyzePlan(dish.name, dish.ingredients);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                activePlanTitle === dish.name
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-zinc-50 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-600 hover:bg-zinc-100'
              }`}
            >
              🍲 {dish.name}
            </button>
          ))}
        </div>
      </div>

      {/* Cooking Feedback Banner */}
      {cookingFeedback && (
        <div
          className={`p-5 rounded-3xl border animate-in fade-in slide-in-from-top-2 shadow-md ${
            cookingFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {cookingFeedback.type === 'success' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-2 flex-1">
              <h4 className="font-extrabold text-sm leading-snug">{cookingFeedback.message}</h4>

              {cookingFeedback.deductedItems.length > 0 && (
                <div className="text-xs flex flex-wrap gap-1.5 pt-1">
                  <span className="font-bold">נגרעו מהמזווה:</span>
                  {cookingFeedback.deductedItems.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 font-mono text-[11px]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {cookingFeedback.missingItems.length > 0 && (
                <div className="text-xs flex items-center justify-between gap-2 pt-1 border-t border-amber-200 dark:border-amber-800/60">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="font-bold text-rose-600 dark:text-rose-400">חוסרים שהועברו לקניות:</span>
                    {cookingFeedback.missingItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 font-mono text-[11px]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('shopping')}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 shrink-0"
                  >
                    <span>צפה ברשימת הקניות</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Ingredient Analysis & Inventory Matching Breakdown */}
      <div className="bg-white dark:bg-zinc-800/90 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-800/50">
          <div>
            <div className="flex items-center gap-2">
              <CookingPot className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                פירוק חומרי גלם ואימות מצאי מול 7 הסלוטים
              </h3>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              תוכנית נוכחית: <strong className="text-zinc-900 dark:text-zinc-100">"{activePlanTitle}"</strong>
            </p>
          </div>

          {/* Status summary pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{availableCount} זמינים במזווה</span>
            </span>

            {missingCount > 0 && (
              <span className="text-xs font-bold px-3 py-1 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>{missingCount} חסרים (נוספו לקניות)</span>
              </span>
            )}
          </div>
        </div>

        {/* Ingredients Grid */}
        <div className="p-6">
          {analyzedIngredients.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 text-xs">
              הזן תוכנית בישול למעלה לפירוק ואימות מול המלאי
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {analyzedIngredients.map((ing, idx) => {
                const slotMeta = ing.matchedItem ? PHYSICAL_SLOTS[ing.matchedItem.slot] : null;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      ing.isAvailable
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/40'
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                    }`}
                  >
                    <div>
                      {/* Ingredient Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              ing.isAvailable ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                            }`}
                          />
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-snug">
                            {ing.name}
                          </h4>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-lg font-bold shrink-0 ${
                            ing.isAvailable
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {ing.isAvailable ? '✅ קיים במלאי' : '❌ חסר במלאי'}
                        </span>
                      </div>

                      {/* Required vs Available (Strictly packaging units) */}
                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                          <span>נדרש למתכון:</span>
                          <span className="font-extrabold font-mono text-zinc-900 dark:text-white">
                            {ing.quantityNeeded} {ing.unit}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                          <span>מצאי נוכחי:</span>
                          <span className="font-mono font-bold">
                            {ing.matchedItem ? `${ing.matchedItem.quantity} ${ing.matchedItem.unit}` : '0 יח\''}
                          </span>
                        </div>

                        {slotMeta && (
                          <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400 border-t border-zinc-200/60 dark:border-zinc-700/50">
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3 text-emerald-500" />
                              <span>מיקום:</span>
                            </span>
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[130px]">
                              {slotMeta.nameHe}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action on Item */}
                    {!ing.isAvailable && (
                      <div className="mt-3 pt-2.5 border-t border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          <span>נוסף לסל החוסרים</span>
                        </span>
                        <button
                          onClick={() => setActiveTab('shopping')}
                          className="text-[11px] font-bold text-emerald-600 hover:underline"
                        >
                          פתח סל
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Primary Action Button: "Finish Cooking - Update Stock" */}
          <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-zinc-500 space-y-0.5">
              <div className="font-bold text-zinc-800 dark:text-zinc-200">
                גריעה ישירה בלחיצה אחת:
              </div>
              <div>
                לחיצה על הכפתור תגרע את כל האריזות והיחידות שהיו בשימוש מתוך 7 הסלוטים הפיזיים.
              </div>
            </div>

            <button
              onClick={handleFinishCooking}
              id="btn-finish-cooking-decrement"
              disabled={analyzedIngredients.length === 0}
              className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
              <span>סיימתי לבשל - עדכן מלאי</span>
            </button>
          </div>
        </div>
      </div>

      {/* Zero Waste Recipe Suggestions based on Live Stock */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              Zero-Waste AI Engine
            </span>
            <ChefHat className="w-4 h-4 text-emerald-200" />
          </div>
          <h3 className="text-lg font-bold">הצעות שף מבוססות מצאי קיים בלבד</h3>
          <p className="text-xs text-emerald-100 leading-relaxed">
            המערכת סורקת את הפריטים הזמינים בכל 7 הסלוטים ומציעה מתכונים שלא דורשים שום קנייה נוספת!
          </p>
        </div>

        <button
          onClick={handleGenerateZeroWaste}
          disabled={isGeneratingZeroWaste}
          id="btn-generate-zero-waste"
          className="px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100 text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all whitespace-nowrap self-stretch md:self-auto justify-center"
        >
          {isGeneratingZeroWaste ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>סורק סלוטים ויוצר מתכונים...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>הצע מתכונים מהמלאי הזמין</span>
            </>
          )}
        </button>
      </div>

      {/* Zero Waste Suggestions Cards */}
      {zeroWasteSuggestions.length > 0 && (
        <div className="space-y-3 bg-amber-500/10 border border-amber-500/30 p-5 rounded-3xl">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>מתכונים מוצעים מהמלאי הקיים:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {zeroWasteSuggestions.map((sugg, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-amber-200 dark:border-zinc-700 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{sugg.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {sugg.matchPercentage}% התאמה
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {sugg.prepTimeMinutes} דק׳
                    </span>
                    <span>•</span>
                    <span>קושי: {sugg.difficulty}</span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      חומרי גלם מהמלאי:
                    </div>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                      {sugg.usedInventoryItems?.map((ui, uIdx) => (
                        <li key={uIdx} className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>
                            {ui.name} ({ui.quantity})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const rawIngs = sugg.usedInventoryItems.map((u) => ({
                      itemName: u.name,
                      quantity: 1,
                      unit: 'יח\'',
                    }));
                    analyzePlan(sugg.title, rawIngs);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>טען לביצוע ואימות</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
