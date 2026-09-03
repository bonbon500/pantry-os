import React, { useState } from 'react';
import { usePantry } from '../context/PantryContext';
import {
  Terminal,
  Copy,
  Check,
  X,
  Play,
  Sparkles,
  ArrowRight,
  Code2,
  FileJson,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const EnginePayloadInspector: React.FC = () => {
  const { lastEngineResponse, isInspectorOpen, setIsInspectorOpen, executeEngineCommand, isProcessing } =
    usePantry();

  const [copied, setCopied] = useState(false);
  const [testPrompt, setTestPrompt] = useState('');

  if (!isInspectorOpen) return null;

  const presets = [
    {
      label: 'STOCK_IN: קליטת קבלת סופר שופרסל (8 פריטים)',
      prompt: `פעולת STOCK_IN מקבלה:
7290000104821 אורז בסמטי 1 קג 11.90 (סלוט צנצנות 1)
7290008432190 טחינה הר ברכה 500ג 18.90 (מדף שימורים 2)
8005110000104 עגבניות מרוסקות מוטי 2 יח 15.80 (מדף שימורים 2)
קוד שקילה 4011 עגבניות חממה 1.2 קג 9.48 (מקרר)
7290003049182 נייר אפיה טבעי 11.90 (מגירת שירות 2)`,
    },
    {
      label: 'STOCK_OUT: הודעה קולית "סיימתי את השמן זית וחבילת פסטה"',
      prompt: 'פעולת STOCK_OUT: סיימתי את בקבוק השמן זית בסלוט CANNED_COLUMN_2 והשתמשתי בחבילת פסטה ברילה מ-KANBAN_BACKUP_3',
    },
    {
      label: 'COOKING_PLAN: תכנון שקשוקה וגריעת רכיבים',
      prompt: 'פעולת COOKING_PLAN: מכין שקשוקה ל-4 סועדים עם 2 פחיות עגבניות מרוסקות מוטי, 4 ביצים, בצל ופפריקה מעושנת',
    },
    {
      label: 'SHOPPING_SYNC: סנכרון חוסרים לקטלוג הסופר',
      prompt: 'פעולת SHOPPING_SYNC: סנכרן את רשימת כל הפריטים שאזלו מהמזווה והפק שאילתות חיפוש מדויקות לשופרסל/רמי לוי',
    },
    {
      label: 'COPILOT_QUERY: שאלת Zero-Waste והצעת מתכון',
      prompt: 'פעולת COPILOT_QUERY: מה אפשר להכין עם אורז בסמטי, עדשים שחורות וטחינה שיש כרגע במזווה?',
    },
  ];

  const handleCopyJSON = () => {
    if (!lastEngineResponse) return;
    const formatted = JSON.stringify(lastEngineResponse.payload, null, 2);
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunPreset = (p: string) => {
    setTestPrompt(p);
    executeEngineCommand(p, 'preset_test');
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-full md:w-[620px] bg-zinc-900 text-zinc-100 shadow-2xl border-r border-zinc-800 flex flex-col transition-all">
      {/* Top Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Live Engine Inspector</h3>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Pantry OS v1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              פלט מבנה הנתונים המחייב: User Summary + Payload JSON
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyJSON}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1 transition-colors"
            title="העתק JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">העתק JSON</span>
          </button>
          <button
            onClick={() => setIsInspectorOpen(false)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Simulator Presets */}
      <div className="p-3 bg-zinc-950/80 border-b border-zinc-800 text-xs">
        <div className="font-semibold text-[11px] text-zinc-400 mb-1.5 flex items-center gap-1">
          <Play className="w-3 h-3 text-emerald-400" />
          <span>הרצת תרחישי מנוע מהירים (Presets):</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {presets.map((pr, idx) => (
            <button
              key={idx}
              onClick={() => handleRunPreset(pr.prompt)}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-700 text-zinc-300 border border-zinc-700 whitespace-nowrap text-[11px] font-medium transition-colors"
            >
              {pr.label.split(':')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
        {/* 1. Direct User Summary Block */}
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 space-y-2">
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
            <span>💬 מענה ישיר / סיכום פעולה (User Summary):</span>
          </div>
          <div className="text-zinc-200 text-sm leading-relaxed whitespace-pre-line">
            {lastEngineResponse?.user_summary || 'אין פלט עדיין. הרץ פקודה או תנועת מלאי לצפייה.'}
          </div>
        </div>

        {/* 2. Structured JSON Payload Block */}
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              <span>📊 Payload נתונים מובנה למערכת (JSON):</span>
            </div>
            {lastEngineResponse?.payload?.action_type && (
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ACTION: {lastEngineResponse.payload.action_type}
              </span>
            )}
          </div>

          <pre className="font-mono text-[11px] text-emerald-300/90 bg-zinc-900/90 p-3 rounded-lg overflow-x-auto leading-relaxed border border-zinc-800/80">
            {lastEngineResponse?.payload
              ? JSON.stringify(lastEngineResponse.payload, null, 2)
              : '// מחכה לקריאה מהמנוע...'}
          </pre>
        </div>

        {/* Manual Test Prompt Input */}
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-zinc-400">
            הרצת פקודת מנוע חופשית (Live Engine Execution):
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="הקלד פקודה לבדיקה במנוע..."
              className="flex-1 px-3 py-1.5 text-xs bg-zinc-850 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => testPrompt.trim() && executeEngineCommand(testPrompt, 'manual_test')}
              disabled={!testPrompt.trim() || isProcessing}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              <span>הרץ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
