var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// backendApp.ts
var backendApp_exports = {};
__export(backendApp_exports, {
  default: () => backendApp_default
});
module.exports = __toCommonJS(backendApp_exports);
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_supabase_js = require("@supabase/supabase-js");

// telegram.ts
var DEFAULT_BOT_TOKEN = "None";
var DEFAULT_CHAT_ID = "None";
async function sendTelegramMessageDetailed(message, targetChatId) {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  const chatId = targetChatId || process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;
  if (!token || token === "None") {
    return {
      success: false,
      error: "TELEGRAM_BOT_TOKEN belum dikonfigurasi di environment server."
    };
  }
  if (!chatId || chatId === "None") {
    return {
      success: false,
      error: "Chat ID Telegram belum diatur. Masukkan Chat ID numerik Anda terlebih dahulu."
    };
  }
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      const desc = data.description || "Gagal mengirim pesan ke Telegram.";
      let friendlyError = desc;
      if (desc.includes("chat not found")) {
        friendlyError = `Chat ID (${chatId}) tidak ditemukan oleh Bot Telegram. Pastikan Anda sudah membuka chat dengan bot dan menekan tombol /start atau mengirim pesan /start ke bot tersebut.`;
      } else if (desc.includes("bot was blocked")) {
        friendlyError = `Bot Telegram diblokir oleh akun Anda. Buka bot di Telegram lalu klik Unblock / Restart bot.`;
      } else if (desc.includes("Unauthorized") || desc.includes("token is invalid")) {
        friendlyError = `Token bot Telegram tidak valid. Periksa kembali TELEGRAM_BOT_TOKEN.`;
      }
      console.error("Telegram error:", desc);
      return { success: false, error: friendlyError };
    }
    console.log(`Telegram notification sent to chat_id: ${chatId}`);
    return { success: true };
  } catch (error) {
    console.error("Telegram error:", error?.message || error);
    return { success: false, error: error?.message || "Terjadi kesalahan jaringan saat menghubungi API Telegram." };
  }
}
async function sendTelegramMessage(message, targetChatId) {
  const result = await sendTelegramMessageDetailed(message, targetChatId);
  return result.success;
}
function formatRupiah(num) {
  return "Rp " + Math.abs(num).toLocaleString("id-ID");
}
async function sendTransactionNotification(tx, targetChatId) {
  const jenis = tx.type === "income" ? "Income" : "Expense";
  const nominal = formatRupiah(tx.amount);
  const saldo = formatRupiah(tx.currentBalance);
  const catatan = tx.note && tx.note.trim() ? tx.note : "-";
  const message = `\u{1F4B0} Transaksi Baru

Jenis:
${jenis}

Kategori:
${tx.category}

Nominal:
${nominal}

Tanggal:
${tx.date}

Catatan:
${catatan}

Saldo Setelah Transaksi:
${saldo}`;
  return await sendTelegramMessage(message, targetChatId);
}
async function sendTelegramDocument(fileBuffer, filename, caption, targetChatId) {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  const chatId = targetChatId || process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;
  if (!token || !chatId || token === "None" || chatId === "None") {
    console.warn("Telegram info: TELEGRAM_BOT_TOKEN or target Chat ID is not configured");
    return false;
  }
  try {
    const url = `https://api.telegram.org/bot${token}/sendDocument`;
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("caption", caption);
    const blob = new Blob([fileBuffer], { type: "application/pdf" });
    formData.append("document", blob, filename);
    const response = await fetch(url, {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error("Telegram error:", data.description || "Failed to send document");
      return false;
    }
    console.log(`Telegram PDF report document sent to chat_id: ${chatId}`);
    return true;
  } catch (error) {
    console.error("Telegram error:", error?.message || error);
    return false;
  }
}

// todoReminder.ts
var import_node_cron = __toESM(require("node-cron"), 1);
var cachedServerTodos = [];
var chatIdResolver = null;
function setChatIdResolver(resolver) {
  chatIdResolver = resolver;
}
function setServerTodos(todos) {
  cachedServerTodos = todos;
}
function getServerTodos() {
  return cachedServerTodos;
}
function addOrUpdateServerTodo(todo) {
  const index = cachedServerTodos.findIndex((t) => t.id === todo.id);
  if (index !== -1) {
    cachedServerTodos[index] = todo;
  } else {
    cachedServerTodos.push(todo);
  }
}
function formatDateTimeDisplay(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date).replace(",", "");
}
var DAY_NAMES_MAP = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  0: "Minggu"
};
function markReminderSent(todo, reminderTag) {
  const existingTags = todo.sent_reminders ? todo.sent_reminders.split(",").filter(Boolean) : [];
  if (existingTags.includes(reminderTag)) return;
  existingTags.push(reminderTag);
  const updatedSentReminders = existingTags.join(",");
  todo.sent_reminders = updatedSentReminders;
  addOrUpdateServerTodo(todo);
}
async function checkAndSendTodoReminders() {
  const now = /* @__PURE__ */ new Date();
  const todos = getServerTodos();
  let currentDay = now.getDay();
  try {
    const jktDateStr = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    const jktDate = new Date(jktDateStr);
    if (!isNaN(jktDate.getTime())) {
      currentDay = jktDate.getDay();
    }
  } catch {
  }
  for (const todo of todos) {
    if (todo.status === "Done" || todo.status === "Completed") {
      continue;
    }
    let targetChatId = void 0;
    if (chatIdResolver && todo.user_id) {
      const resolved = await chatIdResolver(todo.user_id);
      if (resolved) targetChatId = resolved;
    }
    if (todo.repeat_reminder_enabled) {
      const intervalVal = Number(todo.reminder_interval_value) || 10;
      const intervalMinutes = todo.reminder_interval_type === "hours" ? intervalVal * 60 : intervalVal;
      const allowedDays = Array.isArray(todo.reminder_days) && todo.reminder_days.length > 0 ? todo.reminder_days : [1, 2, 3, 4, 5, 6, 0];
      const isDayAllowed = allowedDays.includes(currentDay);
      if (isDayAllowed && intervalMinutes > 0) {
        let shouldSendRepeat = false;
        if (!todo.last_reminder_sent_at) {
          const createdTime = todo.created_at ? new Date(todo.created_at).getTime() : 0;
          if (createdTime > 0) {
            const elapsedMinutes = (now.getTime() - createdTime) / (1e3 * 60);
            if (elapsedMinutes >= intervalMinutes) {
              shouldSendRepeat = true;
            }
          } else {
            todo.last_reminder_sent_at = now.toISOString();
            addOrUpdateServerTodo(todo);
          }
        } else {
          const lastSentTime = new Date(todo.last_reminder_sent_at).getTime();
          if (!isNaN(lastSentTime)) {
            const elapsedMinutes = (now.getTime() - lastSentTime) / (1e3 * 60);
            if (elapsedMinutes >= intervalMinutes) {
              shouldSendRepeat = true;
            }
          } else {
            shouldSendRepeat = true;
          }
        }
        if (shouldSendRepeat) {
          const intervalLabel = `${intervalVal} ${todo.reminder_interval_type === "hours" ? "Jam" : "Menit"}`;
          const daysFormatted = allowedDays.map((d) => DAY_NAMES_MAP[d] || String(d)).join(", ");
          const repeatMessage = `\u23F0 ALARM PENGINGAT TUGAS
(Diingatkan setiap ${intervalLabel})

\u{1F4CC} Tugas: ${todo.title}
\u{1F4DD} Catatan: ${todo.description || "-"}
\u{1F3AF} Prioritas: ${todo.priority || "Medium"}
\u23F3 Batas Waktu: ${formatDateTimeDisplay(todo.deadline)}
\u{1F4C5} Hari Aktif: ${daysFormatted}
\u{1F6A8} Status: ${todo.status}

\u{1F4A1} Tetap produktif dan selesaikan tugas ini tepat waktu!`;
          const sent = await sendTelegramMessage(repeatMessage, targetChatId);
          if (sent) {
            console.log(`[SCHEDULER LOG] Repeat reminder sent for "${todo.title}" (every ${intervalLabel})`);
            todo.last_reminder_sent_at = now.toISOString();
            addOrUpdateServerTodo(todo);
          }
        }
      }
    }
    if (todo.deadline) {
      const deadlineDate = new Date(todo.deadline);
      if (!isNaN(deadlineDate.getTime())) {
        const diffMs = deadlineDate.getTime() - now.getTime();
        const diffMinutes = diffMs / (1e3 * 60);
        const sentTags = todo.sent_reminders ? todo.sent_reminders.split(",").filter(Boolean) : [];
        if (diffMinutes > 0 && diffMinutes <= 30 && !sentTags.includes("30_min_before")) {
          const message = `\u23F0 Reminder Todo (30 Menit Sebelum Deadline)

\u{1F4CC} Judul: ${todo.title}
\u{1F4DD} Deskripsi: ${todo.description || "-"}
\u{1F3AF} Prioritas: ${todo.priority || "Medium"}
\u23F3 Deadline: ${formatDateTimeDisplay(todo.deadline)}
\u{1F6A8} Sisa Waktu: ${Math.ceil(diffMinutes)} Menit`;
          const sent = await sendTelegramMessage(message, targetChatId);
          if (sent) {
            console.log(`[SCHEDULER LOG] Sent 30-min-before reminder for todo: "${todo.title}"`);
            markReminderSent(todo, "30_min_before");
          }
        }
        if (diffMinutes <= 0 && !sentTags.includes("overdue")) {
          const message = `\u26A0\uFE0F WARNING: Deadline Todo Terlewat!

\u{1F4CC} Judul: ${todo.title}
\u{1F4DD} Deskripsi: ${todo.description || "-"}
\u{1F3AF} Prioritas: ${todo.priority || "Medium"}
\u23F3 Deadline: ${formatDateTimeDisplay(todo.deadline)}
\u{1F6A8} Status: Belum Selesai`;
          const sent = await sendTelegramMessage(message, targetChatId);
          if (sent) {
            console.log(`[SCHEDULER LOG] Sent overdue notification for todo: "${todo.title}"`);
            markReminderSent(todo, "overdue");
          }
        }
      }
    }
  }
}
async function sendScheduledTodoSummary(timeSlot) {
  const todos = getServerTodos();
  const activeTodos = todos.filter((t) => t.status !== "Done" && t.status !== "Completed");
  if (activeTodos.length === 0) {
    const emptyMessage = `\u{1F4CB} Ringkasan Todo (${timeSlot} WIB)

\u{1F389} Selamat! Tidak ada todo aktif yang pending saat ini.`;
    await sendTelegramMessage(emptyMessage);
    return;
  }
  const todoListStr = activeTodos.map(
    (t, i) => `${i + 1}. ${t.title}
   \u2022 Deadline: ${formatDateTimeDisplay(t.deadline)}
   \u2022 Prioritas: ${t.priority || "Medium"}
   \u2022 Status: ${t.status}`
  ).join("\n\n");
  const summaryMessage = `\u{1F4CB} Ringkasan Todo Hari Ini (${timeSlot} WIB)
Total Todo Aktif: ${activeTodos.length} item

${todoListStr}`;
  await sendTelegramMessage(summaryMessage);
  console.log(`[SCHEDULER LOG] Scheduled daily todo summary sent for ${timeSlot} WIB.`);
}
function initTodoReminderScheduler() {
  import_node_cron.default.schedule("* * * * *", () => {
    checkAndSendTodoReminders();
  });
  const cronConfig = { timezone: "Asia/Jakarta" };
  import_node_cron.default.schedule("0 6 * * *", () => sendScheduledTodoSummary("06:00"), cronConfig);
  import_node_cron.default.schedule("0 10 * * *", () => sendScheduledTodoSummary("10:00"), cronConfig);
  import_node_cron.default.schedule("0 15 * * *", () => sendScheduledTodoSummary("15:00"), cronConfig);
  import_node_cron.default.schedule("0 19 * * *", () => sendScheduledTodoSummary("19:00"), cronConfig);
  console.log("[SCHEDULER LOG] Todo Reminder Scheduler & Summaries initialized successfully.");
}

