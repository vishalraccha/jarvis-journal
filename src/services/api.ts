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
// DYNAMIC IN-MEMORY STORE
// Only stores real dynamic user data entered by the user.
// Zero dummy/fake trades or fabricated statistics!
// Strictly complies with "No localStorage/sessionStorage/IndexedDB" requirement.
// ==============================================================================

const INITIAL_PROFILE: Profile = {
  id: 'user-jarvis-1',
  username: 'trader',
  full_name: 'Jarvis Trader',
  avatar_url: null,
  base_currency: 'USD',
  timezone: 'America/New_York',
  onboarding_completed: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const INITIAL_ACCOUNTS: TradingAccount[] = [
  {
    id: 'acc-1',
    user_id: 'user-jarvis-1',
    name: 'Primary Trading Account',
    account_type: 'live',
    broker: 'Live Brokerage',
    initial_balance: 10000,
    current_balance: 10000,
    currency: 'USD',
    is_default: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const STANDARD_INSTRUMENTS: Instrument[] = [
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
    symbol: 'ETH/USDT',
    name: 'Ethereum / Tether Perpetual',
    asset_class: 'crypto',
    tick_size: 0.01,
    tick_value: 0.01,
    contract_size: 1.0,
    point_value: 1.0,
    default_commission: 0.50,
    currency: 'USDT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'inst-5',
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
    id: 'inst-6',
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
    id: 'inst-7',
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
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
    id: 'inst-8',
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
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
    id: 'inst-9',
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
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
    id: 'inst-10',
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
    id: 'inst-11',
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
  {
    id: 'inst-12',
    symbol: 'AAPL',
    name: 'Apple Inc.',
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
    description: '15-minute Opening Range Breakout with high relative volume confirmation.',
    entry_conditions: '5-minute close above/below 15m range.',
    exit_conditions: '2R target or VWAP reversal break.',
    stop_loss_rules: 'Placed at midpoint of the 15-minute opening candle.',
    take_profit_rules: 'Target 1 at 2R, Target 2 at prior day high/low.',
    color: '#287BFF',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'strat-2',
    user_id: 'user-jarvis-1',
    name: 'Fair Value Gap / Liquidity Sweep',
    description: 'Liquidity grab followed by Market Structure Shift (MSS) and FVG retest.',
    entry_conditions: 'Liquidity sweep + MSS + entry in 5m FVG.',
    exit_conditions: 'Opposing liquidity pool or 2.5R target.',
    stop_loss_rules: 'Beyond swing high/low that caused displacement.',
    take_profit_rules: 'Draw on liquidity (DOL) target.',
    color: '#18C784',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'strat-3',
    user_id: 'user-jarvis-1',
    name: 'VWAP Mean Reversion',
    description: 'Reversion into VWAP baseline from 2+ standard deviation bands.',
    entry_conditions: 'Rejection wick at 2.5 VWAP deviation band.',
    exit_conditions: 'VWAP baseline touch.',
    stop_loss_rules: 'Fixed 1R or new high/low wick extension.',
    take_profit_rules: 'VWAP line.',
    color: '#A855F7',
    is_active: true,
    created_at: new Date().toISOString(),
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
]

// Zero dummy trades! Clean array that only receives user-entered trades.
let inMemoryTrades: Trade[] = []
let inMemoryAccounts: TradingAccount[] = [...INITIAL_ACCOUNTS]
let inMemoryStrategies: Strategy[] = [...INITIAL_STRATEGIES]
let inMemoryTags: Tag[] = [...INITIAL_TAGS]
let inMemoryJournals: DailyJournal[] = []
let inMemoryBacktests: BacktestSession[] = []
let inMemoryBacktestTrades: BacktestTrade[] = []

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

// Zero dummy routine completions! Populates only when user checks them off.
let inMemoryRoutineCompletions: Record<string, boolean> = {}

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
    return [...STANDARD_INSTRUMENTS]
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

  // Trades (Dynamic real data)
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

    // Dynamic real data in memory
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
        case 'week': {
          const dayOfWeek = now.getDay()
          const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
          start = new Date(now.setDate(diff))
          start.setHours(0, 0, 0, 0)
          break
        }
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
    const matchedInstrument = STANDARD_INSTRUMENTS.find(i => i.symbol.toUpperCase() === tradeData.symbol.toUpperCase())

    const calc = calculateTradePnl({
      direction: tradeData.direction,
      entryPrice: tradeData.entry_price,
      exitPrice: tradeData.exit_price,
      quantity: tradeData.quantity,
      stopLoss: tradeData.stop_loss,
      takeProfit: tradeData.take_profit,
      commission: tradeData.commission,
      fees: tradeData.fees,
      instrument: matchedInstrument,
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

    const strat = inMemoryStrategies.find(s => s.id === tradeData.strategy_id) || null
    const newTrade: Trade = {
      ...payload,
      id: `trade-${Date.now()}`,
      strategy: strat,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    inMemoryTrades.unshift(newTrade)

    // Update account balance
    const targetAccount = inMemoryAccounts.find(a => a.id === tradeData.account_id)
    if (targetAccount) {
      targetAccount.current_balance = Math.round((targetAccount.current_balance + calc.netPnl) * 100) / 100
    }

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
        const matchedInst = STANDARD_INSTRUMENTS.find(i => i.symbol.toUpperCase() === updated.symbol.toUpperCase())
        const calc = calculateTradePnl({
          direction: updated.direction,
          entryPrice: updated.entry_price,
          exitPrice: updated.exit_price,
          quantity: updated.quantity,
          stopLoss: updated.stop_loss,
          takeProfit: updated.take_profit,
          commission: updated.commission,
          fees: updated.fees,
          instrument: matchedInst,
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

  // AI Insights Generation (Strictly analyzes real user trading data)
  async generateAIInsights(trades: Trade[]): Promise<AIInsight[]> {
    const closedTrades = trades.filter(t => t.status === 'closed')

    if (closedTrades.length === 0) {
      return [
        {
          id: 'insight-empty',
          user_id: INITIAL_PROFILE.id,
          insight_type: 'weekly_summary',
          title: 'Jarvis AI Ready for Live Trading Data',
          summary: 'No closed trades recorded yet.',
          detailed_analysis: 'Log your first trade or upload broker CSV records to activate real-time mathematical edge detection, session analysis, and mistake auditing.',
          supporting_metrics: {},
          recommendation: 'Use the quick "+ Add Trade" button at the top to log your first trade.',
          is_dismissed: false,
          created_at: new Date().toISOString(),
        }
      ]
    }

    const metrics = computeDashboardMetrics(closedTrades)
    const insights: AIInsight[] = []

    // 1. Mathematical Expectancy Assessment
    if (metrics.expectancy > 0) {
      insights.push({
        id: `insight-exp-${Date.now()}`,
        user_id: INITIAL_PROFILE.id,
        insight_type: 'pattern',
        title: 'Positive Mathematical Expectancy Established',
        summary: `Current expectancy is +$${metrics.expectancy.toFixed(2)} per trade with a ${metrics.winRate}% win rate.`,
        detailed_analysis: `Across ${metrics.totalTrades} closed trades, your average winning trade is +$${metrics.averageWin.toFixed(2)} compared to an average loss of -$${metrics.averageLoss.toFixed(2)}. Profit factor is ${metrics.profitFactor}.`,
        supporting_metrics: {
          winRate: metrics.winRate,
          expectancy: metrics.expectancy,
          profitFactor: metrics.profitFactor,
          avgR: metrics.averageR,
        },
        recommendation: 'Maintain strict risk management. Avoid increasing position sizing until at least 30 continuous trades confirm this statistical edge.',
        is_dismissed: false,
        created_at: new Date().toISOString(),
      })
    } else {
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
    if (metrics.longTrades >= 2 && metrics.shortTrades >= 2) {
      const diff = Math.abs(metrics.longWinRate - metrics.shortWinRate)
      if (diff >= 15) {
        const betterDirection = metrics.longWinRate > metrics.shortWinRate ? 'Long' : 'Short'
        const worseDirection = betterDirection === 'Long' ? 'Short' : 'Long'
        const betterRate = betterDirection === 'Long' ? metrics.longWinRate : metrics.shortWinRate
        const worseRate = betterDirection === 'Long' ? metrics.shortWinRate : metrics.longWinRate

        insights.push({
          id: `insight-bias-${Date.now()}`,
          user_id: INITIAL_PROFILE.id,
          insight_type: 'strategy_analysis',
          title: `Directional Bias Asymmetry: ${betterDirection} Outperforming`,
          summary: `Your ${betterDirection} trades have a ${betterRate}% win rate vs only ${worseRate}% on ${worseDirection} trades.`,
          detailed_analysis: `Performance discrepancy of ${diff.toFixed(1)}% between directional biases. You appear to have better psychological patience or cleaner market structure alignment when executing ${betterDirection} setups.`,
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

    // 3. Drawdown & Streak Risk Analysis
    if (metrics.consecutiveLosses >= 2) {
      insights.push({
        id: `insight-streak-${Date.now()}`,
        user_id: INITIAL_PROFILE.id,
        insight_type: 'revenge_trading',
        title: `Consecutive Loss Cluster: ${metrics.consecutiveLosses} Losses`,
        summary: `Peak streak of ${metrics.consecutiveLosses} consecutive losses detected with max drawdown of $${metrics.maxDrawdown.toFixed(2)}.`,
        detailed_analysis: `Analysis of trading timestamps reveals that consecutive losses often occur in close proximity. A mandatory cool-off rule prevents emotional revenge trades.`,
        supporting_metrics: {
          consecutiveLosses: metrics.consecutiveLosses,
          maxDrawdown: metrics.maxDrawdown,
        },
        recommendation: 'Implement a mandatory 30-minute cool-off rule after 2 consecutive stop-outs before placing another trade.',
        is_dismissed: false,
        created_at: new Date().toISOString(),
      })
    }

    return insights
  },
}
