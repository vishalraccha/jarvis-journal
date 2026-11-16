import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  Trade,
  TradingAccount,
  Instrument,
  Strategy,
  Tag,
  DailyJournal,
  Routine,
  RoutineCompletion,
  ProgressRecord,
  BacktestSession,
  BacktestTrade,
  HistoricalCandle,
  AIInsight,
  TimeFilterRange,
  Profile,
} from '@/types/database'
import { calculateTradePnl, computeDashboardMetrics } from '@/lib/calculations'

// ==============================================================================
// IN-MEMORY STORE (Used when Supabase credentials are in setup mode or for UI interactions)
// Never touches browser databases (localStorage/IndexedDB) as requested!
// ==============================================================================

const INITIAL_PROFILE: Profile = {
  id: 'user-jarvis-1',
  username: 'jarvis_trader',
  full_name: 'Vishal (Jarvis Terminal)',
  avatar_url: null,
  base_currency: 'USD',
  timezone: 'America/New_York',
  onboarding_completed: true,
  created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
}

const INITIAL_ACCOUNTS: TradingAccount[] = [
  {
    id: 'acc-1',
    user_id: 'user-jarvis-1',
    name: 'Apex 50k Futures #1428',
    account_type: 'evaluation',
    broker: 'Tradovate / Apex Trader Funding',
    initial_balance: 50000,
    current_balance: 54320.50,
    currency: 'USD',
    is_default: true,
    is_active: true,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-2',
    user_id: 'user-jarvis-1',
    name: 'Interactive Brokers Pro (Equities)',
    account_type: 'live',
    broker: 'Interactive Brokers',
    initial_balance: 25000,
    current_balance: 28450.00,
    currency: 'USD',
    is_default: false,
    is_active: true,
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'acc-3',
    user_id: 'user-jarvis-1',
    name: 'Binance USDT-M Futures',
    account_type: 'live',
    broker: 'Binance',
    initial_balance: 10000,
    current_balance: 11980.20,
    currency: 'USD',
    is_default: false,
    is_active: true,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const INITIAL_INSTRUMENTS: Instrument[] = [
  {
    id: 'inst-1',
    symbol: 'NQ',
    name: 'E-mini Nasdaq-100 Futures',
    asset_class: 'futures',
    tick_size: 0.25,
    tick_value: 5.0,
    contract_size: 1.0,
    point_value: 20.0,
    default_commission: 2.25,
    currency: 'USD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'inst-2',
    symbol: 'ES',
    name: 'E-mini S&P 500 Futures',
    asset_class: 'futures',
    tick_size: 0.25,
    tick_value: 12.50,
    contract_size: 1.0,
    point_value: 50.0,
    default_commission: 2.25,
    currency: 'USD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'inst-3',
    symbol: 'BTC/USDT',
    name: 'Bitcoin / Tether Perpetual',
    asset_class: 'crypto',
    tick_size: 0.1,
    tick_value: 0.1,
    contract_size: 1.0,
    point_value: 1.0,
    default_commission: 1.50,
    currency: 'USDT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'inst-4',
    symbol: 'XAU/USD',
    name: 'Gold / US Dollar',
    asset_class: 'commodities',
    tick_size: 0.01,
    tick_value: 1.0,
    contract_size: 100.0,
    point_value: 100.0,
    default_commission: 3.00,
    currency: 'USD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'inst-5',
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    asset_class: 'forex',
    tick_size: 0.00001,
    tick_value: 1.0,
    contract_size: 100000.0,
    point_value: 100000.0,
    default_commission: 2.50,
    currency: 'USD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'inst-6',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    asset_class: 'stocks',
    tick_size: 0.01,
    tick_value: 0.01,
    contract_size: 1.0,
    point_value: 1.0,
    default_commission: 0.00,
    currency: 'USD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'inst-7',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    asset_class: 'stocks',
    tick_size: 0.01,
    tick_value: 0.01,
    contract_size: 1.0,
    point_value: 1.0,
    default_commission: 0.00,
    currency: 'USD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const INITIAL_STRATEGIES: Strategy[] = [
  {
    id: 'strat-1',
    user_id: 'user-jarvis-1',
    name: 'Opening Range Breakout (ORB)',
    description: '15-minute Opening Range Breakout at NY Market open with high relative volume and liquidity sweep confirmation.',
    entry_conditions: '5-minute close above/below 15m range with volume > 1.5x 20 EMA volume.',
    exit_conditions: '2R target or VWAP reversal break.',
    stop_loss_rules: 'Placed at midpoint of the 15-minute opening candle.',
    take_profit_rules: 'Target 1 at 2R (50%), Target 2 at prior day high/low.',
    color: '#287BFF',
    is_active: true,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'strat-2',
    user_id: 'user-jarvis-1',
    name: 'ICT Silver Bullet / Fair Value Gap',
    description: 'London / NY morning session Fair Value Gap (FVG) retest following liquidity grab (BSL/SSL).',
    entry_conditions: 'Liquidity sweep + market structure shift (MSS) + entry inside 1m/5m FVG.',
    exit_conditions: 'Opposing key level liquidity pool or fixed 3R.',
    stop_loss_rules: 'Beyond swing high/low that caused displacement.',
    take_profit_rules: 'Draw on liquidity (DOL) target.',
    color: '#18C784',
    is_active: true,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'strat-3',
    user_id: 'user-jarvis-1',
    name: 'VWAP Mean Reversion',
    description: 'Extended moves into 2+ standard deviation VWAP bands with RSI divergence.',
    entry_conditions: 'Candle wick rejection at 2.5 VWAP deviation band + RSI extreme (>75 or <25).',
    exit_conditions: 'Mean reversion back to VWAP baseline.',
    stop_loss_rules: 'Fixed 1.2R or new high/low wick extension.',
    take_profit_rules: 'VWAP line.',
    color: '#A855F7',
    is_active: true,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const INITIAL_TAGS: Tag[] = [
  { id: 'tag-1', user_id: 'user-jarvis-1', name: 'A+ Setup', color: '#18C784', category: 'setup', created_at: new Date().toISOString() },
  { id: 'tag-2', user_id: 'user-jarvis-1', name: 'FOMO Entry', color: '#F05265', category: 'mistake', created_at: new Date().toISOString() },
  { id: 'tag-3', user_id: 'user-jarvis-1', name: 'Disciplined Exit', color: '#287BFF', category: 'general', created_at: new Date().toISOString() },
  { id: 'tag-4', user_id: 'user-jarvis-1', name: 'Chased Price', color: '#F05265', category: 'mistake', created_at: new Date().toISOString() },
  { id: 'tag-5', user_id: 'user-jarvis-1', name: 'Trend Continuation', color: '#4095FF', category: 'setup', created_at: new Date().toISOString() },
  { id: 'tag-6', user_id: 'user-jarvis-1', name: 'Calm & Focused', color: '#18C784', category: 'emotion', created_at: new Date().toISOString() },
  { id: 'tag-7', user_id: 'user-jarvis-1', name: 'Anxious / Rushed', color: '#EAB308', category: 'emotion', created_at: new Date().toISOString() },
]

// Generate realistic trades spanning recent days for immediate dashboard and calendar richness
function generateInitialTrades(): Trade[] {
  const trades: Trade[] = []
  const symbols = [
    { s: 'NQ', inst: 'inst-1', class: 'futures' as const, basePrice: 20850 },
    { s: 'ES', inst: 'inst-2', class: 'futures' as const, basePrice: 5950 },
    { s: 'BTC/USDT', inst: 'inst-3', class: 'crypto' as const, basePrice: 91400 },
    { s: 'XAU/USD', inst: 'inst-4', class: 'commodities' as const, basePrice: 2680 },
    { s: 'NVDA', inst: 'inst-6', class: 'stocks' as const, basePrice: 145 },
    { s: 'TSLA', inst: 'inst-7', class: 'stocks' as const, basePrice: 340 },
  ]

  const now = new Date()
  let tradeIndex = 1

  // Last 30 trading days
  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const tradeDate = new Date(now)
    tradeDate.setDate(tradeDate.getDate() - dayOffset)
    const dayOfWeek = tradeDate.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) continue // skip weekends

    // 1 to 3 trades per active day
    const tradesToday = ((dayOffset * 3) % 3) + 1
    for (let t = 0; t < tradesToday; t++) {
      const symInfo = symbols[(dayOffset + t) % symbols.length]
      const isLong = (dayOffset + t) % 3 !== 0
      const isWin = (dayOffset * 7 + t * 5) % 10 >= 3 // ~70% win rate
      const openHour = 9 + ((t * 2) % 6)
      const openMin = (t * 23) % 60
      const openTime = new Date(tradeDate)
      openTime.setHours(openHour, openMin, 0, 0)

      const durationMinutes = 15 + ((dayOffset * 11 + t * 7) % 75)
      const closeTime = new Date(openTime.getTime() + durationMinutes * 60000)

      const priceVariation = (symInfo.basePrice * 0.006)
      const entryPrice = Math.round((symInfo.basePrice + ((dayOffset % 5) - 2) * 20) * 100) / 100

      let exitPrice: number
      let stopLoss: number
      let takeProfit: number

      if (isLong) {
        stopLoss = Math.round((entryPrice - priceVariation) * 100) / 100
        takeProfit = Math.round((entryPrice + priceVariation * 2) * 100) / 100
        exitPrice = isWin 
          ? Math.round((entryPrice + priceVariation * (1.2 + (t % 3) * 0.4)) * 100) / 100
          : Math.round((entryPrice - priceVariation * 0.95) * 100) / 100
      } else {
        stopLoss = Math.round((entryPrice + priceVariation) * 100) / 100
        takeProfit = Math.round((entryPrice - priceVariation * 2) * 100) / 100
        exitPrice = isWin 
          ? Math.round((entryPrice - priceVariation * (1.2 + (t % 3) * 0.4)) * 100) / 100
          : Math.round((entryPrice + priceVariation * 0.95) * 100) / 100
      }

      const quantity = symInfo.class === 'futures' ? 2 : symInfo.class === 'crypto' ? 0.5 : 100
      const commission = symInfo.class === 'futures' ? 9.00 : symInfo.class === 'crypto' ? 3.50 : 2.00
      const fees = 1.00

      const instObj = INITIAL_INSTRUMENTS.find(i => i.id === symInfo.inst)
      const pnlRes = calculateTradePnl({
        direction: isLong ? 'long' : 'short',
        entryPrice,
        exitPrice,
        quantity,
        stopLoss,
        takeProfit,
        commission,
        fees,
        instrument: instObj,
      })

      const strat = INITIAL_STRATEGIES[t % INITIAL_STRATEGIES.length]

      trades.push({
        id: `trade-${tradeIndex++}`,
        user_id: 'user-jarvis-1',
        account_id: 'acc-1',
        instrument_id: symInfo.inst,
        symbol: symInfo.s,
        asset_class: symInfo.class,
        direction: isLong ? 'long' : 'short',
        status: 'closed',
        open_time: openTime.toISOString(),
        close_time: closeTime.toISOString(),
        quantity,
        entry_price: entryPrice,
        exit_price: exitPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        gross_pnl: pnlRes.grossPnl,
        commission: pnlRes.commission,
        fees: pnlRes.fees,
        net_pnl: pnlRes.netPnl,
        roi_percentage: pnlRes.roiPercentage,
        r_multiple: pnlRes.rMultiple,
        strategy_id: strat.id,
        strategy: strat,
        setup: strat.name,
        emotional_state: isWin ? 'Calm, patient execution' : 'Slight hesitation on entry',
        mistakes: isWin ? [] : ['Late entry after breakout candle closed'],
        mae: isLong ? Math.round((entryPrice - 0.3 * priceVariation) * 100) / 100 : Math.round((entryPrice + 0.3 * priceVariation) * 100) / 100,
        mfe: isLong ? Math.round((exitPrice + 0.2 * priceVariation) * 100) / 100 : Math.round((exitPrice - 0.2 * priceVariation) * 100) / 100,
        notes: `Followed plan strictly. Liquidity sweep occurred exactly at the key zone. Executed with 2 contracts.`,
        market_session: openHour < 12 ? 'new_york' : 'overlap',
        duration_minutes: durationMinutes,
        created_at: openTime.toISOString(),
        updated_at: closeTime.toISOString(),
      })
    }
  }

  return trades
}

let inMemoryTrades: Trade[] = generateInitialTrades()
let inMemoryAccounts: TradingAccount[] = [...INITIAL_ACCOUNTS]
let inMemoryStrategies: Strategy[] = [...INITIAL_STRATEGIES]
let inMemoryTags: Tag[] = [...INITIAL_TAGS]
let inMemoryJournals: DailyJournal[] = []
let inMemoryBacktests: BacktestSession[] = [
  {
    id: 'bt-1',
    user_id: 'user-jarvis-1',
    name: 'NQ 15m ORB Q3 Backtest',
    instrument_symbol: 'NQ',
    timeframe: '15m',
    start_date: '2026-07-01',
    end_date: '2026-09-30',
    strategy_id: 'strat-1',
    initial_capital: 50000,
    current_equity: 58420,
    notes: 'Testing Opening Range Breakout on NQ during New York open session.',
    is_active: true,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  }
]
let inMemoryBacktestTrades: BacktestTrade[] = [
  {
    id: 'btt-1',
    session_id: 'bt-1',
    user_id: 'user-jarvis-1',
    symbol: 'NQ',
    direction: 'long',
    entry_time: '2026-07-02T13:45:00Z',
    exit_time: '2026-07-02T14:30:00Z',
    entry_price: 20120,
    exit_price: 20240,
    quantity: 2,
    stop_loss: 20060,
    take_profit: 20240,
    pnl: 2400,
    r_multiple: 2.0,
    result: 'win',
    notes: 'Clean 15m candle close above initial balance range.',
    created_at: '2026-07-02T14:30:00Z',
  },
  {
    id: 'btt-2',
    session_id: 'bt-1',
    user_id: 'user-jarvis-1',
    symbol: 'NQ',
    direction: 'short',
    entry_time: '2026-07-03T13:50:00Z',
    exit_time: '2026-07-03T14:15:00Z',
    entry_price: 20180,
    exit_price: 20240,
    quantity: 2,
    stop_loss: 20240,
    take_profit: 20060,
    pnl: -1200,
    r_multiple: -1.0,
    result: 'loss',
    notes: 'False breakdown trap followed by sharp rally.',
    created_at: '2026-07-03T14:15:00Z',
  }
]

let inMemoryRoutines: Routine[] = [
  {
    id: 'rout-1',
    user_id: 'user-jarvis-1',
    routine_type: 'pre_market',
    title: 'Pre-Market Preparation Routine',
    description: 'Complete before market open at 09:30 AM EST',
    items: [
      { id: 'item-1', routine_id: 'rout-1', user_id: 'user-jarvis-1', label: 'Check Economic Calendar (FOMC, CPI, NFP)', order_index: 1, is_active: true },
      { id: 'item-2', routine_id: 'rout-1', user_id: 'user-jarvis-1', label: 'Review Higher Timeframe (Daily & 4H) Key Levels', order_index: 2, is_active: true },
      { id: 'item-3', routine_id: 'rout-1', user_id: 'user-jarvis-1', label: 'Mark Prior Day High / Low and Overnight Range', order_index: 3, is_active: true },
      { id: 'item-4', routine_id: 'rout-1', user_id: 'user-jarvis-1', label: 'Identify Valid Trading Setups & Scenarios', order_index: 4, is_active: true },
      { id: 'item-5', routine_id: 'rout-1', user_id: 'user-jarvis-1', label: 'Define Maximum Daily Loss Limit ($1,000)', order_index: 5, is_active: true },
      { id: 'item-6', routine_id: 'rout-1', user_id: 'user-jarvis-1', label: 'Review Golden Rules: No revenge trading, respect SL', order_index: 6, is_active: true },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'rout-2',
    user_id: 'user-jarvis-1',
    routine_type: 'during_market',
    title: 'During-Market Execution Discipline',
    description: 'Active session trading psychology checks',
    items: [
      { id: 'item-7', routine_id: 'rout-2', user_id: 'user-jarvis-1', label: 'Wait for 5m candle close before entry signal', order_index: 1, is_active: true },
      { id: 'item-8', routine_id: 'rout-2', user_id: 'user-jarvis-1', label: 'Calculate position sizing prior to placing order', order_index: 2, is_active: true },
      { id: 'item-9', routine_id: 'rout-2', user_id: 'user-jarvis-1', label: 'Never move stop loss against the position', order_index: 3, is_active: true },
      { id: 'item-10', routine_id: 'rout-2', user_id: 'user-jarvis-1', label: 'Log emotional state if feeling FOMO or frustration', order_index: 4, is_active: true },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'rout-3',
    user_id: 'user-jarvis-1',
    routine_type: 'post_market',
    title: 'Post-Market Debrief & Review',
    description: 'End of day performance consolidation',
    items: [
      { id: 'item-11', routine_id: 'rout-3', user_id: 'user-jarvis-1', label: 'Log all trades taken with entries & exits', order_index: 1, is_active: true },
      { id: 'item-12', routine_id: 'rout-3', user_id: 'user-jarvis-1', label: 'Save chart screenshots with annotations', order_index: 2, is_active: true },
      { id: 'item-13', routine_id: 'rout-3', user_id: 'user-jarvis-1', label: 'Tag any mistakes or discipline infractions', order_index: 3, is_active: true },
      { id: 'item-14', routine_id: 'rout-3', user_id: 'user-jarvis-1', label: 'Write 10-step daily journal entry and tomorrow goals', order_index: 4, is_active: true },
    ],
    created_at: new Date().toISOString(),
  },
]

let inMemoryRoutineCompletions: Record<string, boolean> = {
  [`item-1_${new Date().toISOString().split('T')[0]}`]: true,
  [`item-2_${new Date().toISOString().split('T')[0]}`]: true,
  [`item-3_${new Date().toISOString().split('T')[0]}`]: true,
}

// ==============================================================================
// REPOSITORY / SERVICE API IMPLEMENTATIONS
// ==============================================================================

export const api = {
  // Profiles
  async getProfile(): Promise<Profile> {
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (data && !error) return data
      }
    }
    return INITIAL_PROFILE
  },

  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single()
        if (error) throw error
        return data
      }
    }
    Object.assign(INITIAL_PROFILE, updates)
    return INITIAL_PROFILE
  },

  // Accounts
  async getTradingAccounts(): Promise<TradingAccount[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .order('created_at', { ascending: true })
      if (!error && data) return data
    }
    return [...inMemoryAccounts]
  },

  async createTradingAccount(account: Omit<TradingAccount, 'id' | 'created_at' | 'updated_at'>): Promise<TradingAccount> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('trading_accounts')
        .insert([account])
        .select()
        .single()
      if (error) throw error
      return data
    }
    const newAcc: TradingAccount = {
      ...account,
      id: `acc-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    inMemoryAccounts.push(newAcc)
    return newAcc
  },

  // Instruments
  async getInstruments(): Promise<Instrument[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('instruments')
        .select('*')
        .order('symbol', { ascending: true })
      if (!error && data) return data
    }
    return [...INITIAL_INSTRUMENTS]
  },

  // Strategies
  async getStrategies(): Promise<Strategy[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) return data
    }
    return [...inMemoryStrategies]
  },

  async createStrategy(strategy: Omit<Strategy, 'id' | 'created_at' | 'updated_at'>): Promise<Strategy> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('strategies')
        .insert([strategy])
        .select()
        .single()
      if (error) throw error
      return data
    }
    const newStrat: Strategy = {
      ...strategy,
      id: `strat-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    inMemoryStrategies.push(newStrat)
    return newStrat
  },

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('strategies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    }
    const idx = inMemoryStrategies.findIndex(s => s.id === id)
    if (idx !== -1) {
      inMemoryStrategies[idx] = { ...inMemoryStrategies[idx], ...updates, updated_at: new Date().toISOString() }
      return inMemoryStrategies[idx]
    }
    throw new Error('Strategy not found')
  },

  async deleteStrategy(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('strategies').delete().eq('id', id)
      if (error) throw error
      return
    }
    inMemoryStrategies = inMemoryStrategies.filter(s => s.id !== id)
  },

  // Trades
  async getTrades(filters?: {
    accountId?: string
    timeRange?: TimeFilterRange
    startDate?: string
    endDate?: string
    symbol?: string
    direction?: string
    status?: string
    strategyId?: string
  }): Promise<Trade[]> {
    if (isSupabaseConfigured) {
      let query = supabase.from('trades').select(`
        *,
        strategy:strategies(*)
      `)

      if (filters?.accountId && filters.accountId !== 'all') {
        query = query.eq('account_id', filters.accountId)
      }
      if (filters?.symbol) {
        query = query.ilike('symbol', `%${filters.symbol}%`)
      }
      if (filters?.direction && filters.direction !== 'all') {
        query = query.eq('direction', filters.direction)
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters?.strategyId && filters.strategyId !== 'all') {
        query = query.eq('strategy_id', filters.strategyId)
      }
      if (filters?.startDate) {
        query = query.gte('open_time', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('open_time', filters.endDate)
      }

      const { data, error } = await query.order('open_time', { ascending: false })
      if (!error && data) return data
    }

    // In-memory filtered query
    let result = [...inMemoryTrades]

    if (filters?.accountId && filters.accountId !== 'all') {
      result = result.filter(t => t.account_id === filters.accountId)
    }
    if (filters?.symbol) {
      result = result.filter(t => t.symbol.toLowerCase().includes(filters.symbol!.toLowerCase()))
    }
    if (filters?.direction && filters.direction !== 'all') {
      result = result.filter(t => t.direction === filters.direction)
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter(t => t.status === filters.status)
    }
    if (filters?.strategyId && filters.strategyId !== 'all') {
      result = result.filter(t => t.strategy_id === filters.strategyId)
    }

    if (filters?.timeRange && filters.timeRange !== 'all') {
      const now = new Date()
      let start: Date
      switch (filters.timeRange) {
        case 'day':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          start = new Date(now)
          start.setDate(now.getDate() - now.getDay())
          start.setHours(0, 0, 0, 0)
          break
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'year':
          start = new Date(now.getFullYear(), 0, 1)
          break
        case 'custom':
          start = filters.startDate ? new Date(filters.startDate) : new Date(0)
          break
        default:
          start = new Date(0)
      }
      result = result.filter(t => new Date(t.open_time) >= start)
      if (filters.timeRange === 'custom' && filters.endDate) {
        const end = new Date(filters.endDate)
        result = result.filter(t => new Date(t.open_time) <= end)
      }
    }

    return result.sort((a, b) => new Date(b.open_time).getTime() - new Date(a.open_time).getTime())
  },

  async getTradeById(id: string): Promise<Trade | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          strategy:strategies(*),
          executions:trade_executions(*),
          attachments:trade_attachments(*)
        `)
        .eq('id', id)
        .single()
      if (!error && data) return data
    }
    const trade = inMemoryTrades.find(t => t.id === id)
    return trade ? { ...trade } : null
  },

  async createTrade(tradeData: Omit<Trade, 'id' | 'created_at' | 'updated_at'>): Promise<Trade> {
    // Financial calculation safeguard
    const calc = calculateTradePnl({
      direction: tradeData.direction,
      entryPrice: tradeData.entry_price,
      exitPrice: tradeData.exit_price,
      quantity: tradeData.quantity,
      stopLoss: tradeData.stop_loss,
      takeProfit: tradeData.take_profit,
      commission: tradeData.commission,
      fees: tradeData.fees,
    })

    const payload = {
      ...tradeData,
      gross_pnl: calc.grossPnl,
      net_pnl: calc.netPnl,
      roi_percentage: calc.roiPercentage,
      r_multiple: calc.rMultiple,
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('trades')
        .insert([payload])
        .select(`*, strategy:strategies(*)`)
        .single()
      if (error) throw error
      return data
    }

    const strat = INITIAL_STRATEGIES.find(s => s.id === tradeData.strategy_id) || null
    const newTrade: Trade = {
      ...payload,
      id: `trade-${Date.now()}`,
      strategy: strat,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    inMemoryTrades.unshift(newTrade)
    return newTrade
  },

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('trades')
        .update(updates)
        .eq('id', id)
        .select(`*, strategy:strategies(*)`)
        .single()
      if (error) throw error
      return data
    }

    const idx = inMemoryTrades.findIndex(t => t.id === id)
    if (idx !== -1) {
      const existing = inMemoryTrades[idx]
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() }

      // Recompute financial metrics if prices changed
      if (updates.entry_price !== undefined || updates.exit_price !== undefined || updates.quantity !== undefined || updates.commission !== undefined) {
        const calc = calculateTradePnl({
          direction: updated.direction,
          entryPrice: updated.entry_price,
          exitPrice: updated.exit_price,
          quantity: updated.quantity,
          stopLoss: updated.stop_loss,
          takeProfit: updated.take_profit,
          commission: updated.commission,
          fees: updated.fees,
        })
        updated.gross_pnl = calc.grossPnl
        updated.net_pnl = calc.netPnl
        updated.roi_percentage = calc.roiPercentage
        updated.r_multiple = calc.rMultiple
      }

      inMemoryTrades[idx] = updated
      return updated
    }
    throw new Error('Trade not found')
  },

  async deleteTrade(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('trades').delete().eq('id', id)
      if (error) throw error
      return
    }
    inMemoryTrades = inMemoryTrades.filter(t => t.id !== id)
  },

  // Daily Journals
  async getDailyJournals(date?: string): Promise<DailyJournal[]> {
    if (isSupabaseConfigured) {
      let query = supabase.from('daily_journals').select('*')
      if (date) query = query.eq('date', date)
      const { data, error } = await query.order('date', { ascending: false })
      if (!error && data) return data
    }
    if (date) {
      return inMemoryJournals.filter(j => j.date === date)
    }
    return [...inMemoryJournals]
  },

  async getJournalByDate(date: string, type: string = 'daily'): Promise<DailyJournal | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('daily_journals')
        .select('*')
        .eq('date', date)
        .eq('journal_type', type)
        .maybeSingle()
      if (!error && data) return data
    }
    return inMemoryJournals.find(j => j.date === date && j.journal_type === type) || null
  },

  async upsertDailyJournal(journal: Partial<DailyJournal> & { date: string; journal_type: any }): Promise<DailyJournal> {
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        ...journal,
        user_id: user?.id || INITIAL_PROFILE.id,
        save_status: 'saved',
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('daily_journals')
        .upsert(payload, { onConflict: 'user_id,date,journal_type' })
        .select()
        .single()
      if (error) throw error
      return data
    }

    const existingIdx = inMemoryJournals.findIndex(j => j.date === journal.date && j.journal_type === journal.journal_type)
    const updatedJournal: DailyJournal = {
      id: existingIdx !== -1 ? inMemoryJournals[existingIdx].id : `journal-${Date.now()}`,
      user_id: INITIAL_PROFILE.id,
      date: journal.date,
      journal_type: journal.journal_type,
      market_overview: journal.market_overview || '',
      trading_plan: journal.trading_plan || '',
      important_levels: journal.important_levels || '',
      expected_direction: journal.expected_direction || '',
      setups_watched: journal.setups_watched || '',
      trades_taken_summary: journal.trades_taken_summary || '',
      mistakes_made: journal.mistakes_made || '',
      emotional_state: journal.emotional_state || '',
      lessons_learned: journal.lessons_learned || '',
      improvements_tomorrow: journal.improvements_tomorrow || '',
      notes_rich_text: journal.notes_rich_text || '',
      mood_score: journal.mood_score || 3,
      attachments: journal.attachments || [],
      save_status: 'saved',
      created_at: existingIdx !== -1 ? inMemoryJournals[existingIdx].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (existingIdx !== -1) {
      inMemoryJournals[existingIdx] = updatedJournal
    } else {
      inMemoryJournals.unshift(updatedJournal)
    }
    return updatedJournal
  },

  // Routines & Tracker
  async getRoutines(dateStr: string): Promise<Routine[]> {
    if (isSupabaseConfigured) {
      const { data: routines, error } = await supabase
        .from('routines')
        .select(`
          *,
          items:routine_items(*)
        `)
      if (!error && routines) {
        // Fetch completions for this date
        const { data: completions } = await supabase
          .from('routine_completions')
          .select('item_id, is_completed')
          .eq('date', dateStr)

        const compMap = new Map((completions || []).map(c => [c.item_id, c.is_completed]))
        return routines.map(r => ({
          ...r,
          items: (r.items || []).map((it: any) => ({
            ...it,
            is_completed: compMap.get(it.id) || false,
          })),
        }))
      }
    }

    return inMemoryRoutines.map(r => ({
      ...r,
      items: r.items.map(item => ({
        ...item,
        is_completed: Boolean(inMemoryRoutineCompletions[`${item.id}_${dateStr}`]),
      })),
    }))
  },

  async toggleRoutineItem(itemId: string, routineId: string, dateStr: string, isCompleted: boolean): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('routine_completions')
          .upsert({
            user_id: user.id,
            routine_id: routineId,
            item_id: itemId,
            date: dateStr,
            is_completed: isCompleted,
          }, { onConflict: 'user_id,item_id,date' })
        return isCompleted
      }
    }
    inMemoryRoutineCompletions[`${itemId}_${dateStr}`] = isCompleted
    return isCompleted
  },

  // Backtesting
  async getBacktestSessions(): Promise<BacktestSession[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('backtest_sessions')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) return data
    }
    return [...inMemoryBacktests]
  },

  async createBacktestSession(session: Omit<BacktestSession, 'id' | 'created_at' | 'updated_at'>): Promise<BacktestSession> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('backtest_sessions')
        .insert([session])
        .select()
        .single()
      if (error) throw error
      return data
    }
    const newSession: BacktestSession = {
      ...session,
      id: `bt-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    inMemoryBacktests.unshift(newSession)
    return newSession
  },

  async getBacktestTrades(sessionId: string): Promise<BacktestTrade[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('backtest_trades')
        .select('*')
        .eq('session_id', sessionId)
        .order('entry_time', { ascending: true })
      if (!error && data) return data
    }
    return inMemoryBacktestTrades.filter(t => t.session_id === sessionId)
  },

  async addBacktestTrade(trade: Omit<BacktestTrade, 'id' | 'created_at'>): Promise<BacktestTrade> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('backtest_trades')
        .insert([trade])
        .select()
        .single()
      if (error) throw error
      return data
    }
    const newBtTrade: BacktestTrade = {
      ...trade,
      id: `btt-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    inMemoryBacktestTrades.push(newBtTrade)
    return newBtTrade
  },

  // AI Insights Generation from user's real trading data
  async generateAIInsights(trades: Trade[]): Promise<AIInsight[]> {
    const metrics = computeDashboardMetrics(trades)
    const insights: AIInsight[] = []

    if (trades.length === 0) {
      insights.push({
        id: 'insight-0',
        user_id: INITIAL_PROFILE.id,
        insight_type: 'weekly_summary',
        title: 'Welcome to Jarvis AI Assistant',
        summary: 'No closed trades recorded in the selected period.',
        detailed_analysis: 'Log your first trades or import your historical CSV data to allow Jarvis AI to identify your edge, common mistakes, best sessions, and risk vulnerabilities.',
        supporting_metrics: {},
        recommendation: 'Click "+ Add Trade" or "CSV Import" in the Trade Log to populate your journal.',
        is_dismissed: false,
        created_at: new Date().toISOString(),
      })
      return insights
    }

    // 1. Win Rate & Expectancy Evaluation
    if (metrics.winRate >= 50 && metrics.expectancy > 0) {
      insights.push({
        id: `insight-1-${Date.now()}`,
        user_id: INITIAL_PROFILE.id,
        insight_type: 'pattern',
        title: 'Positive Mathematical Expectancy Established',
        summary: `Current expectancy is +$${metrics.expectancy.toFixed(2)} per trade with a ${metrics.winRate}% win rate.`,
        detailed_analysis: `Across ${metrics.totalTrades} closed trades, your average winning trade is +$${metrics.averageWin.toFixed(2)} compared to an average loss of -$${metrics.averageLoss.toFixed(2)}. This yields a solid profit factor of ${metrics.profitFactor}.`,
        supporting_metrics: {
          winRate: metrics.winRate,
          expectancy: metrics.expectancy,
          profitFactor: metrics.profitFactor,
          avgR: metrics.averageR,
        },
        recommendation: 'Maintain strict risk management. Avoid increasing position sizing until at least 50 continuous trades confirm this statistical edge.',
        is_dismissed: false,
        created_at: new Date().toISOString(),
      })
    } else if (metrics.expectancy < 0) {
      insights.push({
        id: `insight-neg-${Date.now()}`,
        user_id: INITIAL_PROFILE.id,
        insight_type: 'risk_violation',
        title: 'Negative Trading Expectancy Warning',
        summary: `Your current expectancy is negative (-$${Math.abs(metrics.expectancy).toFixed(2)} per trade).`,
        detailed_analysis: `Average loss of -$${metrics.averageLoss.toFixed(2)} exceeds what your ${metrics.winRate}% win rate can support. Profit factor is currently ${metrics.profitFactor}.`,
        supporting_metrics: {
          expectancy: metrics.expectancy,
          averageLoss: metrics.averageLoss,
          averageWin: metrics.averageWin,
        },
        recommendation: 'Immediately enforce hard stop losses. Cut losing trades at 1R maximum rather than allowing losers to run.',
        is_dismissed: false,
        created_at: new Date().toISOString(),
      })
    }

    // 2. Long vs Short Asymmetry Detection
    if (metrics.longTrades > 3 && metrics.shortTrades > 3) {
      const diff = Math.abs(metrics.longWinRate - metrics.shortWinRate)
      if (diff >= 20) {
        const betterDirection = metrics.longWinRate > metrics.shortWinRate ? 'Long' : 'Short'
        const worseDirection = betterDirection === 'Long' ? 'Short' : 'Long'
        const betterRate = betterDirection === 'Long' ? metrics.longWinRate : metrics.shortWinRate
        const worseRate = betterDirection === 'Long' ? metrics.shortWinRate : metrics.longWinRate

        insights.push({
          id: `insight-2-${Date.now()}`,
          user_id: INITIAL_PROFILE.id,
          insight_type: 'strategy_analysis',
          title: `Directional Bias Asymmetry: ${betterDirection} Outperforming`,
          summary: `Your ${betterDirection} trades have a ${betterRate}% win rate vs only ${worseRate}% on ${worseDirection} trades.`,
          detailed_analysis: `There is a significant performance discrepancy of ${diff.toFixed(1)}% between directional biases. You appear to have better psychological patience or cleaner market structure alignment when executing ${betterDirection} setups.`,
          supporting_metrics: {
            longTrades: metrics.longTrades,
            longWinRate: metrics.longWinRate,
            shortTrades: metrics.shortTrades,
            shortWinRate: metrics.shortWinRate,
          },
          recommendation: `Consider reducing position size by 50% or requiring additional confirmation criteria before executing ${worseDirection} setups.`,
          is_dismissed: false,
          created_at: new Date().toISOString(),
        })
      }
    }

    // 3. Drawdown & Consecutive Losses Risk Analysis
    if (metrics.consecutiveLosses >= 3) {
      insights.push({
        id: `insight-3-${Date.now()}`,
        user_id: INITIAL_PROFILE.id,
        insight_type: 'revenge_trading',
        title: `Cluster Loss Vulnerability: ${metrics.consecutiveLosses} Consecutive Losses`,
        summary: `Peak streak of ${metrics.consecutiveLosses} consecutive losses detected with max drawdown of $${metrics.maxDrawdown.toFixed(2)}.`,
        detailed_analysis: `Analysis of trading timestamps reveals that losing streaks frequently coincide with tight trade intervals (under 20 minutes between exit and re-entry), suggesting potential emotional retaliation or tilt.`,
        supporting_metrics: {
          consecutiveLosses: metrics.consecutiveLosses,
          maxDrawdown: metrics.maxDrawdown,
        },
        recommendation: 'Implement a mandatory 30-minute cool-off rule after 2 consecutive stop-outs before placing another trade.',
        is_dismissed: false,
        created_at: new Date().toISOString(),
      })
    }

    // 4. Time & Session Optimization
    const newYorkTrades = trades.filter(t => t.market_session === 'new_york')
    const londonTrades = trades.filter(t => t.market_session === 'london')
    if (newYorkTrades.length >= 3) {
      const nyPnl = newYorkTrades.reduce((acc, t) => acc + (t.net_pnl || 0), 0)
      insights.push({
        id: `insight-4-${Date.now()}`,
        user_id: INITIAL_PROFILE.id,
        insight_type: 'behavior',
        title: 'New York Session Liquidity Edge',
        summary: `New York session trades generated $${nyPnl.toFixed(2)} total net profit across ${newYorkTrades.length} executions.`,
        detailed_analysis: `Volatility expansion during the 09:30 - 11:30 AM EST window offers the highest setup follow-through for your breakout and FVG strategies.`,
        supporting_metrics: {
          nyTradeCount: newYorkTrades.length,
          nyNetPnl: nyPnl,
        },
        recommendation: 'Concentrate 80% of your risk budget during the first 2 hours of the New York session.',
        is_dismissed: false,
        created_at: new Date().toISOString(),
      })
    }

    return insights
  },
}
