export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string; // ISO 8601 or YYYY-MM-DDTHH:mm
  created_at: string;
  updated_at?: string;
}

export interface CategoryItem {
  id: string;
  user_id: string;
  type: TransactionType;
  name: string;
  created_at: string;
  updated_at?: string;
}

export interface BudgetItem {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  month: string; // YYYY-MM
  created_at: string;
  updated_at?: string;
}

export type PriorityLevel = 'Low' | 'Medium' | 'High';
export type TodoStatus = 'Todo' | 'In Progress' | 'Done';
export type ReminderIntervalType = 'minutes' | 'hours';

export interface TodoItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  status: TodoStatus;
  deadline: string; // YYYY-MM-DDTHH:mm
  created_at: string;
  updated_at?: string;
  sent_reminders?: string; // Comma-separated keys for sent reminders

  // Repeat reminder settings for Telegram Bot
  repeat_reminder_enabled?: boolean;
  reminder_interval_type?: ReminderIntervalType; // 'minutes' | 'hours'
  reminder_interval_value?: number; // e.g. 10 (minutes) or 1 (hour)
  reminder_days?: number[]; // [0, 1, 2, 3, 4, 5, 6] where 0=Minggu, 1=Senin, ..., 6=Sabtu
  last_reminder_sent_at?: string; // ISO string timestamp
}

export interface AppDataState {
  transactions: Transaction[];
  categories: CategoryItem[];
  budgets: BudgetItem[];
  todos: TodoItem[];
}

export interface AppUser {
  id: string;
  uid?: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface TelegramConnection {
  id: string;
  user_id: string;
  telegram_chat_id: string;
  telegram_username?: string | null;
  telegram_first_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export type UserProfile = AppUser;

