import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  History,
  PieChart,
  FileText,
  CheckSquare,
  User as UserIcon,
  Database,
  X,
  RefreshCw,
} from 'lucide-react';
import { AppUser } from './types';

export type ActiveTab = 'dashboard' | 'transactions' | 'history' | 'budget' | 'reports' | 'todo' | 'profile';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  spreadsheetUrl?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isSheetsConnected?: boolean;
  onReconnectSheets?: () => void;
  user?: AppUser | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  onMobileClose,
  isSheetsConnected,
  onReconnectSheets,
  user,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
    { id: 'history', label: 'Riwayat', icon: History },
    { id: 'budget', label: 'Anggaran', icon: PieChart },
    { id: 'reports', label: 'Laporan', icon: FileText },
    { id: 'todo', label: 'Daftar Tugas', icon: CheckSquare },
    { id: 'profile', label: 'Profil', icon: UserIcon },
  ] as const;

  const navContent = (
    <>
      <div>
        {/* Mobile Close Button Header (only shown on mobile drawer) */}
        {onMobileClose && (
          <div className="h-14 flex items-center justify-end px-4 border-b border-slate-200/80 dark:border-slate-800 md:hidden">
            <button
              onClick={onMobileClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as ActiveTab);
                  onMobileClose?.();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 shadow-xs translate-x-1'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:translate-x-0.5'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'text-purple-600 dark:text-purple-400 scale-110' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Supabase PostgreSQL Database Status Card */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Database Supabase</p>
            <Database className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                user && isSheetsConnected
                  ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                  : user && !isSheetsConnected
                  ? 'bg-amber-400 shadow-xs shadow-amber-400/50'
                  : 'bg-slate-400'
              }`}
            ></span>
            <span className="truncate">
              {user && isSheetsConnected
                ? 'Supabase DB (Terhubung)'
                : user && !isSheetsConnected
                ? 'Supabase DB (Offline/Lokal)'
                : 'Penyimpanan Lokal'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {user && isSheetsConnected
              ? 'Data tersimpan otomatis di PostgreSQL RLS'
              : user && !isSheetsConnected
              ? 'Mode offline / cek konfigurasi Supabase'
              : 'Masuk akun untuk sinkronisasi cloud'}
          </p>
          {user && onReconnectSheets && !isSheetsConnected && (
            <button
              onClick={onReconnectSheets}
              className="mt-2 w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Hubungkan Ulang</span>
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex-col justify-between h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile Overlay Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
