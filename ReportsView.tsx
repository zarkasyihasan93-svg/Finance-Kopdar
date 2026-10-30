import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Calendar, ArrowUpRight, ArrowDownRight, Scale, FileText } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Transaction, BudgetItem, TodoItem } from './types';
import { formatRupiah, formatDate } from './formatters';
import { generateFinancialPDFReport } from './pdfExport';

interface ReportsViewProps {
  transactions: Transaction[];
  budgets?: BudgetItem[];
  todos?: TodoItem[];
  userName?: string;
  userId?: string;
}

type PeriodFilter = 'today' | 'this_month' | 'custom';

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  budgets = [],
  todos = [],
  userName = 'Pengguna App',
  userId,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [pdfNotice, setPdfNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Filter Transactions by selected period
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return false;

      if (period === 'today') {
        return t.date === todayStr;
      }
      if (period === 'this_month') {
        const d = new Date(t.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (period === 'custom') {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
      }
      return true;
    });
  }, [transactions, period, todayStr, now, startDate, endDate]);

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netDifference = totalIncome - totalExpense;

  // Expense breakdown by category for Pie Chart
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + (Number(t.amount) || 0);
      });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#f43f5e', '#06b6d4', '#64748b'];

  const getPeriodText = () => {
    if (period === 'today') return `Hari Ini (${formatDate(todayStr)})`;
    if (period === 'this_month') return `Bulan Ini (${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })})`;
    if (period === 'custom') {
      return `${startDate ? formatDate(startDate) : 'Awal'} s/d ${endDate ? formatDate(endDate) : 'Sekarang'}`;
    }
    return 'Semua Periode';
  };

  const handleDownloadPDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    setPdfNotice(null);
    try {
      const result = await generateFinancialPDFReport({
        title: 'Laporan Ringkasan Keuangan',
        periodText: getPeriodText(),
        totalIncome,
        totalExpense,
        netDifference,
        transactions: filteredTransactions,
        budgets,
        todos,
        userName,
        userId,
      });

      if (result.success) {
        setPdfNotice({ type: 'success', message: 'Laporan PDF diunduh & dikirim ke Telegram!' });
      } else {
        setPdfNotice({ type: 'error', message: result.message });
      }
    } catch (e: any) {
      console.error('Failed to generate PDF:', e);
      setPdfNotice({ type: 'error', message: 'Terjadi kesalahan saat memproses PDF.' });
    } finally {
      setIsGeneratingPDF(false);
    }
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
      {/* Header & Download PDF button */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Laporan Keuangan
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Analisis pengeluaran, pemasukan, dan cetak dokumen PDF resmi
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
        >
          {isGeneratingPDF ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating PDF & Telegram...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-white" />
              <span>Download PDF Report</span>
            </>
          )}
        </button>
      </motion.div>

      {/* PDF Notice Banner */}
      <AnimatePresence>
        {pdfNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between ${
              pdfNotice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}
          >
            <span>{pdfNotice.message}</span>
            <button
              onClick={() => setPdfNotice(null)}
              className="text-xs underline hover:opacity-80"
            >
              Tutup
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <motion.div
        variants={itemVariants}
        className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1.5 shrink-0">
            <Calendar className="w-4 h-4 text-purple-500" /> Filter Laporan:
          </span>
          <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 inline-flex gap-1">
            <button
              onClick={() => setPeriod('today')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                period === 'today'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPeriod('this_month')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                period === 'this_month'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                period === 'custom'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Custom Tanggal
            </button>
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
            />
            <span className="text-xs text-slate-400 font-bold shrink-0">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>
        )}
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div whileHover={{ y: -2 }} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pemasukan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatRupiah(totalIncome)}
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatRupiah(totalExpense)}
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selisih Net</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black ${
              netDifference >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatRupiah(netDifference)}
          </div>
        </motion.div>
      </motion.div>

      {/* Chart & Rincian Transaksi */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Distribusi Pengeluaran Per Kategori
          </h3>
          {expenseByCategory.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [formatRupiah(Number(value)), 'Nominal']} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-16 text-center">Tidak ada data pengeluaran untuk periode ini.</p>
          )}
        </div>

        {/* Period Transactions List */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Rincian Transaksi ({filteredTransactions.length})
              </h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                {getPeriodText()}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{tx.category}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.date)}</p>
                  </div>
                  <span
                    className={`font-black ${
                      tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {tx.type === 'income' ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                  </span>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <p className="text-xs text-slate-400 py-12 text-center">Tidak ada transaksi terdaftar.</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
