import React, { useState, useRef } from 'react';
import { usePantry } from '../context/PantryContext';
import { PHYSICAL_SLOTS } from '../data/slotDefinitions';
import { SlotType } from '../types';
import {
  X,
  Upload,
  Camera,
  Mic,
  MicOff,
  FileText,
  Sparkles,
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({ isOpen, onClose }) => {
  const { executeEngineCommand, isProcessing } = usePantry();

  const [mode, setMode] = useState<'RECEIPT_OCR' | 'VOICE_TEXT' | 'MANUAL_QUICK'>('RECEIPT_OCR');
  const [movementType, setMovementType] = useState<'STOCK_IN' | 'STOCK_OUT'>('STOCK_IN');
  const [textInput, setTextInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  if (!isOpen) return null;

  // Preset receipt texts for fast testing
  const sampleReceipts = [
    {
      title: 'קבלת סופר שופרסל (רכישה שבועית - STOCK_IN)',
      text: `שופרסל דיל סניף גבעתיים
תאריך: 24/08/2026
7290000104821 אורז בסמטי 1 קג 11.90
7290008432190 טחינה הר ברכה 500ג 18.90
8005110000104 עגבניות מרוסקות מוטי 7.90
8005110000104 עגבניות מרוסקות מוטי 7.90
קוד שקילה 4011 עגבניות חממה 1.2 קג 9.48
קוד שקילה 4022 בצל יבש 1.5 קג 8.85
7290001092837 גלילי נייר ניקול 19.90
7290003049182 נייר אפיה טבעי 11.90
שקיות גופיה 4 יח 0.40
מע״מ 17% כלול
סה״כ לתשלום: 87.13 ש״ח
אשראי ****1234`,
    },
    {
      title: 'קבלת רמי לוי (מזווה יבש ושימורים - STOCK_IN)',
      text: `רמי לוי שיווק השקמה
מק״ט 7290004128911 עדשים שחורות בלוגה 1 קג 14.50
מק״ט 7290005234190 שמן זית כתית מעולה 750 מ"ל 39.90
מק״ט 7290012938471 טופו קשה קדיתא 13.90
מק״ט 7290001928123 תבנית ביצים 12 16.50
פיקדון בקבוקים 2.40
סה״כ: 87.20 ש״ח`,
    },
  ];

  const sampleVoiceCommands = [
    {
      type: 'STOCK_OUT',
      title: 'גריעת מזווה: "סיימתי את השמן זית וקופסת עגבניות"',
      text: 'סיימתי את בקבוק השמן זית בסלוט השימורים והשתמשתי ב-2 קופסאות של עגבניות מרוסקות מוטי',
    },
    {
      type: 'STOCK_OUT',
      title: 'גריעת מקרר: "השתמשתי בבצל ובחבילת טופו למוקפץ"',
      text: 'השתמשתי ב-2 יח\' בצל ובחבילת טופו אחת מהמקרר',
    },
    {
      type: 'STOCK_IN',
      title: 'כניסת מלאי: "קניתי 2 צנצנות טחינה ו-2 שקיות אורז"',
      text: 'קניתי עכשיו 2 צנצנות של טחינה גולמית הר ברכה ו-2 שקיות אורז בסמטי לצנצנות עמודה 1',
    },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setFeedbackMessage('זיהוי דיבור בדפדפן אינו נתמך במכשיר זה. ניתן להקליד טקסט חופשי.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'he-IL';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setFeedbackMessage('מקשיב כעת... דבר בעברית (למשל: "סיימתי את הטחינה")');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setTextInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event);
      setIsRecording(false);
      setFeedbackMessage('אירעה שגיאה בקליטת הקול, נסה שוב או הקלד ידנית');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSubmit = async () => {
    if (!textInput.trim() && !imageBase64) return;

    setFeedbackMessage(null);
    const promptToSend = textInput.trim()
      ? `פעולת ${movementType}: ${textInput}`
      : `פענוח קבלה ותנועת ${movementType}`;

    const res = await executeEngineCommand(
      promptToSend,
      mode === 'RECEIPT_OCR' ? 'receipt_ocr' : 'voice_transcript',
      imageBase64 || undefined
    );

    if (res) {
      onClose();
    } else {
      setFeedbackMessage('שגיאה בעיבוד הפקודה במנוע. נסה שוב.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                קליטת תנועת מלאי (Pantry Engine)
              </h3>
              <p className="text-xs text-zinc-500">
                פענוח קבלות, הקלטה קולית, סריקת ברקודים וגריעת מוצרים
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Movement Direction Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setMovementType('STOCK_IN')}
              id="btn-modal-stock-in"
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                movementType === 'STOCK_IN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>כניסת מלאי (STOCK_IN) - רכישות וקבלות</span>
            </button>
            <button
              onClick={() => setMovementType('STOCK_OUT')}
              id="btn-modal-stock-out"
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                movementType === 'STOCK_OUT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>יציאת מלאי (STOCK_OUT) - סיום וצריכה</span>
            </button>
          </div>

          {/* Input Method Selector */}
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <button
              onClick={() => setMode('RECEIPT_OCR')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                mode === 'RECEIPT_OCR'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>פענוח קבלה / תמונה</span>
            </button>
            <button
              onClick={() => setMode('VOICE_TEXT')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                mode === 'VOICE_TEXT'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>הודעה קולית / טקסט חופשי</span>
            </button>
          </div>

          {/* OCR / Image Upload Mode */}
          {mode === 'RECEIPT_OCR' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-800/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                  {imageFileName ? `קובץ נבחר: ${imageFileName}` : 'העלה תמונת קבלה מסופר (PDF/JPG/PNG)'}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  המנוע יחלץ אוטומטית ברקודים EAN-13, קודי שקילה, מחירים וישייך לסלוטים הפיזיים
                </p>
              </div>

              {/* Sample Receipts Quick Fill */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>או השתמש בקבלת סופר לדוגמה:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sampleReceipts.map((sr, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTextInput(sr.text);
                        setImageBase64(null);
                        setImageFileName(null);
                      }}
                      className="text-right p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs transition-colors"
                    >
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">{sr.title}</div>
                      <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{sr.text.split('\n')[2]}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Voice / Text Mode */}
          {mode === 'VOICE_TEXT' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  תמלול דיבור או פירוט תנועת המלאי:
                </label>
                <button
                  onClick={handleVoiceRecording}
                  id="btn-mic-toggle"
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isRecording ? 'עצור הקלטה' : 'הקלטה קולית חיה'}</span>
                </button>
              </div>

              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="למשל: 'סיימתי את השמן זית במדף השימורים והשתמשתי ב-2 קופסאות עגבניות מרוסקות' או 'קניתי 2 ק״ג אורז בסמטי לצנצנות עמודה 1'..."
                rows={4}
                className="w-full p-3 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
              />

              {/* Sample Voice Presets */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-zinc-500">פקודות מהירות לדוגמה:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sampleVoiceCommands.map((svc, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTextInput(svc.text);
                        setMovementType(svc.type as any);
                      }}
                      className="text-right p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs transition-colors"
                    >
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">{svc.title}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {feedbackMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              {feedbackMessage}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/50 flex items-center justify-between">
          <button
            onClick={() => {
              setTextInput('');
              setImageBase64(null);
              setImageFileName(null);
            }}
            className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>נקה הכל</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300"
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing || (!textInput.trim() && !imageBase64)}
              id="btn-submit-stock-movement"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>מעבד במנוע המזווה...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>הפעל תנועה ועדכן מלאי</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
