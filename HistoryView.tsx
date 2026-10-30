import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Calendar, ArrowUpDown, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, RotateCcw } from 'lucide-react';
import { Transaction, CategoryItem } from './types';
import { formatRupiah, formatDate, formatDateTime } from './formatters';

interface HistoryViewProps {
  transactions: Transaction[];
  categories: CategoryItem[];
  globalSearchQuery?: string;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export const HistoryView: React.FC<HistoryViewProps> = ({
  transactions,
  categories,
  globalSearchQuery = '',
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const effectiveSearch = search || globalSearchQuery;

  // Filter and Sort Pipeline
  const filteredAndSorted = useMemo(() => {
    return transactions
      .filter((t) => {
        // Search matching note or category or amount
        if (effectiveSearch) {
          const q = effectiveSearch.toLowerCase();
          const matchCategory = t.category.toLowerCase().includes(q);
          const matchNote = t.note ? t.note.toLowerCase().includes(q) : false;
          const matchAmount = String(t.amount).includes(q);
          if (!matchCategory && !matchNote && !matchAmount) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && t.category !== selectedCategory) {
          return false;
        }

        // Date range filter
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'highest') return b.amount - a.amount;
        if (sortBy === 'lowest') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, effectiveSearch, selectedCategory, startDate, endDate, sortBy]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredAndSorted, currentPage]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
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
      {/* View Header */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Riwayat Transaksi
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pencarian mendalam, penyaringan kategori, rentang tanggal, dan pengurutan data
        </p>
      </motion.div>

      {/* Filter Toolbar */}
      <motion.div
        variants={itemVariants}
        className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari kata kunci..."
              className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.type === 'income' ? 'Masuk' : 'Keluar'})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Option */}
          <div className="relative">
            <ArrowUpDown className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
            >
              <option value="newest">Urutkan: Terbaru</option>
              <option value="oldest">Urutkan: Terlama</option>
              <option value="highest">Urutkan: Nominal Terbesar</option>
              <option value="lowest">Urutkan: Nominal Terkecil</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
            <span>Reset Filter</span>
          </button>
        </div>

        {/* Date Range Inputs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
            <Calendar className="w-4 h-4 text-purple-500" /> Rentang Tanggal:
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto px-3.5 py-2 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
            />
            <span className="text-xs text-slate-400 font-bold shrink-0">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto px-3.5 py-2 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>
        </div>
      </motion.div>

      {/* History List Cards */}
      <motion.div
        variants={itemVariants}
        className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Hasil Pencarian ({filteredAndSorted.length} Transaksi)
          </h3>
        </div>

        {paginatedTransactions.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {paginatedTransactions.map((tx) => (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:translate-x-1 transition-all duration-200"
                >
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
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            tx.type === 'income'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {tx.type === 'income' ? 'Masuk' : 'Keluar'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {tx.note || 'Tanpa Catatan'}
                      </p>

                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatDateTime(tx.date)}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-black shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 dark:border-slate-700/60">
                    <span
                      className={`text-sm sm:text-base ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'income' ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            Tidak ada transaksi yang cocok dengan kriteria filter.
          </div>
        )}

        {/* Pagination Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Menampilkan {filteredAndSorted.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
            {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} dari {filteredAndSorted.length} data
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-2 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </button>
            <span className="font-bold text-slate-800 dark:text-slate-200 px-2">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-2 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 disabled:opacity-40 transition-all"
            >
              <ChevronRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
