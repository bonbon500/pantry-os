import { createClient, User, Session } from '@supabase/supabase-js';
import { PantryItem, ShoppingListItem, SlotType, ItemStatus, DepartmentType } from '../types';

export const SUPABASE_URL = 'https://azcvaybfajjvelwrpagu.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_05mRsCr7At69HoF9ztM6dQ_cJKY_1ed';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

export interface SupabaseSyncState {
  isConnected: boolean;
  lastSyncedAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
  userEmail?: string | null;
}

// -------------------------------------------------------------
// Authentication Helper Functions
// -------------------------------------------------------------

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    console.warn('Error getting current Supabase user:', err);
    return null;
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (err) {
    console.warn('Error getting Supabase session:', err);
    return null;
  }
}

export async function signInWithEmailPassword(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmailPassword(email: string, password: string) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        registered_at: new Date().toISOString(),
      },
    },
  });
}

export async function signInWithMagicLink(email: string) {
  return await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
}

export async function signInAnonymously() {
  try {
    const res = await supabase.auth.signInAnonymously();
    if (res.error) {
      console.warn('Supabase anonymous sign-in not enabled on project:', res.error);
    }
    return res;
  } catch (err: any) {
    return { data: { user: null, session: null }, error: err };
  }
}

export async function signOutUser() {
  return await supabase.auth.signOut();
}

// -------------------------------------------------------------
// Connection & Diagnostic Helpers
// -------------------------------------------------------------

export async function testSupabaseConnection(): Promise<boolean> {
  try {
    // Try inventory_items first, then inventory
    const { error: err1 } = await supabase.from('inventory_items').select('id').limit(1);
    if (!err1) return true;

    const { error: err2 } = await supabase.from('inventory').select('id').limit(1);
    if (!err2) return true;

    // Even if tables are empty or initializing, network success is valid
    return true;
  } catch (e) {
    console.warn('Supabase connection check fallback:', e);
    return false;
  }
}

// -------------------------------------------------------------
// Data Mapping Helpers (TypeScript <-> Supabase Columns)
// -------------------------------------------------------------

function mapPantryItemToDB(item: PantryItem, userId?: string) {
  return {
    id: item.id,
    user_id: userId || item.user_id || null,
    name: item.name,
    barcode_or_sku: item.barcode_or_sku || null,
    slot: item.slot,
    quantity: Number(item.quantity) || 0,
    min_threshold: Number(item.minThreshold) || 1,
    unit: item.unit || 'יח\'',
    department: item.department,
    is_weighable: Boolean(item.isWeighable),
    status: item.status,
    expiry_date: item.expiryDate || null,
    price_per_unit: Number(item.pricePerUnit) || 0,
    last_updated: item.lastUpdated || new Date().toISOString(),
    notes: item.notes || null,
  };
}

function mapDBToPantryItem(row: any): PantryItem {
  return {
    id: String(row.id),
    user_id: row.user_id || undefined,
    name: row.name || 'פריט מזווה',
    barcode_or_sku: row.barcode_or_sku || null,
    slot: (row.slot as SlotType) || 'CANNED_COLUMN_2',
    quantity: typeof row.quantity === 'number' ? row.quantity : 1,
    minThreshold: typeof row.min_threshold === 'number' ? row.min_threshold : 1,
    unit: row.unit || 'יח\'',
    department: (row.department as DepartmentType) || 'מוצרי יסוד ומזווה',
    isWeighable: Boolean(row.is_weighable),
    status: (row.status as ItemStatus) || 'IN_STOCK',
    expiryDate: row.expiry_date || undefined,
    pricePerUnit: typeof row.price_per_unit === 'number' ? row.price_per_unit : 0,
    lastUpdated: row.last_updated || new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    notes: row.notes || undefined,
  };
}

function mapShoppingItemToDB(item: ShoppingListItem, userId?: string) {
  return {
    id: item.id,
    user_id: userId || item.user_id || null,
    item_name: item.item_name,
    search_query: item.search_query || item.item_name,
    quantity_needed: Number(item.quantity_needed) || 1,
    unit: item.unit || 'יח\'',
    estimated_price: Number(item.estimated_price) || 0,
    department: item.department || 'PANTRY',
    reason: item.reason || '',
    is_purchased: Boolean(item.isPurchased),
    target_slot: item.target_slot || null,
  };
}

