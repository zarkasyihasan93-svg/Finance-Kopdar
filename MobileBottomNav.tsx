import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  CheckSquare,
  User as UserIcon,
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onAddClick: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onAddClick,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-3 py-2 flex items-center justify-around shadow-xl">
      {/* 1. Dashboard */}
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-all duration-200 active:scale-90 ${
          activeTab === 'dashboard'
            ? 'text-purple-600 dark:text-purple-400 font-bold scale-105'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 transition-transform duration-200 group-active:scale-90" />
        <span className="text-[10px] font-medium leading-none">Home</span>
      </button>

      {/* 2. Transaksi */}
      <button
        onClick={() => setActiveTab('transactions')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-all duration-200 active:scale-90 ${
          activeTab === 'transactions'
            ? 'text-purple-600 dark:text-purple-400 font-bold scale-105'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        <ArrowLeftRight className="w-5 h-5 transition-transform duration-200" />
        <span className="text-[10px] font-medium leading-none">Transaksi</span>
      </button>

      {/* 3. Center Floating Action Button */}
      <button
        onClick={onAddClick}
        className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-white dark:border-slate-900"
        title="Tambah Transaksi"
      >
        <Plus className="w-6 h-6 text-white transition-transform duration-200" />
      </button>

      {/* 4. Todo */}
      <button
        onClick={() => setActiveTab('todo')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-all duration-200 active:scale-90 ${
          activeTab === 'todo'
            ? 'text-purple-600 dark:text-purple-400 font-bold scale-105'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        <CheckSquare className="w-5 h-5 transition-transform duration-200" />
        <span className="text-[10px] font-medium leading-none">Todo</span>
      </button>

      {/* 5. Profile */}
      <button
        onClick={() => setActiveTab('profile')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-all duration-200 active:scale-90 ${
          activeTab === 'profile'
            ? 'text-purple-600 dark:text-purple-400 font-bold scale-105'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        <UserIcon className="w-5 h-5 transition-transform duration-200" />
        <span className="text-[10px] font-medium leading-none">Profil</span>
      </button>
    </div>
  );
};