// dailyReport.ts
var import_node_cron2 = __toESM(require("node-cron"), 1);
var serverTransactions = [];
function setServerTransactions(transactions) {
  serverTransactions = transactions;
}
function getServerTransactions() {
  return serverTransactions;
}
function addServerTransaction(tx) {
  serverTransactions.unshift(tx);
}
function calculateTotalBalance(transactions) {
  let balance = 0;
  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") {
      balance += amt;
    } else {
      balance -= amt;
    }
  }
  return balance;
}
function formatRupiah2(num) {
  return "Rp " + Math.abs(num).toLocaleString("id-ID");
}
async function sendDailyReport() {
  const now = /* @__PURE__ */ new Date();
  const dateStr = now.toISOString().split("T")[0];
  const dateFormatted = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
  const transactions = getServerTransactions();
  const todayTxList = transactions.filter((tx) => {
    if (!tx.date) return false;
    return tx.date.startsWith(dateStr);
  });
  if (todayTxList.length === 0) {
    const emptyMessage = `\u{1F4CA} Laporan Harian

Tanggal: ${dateFormatted}

Tidak ada transaksi hari ini.`;
    const sent2 = await sendTelegramMessage(emptyMessage);
    if (sent2) {
      console.log("Daily report sent");
    }
    return;
  }
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryExpenses = {};
  todayTxList.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === "income") {
      totalIncome += amt;
    } else {
      totalExpense += amt;
    }
    if (tx.type === "expense") {
      categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + amt;
    }
  });
  const netBalance = totalIncome - totalExpense;
  let topCategory = "Tidak ada";
  let topAmount = 0;
  Object.entries(categoryExpenses).forEach(([cat, amt]) => {
    if (amt > topAmount) {
      topAmount = amt;
      topCategory = cat;
    }
  });
  const largestCatStr = topAmount > 0 ? `${topCategory} (${formatRupiah2(topAmount)})` : "Tidak ada";
  const message = `\u{1F4CA} Laporan Harian

Tanggal: ${dateFormatted}

Total Pemasukan:
${formatRupiah2(totalIncome)}

Total Pengeluaran:
${formatRupiah2(totalExpense)}

Saldo Bersih:
${formatRupiah2(netBalance)}

Jumlah Transaksi:
${todayTxList.length}

Kategori Pengeluaran Terbesar:
${largestCatStr}`;
  const sent = await sendTelegramMessage(message);
  if (sent) {
    console.log("Daily report sent");
  }
}
function initDailyReportScheduler() {
  import_node_cron2.default.schedule(
    "0 21 * * *",
    () => {
      sendDailyReport();
    },
    {
      timezone: "Asia/Jakarta"
    }
  );
}

