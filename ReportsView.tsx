import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Calendar, ArrowUpRight, ArrowDownRight, Scale, PieChart as PieChartIcon } from 'lucide-react';
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

const MONTH_OPTIONS = [
  { value: 'all', label: 'Semua Bulan (Januari - Desember)' },
  { value: '0', label: 'Januari' },
  { value: '1', label: 'Februari' },
  { value: '2', label: 'Maret' },
  { value: '3', label: 'April' },
  { value: '4', label: 'Mei' },
  { value: '5', label: 'Juni' },
  { value: '6', label: 'Juli' },
  { value: '7', label: 'Agustus' },
  { value: '8', label: 'September' },
  { value: '9', label: 'Oktober' },
  { value: '10', label: 'November' },
  { value: '11', label: 'Desember' },
];

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  budgets = [],
  todos = [],
  userName = 'Pengguna App',
  userId,
}) => {
  const currentNow = new Date();
  const currentYearNum = currentNow.getFullYear();
  const currentMonthStr = String(currentNow.getMonth());

  // Dropdown states for Month & Year
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [chartViewMode, setChartViewMode] = useState<'summary' | 'categories'>('summary');

  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [pdfNotice, setPdfNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dynamic available years list
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    yearSet.add(currentYearNum);
    transactions.forEach((tx) => {
      if (tx.date) {
        const d = new Date(tx.date);
        if (!isNaN(d.getFullYear())) {
          yearSet.add(d.getFullYear());
        }
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [transactions, currentYearNum]);

  // Filter Transactions by selected Month and Year
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;

      // Filter by Year
      if (d.getFullYear() !== Number(selectedYear)) {
        return false;
      }

      // Filter by Month
      if (selectedMonth !== 'all') {
        if (d.getMonth() !== Number(selectedMonth)) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedYear, selectedMonth]);

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const netDifference = totalIncome - totalExpense;

  // Donut chart data: Pemasukan vs Pengeluaran
  const summaryChartData = useMemo(() => {
    const data = [];
    if (totalIncome > 0) {
      data.push({ name: 'Total Pemasukan', value: totalIncome, color: '#10b981' });
    }
    if (totalExpense > 0) {
      data.push({ name: 'Total Pengeluaran', value: totalExpense, color: '#f43f5e' });
    }
    return data;
  }, [totalIncome, totalExpense]);

  // Expense breakdown by category
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'Pengeluaran';
        map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
      });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const CATEGORY_COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#f43f5e', '#06b6d4', '#64748b'];

  const getPeriodText = () => {
    if (selectedMonth === 'all') {
      return `Rangkuman Semua Bulan ${selectedYear}`;
    }
    const monthName = MONTH_NAMES[Number(selectedMonth)] || '';
    return `${monthName} ${selectedYear}`;
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
            Analisis diagram bulat transaksi, perbandingan pemasukan & pengeluaran bulanan
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

      {/* 3. Dropdown Bulan & Tahun */}
      <motion.div
        variants={itemVariants}
        className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pilih Periode Bulan & Tahun</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih bulan spesifik (Januari - Desember) atau rangkuman semua bulan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Dropdown Bulan */}
            <div className="flex-1 sm:flex-initial">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Bulan:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-2.5 text-xs font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown Tahun */}
            <div className="flex-1 sm:flex-initial">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Tahun:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full sm:w-32 px-3.5 py-2.5 text-xs font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Button: Bulan Ini / Semua Bulan */}
            <div className="w-full sm:w-auto flex items-end gap-2 pt-1 sm:pt-5">
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(currentMonthStr);
                  setSelectedYear(currentYearNum);
                }}
                className={`flex-1 sm:flex-initial px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                  selectedMonth === currentMonthStr && selectedYear === currentYearNum
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth('all')}
                className={`flex-1 sm:flex-initial px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                  selectedMonth === 'all'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                Semua Bulan
              </button>
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <span>Menampilkan data laporan untuk:</span>
          <span className="font-bold text-purple-600 dark:text-purple-400">
            {getPeriodText()} ({filteredTransactions.length} transaksi)
          </span>
        </div>
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
          <div className="text-[11px] text-slate-400">
            {selectedMonth === 'all' ? `Akumulasi tahun ${selectedYear}` : `Bulan ${MONTH_NAMES[Number(selectedMonth)] || ''} ${selectedYear}`}
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
          <div className="text-[11px] text-slate-400">
            {selectedMonth === 'all' ? `Akumulasi tahun ${selectedYear}` : `Bulan ${MONTH_NAMES[Number(selectedMonth)] || ''} ${selectedYear}`}
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selisih Net (Arus Kas)</span>
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
          <div className="text-[11px] text-slate-400">
            {netDifference >= 0 ? 'Surplus Keuangan' : 'Defisit Keuangan'}
          </div>
        </motion.div>
      </motion.div>

      {/* 3. Diagram Bulat Rangkuman Transaksi */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-600" />
                <span>Diagram Bulat Rangkuman Transaksi</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {getPeriodText()}
              </p>
            </div>

            {/* View Mode Toggle: Summary (Income vs Expense) vs Categories */}
            <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 inline-flex gap-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartViewMode('summary')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  chartViewMode === 'summary'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Pemasukan vs Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('categories')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  chartViewMode === 'categories'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Kategori
              </button>
            </div>
          </div>

          {/* Donut Chart Canvas */}
          {chartViewMode === 'summary' ? (
            summaryChartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summaryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {summaryChartData.map((entry, index) => (
                        <Cell key={`summary-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [formatRupiah(Number(value)), 'Nominal']} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400">
                Belum ada transaksi pemasukan maupun pengeluaran untuk {getPeriodText()}.
              </div>
            )
          ) : (
            expenseByCategory.length > 0 ? (
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
                        <Cell key={`cat-cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [formatRupiah(Number(value)), 'Nominal']} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400">
                Tidak ada data pengeluaran berkategori untuk {getPeriodText()}.
              </div>
            )
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
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {tx.note || tx.category}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.date)}</p>
                  </div>
                  <span
                    className={`font-black shrink-0 ${
                      tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {tx.type === 'income' ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                  </span>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <p className="text-xs text-slate-400 py-12 text-center">
                  Tidak ada transaksi terdaftar untuk {getPeriodText()}.
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
