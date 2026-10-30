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

const today = new Date();
const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

const dateMinusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const DEFAULT_GUEST_USER_ID = '00000000-0000-0000-0000-000000000000';

export const INITIAL_CATEGORIES: CategoryItem[] = [
  ...DEFAULT_INCOME_CATEGORIES.map((cat, idx) => ({
    id: `10000000-0000-0000-0000-00000000000${idx + 1}`,
    user_id: DEFAULT_GUEST_USER_ID,
    type: 'income' as const,
    name: cat,
    created_at: new Date().toISOString(),
  })),
  ...DEFAULT_EXPENSE_CATEGORIES.map((cat, idx) => ({
    id: `20000000-0000-0000-0000-00000000000${idx + 1}`,
    user_id: DEFAULT_GUEST_USER_ID,
    type: 'expense' as const,
    name: cat,
    created_at: new Date().toISOString(),
  })),
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    user_id: DEFAULT_GUEST_USER_ID,
    type: 'income',
    amount: 12500000,
    category: 'Gaji',
    note: 'Gaji Bulanan Utama',
    date: dateMinusDays(25),
    created_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    user_id: DEFAULT_GUEST_USER_ID,
    type: 'income',
    amount: 3500000,
    category: 'Freelance',
    note: 'Project UI/UX Website SaaS',
    date: dateMinusDays(15),
    created_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    user_id: DEFAULT_GUEST_USER_ID,
    type: 'expense',
    amount: 2100000,
    category: 'Belanja',
    note: 'Belanja Kebutuhan Bulanan Minimarket',
    date: dateMinusDays(20),
    created_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000004',
    user_id: DEFAULT_GUEST_USER_ID,
    type: 'expense',
    amount: 1450000,
    category: 'Makan',
    note: 'Restoran & Makan Harian',
    date: dateMinusDays(5),
    created_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000005',
    user_id: DEFAULT_GUEST_USER_ID,
    type: 'expense',
    amount: 850000,
    category: 'Tagihan',
    note: 'Listrik, Wi-Fi & Air Home',
    date: dateMinusDays(10),
    created_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000006',
    user_id: DEFAULT_GUEST_USER_ID,
    type: 'expense',
    amount: 500000,
    category: 'Transport',
    note: 'Bensin & Saldo E-Toll',
    date: dateMinusDays(3),
    created_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000007',
    user_id: DEFAULT_GUEST_USER_ID,
    type: 'expense',
    amount: 350000,
    category: 'Hiburan',
    note: 'Langganan Streaming & Bioskop',
    date: dateMinusDays(2),
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_BUDGETS: BudgetItem[] = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    user_id: DEFAULT_GUEST_USER_ID,
    category: 'Makan',
    amount: 2000000,
    month: currentMonthStr,
    created_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    user_id: DEFAULT_GUEST_USER_ID,
    category: 'Belanja',
    amount: 2500000,
    month: currentMonthStr,
    created_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    user_id: DEFAULT_GUEST_USER_ID,
    category: 'Transport',
    amount: 1000000,
    month: currentMonthStr,
    created_at: new Date().toISOString(),
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    user_id: DEFAULT_GUEST_USER_ID,
    category: 'Hiburan',
    amount: 300000,
    month: currentMonthStr,
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_TODOS: TodoItem[] = [
  {
    id: '50000000-0000-0000-0000-000000000001',
    user_id: DEFAULT_GUEST_USER_ID,
    title: 'Review Laporan Keuangan Bulanan',
    description: 'Periksa pengeluaran kategori Makan dan Tagihan',
    priority: 'High',
    status: 'In Progress',
    deadline: dateMinusDays(-2),
    created_at: new Date().toISOString(),
  },
  {
    id: '50000000-0000-0000-0000-000000000002',
    user_id: DEFAULT_GUEST_USER_ID,
    title: 'Bayar Tagihan Listrik & Wi-Fi',
    description: 'Lakukan pembayaran via M-Banking sebelum tanggal 20',
    priority: 'High',
    status: 'Done',
    deadline: dateMinusDays(1),
    created_at: new Date().toISOString(),
  },
  {
    id: '50000000-0000-0000-0000-000000000003',
    user_id: DEFAULT_GUEST_USER_ID,
    title: 'Setor Tabungan Investasi',
    description: 'Alokasikan 10% dari pemasukan ke reksadana/saham',
    priority: 'Medium',
    status: 'Todo',
    deadline: dateMinusDays(-5),
    created_at: new Date().toISOString(),
  },
  {
    id: '50000000-0000-0000-0000-000000000004',
    user_id: DEFAULT_GUEST_USER_ID,
    title: 'Update Budget Bulan Depan',
    description: 'Sesuaikan batas anggaran berdasarkan inflasi dan kebutuhan',
    priority: 'Low',
    status: 'Todo',
    deadline: dateMinusDays(-7),
    created_at: new Date().toISOString(),
  },
];