// monthlyReport.ts
var import_node_cron3 = __toESM(require("node-cron"), 1);
function formatRupiah3(num) {
  return "Rp " + Math.abs(num).toLocaleString("id-ID");
}
var MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember"
];
async function sendMonthlyReport() {
  const now = /* @__PURE__ */ new Date();
  let targetYear = now.getFullYear();
  let targetMonthIndex = now.getMonth() - 1;
  if (targetMonthIndex < 0) {
    targetMonthIndex = 11;
    targetYear -= 1;
  }
  const targetMonthStr = (targetMonthIndex + 1).toString().padStart(2, "0");
  const yearMonthPrefix = `${targetYear}-${targetMonthStr}`;
  const periodLabel = `${MONTH_NAMES[targetMonthIndex]} ${targetYear}`;
  const allTx = getServerTransactions();
  const monthTxList = allTx.filter((tx) => tx.date && tx.date.startsWith(yearMonthPrefix));
  if (monthTxList.length === 0) {
    const emptyMessage = `\u{1F4C8} Laporan Bulanan

Periode: ${periodLabel}

Tidak ada transaksi pada bulan ini.`;
    const sent2 = await sendTelegramMessage(emptyMessage);
    if (sent2) {
      console.log("Monthly report sent");
    }
    return;
  }
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryExpenses = {};
  monthTxList.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === "income") {
      totalIncome += amt;
    } else {
      totalExpense += amt;
      categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + amt;
    }
  });
  const netBalance = totalIncome - totalExpense;
  const sortedCategories = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);
  const top5 = sortedCategories.slice(0, 5);
  let top5Str = "Tidak ada";
  if (top5.length > 0) {
    top5Str = top5.map(([cat, amt], idx) => `${idx + 1}. ${cat}: ${formatRupiah3(amt)}`).join("\n");
  }
  let topCategoryStr = "Tidak ada";
  if (sortedCategories.length > 0) {
    topCategoryStr = `${sortedCategories[0][0]} (${formatRupiah3(sortedCategories[0][1])})`;
  }
  const message = `\u{1F4C8} Laporan Bulanan

Periode: ${periodLabel}

Total Income:
${formatRupiah3(totalIncome)}

Total Expense:
${formatRupiah3(totalExpense)}

Saldo Bersih:
${formatRupiah3(netBalance)}

Jumlah Transaksi:
${monthTxList.length}

Top 5 Kategori Pengeluaran:
${top5Str}

Kategori dengan nominal terbesar:
${topCategoryStr}`;
  const sent = await sendTelegramMessage(message);
  if (sent) {
    console.log("Monthly report sent");
  }
}
function initMonthlyReportScheduler() {
  import_node_cron3.default.schedule(
    "0 8 1 * *",
    () => {
      sendMonthlyReport();
    },
    {
      timezone: "Asia/Jakarta"
    }
  );
}

