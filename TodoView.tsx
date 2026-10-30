import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Clock,
  Edit2,
  Trash2,
  Search,
  CalendarCheck,
  Bell,
  Check,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { TodoItem, PriorityLevel, TodoStatus, ReminderIntervalType } from './types';
import { formatDateTime } from './formatters';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';

interface TodoViewProps {
  todos: TodoItem[];
  userId?: string;
  onAddTodo: (todo: Omit<TodoItem, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTodo: (todo: TodoItem) => void;
  onDeleteTodo: (id: string) => void;
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
  // Values returned by TIMESTAMPTZ contain an explicit timezone. Convert them
  // back to local wall-clock time before filling a datetime-local input.
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(dStr)) {
    const date = new Date(dStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  }
  if (dStr.includes('T')) return dStr.slice(0, 16);
  return `${dStr}T23:59`;
};

const toStorageDateTime = (localValue: string) => {
  const date = new Date(localValue);
  return isNaN(date.getTime()) ? localValue : date.toISOString();
};

const DAY_CONFIG = [
  { day: 1, name: 'Senin', short: 'Sen' },
  { day: 2, name: 'Selasa', short: 'Sel' },
  { day: 3, name: 'Rabu', short: 'Rab' },
  { day: 4, name: 'Kamis', short: 'Kam' },
  { day: 5, name: 'Jumat', short: 'Jum' },
  { day: 6, name: 'Sabtu', short: 'Sab' },
  { day: 0, name: 'Minggu', short: 'Min' },
];

const PRESET_INTERVALS: { label: string; value: number; type: ReminderIntervalType }[] = [
  { label: '10 Mnt', value: 10, type: 'minutes' },
  { label: '15 Mnt', value: 15, type: 'minutes' },
  { label: '30 Mnt', value: 30, type: 'minutes' },
  { label: '1 Jam', value: 1, type: 'hours' },
  { label: '2 Jam', value: 2, type: 'hours' },
];

function formatReminderDays(days?: number[]): string {
  if (!days || days.length === 0 || days.length === 7) return 'Setiap Hari';
  const hasWorkdays = [1, 2, 3, 4, 5].every((d) => days.includes(d));
  if (days.length === 5 && hasWorkdays) return 'Senin - Jumat';
  if (days.length === 2 && days.includes(6) && days.includes(0)) return 'Sabtu - Minggu';

  const dayMap: Record<number, string> = {
    1: 'Sen',
    2: 'Sel',
    3: 'Rab',
    4: 'Kam',
    5: 'Jum',
    6: 'Sab',
    0: 'Min',
  };
  return days.map((d) => dayMap[d] || d).join(', ');
}

export const TodoView: React.FC<TodoViewProps> = ({
  todos,
  userId,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [todoToEdit, setTodoToEdit] = useState<TodoItem | null>(null);
  const [todoToDeleteId, setTodoToDeleteId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [status, setStatus] = useState<TodoStatus>('Todo');
  const [deadline, setDeadline] = useState(getCurrentDateTimeString());

  // Repeat Reminder Form States
  const [repeatReminderEnabled, setRepeatReminderEnabled] = useState(false);
  const [reminderIntervalType, setReminderIntervalType] = useState<ReminderIntervalType>('minutes');
  const [reminderIntervalValue, setReminderIntervalValue] = useState<number>(10);
  const [reminderDays, setReminderDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);

  // Test Reminder status state
  const [testingReminder, setTestingReminder] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setStatus('Todo');
    setDeadline(getCurrentDateTimeString());
    setRepeatReminderEnabled(false);
    setReminderIntervalType('minutes');
    setReminderIntervalValue(10);
    setReminderDays([1, 2, 3, 4, 5, 6, 0]);
    setTestResult(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: TodoItem) => {
    setTodoToEdit(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setPriority(t.priority);
    setStatus(t.status);
    setDeadline(toDateTimeLocalValue(t.deadline));
    setRepeatReminderEnabled(Boolean(t.repeat_reminder_enabled));
    setReminderIntervalType(t.reminder_interval_type || 'minutes');
    setReminderIntervalValue(t.reminder_interval_value || 10);
    setReminderDays(Array.isArray(t.reminder_days) && t.reminder_days.length > 0 ? t.reminder_days : [1, 2, 3, 4, 5, 6, 0]);
    setTestResult(null);
  };

  const toggleDay = (dayNum: number) => {
    if (reminderDays.includes(dayNum)) {
      if (reminderDays.length === 1) return; // keep at least 1 day
      setReminderDays(reminderDays.filter((d) => d !== dayNum));
    } else {
      setReminderDays([...reminderDays, dayNum]);
    }
  };

  const handleTestReminderNow = async () => {
    if (!title.trim()) {
      setTestResult({ success: false, message: 'Harap isi Judul Tugas terlebih dahulu untuk mengetes pesan.' });
      return;
    }

    setTestingReminder(true);
    setTestResult(null);

    try {
      const payloadTodo = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        deadline: toStorageDateTime(deadline),
        repeat_reminder_enabled: repeatReminderEnabled,
        reminder_interval_type: reminderIntervalType,
        reminder_interval_value: reminderIntervalValue,
        reminder_days: reminderDays,
      };

      const res = await fetch('/api/telegram/test-todo-reminder', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todo: payloadTodo,
          userId: userId || undefined,
        }),
      });

      let data: any = null;
      let rawText = '';
      try {
        rawText = await res.text();
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.warn('Could not parse response as JSON:', parseErr, rawText);
      }

      if (data && data.success) {
        setTestResult({
          success: true,
          message: 'Pesan tes alarm pengingat berhasil dikirim ke Telegram Anda!',
        });
      } else {
        const errorMsg =
          data?.error ||
          (!res.ok
            ? `Server merespon dengan status ${res.status}. Silakan refresh halaman dan coba kembali.`
            : 'Gagal mengirim pesan tes. Pastikan Token Bot Telegram & Chat ID telah diatur, serta Anda sudah klik /start di bot.');
        setTestResult({
          success: false,
          message: errorMsg,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Terjadi kesalahan jaringan saat mencoba mengirim pesan tes.',
      });
    } finally {
      setTestingReminder(false);
    }
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTodo({
      user_id: userId || '',
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      deadline: toStorageDateTime(deadline),
      repeat_reminder_enabled: repeatReminderEnabled,
      reminder_interval_type: reminderIntervalType,
      reminder_interval_value: Number(reminderIntervalValue) || 10,
      reminder_days: reminderDays,
    });

    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoToEdit || !title.trim()) return;

    onUpdateTodo({
      ...todoToEdit,
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      deadline: toStorageDateTime(deadline),
      repeat_reminder_enabled: repeatReminderEnabled,
      reminder_interval_type: reminderIntervalType,
      reminder_interval_value: Number(reminderIntervalValue) || 10,
      reminder_days: reminderDays,
      updated_at: new Date().toISOString(),
    });

    setTodoToEdit(null);
    resetForm();
  };

