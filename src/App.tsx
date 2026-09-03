import React, { useState } from 'react';
import { PantryProvider, usePantry } from './context/PantryContext';
import { Navbar } from './components/Navbar';
import { PhysicalRackView } from './components/PhysicalRackView';
import { CookingBranchView } from './components/CookingBranchView';
import { ShoppingBranchView } from './components/ShoppingBranchView';
import { AnalyticsBranchView } from './components/AnalyticsBranchView';
import { CopilotView } from './components/CopilotView';
import { StockMovementModal } from './components/StockMovementModal';
import { EnginePayloadInspector } from './components/EnginePayloadInspector';
import { AuthScreen } from './components/AuthScreen';
import { Boxes } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, isAuthLoading, activeTab } = usePantry();
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  // 1. Initial Auth Loading State
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl relative">
            <Boxes className="w-8 h-8 animate-pulse" />
            <div className="absolute inset-0 border-2 border-emerald-500/40 border-t-emerald-400 rounded-3xl animate-spin" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-white tracking-tight">Pantry OS</h2>
            <p className="text-xs text-zinc-400 mt-1 font-mono">מאמת סשן מול Supabase Auth...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Auth Guard: Unauthenticated users are presented solely with the Auth Screen
  if (!currentUser) {
    return <AuthScreen />;
  }

  // 3. Authenticated App Layout
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors" dir="rtl">
      <Navbar onOpenStockModal={() => setIsStockModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'pantry' && (
          <PhysicalRackView onOpenStockModal={() => setIsStockModalOpen(true)} />
        )}
        {activeTab === 'cooking' && <CookingBranchView />}
        {activeTab === 'shopping' && <ShoppingBranchView />}
        {activeTab === 'analytics' && <AnalyticsBranchView />}
        {activeTab === 'copilot' && <CopilotView />}
      </main>

      {/* Modals and Drawers */}
      <StockMovementModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
      />
      <EnginePayloadInspector />
    </div>
  );
};

export default function App() {
  return (
    <PantryProvider>
      <AppContent />
    </PantryProvider>
  );
}
