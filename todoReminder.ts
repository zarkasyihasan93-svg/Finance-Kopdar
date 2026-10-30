import cron from 'node-cron';
import { sendTelegramMessage } from './telegram.js';

export interface ServerTodo {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  deadline: string; // YYYY-MM-DDTHH:mm or ISO string
  created_at?: string;
  updated_at?: string;
  sent_reminders?: string; // Comma-separated tags, e.g., "30_min_before,overdue"
  repeat_reminder_enabled?: boolean;
  reminder_interval_type?: 'minutes' | 'hours';
  reminder_interval_value?: number;
  reminder_days?: number[]; // [0, 1, 2, 3, 4, 5, 6] where 0=Minggu, 1=Senin, ..., 6=Sabtu
  last_reminder_sent_at?: string;
}

// In-memory reference populated from client sync
let cachedServerTodos: ServerTodo[] = [];
let chatIdResolver: ((userId?: string) => Promise<string | null>) | null = null;

export function setChatIdResolver(resolver: (userId?: string) => Promise<string | null>) {
  chatIdResolver = resolver;
}

export function setServerTodos(todos: ServerTodo[]) {
  cachedServerTodos = todos;
}

export function getServerTodos(): ServerTodo[] {
  return cachedServerTodos;
}

export function addOrUpdateServerTodo(todo: ServerTodo) {
  const index = cachedServerTodos.findIndex((t) => t.id === todo.id);
  if (index !== -1) {
    cachedServerTodos[index] = todo;
  } else {
    cachedServerTodos.push(todo);
  }
}

export function removeServerTodo(id: string) {
  cachedServerTodos = cachedServerTodos.filter((t) => t.id !== id);
}

// Format timestamp display helper
function formatDateTimeDisplay(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(',', '');
}

const DAY_NAMES_MAP: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  0: 'Minggu',
};

// Update sent_reminders in memory
function markReminderSent(todo: ServerTodo, reminderTag: string) {
  const existingTags = todo.sent_reminders ? todo.sent_reminders.split(',').filter(Boolean) : [];
  if (existingTags.includes(reminderTag)) return;
  existingTags.push(reminderTag);
  const updatedSentReminders = existingTags.join(',');
  todo.sent_reminders = updatedSentReminders;
  addOrUpdateServerTodo(todo);
}

