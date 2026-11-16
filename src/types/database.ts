export type AccountType = 'live' | 'demo' | 'evaluation' | 'funded'
export type AssetClass = 'forex' | 'crypto' | 'indices' | 'futures' | 'stocks' | 'commodities' | 'other'
export type TradeDirection = 'long' | 'short'
export type TradeStatus = 'open' | 'closed' | 'cancelled'
export type MarketSession = 'asian' | 'london' | 'new_york' | 'overlap' | 'other'
export type JournalType = 'pre_market' | 'daily' | 'post_market' | 'weekly_review' | 'monthly_review'
export type RoutineType = 'pre_market' | 'during_market' | 'post_market' | 'custom'
export type TimeFilterRange = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom'

export interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url?: string | null
  base_currency: string
  timezone: string
  onboarding_completed: boolean
  created_at?: string
  updated_at: string
}

export interface TradingAccount {
  id: string
  user_id: string
  name: string
  account_type: AccountType
  broker?: string | null
  initial_balance: number
  current_balance: number
  currency: string
  is_default: boolean
  is_active: boolean
  created_at?: string
  updated_at: string
}

export interface Instrument {
  id: string
  user_id?: string | null
  symbol: string
  name: string
  asset_class: AssetClass
  tick_size: number
  tick_value: number
  contract_size: number
  point_value: number
  default_commission: number
  currency: string
  created_at?: string
  updated_at: string
}

export interface StrategyRule {
  id: string
  strategy_id: string
  user_id: string
  rule_type: 'entry' | 'exit' | 'risk' | 'general'
  description: string
  priority: number
  is_required: boolean
  created_at?: string
}

export interface StrategyChecklist {
  id: string
  strategy_id: string
  user_id: string
  title: string
  items: { id: string; label: string; checked?: boolean }[]
  created_at?: string
}

export interface Strategy {
  id: string
  user_id: string
  name: string
  description?: string | null
  entry_conditions?: string | null
  exit_conditions?: string | null
  stop_loss_rules?: string | null
  take_profit_rules?: string | null
  screenshot_url?: string | null
  color: string
  is_active: boolean
  rules?: StrategyRule[]
  checklists?: StrategyChecklist[]
  created_at?: string
  updated_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  color: string
  category: 'setup' | 'mistake' | 'emotion' | 'market_condition' | 'session' | 'general'
  created_at?: string
}

export interface TradeExecution {
  id: string
  trade_id: string
  user_id: string
  execution_type: 'entry' | 'add' | 'scale_out' | 'exit'
  timestamp: string
  price: number
  quantity: number
  fees: number
  notes?: string | null
  created_at?: string
}

export interface TradeAttachment {
  id: string
  trade_id: string
  user_id: string
  file_url: string
  file_name: string
  file_type: string
  file_size?: number | null
  description?: string | null
  created_at?: string
}

export interface TradeNote {
  id: string
  trade_id: string
  user_id: string
  title?: string | null
  content: string
  created_at?: string
  updated_at: string
}

export interface Trade {
  id: string
  user_id: string
  account_id: string
  instrument_id?: string | null
  symbol: string
  asset_class: AssetClass
  direction: TradeDirection
  status: TradeStatus
  open_time: string
  close_time?: string | null
  quantity: number
  entry_price: number
  exit_price?: number | null
  stop_loss?: number | null
  take_profit?: number | null
  gross_pnl: number
  commission: number
  fees: number
  net_pnl: number
  roi_percentage: number
  r_multiple?: number | null
  strategy_id?: string | null
  strategy?: Strategy | null
  setup?: string | null
  emotional_state?: string | null
  mistakes?: string[]
  mae?: number | null
  mfe?: number | null
  notes?: string | null
  market_session?: MarketSession | null
  duration_minutes?: number | null
  executions?: TradeExecution[]
  attachments?: TradeAttachment[]
  tags?: Tag[]
  created_at?: string
  updated_at: string
}

export interface DailyJournal {
  id: string
  user_id: string
  account_id?: string | null
  date: string // YYYY-MM-DD
  journal_type: JournalType
  market_overview?: string | null
  trading_plan?: string | null
  important_levels?: string | null
  expected_direction?: string | null
  setups_watched?: string | null
  trades_taken_summary?: string | null
  mistakes_made?: string | null
  emotional_state?: string | null
  lessons_learned?: string | null
  improvements_tomorrow?: string | null
  notes_rich_text?: string | null
  mood_score?: number | null // 1 to 5
  attachments: { name: string; url: string; size?: number }[]
  save_status: 'saved' | 'saving' | 'error' | 'draft'
  created_at?: string
  updated_at: string
}

export interface RoutineItem {
  id: string
  routine_id: string
  user_id: string
  label: string
  description?: string | null
  order_index: number
  is_active: boolean
  is_completed?: boolean
  created_at?: string
}

export interface Routine {
  id: string
  user_id: string
  routine_type: RoutineType
  title: string
  description?: string | null
  items: RoutineItem[]
  created_at?: string
}

export interface RoutineCompletion {
  id: string
  user_id: string
  routine_id: string
  item_id: string
  date: string
  is_completed: boolean
  notes?: string | null
  created_at?: string
}

export interface ProgressRecord {
  id: string
  user_id: string
  date: string
  completion_rate: number
  streak_count: number
  discipline_score: number
  total_rules_followed: number
  total_rules_violated: number
  notes?: string | null
  created_at?: string
}

export interface BacktestSession {
  id: string
  user_id: string
  name: string
  instrument_symbol: string
  timeframe: string
  start_date: string
  end_date: string
  strategy_id?: string | null
  initial_capital: number
  current_equity: number
  notes?: string | null
  is_active: boolean
  created_at?: string
  updated_at: string
}

export interface BacktestTrade {
  id: string
  session_id: string
  user_id: string
  symbol: string
  direction: TradeDirection
  entry_time: string
  exit_time?: string | null
  entry_price: number
  exit_price?: number | null
  quantity: number
  stop_loss?: number | null
  take_profit?: number | null
  pnl: number
  r_multiple?: number | null
  result?: 'win' | 'loss' | 'breakeven' | 'open'
  notes?: string | null
  created_at?: string
}

export interface HistoricalCandle {
  id?: string
  symbol: string
  timeframe: string
  timestamp: string | number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface AIInsight {
  id: string
  user_id: string
  account_id?: string | null
  insight_type: 'pattern' | 'behavior' | 'risk_violation' | 'overtrading' | 'revenge_trading' | 'strategy_analysis' | 'weekly_summary' | 'monthly_review'
  title: string
  summary: string
  detailed_analysis: string
  supporting_metrics: Record<string, any>
  recommendation: string
  is_dismissed: boolean
  created_at?: string
}

export interface DashboardMetrics {
  netPnl: number
  grossPnl: number
  winRate: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  breakEvenTrades: number
  profitFactor: number
  averageWin: number
  averageLoss: number
  averageR: number
  maxDrawdown: number
  maxDrawdownPercent: number
  expectancy: number
  consecutiveWins: number
  consecutiveLosses: number
  avgHoldingTimeMinutes: number
  totalVolume: number
  longTrades: number
  shortTrades: number
  longWinRate: number
  shortWinRate: number
}
