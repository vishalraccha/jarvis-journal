-- ==============================================================================
-- JARVIS JOURNAL (JJ) - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Production-ready, fully normalized schema with RLS and user data isolation
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper trigger for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. PROFILES (extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    base_currency TEXT DEFAULT 'USD' NOT NULL,
    timezone TEXT DEFAULT 'America/New_York' NOT NULL,
    onboarding_completed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, base_currency, timezone, onboarding_completed)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Jarvis Trader'),
        NEW.raw_user_meta_data->>'avatar_url',
        'USD',
        'America/New_York',
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. TRADING ACCOUNTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trading_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('live', 'demo', 'evaluation', 'funded')),
    broker TEXT,
    initial_balance NUMERIC(16, 2) NOT NULL DEFAULT 10000.00,
    current_balance NUMERIC(16, 2) NOT NULL DEFAULT 10000.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_trading_accounts_updated_at
BEFORE UPDATE ON public.trading_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. INSTRUMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL means global standard instrument
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL CHECK (asset_class IN ('forex', 'crypto', 'indices', 'futures', 'stocks', 'commodities', 'other')),
    tick_size NUMERIC(18, 8) NOT NULL DEFAULT 0.01,
    tick_value NUMERIC(18, 8) NOT NULL DEFAULT 1.00,
    contract_size NUMERIC(18, 8) NOT NULL DEFAULT 1.00,
    point_value NUMERIC(18, 8) NOT NULL DEFAULT 1.00,
    default_commission NUMERIC(16, 4) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_symbol_per_user UNIQUE NULLS NOT DISTINCT (user_id, symbol)
);

CREATE TRIGGER set_instruments_updated_at
BEFORE UPDATE ON public.instruments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. STRATEGIES & PLAYBOOK
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    entry_conditions TEXT,
    exit_conditions TEXT,
    stop_loss_rules TEXT,
    take_profit_rules TEXT,
    screenshot_url TEXT,
    color TEXT DEFAULT '#287BFF',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_strategies_updated_at
BEFORE UPDATE ON public.strategies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.strategy_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('entry', 'exit', 'risk', 'general')),
    description TEXT NOT NULL,
    priority INT DEFAULT 1,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.strategy_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. TAGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#8493A8' NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('setup', 'mistake', 'emotion', 'market_condition', 'session', 'general')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_tag_name_per_user UNIQUE (user_id, name, category)
);

-- ------------------------------------------------------------------------------
-- 6. TRADES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    instrument_id UUID REFERENCES public.instruments(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    asset_class TEXT NOT NULL DEFAULT 'stocks',
    direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'cancelled')),
    open_time TIMESTAMPTZ NOT NULL,
    close_time TIMESTAMPTZ,
    quantity NUMERIC(18, 6) NOT NULL,
    entry_price NUMERIC(18, 6) NOT NULL,
    exit_price NUMERIC(18, 6),
    stop_loss NUMERIC(18, 6),
    take_profit NUMERIC(18, 6),
    gross_pnl NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    commission NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    fees NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    net_pnl NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    roi_percentage NUMERIC(10, 4) NOT NULL DEFAULT 0.00,
    r_multiple NUMERIC(10, 4),
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    setup TEXT,
    emotional_state TEXT,
    mistakes TEXT[] DEFAULT '{}',
    mae NUMERIC(18, 6), -- Maximum Adverse Excursion
    mfe NUMERIC(18, 6), -- Maximum Favorable Excursion
    notes TEXT,
    market_session TEXT CHECK (market_session IN ('asian', 'london', 'new_york', 'overlap', 'other')),
    duration_minutes NUMERIC(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for lightning fast querying on trades
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON public.trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_open_time ON public.trades(open_time);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_strategy_id ON public.trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

-- ------------------------------------------------------------------------------
-- 7. TRADE EXECUTIONS & ATTACHMENTS & NOTES & TAGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trade_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    execution_type TEXT NOT NULL CHECK (execution_type IN ('entry', 'add', 'scale_out', 'exit')),
    timestamp TIMESTAMPTZ NOT NULL,
    price NUMERIC(18, 6) NOT NULL,
    quantity NUMERIC(18, 6) NOT NULL,
    fees NUMERIC(16, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.trade_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.trade_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.trade_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_trade_tag UNIQUE (trade_id, tag_id)
);

-- ------------------------------------------------------------------------------
-- 8. DAILY JOURNALS & TEMPLATES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL for system presets
    title TEXT NOT NULL,
    description TEXT,
    content_template JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.daily_journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    journal_type TEXT NOT NULL CHECK (journal_type IN ('pre_market', 'daily', 'post_market', 'weekly_review', 'monthly_review')),
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
    mood_score INT CHECK (mood_score BETWEEN 1 AND 5),
    attachments JSONB DEFAULT '[]'::jsonb NOT NULL,
    save_status TEXT DEFAULT 'saved',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_journal_per_day_type UNIQUE (user_id, date, journal_type)
);

