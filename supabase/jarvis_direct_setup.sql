-- ==============================================================================
-- JARVIS JOURNAL (JJ) - COMPLETE DATABASE REBUILD & SETUP
-- Run this complete script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hclxoemiitxjzvlvvbci/sql/new
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1: CLEANUP / DROP ALL EXISTING TABLES (COMPLETE FRESH SLATE)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.trade_attachments CASCADE;
DROP TABLE IF EXISTS public.trade_executions CASCADE;
DROP TABLE IF EXISTS public.trades CASCADE;
DROP TABLE IF EXISTS public.routine_completions CASCADE;
DROP TABLE IF EXISTS public.routine_items CASCADE;
DROP TABLE IF EXISTS public.routines CASCADE;
DROP TABLE IF EXISTS public.daily_journals CASCADE;
DROP TABLE IF EXISTS public.backtest_trades CASCADE;
DROP TABLE IF EXISTS public.backtest_sessions CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.strategies CASCADE;
DROP TABLE IF EXISTS public.instruments CASCADE;
DROP TABLE IF EXISTS public.trading_accounts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ------------------------------------------------------------------------------
-- STEP 2: CREATE CORE PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY DEFAULT 'user-jarvis-1',
    username TEXT DEFAULT 'trader',
    full_name TEXT DEFAULT 'Jarvis Trader',
    avatar_url TEXT,
    base_currency TEXT DEFAULT 'USD' NOT NULL,
    timezone TEXT DEFAULT 'America/New_York' NOT NULL,
    onboarding_completed BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- STEP 3: CREATE TRADING ACCOUNTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.trading_accounts (
    id TEXT PRIMARY KEY DEFAULT ('acc-' || extract(epoch from now())::bigint),
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    name TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'live',
    broker TEXT,
    initial_balance NUMERIC(16, 2) NOT NULL DEFAULT 10000.00,
    current_balance NUMERIC(16, 2) NOT NULL DEFAULT 10000.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- STEP 4: CREATE INSTRUMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.instruments (
    id TEXT PRIMARY KEY DEFAULT ('inst-' || extract(epoch from now())::bigint),
    user_id TEXT DEFAULT 'user-jarvis-1',
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL DEFAULT 'futures',
    tick_size NUMERIC(18, 8) NOT NULL DEFAULT 0.01,
    tick_value NUMERIC(18, 8) NOT NULL DEFAULT 1.00,
    contract_size NUMERIC(18, 8) NOT NULL DEFAULT 1.00,
    point_value NUMERIC(18, 8) NOT NULL DEFAULT 1.00,
    default_commission NUMERIC(16, 4) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- STEP 5: CREATE STRATEGIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.strategies (
    id TEXT PRIMARY KEY DEFAULT ('strat-' || extract(epoch from now())::bigint),
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    name TEXT NOT NULL,
    description TEXT,
    entry_conditions TEXT,
    exit_conditions TEXT,
    stop_loss_rules TEXT,
    take_profit_rules TEXT,
    screenshot_url TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- STEP 6: CREATE TAGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.tags (
    id TEXT PRIMARY KEY DEFAULT ('tag-' || extract(epoch from now())::bigint),
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6' NOT NULL,
    category TEXT NOT NULL DEFAULT 'setup',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- STEP 7: CREATE TRADES & EXECUTION TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE public.trades (
    id TEXT PRIMARY KEY DEFAULT ('trade-' || extract(epoch from now())::bigint),
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    account_id TEXT NOT NULL,
    instrument_id TEXT,
    symbol TEXT NOT NULL,
    asset_class TEXT NOT NULL DEFAULT 'futures',
    direction TEXT NOT NULL DEFAULT 'long',
    status TEXT NOT NULL DEFAULT 'closed',
    open_time TIMESTAMPTZ NOT NULL,
    close_time TIMESTAMPTZ,
    quantity NUMERIC(18, 6) NOT NULL DEFAULT 1,
    entry_price NUMERIC(18, 6) NOT NULL,
    exit_price NUMERIC(18, 6),
    stop_loss NUMERIC(18, 6),
    take_profit NUMERIC(18, 6),
    gross_pnl NUMERIC(16, 2) DEFAULT 0.00,
    commission NUMERIC(16, 2) DEFAULT 0.00,
    fees NUMERIC(16, 2) DEFAULT 0.00,
    net_pnl NUMERIC(16, 2) DEFAULT 0.00,
    roi_percentage NUMERIC(10, 4) DEFAULT 0.00,
    r_multiple NUMERIC(10, 4),
    strategy_id TEXT,
    setup TEXT,
    notes TEXT,
    emotional_state TEXT,
    mistakes TEXT[] DEFAULT '{}',
    mae NUMERIC(18, 6),
    mfe NUMERIC(18, 6),
    market_session TEXT,
    duration_minutes INT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.trade_executions (
    id TEXT PRIMARY KEY DEFAULT ('exec-' || extract(epoch from now())::bigint),
    trade_id TEXT NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    execution_type TEXT NOT NULL DEFAULT 'entry',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    price NUMERIC(18, 6) NOT NULL,
    quantity NUMERIC(18, 6) NOT NULL,
    fees NUMERIC(16, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.trade_attachments (
    id TEXT PRIMARY KEY DEFAULT ('att-' || extract(epoch from now())::bigint),
    trade_id TEXT NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- STEP 8: CREATE DAILY JOURNALS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.daily_journals (
    id TEXT PRIMARY KEY DEFAULT ('journal-' || extract(epoch from now())::bigint),
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    account_id TEXT,
    date DATE NOT NULL,
    journal_type TEXT NOT NULL DEFAULT 'daily',
    market_overview TEXT,
    trading_plan TEXT,
    important_levels TEXT,
    expected_direction TEXT,
    setups_watched TEXT,
    trades_taken_summary TEXT,
    mistakes_made TEXT,
    emotional_state TEXT,
    lessons_learned TEXT,
    improvements_tomorrow TEXT,
    notes_rich_text TEXT,
    mood_score INT DEFAULT 4,
    attachments JSONB DEFAULT '[]'::jsonb,
    save_status TEXT DEFAULT 'saved',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_daily_journal_date_type UNIQUE (user_id, date, journal_type)
);

-- ------------------------------------------------------------------------------
-- STEP 9: CREATE ROUTINES & CHECKLIST TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE public.routines (
    id TEXT PRIMARY KEY DEFAULT ('rt-' || extract(epoch from now())::bigint),
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    title TEXT NOT NULL,
    name TEXT,
    routine_type TEXT NOT NULL DEFAULT 'pre_market',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.routine_items (
    id TEXT PRIMARY KEY DEFAULT ('item-' || extract(epoch from now())::bigint),
    routine_id TEXT NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    label TEXT NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.routine_completions (
    id TEXT PRIMARY KEY DEFAULT ('rtc-' || extract(epoch from now())::bigint),
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    routine_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    date DATE NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_routine_completion_item UNIQUE (user_id, item_id, date)
);

-- ------------------------------------------------------------------------------
-- STEP 10: CREATE BACKTESTING TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE public.backtest_sessions (
    id TEXT PRIMARY KEY DEFAULT ('bt-' || extract(epoch from now())::bigint),
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    strategy_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    symbol TEXT NOT NULL DEFAULT 'NQ',
    instrument_symbol TEXT NOT NULL DEFAULT 'NQ',
    timeframe TEXT NOT NULL DEFAULT '5m',
    start_date DATE,
    end_date DATE,
    initial_capital NUMERIC(16, 2) NOT NULL DEFAULT 10000.00,
    initial_balance NUMERIC(16, 2) NOT NULL DEFAULT 10000.00,
    current_equity NUMERIC(16, 2) NOT NULL DEFAULT 10000.00,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.backtest_trades (
    id TEXT PRIMARY KEY DEFAULT ('btt-' || extract(epoch from now())::bigint),
    session_id TEXT NOT NULL REFERENCES public.backtest_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL DEFAULT 'user-jarvis-1',
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'long',
    entry_time TIMESTAMPTZ NOT NULL,
    exit_time TIMESTAMPTZ,
    entry_price NUMERIC(18, 6) NOT NULL,
    exit_price NUMERIC(18, 6),
    quantity NUMERIC(18, 6) NOT NULL DEFAULT 1,
    pnl NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    r_multiple NUMERIC(10, 4),
    result TEXT DEFAULT 'open',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- STEP 11: FULL ACCESS PERMISSIONS (NO RLS BLOCKERS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_journals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_trades DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- STEP 12: SEED INITIAL DEFAULT DATA
-- ------------------------------------------------------------------------------

-- Profile
INSERT INTO public.profiles (id, username, full_name, base_currency, timezone, onboarding_completed)
VALUES ('user-jarvis-1', 'trader', 'Jarvis Trader', 'USD', 'America/New_York', true)
ON CONFLICT (id) DO NOTHING;

-- Initial Primary Account
INSERT INTO public.trading_accounts (id, user_id, name, account_type, broker, initial_balance, current_balance, currency, is_default, is_active)
VALUES ('acc-1', 'user-jarvis-1', 'Primary Trading Account', 'live', 'Live Brokerage', 10000.00, 10000.00, 'USD', true, true)
ON CONFLICT (id) DO NOTHING;

-- Standard Instruments
INSERT INTO public.instruments (id, symbol, name, asset_class, tick_size, tick_value, contract_size, point_value, default_commission, currency)
VALUES
('inst-1', 'NQ', 'E-mini Nasdaq-100 Futures', 'futures', 0.25, 5.0, 1.0, 20.0, 2.25, 'USD'),
('inst-2', 'ES', 'E-mini S&P 500 Futures', 'futures', 0.25, 12.50, 1.0, 50.0, 2.25, 'USD'),
('inst-3', 'BTC/USDT', 'Bitcoin / Tether Perpetual', 'crypto', 0.1, 0.1, 1.0, 1.0, 1.50, 'USDT'),
('inst-4', 'ETH/USDT', 'Ethereum / Tether Perpetual', 'crypto', 0.01, 0.01, 1.0, 1.0, 0.50, 'USDT'),
('inst-5', 'XAU/USD', 'Gold / US Dollar', 'commodities', 0.01, 1.0, 100.0, 100.0, 3.00, 'USD'),
('inst-6', 'EUR/USD', 'Euro / US Dollar', 'forex', 0.00001, 1.0, 100000.0, 100000.0, 2.50, 'USD'),
('inst-7', 'GBP/USD', 'British Pound / US Dollar', 'forex', 0.00001, 1.0, 100000.0, 100000.0, 2.50, 'USD'),
('inst-8', 'SPY', 'SPDR S&P 500 ETF Trust', 'stocks', 0.01, 0.01, 1.0, 1.0, 0.00, 'USD'),
('inst-9', 'QQQ', 'Invesco QQQ Trust', 'stocks', 0.01, 0.01, 1.0, 1.0, 0.00, 'USD'),
('inst-10', 'NVDA', 'NVIDIA Corporation', 'stocks', 0.01, 0.01, 1.0, 1.0, 0.00, 'USD'),
('inst-11', 'TSLA', 'Tesla, Inc.', 'stocks', 0.01, 0.01, 1.0, 1.0, 0.00, 'USD'),
('inst-12', 'AAPL', 'Apple Inc.', 'stocks', 0.01, 0.01, 1.0, 1.0, 0.00, 'USD')
ON CONFLICT (id) DO NOTHING;

-- Standard Strategies
INSERT INTO public.strategies (id, user_id, name, description, entry_conditions, exit_conditions, stop_loss_rules, take_profit_rules, color, is_active)
VALUES
('strat-1', 'user-jarvis-1', 'Opening Range Breakout (ORB)', '15-minute Opening Range Breakout with high relative volume confirmation.', '5-minute close above/below 15m range.', '2R target or VWAP reversal break.', 'Placed at midpoint of the 15-minute opening candle.', 'Target 1 at 2R, Target 2 at prior day high/low.', '#287BFF', true),
('strat-2', 'user-jarvis-1', 'Fair Value Gap / Liquidity Sweep', 'Liquidity grab followed by Market Structure Shift (MSS) and FVG retest.', 'Liquidity sweep + MSS + entry in 5m FVG.', 'Opposing liquidity pool or 2.5R target.', 'Beyond swing high/low that caused displacement.', 'Draw on liquidity (DOL) target.', '#18C784', true),
('strat-3', 'user-jarvis-1', 'VWAP Mean Reversion', 'Reversion into VWAP baseline from 2+ standard deviation bands.', 'Rejection wick at 2.5 VWAP deviation band.', 'VWAP baseline touch.', 'Fixed 1R or new high/low wick extension.', 'VWAP line.', '#A855F7', true)
ON CONFLICT (id) DO NOTHING;

-- Standard Tags
INSERT INTO public.tags (id, user_id, name, color, category)
VALUES
('tag-1', 'user-jarvis-1', 'A+ Setup', '#18C784', 'setup'),
('tag-2', 'user-jarvis-1', 'FOMO Entry', '#F05265', 'mistake'),
('tag-3', 'user-jarvis-1', 'Disciplined Exit', '#287BFF', 'general'),
('tag-4', 'user-jarvis-1', 'Chased Price', '#F05265', 'mistake'),
('tag-5', 'user-jarvis-1', 'Trend Continuation', '#4095FF', 'setup'),
('tag-6', 'user-jarvis-1', 'Calm & Focused', '#18C784', 'emotion')
ON CONFLICT (id) DO NOTHING;

-- Routines & Checklist Items
INSERT INTO public.routines (id, user_id, title, name, routine_type, description, is_active)
VALUES
('rout-1', 'user-jarvis-1', 'Pre-Market Preparation Routine', 'Pre-Market Preparation Routine', 'pre_market', 'Complete before market open at 09:30 AM EST', true),
('rout-2', 'user-jarvis-1', 'During-Market Execution Discipline', 'During-Market Execution Discipline', 'during_market', 'Active session trading psychology checks', true),
('rout-3', 'user-jarvis-1', 'Post-Market Debrief & Review', 'Post-Market Debrief & Review', 'post_market', 'End of day performance consolidation', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.routine_items (id, routine_id, user_id, label, order_index, is_active)
VALUES
('item-1', 'rout-1', 'user-jarvis-1', 'Check Economic Calendar (FOMC, CPI, NFP)', 1, true),
('item-2', 'rout-1', 'user-jarvis-1', 'Review Higher Timeframe (Daily & 4H) Key Levels', 2, true),
('item-3', 'rout-1', 'user-jarvis-1', 'Mark Prior Day High / Low and Overnight Range', 3, true),
('item-4', 'rout-1', 'user-jarvis-1', 'Identify Valid Trading Setups & Scenarios', 4, true),
('item-5', 'rout-1', 'user-jarvis-1', 'Define Maximum Daily Loss Limit ($1,000)', 5, true),
('item-6', 'rout-1', 'user-jarvis-1', 'Review Golden Rules: No revenge trading, respect SL', 6, true),
('item-7', 'rout-2', 'user-jarvis-1', 'Wait for 5m candle close before entry signal', 1, true),
('item-8', 'rout-2', 'user-jarvis-1', 'Calculate position sizing prior to placing order', 2, true),
('item-9', 'rout-2', 'user-jarvis-1', 'Never move stop loss against the position', 3, true),
('item-10', 'rout-2', 'user-jarvis-1', 'Log emotional state if feeling FOMO or frustration', 4, true),
('item-11', 'rout-3', 'user-jarvis-1', 'Log all trades taken with entries & exits', 1, true),
('item-12', 'rout-3', 'user-jarvis-1', 'Save chart screenshots with annotations', 2, true),
('item-13', 'rout-3', 'user-jarvis-1', 'Tag any mistakes or discipline infractions', 3, true),
('item-14', 'rout-3', 'user-jarvis-1', 'Write 10-step daily journal entry and tomorrow goals', 4, true)
ON CONFLICT (id) DO NOTHING;