// Check deadline reminders & repeating interval reminders
export async function checkAndSendTodoReminders() {
  const now = new Date();
  const todos = getServerTodos();

  // Get current day of week in Asia/Jakarta timezone (0=Sunday, 1=Monday, ..., 6=Saturday)
  let currentDay = now.getDay();
  try {
    const jktDateStr = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const jktDate = new Date(jktDateStr);
    if (!isNaN(jktDate.getTime())) {
      currentDay = jktDate.getDay();
    }
  } catch {
    // fallback to now.getDay()
  }

  for (const todo of todos) {
    // Skip completed / done tasks
    if (todo.status === 'Done' || todo.status === 'Completed') {
      continue;
    }

    // Resolve target Chat ID for this specific user
    let targetChatId: string | undefined = undefined;
    if (chatIdResolver && todo.user_id) {
      const resolved = await chatIdResolver(todo.user_id);
      if (resolved) targetChatId = resolved;
    }

    // ----------------------------------------------------
    // 1. REPEAT REMINDER ALARM (Interval-based reminder)
    // ----------------------------------------------------
    if (todo.repeat_reminder_enabled) {
      const intervalVal = Number(todo.reminder_interval_value) || 10;
      const intervalMinutes = todo.reminder_interval_type === 'hours' ? intervalVal * 60 : intervalVal;

      // Check allowed days: default to all days if empty or not set
      const allowedDays = Array.isArray(todo.reminder_days) && todo.reminder_days.length > 0
        ? todo.reminder_days
        : [1, 2, 3, 4, 5, 6, 0];

      const isDayAllowed = allowedDays.includes(currentDay);

      if (isDayAllowed && intervalMinutes > 0) {
        let shouldSendRepeat = false;

        if (!todo.last_reminder_sent_at) {
          // If never sent before: check if at least 1 interval elapsed since creation
          const createdTime = todo.created_at ? new Date(todo.created_at).getTime() : 0;
          if (createdTime > 0) {
            const elapsedMinutes = (now.getTime() - createdTime) / (1000 * 60);
            if (elapsedMinutes >= intervalMinutes) {
              shouldSendRepeat = true;
            }
          } else {
            // First time running without created_at: mark baseline now
            todo.last_reminder_sent_at = now.toISOString();
            addOrUpdateServerTodo(todo);
          }
        } else {
          const lastSentTime = new Date(todo.last_reminder_sent_at).getTime();
          if (!isNaN(lastSentTime)) {
            const elapsedMinutes = (now.getTime() - lastSentTime) / (1000 * 60);
            if (elapsedMinutes >= intervalMinutes) {
              shouldSendRepeat = true;
            }
          } else {
            shouldSendRepeat = true;
          }
        }

        if (shouldSendRepeat) {
          const intervalLabel = `${intervalVal} ${todo.reminder_interval_type === 'hours' ? 'Jam' : 'Menit'}`;
          const daysFormatted = allowedDays.map((d) => DAY_NAMES_MAP[d] || String(d)).join(', ');

          const repeatMessage = `⏰ ALARM PENGINGAT TUGAS
(Diingatkan setiap ${intervalLabel})

📌 Tugas: ${todo.title}
📝 Catatan: ${todo.description || '-'}
🎯 Prioritas: ${todo.priority || 'Medium'}
⏳ Batas Waktu: ${formatDateTimeDisplay(todo.deadline)}
📅 Hari Aktif: ${daysFormatted}
🚨 Status: ${todo.status}

💡 Tetap produktif dan selesaikan tugas ini tepat waktu!`;

          const sent = await sendTelegramMessage(repeatMessage, targetChatId);
          if (sent) {
            console.log(`[SCHEDULER LOG] Repeat reminder sent for "${todo.title}" (every ${intervalLabel})`);
            todo.last_reminder_sent_at = now.toISOString();
            addOrUpdateServerTodo(todo);
          }
        }
      }
    }

    // ----------------------------------------------------
    // 2. DEADLINE REMINDERS (30m before & overdue)
    // ----------------------------------------------------
    if (todo.deadline) {
      const deadlineDate = new Date(todo.deadline);
      if (!isNaN(deadlineDate.getTime())) {
        const diffMs = deadlineDate.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        const sentTags = todo.sent_reminders ? todo.sent_reminders.split(',').filter(Boolean) : [];

        // 30 Menit Sebelum Deadline
        if (diffMinutes > 0 && diffMinutes <= 30 && !sentTags.includes('30_min_before')) {
          const message = `⏰ Reminder Todo (30 Menit Sebelum Deadline)

📌 Judul: ${todo.title}
📝 Deskripsi: ${todo.description || '-'}
🎯 Prioritas: ${todo.priority || 'Medium'}
⏳ Deadline: ${formatDateTimeDisplay(todo.deadline)}
🚨 Sisa Waktu: ${Math.ceil(diffMinutes)} Menit`;

          const sent = await sendTelegramMessage(message, targetChatId);
          if (sent) {
            console.log(`[SCHEDULER LOG] Sent 30-min-before reminder for todo: "${todo.title}"`);
            markReminderSent(todo, '30_min_before');
          }
        }

        // Overdue (Past deadline)
        if (diffMinutes <= 0 && !sentTags.includes('overdue')) {
          const message = `⚠️ WARNING: Deadline Todo Terlewat!

📌 Judul: ${todo.title}
📝 Deskripsi: ${todo.description || '-'}
🎯 Prioritas: ${todo.priority || 'Medium'}
⏳ Deadline: ${formatDateTimeDisplay(todo.deadline)}
🚨 Status: Belum Selesai`;

          const sent = await sendTelegramMessage(message, targetChatId);
          if (sent) {
            console.log(`[SCHEDULER LOG] Sent overdue notification for todo: "${todo.title}"`);
            markReminderSent(todo, 'overdue');
          }
        }
      }
    }
  }
}

// Send Scheduled Ringkasan Todo (Summary at 06:00, 10:00, 15:00, 19:00 WIB)
async function sendScheduledTodoSummary(timeSlot: string) {
  const todos = getServerTodos();
  const activeTodos = todos.filter((t) => t.status !== 'Done' && t.status !== 'Completed');

  if (activeTodos.length === 0) {
    const emptyMessage = `📋 Ringkasan Todo (${timeSlot} WIB)

🎉 Selamat! Tidak ada todo aktif yang pending saat ini.`;
    await sendTelegramMessage(emptyMessage);
    return;
  }

  const todoListStr = activeTodos
    .map(
      (t, i) =>
        `${i + 1}. ${t.title}
   • Deadline: ${formatDateTimeDisplay(t.deadline)}
   • Prioritas: ${t.priority || 'Medium'}
   • Status: ${t.status}`
    )
    .join('\n\n');

  const summaryMessage = `📋 Ringkasan Todo Hari Ini (${timeSlot} WIB)
Total Todo Aktif: ${activeTodos.length} item

${todoListStr}`;

  await sendTelegramMessage(summaryMessage);
  console.log(`[SCHEDULER LOG] Scheduled daily todo summary sent for ${timeSlot} WIB.`);
}

export function initTodoReminderScheduler() {
  // Check reminders every minute: '* * * * *'
  cron.schedule('* * * * *', () => {
    checkAndSendTodoReminders();
  });

  // Schedule summaries at 06:00, 10:00, 15:00, 19:00 WIB (Asia/Jakarta timezone)
  const cronConfig = { timezone: 'Asia/Jakarta' };

  cron.schedule('0 6 * * *', () => sendScheduledTodoSummary('06:00'), cronConfig);
  cron.schedule('0 10 * * *', () => sendScheduledTodoSummary('10:00'), cronConfig);
  cron.schedule('0 15 * * *', () => sendScheduledTodoSummary('15:00'), cronConfig);
  cron.schedule('0 19 * * *', () => sendScheduledTodoSummary('19:00'), cronConfig);

  console.log('[SCHEDULER LOG] Todo Reminder Scheduler & Summaries initialized successfully.');
}
