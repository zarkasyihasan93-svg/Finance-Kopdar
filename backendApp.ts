import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

import {
  sendTelegramMessage,
  sendTelegramMessageDetailed,
  sendTransactionNotification,
  sendTelegramDocument,
} from './telegram.ts';
import {
  initTodoReminderScheduler,
  setServerTodos,
  addOrUpdateServerTodo,
  removeServerTodo,
  setChatIdResolver,
} from './todoReminder.ts';
import {
  initDailyReportScheduler,
  setServerTransactions,
  getServerTransactions,
  addServerTransaction,
  updateServerTransaction,
  deleteServerTransaction,
  calculateTotalBalance,
} from './dailyReport.ts';
import { initMonthlyReportScheduler } from './monthlyReport.ts';

const currentFilePath = typeof __filename !== 'undefined' ? __filename : '';
const currentDirPath = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const app = express();
// Production platforms (Cloud Run, Render, Railway, etc.) assign the port at
// runtime. Also read --port arg if passed by supervisor.
const portArgIndex = process.argv.indexOf('--port');
const portFromArg = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : undefined;
const PORT = Number(process.env.PORT) || portFromArg || 3000;

// CORS headers for all incoming requests (supports iframe and custom origins)
app.use((_req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  storage: multer.memoryStorage(),
});

// Supabase server instance for multi-user telegram lookup
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

let serverSupabase: any = null;
if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://')) {
  serverSupabase = createClient(supabaseUrl, supabaseKey);
}

async function getUserTelegramChatId(userId?: string): Promise<string | null> {
  if (!userId || !serverSupabase) return null;

  try {
    const { data, error } = await serverSupabase
      .from('telegram_connections')
      .select('telegram_chat_id, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data && data.is_active && data.telegram_chat_id) {
      return String(data.telegram_chat_id).trim();
    }
  } catch (e: any) {
    console.error('[Server] Error fetching user telegram connection:', e?.message || e);
  }
  return null;
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', database: 'supabase-postgresql' });
});

