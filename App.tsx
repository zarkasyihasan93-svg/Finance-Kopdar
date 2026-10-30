import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar, ActiveTab } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileBottomNav } from './MobileBottomNav';

import { DashboardView } from './DashboardView';
import { TransactionsView } from './TransactionsView';
import { HistoryView } from './HistoryView';
import { BudgetView } from './BudgetView';
import { ReportsView } from './ReportsView';
import { TodoView } from './TodoView';
import { ProfileView } from './ProfileView';
import { AuthModal, AuthMode } from './AuthModal';

import { AppUser, Transaction, CategoryItem, BudgetItem, TodoItem } from './types';
import {
  INITIAL_TRANSACTIONS,
  INITIAL_CATEGORIES,
  INITIAL_BUDGETS,
  INITIAL_TODOS,
} from './initialData';

import { initAuth, logout } from './auth';
import {
  getSupabaseTransactions,
  upsertSupabaseTransaction,
  deleteSupabaseTransaction,
  getSupabaseCategories,
  upsertSupabaseCategory,
  getSupabaseBudgets,
  upsertSupabaseBudget,
  deleteSupabaseBudget,
  getSupabaseTodos,
  upsertSupabaseTodo,
  deleteSupabaseTodo,
  isSupabaseConfigured,
  checkIsBrandNewUser,
  markUserAsInitialized,
} from './supabase';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // User & Auth State
  const [user, setUser] = useState<AppUser | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);

  // App Data
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [budgets, setBudgets] = useState<BudgetItem[]>(INITIAL_BUDGETS);
  const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);

  // Modal & Navigation control
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');

  // Pure READ-ONLY data refresh: SELECT only, replaces state directly, never mutates or seeds
  const refreshUserDataFromSupabase = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured()) {
      setIsDbConnected(false);
      return;
    }
    if (!userId) {
      console.log('[Refresh] No active user ID to refresh');
      return;
    }

    setIsSyncing(true);
    console.log('[Refresh] Starting data refresh...');

    try {
      console.log('[Refresh] Fetching transactions...');
      console.log('[Refresh] Fetching budgets...');
      console.log('[Refresh] Fetching todos...');
      console.log('[Refresh] Fetching categories...');

      const [userTxs, userCats, userBgts, userTodos] = await Promise.all([
        getSupabaseTransactions(userId),
        getSupabaseCategories(userId),
        getSupabaseBudgets(userId),
        getSupabaseTodos(userId),
      ]);

      // Pure READ: Directly replace React state with database results.
      // Absolutely NO INSERT, NO UPDATE, NO UPSERT, NO INITIAL_X FALLBACK!
      setTransactions(userTxs || []);
      setCategories(userCats || []);
      setBudgets(userBgts || []);
      setTodos(userTodos || []);

      setIsDbConnected(true);
      console.log('[Refresh] Completed successfully');
    } catch (err) {
      console.error('[Refresh] Failed to fetch data from Supabase:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // First-time setup: Runs ONLY on login/signup for genuine first-time users, NEVER on refresh
  const ensureFirstTimeUserSetup = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured() || !userId) return;

    try {
      const isNew = await checkIsBrandNewUser(userId);
      if (!isNew) {
        return;
      }

      console.log('[Init] Genuinely new user detected. Seeding starter data once...');

      for (const cat of INITIAL_CATEGORIES) {
        await upsertSupabaseCategory({ ...cat, id: generateUUID() }, userId);
      }
      for (const tx of INITIAL_TRANSACTIONS) {
        await upsertSupabaseTransaction({ ...tx, id: generateUUID() }, userId);
      }
      for (const bgt of INITIAL_BUDGETS) {
        await upsertSupabaseBudget({ ...bgt, id: generateUUID() }, userId);
      }
      for (const todo of INITIAL_TODOS) {
        await upsertSupabaseTodo({ ...todo, id: generateUUID() }, userId);
      }

      await markUserAsInitialized(userId);
      console.log('[Init] Starter data initialization complete.');
    } catch (err) {
      console.error('[Init] Error during first-time user setup:', err);
    }
  }, []);

  // Sync state to backend for Telegram schedulers
  useEffect(() => {
    fetch('/api/telegram/sync-todos', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todos }),
    }).catch(() => {});
  }, [todos]);

  useEffect(() => {
    fetch('/api/telegram/sync-transactions', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    }).catch(() => {});
  }, [transactions]);

  // Apply dark mode class to root HTML tag
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auth Initialization Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          await ensureFirstTimeUserSetup(currentUser.id);
          await refreshUserDataFromSupabase(currentUser.id);
        } else {
          setIsDbConnected(false);
        }
      },
      () => {
        // Triggered when user opens password recovery link from email
        setAuthModalMode('reset-password');
        setIsAuthModalOpen(true);
      }
    );
    return () => unsubscribe();
  }, [ensureFirstTimeUserSetup, refreshUserDataFromSupabase]);

  const handleOpenAuth = (mode: AuthMode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setIsDbConnected(false);
    setTransactions(INITIAL_TRANSACTIONS);
    setCategories(INITIAL_CATEGORIES);
    setBudgets(INITIAL_BUDGETS);
    setTodos(INITIAL_TODOS);
  };

  // --- CRUD HANDLERS WITH SUPABASE PERSISTENCE ---

  // Transactions
  const handleAddTransaction = async (newTx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const tx: Transaction = {
      ...newTx,
      id: generateUUID(),
      created_at: now,
      updated_at: now,
    };

    setTransactions((prev) => [tx, ...prev]);

    if (user?.id && isSupabaseConfigured()) {
      await upsertSupabaseTransaction(tx, user.id);
    }

    try {
      const updatedTxs = [tx, ...transactions];
      let currentBalance = 0;
      updatedTxs.forEach((t) => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') currentBalance += amt;
        else currentBalance -= amt;
      });

      await fetch('/api/telegram/notify-transaction', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: tx, currentBalance, userId: user?.id }),
      });
    } catch (e) {
      console.error('Failed to send Telegram notification:', e);
    }
  };

  const handleEditTransaction = async (updatedTx: Transaction) => {
    const txWithUpdatedTime = {
      ...updatedTx,
      updated_at: new Date().toISOString(),
    };
    setTransactions((prev) => prev.map((t) => (t.id === txWithUpdatedTime.id ? txWithUpdatedTime : t)));

    if (user?.id && isSupabaseConfigured()) {
      await upsertSupabaseTransaction(txWithUpdatedTime, user.id);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    if (isSupabaseConfigured()) {
      await deleteSupabaseTransaction(id);
    }
  };

  // Categories
  const handleAddCategory = async (newCat: Omit<CategoryItem, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const cat: CategoryItem = {
      ...newCat,
      id: generateUUID(),
      created_at: now,
      updated_at: now,
    };

    setCategories((prev) => [...prev, cat]);

    if (user?.id && isSupabaseConfigured()) {
      await upsertSupabaseCategory(cat, user.id);
    }
  };

  // Budgets
  const handleSaveBudget = async (newBgt: Omit<BudgetItem, 'id' | 'created_at' | 'updated_at'>) => {
    const existing = budgets.find((b) => b.category === newBgt.category && b.month === newBgt.month);
    const now = new Date().toISOString();
    const bgt: BudgetItem = {
      ...newBgt,
      id: existing ? existing.id : generateUUID(),
      created_at: existing ? existing.created_at || now : now,
      updated_at: now,
    };

    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.category === newBgt.category && b.month === newBgt.month);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = bgt;
        return next;
      }
      return [...prev, bgt];
    });

    if (user?.id && isSupabaseConfigured()) {
      await upsertSupabaseBudget(bgt, user.id);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));

    if (isSupabaseConfigured()) {
      await deleteSupabaseBudget(id);
    }
  };

  // Todos
  const handleAddTodo = async (newTodo: Omit<TodoItem, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const todo: TodoItem = {
      ...newTodo,
      id: generateUUID(),
      created_at: now,
      updated_at: now,
      sent_reminders: '',
    };

    setTodos((prev) => [todo, ...prev]);

    if (user?.id && isSupabaseConfigured()) {
      await upsertSupabaseTodo(todo, user.id);
    }
  };

  const handleUpdateTodo = async (updatedTodo: TodoItem) => {
    const todoWithUpdatedTime = {
      ...updatedTodo,
      updated_at: new Date().toISOString(),
    };
    setTodos((prev) => prev.map((t) => (t.id === todoWithUpdatedTime.id ? todoWithUpdatedTime : t)));

    if (user?.id && isSupabaseConfigured()) {
      await upsertSupabaseTodo(todoWithUpdatedTime, user.id);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));

    if (isSupabaseConfigured()) {
      await deleteSupabaseTodo(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row font-sans antialiased overflow-x-hidden overscroll-none">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        isSheetsConnected={isDbConnected}
        onReconnectSheets={() => {
          if (user) {
            refreshUserDataFromSupabase(user.id);
          } else {
            handleOpenAuth('login');
          }
        }}
        user={user}
      />

      {/* Main Container */}
      <div className="app-scroll-area flex-1 flex flex-col min-w-0 md:h-screen md:overflow-y-auto">
        {/* Navbar Header */}
        <Navbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          user={user}
          onLoginClick={() => handleOpenAuth('login')}
          onProfileClick={() => setActiveTab('profile')}
          isSyncing={isSyncing}
          onRefreshSync={() => {
            if (user) {
              refreshUserDataFromSupabase(user.id);
            }
          }}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* View Contents */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  transactions={transactions}
                  todos={todos}
                  user={user}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onAddTransactionClick={() => {
                    setActiveTab('transactions');
                    setIsAddTxModalOpen(true);
                  }}
                  onViewAllTransactionsClick={() => setActiveTab('transactions')}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionsView
                  transactions={transactions}
                  categories={categories}
                  onAddTransaction={handleAddTransaction}
                  onEditTransaction={handleEditTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  isAddModalOpen={isAddTxModalOpen}
                  setIsAddModalOpen={setIsAddTxModalOpen}
                />
              )}

              {activeTab === 'history' && (
                <HistoryView
                  transactions={transactions}
                  categories={categories}
                  globalSearchQuery={searchQuery}
                />
              )}

              {activeTab === 'budget' && (
                <BudgetView
                  budgets={budgets}
                  categories={categories}
                  transactions={transactions}
                  onSaveBudget={handleSaveBudget}
                  onDeleteBudget={handleDeleteBudget}
                  onAddCategory={handleAddCategory}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView
                  transactions={transactions}
                  budgets={budgets}
                  todos={todos}
                  userName={user?.displayName || 'Pengguna App'}
                  userId={user?.id}
                />
              )}

              {activeTab === 'todo' && (
                <TodoView
                  todos={todos}
                  userId={user?.id}
                  onAddTodo={handleAddTodo}
                  onUpdateTodo={handleUpdateTodo}
                  onDeleteTodo={handleDeleteTodo}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  user={user}
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                  onLoginClick={() => handleOpenAuth('login')}
                  onLogoutClick={handleLogout}
                  onUpdatePasswordClick={() => handleOpenAuth('reset-password')}
                  isSheetsConnected={isDbConnected}
                  onReconnectSheets={() => {
                    if (user) {
                      refreshUserDataFromSupabase(user.id);
                    } else {
                      handleOpenAuth('login');
                    }
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onAddClick={() => {
            setActiveTab('transactions');
            setIsAddTxModalOpen(true);
          }}
        />

        {/* Supabase Email/Password Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
          onAuthSuccess={async (authenticatedUser) => {
            setUser(authenticatedUser);
            if (authenticatedUser) {
              await ensureFirstTimeUserSetup(authenticatedUser.id);
              await refreshUserDataFromSupabase(authenticatedUser.id);
            }
          }}
        />
      </div>
    </div>
  );
}
