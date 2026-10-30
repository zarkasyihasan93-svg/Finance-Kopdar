import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Transaction, BudgetItem, TodoItem } from './types';
import { formatRupiah, formatDate, formatDateTime } from './formatters';

export interface ReportPDFProps {
  title?: string;
  periodText: string;
  totalIncome: number;
  totalExpense: number;
  netDifference: number;
  transactions: Transaction[];
  budgets?: BudgetItem[];
  todos?: TodoItem[];
  userName?: string;
  userId?: string;
}

export interface PDFExportResult {
  success: boolean;
  message: string;
}

export async function generateFinancialPDFReport({
  periodText,
  totalIncome,
  totalExpense,
  netDifference,
  transactions = [],
  budgets = [],
  todos = [],
  userName = 'Pengguna App',
  userId,
}: ReportPDFProps): Promise<PDFExportResult> {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr =
    now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';

  const isoDateStr = now.toISOString().split('T')[0];
  const formattedTime =
    now.getHours().toString().padStart(2, '0') +
    '-' +
    now.getMinutes().toString().padStart(2, '0');
  const filename = `FinanceFlow_Report_${isoDateStr}_${formattedTime}.pdf`;
  const reportRefId = `FF-RPT-${isoDateStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  console.log('[PDF] Generating report for user:', userName, 'Period:', periodText);

  // --- ANALYTICAL CALCULATIONS ---
  const incomeTxs = transactions.filter((t) => t.type === 'income');
  const expenseTxs = transactions.filter((t) => t.type === 'expense');

  // Expense by category breakdown
  const expenseByCatMap: Record<string, number> = {};
  expenseTxs.forEach((t) => {
    expenseByCatMap[t.category] = (expenseByCatMap[t.category] || 0) + (Number(t.amount) || 0);
  });

  const expenseCategoryList = Object.entries(expenseByCatMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategory = expenseCategoryList[0] || { category: 'Belum Ada', amount: 0, percentage: 0 };

  // Income by category breakdown
  const incomeByCatMap: Record<string, number> = {};
  incomeTxs.forEach((t) => {
    incomeByCatMap[t.category] = (incomeByCatMap[t.category] || 0) + (Number(t.amount) || 0);
  });

  const incomeCategoryList = Object.entries(incomeByCatMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Top Individual Transactions
  const topExpenseTx = [...expenseTxs].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  const topIncomeTx = [...incomeTxs].sort((a, b) => Number(b.amount) - Number(a.amount))[0];

  // Financial Health Score Calculation (0 - 100)
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;
  const expenseRatio = totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;
  
  let healthScore = 50;
  if (totalIncome > 0) {
    if (savingsRate >= 40) healthScore += 35;
    else if (savingsRate >= 20) healthScore += 25;
    else if (savingsRate >= 10) healthScore += 15;
    else healthScore += 5;

    if (expenseRatio <= 60) healthScore += 15;
    else if (expenseRatio <= 80) healthScore += 10;
  } else {
    healthScore = 40;
  }
  healthScore = Math.min(100, Math.max(0, healthScore));

  let healthStatusText = 'Need Improvement';
  let healthStatusColor = '#EF4444';
  if (healthScore >= 80) {
    healthStatusText = 'Excellent';
    healthStatusColor = '#10B981';
  } else if (healthScore >= 65) {
    healthStatusText = 'Good';
    healthStatusColor = '#255BFF';
  } else if (healthScore >= 50) {
    healthStatusText = 'Fair';
    healthStatusColor = '#F59E0B';
  }

  const avgDailyExpense = Math.round(totalExpense / 30);

  // Todos Analysis
  const activeTodos = todos.filter((t) => t.status !== 'Done');
  const doneTodos = todos.filter((t) => t.status === 'Done');
  const highPriorityTodos = activeTodos.filter((t) => t.priority === 'High');
  const todoCompletionPct = todos.length > 0 ? Math.round((doneTodos.length / todos.length) * 100) : 0;

  // Budget Status Analysis
  const budgetAnalysis = budgets.map((b) => {
    const spent = expenseByCatMap[b.category] || 0;
    const target = Number(b.amount) || 0;
    const pct = target > 0 ? Math.round((spent / target) * 100) : 0;
    return { ...b, spent, target, pct };
  });
  const totalBudgeted = budgets.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const totalBudgetSpent = budgetAnalysis.reduce((acc, b) => acc + b.spent, 0);
  const overallBudgetPct = totalBudgeted > 0 ? Math.round((totalBudgetSpent / totalBudgeted) * 100) : 0;
  const warningBudgets = budgetAnalysis.filter((b) => b.pct >= 80);

  // Calculate Running Balances for Bank Statement Page
  const sortedTxsForStatement = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  let runningAcc = 0;
  const statementItems = sortedTxsForStatement.map((tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      runningAcc += amt;
    } else {
      runningAcc -= amt;
    }
    return { ...tx, runningBalance: runningAcc };
  }).reverse(); // Latest on top for bank statement

  // Palette
  const CATEGORY_COLORS = [
    '#255BFF',
    '#7D5CFF',
    '#10B981',
    '#F59E0B',
    '#EC4899',
    '#06B6D4',
    '#8B5CF6',
    '#64748B',
  ];

  // Donut slices SVG
  let donutOffset = 0;
  const donutSlicesSVG = expenseCategoryList
    .map((item, idx) => {
      const pct = item.percentage;
      const strokeDasharray = `${pct} ${100 - pct}`;
      const strokeDashoffset = -donutOffset;
      donutOffset += pct;
      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

      return `
      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent"
              stroke="${color}" stroke-width="6.5"
              stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"></circle>
    `;
    })
    .join('');

  // 3D Vector Art SVG Assets
  const cover3DArtSVG = `
    <svg width="380" height="240" viewBox="0 0 380 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardGrad1" x1="0" y1="0" x2="280" y2="170" gradientUnits="userSpaceOnUse">
          <stop stop-color="#255BFF"/>
          <stop offset="1" stop-color="#7D5CFF"/>
        </linearGradient>
        <linearGradient id="cardGrad2" x1="0" y1="0" x2="240" y2="150" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0F2E5C"/>
          <stop offset="1" stop-color="#255BFF"/>
        </linearGradient>
        <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop stop-color="#255BFF" stop-opacity="0.5"/>
          <stop offset="1" stop-color="#7D5CFF" stop-opacity="0"/>
        </linearGradient>
        <filter id="shadow1" x="-20" y="-20" width="340" height="240" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#071B35" flood-opacity="0.5"/>
        </filter>
        <filter id="shadow2" x="-10" y="-10" width="110" height="110" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#7D5CFF" flood-opacity="0.45"/>
        </filter>
      </defs>

      <!-- Glow Ambient Ring -->
      <circle cx="190" cy="120" r="115" fill="url(#glowGrad)"/>

      <!-- Back Card 3D -->
      <g filter="url(#shadow1)">
        <rect x="65" y="25" width="245" height="145" rx="22" fill="url(#cardGrad2)" transform="rotate(-9 180 95)"/>
        <rect x="90" y="60" width="42" height="30" rx="7" fill="#F59E0B" opacity="0.85" transform="rotate(-9 180 95)"/>
        <circle cx="260" cy="130" r="16" fill="#FFFFFF" opacity="0.2" transform="rotate(-9 180 95)"/>
        <circle cx="276" cy="130" r="16" fill="#5A7DFF" opacity="0.4" transform="rotate(-9 180 95)"/>
      </g>

      <!-- Front Premium Credit Card 3D -->
      <g filter="url(#shadow1)">
        <rect x="85" y="55" width="245" height="145" rx="22" fill="url(#cardGrad1)"/>
        <rect x="110" y="90" width="44" height="32" rx="8" fill="#FFD700"/>
        <path d="M110 106H154" stroke="#D97706" stroke-width="2"/>
        <text x="110" y="160" fill="#FFFFFF" font-family="sans-serif" font-weight="800" font-size="13" letter-spacing="2">•••• •••• •••• 9821</text>
        <circle cx="275" cy="160" r="18" fill="#FFFFFF" opacity="0.3"/>
        <circle cx="293" cy="160" r="18" fill="#FF5A7D" opacity="0.85"/>
      </g>

      <!-- Floating Wallet Badge -->
      <g filter="url(#shadow2)">
        <circle cx="65" cy="155" r="36" fill="#FFFFFF"/>
        <path d="M48 147C48 143.134 51.134 140 55 140H75C78.866 140 82 143.134 82 147V167C82 170.866 78.866 174 75 174H55C51.134 174 48 170.866 48 167V147Z" fill="#255BFF"/>
        <path d="M72 153H80V161H72V153Z" fill="#FFD700"/>
      </g>

      <!-- Floating Gold Coin 3D -->
      <circle cx="325" cy="40" r="22" fill="#FFD700"/>
      <circle cx="325" cy="40" r="17" fill="#F59E0B"/>
      <text x="318" y="47" fill="#FFFFFF" font-family="sans-serif" font-weight="900" font-size="17">Rp</text>

      <!-- Floating Growth Badge -->
      <circle cx="45" cy="75" r="16" fill="#10B981"/>
      <path d="M38 75L44 69L52 77" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // --- OFFSCREEN HTML RENDERER SETUP ---
  const container = document.createElement('div');
  container.id = 'pdf-export-temp-container';
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '800px';
  container.style.background = '#071B35';
  container.style.fontFamily = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
  container.style.color = '#0F172A';

  const styleHeader = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .pdf-page {
        width: 800px;
        height: 1131px;
        background: #F8FAFC;
        padding: 40px 44px;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .cover-page {
        background: linear-gradient(135deg, #071B35 0%, #0F2E5C 55%, #1A3660 100%);
        color: #FFFFFF;
      }
      .dark-page {
        background: linear-gradient(135deg, #071B35 0%, #0B2545 100%);
        color: #FFFFFF;
      }
      .card-modern {
        background: #FFFFFF;
        border-radius: 18px;
        border: 1px solid #E2E8F0;
        box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
        padding: 20px;
      }
      .card-dark {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        padding: 20px;
        color: #FFFFFF;
      }
      .badge-pill {
        display: inline-block;
        padding: 5px 12px;
        border-radius: 30px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.6px;
      }
      .header-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 14px;
        border-bottom: 2px solid #E2E8F0;
      }
      .header-bar-dark {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      }
      .footer-bar {
        font-size: 10px;
        color: #94A3B8;
        border-top: 1px solid #E2E8F0;
        padding-top: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    </style>
  `;

  container.innerHTML = `
    ${styleHeader}

    <!-- ================= HALAMAN 1: COVER PREMIUM ================= -->
    <div class="pdf-page cover-page" id="pdf-page-1">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 36px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; border-radius: 16px; background: linear-gradient(135deg, #255BFF, #7D5CFF); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(37, 91, 255, 0.45);">
              <span style="color: #FFFFFF; font-weight: 900; font-size: 24px;">F</span>
            </div>
            <div>
              <h1 style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #FFFFFF;">FinanceFlow</h1>
              <p style="font-size: 10px; font-weight: 800; color: #5A7DFF; letter-spacing: 1.8px; text-transform: uppercase;">Personal Wealth Intelligence</p>
            </div>
          </div>
          <div style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.18); padding: 8px 18px; border-radius: 30px; font-size: 11px; font-weight: 800; color: #A5B4FC;">
            EKSKLUSIF FINANCIAL REPORT
          </div>
        </div>

        <div style="margin-bottom: 32px;">
          <p style="color: #5A7DFF; font-size: 13px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 8px;">LAPORAN KELEMBAGAAN & PERSONAL</p>
          <h1 style="font-size: 44px; font-weight: 900; line-height: 1.1; color: #FFFFFF; margin-bottom: 16px;">
            Ikhtisar & Analisis<br/><span style="background: linear-gradient(90deg, #5A7DFF, #7D5CFF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Keuangan Digital</span>
          </h1>
          <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; max-width: 560px;">
            Dokumen analisis keuangan resmi yang merangkum kinerja keuangan, arus kas, efisiensi anggaran, dan rekomendasi finansial secara otomatis.
          </p>
        </div>

        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 22px; padding: 24px; margin-bottom: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p style="color: #64748B; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">NAMA PENGGUNA</p>
            <p style="color: #FFFFFF; font-size: 17px; font-weight: 800;">${userName}</p>
          </div>
          <div>
            <p style="color: #64748B; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">PERIODE LAPORAN</p>
            <p style="color: #5A7DFF; font-size: 17px; font-weight: 800;">${periodText}</p>
          </div>
          <div>
            <p style="color: #64748B; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">TANGGAL GENERATE</p>
            <p style="color: #CBD5E1; font-size: 13px; font-weight: 700;">${dateStr}</p>
          </div>
          <div>
            <p style="color: #64748B; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">WAKTU GENERATE</p>
            <p style="color: #CBD5E1; font-size: 13px; font-weight: 700;">${timeStr}</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 28px;">
          <div style="background: rgba(37, 91, 255, 0.16); border: 1px solid rgba(37, 91, 255, 0.35); border-radius: 16px; padding: 16px;">
            <p style="color: #A5B4FC; font-size: 10px; font-weight: 800; text-transform: uppercase;">SALDO NETT</p>
            <p style="color: ${netDifference >= 0 ? '#38BDF8' : '#F87171'}; font-size: 18px; font-weight: 900; margin-top: 4px;">${formatRupiah(netDifference)}</p>
          </div>
          <div style="background: rgba(16, 185, 129, 0.16); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 16px; padding: 16px;">
            <p style="color: #6EE7B7; font-size: 10px; font-weight: 800; text-transform: uppercase;">TOTAL PEMASUKAN</p>
            <p style="color: #34D399; font-size: 18px; font-weight: 900; margin-top: 4px;">${formatRupiah(totalIncome)}</p>
          </div>
          <div style="background: rgba(239, 68, 68, 0.16); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 16px; padding: 16px;">
            <p style="color: #FCA5A5; font-size: 10px; font-weight: 800; text-transform: uppercase;">TOTAL PENGELUARAN</p>
            <p style="color: #F87171; font-size: 18px; font-weight: 900; margin-top: 4px;">${formatRupiah(totalExpense)}</p>
          </div>
        </div>

        <div style="display: flex; justify-content: center; align-items: center; padding-top: 8px;">
          ${cover3DArtSVG}
        </div>
      </div>

      <div class="footer-bar" style="border-color: rgba(255, 255, 255, 0.1); color: #64748B;">
        <span>FinanceFlow Executive Report • ID: ${reportRefId}</span>
        <span>Halaman 1 dari 10</span>
      </div>
    </div>


    <!-- ================= HALAMAN 2: EXECUTIVE SUMMARY ================= -->
    <div class="pdf-page" id="pdf-page-2">
      <div>
        <div class="header-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #255BFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px;">F</div>
            <div>
              <h2 style="font-size: 18px; font-weight: 900; color: #0F172A;">Executive Summary</h2>
              <p style="font-size: 10px; color: #64748B; font-weight: 600;">Ringkasan eksekutif dan status performa finansial</p>
            </div>
          </div>
          <span class="badge-pill" style="background: #EEF2FF; color: #255BFF;">HALAMAN 2 • RINGKASAN</span>
        </div>

        <div class="card-modern" style="border-left: 6px solid #255BFF; margin-bottom: 24px; background: #FAF5FF;">
          <h3 style="font-size: 12px; font-weight: 800; color: #1E1B4B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">NARASI KINERJA KEUANGAN</h3>
          <p style="font-size: 13px; line-height: 1.8; color: #334155; font-weight: 500;">
            Pada periode <strong>${periodText}</strong>, sistem mencatat total penerimaan sebesar 
            <strong style="color: #10B981;">${formatRupiah(totalIncome)}</strong> serta pengeluaran operasional sebesar 
            <strong style="color: #EF4444;">${formatRupiah(totalExpense)}</strong>. Hasil operasional keuangan menunjukkan posisi 
            <strong style="color: ${netDifference >= 0 ? '#255BFF' : '#EF4444'};">${netDifference >= 0 ? 'Surplus' : 'Defisit'} bernilai ${formatRupiah(netDifference)}</strong>.
          </p>
          <p style="font-size: 13px; line-height: 1.8; color: #334155; font-weight: 500; margin-top: 10px;">
            Pengeluaran terbesar dialokasikan pada kategori <strong>${topCategory.category}</strong> sejumlah 
            <strong>${formatRupiah(topCategory.amount)}</strong> (${topCategory.percentage}%). Rasio efisiensi tabungan berada pada tingkat <strong>${savingsRate}%</strong>.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div class="card-modern" style="padding: 18px;">
            <p style="font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase;">RASIO PENGELUARAN VS PEMASUKAN</p>
            <h4 style="font-size: 24px; font-weight: 900; color: ${expenseRatio > 80 ? '#EF4444' : '#255BFF'}; margin-top: 6px;">${expenseRatio}%</h4>
            <p style="font-size: 11px; color: #64748B; margin-top: 4px;">${expenseRatio <= 70 ? 'Arus kas berada pada posisi sangat sehat.' : 'Pengeluaran mendekati batas ideal.'}</p>
          </div>
          <div class="card-modern" style="padding: 18px;">
            <p style="font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase;">RASIO TABUNGAN (SAVINGS RATE)</p>
            <h4 style="font-size: 24px; font-weight: 900; color: #10B981; margin-top: 6px;">${savingsRate}%</h4>
            <p style="font-size: 11px; color: #64748B; margin-top: 4px;">Persentase surplus dana yang berhasil ditabung.</p>
          </div>
        </div>

        <div class="card-modern" style="padding: 20px;">
          <h4 style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 12px;">RINGKASAN METRIK UTAMA</h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
              <span style="font-size: 12px; color: #64748B; font-weight: 600;">Total Catatan Transaksi</span>
              <span style="font-size: 12px; color: #0F172A; font-weight: 800;">${transactions.length} Items</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
              <span style="font-size: 12px; color: #64748B; font-weight: 600;">Rata-rata Pengeluaran Harian</span>
              <span style="font-size: 12px; color: #0F172A; font-weight: 800;">${formatRupiah(avgDailyExpense)} / Hari</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
              <span style="font-size: 12px; color: #64748B; font-weight: 600;">Alokasi Anggaran Bulanan</span>
              <span style="font-size: 12px; color: #0F172A; font-weight: 800;">${budgets.length} Kategori (${formatRupiah(totalBudgeted)})</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 12px; color: #64748B; font-weight: 600;">Agenda & Tugas Belum Selesai</span>
              <span style="font-size: 12px; color: #0F172A; font-weight: 800;">${activeTodos.length} Agenda</span>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar">
        <span>FinanceFlow Executive Report • User: ${userName}</span>
        <span>Halaman 2 dari 10</span>
      </div>
    </div>


    <!-- ================= HALAMAN 3: FINANCIAL HEALTH SCORE ================= -->
    <div class="pdf-page" id="pdf-page-3">
      <div>
        <div class="header-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #255BFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px;">F</div>
            <div>
              <h2 style="font-size: 18px; font-weight: 900; color: #0F172A;">Financial Health & Score</h2>
              <p style="font-size: 10px; color: #64748B; font-weight: 600;">Indikator kesehatan keuangan berbasis algoritma cerdas</p>
            </div>
          </div>
          <span class="badge-pill" style="background: #EEF2FF; color: #255BFF;">HALAMAN 3 • FINANCIAL HEALTH</span>
        </div>

        <div class="card-modern" style="padding: 24px; margin-bottom: 24px; background: linear-gradient(135deg, #071B35, #0F2E5C); color: #FFFFFF; text-align: center;">
          <p style="font-size: 11px; font-weight: 800; color: #A5B4FC; text-transform: uppercase; letter-spacing: 1.5px;">SKOR KESEHATAN KEUANGAN</p>
          <div style="margin: 16px 0; display: inline-flex; align-items: center; justify-content: center; width: 120px; height: 120px; border-radius: 50%; border: 8px solid ${healthStatusColor}; box-shadow: 0 0 30px ${healthStatusColor}40;">
            <span style="font-size: 38px; font-weight: 900; color: #FFFFFF;">${healthScore}</span>
          </div>
          <h3 style="font-size: 20px; font-weight: 900; color: ${healthStatusColor}; text-transform: uppercase;">
            ${healthStatusText}
          </h3>
          <p style="font-size: 12px; color: #94A3B8; margin-top: 6px; max-width: 480px; margin-left: auto; margin-right: auto;">
            Evaluasi skor dihitung dari stabilitas arus kas, persentase tabungan, efisiensi konsumsi harian, serta kepatuhan anggaran.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="card-modern">
            <h4 style="font-size: 12px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 8px;">STABILITAS CASHFLOW</h4>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 18px; font-weight: 900; color: #10B981;">Tinggi</span>
              <span class="badge-pill" style="background: #ECFDF5; color: #10B981;">Aman</span>
            </div>
            <p style="font-size: 11px; color: #64748B; margin-top: 6px;">Pemasukan melebihi batas pengeluaran rutin.</p>
          </div>

          <div class="card-modern">
            <h4 style="font-size: 12px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 8px;">EFISIENSI ANGGARAN</h4>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 18px; font-weight: 900; color: #255BFF;">${100 - overallBudgetPct}% Optimal</span>
              <span class="badge-pill" style="background: #EEF2FF; color: #255BFF;">Terkontrol</span>
            </div>
            <p style="font-size: 11px; color: #64748B; margin-top: 6px;">Alokasi pos pengeluaran berada dalam batas rencana.</p>
          </div>

          <div class="card-modern">
            <h4 style="font-size: 12px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 8px;">RASIO DANA CADANGAN</h4>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 18px; font-weight: 900; color: #7D5CFF;">${savingsRate}% Income</span>
              <span class="badge-pill" style="background: #F3E8FF; color: #7D5CFF;">Ideal</span>
            </div>
            <p style="font-size: 11px; color: #64748B; margin-top: 6px;">Kecepatan akumulasi akumulasi dana simpanan.</p>
          </div>

          <div class="card-modern">
            <h4 style="font-size: 12px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 8px;">RISIKO DEFISIT</h4>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 18px; font-weight: 900; color: ${netDifference >= 0 ? '#10B981' : '#EF4444'};">${netDifference >= 0 ? 'Rendah' : 'Tinggi'}</span>
              <span class="badge-pill" style="background: ${netDifference >= 0 ? '#ECFDF5' : '#FEF2F2'}; color: ${netDifference >= 0 ? '#10B981' : '#EF4444'};">${netDifference >= 0 ? 'Stabil' : 'Waspada'}</span>
            </div>
            <p style="font-size: 11px; color: #64748B; margin-top: 6px;">Potensi terjadinya pembengkakan pengeluaran.</p>
          </div>
        </div>
      </div>

      <div class="footer-bar">
        <span>FinanceFlow Executive Report • User: ${userName}</span>
        <span>Halaman 3 dari 10</span>
      </div>
    </div>


    <!-- ================= HALAMAN 4: DASHBOARD ANALYTICS ================= -->
    <div class="pdf-page" id="pdf-page-4">
      <div>
        <div class="header-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #255BFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px;">F</div>
            <div>
              <h2 style="font-size: 18px; font-weight: 900; color: #0F172A;">Dashboard Analytics</h2>
              <p style="font-size: 10px; color: #64748B; font-weight: 600;">Visualisasi grafik tren dan ketersediaan dana</p>
            </div>
          </div>
          <span class="badge-pill" style="background: #EEF2FF; color: #255BFF;">HALAMAN 4 • ANALYTICS</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div class="card-modern" style="background: linear-gradient(135deg, #071B35, #0F2E5C); color: #FFFFFF; padding: 22px;">
            <p style="font-size: 11px; font-weight: 800; color: #A5B4FC; text-transform: uppercase;">SALDO NETT KEUANGAN</p>
            <h3 style="font-size: 24px; font-weight: 900; margin-top: 8px; color: ${netDifference >= 0 ? '#38BDF8' : '#F87171'};">
              ${formatRupiah(netDifference)}
            </h3>
            <p style="font-size: 11px; color: #94A3B8; margin-top: 6px;">Akumulasi sisa dana bersih saat ini.</p>
          </div>

          <div class="card-modern" style="background: #ECFDF5; border-color: #A7F3D0; padding: 22px;">
            <p style="font-size: 11px; font-weight: 800; color: #065F46; text-transform: uppercase;">TOTAL INFLOW (PEMASUKAN)</p>
            <h3 style="font-size: 24px; font-weight: 900; margin-top: 8px; color: #059669;">
              ${formatRupiah(totalIncome)}
            </h3>
            <p style="font-size: 11px; color: #047857; margin-top: 6px;">Total penerimaan kas periode ini.</p>
          </div>
        </div>

        <div class="card-modern" style="padding: 24px;">
          <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 16px;">
            Grafik Tren Keuangan (Pemasukan vs Pengeluaran)
          </h3>
          <div style="display: flex; justify-content: center; align-items: center; padding: 10px 0;">
            <svg width="680" height="220" viewBox="0 0 680 220" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="incAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop stop-color="#10B981" stop-opacity="0.35"/>
                  <stop offset="1" stop-color="#10B981" stop-opacity="0"/>
                </linearGradient>
                <linearGradient id="expAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop stop-color="#EF4444" stop-opacity="0.25"/>
                  <stop offset="1" stop-color="#EF4444" stop-opacity="0"/>
                </linearGradient>
              </defs>

              <line x1="40" y1="30" x2="650" y2="30" stroke="#F1F5F9" stroke-width="1.5"/>
              <line x1="40" y1="80" x2="650" y2="80" stroke="#F1F5F9" stroke-width="1.5"/>
              <line x1="40" y1="130" x2="650" y2="130" stroke="#F1F5F9" stroke-width="1.5"/>
              <line x1="40" y1="180" x2="650" y2="180" stroke="#E2E8F0" stroke-width="2"/>

              <path d="M40 180 Q180 60 330 110 T650 40 L650 180 Z" fill="url(#incAreaGrad)"/>
              <path d="M40 180 Q180 60 330 110 T650 40" stroke="#10B981" stroke-width="3.5" stroke-linecap="round"/>

              <path d="M40 180 Q180 120 330 140 T650 90 L650 180 Z" fill="url(#expAreaGrad)"/>
              <path d="M40 180 Q180 120 330 140 T650 90" stroke="#EF4444" stroke-width="3.5" stroke-linecap="round"/>

              <circle cx="330" cy="110" r="6" fill="#10B981" stroke="#FFFFFF" stroke-width="2"/>
              <circle cx="650" cy="40" r="6" fill="#10B981" stroke="#FFFFFF" stroke-width="2"/>
              <circle cx="330" cy="140" r="6" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
              <circle cx="650" cy="90" r="6" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>

              <text x="40" y="200" fill="#94A3B8" font-size="11" font-weight="700">Awal Periode</text>
              <text x="310" y="200" fill="#94A3B8" font-size="11" font-weight="700">Pertengahan</text>
              <text x="600" y="200" fill="#94A3B8" font-size="11" font-weight="700">Akhir Periode</text>
            </svg>
          </div>
          <div style="display: flex; justify-content: center; gap: 30px; margin-top: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 12px; height: 12px; border-radius: 50%; background: #10B981;"></span>
              <span style="font-size: 11px; font-weight: 800; color: #0F172A;">Pemasukan (${formatRupiah(totalIncome)})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 12px; height: 12px; border-radius: 50%; background: #EF4444;"></span>
              <span style="font-size: 11px; font-weight: 800; color: #0F172A;">Pengeluaran (${formatRupiah(totalExpense)})</span>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar">
        <span>FinanceFlow Executive Report • User: ${userName}</span>
        <span>Halaman 4 dari 10</span>
      </div>
    </div>


    <!-- ================= HALAMAN 5: INCOME VS EXPENSE ================= -->
    <div class="pdf-page" id="pdf-page-5">
      <div>
        <div class="header-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #255BFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px;">F</div>
            <div>
              <h2 style="font-size: 18px; font-weight: 900; color: #0F172A;">Income vs Expense Breakdown</h2>
              <p style="font-size: 10px; color: #64748B; font-weight: 600;">Komparasi detail arus kas masuk dan arus kas keluar</p>
            </div>
          </div>
          <span class="badge-pill" style="background: #EEF2FF; color: #255BFF;">HALAMAN 5 • CASHFLOW</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
          <div class="card-modern">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #F1F5F9;">
              <h3 style="font-size: 13px; font-weight: 800; color: #059669;">↓ PEMASUKAN UTAMA</h3>
              <span class="badge-pill" style="background: #ECFDF5; color: #10B981;">${incomeCategoryList.length} Kategori</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${incomeCategoryList.map((cat) => `
                <div style="padding: 10px; background: #F8FAFC; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <p style="font-size: 12px; font-weight: 800; color: #0F172A;">${cat.category}</p>
                    <p style="font-size: 10px; color: #64748B;">Kontribusi: ${cat.percentage}%</p>
                  </div>
                  <span style="font-size: 13px; font-weight: 900; color: #059669;">${formatRupiah(cat.amount)}</span>
                </div>
              `).join('')}
              ${incomeCategoryList.length === 0 ? '<p style="font-size: 12px; color: #94A3B8;">Belum ada pemasukan.</p>' : ''}
            </div>
          </div>

          <div class="card-modern">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #F1F5F9;">
              <h3 style="font-size: 13px; font-weight: 800; color: #DC2626;">↑ PENGELUARAN UTAMA</h3>
              <span class="badge-pill" style="background: #FEF2F2; color: #EF4444;">${expenseCategoryList.length} Kategori</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${expenseCategoryList.slice(0, 5).map((cat) => `
                <div style="padding: 10px; background: #F8FAFC; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <p style="font-size: 12px; font-weight: 800; color: #0F172A;">${cat.category}</p>
                    <p style="font-size: 10px; color: #64748B;">Porsi: ${cat.percentage}%</p>
                  </div>
                  <span style="font-size: 13px; font-weight: 900; color: #DC2626;">${formatRupiah(cat.amount)}</span>
                </div>
              `).join('')}
              ${expenseCategoryList.length === 0 ? '<p style="font-size: 12px; color: #94A3B8;">Belum ada pengeluaran.</p>' : ''}
            </div>
          </div>
        </div>

        <div class="card-modern" style="padding: 24px;">
          <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 16px;">Rasio Perbandingan Total Nominal</h3>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 12px; font-weight: 800; color: #059669;">Total Pemasukan</span>
                <span style="font-size: 12px; font-weight: 900; color: #059669;">${formatRupiah(totalIncome)}</span>
              </div>
              <div style="width: 100%; height: 16px; background: #E2E8F0; border-radius: 20px; overflow: hidden;">
                <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #10B981, #34D399); border-radius: 20px;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 12px; font-weight: 800; color: #DC2626;">Total Pengeluaran</span>
                <span style="font-size: 12px; font-weight: 900; color: #DC2626;">${formatRupiah(totalExpense)}</span>
              </div>
              <div style="width: 100%; height: 16px; background: #E2E8F0; border-radius: 20px; overflow: hidden;">
                <div style="width: ${totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 100}%; height: 100%; background: linear-gradient(90deg, #EF4444, #F87171); border-radius: 20px;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar">
        <span>FinanceFlow Executive Report • User: ${userName}</span>
        <span>Halaman 5 dari 10</span>
      </div>
    </div>


    <!-- ================= HALAMAN 6: BUDGET ANALYSIS ================= -->
    <div class="pdf-page" id="pdf-page-6">
      <div>
        <div class="header-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #255BFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px;">F</div>
            <div>
              <h2 style="font-size: 18px; font-weight: 900; color: #0F172A;">Budget Analysis & Compliance</h2>
              <p style="font-size: 10px; color: #64748B; font-weight: 600;">Pemantauan penetapan dan alokasi anggaran bulanan</p>
            </div>
          </div>
          <span class="badge-pill" style="background: #EEF2FF; color: #255BFF;">HALAMAN 6 • BUDGET</span>
        </div>

        <div class="card-modern" style="margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, #071B35, #1E3A8A); color: #FFFFFF;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 11px; font-weight: 800; color: #A5B4FC; text-transform: uppercase;">STATUS KESELURUHAN ANGGARAN</span>
            <span class="badge-pill" style="background: ${overallBudgetPct >= 80 ? '#FEF2F2' : '#ECFDF5'}; color: ${overallBudgetPct >= 80 ? '#EF4444' : '#10B981'};">
              ${overallBudgetPct}% Terpakai
            </span>
          </div>
          <h3 style="font-size: 24px; font-weight: 900; margin-bottom: 12px;">
            ${formatRupiah(totalBudgetSpent)} <span style="font-size: 14px; font-weight: 600; color: #94A3B8;">/ ${formatRupiah(totalBudgeted)}</span>
          </h3>
          <div style="width: 100%; height: 10px; background: rgba(255, 255, 255, 0.2); border-radius: 10px; overflow: hidden;">
            <div style="width: ${Math.min(100, overallBudgetPct)}%; height: 100%; background: ${overallBudgetPct >= 80 ? '#F87171' : '#34D399'}; border-radius: 10px;"></div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${budgetAnalysis.map((b) => {
            const isOver = b.pct >= 100;
            const isWarning = b.pct >= 80 && !isOver;
            const statusBg = isOver ? '#FEF2F2' : isWarning ? '#FEF3C7' : '#ECFDF5';
            const statusColor = isOver ? '#DC2626' : isWarning ? '#D97706' : '#059669';
            const statusText = isOver ? 'Over Budget' : isWarning ? 'Waspada (≥80%)' : 'Sangat Aman';

            return `
              <div class="card-modern" style="padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <div>
                    <span style="font-size: 13px; font-weight: 800; color: #0F172A;">${b.category}</span>
                    <span style="font-size: 11px; color: #64748B; margin-left: 8px;">(Target: ${formatRupiah(b.target)})</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 13px; font-weight: 900; color: ${statusColor};">${formatRupiah(b.spent)}</span>
                    <span class="badge-pill" style="background: ${statusBg}; color: ${statusColor};">
                      ${b.pct}% • ${statusText}
                    </span>
                  </div>
                </div>
                <div style="width: 100%; height: 8px; background: #F1F5F9; border-radius: 10px; overflow: hidden;">
                  <div style="width: ${Math.min(100, b.pct)}%; height: 100%; background: ${statusColor}; border-radius: 10px;"></div>
                </div>
              </div>
            `;
          }).join('')}
          ${budgetAnalysis.length === 0 ? '<p style="font-size: 12px; color: #94A3B8;">Belum ada target anggaran bulanan yang ditentukan.</p>' : ''}
        </div>
      </div>

      <div class="footer-bar">
        <span>FinanceFlow Executive Report • User: ${userName}</span>
        <span>Halaman 6 dari 10</span>
      </div>
    </div>


    <!-- ================= HALAMAN 7: CATEGORY DISTRIBUTION ================= -->
    <div class="pdf-page" id="pdf-page-7">
      <div>
        <div class="header-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #255BFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px;">F</div>
            <div>
              <h2 style="font-size: 18px; font-weight: 900; color: #0F172A;">Category Distribution</h2>
              <p style="font-size: 10px; color: #64748B; font-weight: 600;">Distribusi persentase pengeluaran berdasarkan kategori</p>
            </div>
          </div>
          <span class="badge-pill" style="background: #EEF2FF; color: #255BFF;">HALAMAN 7 • KATEGORI</span>
        </div>

        <div class="card-modern" style="padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 18px;">
            Proporsi Donut Kategori Pengeluaran
          </h3>
          <div style="display: grid; grid-template-columns: 220px 1fr; gap: 24px; align-items: center;">
            <div style="display: flex; justify-content: center; align-items: center; position: relative;">
              <svg width="190" height="190" viewBox="0 0 42 42" style="transform: rotate(-90deg); border-radius: 50%;">
                <circle cx="21" cy="21" r="15.91549430918954" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="6.5"></circle>
                ${donutSlicesSVG}
              </svg>
              <div style="position: absolute; text-align: center;">
                <span style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase;">TOTAL EXPENSE</span>
                <p style="font-size: 13px; font-weight: 900; color: #0F172A;">${formatRupiah(totalExpense)}</p>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${expenseCategoryList.map((cat, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: #F8FAFC; border-radius: 12px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="width: 12px; height: 12px; border-radius: 50%; background: ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]};"></span>
                    <span style="font-size: 12px; font-weight: 800; color: #0F172A;">${cat.category}</span>
                  </div>
                  <div>
                    <span style="font-size: 12px; font-weight: 900; color: #0F172A;">${formatRupiah(cat.amount)}</span>
                    <span style="font-size: 11px; font-weight: 800; color: #255BFF; margin-left: 8px;">(${cat.percentage}%)</span>
                  </div>
                </div>
              `).join('')}
              ${expenseCategoryList.length === 0 ? '<p style="font-size: 12px; color: #94A3B8;">Belum ada kategori pengeluaran.</p>' : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bar">
        <span>FinanceFlow Executive Report • User: ${userName}</span>
        <span>Halaman 7 dari 10</span>
      </div>
    </div>


    <!-- ================= HALAMAN 8: TODO ANALYSIS ================= -->
    <div class="pdf-page" id="pdf-page-8">
      <div>
        <div class="header-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #255BFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px;">F</div>
            <div>
              <h2 style="font-size: 18px; font-weight: 900; color: #0F172A;">Todo & Task Timeline</h2>
              <p style="font-size: 10px; color: #64748B; font-weight: 600;">Linimasa tugas, pengingat, dan status penyelesaian</p>
            </div>
          </div>
          <span class="badge-pill" style="background: #EEF2FF; color: #255BFF;">HALAMAN 8 • TUGAS</span>
        </div>

        <div class="card-modern" style="padding: 20px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
          <div>
            <p style="font-size: 10px; font-weight: 800; color: #64748B;">TOTAL TUGAS</p>
            <p style="font-size: 20px; font-weight: 900; color: #0F172A; margin-top: 4px;">${todos.length} Items</p>
          </div>
          <div>
            <p style="font-size: 10px; font-weight: 800; color: #64748B;">SELESAI</p>
            <p style="font-size: 20px; font-weight: 900; color: #10B981; margin-top: 4px;">${doneTodos.length} (${todoCompletionPct}%)</p>
          </div>
          <div>
            <p style="font-size: 10px; font-weight: 800; color: #64748B;">PRIORITAS TINGGI</p>
            <p style="font-size: 20px; font-weight: 900; color: #DC2626; margin-top: 4px;">${highPriorityTodos.length} Active</p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${todos.map((todo) => {
            const isDone = todo.status === 'Done';
            const pColor = todo.priority === 'High' ? '#DC2626' : todo.priority === 'Medium' ? '#D97706' : '#255BFF';
            const pBg = todo.priority === 'High' ? '#FEF2F2' : todo.priority === 'Medium' ? '#FEF3C7' : '#EEF2FF';

            return `
              <div class="card-modern" style="padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; opacity: ${isDone ? '0.75' : '1'};">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 28px; height: 28px; border-radius: 50%; background: ${isDone ? '#ECFDF5' : '#EEF2F2'}; color: ${isDone ? '#10B981' : '#64748B'}; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px;">
                    ${isDone ? '✓' : '•'}
                  </div>
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 13px; font-weight: 800; text-decoration: ${isDone ? 'line-through' : 'none'}; color: #0F172A;">
                        ${todo.title}
                      </span>
                      <span class="badge-pill" style="background: ${pBg}; color: ${pColor}; padding: 2px 8px;">
                        ${todo.priority}
                      </span>
                    </div>
                    <p style="font-size: 11px; color: #64748B; margin-top: 2px;">Deadline: ${formatDateTime(todo.deadline)}</p>
                  </div>
                </div>
                <span class="badge-pill" style="background: ${isDone ? '#ECFDF5' : '#F3E8FF'}; color: ${isDone ? '#10B981' : '#7D5CFF'};">
                  ${todo.status}
                </span>
              </div>
            `;
          }).join('')}
          ${todos.length === 0 ? '<p style="font-size: 12px; color: #94A3B8;">Belum ada daftar tugas.</p>' : ''}
        </div>
      </div>

      <div class="footer-bar">
        <span>FinanceFlow Executive Report • User: ${userName}</span>
        <span>Halaman 8 dari 10</span>
      </div>
    </div>


    <!-- ================= HALAMAN 9: BANK STATEMENT HISTORY ================= -->
    <div class="pdf-page" id="pdf-page-9">
      <div>
        <div class="header-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #255BFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px;">F</div>
            <div>
              <h2 style="font-size: 18px; font-weight: 900; color: #0F172A;">Bank Statement & Transaction Log</h2>
              <p style="font-size: 10px; color: #64748B; font-weight: 600;">Rekening koran digital dan saldo akumulasi setelah transaksi</p>
            </div>
          </div>
          <span class="badge-pill" style="background: #EEF2FF; color: #255BFF;">HALAMAN 9 • REKENING KORAN</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${statementItems.slice(0, 8).map((tx) => {
            const isInc = tx.type === 'income';
            return `
              <div class="card-modern" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 32px; height: 32px; border-radius: 10px; background: ${isInc ? '#ECFDF5' : '#FEF2F2'}; color: ${isInc ? '#10B981' : '#EF4444'}; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 15px;">
                    ${isInc ? '↓' : '↑'}
                  </div>
                  <div>
                    <p style="font-size: 12px; font-weight: 800; color: #0F172A;">${tx.category} <span style="font-weight: 500; color: #64748B;">(${tx.note || '-'})</span></p>
                    <p style="font-size: 10px; color: #64748B;">Tanggal: ${formatDate(tx.date)}</p>
                  </div>
                </div>
                <div style="text-align: right;">
                  <p style="font-size: 13px; font-weight: 900; color: ${isInc ? '#10B981' : '#EF4444'};">
                    ${isInc ? '+' : '-'}${formatRupiah(tx.amount)}
                  </p>
                  <p style="font-size: 10px; font-weight: 700; color: #64748B;">
                    Saldo: ${formatRupiah(tx.runningBalance)}
                  </p>
                </div>
              </div>
            `;
          }).join('')}
          ${statementItems.length === 0 ? '<p style="font-size: 12px; color: #94A3B8;">Belum ada data riwayat transaksi.</p>' : ''}
        </div>
      </div>

      <div class="footer-bar">
        <span>FinanceFlow Executive Report • User: ${userName}</span>
        <span>Halaman 9 dari 10</span>
      </div>
    </div>


    <!-- ================= HALAMAN 10: INSIGHTS & RECOMMENDATIONS ================= -->
    <div class="pdf-page dark-page" id="pdf-page-10">
      <div>
        <div class="header-bar-dark">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: #255BFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px;">F</div>
            <div>
              <h2 style="font-size: 18px; font-weight: 900; color: #FFFFFF;">AI Financial Insights & Recommendations</h2>
              <p style="font-size: 10px; color: #A5B4FC; font-weight: 600;">Rekomendasi kecerdasan buatan & strategi masa depan</p>
            </div>
          </div>
          <span class="badge-pill" style="background: rgba(255, 255, 255, 0.1); color: #A5B4FC;">HALAMAN 10 • INSIGHTS</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
          <div class="card-dark">
            <span class="badge-pill" style="background: rgba(37, 91, 255, 0.25); color: #A5B4FC; margin-bottom: 8px;">FINANCIAL HEALTH</span>
            <p style="font-size: 12px; font-weight: 700; color: #FFFFFF; margin-top: 6px; line-height: 1.5;">
              Status kesehatan finansial Anda berada pada predikat <strong>${healthStatusText} (${healthScore}/100)</strong>.
            </p>
          </div>

          <div class="card-dark">
            <span class="badge-pill" style="background: rgba(16, 185, 129, 0.25); color: #6EE7B7; margin-bottom: 8px;">SAVINGS RATE</span>
            <p style="font-size: 12px; font-weight: 700; color: #FFFFFF; margin-top: 6px; line-height: 1.5;">
              Tingkat tabungan mencapai <strong>${savingsRate}%</strong> dari seluruh pendapatan bersih periode ini.
            </p>
          </div>

          <div class="card-dark">
            <span class="badge-pill" style="background: rgba(239, 68, 68, 0.25); color: #FCA5A5; margin-bottom: 8px;">LARGEST EXPENSE</span>
            <p style="font-size: 12px; font-weight: 700; color: #FFFFFF; margin-top: 6px; line-height: 1.5;">
              Pengeluaran individual tertinggi: <strong>"${topExpenseTx ? topExpenseTx.note || topExpenseTx.category : '-'}"</strong> (${topExpenseTx ? formatRupiah(topExpenseTx.amount) : '-'}).
            </p>
          </div>

          <div class="card-dark">
            <span class="badge-pill" style="background: rgba(125, 92, 255, 0.25); color: #DDD6FE; margin-bottom: 8px;">LARGEST INFLOW</span>
            <p style="font-size: 12px; font-weight: 700; color: #FFFFFF; margin-top: 6px; line-height: 1.5;">
              Pemasukan individual terbesar: <strong>"${topIncomeTx ? topIncomeTx.note || topIncomeTx.category : '-'}"</strong> (${topIncomeTx ? formatRupiah(topIncomeTx.amount) : '-'}).
            </p>
          </div>
        </div>

        <div class="card-dark" style="margin-bottom: 20px; padding: 20px;">
          <h4 style="font-size: 13px; font-weight: 800; color: #38BDF8; margin-bottom: 8px;">STRATEGIC RECOMMENDATION</h4>
          <p style="font-size: 12px; line-height: 1.7; color: #E2E8F0;">
            ${savingsRate >= 20 ? 'Pertahankan tingkat alokasi tabungan saat ini dan pertimbangkan untuk memindahkan surplus ke instrumen investasi berisiko rendah.' : 'Tingkatkan alokasi dana darurat hingga minimal 20% dari total pemasukan rutin untuk memperkuat ketahanan finansial.'}
          </p>
        </div>

        <div style="text-align: center; padding-top: 10px;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #255BFF, #7D5CFF); display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(37, 91, 255, 0.5); margin-bottom: 12px;">
            <span style="font-size: 28px; color: #FFFFFF;">✓</span>
          </div>
          <h4 style="font-size: 16px; font-weight: 900; color: #FFFFFF;">FinanceFlow Verified Report</h4>
          <p style="font-size: 11px; color: #94A3B8; margin-top: 4px;">Terima kasih telah menggunakan FinanceFlow Personal Wealth Intelligence</p>
        </div>
      </div>

      <div class="footer-bar" style="border-color: rgba(255, 255, 255, 0.1); color: #64748B;">
        <span>FinanceFlow Executive Report • Confidential</span>
        <span>Halaman 10 dari 10</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const pageIds = [
      'pdf-page-1',
      'pdf-page-2',
      'pdf-page-3',
      'pdf-page-4',
      'pdf-page-5',
      'pdf-page-6',
      'pdf-page-7',
      'pdf-page-8',
      'pdf-page-9',
      'pdf-page-10',
    ];

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    for (let i = 0; i < pageIds.length; i++) {
      const pageEl = document.getElementById(pageIds[i]);
      if (!pageEl) continue;

      const isDark = i === 0 || i === 9;
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: isDark ? '#071B35' : '#F8FAFC',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      if (i > 0) {
        doc.addPage('a4', 'portrait');
      }

      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    }

    // 1. Get binary PDF blob & check validity in browser
    const blob = doc.output('blob');
    if (!blob || blob.size === 0) {
      console.error('[PDF] Local Blob generation failed: size is 0');
      return { success: false, message: 'Gagal membuat file PDF: Ukuran 0 byte.' };
    }

    // Quick Magic Byte validation
    const headerBuffer = await blob.slice(0, 5).arrayBuffer();
    const headerText = new TextDecoder().decode(headerBuffer);
    if (headerText !== '%PDF-') {
      console.error('[PDF] Invalid magic header:', headerText);
      return { success: false, message: 'Gagal membuat file PDF: Header file corrupt.' };
    }

    console.log(`[PDF] Generated successfully - Local Blob size: ${blob.size} bytes`);

    // 2. Download locally in browser
    doc.save(filename);

    // 3. Prepare FormData binary upload to backend endpoint
    const formData = new FormData();
    formData.append('pdfFile', blob, filename);
    formData.append('filename', filename);
    formData.append('userName', userName);
    formData.append('periodText', periodText);
    formData.append('totalIncome', String(totalIncome));
    formData.append('totalExpense', String(totalExpense));
    formData.append('netDifference', String(netDifference));
    if (userId) {
      formData.append('userId', userId);
    }

    console.log('[PDF] Sending binary FormData to Telegram backend endpoint...');

    const response = await fetch('/api/telegram/send-pdf', {
      method: 'POST',
      credentials: 'same-origin',
      body: formData,
    });

    let data: any = null;
    try {
      const rawText = await response.text();
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.warn('[PDF] Could not parse server response as JSON:', parseError);
    }

    if (response.ok && data?.success) {
      console.log('[PDF] Telegram Success response:', data);
      return { success: true, message: 'Laporan berhasil dikirim ke Telegram.' };
    } else {
      const errReason = data?.error || data?.message || (!response.ok ? `Status ${response.status}` : 'Respons server tidak valid');
      console.error('[PDF] Telegram Failed response:', errReason);
      return { success: false, message: `Gagal mengirim ke Telegram: ${errReason}` };
    }
  } catch (error: any) {
    console.error('[PDF] Exception during PDF generation/sending:', error);
    return { success: false, message: `Gagal memproses PDF: ${error?.message || error}` };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
