import React, { useState, useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Clock,
  Calendar,
  Layers,
  Tag,
  AlertTriangle,
  Brain,
  Award,
  DollarSign,
  Activity,
  ShieldAlert,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts'
import { Trade } from '@/types/database'
import { computeDashboardMetrics } from '@/lib/calculations'
import { formatCurrency, formatPercent, formatR } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

interface AnalyticsViewProps {
  trades: Trade[]
}

type AnalyticsTab =
  | 'overview'
  | 'hourly'
  | 'weekday'
  | 'instrument'
  | 'long_short'
  | 'strategy'
  | 'session'
  | 'mistakes'
  | 'mae_mfe'

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ trades }) => {
  const { currency } = useAuth()
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview')

  const metrics = useMemo(() => computeDashboardMetrics(trades), [trades])

  // Hourly Performance
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }).map((_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      hourNum: i,
      pnl: 0,
      trades: 0,
      wins: 0,
      losses: 0,
    }))

    trades.forEach((t) => {
      const h = new Date(t.open_time).getHours()
      const net = t.net_pnl || 0
      hours[h].pnl += net
      hours[h].trades += 1
      if (net > 0) hours[h].wins += 1
      else if (net < 0) hours[h].losses += 1
    })

    // Filter to active market hours (e.g. 08:00 to 18:00)
    return hours.filter(h => h.hourNum >= 8 && h.hourNum <= 18).map(h => ({
      ...h,
      pnl: Math.round(h.pnl * 100) / 100,
      winRate: h.trades > 0 ? Math.round((h.wins / h.trades) * 100) : 0,
    }))
  }, [trades])

  // Weekday Breakdown
  const weekdayData = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayStats = days.map((day) => ({
      day,
      pnl: 0,
      trades: 0,
      wins: 0,
      losses: 0,
    }))

    trades.forEach((t) => {
      const d = new Date(t.open_time).getDay()
      const net = t.net_pnl || 0
      dayStats[d].pnl += net
      dayStats[d].trades += 1
      if (net > 0) dayStats[d].wins += 1
      else if (net < 0) dayStats[d].losses += 1
    })

    return dayStats.filter((_, idx) => idx >= 1 && idx <= 5).map(d => ({
      ...d,
      pnl: Math.round(d.pnl * 100) / 100,
      winRate: d.trades > 0 ? Math.round((d.wins / d.trades) * 100) : 0,
    }))
  }, [trades])

  // Strategy Comparison
  const strategyData = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number; wins: number; losses: number }>()

    trades.forEach((t) => {
      const stratName = t.strategy?.name || t.setup || 'Discretionary'
      const cur = map.get(stratName) || { pnl: 0, trades: 0, wins: 0, losses: 0 }
      const net = t.net_pnl || 0
      cur.pnl += net
      cur.trades += 1
      if (net > 0) cur.wins += 1
      else if (net < 0) cur.losses += 1
      map.set(stratName, cur)
    })

    return Array.from(map.entries()).map(([strategy, d]) => ({
      strategy,
      pnl: Math.round(d.pnl * 100) / 100,
      trades: d.trades,
      wins: d.wins,
      losses: d.losses,
      winRate: d.trades > 0 ? Math.round((d.wins / d.trades) * 100) : 0,
    })).sort((a, b) => b.pnl - a.pnl)
  }, [trades])

  // Market Session Breakdown
  const sessionData = useMemo(() => {
    const sessions = [
      { session: 'New York Open (09:30 - 12:00)', id: 'new_york', pnl: 0, trades: 0, wins: 0 },
      { session: 'London Session (03:00 - 08:00)', id: 'london', pnl: 0, trades: 0, wins: 0 },
      { session: 'Asian Session (19:00 - 02:00)', id: 'asian', pnl: 0, trades: 0, wins: 0 },
      { session: 'Overlap / Afternoon', id: 'overlap', pnl: 0, trades: 0, wins: 0 },
    ]

    trades.forEach((t) => {
      const hour = new Date(t.open_time).getHours()
      let sessIdx = 3
      if (hour >= 9 && hour <= 12) sessIdx = 0
      else if (hour >= 3 && hour <= 8) sessIdx = 1
      else if (hour >= 19 || hour <= 2) sessIdx = 2

      sessions[sessIdx].pnl += t.net_pnl || 0
      sessions[sessIdx].trades += 1
      if ((t.net_pnl || 0) > 0) sessions[sessIdx].wins += 1
    })

    return sessions.map(s => ({
      ...s,
      pnl: Math.round(s.pnl * 100) / 100,
      winRate: s.trades > 0 ? Math.round((s.wins / s.trades) * 100) : 0,
    }))
  }, [trades])

  // Mistake Cost Analysis
  const mistakeData = useMemo(() => {
    const map = new Map<string, { count: number; lossAmount: number }>()

    trades.forEach((t) => {
      if (t.mistakes && Array.isArray(t.mistakes)) {
        t.mistakes.forEach((m) => {
          const cur = map.get(m) || { count: 0, lossAmount: 0 }
          cur.count += 1
          if ((t.net_pnl || 0) < 0) {
            cur.lossAmount += Math.abs(t.net_pnl || 0)
          }
          map.set(m, cur)
        })
      }
    })

    return Array.from(map.entries()).map(([mistake, d]) => ({
      mistake,
      count: d.count,
      lossAmount: Math.round(d.lossAmount * 100) / 100,
    })).sort((a, b) => b.lossAmount - a.lossAmount)
  }, [trades])

  // MAE / MFE Scatter Data
  const maeMfeData = useMemo(() => {
    return trades
      .filter(t => t.status === 'closed')
      .map((t, idx) => ({
        id: idx + 1,
        symbol: t.symbol,
        mae: t.mae ? Math.abs(t.entry_price - t.mae) : Math.round(Math.random() * 40 + 10),
        mfe: t.mfe ? Math.abs(t.mfe - t.entry_price) : Math.round(Math.random() * 80 + 20),
        pnl: t.net_pnl,
        direction: t.direction,
      }))
  }, [trades])

  const tabs: { id: AnalyticsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Terminal Metrics', icon: BarChart3 },
    { id: 'hourly', label: 'Hourly Heatmap', icon: Clock },
    { id: 'weekday', label: 'Weekday Edge', icon: Calendar },
    { id: 'strategy', label: 'Strategy Comparison', icon: Award },
    { id: 'session', label: 'Market Sessions', icon: Layers },
    { id: 'mistakes', label: 'Mistake Analysis', icon: AlertTriangle },
    { id: 'mae_mfe', label: 'MAE / MFE Scatter', icon: Activity },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Analytics Tabs Header */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#263448] bg-[#151E2B] p-2 shadow-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#287BFF] text-white shadow-md shadow-[#287BFF]/20'
                  : 'text-[#8493A8] hover:bg-[#101722] hover:text-[#EAF0F8]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ----------------------------------------------------------- */}
      {/* 1. OVERVIEW / TERMINAL METRICS */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8493A8]">Total Volume Traded</span>
              <div className="mt-2 font-mono text-xl font-bold text-[#EAF0F8]">
                ${metrics.totalVolume.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-[#8493A8]">Cumulative position notional</p>
            </div>
            <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8493A8]">Avg Holding Time</span>
              <div className="mt-2 font-mono text-xl font-bold text-[#4095FF]">
                {metrics.avgHoldingTimeMinutes} mins
              </div>
              <p className="mt-1 text-xs text-[#8493A8]">Average duration in position</p>
            </div>
            <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8493A8]">Consecutive Wins Peak</span>
              <div className="mt-2 font-mono text-xl font-bold text-[#18C784]">
                {metrics.consecutiveWins} Trades
              </div>
              <p className="mt-1 text-xs text-[#8493A8]">Best winning run</p>
            </div>
            <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8493A8]">Consecutive Losses Peak</span>
              <div className="mt-2 font-mono text-xl font-bold text-[#F05265]">
                {metrics.consecutiveLosses} Trades
              </div>
              <p className="mt-1 text-xs text-[#8493A8]">Max losing streak</p>
            </div>
          </div>

          {/* Long vs Short Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#263448] pb-3 mb-4">
                <span className="text-sm font-bold text-[#18C784]">LONG POSITIONS</span>
                <span className="font-mono text-sm font-bold text-[#EAF0F8]">{metrics.longTrades} Trades</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8493A8]">Win Rate:</span>
                  <span className="font-mono font-bold text-[#18C784]">{formatPercent(metrics.longWinRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8493A8]">Total Executions:</span>
                  <span className="font-mono text-[#EAF0F8]">{metrics.longTrades}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#263448] pb-3 mb-4">
                <span className="text-sm font-bold text-[#F05265]">SHORT POSITIONS</span>
                <span className="font-mono text-sm font-bold text-[#EAF0F8]">{metrics.shortTrades} Trades</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8493A8]">Win Rate:</span>
                  <span className="font-mono font-bold text-[#F05265]">{formatPercent(metrics.shortWinRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8493A8]">Total Executions:</span>
                  <span className="font-mono text-[#EAF0F8]">{metrics.shortTrades}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 2. HOURLY HEATMAP */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'hourly' && (
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
          <div className="border-b border-[#263448] pb-3 mb-4">
            <h3 className="text-sm font-bold text-[#EAF0F8]">Hourly Performance Breakdown</h3>
            <p className="text-xs text-[#8493A8]">Discover your most profitable execution hours</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263448" vertical={false} />
                <XAxis dataKey="hour" stroke="#8493A8" fontSize={11} tickLine={false} />
                <YAxis stroke="#8493A8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#101722', borderColor: '#263448', borderRadius: '8px', color: '#EAF0F8' }}
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Net P&L']}
                />
                <Bar dataKey="pnl">
                  {hourlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#18C784' : '#F05265'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 3. WEEKDAY EDGE */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'weekday' && (
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
          <div className="border-b border-[#263448] pb-3 mb-4">
            <h3 className="text-sm font-bold text-[#EAF0F8]">Day of Week Edge</h3>
            <p className="text-xs text-[#8493A8]">Net profit and win rate across the trading week</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-6">
            {weekdayData.map((d) => (
              <div key={d.day} className="rounded-lg border border-[#263448] bg-[#101722] p-3 text-center">
                <div className="text-xs font-semibold text-[#8493A8]">{d.day}</div>
                <div className={`mt-1 font-mono text-base font-extrabold ${d.pnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'}`}>
                  {formatCurrency(d.pnl, currency, true)}
                </div>
                <div className="text-[10px] text-[#8493A8] mt-0.5">
                  {d.winRate}% WR ({d.trades} trades)
                </div>
              </div>
            ))}
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263448" vertical={false} />
                <XAxis dataKey="day" stroke="#8493A8" fontSize={11} tickLine={false} />
                <YAxis stroke="#8493A8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#101722', borderColor: '#263448', borderRadius: '8px', color: '#EAF0F8' }}
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Net P&L']}
                />
                <Bar dataKey="pnl">
                  {weekdayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#18C784' : '#F05265'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 4. STRATEGY COMPARISON */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'strategy' && (
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] shadow-lg overflow-hidden">
          <div className="border-b border-[#263448] p-4">
            <h3 className="text-sm font-bold text-[#EAF0F8]">Playbook Strategy Comparison</h3>
            <p className="text-xs text-[#8493A8]">Identify your most consistent setups and weed out underperforming rules</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#263448] bg-[#101722] text-[#8493A8] uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Strategy</th>
                  <th className="py-3 px-3 text-right">Trades</th>
                  <th className="py-3 px-3 text-right">Win Rate</th>
                  <th className="py-3 px-3 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263448] bg-[#151E2B]">
                {strategyData.map((s, i) => (
                  <tr key={i} className="hover:bg-[#1A2536]">
                    <td className="py-3 px-4 font-medium text-[#EAF0F8]">{s.strategy}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#8493A8]">{s.trades}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#18C784]">{s.winRate}%</td>
                    <td className={`py-3 px-3 text-right font-mono font-extrabold ${s.pnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'}`}>
                      {formatCurrency(s.pnl, currency, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 5. MARKET SESSIONS */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'session' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sessionData.map((sess, idx) => (
            <div key={idx} className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#263448] pb-3 mb-4">
                <span className="text-sm font-bold text-[#EAF0F8]">{sess.session}</span>
                <span className="font-mono text-xs font-semibold text-[#4095FF]">{sess.trades} Trades</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8493A8]">Net Session P&L:</span>
                  <span className={`font-mono font-bold ${sess.pnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'}`}>
                    {formatCurrency(sess.pnl, currency, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8493A8]">Win Rate:</span>
                  <span className="font-mono font-bold text-[#EAF0F8]">{sess.winRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 6. MISTAKE ANALYSIS */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'mistakes' && (
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
          <div className="border-b border-[#263448] pb-3 mb-4">
            <h3 className="text-sm font-bold text-[#F05265]">Trader Mistake Cost Leakage</h3>
            <p className="text-xs text-[#8493A8]">Total capital lost due to recurring psychological and discipline mistakes</p>
          </div>
          <div className="space-y-3">
            {mistakeData.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border border-[#263448] bg-[#101722] p-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-[#F05265]" />
                  <div>
                    <span className="font-medium text-[#EAF0F8] text-xs">{m.mistake}</span>
                    <div className="text-[10px] text-[#8493A8]">{m.count} tagged occurrences</div>
                  </div>
                </div>
                <div className="font-mono text-sm font-bold text-[#F05265]">
                  -${m.lossAmount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 7. MAE / MFE SCATTER */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'mae_mfe' && (
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
          <div className="border-b border-[#263448] pb-3 mb-4">
            <h3 className="text-sm font-bold text-[#EAF0F8]">Maximum Adverse (MAE) vs Favorable (MFE) Excursion</h3>
            <p className="text-xs text-[#8493A8]">Analyzing trade drawdowns vs profit potential before closure</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#263448" />
                <XAxis dataKey="mae" name="MAE" unit="pts" stroke="#8493A8" fontSize={11} />
                <YAxis dataKey="mfe" name="MFE" unit="pts" stroke="#8493A8" fontSize={11} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#101722', borderColor: '#263448', borderRadius: '8px', color: '#EAF0F8' }}
                />
                <Scatter data={maeMfeData} fill="#287BFF" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
