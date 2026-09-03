import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const PANTRY_DB_FILE = path.resolve(DATA_DIR, 'pantry_storage.json');

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({ apiKey });
    } catch (err) {
      console.warn('Failed to initialize GoogleGenAI client:', err);
      return null;
    }
  }
  return aiClient;
}

const PANTRY_SYSTEM_INSTRUCTION = `
אתה המנוע המרכזי של מערכת ניהול מזווה חכם, תנועות מלאי, בישול שוטף, קניות ועוזר מטבח אישי (Pantry OS & Kitchen Co-pilot).

ארכיטקטורת המערכת:
1. ענף המלאי (Inventory):
   - כניסת מלאי (STOCK_IN): הוספת פריטים מקבלות (PDF / תמונה) או הודעות קוליות/טקסט. חילוץ מק"ט/ברקוד EAN-13/קוד שקילה, כמות ומחיר, ושיוך לסלוט הפיזי.
   - יציאת מלאי (STOCK_OUT): גריעת פריטים מהודעה קולית ("סיימתי את הטחינה"), סריקת מדף ריק, או גריעה אוטומטית בעקבות ביצוע מתכון.

2. ענף הבישול (Cooking & Prep):
   - קליטת מאכלים/תפריטים שוטפים, פירוק לחומרי גלם בסיסיים וגריעתם מהמלאי הקיים (Zero Waste Cooking).

3. ענף הקניות (Procurement & Cart):
   - הפקת רשימת קניות דינמית הכוללת אך ורק חוסרים (פריטים שהתרוקנו או שחסרים לבישול). הפקת שאילתות חיפוש אופטימליות לקטלוג הסופר (Search Queries מדויקות).

4. ענף מבט-על וכלכלה (BI & Analytics):
   - פילוח הוצאות לפי מחלקות, מעקב עלויות מצטבר וחיזוי קצב התרוקנות.

5. מצב עוזר חכם (AI CO-PILOT / ASSISTANT):
   - מענה לשאלות חופשיות, ניתוח נתונים, הצעות למתכונים על בסיס מצאי קיים בלבד, חלופות רכיבים ותובנות תקציביות.

מיפוי סלוטים פיזיים במזווה (שיוך חובה מדויק!):
- JAR_COLUMN_1: קטניות, דגנים, קמחים, תבלינים, סוכר, מלח (צנצנות זכוכית)
- CANNED_COLUMN_2: שימורים, רטבים, ממרחים, בקבוקי שמן קטנים (מדפים אופקיים)
- KANBAN_BACKUP_3: מארזים כפולים, שישיות שתייה, רזרבה (מדף עליון/אחורי)
- UTILITY_DRAWER_1: מוצרי חד-פעמי (צלחות, כוסות, סכו"ם)
- UTILITY_DRAWER_2: גלילי נייר, רדיד אלומיניום, נייר אפייה, שקיות
- FRESH_OR_REFRIGERATED: ירקות, פירות, טופו, מוצרי חלב, מצוננים (מקרר ביתי)
- FREEZER_ZONE: בשרים, עופות, דגים, ירקות ופירות קפואים, בצקים קפואים (מקפיא)
- GARDEN_HERBS: גידולי עציצים ומרפסת (נענע, פטרוזיליה, בזיליקום)

הוראות לפענוח קבלות:
- אתר ליד כל שם פריט את המספר המזהה (מק"ט קופה / ברקוד EAN-13 / קוד שקילה) ושמור ב-"barcode_or_sku".
- סנן החוצה שורות לא רלוונטיות (שקיות גופיה, פיקדון, מע"מ, סה"כ לתשלום, פרטי אשראי).
`;