// Telegram Notification on new transaction (Multi-User Dedicated Routing)
app.post('/api/telegram/notify-transaction', async (req: Request, res: Response) => {
  try {
    const { transaction, userId, chatId } = req.body;
    if (!transaction) {
      res.status(400).json({ error: 'Transaction payload required' });
      return;
    }

    addServerTransaction(transaction);
    const balance = calculateTotalBalance(getServerTransactions());

    // Routing: Priority 1 = explicit chatId, Priority 2 = user's DB connection, Priority 3 = default
    let targetChatId = chatId;
    const effectiveUserId = userId || transaction.user_id;
    if (!targetChatId && effectiveUserId) {
      targetChatId = await getUserTelegramChatId(effectiveUserId);
    }

    const sent = await sendTransactionNotification(
      {
        ...transaction,
        currentBalance: balance,
      },
      targetChatId || undefined
    );

    res.json({ success: sent, targetChatId: targetChatId || 'default' });
  } catch (err: any) {
    console.error('[TELEGRAM NOTIFY] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Telegram PDF Report sender (Multi-User Dedicated Routing)
app.post('/api/telegram/send-pdf', (upload.single('pdf') as any), async (req: Request, res: Response) => {
  try {
    console.log('[PDF] Processing upload...');

    if (!req.file && !req.body.pdfBase64) {
      console.error('[PDF] Error: No file or base64 provided');
      res.status(400).json({ success: false, error: 'File PDF atau base64 tidak ditemukan dalam request.' });
      return;
    }

    let fileBuffer: Buffer;
    let filename = (req.body.filename as string) || 'Laporan_Keuangan.pdf';
    const userName = (req.body.userName as string) || 'Pengguna';
    const periodText = (req.body.periodText as string) || 'Periode Terpilih';
    const netDifference = Number(req.body.netDifference) || 0;
    const totalIncome = Number(req.body.totalIncome) || 0;
    const totalExpense = Number(req.body.totalExpense) || 0;
    const userId = (req.body.userId as string) || '';

    // Multi-user target chat routing
    let targetChatId = (req.body.chatId as string) || '';
    if (!targetChatId && userId) {
      targetChatId = (await getUserTelegramChatId(userId)) || '';
    }

    if (req.file) {
      fileBuffer = req.file.buffer;
    } else {
      let base64Data = req.body.pdfBase64 as string;
      if (base64Data.startsWith('data:application/pdf;base64,')) {
        base64Data = base64Data.replace('data:application/pdf;base64,', '');
      }
      fileBuffer = Buffer.from(base64Data, 'base64');
    }

    if (fileBuffer.length === 0) {
      res.status(400).json({ success: false, error: 'File PDF kosong (0 bytes).' });
      return;
    }

    const pdfHeader = fileBuffer.subarray(0, 5).toString('utf8');
    if (pdfHeader !== '%PDF-') {
      res.status(400).json({ success: false, error: 'Format file bukan PDF valid (%PDF- missing).' });
      return;
    }

    const trailerChunk = fileBuffer.subarray(-1024).toString('utf8');
    if (!trailerChunk.includes('%%EOF')) {
      res.status(400).json({ success: false, error: 'File PDF terpotong atau tidak utuh.' });
      return;
    }

    const nowStr = new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';

    const formatRp = (num: number) => 'Rp ' + Math.abs(num || 0).toLocaleString('id-ID');

    const caption = `📊 LAPORAN KEUANGAN FINTECH EXCLUSIVE

👤 Nama User: ${userName}
📅 Periode: ${periodText}
🕒 Tanggal Generate: ${nowStr}
💰 Saldo Net: ${formatRp(netDifference)}
📈 Total Income: ${formatRp(totalIncome)}
📉 Total Expense: ${formatRp(totalExpense)}

📎 File PDF Resmi Terlampir`;

    const sent = await sendTelegramDocument(fileBuffer, filename, caption, targetChatId || undefined);

    if (sent) {
      res.json({
        success: true,
        message: 'Laporan berhasil dikirim ke Telegram.',
        targetChatId: targetChatId || 'default',
      });
    } else {
      res.status(500).json({ success: false, error: 'Gagal mengirim PDF ke Telegram API.' });
    }
  } catch (err: any) {
    console.error('[PDF] Exception error:', err);
    res.status(500).json({ success: false, error: err.message || 'Terjadi kesalahan internal pada server.' });
  }
});

// Test connection endpoint for user's Telegram Chat
app.post('/api/telegram/test-connection', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { chatId, userId } = req.body || {};
    let targetChatId = chatId ? String(chatId).trim() : '';
    if (!targetChatId && userId) {
      targetChatId = (await getUserTelegramChatId(userId)) || '';
    }

    if (!targetChatId) {
      res.status(200).json({
        success: false,
        error: 'Telegram Chat ID tidak ditemukan. Harap masukkan Chat ID numerik Anda terlebih dahulu.',
      });
      return;
    }

    const testMessage = `🤖 *FinanceFlow Telegram Connection Test*

Halo! Koneksi akun Telegram Anda telah berhasil terhubung dengan akun FinanceFlow Anda.

✅ Notifikasi pencatatan transaksi akan dikirimkan langsung ke chat ini.
✅ Laporan ringkasan dan PDF keuangan dapat dikirim langsung ke chat ini.
🔒 Saluran ini terisolasi khusus untuk akun Anda (Multi-User Architecture).

Terima kasih telah menggunakan FinanceFlow!`;

    const result = await sendTelegramMessageDetailed(testMessage, targetChatId);

    if (result.success) {
      res.status(200).json({ success: true, message: 'Pesan tes berhasil dikirim ke Telegram Anda!' });
    } else {
      res.status(200).json({
        success: false,
        error: result.error || 'Gagal mengirim pesan tes ke Telegram. Pastikan Anda sudah memulai chat (/start) dengan bot Telegram dan Chat ID sudah benar.',
      });
    }
  } catch (err: any) {
    console.error('[TELEGRAM TEST] Exception:', err);
    res.status(200).json({ success: false, error: err.message || 'Gagal menguji koneksi Telegram.' });
  }
});

// Sync Todos array from client
app.post('/api/telegram/sync-todos', (req: Request, res: Response) => {
  try {
    const { todos } = req.body;
    if (Array.isArray(todos)) {
      setServerTodos(todos);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync Transactions array from client
app.post('/api/telegram/sync-transactions', (req: Request, res: Response) => {
  try {
    const { transactions } = req.body;
    if (Array.isArray(transactions)) {
      setServerTransactions(transactions);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test Todo Repeat Reminder immediately via Telegram
app.post('/api/telegram/test-todo-reminder', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { todo, userId } = req.body || {};
    if (!todo) {
      res.status(200).json({ success: false, error: 'Data tugas tidak lengkap.' });
      return;
    }

    const effectiveUserId = userId || todo.user_id;
    let targetChatId: string | null = null;
    if (effectiveUserId) {
      targetChatId = await getUserTelegramChatId(effectiveUserId);
    }

    const intervalVal = Number(todo.reminder_interval_value) || 10;
    const intervalLabel = `${intervalVal} ${todo.reminder_interval_type === 'hours' ? 'Jam' : 'Menit'}`;
    const dayNames: Record<number, string> = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 0: 'Minggu' };
    const allowedDays = Array.isArray(todo.reminder_days) ? todo.reminder_days : [1, 2, 3, 4, 5, 6, 0];
    const daysFormatted = allowedDays.map((d: number) => dayNames[d] || String(d)).join(', ');

    const testMessage = `⏰ TES ALARM PENGINGAT TUGAS
(Diingatkan setiap ${intervalLabel})

📌 Tugas: ${todo.title}
📝 Catatan: ${todo.description || '-'}
🎯 Prioritas: ${todo.priority || 'Medium'}
⏳ Batas Waktu: ${todo.deadline || '-'}
📅 Hari Aktif: ${daysFormatted}
🚨 Status: ${todo.status}

✅ Pesan tes berhasil! Alarm Telegram Anda telah aktif dan akan mengingatkan Anda setiap ${intervalLabel}.`;

    const result = await sendTelegramMessageDetailed(testMessage, targetChatId || undefined);
    res.status(200).json({
      success: result.success,
      error: result.error,
      targetChatId: targetChatId ? 'connected' : 'default',
    });
  } catch (err: any) {
    res.status(200).json({ success: false, error: err.message || 'Gagal mengirim pengingat tes.' });
  }
});

// Keep API misses as JSON. This must also be registered when Express is used
// as a Vercel Serverless Function (where start() is intentionally not called).
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API endpoint ${_req.method} ${_req.originalUrl} tidak ditemukan di server backend.`,
  });
});

// Server initialization for local development and traditional Node hosting.
// Vercel imports the Express app below as a request handler instead.
async function start() {
  // Set multi-user chat ID resolver for todo reminders
  setChatIdResolver(getUserTelegramChatId);

  // Initialize background schedulers
  initTodoReminderScheduler();
  initDailyReportScheduler();
  initMonthlyReportScheduler();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  start();
}

export default app;
