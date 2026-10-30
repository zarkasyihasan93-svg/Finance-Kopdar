import React, { useState, useEffect } from 'react';
import {
  Mail,
  Moon,
  Sun,
  LogOut,
  LogIn,
  ShieldCheck,
  Database,
  RefreshCw,
  Layers,
  Send,
  Check,
  Copy,
  AlertCircle,
  Trash2,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppUser, TelegramConnection } from './types';
import {
  getSupabaseTelegramConnection,
  upsertSupabaseTelegramConnection,
  deleteSupabaseTelegramConnection,
  isSupabaseConfigured,
} from './supabase';

interface ProfileViewProps {
  user: AppUser | null;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onUpdatePasswordClick?: () => void;
  spreadsheetUrl?: string;
  isSheetsConnected?: boolean;
  onReconnectSheets?: () => void;
}

const TELEGRAM_SCHEMA_SQL = `-- ============================================================
-- TELEGRAM CONNECTIONS
-- Satu koneksi Telegram untuk masing-masing user
-- ============================================================

CREATE TABLE IF NOT EXISTS public.telegram_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    telegram_chat_id TEXT NOT NULL,
    telegram_username TEXT,
    telegram_first_name TEXT,

    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT telegram_connections_user_unique
        UNIQUE (user_id),

    CONSTRAINT telegram_connections_chat_unique
        UNIQUE (telegram_chat_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_telegram_connections_user_id
ON public.telegram_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_connections_chat_id
ON public.telegram_connections(telegram_chat_id);

-- UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS telegram_connections_updated_at
ON public.telegram_connections;

CREATE TRIGGER telegram_connections_updated_at
BEFORE UPDATE ON public.telegram_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ROW LEVEL SECURITY
ALTER TABLE public.telegram_connections ENABLE ROW LEVEL SECURITY;

-- User hanya boleh melihat koneksi Telegram miliknya
DROP POLICY IF EXISTS "Users can view own telegram connection"
ON public.telegram_connections;

CREATE POLICY "Users can view own telegram connection"
ON public.telegram_connections
FOR SELECT
USING (auth.uid() = user_id);

-- User hanya boleh membuat koneksi untuk dirinya sendiri
DROP POLICY IF EXISTS "Users can insert own telegram connection"
ON public.telegram_connections;

CREATE POLICY "Users can insert own telegram connection"
ON public.telegram_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User hanya boleh mengubah koneksi miliknya
DROP POLICY IF EXISTS "Users can update own telegram connection"
ON public.telegram_connections;

CREATE POLICY "Users can update own telegram connection"
ON public.telegram_connections
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- User hanya boleh menghapus koneksi miliknya
DROP POLICY IF EXISTS "Users can delete own telegram connection"
ON public.telegram_connections;

CREATE POLICY "Users can delete own telegram connection"
ON public.telegram_connections
FOR DELETE
USING (auth.uid() = user_id);`;

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  isDarkMode,
  setIsDarkMode,
  onLoginClick,
  onLogoutClick,
  onUpdatePasswordClick,
  isSheetsConnected,
  onReconnectSheets,
}) => {
  // Telegram multi-user connection state
  const [telegramConn, setTelegramConn] = useState<TelegramConnection | null>(null);
  const [chatIdInput, setChatIdInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [firstNameInput, setFirstNameInput] = useState('');
  const [isActiveInput, setIsActiveInput] = useState(true);

  const [isLoadingTelegram, setIsLoadingTelegram] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isDeletingTelegram, setIsDeletingTelegram] = useState(false);
  const [telegramNotice, setTelegramNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [hasCopiedSql, setHasCopiedSql] = useState(false);

  // Load existing user's telegram connection from Supabase
  useEffect(() => {
    let isMounted = true;
    const fetchTelegramConnection = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setTelegramConn(null);
        return;
      }

      setIsLoadingTelegram(true);
      try {
        const conn = await getSupabaseTelegramConnection(user.id);
        if (isMounted && conn) {
          setTelegramConn(conn);
          setChatIdInput(conn.telegram_chat_id || '');
          setUsernameInput(conn.telegram_username || '');
          setFirstNameInput(conn.telegram_first_name || '');
          setIsActiveInput(conn.is_active !== undefined ? conn.is_active : true);
        } else if (isMounted) {
          setTelegramConn(null);
        }
      } catch (err) {
        console.warn('Failed to load telegram connection:', err);
      } finally {
        if (isMounted) setIsLoadingTelegram(false);
      }
    };

    fetchTelegramConnection();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Handle Save / Update Connection
  const handleSaveTelegram = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user?.id) {
      setTelegramNotice({ type: 'error', message: 'Silakan masuk ke akun terlebih dahulu.' });
      return;
    }

    const cleanChatId = chatIdInput.trim();
    if (!cleanChatId) {
      setTelegramNotice({ type: 'error', message: 'Chat ID Telegram tidak boleh kosong.' });
      return;
    }

    if (cleanChatId.startsWith('@')) {
      setTelegramNotice({
        type: 'error',
        message: 'Chat ID Telegram harus berupa angka numerik (contoh: 123456789), bukan username @. Anda bisa mendapatkan Chat ID melalui bot @userinfobot di Telegram.',
      });
      return;
    }

    setIsSavingTelegram(true);
    setTelegramNotice(null);

    try {
      const saved = await upsertSupabaseTelegramConnection(
        {
          telegram_chat_id: cleanChatId,
          telegram_username: usernameInput.trim() ? usernameInput.trim().replace(/^@/, '') : null,
          telegram_first_name: firstNameInput.trim() || null,
          is_active: isActiveInput,
        },
        user.id
      );

      if (saved) {
        setTelegramConn(saved);
        setTelegramNotice({
          type: 'success',
          message: 'Koneksi Telegram berhasil disimpan ke database!',
        });
      }
    } catch (err: any) {
      console.error('Failed to save telegram connection:', err);
      setTelegramNotice({
        type: 'error',
        message:
          err?.message ||
          'Gagal menyimpan koneksi Telegram. Pastikan tabel telegram_connections sudah dibuat di Supabase.',
      });
    } finally {
      setIsSavingTelegram(false);
    }
  };

  // Handle Test Connection
  const handleTestTelegram = async () => {
    const targetChatId = chatIdInput.trim() || telegramConn?.telegram_chat_id;
    if (!targetChatId) {
      setTelegramNotice({
        type: 'error',
        message: 'Masukkan Chat ID Telegram terlebih dahulu sebelum mengirim tes.',
      });
      return;
    }

    if (targetChatId.startsWith('@')) {
      setTelegramNotice({
        type: 'error',
        message: 'Chat ID Telegram harus berupa angka numerik (contoh: 123456789), bukan username @. Cek ID Anda di bot Telegram @userinfobot.',
      });
      return;
    }

    setIsTestingTelegram(true);
    setTelegramNotice(null);

    try {
      const response = await fetch('/api/telegram/test-connection', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChatId,
          userId: user?.id,
        }),
      });

      let data: any = null;
      let rawText = '';
      try {
        rawText = await response.text();
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.warn('Could not parse response as JSON:', parseError, rawText);
      }

      if (data && data.success) {
        setTelegramNotice({
          type: 'success',
          message: data.message || 'Pesan tes berhasil dikirim! Silakan periksa Telegram Anda.',
        });
      } else {
        const errorMsg =
          data?.error ||
          (!response.ok
            ? `Server sedang dalam proses reload atau mengembalikan status ${response.status}. Silakan muat ulang (refresh) halaman aplikasi lalu coba kembali.`
            : 'Gagal mengirim pesan ke Telegram. Pastikan Chat ID sudah benar dan Anda sudah memulai chat (/start) dengan bot Telegram.');
        setTelegramNotice({
          type: 'error',
          message: errorMsg,
        });
      }
    } catch (err: any) {
      setTelegramNotice({
        type: 'error',
        message:
          'Gagal menghubungi server pengirim pesan Telegram: ' +
          (err?.message || 'Koneksi terputus. Silakan coba kembali.'),
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // Handle Disconnect
  const handleDisconnectTelegram = async () => {
    if (!user?.id) return;
    if (!window.confirm('Apakah Anda yakin ingin memutuskan koneksi Telegram dari akun ini?')) {
      return;
    }

    setIsDeletingTelegram(true);
    setTelegramNotice(null);

    try {
      await deleteSupabaseTelegramConnection(user.id);
      setTelegramConn(null);
      setChatIdInput('');
      setUsernameInput('');
      setFirstNameInput('');
      setTelegramNotice({
        type: 'success',
        message: 'Koneksi Telegram berhasil diputuskan.',
      });
    } catch (err: any) {
      setTelegramNotice({
        type: 'error',
        message: 'Gagal memutuskan koneksi Telegram: ' + (err?.message || err),
      });
    } finally {
      setIsDeletingTelegram(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(TELEGRAM_SCHEMA_SQL);
      setHasCopiedSql(true);
      setTimeout(() => setHasCopiedSql(false), 2500);
    } catch (err) {
      console.error('Failed to copy SQL:', err);
    }
  };
  return (
    <div className="max-w-3xl mx-auto space-y-6 overflow-x-hidden">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Profil & Pengaturan
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pengaturan autentikasi akun Supabase, tema tampilan, dan koneksi database PostgreSQL
        </p>
      </div>

      {/* User Info Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="User Avatar"
              className="w-20 h-20 rounded-3xl border-2 border-purple-100 dark:border-purple-900 object-cover shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-purple-500/20">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}

          <div className="space-y-1.5 min-w-0">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {user ? user.displayName || 'Pengguna App' : 'Pengguna Tamu'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5 text-purple-500" />
              <span>{user ? user.email : 'Belum masuk ke akun'}</span>
            </p>
            {user && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full mt-1 border border-emerald-200/60 dark:border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Akun Terverifikasi (Supabase Auth)
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 justify-end">
          {user ? (
            <>
              {onUpdatePasswordClick && (
                <button
                  onClick={onUpdatePasswordClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  <span>Ubah Password</span>
                </button>
              )}
              <button
                onClick={onLogoutClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar (Logout)</span>
              </button>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk / Daftar Akun</span>
            </button>
          )}
        </div>
      </div>

      {/* Preferences Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tampilan & Tema</h3>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Mode Gelap (Dark Mode)</p>
              <p className="text-[11px] text-slate-400">Ganti tema tampilan aplikasi antara terang & gelap</p>
            </div>
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${
              isDarkMode ? 'bg-purple-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform shadow-md ${
                isDarkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Supabase PostgreSQL Database Connection Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Database Supabase PostgreSQL</h3>
              <p className="text-[11px] text-slate-400">Penyimpanan cloud terenkripsi dengan Row Level Security (RLS)</p>
            </div>
          </div>

          {user && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                isSheetsConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60'
              }`}
            >
              {isSheetsConnected ? 'Terhubung (Cloud RLS)' : 'Offline / Tamu'}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Seluruh data transaksi, kategori, anggaran, dan tugas tersimpan di Supabase PostgreSQL. Kebijakan Row Level Security (RLS) menjamin hanya akun Anda yang dapat membaca dan memodifikasi data milik Anda.
        </p>

        {user && isSheetsConnected ? (
          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Supabase Sinkronisasi Aktif</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Tabel: transactions, categories, budgets, todos</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/60 px-3 py-1.5 rounded-xl">
              Sinkronisasi Otomatis
            </span>
          </div>
        ) : user && !isSheetsConnected ? (
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Koneksi Supabase Belum Terhubung</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Pastikan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah dikonfigurasi.</p>
            </div>
            {onReconnectSheets && (
              <button
                onClick={onReconnectSheets}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-md shadow-purple-600/20 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Hubungkan</span>
              </button>
            )}
          </div>
        ) : !user ? (
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/50">
            <p className="text-xs text-purple-800 dark:text-purple-300">
              Silakan "Masuk ke Akun" untuk mengaktifkan sinkronisasi otomatis ke database Supabase Anda.
            </p>
          </div>
        ) : null}
      </div>

      {/* Telegram Bot Connection Card (Multi-User Dedicated Channel) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Koneksi Telegram Bot</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Satu koneksi Telegram khusus untuk masing-masing user akun
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {telegramConn?.telegram_chat_id ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {telegramConn.is_active ? 'Terhubung & Aktif' : 'Nonaktif'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                Belum Terhubung
              </span>
            )}
          </div>
        </div>

        {/* Multi-User Architecture Diagram */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 space-y-2">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Arsitektur Saluran Multi-User:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
              Web App
            </span>
            <span className="text-slate-400">➔</span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs">
              Supabase Auth
            </span>
            <span className="text-slate-400">➔</span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
              {user?.displayName || user?.email || 'Akun Anda'}
            </span>
            <span className="text-slate-400">➔</span>
            <span className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs">
              Telegram Bot
            </span>
            <span className="text-slate-400">➔</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              Chat Pribadi {telegramConn?.telegram_chat_id ? `(#${telegramConn.telegram_chat_id})` : ''}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Setiap user memiliki pemetaan koneksi 1:1 di tabel <code className="text-purple-600 dark:text-purple-400 font-mono">telegram_connections</code>. Notifikasi transaksi dan pengiriman PDF hanya masuk ke Telegram Chat Anda.
          </p>
        </div>

        {/* Form or Guest Notice */}
        {!user ? (
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/50">
            <p className="text-xs text-purple-800 dark:text-purple-300">
              Silakan <strong>Masuk / Daftar Akun</strong> terlebih dahulu untuk menghubungkan akun Telegram pribadi Anda.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSaveTelegram} className="space-y-4">
            {telegramNotice && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                  telegramNotice.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {telegramNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{telegramNotice.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-1 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Telegram Chat ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="-?[0-9]*"
                  required
                  placeholder="Contoh: 123456789"
                  value={chatIdInput}
                  onChange={(e) => setChatIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="sm:col-span-1 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Username Telegram <span className="text-[10px] text-slate-400">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: @username_anda"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="sm:col-span-1 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Panggilan <span className="text-[10px] text-slate-400">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Dadan"
                  value={firstNameInput}
                  onChange={(e) => setFirstNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Aktifkan Notifikasi Bot (is_active)
                </p>
                <p className="text-[11px] text-slate-400">
                  Kirim notifikasi instan setiap kali Anda mencatat transaksi baru
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActiveInput(!isActiveInput)}
                className={`w-11 h-6 rounded-full p-1 transition-colors ${
                  isActiveInput ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                    isActiveInput ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={isSavingTelegram}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingTelegram ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{telegramConn ? 'Perbarui Koneksi' : 'Simpan Koneksi'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram || (!chatIdInput.trim() && !telegramConn?.telegram_chat_id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isTestingTelegram ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Kirim Pesan Tes</span>
                </button>
              </div>

              {telegramConn && (
                <button
                  type="button"
                  onClick={handleDisconnectTelegram}
                  disabled={isDeletingTelegram}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Putuskan Koneksi</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* Helpful Tips: How to find Telegram Chat ID */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 overflow-hidden text-xs">
          <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/30 flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
            <HelpCircle className="w-4 h-4 text-sky-500" />
            <span>Cara Mendapatkan Telegram Chat ID Anda</span>
          </div>
          <div className="p-3.5 space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
            <p>1. Buka aplikasi Telegram Anda.</p>
            <p>2. Cari bot <code className="text-sky-600 dark:text-sky-400 font-mono">@userinfobot</code> atau mulai chat dengan mengirim pesan <code className="text-sky-600 dark:text-sky-400 font-mono">/start</code> ke bot Telegram.</p>
            <p>3. Bot akan menampilkan <strong>Id</strong> numerik Anda (contoh: <code className="font-mono text-slate-700 dark:text-slate-300">123456789</code>).</p>
            <p>4. Masukkan nomor tersebut ke input <strong>Telegram Chat ID</strong> di atas lalu klik <strong>Simpan Koneksi</strong>.</p>
          </div>
        </div>

        {/* Database Migration SQL Snippet Viewer */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowSqlSchema(!showSqlSchema)}
            className="w-full p-3.5 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-500" />
              <span>SQL Schema: Tabel telegram_connections (Supabase)</span>
            </div>
            {showSqlSchema ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showSqlSchema && (
            <div className="p-3.5 bg-slate-900 text-slate-200 font-mono text-[11px] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Jalankan di Supabase SQL Editor:</span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-sans text-xs transition-colors"
                >
                  {hasCopiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{hasCopiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                </button>
              </div>
              <pre className="overflow-x-auto p-3 rounded-xl bg-slate-950 text-emerald-400 leading-normal border border-slate-800">
                {TELEGRAM_SCHEMA_SQL}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
