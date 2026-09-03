import React, { useState, useRef, useEffect } from 'react';
import { usePantry } from '../context/PantryContext';
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Sparkles,
  User,
  CheckCircle2,
  Terminal,
  Loader2,
  HelpCircle,
  Flame,
  ShoppingCart,
  Lightbulb,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  actionType?: string;
  payloadSummary?: any;
}

export const CopilotView: React.FC = () => {
  const { executeEngineCommand, isProcessing, setIsInspectorOpen, setActiveTab } = usePantry();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'copilot',
      text: `👋 שלום! אני ה-Kitchen Co-pilot שלך.
אני מחובר ישירות לכל 7 הסלוטים במזווה, בעציצי המרפסת ובמקרר. 
אפשר לבקש ממני להכניס/לגרוע מלאי, להציע מתכונים מבוססי מצאי קיים בלבד (Zero Waste), לסנכרן חוסרים לקניות, או להציע חלופות רכיבים ותובנות תקציביות. במה אפשר לעזור?`,
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const quickPrompts = [
    {
      label: '🍳 מה לבשל עכשיו מהמלאי? (Zero Waste)',
      prompt: 'מה אפשר להכין עכשיו לארוחת ערב מהירה על בסיס המצרכים שיש במזווה ובמקרר בלבד?',
    },
    {
      label: '📉 גריעת שימוש: סיימתי שמן זית ופסטה',
      prompt: 'סיימתי את השמן זית במדף השימורים והשתמשתי בחבילת פסטה ברילה מקנבן הרזרבות',
    },
    {
      label: '🛒 מה חסר לקניות השבוע?',
      prompt: 'תן לי רשימת חוסרים מרוכזת של כל הפריטים שהתרוקנו או שנמוכים במזווה עם שאילתות מדויקות לסופר',
    },
    {
      label: '🔄 חלופות רכיבים',
      prompt: 'אם חסר לי טחינה או רוטב סויה, באילו חומרי גלם קיימים במזווה אוכל להשתמש במקומם?',
    },
    {
      label: '💡 תובנות חיסכון ותקציב',
      prompt: 'נתח את שווי המלאי הקיים ותן לי 3 טיפים חכמים לחיסכון ומניעת פגי תוקף',
    },
  ];

  const handleSend = async (promptText?: string) => {
    const textToSend = promptText || inputPrompt;
    if (!textToSend.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');

    const res = await executeEngineCommand(textToSend.trim(), 'copilot_query');

    if (res) {
      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'copilot',
        text: res.user_summary,
        actionType: res.payload?.action_type,
        payloadSummary: res.payload,
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } else {
      const errorMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'copilot',
        text: 'מצטער, אירעה תקלה בעיבוד הבקשה במנוע. אנא נסה שוב.',
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleVoiceToggle = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('זיהוי דיבור אינו נתמך בדפדפן זה. ניתן להקליד טקסט חופשי.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'he-IL';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setInputPrompt(transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs flex flex-col h-[750px] overflow-hidden">
      {/* Co-pilot Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-850/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                עוזר מטבח ומזווה אישי (Kitchen Co-pilot)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                פעיל ומסונכרן
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              משיב על פי מצב המלאי העדכני בכל 7 הסלוטים, מייעץ למתכונים ומפעיל תנועות
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsInspectorOpen(true)}
          className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-600" />
          <span>הצג JSON Payload</span>
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="p-2.5 bg-zinc-100/60 dark:bg-zinc-750/40 border-b border-zinc-200 dark:border-zinc-700/80 overflow-x-auto no-scrollbar flex items-center gap-2">
        <span className="text-[11px] font-semibold text-zinc-400 whitespace-nowrap mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          שאלות נפוצות:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.prompt)}
            disabled={isProcessing}
            className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500/40 border border-zinc-200 dark:border-zinc-600 rounded-lg whitespace-nowrap transition-colors shadow-2xs font-medium"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.sender === 'user'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-zinc-100 dark:bg-zinc-750 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>

              {/* Rich Visual Cards for Copilot Responses */}
              {msg.payloadSummary && msg.sender === 'copilot' && (
                <div className="mt-3 space-y-2.5 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-700/60">
                  {/* 1. Suggested Recipes */}
                  {Array.isArray(msg.payloadSummary.copilot_insights?.available_recipes) &&
                    msg.payloadSummary.copilot_insights.available_recipes.length > 0 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                        <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-600" />
                          <span>מתכונים מוצעים על בסיס המלאי הקיים (Zero Waste):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.payloadSummary.copilot_insights.available_recipes.map(
                            (rec: string, i: number) => (
                              <button
                                key={i}
                                onClick={() => setActiveTab('cooking')}
                                className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-amber-500 transition-colors flex items-center gap-1 shadow-2xs"
                              >
                                <span>🍽️ {rec}</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* 2. Inventory Mutations */}
                  {Array.isArray(msg.payloadSummary.inventory_mutations) &&
                    msg.payloadSummary.inventory_mutations.length > 0 && (
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-1.5">
                        <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                          📦 פריטים שעודכנו במזווה:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {msg.payloadSummary.inventory_mutations.map((mut: any, i: number) => (
                            <div
                              key={i}
                              className="p-2 bg-white dark:bg-zinc-750 border border-zinc-200 dark:border-zinc-600/80 rounded-lg flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="font-bold truncate">{mut.item_name}</span>
                              <span
                                className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                  mut.quantity_delta.startsWith('+')
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                }`}
                              >
                                {mut.quantity_delta}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* 3. Shopping List Additions */}
                  {Array.isArray(msg.payloadSummary.shopping_list_additions) &&
                    msg.payloadSummary.shopping_list_additions.length > 0 && (
                      <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl space-y-1.5">
                        <div className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <ShoppingCart className="w-3.5 h-3.5 text-sky-600" />
                            <span>נוספו לרשימת הקניות:</span>
                          </span>
                          <button
                            onClick={() => setActiveTab('shopping')}
                            className="text-[11px] text-sky-600 font-bold hover:underline"
                          >
                            עבור לסל הקניות &larr;
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.payloadSummary.shopping_list_additions.map((shop: any, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-sky-300 dark:border-sky-700 rounded-md text-xs font-medium text-sky-900 dark:text-sky-200"
                            >
                              🛒 {shop.item_name} (x{shop.quantity_needed})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* 4. Cost Saving Tips */}
                  {Array.isArray(msg.payloadSummary.copilot_insights?.cost_saving_tips) &&
                    msg.payloadSummary.copilot_insights.cost_saving_tips.length > 0 && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{msg.payloadSummary.copilot_insights.cost_saving_tips[0]}</span>
                      </div>
                    )}
                </div>
              )}

              {msg.actionType && (
                <div className="mt-3 pt-2.5 border-t border-zinc-200/50 dark:border-zinc-600/50 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    פעולה שבוצעה: {msg.actionType}
                  </span>
                  <button
                    onClick={() => setIsInspectorOpen(true)}
                    className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>צפה ב-Payload</span>
                  </button>
                </div>
              )}

              <div
                className={`text-[10px] mt-1 text-left ${
                  msg.sender === 'user' ? 'text-emerald-100' : 'text-zinc-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-750 p-4 rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-700 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>מנוע ה-Co-pilot מנתח את כלל הסלוטים ומפיק מענה מדויק...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={handleVoiceToggle}
            id="btn-copilot-mic"
            className={`p-2.5 rounded-xl border transition-colors ${
              isRecording
                ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-600'
            }`}
            title={isRecording ? 'עצור הקלטה' : 'דיבור בקול בעברית'}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="שאל כל שאלה או תן פקודת מלאי (למשל: 'סיימתי את השמן', 'מה לבשל עם האורז והטופו?')..."
            className="flex-1 p-2.5 text-sm bg-zinc-50 dark:bg-zinc-750 border border-zinc-200 dark:border-zinc-600 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isProcessing}
            id="btn-copilot-send"
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white disabled:opacity-40 transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
