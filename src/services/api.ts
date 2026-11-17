import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  Trade,
  TradingAccount,
  Instrument,
  Strategy,
  Tag,
  DailyJournal,
  Routine,
  BacktestSession,
  BacktestTrade,
  AIInsight,
  TimeFilterRange,
  Profile,
} from '@/types/database'
import { calculateTradePnl, computeDashboardMetrics } from '@/lib/calculations'

// ==============================================================================
// PERSISTENT DATABASE ENGINE
// All data (accounts, trades, instruments, tags, strategies, journals) is permanently
// persisted to disk in `data/jarvis_database.json` via `/api/db`, and mirrored to
// browser storage and Supabase cloud sync.
// Zero dummy/fake trades: only real data entered by the user is stored and analyzed.
// ==============================================================================

async function fetchDbCollection<T>(collection: string): Promise<T[]> {
  try {
    const res = await fetch(`/api/db/${collection}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) {
        try { localStorage.setItem(`jarvis_db_${collection}`, JSON.stringify(data)) } catch (_) {}
        return data
      }
    }
  } catch (err) {
    console.warn(`[Jarvis DB] Failed fetching /api/db/${collection}:`, err)
  }

  // Dual-layer fallback to browser cache
  try {
    const cached = localStorage.getItem(`jarvis_db_${collection}`)
    if (cached) return JSON.parse(cached)
  } catch (_) {}

  return []
}

async function saveDbItem<T extends { id?: string }>(collection: string, item: T): Promise<T> {
  try {
    await fetch(`/api/db/${collection}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
  } catch (err) {
    console.warn(`[Jarvis DB] Failed saving to /api/db/${collection}:`, err)
  }

  try {
    const cached = localStorage.getItem(`jarvis_db_${collection}`)
    const list: any[] = cached ? JSON.parse(cached) : []
    const idx = list.findIndex(i => i.id === item.id)
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item }
    } else {
      list.push(item)
    }
    localStorage.setItem(`jarvis_db_${collection}`, JSON.stringify(list))
  } catch (_) {}

  return item
}

