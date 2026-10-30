import React from 'react';
import { Search, Sun, Moon, LogIn, User as UserIcon, RefreshCw, Menu } from 'lucide-react';
import { AppUser } from './types';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  user: AppUser | null;
  onLoginClick: () => void;
  onProfileClick: () => void;
  isSyncing?: boolean;
  onRefreshSync?: () => void;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  setSearchQuery,
  isDarkMode,
  setIsDarkMode,
  user,
  onLoginClick,
  onProfileClick,
  isSyncing,
  onRefreshSync,
  onOpenMobileMenu,
}) => {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 min-w-0 overscroll-none select-none">
      {/* Left side: Mobile menu toggle */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all flex-shrink-0"
          title="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Sync Status Button */}
        {onRefreshSync && (
          <button
            onClick={onRefreshSync}
            disabled={isSyncing}
            title="Sinkronkan Data Supabase"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-90 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-slate-900 dark:text-slate-100' : ''}`} />
          </button>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-90 transition-all"
          title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
        </button>

        {/* User Account / Login */}
        {user ? (
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2 p-1 sm:pl-2.5 sm:pr-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-95 transition-all text-left"
          >
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                {user.displayName || 'Pengguna'}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{user.email}</p>
            </div>
            {user.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xs">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-white font-medium text-xs active:scale-95 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Masuk / Daftar</span>
          </button>
        )}
      </div>
    </header>
  );
};