CREATE TRIGGER set_daily_journals_updated_at
BEFORE UPDATE ON public.daily_journals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_daily_journals_user_date ON public.daily_journals(user_id, date);

-- ------------------------------------------------------------------------------
-- 9. ANALYTICS PREFERENCES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    default_time_range TEXT DEFAULT 'month' NOT NULL,
    visible_metrics JSONB DEFAULT '["net_pnl", "win_rate", "profit_factor", "total_trades", "avg_r"]'::jsonb NOT NULL,
    visible_chart_types JSONB DEFAULT '["cumulative_pnl", "equity_curve", "daily_pnl", "weekday_distribution"]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 10. BACKTESTING ENGINE (Completely isolated from live trading!)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.backtest_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    instrument_symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL DEFAULT '15m',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    initial_capital NUMERIC(16, 2) NOT NULL DEFAULT 50000.00,
    current_equity NUMERIC(16, 2) NOT NULL DEFAULT 50000.00,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.backtest_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.backtest_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    entry_time TIMESTAMPTZ NOT NULL,
    exit_time TIMESTAMPTZ,
    entry_price NUMERIC(18, 6) NOT NULL,
    exit_price NUMERIC(18, 6),
    quantity NUMERIC(18, 6) NOT NULL,
    stop_loss NUMERIC(18, 6),
    take_profit NUMERIC(18, 6),
    pnl NUMERIC(16, 2) DEFAULT 0.00,
    r_multiple NUMERIC(10, 4),
    result TEXT CHECK (result IN ('win', 'loss', 'breakeven', 'open')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 11. HISTORICAL CANDLES & TRADE REPLAY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.historical_candles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL for system shared candles
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL, -- '1m', '5m', '15m', '1h', '1d'
    timestamp TIMESTAMPTZ NOT NULL,
    open NUMERIC(18, 6) NOT NULL,
    high NUMERIC(18, 6) NOT NULL,
    low NUMERIC(18, 6) NOT NULL,
    close NUMERIC(18, 6) NOT NULL,
    volume NUMERIC(18, 6) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_candle UNIQUE NULLS NOT DISTINCT (symbol, timeframe, timestamp, user_id)
);

CREATE INDEX IF NOT EXISTS idx_historical_candles_lookup ON public.historical_candles(symbol, timeframe, timestamp);

CREATE TABLE IF NOT EXISTS public.replay_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL DEFAULT '5m',
    current_bar_index INT DEFAULT 0,
    playback_speed NUMERIC(4, 2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 12. ROUTINES & PROGRESS TRACKER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    routine_type TEXT NOT NULL CHECK (routine_type IN ('pre_market', 'during_market', 'post_market', 'custom')),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.routine_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.routine_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.routine_items(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_routine_completion UNIQUE (user_id, item_id, date)
);

CREATE TABLE IF NOT EXISTS public.progress_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completion_rate NUMERIC(5, 2) DEFAULT 0.00,
    streak_count INT DEFAULT 0,
    discipline_score NUMERIC(5, 2) DEFAULT 0.00,
    total_rules_followed INT DEFAULT 0,
    total_rules_violated INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_progress_date UNIQUE (user_id, date)
);

-- ------------------------------------------------------------------------------
-- 13. AI INSIGHTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('pattern', 'behavior', 'risk_violation', 'overtrading', 'revenge_trading', 'strategy_analysis', 'weekly_summary', 'monthly_review')),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    detailed_analysis TEXT NOT NULL,
    supporting_metrics JSONB DEFAULT '{}'::jsonb NOT NULL,
    recommendation TEXT NOT NULL,
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user data isolation
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and edit own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own trading accounts" ON public.trading_accounts
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view global or own instruments" ON public.instruments
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can insert own instruments" ON public.instruments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own instruments" ON public.instruments
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own instruments" ON public.instruments
    FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own strategies" ON public.strategies
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.strategy_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own strategy rules" ON public.strategy_rules
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.strategy_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own strategy checklists" ON public.strategy_checklists
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tags" ON public.tags
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own trades" ON public.trades
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.trade_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own trade executions" ON public.trade_executions
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.trade_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own trade attachments" ON public.trade_attachments
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.trade_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own trade notes" ON public.trade_notes
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.trade_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own trade tags" ON public.trade_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.trades WHERE trades.id = trade_tags.trade_id AND trades.user_id = auth.uid()
        )
    );

