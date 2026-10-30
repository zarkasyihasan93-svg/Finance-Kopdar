import { CategoryItem, Transaction, BudgetItem, TodoItem } from './types';

export const DEFAULT_INCOME_CATEGORIES = [
  'Gaji',
  'Freelance',
  'Bonus',
  'Investasi',
  'Lainnya',
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Makan',
  'Transport',
  'Belanja',
  'Hiburan',
  'Tagihan',
  'Kesehatan',
  'Pendidikan',
  'Lainnya',
];

// Inisialisasi data kosong bersih tanpa akun atau data dummy
export const INITIAL_CATEGORIES: CategoryItem[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_BUDGETS: BudgetItem[] = [];
export const INITIAL_TODOS: TodoItem[] = [];
