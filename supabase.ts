import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Transaction, CategoryItem, BudgetItem, TodoItem, TelegramConnection } from './types';

// Read Supabase credentials from client-safe Vite environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key' &&
    supabaseUrl.startsWith('https://')
  );
};

export const getSupabaseConfigDetails = () => ({
  url: supabaseUrl,
  isConfigured: isSupabaseConfigured(),
});

// Single reusable client instance
// If env vars are not set yet, use a valid placeholder format to prevent runtime instantiation errors
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Standard RFC4122 v4 UUID generator for PostgreSQL UUID primary keys
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// --- DATABASE QUERIES (Protected by Row Level Security) ---

// Transactions
export async function getSupabaseTransactions(userId: string): Promise<Transaction[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('[Supabase] Error fetching transactions:', error.message);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    note: row.note || '',
    date: row.date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function upsertSupabaseTransaction(tx: Transaction, userId?: string): Promise<void> {
  const effectiveUserId = userId || tx.user_id;
  if (!isSupabaseConfigured() || !effectiveUserId) return;
  const { error } = await supabase.from('transactions').upsert(
    {
      id: tx.id,
      user_id: effectiveUserId,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      note: tx.note || '',
      date: tx.date,
      created_at: tx.created_at,
      updated_at: tx.updated_at || new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('[Supabase] Error upserting transaction:', error.message);
    throw error;
  }
}

export async function deleteSupabaseTransaction(id: string, userId?: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  let query = supabase.from('transactions').delete().eq('id', id);
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { error } = await query;

  if (error) {
    console.error('[Supabase] Error deleting transaction:', error.message);
    throw error;
  }
}

// Categories
export async function getSupabaseCategories(userId: string): Promise<CategoryItem[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Supabase] Error fetching categories:', error.message);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    name: row.name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function seedDefaultCategories(userId: string): Promise<CategoryItem[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  const defaultIncome = ['Gaji', 'Freelance', 'Bonus', 'Investasi', 'Lainnya'];
  const defaultExpense = ['Makan', 'Transport', 'Belanja', 'Hiburan', 'Tagihan', 'Kesehatan', 'Pendidikan', 'Lainnya'];

  const rows = [
    ...defaultIncome.map((name) => ({
      id: generateUUID(),
      user_id: userId,
      type: 'income' as const,
      name,
    })),
    ...defaultExpense.map((name) => ({
      id: generateUUID(),
      user_id: userId,
      type: 'expense' as const,
      name,
    })),
  ];

  const { data, error } = await supabase.from('categories').insert(rows).select('*');

  if (error) {
    console.error('[Supabase] Error seeding default categories:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    name: row.name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function upsertSupabaseCategory(cat: CategoryItem, userId?: string): Promise<void> {
  const effectiveUserId = userId || cat.user_id;
  if (!isSupabaseConfigured() || !effectiveUserId) return;
  const { error } = await supabase.from('categories').upsert(
    {
      id: cat.id,
      user_id: effectiveUserId,
      type: cat.type,
      name: cat.name,
      created_at: cat.created_at,
      updated_at: cat.updated_at || new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('[Supabase] Error upserting category:', error.message);
    throw error;
  }
}

// Budgets
export async function getSupabaseBudgets(userId: string): Promise<BudgetItem[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('[Supabase] Error fetching budgets:', error.message);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    category: row.category,
    amount: Number(row.amount),
    month: row.month,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function upsertSupabaseBudget(bgt: BudgetItem, userId?: string): Promise<void> {
  const effectiveUserId = userId || bgt.user_id;
  if (!isSupabaseConfigured() || !effectiveUserId) return;
  const { error } = await supabase.from('budgets').upsert(
    {
      id: bgt.id,
      user_id: effectiveUserId,
      category: bgt.category,
      amount: bgt.amount,
      month: bgt.month,
      created_at: bgt.created_at,
      updated_at: bgt.updated_at || new Date().toISOString(),
    },
    { onConflict: 'user_id,category,month' }
  );

  if (error) {
    console.error('[Supabase] Error upserting budget:', error.message);
    throw error;
  }
}

export async function deleteSupabaseBudget(id: string, userId?: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  let query = supabase.from('budgets').delete().eq('id', id);
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { error } = await query;

  if (error) {
    console.error('[Supabase] Error deleting budget:', error.message);
    throw error;
  }
}

// Todos
export async function getSupabaseTodos(userId: string): Promise<TodoItem[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .order('deadline', { ascending: true });

  if (error) {
    console.error('[Supabase] Error fetching todos:', error.message);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description || '',
    priority: row.priority,
    status: row.status,
    deadline: row.deadline || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    sent_reminders: row.sent_reminders || '',
    repeat_reminder_enabled: Boolean(row.repeat_reminder_enabled),
    reminder_interval_type: row.reminder_interval_type || 'minutes',
    reminder_interval_value: row.reminder_interval_value !== undefined && row.reminder_interval_value !== null ? Number(row.reminder_interval_value) : 10,
    reminder_days: Array.isArray(row.reminder_days) ? row.reminder_days : [1, 2, 3, 4, 5, 6, 0],
    last_reminder_sent_at: row.last_reminder_sent_at || undefined,
  }));
}

export async function upsertSupabaseTodo(todo: TodoItem, userId?: string): Promise<void> {
  const effectiveUserId = userId || todo.user_id;
  if (!isSupabaseConfigured() || !effectiveUserId) return;
  const { error } = await supabase.from('todos').upsert(
    {
      id: todo.id,
      user_id: effectiveUserId,
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority,
      status: todo.status,
      deadline: todo.deadline || '',
      created_at: todo.created_at,
      updated_at: todo.updated_at || new Date().toISOString(),
      sent_reminders: todo.sent_reminders || '',
      repeat_reminder_enabled: Boolean(todo.repeat_reminder_enabled),
      reminder_interval_type: todo.reminder_interval_type || 'minutes',
      reminder_interval_value: todo.reminder_interval_value || 10,
      reminder_days: todo.reminder_days || [1, 2, 3, 4, 5, 6, 0],
      last_reminder_sent_at: todo.last_reminder_sent_at || null,
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('[Supabase] Error upserting todo:', error.message);
    throw error;
  }
}

export async function deleteSupabaseTodo(id: string, userId?: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  let query = supabase.from('todos').delete().eq('id', id);
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { error } = await query;

  if (error) {
    console.error('[Supabase] Error deleting todo:', error.message);
    throw error;
  }
}

// --- IDEMPOTENT FIRST-TIME USER CHECK ---

export async function checkIsBrandNewUser(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId) return false;

  try {
    // 1. Check user_metadata in Supabase Auth
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.user_metadata?.initialized === true) {
      return false;
    }

    // 2. Check localStorage guard
    if (typeof window !== 'undefined' && localStorage.getItem(`supabase_user_initialized_${userId}`) === 'true') {
      return false;
    }

    // 3. Check existing records in database for this user
    const [{ count: catCount }, { count: txCount }, { count: bgtCount }, { count: todoCount }] = await Promise.all([
      supabase.from('categories').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('budgets').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('todos').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    const totalRecords = (catCount || 0) + (txCount || 0) + (bgtCount || 0) + (todoCount || 0);

    if (totalRecords > 0) {
      // User already has records in DB, mark metadata so we don't query counts again
      await markUserAsInitialized(userId);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Error checking if user is new:', err);
    return false;
  }
}

export async function markUserAsInitialized(userId: string): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`supabase_user_initialized_${userId}`, 'true');
    }
    await supabase.auth.updateUser({ data: { initialized: true } });
  } catch (err) {
    console.error('[Supabase] Error marking user as initialized:', err);
  }
}

// --- TELEGRAM CONNECTIONS ---

export async function getSupabaseTelegramConnection(userId: string): Promise<TelegramConnection | null> {
  if (!isSupabaseConfigured() || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('telegram_connections')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Error fetching telegram connection:', error.message);
      return null;
    }

    return data as TelegramConnection | null;
  } catch (err) {
    console.error('[Supabase] Exception fetching telegram connection:', err);
    return null;
  }
}

export async function upsertSupabaseTelegramConnection(
  connection: {
    telegram_chat_id: string;
    telegram_username?: string | null;
    telegram_first_name?: string | null;
    is_active?: boolean;
  },
  userId: string
): Promise<TelegramConnection | null> {
  if (!isSupabaseConfigured() || !userId) return null;

  try {
    const payload = {
      user_id: userId,
      telegram_chat_id: connection.telegram_chat_id.trim(),
      telegram_username: connection.telegram_username ? connection.telegram_username.trim() : null,
      telegram_first_name: connection.telegram_first_name ? connection.telegram_first_name.trim() : null,
      is_active: connection.is_active !== undefined ? connection.is_active : true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('telegram_connections')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      console.error('[Supabase] Error upserting telegram connection:', error.message);
      throw error;
    }

    return data as TelegramConnection;
  } catch (err) {
    console.error('[Supabase] Exception upserting telegram connection:', err);
    throw err;
  }
}

export async function deleteSupabaseTelegramConnection(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId) return false;

  try {
    const { error } = await supabase
      .from('telegram_connections')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[Supabase] Error deleting telegram connection:', error.message);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Exception deleting telegram connection:', err);
    throw err;
  }
}