ALTER TABLE public.daily_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own daily journals" ON public.daily_journals
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.journal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view system and own journal templates" ON public.journal_templates
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can manage own journal templates" ON public.journal_templates
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.analytics_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own analytics preferences" ON public.analytics_preferences
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.backtest_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own backtest sessions" ON public.backtest_sessions
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.backtest_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own backtest trades" ON public.backtest_trades
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.historical_candles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view system or own candles" ON public.historical_candles
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can manage own candles" ON public.historical_candles
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.replay_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own replay sessions" ON public.replay_sessions
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own routines" ON public.routines
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own routine items" ON public.routine_items
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own routine completions" ON public.routine_completions
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.progress_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own progress records" ON public.progress_records
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own AI insights" ON public.ai_insights
    FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- DEFAULT SEED DATA (Global standard instruments & templates)
-- ==============================================================================
INSERT INTO public.instruments (user_id, symbol, name, asset_class, tick_size, tick_value, contract_size, point_value, default_commission, currency)
VALUES
    (NULL, 'EUR/USD', 'Euro / US Dollar', 'forex', 0.00001, 1.0, 100000, 100000, 2.50, 'USD'),
    (NULL, 'GBP/USD', 'British Pound / US Dollar', 'forex', 0.00001, 1.0, 100000, 100000, 2.50, 'USD'),
    (NULL, 'USD/JPY', 'US Dollar / Japanese Yen', 'forex', 0.001, 0.67, 100000, 100000, 2.50, 'USD'),
    (NULL, 'BTC/USDT', 'Bitcoin / Tether', 'crypto', 0.1, 0.1, 1.0, 1.0, 0.05, 'USDT'),
    (NULL, 'ETH/USDT', 'Ethereum / Tether', 'crypto', 0.01, 0.01, 1.0, 1.0, 0.05, 'USDT'),
    (NULL, 'NQ', 'E-mini Nasdaq-100 Futures', 'futures', 0.25, 5.0, 1.0, 20.0, 2.25, 'USD'),
    (NULL, 'ES', 'E-mini S&P 500 Futures', 'futures', 0.25, 12.50, 1.0, 50.0, 2.25, 'USD'),
    (NULL, 'XAU/USD', 'Gold / US Dollar', 'commodities', 0.01, 1.0, 100.0, 100.0, 3.00, 'USD'),
    (NULL, 'SPY', 'SPDR S&P 500 ETF Trust', 'stocks', 0.01, 0.01, 1.0, 1.0, 0.00, 'USD'),
    (NULL, 'QQQ', 'Invesco QQQ Trust', 'stocks', 0.01, 0.01, 1.0, 1.0, 0.00, 'USD'),
    (NULL, 'AAPL', 'Apple Inc.', 'stocks', 0.01, 0.01, 1.0, 1.0, 0.00, 'USD'),
    (NULL, 'NVDA', 'NVIDIA Corporation', 'stocks', 0.01, 0.01, 1.0, 1.0, 0.00, 'USD'),
    (NULL, 'TSLA', 'Tesla, Inc.', 'stocks', 0.01, 0.01, 1.0, 1.0, 0.00, 'USD')
ON CONFLICT DO NOTHING;

-- Default Journal Template
INSERT INTO public.journal_templates (user_id, title, description, content_template, is_default)
VALUES (
    NULL,
    'TradeZella Pro Standard 10-Step Daily Journal',
    'Comprehensive standard professional trading daily review template.',
    '{
        "sections": [
            "1. Market Overview & Macro Context",
            "2. Today'\''s Trading Plan & Bias",
            "3. Key Key S/R & Liquidity Levels",
            "4. Expected Market Direction & Triggers",
            "5. Trading Setups Monitored",
            "6. Executed Trades Summary",
            "7. Mistakes Made & Rule Adherence",
            "8. Emotional State & Mental Psychology",
            "9. Lessons Learned",
            "10. Tomorrow'\''s Improvements & Commitments"
        ]
    }'::jsonb,
    true
)
ON CONFLICT DO NOTHING;
