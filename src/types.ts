export type SlotType =
  | 'JAR_COLUMN_1'
  | 'CANNED_COLUMN_2'
  | 'KANBAN_BACKUP_3'
  | 'UTILITY_DRAWER_1'
  | 'UTILITY_DRAWER_2'
  | 'FRESH_OR_REFRIGERATED'
  | 'FREEZER_ZONE'
  | 'GARDEN_HERBS';

export type ItemStatus = 'IN_STOCK' | 'LOW' | 'EMPTY';

export type UnitType = string;

export type DepartmentType = 'ירקות ופירות' | 'מוצרי יסוד ומזווה' | 'מצוננים ותחליפים' | 'חד-פעמי ומשק בית' | 'תבלינים ועשבי תיבול';

export interface PantryItem {
  id: string;
  user_id?: string;
  name: string;
  barcode_or_sku?: string | null;
  slot: SlotType;
  quantity: number; // Packages / units count (integers: 1, 2, 3...)
  minThreshold: number;
  unit: UnitType; // e.g. 'צנצנת', 'קופסה', 'שקית', 'בקבוק', 'יח\'', 'חבילה', 'מארז', 'תבנית', 'עציץ'
  department: DepartmentType;
  isWeighable?: boolean;
  status: ItemStatus;
  expiryDate?: string;
  pricePerUnit?: number;
  lastUpdated: string;
  notes?: string;
  dailyUsageRate?: number;
}

export interface InventoryMutation {
  item_name: string;
  barcode_or_sku: string | null;
  is_weighable: boolean;
  quantity_delta: string; // e.g. "+1", "-2", "-0.5"
  unit: string;
  target_slot: SlotType;
  resulting_status: ItemStatus;
}

export interface ShoppingListItem {
  id: string;
  user_id?: string;
  item_name: string;
  search_query: string;
  quantity_needed: number;
  unit?: string;
  estimated_price: number;
  department: 'PRODUCE' | 'PANTRY' | 'REFRIGERATED' | 'UTILITY';
  reason: string;
  isPurchased?: boolean;
  target_slot?: SlotType;
}

export interface DepartmentExpense {
  category: string;
  amount: number;
}

export interface FinancialAndAnalytics {
  transaction_total: number;
  currency: string;
  department_breakdown: DepartmentExpense[];
}

export interface RecipeSuggestion {
  title: string;
  prepTimeMinutes: number;
  difficulty: 'קל' | 'בינוני' | 'מתקדם';
  matchPercentage: number;
  usedInventoryItems: { name: string; quantity: string }[];
  missingItems?: { name: string; quantity: string }[];
  instructions: string[];
}

export interface CopilotInsights {
  available_recipes: string[];
  pantry_alerts: string[];
  cost_saving_tips: string[];
}

export type ActionType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'COOKING_PLAN'
  | 'SHOPPING_SYNC'
  | 'COPILOT_QUERY';

export interface EnginePayload {
  action_type: ActionType;
  inventory_mutations: InventoryMutation[];
  shopping_list_additions: {
    item_name: string;
    search_query: string;
    quantity_needed: number;
    estimated_price: number;
    department: 'PRODUCE' | 'PANTRY' | 'REFRIGERATED' | 'UTILITY';
    reason: string;
  }[];
  financial_and_analytics: FinancialAndAnalytics;
  copilot_insights: CopilotInsights;
}

export interface EngineResponse {
  user_summary: string;
  payload: EnginePayload;
}

export interface CookingDish {
  id: string;
  name: string;
  category: string;
  servings: number;
  ingredients: {
    itemName: string;
    quantity: number;
    unit: string;
    slotHint?: SlotType;
  }[];
  instructions: string[];
}

export interface StockHistoryLog {
  id: string;
  timestamp: string;
  action_type: ActionType;
  summary: string;
  itemsAffected: number;
  totalCostChange?: number;
}
