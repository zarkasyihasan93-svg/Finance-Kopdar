import cron from 'node-cron';
import { sendTelegramMessage } from './telegram.ts';
import { getServerTransactions } from './dailyReport.ts';

function formatRupiah(num: number): string {
  return 'Rp ' + Math.abs(num).toLocaleString('id-ID');
}

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

export async function sendMonthlyReport() {
  const now = new Date();
  // Get previous month
  let targetYear = now.getFullYear();
  let targetMonthIndex = now.getMonth() - 1; // 0-indexed
  if (targetMonthIndex < 0) {
    targetMonthIndex = 11;
    targetYear -= 1;
  }

  const targetMonthStr = (targetMonthIndex + 1).toString().padStart(2, '0');
  const yearMonthPrefix = `${targetYear}-${targetMonthStr}`;
  const periodLabel = `${MONTH_NAMES[targetMonthIndex]} ${targetYear}`;

  const allTx = getServerTransactions();
  const monthTxList = allTx.filter((tx) => tx.date && tx.date.startsWith(yearMonthPrefix));

  if (monthTxList.length === 0) {
    const emptyMessage = `📈 Laporan Bulanan

Periode: ${periodLabel}

Tidak ada transaksi pada bulan ini.`;

    const sent = await sendTelegramMessage(emptyMessage);
    if (sent) {
      console.log('Monthly report sent');
    }
    return;
  }

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryExpenses: Record<string, number> = {};

  monthTxList.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
      categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + amt;
    }
  });

  const netBalance = totalIncome - totalExpense;

  // Sort expense categories descending
  const sortedCategories = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);

  const top5 = sortedCategories.slice(0, 5);
  let top5Str = 'Tidak ada';
  if (top5.length > 0) {
    top5Str = top5.map(([cat, amt], idx) => `${idx + 1}. ${cat}: ${formatRupiah(amt)}`).join('\n');
  }

  let topCategoryStr = 'Tidak ada';
  if (sortedCategories.length > 0) {
    topCategoryStr = `${sortedCategories[0][0]} (${formatRupiah(sortedCategories[0][1])})`;
  }

  const message = `📈 Laporan Bulanan

Periode: ${periodLabel}

Total Income:
${formatRupiah(totalIncome)}

Total Expense:
${formatRupiah(totalExpense)}

Saldo Bersih:
${formatRupiah(netBalance)}

Jumlah Transaksi:
${monthTxList.length}

Top 5 Kategori Pengeluaran:
${top5Str}

Kategori dengan nominal terbesar:
${topCategoryStr}`;

  const sent = await sendTelegramMessage(message);
  if (sent) {
    console.log('Monthly report sent');
  }
}

export function initMonthlyReportScheduler() {
  // Every 1st day of the month at 08:00 Asia/Jakarta time (cron: '0 8 1 * *')
  cron.schedule(
    '0 8 1 * *',
    () => {
      sendMonthlyReport();
    },
    {
      timezone: 'Asia/Jakarta',
    }
  );
}
