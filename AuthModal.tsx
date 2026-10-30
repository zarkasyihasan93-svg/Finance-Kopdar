import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  X,
  LogIn,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  loginWithEmail,
  requestPasswordReset,
  updateNewPassword,
} from './auth';
import { AppUser } from './types';

export type AuthMode = 'login' | 'forgot-password' | 'reset-password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  onAuthSuccess?: (user: AppUser) => void;
  standalone?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onAuthSuccess,
  standalone = false,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, initialMode]);

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Form validations
    if (mode === 'reset-password') {
      if (!password) {
        setErrorMessage('Password baru tidak boleh kosong.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password minimal 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Konfirmasi password tidak cocok.');
        return;
      }
    } else {
      if (!email.trim()) {
        setErrorMessage('Email tidak boleh kosong.');
        return;
      }
      if (!validateEmail(email)) {
        setErrorMessage('Format email tidak valid (contoh: user@example.com).');
        return;
      }

      if (mode !== 'forgot-password') {
        if (!password) {
          setErrorMessage('Password tidak boleh kosong.');
          return;
        }
        if (password.length < 6) {
          setErrorMessage('Password minimal 6 karakter.');
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const user = await loginWithEmail(email, password);
        onAuthSuccess?.(user);
        if (!standalone) onClose();
      } else if (mode === 'forgot-password') {
        await requestPasswordReset(email);
        setSuccessMessage(
          'Tautan reset password telah dikirim ke email Anda. Silakan klik tautan pada email tersebut untuk mengatur password baru.'
        );
      } else if (mode === 'reset-password') {
        await updateNewPassword(password);
        setSuccessMessage('Password berhasil diperbarui! Anda dapat masuk sekarang.');
        setTimeout(() => {
          handleSwitchMode('login');
        }, 1500);
      }
    } catch (err: any) {
      console.error('[AuthModal] Error:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses permintaan.');
    } finally {
      setIsLoading(false);
    }
  };

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 12 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-4 sm:my-6"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/25">
            {mode === 'login' ? <Wallet className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {mode === 'login' && 'Masuk ke FinanceFlow'}
              {mode === 'forgot-password' && 'Lupa Password'}
              {mode === 'reset-password' && 'Atur Password Baru'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === 'login' && 'Silakan masuk dengan akun terdaftar Anda'}
              {mode === 'forgot-password' && 'Kami akan mengirim tautan pemulihan ke email Anda'}
              {mode === 'reset-password' && 'Masukkan password baru untuk akun Anda'}
            </p>
          </div>
        </div>

        {!standalone && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Error notification */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 overflow-hidden"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success notification */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5 overflow-hidden"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMessage}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Input */}
        {mode !== 'reset-password' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Alamat Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                disabled={isLoading}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-60"
              />
            </div>
          </div>
        )}

        {/* Password Input (not displayed on forgot-password mode) */}
        {mode !== 'forgot-password' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {mode === 'reset-password' ? 'Password Baru' : 'Password'}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => handleSwitchMode('forgot-password')}
                  className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Lupa Password?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                disabled={isLoading}
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Confirm Password Input (only on reset-password mode) */}
        {mode === 'reset-password' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Masukkan ulang password Anda"
                disabled={isLoading}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-60"
              />
            </div>
          </div>
        )}

        {/* Action Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              {mode === 'login' && (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Akun</span>
                </>
              )}
              {mode === 'forgot-password' && (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Kirim Tautan Reset</span>
                </>
              )}
              {mode === 'reset-password' && (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Simpan Password Baru</span>
                </>
              )}
            </>
          )}
        </button>

        {/* Switch Mode Links (Back to Login when in forgot-password or reset-password) */}
        {(mode === 'forgot-password' || mode === 'reset-password') && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => handleSwitchMode('login')}
              className="inline-flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Halaman Masuk</span>
            </button>
          </div>
        )}

        {/* Data Security Note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Akses aman & terlindungi</span>
        </div>
      </form>
    </motion.div>
  );

  if (standalone) {
    return cardContent;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={onClose}
        >
          {cardContent}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