// backendApp.ts
var currentDirPath = typeof __dirname !== "undefined" ? __dirname : process.cwd();
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT) || 3e3;
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (_req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});
app.use(import_express.default.json({ limit: "15mb" }));
app.use(import_express.default.urlencoded({ limit: "15mb", extended: true }));
var upload = (0, import_multer.default)({
  limits: { fileSize: 50 * 1024 * 1024 },
  // 50MB
  storage: import_multer.default.memoryStorage()
});
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
var serverSupabase = null;
if (supabaseUrl && supabaseKey && supabaseUrl.startsWith("https://")) {
  serverSupabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
}
async function getUserTelegramChatId(userId) {
  if (!userId || !serverSupabase) return null;
  try {
    const { data, error } = await serverSupabase.from("telegram_connections").select("telegram_chat_id, is_active").eq("user_id", userId).maybeSingle();
    if (!error && data && data.is_active && data.telegram_chat_id) {
      return String(data.telegram_chat_id).trim();
    }
  } catch (e) {
    console.error("[Server] Error fetching user telegram connection:", e?.message || e);
  }
  return null;
}
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: "supabase-postgresql" });
});
app.post("/api/telegram/notify-transaction", async (req, res) => {
  try {
    const { transaction, userId, chatId } = req.body;
    if (!transaction) {
      res.status(400).json({ error: "Transaction payload required" });
      return;
    }
    addServerTransaction(transaction);
    const balance = calculateTotalBalance(getServerTransactions());
    let targetChatId = chatId;
    const effectiveUserId = userId || transaction.user_id;
    if (!targetChatId && effectiveUserId) {
      targetChatId = await getUserTelegramChatId(effectiveUserId);
    }
    const sent = await sendTransactionNotification(
      {
        ...transaction,
        currentBalance: balance
      },
      targetChatId || void 0
    );
    res.json({ success: sent, targetChatId: targetChatId || "default" });
  } catch (err) {
    console.error("[TELEGRAM NOTIFY] Error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/telegram/send-pdf", upload.single("pdf"), async (req, res) => {
  try {
    console.log("[PDF] Processing upload...");
    if (!req.file && !req.body.pdfBase64) {
      console.error("[PDF] Error: No file or base64 provided");
      res.status(400).json({ success: false, error: "File PDF atau base64 tidak ditemukan dalam request." });
      return;
    }
    let fileBuffer;
    let filename = req.body.filename || "Laporan_Keuangan.pdf";
    const userName = req.body.userName || "Pengguna";
    const periodText = req.body.periodText || "Periode Terpilih";
    const netDifference = Number(req.body.netDifference) || 0;
    const totalIncome = Number(req.body.totalIncome) || 0;
    const totalExpense = Number(req.body.totalExpense) || 0;
    const userId = req.body.userId || "";
    let targetChatId = req.body.chatId || "";
    if (!targetChatId && userId) {
      targetChatId = await getUserTelegramChatId(userId) || "";
    }
    if (req.file) {
      fileBuffer = req.file.buffer;
    } else {
      let base64Data = req.body.pdfBase64;
      if (base64Data.startsWith("data:application/pdf;base64,")) {
        base64Data = base64Data.replace("data:application/pdf;base64,", "");
      }
      fileBuffer = Buffer.from(base64Data, "base64");
    }
    if (fileBuffer.length === 0) {
      res.status(400).json({ success: false, error: "File PDF kosong (0 bytes)." });
      return;
    }
    const pdfHeader = fileBuffer.subarray(0, 5).toString("utf8");
    if (pdfHeader !== "%PDF-") {
      res.status(400).json({ success: false, error: "Format file bukan PDF valid (%PDF- missing)." });
      return;
    }
    const trailerChunk = fileBuffer.subarray(-1024).toString("utf8");
    if (!trailerChunk.includes("%%EOF")) {
      res.status(400).json({ success: false, error: "File PDF terpotong atau tidak utuh." });
      return;
    }
    const nowStr = (/* @__PURE__ */ new Date()).toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) + " WIB";
    const formatRp = (num) => "Rp " + Math.abs(num || 0).toLocaleString("id-ID");
    const caption = `\u{1F4CA} LAPORAN KEUANGAN FINTECH EXCLUSIVE

\u{1F464} Nama User: ${userName}
\u{1F4C5} Periode: ${periodText}
\u{1F552} Tanggal Generate: ${nowStr}
\u{1F4B0} Saldo Net: ${formatRp(netDifference)}
\u{1F4C8} Total Income: ${formatRp(totalIncome)}
\u{1F4C9} Total Expense: ${formatRp(totalExpense)}

\u{1F4CE} File PDF Resmi Terlampir`;
    const sent = await sendTelegramDocument(fileBuffer, filename, caption, targetChatId || void 0);
    if (sent) {
      res.json({
        success: true,
        message: "Laporan berhasil dikirim ke Telegram.",
        targetChatId: targetChatId || "default"
      });
    } else {
      res.status(500).json({ success: false, error: "Gagal mengirim PDF ke Telegram API." });
    }
  } catch (err) {
    console.error("[PDF] Exception error:", err);
    res.status(500).json({ success: false, error: err.message || "Terjadi kesalahan internal pada server." });
  }
});
app.post("/api/telegram/test-connection", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { chatId, userId } = req.body || {};
    let targetChatId = chatId ? String(chatId).trim() : "";
    if (!targetChatId && userId) {
      targetChatId = await getUserTelegramChatId(userId) || "";
    }
    if (!targetChatId) {
      res.status(200).json({
        success: false,
        error: "Telegram Chat ID tidak ditemukan. Harap masukkan Chat ID numerik Anda terlebih dahulu."
      });
      return;
    }
    const testMessage = `\u{1F916} *FinanceFlow Telegram Connection Test*

Halo! Koneksi akun Telegram Anda telah berhasil terhubung dengan akun FinanceFlow Anda.

\u2705 Notifikasi pencatatan transaksi akan dikirimkan langsung ke chat ini.
\u2705 Laporan ringkasan dan PDF keuangan dapat dikirim langsung ke chat ini.
\u{1F512} Saluran ini terisolasi khusus untuk akun Anda (Multi-User Architecture).

Terima kasih telah menggunakan FinanceFlow!`;
    const result = await sendTelegramMessageDetailed(testMessage, targetChatId);
    if (result.success) {
      res.status(200).json({ success: true, message: "Pesan tes berhasil dikirim ke Telegram Anda!" });
    } else {
      res.status(200).json({
        success: false,
        error: result.error || "Gagal mengirim pesan tes ke Telegram. Pastikan Anda sudah memulai chat (/start) dengan bot Telegram dan Chat ID sudah benar."
      });
    }
  } catch (err) {
    console.error("[TELEGRAM TEST] Exception:", err);
    res.status(200).json({ success: false, error: err.message || "Gagal menguji koneksi Telegram." });
  }
});
app.post("/api/telegram/sync-todos", (req, res) => {
  try {
    const { todos } = req.body;
    if (Array.isArray(todos)) {
      setServerTodos(todos);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/telegram/sync-transactions", (req, res) => {
  try {
    const { transactions } = req.body;
    if (Array.isArray(transactions)) {
      setServerTransactions(transactions);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/telegram/test-todo-reminder", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { todo, userId } = req.body || {};
    if (!todo) {
      res.status(200).json({ success: false, error: "Data tugas tidak lengkap." });
      return;
    }
    const effectiveUserId = userId || todo.user_id;
    let targetChatId = null;
    if (effectiveUserId) {
      targetChatId = await getUserTelegramChatId(effectiveUserId);
    }
    const intervalVal = Number(todo.reminder_interval_value) || 10;
    const intervalLabel = `${intervalVal} ${todo.reminder_interval_type === "hours" ? "Jam" : "Menit"}`;
    const dayNames = { 1: "Senin", 2: "Selasa", 3: "Rabu", 4: "Kamis", 5: "Jumat", 6: "Sabtu", 0: "Minggu" };
    const allowedDays = Array.isArray(todo.reminder_days) ? todo.reminder_days : [1, 2, 3, 4, 5, 6, 0];
    const daysFormatted = allowedDays.map((d) => dayNames[d] || String(d)).join(", ");
    const testMessage = `\u23F0 TES ALARM PENGINGAT TUGAS
(Diingatkan setiap ${intervalLabel})

\u{1F4CC} Tugas: ${todo.title}
\u{1F4DD} Catatan: ${todo.description || "-"}
\u{1F3AF} Prioritas: ${todo.priority || "Medium"}
\u23F3 Batas Waktu: ${todo.deadline || "-"}
\u{1F4C5} Hari Aktif: ${daysFormatted}
\u{1F6A8} Status: ${todo.status}

\u2705 Pesan tes berhasil! Alarm Telegram Anda telah aktif dan akan mengingatkan Anda setiap ${intervalLabel}.`;
    const result = await sendTelegramMessageDetailed(testMessage, targetChatId || void 0);
    res.status(200).json({
      success: result.success,
      error: result.error,
      targetChatId: targetChatId ? "connected" : "default"
    });
  } catch (err) {
    res.status(200).json({ success: false, error: err.message || "Gagal mengirim pengingat tes." });
  }
});
app.all("/api/*", (_req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint ${_req.method} ${_req.originalUrl} tidak ditemukan di server backend.`
  });
});
async function start() {
  setChatIdResolver(getUserTelegramChatId);
  initTodoReminderScheduler();
  initDailyReportScheduler();
  initMonthlyReportScheduler();
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  start();
}
var backendApp_default = app;
//# sourceMappingURL=server.cjs.map