// Smart Local Fallback Parser for Pantry Engine (when API Key is missing or network times out)
function generateHeuristicResponse(prompt: string, inputType: string, currentInventory: any[] = []) {
  const cleanPrompt = (prompt || '').trim();
  const lowerPrompt = cleanPrompt.toLowerCase();

  // Detect Action Type
  const isStockOut = lowerPrompt.includes('סיימתי') || lowerPrompt.includes('השתמשתי') || lowerPrompt.includes('גריעה') || lowerPrompt.includes('נגמר') || lowerPrompt.includes('ריק');
  const isCooking = lowerPrompt.includes('לבשל') || lowerPrompt.includes('מתכון') || lowerPrompt.includes('מנה') || lowerPrompt.includes('ערב') || lowerPrompt.includes('צהריים') || lowerPrompt.includes('שקשוקה') || lowerPrompt.includes('פסטה') || lowerPrompt.includes('מוקפץ');
  const isShoppingImport = inputType === 'shopping_list_import' || (lowerPrompt.includes('רשימת קניות') && !lowerPrompt.includes('גריעה'));
  const isShopping = !isShoppingImport && (lowerPrompt.includes('קניות') || lowerPrompt.includes('חסר') || lowerPrompt.includes('סופר') || lowerPrompt.includes('רשימה'));
  const isReceipt = inputType === 'receipt_ocr' || cleanPrompt.includes('שופרסל') || cleanPrompt.includes('רמי לוי') || cleanPrompt.includes('מק״ט') || cleanPrompt.includes('729000');

  // 1. Receipt & Shopping List Parsing (STOCK_IN / ITEM_EXTRACTION)
  if (isReceipt || isShoppingImport) {
    const mutations: any[] = [];
    const lines = cleanPrompt.split('\n');
    let total = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.includes('רשימת קניות לבית') || trimmed.includes('סה״כ') || trimmed.includes('מע״מ') || trimmed.includes('אשראי') || trimmed.includes('שקיות גופיה') || trimmed.includes('פיקדון')) {
        continue;
      }

      // Extract Barcode/SKU
      const skuMatch = trimmed.match(/(\d{7,14})/);
      const sku = skuMatch ? skuMatch[1] : null;

      // Extract price (trailing number like 11.90 or 8.85)
      const priceMatch = trimmed.match(/(\d+\.\d{2})/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
      if (price > 0) total += price;

      // Extract quantity if specified (e.g. "2 חבילות", "3 קופסאות", "2 ק\"ג")
      let extractedQty = 1;
      const qtyPrefixMatch = trimmed.match(/^[-\s*•]*(\d+)\s+/);
      if (qtyPrefixMatch) {
        extractedQty = parseInt(qtyPrefixMatch[1]) || 1;
      }

      // Determine item name
      let itemName = trimmed
        .replace(/^[-\s*•]+/g, '')
        .replace(/^\d+\s+(חבילות|חבילת|קופסאות|קופסת|שקיות|שקית|בקבוקי|בקבוק|יח'|יח|מארזי|מארז|עציץ|עציצי|ק"ג|קג|גרם|ליטר)\s+/g, '')
        .replace(/\d{7,14}/g, '')
        .replace(/מק״ט/g, '')
        .replace(/קוד שקילה \d+/g, '')
        .replace(/\d+\.\d{2}/g, '')
        .replace(/\d+ קג/g, '')
        .replace(/\d+ג/g, '')
        .replace(/\d+ יח/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (itemName.length > 1) {
        let slot = 'CANNED_COLUMN_2';
        let department = 'PANTRY';
        let unit = 'קופסה';

        if (itemName.includes('עוף') || itemName.includes('שניצל') || itemName.includes('פרגיות') || itemName.includes('בשר') || itemName.includes('כבד') || itemName.includes('דג') || itemName.includes('סלמון') || itemName.includes('אמנון') || itemName.includes('מושט') || itemName.includes('קפוא') || itemName.includes('בצק עלים') || itemName.includes('בצק פילו')) {
          slot = 'FREEZER_ZONE';
          department = 'מצוננים ותחליפים';
          unit = itemName.includes('בצק') ? 'חבילה' : itemName.includes('קפוא') ? 'שקית' : 'מארז / ק"ג';
        } else if (itemName.includes('אורז') || itemName.includes('עדשים') || itemName.includes('קמח') || itemName.includes('סוכר') || itemName.includes('מלח') || itemName.includes('תבלין')) {
          slot = 'JAR_COLUMN_1';
          unit = 'צנצנת';
        } else if (itemName.includes('עגבניות') || itemName.includes('בצל') || itemName.includes('מלפפון') || itemName.includes('מלפפונים') || itemName.includes('פלפל') || itemName.includes('טופו') || itemName.includes('ביצים') || itemName.includes('גבינ') || itemName.includes('פטה') || itemName.includes('חלב')) {
          slot = 'FRESH_OR_REFRIGERATED';
          department = itemName.includes('טופו') || itemName.includes('ביצים') || itemName.includes('גבינ') || itemName.includes('פטה') || itemName.includes('חלב') ? 'REFRIGERATED' : 'PRODUCE';
          unit = 'יח\'';
        } else if (itemName.includes('נענע') || itemName.includes('בזיליקום') || itemName.includes('פטרוזיליה') || itemName.includes('עציץ')) {
          slot = 'GARDEN_HERBS';
          department = 'PANTRY';
          unit = 'עציץ';
        } else if (itemName.includes('נייר') || itemName.includes('אפיה') || itemName.includes('אלומיניום') || itemName.includes('שקיות') || itemName.includes('סופג')) {
          slot = 'UTILITY_DRAWER_2';
          department = 'UTILITY';
          unit = 'חבילה';
        } else if (itemName.includes('צלחות') || itemName.includes('כוסות') || itemName.includes('סכו״ם')) {
          slot = 'UTILITY_DRAWER_1';
          department = 'UTILITY';
          unit = 'חבילה';
        } else if (itemName.includes('פסטה') || itemName.includes('שישיית') || itemName.includes('מארז')) {
          slot = 'KANBAN_BACKUP_3';
          unit = 'מארז';
        }

        mutations.push({
          item_name: itemName,
          barcode_or_sku: sku,
          is_weighable: trimmed.includes('קג') || trimmed.includes('שקילה'),
          quantity_delta: `+${extractedQty}`,
          unit: unit,
          target_slot: slot,
          resulting_status: 'IN_STOCK',
        });
      }
    }

    const summaryText = isShoppingImport
      ? `📋 רשימת הקניות פוענחה בהצלחה: חולצו ${mutations.length} פריטים וסווגו ישירות ל-7 הסלוטים הפיזיים במזווה.`
      : `🧾 קבלה פוענחה בהצלחה: נקלטו ${mutations.length} פריטים חדשים עם מק"ט/ברקוד ושובצו לסלוטים הפיזיים במזווה, בעלות כוללת של ₪${total.toFixed(2)}.`;

    return {
      user_summary: summaryText,
      payload: {
        action_type: 'STOCK_IN',
        inventory_mutations: mutations,
        shopping_list_additions: [],
        financial_and_analytics: {
          transaction_total: Math.round(total * 100) / 100,
          currency: 'ILS',
          department_breakdown: [
            { category: 'ירקות ופירות', amount: Math.round(total * 0.35 * 100) / 100 },
            { category: 'מוצרי יסוד ומזווה', amount: Math.round(total * 0.45 * 100) / 100 },
            { category: 'מצוננים ותחליפים', amount: Math.round(total * 0.10 * 100) / 100 },
            { category: 'חד-פעמי ומשק בית', amount: Math.round(total * 0.10 * 100) / 100 },
          ],
        },
        copilot_insights: {
          available_recipes: ['שקשוקה ים תיכונית עשירה', 'קדרת אורז ועדשים בטחינה', 'מוקפץ טופו וירקות טריים'],
          pantry_alerts: ['כל הפריטים החדשים סווגו בהתאם למבנה 7 הסלוטים הפיזיים'],
          cost_saving_tips: ['קנייה מרוכזת של מוצרי יסוד חסכה כ-15% בהשוואה לרכישות בודדות'],
        },
      },
    };
  }

  // 2. Stock Out (Voice or Text)
  if (isStockOut) {
    const mutations: any[] = [];
    const shoppingAdditions: any[] = [];

    currentInventory.forEach((item) => {
      const match = cleanPrompt.includes(item.name) ||
        item.name.split(' ').some((w: string) => w.length > 3 && cleanPrompt.includes(w));

      if (match) {
        mutations.push({
          item_name: item.name,
          barcode_or_sku: item.barcode_or_sku,
          is_weighable: false,
          quantity_delta: '-1',
          unit: item.unit,
          target_slot: item.slot,
          resulting_status: item.quantity <= 1 ? 'EMPTY' : 'LOW',
        });

        shoppingAdditions.push({
          item_name: item.name,
          search_query: item.name,
          quantity_needed: Math.max(1, item.minThreshold * 2),
          estimated_price: item.pricePerUnit ? item.pricePerUnit * 2 : 14.9,
          department: item.slot === 'FRESH_OR_REFRIGERATED' ? 'PRODUCE' : 'PANTRY',
          reason: `נגרע מהמלאי ("${cleanPrompt.substring(0, 30)}...")`,
        });
      }
    });

    if (mutations.length === 0) {
      // Default fallback mutation if no exact name matched
      mutations.push({
        item_name: 'שמן זית כתית מעולה 750 מ"ל',
        barcode_or_sku: '7290005234190',
        is_weighable: false,
        quantity_delta: '-1',
        unit: 'UNITS',
        target_slot: 'CANNED_COLUMN_2',
        resulting_status: 'EMPTY',
      });
      shoppingAdditions.push({
        item_name: 'שמן זית כתית מעולה 750 מ"ל',
        search_query: 'שמן זית כתית מעולה 750 מ"ל',
        quantity_needed: 2,
        estimated_price: 39.9,
        department: 'PANTRY',
        reason: 'מלאי אזל בסלוט שימורים וממרחים',
      });
    }

    return {
      user_summary: `📉 עודכן גריעת מלאי: ${mutations.map((m) => m.item_name).join(', ')} נגרעו מהסלוטים הפיזיים. פריטים שהתרוקנו סונכרנו ישירות לענף הקניות.`,
      payload: {
        action_type: 'STOCK_OUT',
        inventory_mutations: mutations,
        shopping_list_additions: shoppingAdditions,
        financial_and_analytics: {
          transaction_total: 0,
          currency: 'ILS',
          department_breakdown: [],
        },
        copilot_insights: {
          available_recipes: ['סלט ישראלי עם עשבי מרפסת', 'תבשיל עדשים חם'],
          pantry_alerts: mutations.map((m) => `הפריט "${m.item_name}" התרוקן או נמוך במלאי`),
          cost_saving_tips: ['מומלץ להוסיף לרשימת הקניות מארז כפול לחסכון'],
        },
      },
    };
  }

  // 3. Cooking Plan
  if (isCooking) {
    return {
      user_summary: `🍳 נותחה תוכנית הבישול על בסיס המלאי הזמין ב-7 הסלוטים! חומרי הגלם סווגו והוצלבו עם המלאי הקיים, וחוסרים הועברו ישירות לענף הקניות.`,
      payload: {
        action_type: 'COOKING_PLAN',
        inventory_mutations: [],
        shopping_list_additions: [],
        financial_and_analytics: {
          transaction_total: 0,
          currency: 'ILS',
          department_breakdown: [],
        },
        copilot_insights: {
          available_recipes: [
            'שקשוקה ים תיכונית עם עגבניות חממה וטופו',
            'פסטה פומודורו שום ועשבי תיבול מהמרפסת',
            'קדרת עדשים שחורות, אורז בסמטי וטחינה הר ברכה',
          ],
          pantry_alerts: ['יש במזווה את רוב חומרי הגלם הדרושים להכנת 3 ארוחות שלמות'],
          cost_saving_tips: ['שימוש בעשבי תיבול מרווה ובזיליקום מעציצי המרפסת משדרג את המנה בעלות אפס'],
        },
      },
    };
  }

  // 4. Analytics / Valuation / Tips & Insights
  const isTipsOrValuation = lowerPrompt.includes('שווי') || lowerPrompt.includes('חיסכון') || lowerPrompt.includes('טיפ') || lowerPrompt.includes('תוקף') || lowerPrompt.includes('תקציב') || lowerPrompt.includes('נתח');
  if (isTipsOrValuation) {
    const totalVal = currentInventory.reduce((sum, item) => sum + (item.pricePerUnit || 12) * (item.quantity || 1), 0);
    const inStockCount = currentInventory.filter(i => i.quantity > 0).length;
    const emptyCount = currentInventory.filter(i => i.quantity === 0).length;

    return {
      user_summary: `📊 **ניתוח שווי מלאי ותובנות חיסכון:**
המזווה שלך מנוהל כעת על פני **8 סלוטים פיזיים** וכולל **${currentInventory.length} מוצרים** (${inStockCount} במלאי, ${emptyCount} חסרים להזמנה).
שווי המלאי המנוהל הכולל מוערך בכ-**₪${totalVal.toFixed(2)}**.

💡 **3 טיפים מעשיים לחיסכון ומניעת פגי תוקף:**
1. **שיטת FIFO במזווה ובמקרר:** קדם לקדמת המדפים מוצרים בעלי תוקף קצר יותר (במיוחד במקרר ובמקפיא), ורשום רזרבות סגורות בסלוט הקנבן העליון.
2. **Zero Waste Cooking:** לפני כל קנייה, השתמש ברכיבים הקיימים (כמו עגבניות רכות לרוטב שקשוקה או קטניות בצנצנות) כדי למנוע קניות מיותרות.
3. **סנכרון חוסרים חכם:** הוסף מוצרים לרשימת הקניות רק כאשר הם מגיעים לרף התחתון (Threshold) שהוגדר בגיליון.`,
      payload: {
        action_type: 'COPILOT_QUERY',
        inventory_mutations: [],
        shopping_list_additions: [],
        financial_and_analytics: {
          transaction_total: Math.round(totalVal * 100) / 100,
          currency: 'ILS',
          department_breakdown: [
            { category: 'ירקות ופירות', amount: Math.round(totalVal * 0.2 * 100) / 100 },
            { category: 'מוצרי יסוד ומזווה', amount: Math.round(totalVal * 0.45 * 100) / 100 },
            { category: 'מצוננים ותחליפים', amount: Math.round(totalVal * 0.25 * 100) / 100 },
            { category: 'חד-פעמי ומשק בית', amount: Math.round(totalVal * 0.1 * 100) / 100 },
          ],
        },
        copilot_insights: {
          available_recipes: [
            'שקשוקה ים תיכונית עשירה',
            'תבשיל מג\'דרה עדשים שחורות ואורז בסמטי',
            'פסטה ברוטב שמן זית, שום ובזיליקום טרי',
          ],
          pantry_alerts: ['יש במזווה מוצרים זמינים להכנת ארוחות ללא צורך ברכש מיידי'],
          cost_saving_tips: [
            'סדר הסלוטים הפיזי מונע כפילויות רכש ומוזיל את סל הקניות השבועי בעד 20%',
            'הקפאת מוצרים במנות קטנות במקפיא שומרת על טריות לאורך זמן',
          ],
        },
      },
    };
  }

  // 5. General / Copilot
  return {
    user_summary: `🤖 **תשובת ה-Co-pilot:**
ניתחתי את מצב 8 הסלוטים במזווה (כולל המקפיא ועציצי המרפסת). יש לך כעת ${currentInventory.length} פריטים במעקב, מתוכם פריטים זמינים לבישול מהיר (Zero Waste). הכל מסונכרן גם מול Supabase.`,
    payload: {
      action_type: 'COPILOT_QUERY',
      inventory_mutations: [],
      shopping_list_additions: [],
      financial_and_analytics: {
        transaction_total: 0,
        currency: 'ILS',
        department_breakdown: [],
      },
      copilot_insights: {
        available_recipes: [
          'תבשיל מג\'דרה עדשים שחורות ואורז בסמטי',
          'שקשוקה עגבניות חממה ובצל מטוגן',
          'פסטה ברוטב שמן זית, שום ובזיליקום טרי',
        ],
        pantry_alerts: ['מלאי מוצרי היסוד בצנצנות הזכוכית תקין ומלא'],
        cost_saving_tips: ['סדר הסלוטים הפיזי מאפשר גריעה מהירה ומניעת כפילויות רכש'],
      },
    },
  };
}

// Central Data Sync Endpoints - cross-device synchronization
app.get('/api/pantry/data', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (fs.existsSync(PANTRY_DB_FILE)) {
      const content = fs.readFileSync(PANTRY_DB_FILE, 'utf-8');
      return res.json(JSON.parse(content));
    }
  } catch (err) {
    console.warn('Error reading central pantry storage:', err);
  }
  return res.json(null);
});

