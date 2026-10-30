import cron from 'node-cron';
import { sendTelegramMessage } from './telegram.ts';

export interface ServerTransaction {
  id: string;
  user_id?: string;
  type: string; // 'income' | 'expense'
  amount: number;
  category: string;
  note?: string;
  date: string; // YYYY-MM-DD or ISO string
  created_at?: string;
  updated_at?: string;
}

let serverTransactions: ServerTransaction[] = [];

export function setServerTransactions(transactions: ServerTransaction[]) {
  serverTransactions = transactions;
}

export function getServerTransactions(): ServerTransaction[] {
  return serverTransactions;
}

export function addServerTransaction(tx: ServerTransaction) {
  serverTransactions.unshift(tx);
}

export function updateServerTransaction(id: string, tx: ServerTransaction) {
  const idx = serverTransactions.findIndex((t) => t.id === id);
  if (idx !== -1) {
    serverTransactions[idx] = tx;
  }
}

export function deleteServerTransaction(id: string) {
  serverTransactions = serverTransactions.filter((t) => t.id !== id);
}

// Unified balance calculation matching Dashboard calculation exactly
export function calculateTotalBalance(transactions: ServerTransaction[]): number {
  let balance = 0;
  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      balance += amt;
    } else {
      balance -= amt;
    }
  }
  return balance;
}

function formatRupiah(num: number): string {
  return 'Rp ' + Math.abs(num).toLocaleString('id-ID');
}

export async function sendDailyReport() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const dateFormatted = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${now.getFullYear()}`;

  const transactions = getServerTransactions();

  // Filter transactions for today
  const todayTxList = transactions.filter((tx) => {
    if (!tx.date) return false;
    return tx.date.startsWith(dateStr);
  });

  if (todayTxList.length === 0) {
    const emptyMessage = `📊 Laporan Harian

Tanggal: ${dateFormatted}

Tidak ada transaksi hari ini.`;

    const sent = await sendTelegramMessage(emptyMessage);
    if (sent) {
      console.log('Daily report sent');
    }
    return;
  }

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryExpenses: Record<string, number> = {};

  todayTxList.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
    }
    if (tx.type === 'expense') {
      categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + amt;
    }
  });

  const netBalance = totalIncome - totalExpense;

  // Find largest expense category
  let topCategory = 'Tidak ada';
  let topAmount = 0;
  Object.entries(categoryExpenses).forEach(([cat, amt]) => {
    if (amt > topAmount) {
      topAmount = amt;
      topCategory = cat;
    }
  });

  const largestCatStr =
    topAmount > 0 ? `${topCategory} (${formatRupiah(topAmount)})` : 'Tidak ada';

  const message = `📊 Laporan Harian

Tanggal: ${dateFormatted}

Total Pemasukan:
${formatRupiah(totalIncome)}

Total Pengeluaran:
${formatRupiah(totalExpense)}

Saldo Bersih:
${formatRupiah(netBalance)}

Jumlah Transaksi:
${todayTxList.length}

Kategori Pengeluaran Terbesar:
${largestCatStr}`;

  const sent = await sendTelegramMessage(message);
  if (sent) {
    console.log('Daily report sent');
  }
}

export function initDailyReportScheduler() {
  // Every day at 21:00 Asia/Jakarta time (cron: '0 21 * * *')
  cron.schedule(
    '0 21 * * *',
    () => {
      sendDailyReport();
    },
    {
      timezone: 'Asia/Jakarta',
    }
  );
}