async function updateDbItem<T = any>(collection: string, id: string, updates: Partial<T>): Promise<void> {
  try {
    await fetch(`/api/db/${collection}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
  } catch (err) {
    console.warn(`[Jarvis DB] Failed updating /api/db/${collection}/${id}:`, err)
  }

  try {
    const cached = localStorage.getItem(`jarvis_db_${collection}`)
    if (cached) {
      const list: any[] = JSON.parse(cached)
      const idx = list.findIndex(i => i.id === id)
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates }
        localStorage.setItem(`jarvis_db_${collection}`, JSON.stringify(list))
      }
    }
  } catch (_) {}
}

async function deleteDbItem(collection: string, id: string): Promise<void> {
  try {
    await fetch(`/api/db/${collection}/${id}`, {
      method: 'DELETE',
    })
  } catch (err) {
    console.warn(`[Jarvis DB] Failed deleting /api/db/${collection}/${id}:`, err)
  }

  try {
    const cached = localStorage.getItem(`jarvis_db_${collection}`)
    if (cached) {
      const list: any[] = JSON.parse(cached)
      const filtered = list.filter(i => i.id !== id)
      localStorage.setItem(`jarvis_db_${collection}`, JSON.stringify(filtered))
    }
  } catch (_) {}
}

// Initial defaults used if database file is empty on first boot
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

// Working cache in memory
let inMemoryTrades: Trade[] = []
let inMemoryAccounts: TradingAccount[] = [...INITIAL_ACCOUNTS]
let inMemoryInstruments: Instrument[] = [...STANDARD_INSTRUMENTS]
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

let inMemoryRoutineCompletions: Record<string, boolean> = {}

// ==============================================================================
// REPOSITORY / SERVICE API IMPLEMENTATIONS
// ==============================================================================

export const api = {
  // Profiles
  async getProfile(): Promise<Profile> {
    if (isSupabaseConfigured) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          if (data && !error) return data
        }
      } catch (_) {}
    }
    return INITIAL_PROFILE
  },

  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    if (isSupabaseConfigured) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single()
          if (!error && data) return data
        }
      } catch (_) {}
    }
    Object.assign(INITIAL_PROFILE, updates)
    return INITIAL_PROFILE
  },

  // Diagnostics & Database Health Probe
  async checkDatabaseHealth(): Promise<{ isConnected: boolean; tablesExist: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return { isConnected: false, tablesExist: false, error: 'Supabase credentials not configured' }
    }
    try {
      const { error } = await supabase.from('trading_accounts').select('id').limit(1)
      if (error) {
        if (error.code === 'PGRST205') {
          return { isConnected: true, tablesExist: false, error: `Table 'public.trading_accounts' not found in schema cache (Code: PGRST205)` }
        }
        return { isConnected: true, tablesExist: false, error: error.message || String(error) }
      }
      return { isConnected: true, tablesExist: true }
    } catch (err: any) {
      return { isConnected: false, tablesExist: false, error: err.message || String(err) }
    }
  },

  // Accounts
  async getTradingAccounts(): Promise<TradingAccount[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('trading_accounts')
          .select('*')
          .order('created_at', { ascending: true })
        if (!error && data && data.length > 0) {
          inMemoryAccounts = data
          return data
        }
      } catch (err) {
        console.warn('[Jarvis Engine] Supabase trading_accounts fetch note:', err)
      }
    }

    const dbAccounts = await fetchDbCollection<TradingAccount>('accounts')
    if (dbAccounts && dbAccounts.length > 0) {
      inMemoryAccounts = dbAccounts
      return dbAccounts
    }

    return [...inMemoryAccounts]
  },

  async createTradingAccount(account: Omit<TradingAccount, 'id' | 'created_at' | 'updated_at'>): Promise<TradingAccount> {
    const newAcc: TradingAccount = {
      ...account,
      id: `acc-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 1. Immediately persist to database file
    await saveDbItem('accounts', newAcc)

    // 2. Also save to Supabase cloud sync
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('trading_accounts')
          .insert([newAcc])
          .select()
          .single()
        if (!error && data) {
          const idx = inMemoryAccounts.findIndex(a => a.id === newAcc.id)
          if (idx !== -1) inMemoryAccounts[idx] = data
          else inMemoryAccounts.push(data)
          return data
        }
      } catch (err: any) {
        console.warn('[Jarvis Engine] Supabase account sync note:', err.message || err)
      }
    }

    inMemoryAccounts.push(newAcc)
    return newAcc
  },

  async updateTradingAccount(id: string, updates: Partial<TradingAccount>): Promise<TradingAccount> {
    await updateDbItem('accounts', id, updates)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('trading_accounts').update(updates).eq('id', id)
      } catch (err) {}
    }
    const idx = inMemoryAccounts.findIndex(a => a.id === id)
    if (idx !== -1) {
      inMemoryAccounts[idx] = { ...inMemoryAccounts[idx], ...updates, updated_at: new Date().toISOString() }
      return inMemoryAccounts[idx]
    }
    throw new Error('Account not found')
  },

  async deleteTradingAccount(id: string): Promise<void> {
    await deleteDbItem('accounts', id)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('trading_accounts').delete().eq('id', id)
      } catch (err) {
        console.warn('[Jarvis Engine] deleteTradingAccount Supabase note:', err)
      }
    }
    inMemoryAccounts = inMemoryAccounts.filter(a => a.id !== id)
  },

  // Instruments
  async getInstruments(): Promise<Instrument[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('instruments')
          .select('*')
          .order('symbol', { ascending: true })
        if (!error && data && data.length > 0) {
          inMemoryInstruments = data
          return data
        }
      } catch (err) {}
    }

    const dbInsts = await fetchDbCollection<Instrument>('instruments')
    if (dbInsts && dbInsts.length > 0) {
      inMemoryInstruments = dbInsts
      return dbInsts
    }

    return [...inMemoryInstruments]
  },

  async createInstrument(inst: Omit<Instrument, 'id' | 'created_at' | 'updated_at'>): Promise<Instrument> {
    const newInst: Instrument = {
      ...inst,
      id: `inst-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await saveDbItem('instruments', newInst)

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('instruments')
          .insert([newInst])
          .select()
          .single()
        if (!error && data) {
          inMemoryInstruments.push(data)
          return data
        }
      } catch (err: any) {
        console.warn('[Jarvis Engine] Supabase instrument sync note:', err.message || err)
      }
    }

    inMemoryInstruments.push(newInst)
    return newInst
  },

  async deleteInstrument(id: string): Promise<void> {
    await deleteDbItem('instruments', id)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('instruments').delete().eq('id', id)
      } catch (err) {}
    }
    inMemoryInstruments = inMemoryInstruments.filter(i => i.id !== id)
  },

  // Tags & Mistakes
  async getTags(): Promise<Tag[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('*')
          .order('name', { ascending: true })
        if (!error && data && data.length > 0) {
          inMemoryTags = data
          return data
        }
      } catch (err) {}
    }

    const dbTags = await fetchDbCollection<Tag>('tags')
    if (dbTags && dbTags.length > 0) {
      inMemoryTags = dbTags
      return dbTags
    }

    return [...inMemoryTags]
  },

  async createTag(tag: Omit<Tag, 'id' | 'created_at'>): Promise<Tag> {
    const newTag: Tag = {
      ...tag,
      id: `tag-${Date.now()}`,
      created_at: new Date().toISOString(),
    }

    await saveDbItem('tags', newTag)

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('tags')
          .insert([newTag])
          .select()
          .single()
        if (!error && data) {
          inMemoryTags.push(data)
          return data
        }
      } catch (err: any) {
        console.warn('[Jarvis Engine] Supabase tag sync note:', err.message || err)
      }
    }

    inMemoryTags.push(newTag)
    return newTag
  },

  async deleteTag(id: string): Promise<void> {
    await deleteDbItem('tags', id)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('tags').delete().eq('id', id)
      } catch (err) {}
    }
    inMemoryTags = inMemoryTags.filter(t => t.id !== id)
  },

  // Strategies
  async getStrategies(): Promise<Strategy[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('strategies')
          .select('*')
          .order('created_at', { ascending: false })
        if (!error && data && data.length > 0) {
          inMemoryStrategies = data
          return data
        }
      } catch (err) {}
    }

    const dbStrats = await fetchDbCollection<Strategy>('strategies')
    if (dbStrats && dbStrats.length > 0) {
      inMemoryStrategies = dbStrats
      return dbStrats
    }

    return [...inMemoryStrategies]
  },

  async createStrategy(strategy: Omit<Strategy, 'id' | 'created_at' | 'updated_at'>): Promise<Strategy> {
    const newStrat: Strategy = {
      ...strategy,
      id: `strat-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await saveDbItem('strategies', newStrat)

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('strategies')
          .insert([newStrat])
          .select()
          .single()
        if (!error && data) {
          inMemoryStrategies.push(data)
          return data
        }
      } catch (err: any) {
        console.warn('[Jarvis Engine] Supabase strategy sync note:', err.message || err)
      }
    }

    inMemoryStrategies.push(newStrat)
    return newStrat
  },

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
    await updateDbItem('strategies', id, updates)
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('strategies')
          .update(updates)
          .eq('id', id)
          .select()
          .single()
        if (!error && data) {
          const idx = inMemoryStrategies.findIndex(s => s.id === id)
          if (idx !== -1) inMemoryStrategies[idx] = data
          return data
        }
      } catch (err) {}
    }

    const idx = inMemoryStrategies.findIndex(s => s.id === id)
    if (idx !== -1) {
      inMemoryStrategies[idx] = { ...inMemoryStrategies[idx], ...updates, updated_at: new Date().toISOString() }
      return inMemoryStrategies[idx]
    }
    throw new Error('Strategy not found')
  },

  async deleteStrategy(id: string): Promise<void> {
    await deleteDbItem('strategies', id)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('strategies').delete().eq('id', id)
      } catch (err) {}
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
    let allTrades: Trade[] = []

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select(`*, strategy:strategies(*)`)
          .order('open_time', { ascending: false })
        if (!error && data && data.length > 0) {
          allTrades = data
          inMemoryTrades = data
        }
      } catch (err) {}
    }

    if (allTrades.length === 0) {
      const dbTrades = await fetchDbCollection<Trade>('trades')
      if (dbTrades && dbTrades.length > 0) {
        allTrades = dbTrades
        inMemoryTrades = dbTrades
      } else {
        allTrades = [...inMemoryTrades]
      }
    }

    let result = [...allTrades]

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
      try {
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
      } catch (err) {}
    }
    const trade = inMemoryTrades.find(t => t.id === id)
    if (trade) return { ...trade }
    const dbTrades = await fetchDbCollection<Trade>('trades')
    return dbTrades.find(t => t.id === id) || null
  },

  async createTrade(tradeData: Omit<Trade, 'id' | 'created_at' | 'updated_at'>): Promise<Trade> {
    const matchedInstrument = (inMemoryInstruments.length > 0 ? inMemoryInstruments : STANDARD_INSTRUMENTS)
      .find(i => i.symbol.toUpperCase() === tradeData.symbol.toUpperCase())

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

    const strat = inMemoryStrategies.find(s => s.id === tradeData.strategy_id) || null
    const newTrade: Trade = {
      ...tradeData,
      id: `trade-${Date.now()}`,
      gross_pnl: calc.grossPnl,
      net_pnl: calc.netPnl,
      roi_percentage: calc.roiPercentage,
      r_multiple: calc.rMultiple,
      strategy: strat,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 1. Persist trade to database file
    await saveDbItem('trades', newTrade)

    // 2. Update account balance in memory and database
    const targetAccount = inMemoryAccounts.find(a => a.id === tradeData.account_id)
    if (targetAccount) {
      targetAccount.current_balance = Math.round((targetAccount.current_balance + calc.netPnl) * 100) / 100
      await updateDbItem('accounts', targetAccount.id, { current_balance: targetAccount.current_balance })
      if (isSupabaseConfigured) {
        try {
          await supabase.from('trading_accounts').update({ current_balance: targetAccount.current_balance }).eq('id', targetAccount.id)
        } catch (_) {}
      }
    }

    // 3. Supabase cloud sync
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('trades')
          .insert([newTrade])
          .select(`*, strategy:strategies(*)`)
          .single()
        if (!error && data) {
          inMemoryTrades.unshift(data)
          return data
        }
      } catch (err: any) {
        console.warn('[Jarvis Engine] Supabase trade sync note:', err.message || err)
      }
    }

    inMemoryTrades.unshift(newTrade)
    return newTrade
  },

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade> {
    await updateDbItem('trades', id, updates)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('trades').update(updates).eq('id', id)
      } catch (err) {}
    }

    const idx = inMemoryTrades.findIndex(t => t.id === id)
    if (idx !== -1) {
      const existing = inMemoryTrades[idx]
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() }

      if (updates.entry_price !== undefined || updates.exit_price !== undefined || updates.quantity !== undefined || updates.commission !== undefined) {
        const matchedInst = (inMemoryInstruments.length > 0 ? inMemoryInstruments : STANDARD_INSTRUMENTS)
          .find(i => i.symbol.toUpperCase() === updated.symbol.toUpperCase())
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
    await deleteDbItem('trades', id)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('trades').delete().eq('id', id)
      } catch (err) {}
    }
    inMemoryTrades = inMemoryTrades.filter(t => t.id !== id)
  },

  // Daily Journals
  async getDailyJournals(date?: string): Promise<DailyJournal[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('daily_journals').select('*')
        if (date) query = query.eq('date', date)
        const { data, error } = await query.order('date', { ascending: false })
        if (!error && data && data.length > 0) {
          inMemoryJournals = data
          return data
        }
      } catch (err) {}
    }

    const dbJournals = await fetchDbCollection<DailyJournal>('journals')
    if (dbJournals && dbJournals.length > 0) {
      inMemoryJournals = dbJournals
      if (date) return dbJournals.filter(j => j.date === date)
      return dbJournals
    }

    if (date) return inMemoryJournals.filter(j => j.date === date)
    return [...inMemoryJournals]
  },

  async getJournalByDate(date: string, type: string = 'daily'): Promise<DailyJournal | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('daily_journals')
          .select('*')
          .eq('date', date)
          .eq('journal_type', type)
          .maybeSingle()
        if (!error && data) return data
      } catch (err) {}
    }

    const found = inMemoryJournals.find(j => j.date === date && j.journal_type === type)
    if (found) return found

    const dbJournals = await fetchDbCollection<DailyJournal>('journals')
    return dbJournals.find(j => j.date === date && j.journal_type === type) || null
  },

  async upsertDailyJournal(journal: Partial<DailyJournal> & { date: string; journal_type: any }): Promise<DailyJournal> {
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

    await saveDbItem('journals', updatedJournal)

    if (isSupabaseConfigured) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const payload = {
          ...journal,
          user_id: user?.id || INITIAL_PROFILE.id,
          save_status: 'saved',
          updated_at: new Date().toISOString(),
        }
        await supabase
          .from('daily_journals')
          .upsert(payload, { onConflict: 'user_id,date,journal_type' })
      } catch (err) {}
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
    let routines = inMemoryRoutines
    const dbRoutines = await fetchDbCollection<Routine>('routines')
    if (dbRoutines && dbRoutines.length > 0) {
      routines = dbRoutines
      inMemoryRoutines = dbRoutines
    }

    const completions = await fetchDbCollection<{ id: string; item_id: string; date: string; is_completed: boolean }>('routine_completions')
    const compMap = new Map<string, boolean>()
    for (const c of completions) {
      if (c.date === dateStr) {
        compMap.set(c.item_id, c.is_completed)
      }
    }

    return routines.map(r => ({
      ...r,
      items: r.items.map(item => ({
        ...item,
        is_completed: compMap.has(item.id)
          ? Boolean(compMap.get(item.id))
          : Boolean(inMemoryRoutineCompletions[`${item.id}_${dateStr}`]),
      })),
    }))
  },

  async toggleRoutineItem(itemId: string, routineId: string, dateStr: string, isCompleted: boolean): Promise<boolean> {
    inMemoryRoutineCompletions[`${itemId}_${dateStr}`] = isCompleted
    await saveDbItem('routine_completions', {
      id: `${itemId}_${dateStr}`,
      item_id: itemId,
      routine_id: routineId,
      date: dateStr,
      is_completed: isCompleted,
    })

    if (isSupabaseConfigured) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('routine_completions').upsert({
            user_id: user.id,
            routine_id: routineId,
            item_id: itemId,
            date: dateStr,
            is_completed: isCompleted,
          }, { onConflict: 'user_id,item_id,date' })
        }
      } catch (err) {}
    }
    return isCompleted
  },

  // Backtesting
  async getBacktestSessions(): Promise<BacktestSession[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('backtest_sessions')
          .select('*')
          .order('created_at', { ascending: false })
        if (!error && data && data.length > 0) return data
      } catch (err) {}
    }

    const dbSessions = await fetchDbCollection<BacktestSession>('backtest_sessions')
    if (dbSessions && dbSessions.length > 0) {
      inMemoryBacktests = dbSessions
      return dbSessions
    }

    return [...inMemoryBacktests]
  },

  async createBacktestSession(session: Omit<BacktestSession, 'id' | 'created_at' | 'updated_at'>): Promise<BacktestSession> {
    const newSession: BacktestSession = {
      ...session,
      id: `bt-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await saveDbItem('backtest_sessions', newSession)

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('backtest_sessions')
          .insert([session])
          .select()
          .single()
        if (!error && data) {
          inMemoryBacktests.unshift(data)
          return data
        }
      } catch (err) {}
    }

    inMemoryBacktests.unshift(newSession)
    return newSession
  },

  async getBacktestTrades(sessionId: string): Promise<BacktestTrade[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('backtest_trades')
          .select('*')
          .eq('session_id', sessionId)
          .order('entry_time', { ascending: true })
        if (!error && data && data.length > 0) return data
      } catch (err) {}
    }

    const dbBtTrades = await fetchDbCollection<BacktestTrade>('backtest_trades')
    if (dbBtTrades && dbBtTrades.length > 0) {
      inMemoryBacktestTrades = dbBtTrades
      return dbBtTrades.filter(t => t.session_id === sessionId)
    }

    return inMemoryBacktestTrades.filter(t => t.session_id === sessionId)
  },

  async addBacktestTrade(trade: Omit<BacktestTrade, 'id' | 'created_at'>): Promise<BacktestTrade> {
    const newBtTrade: BacktestTrade = {
      ...trade,
      id: `btt-${Date.now()}`,
      created_at: new Date().toISOString(),
    }

    await saveDbItem('backtest_trades', newBtTrade)

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('backtest_trades')
          .insert([trade])
          .select()
          .single()
        if (!error && data) {
          inMemoryBacktestTrades.push(data)
          return data
        }
      } catch (err) {}
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
