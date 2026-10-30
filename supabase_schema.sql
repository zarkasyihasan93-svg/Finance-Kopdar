-- =================================================================================
-- COMPLETE SUPABASE MIGRATION SCRIPT: Personal Finance & Productivity App
-- =================================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. REUSABLE TRIGGER FUNCTION FOR updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABLES DEFINITION

-- A. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    category VARCHAR(100) NOT NULL,
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_category_per_user UNIQUE (user_id, type, name)
);

-- C. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_budget_user_category_month UNIQUE (user_id, category, month)
);

-- D. TODOS TABLE
CREATE TABLE IF NOT EXISTS public.todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    status VARCHAR(20) NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'In Progress', 'Done', 'Completed')),
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    sent_reminders TEXT DEFAULT '',
    repeat_reminder_enabled BOOLEAN DEFAULT false,
    reminder_interval_type VARCHAR(20) DEFAULT 'minutes',
    reminder_interval_value INTEGER DEFAULT 10,
    reminder_days JSONB DEFAULT '[1, 2, 3, 4, 5, 6, 0]',
    last_reminder_sent_at TIMESTAMPTZ
);

-- Ensure repeat reminder columns exist if table was previously created
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS repeat_reminder_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS reminder_interval_type VARCHAR(20) DEFAULT 'minutes';
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS reminder_interval_value INTEGER DEFAULT 10;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS reminder_days JSONB DEFAULT '[1, 2, 3, 4, 5, 6, 0]';
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON public.transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_todos_user_deadline ON public.todos(user_id, deadline);
CREATE INDEX IF NOT EXISTS idx_todos_user_status ON public.todos(user_id, status);

-- 5. TRIGGERS FOR updated_at AUTO-UPDATE
DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON public.transactions;
CREATE TRIGGER trigger_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON public.categories;
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_budgets_updated_at ON public.budgets;
CREATE TRIGGER trigger_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_todos_updated_at ON public.todos;
CREATE TRIGGER trigger_todos_updated_at
    BEFORE UPDATE ON public.todos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. ROW LEVEL SECURITY (RLS) ACTIVATION
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Each table enforces strict isolation using auth.uid() = user_id for all DML operations (SELECT, INSERT, UPDATE, DELETE)

DROP POLICY IF EXISTS "transactions_user_isolation" ON public.transactions;
CREATE POLICY "transactions_user_isolation"
    ON public.transactions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_user_isolation" ON public.categories;
CREATE POLICY "categories_user_isolation"
    ON public.categories
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "budgets_user_isolation" ON public.budgets;
CREATE POLICY "budgets_user_isolation"
    ON public.budgets
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "todos_user_isolation" ON public.todos;
CREATE POLICY "todos_user_isolation"
    ON public.todos
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- E. TELEGRAM CONNECTIONS
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

-- Updated_at Trigger
DROP TRIGGER IF EXISTS telegram_connections_updated_at
ON public.telegram_connections;

CREATE TRIGGER telegram_connections_updated_at
BEFORE UPDATE ON public.telegram_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security
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
USING (auth.uid() = user_id);