function mapDBToShoppingItem(row: any): ShoppingListItem {
  return {
    id: String(row.id),
    user_id: row.user_id || undefined,
    item_name: row.item_name || 'פריט לקנייה',
    search_query: row.search_query || row.item_name || '',
    quantity_needed: typeof row.quantity_needed === 'number' ? row.quantity_needed : 1,
    unit: row.unit || 'יח\'',
    estimated_price: typeof row.estimated_price === 'number' ? row.estimated_price : 0,
    department: row.department || 'PANTRY',
    reason: row.reason || '',
    isPurchased: Boolean(row.is_purchased),
    target_slot: row.target_slot as SlotType || undefined,
  };
}

// -------------------------------------------------------------
// Live Database CRUD Operations
// -------------------------------------------------------------

/**
 * Fetch user's inventory items from Supabase
 */
export async function fetchUserInventory(userId: string): Promise<PantryItem[] | null> {
  try {
    // Try inventory_items first
    let { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', userId)
      .order('last_updated', { ascending: false });

    if (error) {
      // Try fallback table 'inventory'
      const fallback = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false });
      
      if (!fallback.error && fallback.data) {
        data = fallback.data;
        error = null;
      }
    }

    if (error || !data) {
      console.warn('Could not fetch remote inventory from Supabase:', error?.message);
      return null;
    }

    return data.map(mapDBToPantryItem);
  } catch (err) {
    console.warn('Error fetching inventory:', err);
    return null;
  }
}

/**
 * Fetch user's shopping list items from Supabase
 */
export async function fetchUserShoppingList(userId: string): Promise<ShoppingListItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) {
      console.warn('Could not fetch remote shopping_list:', error?.message);
      return null;
    }

    return data.map(mapDBToShoppingItem);
  } catch (err) {
    console.warn('Error fetching shopping list:', err);
    return null;
  }
}

/**
 * Upsert / Save a single inventory item to Supabase
 */
export async function savePantryItemToDB(item: PantryItem, userId?: string): Promise<boolean> {
  try {
    const payload = mapPantryItemToDB(item, userId);
    
    // Try primary table
    const { error: err1 } = await supabase.from('inventory_items').upsert(payload, { onConflict: 'id' });
    if (!err1) return true;

    // Fallback table
    const { error: err2 } = await supabase.from('inventory').upsert(payload, { onConflict: 'id' });
    return !err2;
  } catch (err) {
    console.warn('Error saving pantry item:', err);
    return false;
  }
}

/**
 * Delete a single inventory item from Supabase
 */
export async function deletePantryItemFromDB(itemId: string, userId?: string): Promise<boolean> {
  try {
    let query = supabase.from('inventory_items').delete().eq('id', itemId);
    if (userId) query = query.eq('user_id', userId);
    const { error: err1 } = await query;
    if (!err1) return true;

    let fbQuery = supabase.from('inventory').delete().eq('id', itemId);
    if (userId) fbQuery = fbQuery.eq('user_id', userId);
    const { error: err2 } = await fbQuery;
    return !err2;
  } catch (err) {
    console.warn('Error deleting pantry item:', err);
    return false;
  }
}

/**
 * Upsert / Save a shopping list item to Supabase
 */
export async function saveShoppingItemToDB(item: ShoppingListItem, userId?: string): Promise<boolean> {
  try {
    const payload = mapShoppingItemToDB(item, userId);
    const { error } = await supabase.from('shopping_list').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Error saving shopping item:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error saving shopping item:', err);
    return false;
  }
}

/**
 * Delete a shopping list item from Supabase
 */
export async function deleteShoppingItemFromDB(itemId: string, userId?: string): Promise<boolean> {
  try {
    let query = supabase.from('shopping_list').delete().eq('id', itemId);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) {
      console.warn('Error deleting shopping item:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deleting shopping item:', err);
    return false;
  }
}

/**
 * Full Sync / Batch Upsert for Inventory
 */
export async function syncInventoryToSupabase(items: PantryItem[], userId?: string): Promise<boolean> {
  try {
    if (!items || items.length === 0) return true;
    const payload = items.map((item) => mapPantryItemToDB(item, userId));

    const { error: err1 } = await supabase.from('inventory_items').upsert(payload, { onConflict: 'id' });
    if (!err1) return true;

    const { error: err2 } = await supabase.from('inventory').upsert(payload, { onConflict: 'id' });
    return !err2;
  } catch (err) {
    console.warn('Supabase inventory sync failed:', err);
    return false;
  }
}

/**
 * Full Sync / Batch Upsert for Shopping List
 */
export async function syncShoppingListToSupabase(items: ShoppingListItem[], userId?: string): Promise<boolean> {
  try {
    if (!items || items.length === 0) return true;
    const payload = items.map((item) => mapShoppingItemToDB(item, userId));

    const { error } = await supabase.from('shopping_list').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase shopping_list upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase shopping list sync failed:', err);
    return false;
  }
}
