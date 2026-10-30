import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Eye, ArrowUpRight, ArrowDownRight, Tag, Clock } from 'lucide-react';
import { Transaction, CategoryItem, TransactionType } from './types';
import { formatRupiah, formatDate, formatDateTime, formatNumericInput, sanitizeNumericInput } from './formatters';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  userId?: string;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

const getCurrentDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toDateTimeLocalValue = (dStr: string) => {
  if (!dStr) return getCurrentDateTimeString();
  if (dStr.includes('T')) return dStr.slice(0, 16);
  return `${dStr}T00:00`;
};

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  userId,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [txToDeleteId, setTxToDeleteId] = useState<string | null>(null);

  // Form states for Add / Edit
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(getCurrentDateTimeString());
  const [formError, setFormError] = useState<string>('');

  const filteredCategories = categories.filter((c) => c.type === formType);

  const resetForm = () => {
    setFormType('expense');
    setFormAmount('');
    setFormCategory('');
    setFormNote('');
    setFormDate(getCurrentDateTimeString());
    setFormError('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setTxToEdit(tx);
    setFormType(tx.type);
    setFormAmount(String(tx.amount));
    setFormCategory(tx.category);
    setFormNote(tx.note || '');
    setFormDate(toDateTimeLocalValue(tx.date));
    setFormError('');
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      setFormError('Nominal transaksi harus lebih besar dari 0.');
      return;
    }
    if (!formDate) {
      setFormError('Silakan pilih tanggal dan waktu transaksi.');
      return;
    }

    const defaultCategory = formCategory || (formType === 'income' ? 'Pemasukan' : 'Pengeluaran');

    onAddTransaction({
      user_id: userId,
      type: formType,
      amount: Number(formAmount),
      category: defaultCategory,
      note: formNote,
      date: formDate,
    });

    setIsAddModalOpen(false);
    resetForm();
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txToEdit) return;
    if (!formAmount || Number(formAmount) <= 0) {
      setFormError('Nominal transaksi harus lebih besar dari 0.');
      return;
    }

    onEditTransaction({
      ...txToEdit,
      type: formType,
      amount: Number(formAmount),
      category: txToEdit.category || (formType === 'income' ? 'Pemasukan' : 'Pengeluaran'),
      note: formNote,
      date: formDate,
      updated_at: new Date().toISOString(),
    });

    setTxToEdit(null);
    resetForm();
  };

  const filteredTransactions = transactions
    .filter((tx) => (filterType === 'all' ? true : tx.type === filterType))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-full overflow-x-hidden"
    >
      {/* 1. Header Halaman */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Transaksi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola data pemasukan & pengeluaran keuangan secara efisien
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Tambah Transaksi Baru</span>
        </button>
      </motion.div>

      {/* 2. Pilihan Jenis Transaksi (Segmented Control) */}
      <motion.div
        variants={itemVariants}
        className="p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 grid grid-cols-3 gap-1 shadow-inner"
      >
        <button
          onClick={() => setFilterType('all')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center active:scale-95 ${
            filterType === 'all'
              ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Semua ({transactions.length})
        </button>
        <button
          onClick={() => setFilterType('income')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center active:scale-95 ${
            filterType === 'income'
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
              : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
          }`}
        >
          Pemasukan ({transactions.filter((t) => t.type === 'income').length})
        </button>
        <button
          onClick={() => setFilterType('expense')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center active:scale-95 ${
            filterType === 'expense'
              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/25'
              : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
          }`}
        >
          Pengeluaran ({transactions.filter((t) => t.type === 'expense').length})
        </button>
      </motion.div>

      {/* 4. Daftar Transaksi Terbaru (Modern List Card) */}
      <motion.div
        variants={itemVariants}
        className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
      >
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Daftar Rekam Transaksi
        </h3>

        {filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredTransactions.map((tx) => (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:translate-x-1 transition-all duration-200"
                >
                  {/* Category Icon & Details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {tx.category}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            tx.type === 'income'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {tx.note || 'Tanpa Catatan'}
                      </p>

                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-purple-500" />
                        <span>{formatDateTime(tx.date)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-200/60 dark:border-slate-700/60 gap-2 flex-shrink-0">
                    <p
                      className={`text-sm sm:text-base font-black ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'income' ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                    </p>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedTxForDetail(tx)}
                        className="p-2 rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 active:scale-90 transition-all"
                        title="Detail Transaksi"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(tx)}
                        className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 active:scale-90 transition-all"
                        title="Edit Transaksi"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTxToDeleteId(tx.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 active:scale-90 transition-all"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            Belum ada transaksi ditemukan.
          </div>
        )}
      </motion.div>

      {/* 3. Form Transaksi Modal (Tambah Transaksi) */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tambah Transaksi Baru">
        <form onSubmit={handleSubmitAdd} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900">
              {formError}
            </div>
          )}

          {/* Type Segmented Control */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tipe Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setFormType('income');
                  setFormCategory('');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  formType === 'income'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormType('expense');
                  setFormCategory('');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  formType === 'expense'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pengeluaran
              </button>
            </div>
          </div>

          {/* Input Nominal Dominan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nominal Transaksi (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-base">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
                value={formatNumericInput(formAmount)}
                onChange={(e) => setFormAmount(sanitizeNumericInput(e.target.value))}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3 text-lg font-black rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                required
              />
            </div>
          </div>


          {/* Tanggal & Waktu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal & Jam
            </label>
            <input
              type="datetime-local"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              required
            />
          </div>

          {/* Catatan / Keterangan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan
            </label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Catatan tambahan (opsional)..."
              rows={2}
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 text-xs font-bold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              Simpan Transaksi
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Transaksi */}
      <Modal isOpen={!!txToEdit} onClose={() => setTxToEdit(null)} title="Edit Transaksi">
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tipe Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setFormType('income');
                  setFormCategory('');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  formType === 'income'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormType('expense');
                  setFormCategory('');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  formType === 'expense'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pengeluaran
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nominal Transaksi (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-base">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
                value={formatNumericInput(formAmount)}
                onChange={(e) => setFormAmount(sanitizeNumericInput(e.target.value))}
                className="w-full pl-12 pr-4 py-3 text-lg font-black rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                required
              />
            </div>
          </div>


          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal & Jam
            </label>
            <input
              type="datetime-local"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan
            </label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTxToEdit(null)}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 text-xs font-bold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              Perbarui Transaksi
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail Transaksi */}
      <Modal
        isOpen={!!selectedTxForDetail}
        onClose={() => setSelectedTxForDetail(null)}
        title="Detail Transaksi"
      >
        {selectedTxForDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">ID Transaksi</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedTxForDetail.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Tipe</span>
                <span
                  className={`font-bold ${
                    selectedTxForDetail.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {selectedTxForDetail.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Kategori</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedTxForDetail.category}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Nominal</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {formatRupiah(selectedTxForDetail.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Tanggal & Jam</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatDateTime(selectedTxForDetail.date)}
                </span>
              </div>
            </div>

            <div>
              <span className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan</span>
              <p className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedTxForDetail.note || 'Tidak ada catatan.'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTxForDetail(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!txToDeleteId}
        onClose={() => setTxToDeleteId(null)}
        onConfirm={() => {
          if (txToDeleteId) onDeleteTransaction(txToDeleteId);
        }}
        title="Konfirmasi Hapus Transaksi"
        message="Apakah Anda yakin ingin menghapus data transaksi ini dari database Supabase? Tindakan ini tidak dapat dibatalkan."
      />
    </motion.div>
  );
};
