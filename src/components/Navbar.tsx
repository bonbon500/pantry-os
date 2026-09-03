import React from 'react';
import { usePantry } from '../context/PantryContext';
import {
  Boxes,
  CookingPot,
  ShoppingCart,
  BarChart3,
  Bot,
  Terminal,
  PlusCircle,
  Sparkles,
  RefreshCw,
  Search,
  LogIn,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  Download,
  Smartphone,
  Share2,
  X,
} from 'lucide-react';

interface NavbarProps {
  onOpenStockModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenStockModal }) => {
  const {
    activeTab,
    setActiveTab,
    isInspectorOpen,
    setIsInspectorOpen,
    isProcessing,
    inventory,
    shoppingList,
    searchQuery,
    setSearchQuery,
    supabaseSyncState,
    triggerSupabaseSync,
    currentUser,
    setIsAuthModalOpen,
    handleSignOut,
    resetToDefaults,
  } = usePantry();

  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallHelp, setShowInstallHelp] = React.useState(false);

  React.useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallHelp(true);
    }
  };

  const emptyItemsCount = inventory.filter((i) => i.status === 'EMPTY').length;
  const lowItemsCount = inventory.filter((i) => i.status === 'LOW').length;
  const totalShoppingCount = shoppingList.filter((i) => !i.isPurchased).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight">
                  Pantry OS
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Supabase Cloud
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                מערכת ניהול מזווה חכם, תנועות מלאי, בישול וקניות
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="hidden md:flex items-center relative max-w-xs w-full mx-4">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 pointer-events-none" />
            <input
              type="text"
              placeholder="חיפוש פריט, ברקוד או סלוט..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          {/* Action Buttons & User Section */}
          <div className="flex items-center gap-2">
            {/* Supabase Sync Button */}
            <button
              onClick={() => triggerSupabaseSync()}
              id="btn-supabase-sync"
              title={`Supabase Endpoint: https://azcvaybfajjvelwrpagu.supabase.co\nמשתמש: ${currentUser?.email || 'מצב מקומי'}\nסנכרון אחרון: ${supabaseSyncState.lastSyncedAt || 'בתהליך'}`}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg border bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/50 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  supabaseSyncState.syncStatus === 'syncing'
                    ? 'bg-amber-500 animate-spin'
                    : supabaseSyncState.isConnected
                    ? 'bg-emerald-500'
                    : 'bg-zinc-400'
                }`}
              />
              <span>Supabase DB</span>
              {supabaseSyncState.syncStatus === 'syncing' ? (
                <span className="text-[10px] text-amber-500">מסנכרן...</span>
              ) : (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {currentUser ? 'חי' : 'מחובר'}
                </span>
              )}
            </button>

            {/* Auth / User Profile Display */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-1 pr-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl shadow-xs">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 max-w-[140px] truncate" title={currentUser.email || ''}>
                    {currentUser.email}
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>מחובר לענן</span>
                  </span>
                </div>
                <div className="h-5 w-px bg-emerald-200 dark:bg-emerald-800/80 mx-0.5" />
                <button
                  onClick={handleSignOut}
                  id="btn-signout"
                  title="התנתקות מהמערכת ומסד הנתונים"
                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-zinc-600 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">התנתק</span>
                </button>
              </div>
            )}

            {/* Install App Button (PWA) */}
            <button
              onClick={handleInstallClick}
              id="btn-install-pwa"
              title="הוסף למסך הבית כאפליקציה"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-lg transition-all shadow-2xs"
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">התקן למסך הבית</span>
              <span className="sm:hidden">התקן</span>
            </button>

            {/* New Stock Movement / Receipt Button */}
            <button
              onClick={onOpenStockModal}
              id="btn-stock-movement"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg transition-all shadow-sm shadow-emerald-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">תנועת מלאי / קבלה</span>
              <span className="sm:hidden">מלאי</span>
            </button>

            {/* Inspector Toggle */}
            <button
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              id="btn-toggle-inspector"
              title="מנוע ה-OS ו-JSON Payload"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                isInspectorOpen
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
              }`}
            >
              <Terminal className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">מנוע OS</span>
              {isProcessing && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </button>

            {/* Reset Demo Button */}
            <button
              onClick={resetToDefaults}
              id="btn-reset-defaults"
              title="איפוס נתוני הדגמה"
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5-Branch Navigation Tabs */}
        <nav className="flex items-center gap-1 pb-3 overflow-x-auto no-scrollbar border-t border-zinc-100 dark:border-zinc-800/80 pt-2.5">
          <button
            onClick={() => setActiveTab('pantry')}
            id="tab-pantry"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'pantry'
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>1. ענף המלאי (סלוטים פיזיים)</span>
            {(emptyItemsCount > 0 || lowItemsCount > 0) && (
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono">
                {emptyItemsCount + lowItemsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('cooking')}
            id="tab-cooking"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'cooking'
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <CookingPot className="w-4 h-4" />
            <span>2. ענף הבישול (Zero Waste)</span>
          </button>

          <button
            onClick={() => setActiveTab('shopping')}
            id="tab-shopping"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'shopping'
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>3. ענף הקניות וסל חוסרים</span>
            {totalShoppingCount > 0 && (
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-300 font-mono">
                {totalShoppingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            id="tab-analytics"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'analytics'
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>4. BI, כלכלה וחיזוי התרוקנות</span>
          </button>

          <button
            onClick={() => setActiveTab('copilot')}
            id="tab-copilot"
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'copilot'
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>5. עוזר מטבח אישי (Co-pilot)</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </button>
        </nav>
      </div>

      {/* PWA Install Instructions Modal */}
      {showInstallHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-700">
              <button
                onClick={() => setShowInstallHelp(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  הוספת Pantry OS למסך הבית
                </h3>
                <img
                  src="/icon-192.png"
                  alt="App Icon"
                  className="w-8 h-8 rounded-lg shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-1">
                <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>במכשירי Android / מחשב (Chrome, Edge):</span>
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  לחץ על תפריט 3 הנקודות (⋮) בפינת הדפדפן ובחר <strong>"התקן אפליקציה"</strong> או <strong>"הוסף למסך הבית"</strong>.
                </p>
              </div>

              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 rounded-xl space-y-1">
                <p className="font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4" />
                  <span>באייפון / אייפד (Safari):</span>
                </p>
                <ol className="text-xs text-zinc-600 dark:text-zinc-300 list-decimal list-inside space-y-1">
                  <li>לחץ על כפתור השיתוף בתחתית המסך (ריבוע עם חץ למעלה ⎋)</li>
                  <li>גלול למטה ולחץ על <strong>"הוסף למסך הבית" (Add to Home Screen ➕)</strong></li>
                  <li>לחץ על <strong>"הוסף" (Add)</strong> בפינה העליונה</li>
                </ol>
              </div>

              <p className="text-xs text-zinc-500 text-center pt-1">
                האפליקציה תותקן עם האייקון המעוצב ותיפתח במסך מלא בדיוק כמו אפליקציה מהחנות!
              </p>
            </div>

            <button
              onClick={() => setShowInstallHelp(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              הבנתי, תודה!
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