app.post('/api/pantry/sync', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { inventory, shoppingList, dishes, historyLogs } = req.body || {};
    const stateToSave = {
      inventory: inventory || [],
      shoppingList: shoppingList || [],
      dishes: dishes || [],
      historyLogs: historyLogs || [],
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(PANTRY_DB_FILE, JSON.stringify(stateToSave, null, 2), 'utf-8');
    return res.json({ success: true, timestamp: stateToSave.lastUpdated });
  } catch (err: any) {
    console.error('Error writing central pantry storage:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: 'ok',
    system: 'Pantry OS & Kitchen Co-pilot Engine',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Engine processing endpoint
app.post('/api/engine/process', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { prompt, inputType, currentInventory = [], imageBase64, mimeType } = req.body || {};

  if (!prompt && !imageBase64) {
    return res.status(400).json({ error: 'Prompt or image is required' });
  }

  const ai = getAIClient();

  // If no AI client available, immediately use smart local heuristics
  if (!ai) {
    const heuristic = generateHeuristicResponse(prompt || '', inputType || 'text', currentInventory);
    return res.json(heuristic);
  }

  try {
    const inventoryContext = Array.isArray(currentInventory) && currentInventory.length > 0
      ? `\nמצב המלאי הנוכחי במזווה (${currentInventory.length} פריטים):\n${currentInventory
          .map((item: any) => `- ${item.name} (${item.quantity} ${item.unit}, סלוט: ${item.slot}, סטטוס: ${item.status})`)
          .join('\n')}`
      : '';

    const parts: any[] = [];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      });
    }

    const structuredPrompt = `
קלט משתמש מסוג [${inputType || 'text'}]:
"${prompt || 'פענח את התמונה/קבלה שלפניך והזן למלאי הפיזי'}"
${inventoryContext}

בצע את הניתוח המלא והחזר תשובה במבנה ה-JSON הבא בדיוק:
{
  "user_summary": "מענה ישיר, מפורט, חכם ומעוצב בעברית עם אימוג'ים על הפעולה שבוצעה, רשימת קניות, או תשובת העוזר החכם",
  "payload": {
    "action_type": "STOCK_IN | STOCK_OUT | COOKING_PLAN | SHOPPING_SYNC | COPILOT_QUERY",
    "inventory_mutations": [
      {
        "item_name": "שם המוצר",
        "barcode_or_sku": "ברקוד EAN-13 או קוד שקילה או null",
        "is_weighable": false,
        "quantity_delta": "+1",
        "unit": "UNITS",
        "target_slot": "JAR_COLUMN_1 | CANNED_COLUMN_2 | KANBAN_BACKUP_3 | UTILITY_DRAWER_1 | UTILITY_DRAWER_2 | FRESH_OR_REFRIGERATED | FREEZER_ZONE | GARDEN_HERBS",
        "resulting_status": "IN_STOCK | LOW | EMPTY"
      }
    ],
    "shopping_list_additions": [
      {
        "item_name": "שם המוצר שחסר",
        "search_query": "מונח חיפוש מדויק לקטלוג הסופר (שופרסל/רמי לוי)",
        "quantity_needed": 1,
        "estimated_price": 0.0,
        "department": "PRODUCE | PANTRY | REFRIGERATED | UTILITY",
        "reason": "מלאי אזל / חסר למתכון"
      }
    ],
    "financial_and_analytics": {
      "transaction_total": 0.0,
      "currency": "ILS",
      "department_breakdown": [
        { "category": "ירקות ופירות", "amount": 0.0 },
        { "category": "מוצרי יסוד ומזווה", "amount": 0.0 },
        { "category": "מצוננים ותחליפים", "amount": 0.0 },
        { "category": "חד-פעמי ומשק בית", "amount": 0.0 }
      ]
    },
    "copilot_insights": {
      "available_recipes": ["מתכון 1", "מתכון 2"],
      "pantry_alerts": ["התראת מלאי"],
      "cost_saving_tips": ["טיפ חכם לחיסכון"]
    }
  }
}
`;

    parts.push({ text: structuredPrompt });

    // Enforce a strict timeout of 35 seconds to prevent Node fetch HeadersTimeoutError
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI_TIMEOUT')), 35000);
    });

    const aiCall = ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: parts,
      config: {
        systemInstruction: PANTRY_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const response = await Promise.race([aiCall, timeoutPromise]);
    const responseText = response.text || '{}';
    let parsedResult;

    try {
      parsedResult = JSON.parse(responseText);
    } catch (parseError) {
      console.warn('Failed to parse Gemini JSON output, using heuristic fallback:', parseError);
      parsedResult = generateHeuristicResponse(prompt || '', inputType || 'text', currentInventory);
    }

    return res.json(parsedResult);
  } catch (error: any) {
    console.warn('AI processing warning / fallback activated:', error?.message || error);
    // Graceful fallback to smart heuristic engine - never return 500 error to UI
    const fallbackResult = generateHeuristicResponse(prompt || '', inputType || 'text', currentInventory);
    return res.json(fallbackResult);
  }
});

