import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, AlertCircle, CheckCircle2, Trash2, PieChart as PieChartIcon, Sparkles } from 'lucide-react';
import { BudgetItem, CategoryItem, Transaction } from './types';
import { formatRupiah, formatNumericInput, sanitizeNumericInput } from './formatters';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';

interface BudgetViewProps {
  budgets: BudgetItem[];
  categories: CategoryItem[];
  transactions: Transaction[];
  userId?: string;
  onSaveBudget: (budget: Omit<BudgetItem, 'id' | 'created_at'>) => void;
  onDeleteBudget: (id: string) => void;
  onAddCategory: (category: Omit<CategoryItem, 'id' | 'created_at'>) => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  budgets,
  categories,
  transactions,
  userId,
  onSaveBudget,
  onDeleteBudget,
  onAddCategory,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [budgetToDeleteId, setBudgetToDeleteId] = useState<string | null>(null);

  // Current Month String YYYY-MM
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [budgetAmount, setBudgetAmount] = useState<string>('');

  // Add Category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Filter current month expense transactions
  const currentMonthExpenses = transactions.filter((t) => {
    if (t.type !== 'expense' || !t.date) return false;
    const d = new Date(t.date);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  });

  const totalAllocatedBudget = budgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const totalSpentInMonth = currentMonthExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !budgetAmount || Number(budgetAmount) <= 0) return;

    onSaveBudget({
      user_id: userId || '',
      category: selectedCategory,
      amount: Number(budgetAmount),
      month: currentMonthStr,
    });

    setIsModalOpen(false);
    setSelectedCategory('');
    setBudgetAmount('');
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    onAddCategory({
      user_id: userId || '',
      type: newCatType,
      name: newCatName.trim(),
    });

    setIsCategoryModalOpen(false);
    setNewCatName('');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
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
      className="space-y-6 max-w-full overflow-x-hidden"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Anggaran Bulanan
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tetapkan batas anggaran pengeluaran per kategori untuk mengontrol keuangan
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-purple-200 dark:border-purple-900/60 font-bold text-xs text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 active:scale-95 transition-all"
          >
            + Kategori Baru
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Atur Anggaran</span>
          </button>
        </div>
      </motion.div>

      {/* Hero Overview Banner */}
      {budgets.length > 0 && (
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.005 }}
          className="p-6 rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles className="w-48 h-48 text-purple-200" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/10 backdrop-blur-md text-purple-200 mb-2">
                Bulan Ini ({now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })})
              </span>
              <h3 className="text-xl sm:text-2xl font-black">
                Ringkasan Alokasi Anggaran
              </h3>
              <p className="text-xs text-purple-200/80 mt-1 max-w-md">
                Total anggaran yang sudah Anda rencanakan untuk seluruh kategori pengeluaran bulan ini.
              </p>
            </div>

            <div className="flex items-center gap-6 divide-x divide-white/10 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div>
                <p className="text-[10px] uppercase font-bold text-purple-200">Total Anggaran</p>
                <p className="text-base sm:text-lg font-black">{formatRupiah(totalAllocatedBudget)}</p>
              </div>
              <div className="pl-6">
                <p className="text-[10px] uppercase font-bold text-purple-200">Total Terpakai</p>
                <p className="text-base sm:text-lg font-black text-amber-300">{formatRupiah(totalSpentInMonth)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Budget Cards Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {budgets.map((b) => {
            // Calculate spent for this category in current month
            const spent = currentMonthExpenses
              .filter((t) => t.category === b.category)
              .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

            const remaining = b.amount - spent;
            const percentage = Math.round((spent / b.amount) * 100);
            const isOverBudget = spent > b.amount;

            return (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.25 }}
                className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
                  isOverBudget
                    ? 'border-rose-300 dark:border-rose-900/60 ring-2 ring-rose-500/10'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs ${
                        isOverBudget
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300'
                      }`}
                    >
                      <PieChartIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">{b.category}</h3>
                      <p className="text-xs text-slate-400">Target: {formatRupiah(b.amount)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setBudgetToDeleteId(b.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-90 transition-all"
                    title="Hapus Budget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Terpakai: {formatRupiah(spent)}</span>
                    <span
                      className={`font-black ${
                        isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {percentage}%
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percentage, 100)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        isOverBudget
                          ? 'bg-rose-500'
                          : percentage >= 80
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-600'
                      }`}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-slate-400 font-medium">
                      Sisa: <strong className={isOverBudget ? 'text-rose-600' : 'text-emerald-600'}>{formatRupiah(remaining)}</strong>
                    </span>
                    {isOverBudget ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> Melebihi Budget
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Aman
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {budgets.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-3xl flex items-center justify-center mx-auto">
              <PieChartIcon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Belum ada anggaran yang dibuat</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Buat anggaran bulanan per kategori untuk mengontrol pengeluaran keuangan Anda dengan lebih cerdas.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
            >
              Buat Anggaran Pertama
            </button>
          </div>
        )}
      </motion.div>

      {/* Modal: Atur Anggaran */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Atur Anggaran Kategori">
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Kategori Pengeluaran
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              required
            >
              <option value="">Pilih Kategori...</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Batas Anggaran Bulanan (Rp)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9.]*"
              value={formatNumericInput(budgetAmount)}
              onChange={(e) => setBudgetAmount(sanitizeNumericInput(e.target.value))}
              placeholder="Contoh: 2.000.000"
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 text-xs font-bold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              Simpan Anggaran
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Tambah Kategori Baru */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Tambah Kategori Transaksi"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tipe Kategori
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setNewCatType('income')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  newCatType === 'income'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setNewCatType('expense')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  newCatType === 'expense'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Pengeluaran
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Kategori
            </label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Contoh: Asuransi, Belanja Online"
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 text-xs font-bold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              Tambah Kategori
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Budget Modal */}
      <ConfirmModal
        isOpen={!!budgetToDeleteId}
        onClose={() => setBudgetToDeleteId(null)}
        onConfirm={() => {
          if (budgetToDeleteId) onDeleteBudget(budgetToDeleteId);
        }}
        title="Hapus Anggaran"
        message="Apakah Anda yakin ingin menghapus data anggaran kategori ini?"
      />
    </motion.div>
  );
};