  const filteredTodos = todos.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description ? t.description.toLowerCase().includes(q) : false;
      if (!matchTitle && !matchDesc) return false;
    }
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const getPriorityBadge = (p: PriorityLevel) => {
    if (p === 'High') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400';
    if (p === 'Medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  const getStatusBadge = (s: TodoStatus) => {
    if (s === 'Done') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400';
    if (s === 'In Progress') return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
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

  // Reusable Reminder Alarm Form Controls
  const renderReminderFormSection = () => (
    <div className="p-4 rounded-3xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-4">
      {/* Header Toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Bell className={`w-4 h-4 ${repeatReminderEnabled ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Alarm Pengingat Berulang via Telegram
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Bot Telegram akan mengirim pesan pengingat secara berkala hingga tugas diselesaikan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRepeatReminderEnabled(!repeatReminderEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            repeatReminderEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
          role="switch"
          aria-checked={repeatReminderEnabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              repeatReminderEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* When enabled, show Interval & Days settings */}
      {repeatReminderEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 pt-2 border-t border-purple-200/60 dark:border-purple-800/40"
        >
          {/* Interval Setting */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Mau diingatkan berapa lama sekali? (Interval Alarm)
            </label>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_INTERVALS.map((preset) => {
                const isSelected =
                  reminderIntervalValue === preset.value && reminderIntervalType === preset.type;
                return (
                  <button
                    key={`${preset.value}-${preset.type}`}
                    type="button"
                    onClick={() => {
                      setReminderIntervalValue(preset.value);
                      setReminderIntervalType(preset.type);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  max="720"
                  value={reminderIntervalValue}
                  onChange={(e) => setReminderIntervalValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  placeholder="Contoh: 10"
                />
              </div>

              <select
                value={reminderIntervalType}
                onChange={(e) => setReminderIntervalType(e.target.value as ReminderIntervalType)}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              >
                <option value="minutes">Menit Sekali</option>
                <option value="hours">Jam Sekali</option>
              </select>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              💡 Contoh: Jika Anda memilih <span className="font-semibold text-purple-600 dark:text-purple-400">{reminderIntervalValue} {reminderIntervalType === 'hours' ? 'Jam' : 'Menit'} sekali</span>, maka setiap {reminderIntervalValue} {reminderIntervalType === 'hours' ? 'jam' : 'menit'} pesan alarm akan masuk ke Telegram Anda.
            </p>
          </div>

          {/* Days of Week Setting */}
          <div className="space-y-2 pt-2 border-t border-purple-200/60 dark:border-purple-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilih Hari Pengingat (Senin - Minggu)
              </label>

              {/* Quick Preset Days */}
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setReminderDays([1, 2, 3, 4, 5, 6, 0])}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                >
                  Semua Hari
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setReminderDays([1, 2, 3, 4, 5])}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                >
                  Hari Kerja (Sen-Jum)
                </button>
              </div>
            </div>

            {/* Day Pills */}
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_CONFIG.map((d) => {
                const isSelected = reminderDays.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => toggleDay(d.day)}
                    className={`py-2 rounded-xl text-center text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30 ring-2 ring-purple-600/30'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <span>{d.short}</span>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Aktif pada: <span className="font-semibold text-purple-600 dark:text-purple-400">{formatReminderDays(reminderDays)}</span>
            </p>
          </div>

          {/* Test Reminder Trigger */}
          <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/40">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTestReminderNow}
                disabled={testingReminder}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/40 transition-all disabled:opacity-50"
              >
                {testingReminder ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                )}
                <span>Tes Kirim Alarm ke Telegram</span>
              </button>

              <span className="text-[10px] text-slate-400 text-center sm:text-right">
                Periksa bot Telegram Anda setelah klik
              </span>
            </div>

            {testResult && (
              <div
                className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-full overflow-x-hidden"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Daftar Tugas & Pengingat
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Atur skala prioritas, batas waktu, dan alarm pengingat berkala ke Telegram Anda
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Tambah Tugas Baru</span>
        </button>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        variants={itemVariants}
        className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tugas atau deskripsi..."
            className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
          />
        </div>

        {/* Filter Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
        >
          <option value="all">Semua Status</option>
          <option value="Todo">Belum Selesai (Todo)</option>
          <option value="In Progress">Sedang Dikerjakan (In Progress)</option>
          <option value="Done">Selesai (Done)</option>
        </select>

        {/* Filter Priority */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
        >
          <option value="all">Semua Prioritas</option>
          <option value="High">Tinggi (High)</option>
          <option value="Medium">Sedang (Medium)</option>
          <option value="Low">Rendah (Low)</option>
        </select>
      </motion.div>

      {/* Todo Cards List */}
      <motion.div variants={itemVariants} className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredTodos.map((todo) => (
            <motion.div
              key={todo.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.25 }}
              className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                todo.status === 'Done'
                  ? 'border-slate-200/60 dark:border-slate-800/60 opacity-80'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800'
              }`}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getPriorityBadge(todo.priority)}`}>
                    Prioritas: {todo.priority}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(todo.status)}`}>
                    {todo.status}
                  </span>

                  {/* Repeating Telegram Alarm Badge */}
                  {todo.repeat_reminder_enabled && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        todo.status === 'Done'
                          ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      }`}
                      title={`Alarm aktif setiap ${todo.reminder_interval_value || 10} ${
                        todo.reminder_interval_type === 'hours' ? 'Jam' : 'Menit'
                      } pada ${formatReminderDays(todo.reminder_days)}`}
                    >
                      <Bell className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span>
                        Alarm: Tiap {todo.reminder_interval_value || 10}{' '}
                        {todo.reminder_interval_type === 'hours' ? 'Jam' : 'Mnt'} (
                        {formatReminderDays(todo.reminder_days)})
                      </span>
                    </span>
                  )}
                </div>

                <h3 className={`font-bold text-base ${todo.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                  {todo.title}
                </h3>

                {todo.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {todo.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 flex-wrap">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-purple-500" /> Batas Waktu: {formatDateTime(todo.deadline)}
                  </span>
                </div>
              </div>

              {/* Quick Status Actions & Edit */}
              <div className="flex items-center gap-2 self-start sm:self-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                <select
                  value={todo.status}
                  onChange={(e) =>
                    onUpdateTodo({ ...todo, status: e.target.value as TodoStatus })
                  }
                  className="px-3 py-2 text-xs font-bold rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 focus:outline-none cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all"
                >
                  <option value="Todo">Todo</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>

                <button
                  onClick={() => handleOpenEdit(todo)}
                  className="p-2.5 rounded-2xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 active:scale-90 transition-all"
                  title="Edit Todo & Pengaturan Alarm"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTodoToDeleteId(todo.id)}
                  className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-90 transition-all"
                  title="Hapus Todo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredTodos.length === 0 && (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-3xl flex items-center justify-center mx-auto">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <p className="text-xs text-slate-400">Tidak ada tugas ditemukan.</p>
            <button
              onClick={handleOpenAdd}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
            >
              Tambah Tugas Pertama
            </button>
          </div>
        )}
      </motion.div>

      {/* Modal: Tambah Tugas Baru */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Tugas Baru">
        <form onSubmit={handleSubmitAdd} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Judul Tugas</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Bayar Tagihan Listrik & Internet"
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail instruksi atau catatan tugas..."
              rows={2}
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Prioritas</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              >
                <option value="Low">Low (Rendah)</option>
                <option value="Medium">Medium (Sedang)</option>
                <option value="High">High (Tinggi)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TodoStatus)}
                className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              >
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Batas Waktu & Jam (Deadline)</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              required
            />
          </div>

          {/* Repeat Reminder Telegram Alarm Section */}
          {renderReminderFormSection()}

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 text-xs font-bold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              Simpan Tugas
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Tugas */}
      <Modal isOpen={!!todoToEdit} onClose={() => setTodoToEdit(null)} title="Edit Tugas">
        <form onSubmit={handleSubmitEdit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Judul Tugas</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Prioritas</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              >
                <option value="Low">Low (Rendah)</option>
                <option value="Medium">Medium (Sedang)</option>
                <option value="High">High (Tinggi)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TodoStatus)}
                className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              >
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Batas Waktu & Jam (Deadline)</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              required
            />
          </div>

          {/* Repeat Reminder Telegram Alarm Section */}
          {renderReminderFormSection()}

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTodoToEdit(null)}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 text-xs font-bold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              Perbarui Tugas
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Todo Modal */}
      <ConfirmModal
        isOpen={!!todoToDeleteId}
        onClose={() => setTodoToDeleteId(null)}
        onConfirm={() => {
          if (todoToDeleteId) onDeleteTodo(todoToDeleteId);
        }}
        title="Hapus Tugas"
        message="Apakah Anda yakin ingin menghapus data tugas ini?"
      />
    </motion.div>
  );
};
