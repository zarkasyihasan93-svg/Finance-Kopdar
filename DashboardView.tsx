import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Bell,
  CheckSquare,
  PieChart,
  FileText,
  Clock,
  Calendar,
  Sparkles,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  X,
  Tag,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { AppUser, Transaction, TodoItem } from './types';
import { formatRupiah, formatDate } from './formatters';

export interface DashboardViewProps {
  transactions: Transaction[];
  todos?: TodoItem[];
  user?: AppUser | null;
  onNavigateTab?: (tab: 'dashboard' | 'transactions' | 'history' | 'budget' | 'reports' | 'todo' | 'profile') => void;
  onAddTransactionClick: () => void;
  onViewAllTransactionsClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  todos = [],
  user,
  onNavigateTab,
  onAddTransactionClick,
  onViewAllTransactionsClick,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Filter transactions for current month
  const currentMonthTransactions = transactions.filter((t) => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  // Total All-Time Balance
  const totalIncomeAllTime = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalExpenseAllTime = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const currentBalance = totalIncomeAllTime - totalExpenseAllTime;

  // Monthly stats
  const monthIncome = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const monthExpense = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Monthly Chart Data (Last 6 Months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const chartData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();

    const mTx = transactions.filter((t) => {
      if (!t.date) return false;
      const td = new Date(t.date);
      return td.getFullYear() === y && td.getMonth() === m;
    });

    const inc = mTx.filter((t) => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const exp = mTx.filter((t) => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    chartData.push({
      month: `${monthNames[m]} ${y !== currentYear ? `'${String(y).slice(2)}` : ''}`,
      Pemasukan: inc,
      Pengeluaran: exp,
    });
  }

  // Recent 5 Transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Search filtered transactions if quickSearch active
  const filteredSearchTx = quickSearch.trim()
    ? transactions.filter(
        (t) =>
          t.category.toLowerCase().includes(quickSearch.toLowerCase()) ||
          t.note.toLowerCase().includes(quickSearch.toLowerCase())
      )
    : [];

  // Nearest upcoming todos (uncompleted, sorted by deadline)
  const upcomingTodos = [...todos]
    .filter((todo) => todo.status !== 'Done')
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    })
    .slice(0, 3);

  // Helper to format deadline date & time
  const formatDeadline = (deadlineStr: string) => {
    if (!deadlineStr) return { dateStr: 'Tanpa Deadline', timeStr: '-' };
    try {
      const dt = new Date(deadlineStr);
      if (isNaN(dt.getTime())) return { dateStr: deadlineStr, timeStr: '-' };

      const dateStr = dt.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = dt.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return { dateStr, timeStr };
    } catch {
      return { dateStr: deadlineStr, timeStr: '-' };
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900';
      case 'Medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900';
      case 'Low':
      default:
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900';
    }
  };

  const getUserFirstName = () => {
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    return 'Pengguna';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-6 max-w-full overflow-x-hidden"
    >
      {/* 1. Header Personal */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4 pt-1">
        <div>
          <p className="text-xs font-semibold tracking-wide text-purple-600 dark:text-purple-400 uppercase">
            Selamat Datang Kembali 👋
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
            {user?.displayName || 'Siyam Ahmed'}
          </h1>
        </div>

        {/* Action Header Buttons: Search & Notification */}
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/50 dark:hover:text-purple-400 hover:-translate-y-0.5 active:scale-90 transition-all"
            title="Cari Transaksi"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notification Button */}
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/50 dark:hover:text-purple-400 hover:-translate-y-0.5 active:scale-90 transition-all relative"
            title="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-purple-600 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </button>
        </div>
      </motion.div>

      {/* Quick Search Dropdown Modal */}
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900 shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-purple-600" />
              Pencarian Cepat Transaksi
            </span>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-purple-500/30 transition-all">
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Cari kategori atau catatan..."
              className="bg-transparent border-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none w-full"
              autoFocus
            />
          </div>

          {quickSearch.trim() && (
            <div className="max-h-48 overflow-y-auto space-y-2 pt-1">
              {filteredSearchTx.length > 0 ? (
                filteredSearchTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{tx.category}</p>
                      <p className="text-[10px] text-slate-400">{tx.note || formatDate(tx.date)}</p>
                    </div>
                    <span
                      className={`font-bold ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {tx.type === 'income' ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">Tidak ditemukan transaksi yang cocok.</p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Notification Dropdown Modal */}
      {isNotificationOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900 shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-purple-600" />
              Notifikasi Sistem & Telegram
            </span>
            <button
              onClick={() => setIsNotificationOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 text-xs space-y-1">
            <p className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Telegram Bot Terhubung
            </p>
            <p className="text-[11px] text-purple-700 dark:text-purple-300">
              Notifikasi instan transaksi dan reminder laporan harian aktif otomatis secara real-time.
            </p>
          </div>
        </motion.div>
      )}

      {/* 2. Balance Card (Modern Soft Purple Gradient) */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 sm:p-7 text-white shadow-xl shadow-purple-500/20 border border-purple-400/20 hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300"
      >
        {/* Background Decorative Glow Shapes */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Top Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                <Wallet className="w-4 h-4 text-purple-100" />
              </div>
              <span className="text-xs font-medium text-purple-100/90 tracking-wide">Saldo Saat Ini</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold text-white border border-white/20">
              Personal Wallet
            </span>
          </div>

          {/* Main Balance Display + Floating Add Transaction Button */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
                {formatRupiah(currentBalance)}
              </p>
              <p className="text-[11px] text-purple-100/80 mt-2 font-medium">
                Update otomatis dari database Supabase
              </p>
            </div>

            {/* Floating Action Add Button */}
            <button
              onClick={onAddTransactionClick}
              className="w-12 h-12 rounded-full bg-white text-purple-700 hover:bg-purple-50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-black/20 font-bold flex-shrink-0"
              title="Tambah Transaksi Baru"
            >
              <Plus className="w-6 h-6 text-purple-700" />
            </button>
          </div>

          {/* Monthly Income & Expense Mini Summary */}
          <div className="pt-3 border-t border-white/15 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-400/20 backdrop-blur-sm flex items-center justify-center text-emerald-300">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold tracking-wider text-purple-200/80">Pemasukan Mo</p>
                <p className="text-xs font-bold text-white">{formatRupiah(monthIncome)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-rose-400/20 backdrop-blur-sm flex items-center justify-center text-rose-300">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold tracking-wider text-purple-200/80">Pengeluaran Mo</p>
                <p className="text-xs font-bold text-white">{formatRupiah(monthExpense)}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 6. Quick Menu Shortcuts */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Quick Menu</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Shortcut 1: Tambah Transaksi */}
          <button
            onClick={onAddTransactionClick}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-800 active:scale-95 transition-all duration-200 text-left flex flex-col justify-between group"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Tambah Transaksi</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Catat uang masuk / keluar</p>
            </div>
          </button>

          {/* Shortcut 2: Todo */}
          <button
            onClick={() => onNavigateTab?.('todo')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-800 active:scale-95 transition-all duration-200 text-left flex flex-col justify-between group"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Daftar Tugas</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Cek deadline & reminder</p>
            </div>
          </button>

          {/* Shortcut 3: Budget */}
          <button
            onClick={() => onNavigateTab?.('budget')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-800 active:scale-95 transition-all duration-200 text-left flex flex-col justify-between group"
          >
            <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Target Anggaran</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Atur limit bulanan</p>
            </div>
          </button>

          {/* Shortcut 4: Report PDF */}
          <button
            onClick={() => onNavigateTab?.('reports')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-800 active:scale-95 transition-all duration-200 text-left flex flex-col justify-between group"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Laporan PDF</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Export rekap finansial</p>
            </div>
          </button>
        </div>
      </motion.div>

      {/* 3. Upcoming Section (Todo Terdekat) */}
      <motion.div
        variants={itemVariants}
        className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Upcoming Payment & Todo</h2>
            <p className="text-xs text-slate-400 mt-0.5">Tugas & tagihan dengan deadline terdekat</p>
          </div>
          <button
            onClick={() => onNavigateTab?.('todo')}
            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline active:scale-95 transition-all flex items-center gap-1"
          >
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingTodos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {upcomingTodos.map((todo) => {
              const { dateStr, timeStr } = formatDeadline(todo.deadline);
              return (
                <div
                  key={todo.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-3 hover:border-purple-200 dark:hover:border-purple-900 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(
                          todo.priority
                        )}`}
                      >
                        Priority: {todo.priority}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 capitalize">
                        {todo.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {todo.title}
                    </p>
                    {todo.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {todo.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-purple-500" />
                      <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-purple-500" />
                      <span>{timeStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <CheckSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Tidak ada tugas terdekat yang belum selesai.
            </p>
            <button
              onClick={() => onNavigateTab?.('todo')}
              className="mt-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline active:scale-95 transition-all"
            >
              + Buat Tugas Baru
            </button>
          </div>
        )}
      </motion.div>

      {/* 4. Recent Transactions (Modern List Card) */}
      <motion.div
        variants={itemVariants}
        className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Recent Transactions</h2>
            <p className="text-xs text-slate-400 mt-0.5">Aktivitas keuangan terbaru Anda</p>
          </div>
          <button
            onClick={onViewAllTransactionsClick}
            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline active:scale-95 transition-all flex items-center gap-1"
          >
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="space-y-2.5">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:translate-x-1 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Category Avatar Icon */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {tx.category}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {tx.note || formatDate(tx.date)}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 pl-3">
                  <p
                    className={`text-xs font-bold ${
                      tx.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {tx.type === 'income' ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.date)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-6 text-center">Belum ada transaksi recorded.</p>
        )}
      </motion.div>

      {/* 5. Analytics Chart Section */}
      <motion.div
        variants={itemVariants}
        className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Aktivitas & Grafik Tren Finansial
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Perbandingan Pemasukan vs Pengeluaran 6 Bulan</p>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
            Analytics
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.4} />
              <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(val) => `${val / 1000000}M`}
              />
              <Tooltip
                formatter={(value: any) => [formatRupiah(Number(value)), '']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '16px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  padding: '10px 14px',
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Pemasukan" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
};
