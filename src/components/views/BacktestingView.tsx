import React, { useState, useEffect } from 'react'
import {
  History,
  Plus,
  Play,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  Layers,
  DollarSign,
  AlertCircle,
  Shield,
} from 'lucide-react'
import { BacktestSession, BacktestTrade, Strategy, TradeDirection } from '@/types/database'
import { api } from '@/services/api'
import { formatCurrency, formatPercent, formatR } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

interface BacktestingViewProps {
  strategies: Strategy[]
}

export const BacktestingView: React.FC<BacktestingViewProps> = ({ strategies }) => {
  const { currency } = useAuth()
  const [sessions, setSessions] = useState<BacktestSession[]>([])
  const [activeSession, setActiveSession] = useState<BacktestSession | null>(null)
  const [sessionTrades, setSessionTrades] = useState<BacktestTrade[]>([])

  // Modal for new backtest session
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false)
  const [sessionName, setSessionName] = useState('NQ 15m ORB Strategy Backtest')
  const [symbol, setSymbol] = useState('NQ')
  const [timeframe, setTimeframe] = useState('15m')
  const [startDate, setStartDate] = useState('2026-08-01')
  const [endDate, setEndDate] = useState('2026-10-31')
  const [strategyId, setStrategyId] = useState('')
  const [initialCapital, setInitialCapital] = useState(50000)

  // Simulation order entry state
  const [simDirection, setSimDirection] = useState<TradeDirection>('long')
  const [simEntryPrice, setSimEntryPrice] = useState(20800)
  const [simExitPrice, setSimExitPrice] = useState(20920)
  const [simQuantity, setSimQuantity] = useState(2)
  const [simStopLoss, setSimStopLoss] = useState(20740)
  const [simTakeProfit, setSimTakeProfit] = useState(20920)
  const [simNotes, setSimNotes] = useState('Clean breakout of 15m balance.')

  const loadSessions = async () => {
    const list = await api.getBacktestSessions()
    setSessions(list)
    if (list.length > 0 && !activeSession) {
      setActiveSession(list[0])
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (activeSession) {
      api.getBacktestTrades(activeSession.id).then(setSessionTrades)
    }
  }, [activeSession])

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    const newSess = await api.createBacktestSession({
      user_id: 'user-jarvis-1',
      name: sessionName,
      instrument_symbol: symbol,
      timeframe,
      start_date: startDate,
      end_date: endDate,
      strategy_id: strategyId || null,
      initial_capital: initialCapital,
      current_equity: initialCapital,
      is_active: true,
    })
    setSessions(prev => [newSess, ...prev])
    setActiveSession(newSess)
    setIsNewSessionOpen(false)
  }

  const handlePlaceSimulatedTrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSession) return

    const priceDiff = simDirection === 'long' 
      ? simExitPrice - simEntryPrice 
      : simEntryPrice - simExitPrice
    const pnl = priceDiff * 20 * simQuantity // Futures point value 20 for NQ

    const riskDiff = Math.abs(simEntryPrice - simStopLoss)
    const risk = riskDiff * 20 * simQuantity
    const rMultiple = risk > 0 ? Math.round((pnl / risk) * 100) / 100 : null
    const result = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven'

    const trade = await api.addBacktestTrade({
      session_id: activeSession.id,
      user_id: 'user-jarvis-1',
      symbol: activeSession.instrument_symbol,
      direction: simDirection,
      entry_time: new Date().toISOString(),
      exit_time: new Date().toISOString(),
      entry_price: simEntryPrice,
      exit_price: simExitPrice,
      quantity: simQuantity,
      stop_loss: simStopLoss,
      take_profit: simTakeProfit,
      pnl,
      r_multiple: rMultiple,
      result,
      notes: simNotes,
    })

    setSessionTrades(prev => [...prev, trade])
  }

  // Calculate backtest metrics
  const totalTrades = sessionTrades.length
  const winningTrades = sessionTrades.filter(t => t.result === 'win').length
  const losingTrades = sessionTrades.filter(t => t.result === 'loss').length
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
  const netPnl = sessionTrades.reduce((acc, t) => acc + (t.pnl || 0), 0)
  const currentEquity = (activeSession?.initial_capital || 50000) + netPnl

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Strict Separation Notice Banner */}
      <div
        style={{
          borderColor: 'var(--accent-border, rgba(59,130,246,0.4))',
          backgroundColor: 'var(--accent-muted, rgba(59,130,246,0.15))',
        }}
        className="flex items-center gap-3 rounded-xl border p-4 text-xs text-[#E2E8F0]"
      >
        <Shield className="h-5 w-5 shrink-0" style={{ color: 'var(--accent-color, #3B82F6)' }} />
        <div>
          <span className="font-bold" style={{ color: 'var(--accent-color, #3B82F6)' }}>ISOLATED BACKTESTING ENVIRONMENT:</span>{' '}
          All executions in this simulator are stored in dedicated backtest tables and will never contaminate your live journal statistics.
        </div>
      </div>

      {/* Header & Session Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#202838] bg-[#141A26] p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: 'var(--accent-muted, rgba(59,130,246,0.15))',
              color: 'var(--accent-color, #3B82F6)',
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg"
          >
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E2E8F0]">Manual Backtesting Simulator</h2>
            <p className="text-xs text-[#8493A8]">Execute historical trades bar-by-bar and test rule consistency</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeSession?.id || ''}
            onChange={(e) => {
              const found = sessions.find(s => s.id === e.target.value)
              if (found) setActiveSession(found)
            }}
            className="rounded-lg border border-[#202838] bg-[#10141E] px-3 py-2 text-xs text-[#E2E8F0] focus:border-[var(--accent-color)] focus:outline-none"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.instrument_symbol} {s.timeframe})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsNewSessionOpen(true)}
            style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Session Metrics Bar */}
      {activeSession && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4">
            <span className="text-[10px] uppercase font-bold text-[#8493A8]">Simulated Equity</span>
            <div className="mt-1 font-mono text-lg font-bold text-[#EAF0F8]">
              {formatCurrency(currentEquity, currency)}
            </div>
            <div className="text-[10px] text-[#8493A8]">Initial: ${activeSession.initial_capital.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4">
            <span className="text-[10px] uppercase font-bold text-[#8493A8]">Net Backtest P&L</span>
            <div className={`mt-1 font-mono text-lg font-bold ${netPnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'}`}>
              {formatCurrency(netPnl, currency, true)}
            </div>
            <div className="text-[10px] text-[#8493A8]">{((netPnl / activeSession.initial_capital) * 100).toFixed(2)}% ROI</div>
          </div>
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4">
            <span className="text-[10px] uppercase font-bold text-[#8493A8]">Win Rate</span>
            <div className="mt-1 font-mono text-lg font-bold text-[#18C784]">
              {formatPercent(winRate)}
            </div>
            <div className="text-[10px] text-[#8493A8]">{winningTrades}W / {losingTrades}L</div>
          </div>
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4">
            <span className="text-[10px] uppercase font-bold text-[#8493A8]">Total Trades</span>
            <div className="mt-1 font-mono text-lg font-bold text-[#4095FF]">
              {totalTrades}
            </div>
            <div className="text-[10px] text-[#8493A8]">Sample size</div>
          </div>
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4">
            <span className="text-[10px] uppercase font-bold text-[#8493A8]">Instrument</span>
            <div className="mt-1 font-mono text-lg font-bold text-[#EAF0F8]">
              {activeSession.instrument_symbol}
            </div>
            <div className="text-[10px] text-[#8493A8]">{activeSession.timeframe} Bar Interval</div>
          </div>
        </div>
      )}

      {/* Simulator Execution Form & Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Place Simulated Trade */}
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
          <h3 className="text-sm font-bold text-[#EAF0F8] mb-3 border-b border-[#263448] pb-2">
            Record Simulated Execution
          </h3>
          <form onSubmit={handlePlaceSimulatedTrade} className="space-y-4">
            <div>
              <label className="block text-xs text-[#8493A8] mb-1">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSimDirection('long')}
                  className={`py-1.5 rounded-lg text-xs font-bold ${
                    simDirection === 'long' ? 'bg-[#18C784] text-black' : 'border border-[#263448] bg-[#101722] text-[#8493A8]'
                  }`}
                >
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setSimDirection('short')}
                  className={`py-1.5 rounded-lg text-xs font-bold ${
                    simDirection === 'short' ? 'bg-[#F05265] text-white' : 'border border-[#263448] bg-[#101722] text-[#8493A8]'
                  }`}
                >
                  SHORT
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-[#8493A8] mb-1">Quantity</label>
                <input
                  type="number"
                  value={simQuantity}
                  onChange={(e) => setSimQuantity(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-1.5 font-mono text-xs text-[#EAF0F8]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8493A8] mb-1">Entry Price</label>
                <input
                  type="number"
                  value={simEntryPrice}
                  onChange={(e) => setSimEntryPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-1.5 font-mono text-xs text-[#EAF0F8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-[#8493A8] mb-1">Exit Price</label>
                <input
                  type="number"
                  value={simExitPrice}
                  onChange={(e) => setSimExitPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-1.5 font-mono text-xs text-[#EAF0F8]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8493A8] mb-1">Stop Loss</label>
                <input
                  type="number"
                  value={simStopLoss}
                  onChange={(e) => setSimStopLoss(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-1.5 font-mono text-xs text-[#EAF0F8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#8493A8] mb-1">Trade Rationale</label>
              <textarea
                rows={2}
                value={simNotes}
                onChange={(e) => setSimNotes(e.target.value)}
                className="w-full rounded-lg border border-[#263448] bg-[#101722] p-2 text-xs text-[#EAF0F8]"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-[#287BFF] py-2 text-xs font-semibold text-white shadow-md hover:bg-[#4095FF]"
            >
              Add Simulated Execution
            </button>
          </form>
        </div>

        {/* Backtest Trades Table */}
        <div className="lg:col-span-2 rounded-xl border border-[#263448] bg-[#151E2B] shadow-lg overflow-hidden">
          <div className="border-b border-[#263448] p-4">
            <h3 className="text-sm font-bold text-[#EAF0F8]">Session Execution History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-tabular">
              <thead className="border-b border-[#263448] bg-[#101722] text-[#8493A8] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3">Entry</th>
                  <th className="py-2.5 px-3">Exit</th>
                  <th className="py-2.5 px-3">R-Mult</th>
                  <th className="py-2.5 px-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263448] bg-[#151E2B]">
                {sessionTrades.map((st) => (
                  <tr key={st.id} className="hover:bg-[#1A2536]">
                    <td className="py-2.5 px-3">
                      <span className={`uppercase font-bold ${st.direction === 'long' ? 'text-[#18C784]' : 'text-[#F05265]'}`}>
                        {st.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#EAF0F8]">${st.entry_price}</td>
                    <td className="py-2.5 px-3 font-mono text-[#EAF0F8]">${st.exit_price}</td>
                    <td className="py-2.5 px-3 font-mono text-[#4095FF]">{st.r_multiple ? formatR(st.r_multiple) : '-'}</td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${st.pnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'}`}>
                      {formatCurrency(st.pnl, currency, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
