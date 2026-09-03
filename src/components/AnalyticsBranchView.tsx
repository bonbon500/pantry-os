import React from 'react';
import { usePantry } from '../context/PantryContext';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingDown,
  Sparkles,
  Hourglass,
  DollarSign,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

export const AnalyticsBranchView: React.FC = () => {
  const { inventory, lastEngineResponse, historyLogs } = usePantry();

  // 1. Department expense breakdown calculation
  const departmentTotals: Record<string, number> = {};
  inventory.forEach((item) => {
    const dept = item.department || 'אחר';
    const val = (item.pricePerUnit || 10) * item.quantity;
    departmentTotals[dept] = (departmentTotals[dept] || 0) + val;
  });

  const departmentData = Object.keys(departmentTotals).map((name) => ({
    name,
    value: Math.round(departmentTotals[name] * 10) / 10,
  }));

  // 2. Depletion Velocity calculation
  const depletionItems = inventory
    .filter((item) => item.quantity > 0 && item.dailyUsageRate && item.dailyUsageRate > 0)
    .map((item) => {
      const daysRemaining = Math.round(item.quantity / (item.dailyUsageRate || 0.05));
      return {
        name: item.name,
        slot: item.slot,
        quantity: item.quantity,
        unit: item.unit,
        dailyUsage: item.dailyUsageRate,
        daysRemaining,
        status: item.status,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // 3. Historical transactions breakdown
  const totalValuation = inventory.reduce(
    (sum, item) => sum + (item.pricePerUnit || 0) * item.quantity,
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs">
          <div className="text-xs text-zinc-500 font-medium">שווי מלאי נוכחי מנוהל</div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
            ₪{totalValuation.toFixed(2)}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% נכסים במזווה פיזי ממופה</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs">
          <div className="text-xs text-zinc-500 font-medium">מדד חיסכון וצמצום בזבוז</div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            94%
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Zero Waste Cooking מונע פגי תוקף
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs">
          <div className="text-xs text-zinc-500 font-medium">תנועות מלאי מתועדות</div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">
            {historyLogs.length}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            STOCK_IN, STOCK_OUT ובישולים
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown Chart */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>פילוח שווי הוצאות לפי מחלקות</span>
            </h3>
            <span className="text-xs text-zinc-400">ב-₪ שקלים</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => `₪${val}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Depletion Velocity Prediction Forecast */}
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-amber-500" />
              <span>חיזוי קצב התרוקנות (Depletion Velocity)</span>
            </h3>
            <span className="text-xs text-zinc-400">ימים צפויים עד לסיום</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-60 pr-1">
            {depletionItems.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs">
                אין מספיק נתוני צריכה
              </div>
            ) : (
              depletionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-750/50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-xs text-zinc-900 dark:text-white">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      מלאי: {item.quantity} {item.unit} (קצב: {item.dailyUsage} ליום)
                    </div>
                  </div>

                  <div className="text-left">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        item.daysRemaining <= 5
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : item.daysRemaining <= 12
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      ~{item.daysRemaining} ימים
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* History Log Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 shadow-xs">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-3">
          יומן תנועות ואירועי מזווה אחרונים (Stock Logs)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-750 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 font-semibold">
              <tr>
                <th className="py-2.5 px-3">תאריך ושעה</th>
                <th className="py-2.5 px-3">סוג פעולה</th>
                <th className="py-2.5 px-3">פירוט הפעולה</th>
                <th className="py-2.5 px-3">פריטים שהושפעו</th>
                <th className="py-2.5 px-3">שינוי תקציבי</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-700/50">
              {historyLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-750/30">
                  <td className="py-2.5 px-3 font-mono text-zinc-500">{log.timestamp}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action_type === 'STOCK_IN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action_type === 'STOCK_OUT'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {log.action_type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-800 dark:text-zinc-200 font-medium">
                    {log.summary}
                  </td>
                  <td className="py-2.5 px-3 font-mono">{log.itemsAffected}</td>
                  <td className="py-2.5 px-3 font-mono">
                    {log.totalCostChange ? `₪${log.totalCostChange.toFixed(1)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