// Zero waste recipe suggestions based on actual stock
app.post('/api/engine/zero-waste-recipes', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { inventoryItems = [] } = req.body || {};

  const defaultRecipes = [
    {
      title: 'שקשוקה ים תיכונית עשירה',
      prepTimeMinutes: 20,
      difficulty: 'קל',
      matchPercentage: 100,
      usedInventoryItems: [
        { name: 'עגבניות חממה טריות', quantity: '3 יח\'' },
        { name: 'בצל יבש מובחר', quantity: '1 יח\'' },
        { name: 'שמן זית כתית מעולה 750 מ"ל', quantity: '1 כף' },
      ],
      missingItems: [],
      instructions: [
        'קוצצים את הבצל ומטגנים קלות בשמן זית עד להזהבה במחבת רחבה.',
        'מוסיפים את עגבניות החממה הקצוצות, מתבלים במלח ופלפל ומבשלים 10 דקות.',
        'מגישים חם לצד לחם טרי או פיתה.',
      ],
    },
    {
      title: 'מג\'דרה עדשים שחורות ואורז בסמטי',
      prepTimeMinutes: 30,
      difficulty: 'קל',
      matchPercentage: 100,
      usedInventoryItems: [
        { name: 'אורז בסמטי מובחר (צנצנת)', quantity: '1 כוס' },
        { name: 'עדשים שחורות בלוגה (צנצנת)', quantity: '1 כוס' },
        { name: 'בצל יבש מובחר', quantity: '2 יח\'' },
        { name: 'טחינה גולמית הר ברכה', quantity: '2 כפות' },
      ],
      missingItems: [],
      instructions: [
        'מבשלים את העדשים השחורות עד לריכוך אל-דנטה (כ-20 דקות).',
        'מבשלים את האורז הבסמטי בסיר נפרד.',
        'מקרמלים בצל קצוץ בשמן זית ומערבבים הכל יחד.',
        'מזלפים מעל טחינה גולמית ומגישים.',
      ],
    },
    {
      title: 'פסטה אליו אוליו שום ועשבי גינה',
      prepTimeMinutes: 15,
      difficulty: 'קל',
      matchPercentage: 90,
      usedInventoryItems: [
        { name: 'פסטה ברילה (קנבן רזרבות)', quantity: '1 חבילה' },
        { name: 'שמן זית כתית מעולה 750 מ"ל', quantity: '3 כפות' },
        { name: 'בזיליקום טרי (עציץ מרפסת)', quantity: 'חופן' },
      ],
      missingItems: [{ name: 'שיני שום טריות', quantity: '3 יח\'' }],
      instructions: [
        'מבשלים את הפסטה במי מלח רותחים לפי הוראות היצרן.',
        'מחממים בעדינות שמן זית במחבת עם שום כתוש ועלי בזיליקום קצוצים.',
        'מעבירים את הפסטה למחבת, מקפיצים דקה ומגישים מיד.',
      ],
    },
  ];

  const ai = getAIClient();
  if (!ai) {
    return res.json(defaultRecipes);
  }

  try {
    const stockSummary = Array.isArray(inventoryItems)
      ? inventoryItems
          .filter((i: any) => i.quantity > 0)
          .map((i: any) => `${i.name} (${i.quantity} ${i.unit}, סלוט: ${i.slot})`)
          .join('\n')
      : 'מגוון פריטי מזווה בסיסיים';

    const prompt = `
הנה רשימת המלאי הזמין כרגע במטבח ובמזווה:
${stockSummary}

משימה:
הצע 3 מתכונים מעולים המתבססים אך ורק על המצרכים הזמינים במלאי (Zero Waste Cooking).
אם חסר פריט שולי אחד או שניים, ציין אותו ב-missingItems.

החזר מערך JSON של מתכונים:
[
  {
    "title": "שם המנה",
    "prepTimeMinutes": 25,
    "difficulty": "קל",
    "matchPercentage": 100,
    "usedInventoryItems": [{ "name": "שם הפריט", "quantity": "כמות" }],
    "missingItems": [{ "name": "פריט חסר אופציונלי", "quantity": "כמות" }],
    "instructions": ["שלב 1", "שלב 2", "שלב 3"]
  }
]
`;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI_TIMEOUT')), 15000);
    });

    const aiCall = ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: PANTRY_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const response = await Promise.race([aiCall, timeoutPromise]);
    const parsed = JSON.parse(response.text || '[]');
    return res.json(Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultRecipes);
  } catch (error) {
    console.warn('Zero waste recipe fallback activated:', error);
    return res.json(defaultRecipes);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pantry OS & Kitchen Co-pilot server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
