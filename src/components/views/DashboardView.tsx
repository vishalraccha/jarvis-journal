import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Activity,
  Award,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  PieChart as PieChartIcon,
  ShieldAlert,
  Flame,
  Info,
  Plus,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Trade } from '@/types/database'
import { computeDashboardMetrics } from '@/lib/calculations'
import { formatCurrency, formatPercent, formatR } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useFilter } from '@/context/FilterContext'

interface DashboardViewProps {
  trades: Trade[]
  onOpenTradeDetail: (trade: Trade) => void
  onOpenDayJournal: (dateStr: string) => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trades,
  onOpenTradeDetail,
  onOpenDayJournal,
}) => {
  const { currency } = useAuth()
  const { timeRange } = useFilter()

  // State for performance calendar navigation
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())

  // Compute metrics based strictly on user entered real trades
  const metrics = useMemo(() => computeDashboardMetrics(trades), [trades])

  // Process data for charts
  const cumulativePnlData = useMemo(() => {
    const sorted = [...trades]
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(a.open_time).getTime() - new Date(b.open_time).getTime())

    let runningNet = 0
    let runningGross = 0

    return sorted.map((t, idx) => {
      runningNet += t.net_pnl || 0
      runningGross += t.gross_pnl || 0
      const dateLabel = new Date(t.open_time).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
      })
      return {
        tradeIndex: idx + 1,
        date: dateLabel,
        netPnl: Math.round(runningNet * 100) / 100,
        grossPnl: Math.round(runningGross * 100) / 100,
      }
    })
  }, [trades])

  const dailyPnlData = useMemo(() => {
    const map = new Map<string, number>()
    const sorted = [...trades]
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(a.open_time).getTime() - new Date(b.open_time).getTime())

    sorted.forEach((t) => {
      const dateKey = t.open_time.split('T')[0]
      const current = map.get(dateKey) || 0
      map.set(dateKey, current + (t.net_pnl || 0))
    })

    return Array.from(map.entries()).map(([date, pnl]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pnl: Math.round(pnl * 100) / 100,
    }))
  }, [trades])

  const instrumentPerformanceData = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number }>()
    trades.forEach((t) => {
      const sym = t.symbol
      const existing = map.get(sym) || { pnl: 0, count: 0 }
      map.set(sym, {
        pnl: existing.pnl + (t.net_pnl || 0),
        count: existing.count + 1,
      })
    })

    return Array.from(map.entries())
      .map(([symbol, data]) => ({
        symbol,
        pnl: Math.round(data.pnl * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 6)
  }, [trades])

  const weekdayData = useMemo(() => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayStats = weekdays.map((name) => ({ name, pnl: 0, trades: 0 }))

    trades.forEach((t) => {
      const d = new Date(t.open_time).getDay()
      dayStats[d].pnl += t.net_pnl || 0
      dayStats[d].trades += 1
    })

    return dayStats.filter((_, idx) => idx >= 1 && idx <= 5) // Mon - Fri
  }, [trades])

  // Calendar Day Computations
  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0 is Sun

  const calendarDaysData = useMemo(() => {
    const daysMap = new Map<number, { pnl: number; trades: number; winning: number; losing: number }>()

    trades.forEach((t) => {
      const tDate = new Date(t.open_time)
      if (tDate.getFullYear() === year && tDate.getMonth() === month) {
        const d = tDate.getDate()
        const cur = daysMap.get(d) || { pnl: 0, trades: 0, winning: 0, losing: 0 }
        const net = t.net_pnl || 0
        cur.pnl += net
        cur.trades += 1
        if (net > 0) cur.winning += 1
        else if (net < 0) cur.losing += 1
        daysMap.set(d, cur)
      }
    })

    return daysMap
  }, [trades, year, month])

  // Calendar Month Summary Statistics
  const monthSummary = useMemo(() => {
    let totalPnl = 0
    let totalTrades = 0
    let winningDays = 0
    let losingDays = 0

    calendarDaysData.forEach((day) => {
      totalPnl += day.pnl
      totalTrades += day.trades
      if (day.pnl > 0) winningDays++
      else if (day.pnl < 0) losingDays++
    })

    return {
      totalPnl: Math.round(totalPnl * 100) / 100,
      totalTrades,
      winningDays,
      losingDays,
    }
  }, [calendarDaysData])

  const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1))
  const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1))

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. TOP 10 KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Net P&L */}
        <div className={`rounded-xl border border-[#263448] bg-[#151E2B] p-4 transition-all ${
          metrics.netPnl >= 0 ? 'hover:border-[#18C784]/40' : 'hover:border-[#F05265]/40'
        }`}>
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Net P&L</span>
            {metrics.netPnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-[#18C784]" />
            ) : (
              <TrendingDown className="h-4 w-4 text-[#F05265]" />
            )}
          </div>
          <div className={`mt-2 font-mono text-xl font-extrabold ${
            metrics.netPnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'
          }`}>
            {formatCurrency(metrics.netPnl, currency, true)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#8493A8]">
            <span>Gross: {formatCurrency(metrics.grossPnl, currency)}</span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="rounded-xl border border-[#202838] bg-[#141A26] p-4 hover:border-[var(--accent-color)]/40 transition-all">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Win Rate</span>
            <Percent className="h-4 w-4" style={{ color: 'var(--accent-color, #3B82F6)' }} />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#E2E8F0]">
            {formatPercent(metrics.winRate)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#8493A8]">
            <span className="text-[#18C784] font-semibold">{metrics.winningTrades}W</span>
            <span>-</span>
            <span className="text-[#F05265] font-semibold">{metrics.losingTrades}L</span>
            <span>• {metrics.totalTrades} total</span>
          </div>
        </div>

        {/* Profit Factor */}
        <div className="rounded-xl border border-[#202838] bg-[#141A26] p-4 hover:border-[var(--accent-color)]/40 transition-all">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Profit Factor</span>
            <Activity className="h-4 w-4" style={{ color: 'var(--accent-color, #3B82F6)' }} />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#E2E8F0]">
            {metrics.profitFactor.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-[#8493A8]">
            {metrics.totalTrades === 0 ? 'No closed trades' : metrics.profitFactor >= 2 ? 'Excellent Edge' : 'Active'}
          </div>
        </div>

        {/* Expectancy */}
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 hover:border-[#287BFF]/40 transition-all">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Expectancy</span>
            <Award className="h-4 w-4 text-[#18C784]" />
          </div>
          <div className={`mt-2 font-mono text-xl font-extrabold ${
            metrics.expectancy >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'
          }`}>
            {formatCurrency(metrics.expectancy, currency, true)}
          </div>
          <div className="mt-1 text-[11px] text-[#8493A8]">
            Per executed trade
          </div>
        </div>

        {/* Average R-Multiple */}
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 hover:border-[#287BFF]/40 transition-all">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Avg R-Multiple</span>
            <TrendingUp className="h-4 w-4 text-[#4095FF]" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#EAF0F8]">
            {formatR(metrics.averageR)}
          </div>
          <div className="mt-1 text-[11px] text-[#8493A8]">
            Realized return on risk
          </div>
        </div>

        {/* Average Win */}
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 hover:border-[#18C784]/40 transition-all">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Average Win</span>
            <ArrowUpRight className="h-4 w-4 text-[#18C784]" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#18C784]">
            +{formatCurrency(metrics.averageWin, currency)}
          </div>
          <div className="mt-1 text-[11px] text-[#8493A8]">
            Across {metrics.winningTrades} wins
          </div>
        </div>

        {/* Average Loss */}
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 hover:border-[#F05265]/40 transition-all">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Average Loss</span>
            <ArrowDownRight className="h-4 w-4 text-[#F05265]" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#F05265]">
            -{formatCurrency(metrics.averageLoss, currency)}
          </div>
          <div className="mt-1 text-[11px] text-[#8493A8]">
            Across {metrics.losingTrades} losses
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 hover:border-[#F05265]/40 transition-all">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Max Drawdown</span>
            <ShieldAlert className="h-4 w-4 text-[#F05265]" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#F05265]">
            -{formatCurrency(metrics.maxDrawdown, currency)}
          </div>
          <div className="mt-1 text-[11px] text-[#8493A8]">
            Peak equity drop
          </div>
        </div>

        {/* Max Consecutive Streaks */}
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 hover:border-[#287BFF]/40 transition-all">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Best Win Streak</span>
            <Flame className="h-4 w-4 text-[#EAB308]" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#EAF0F8]">
            {metrics.consecutiveWins} Wins
          </div>
          <div className="mt-1 text-[11px] text-[#8493A8]">
            Max loss streak: {metrics.consecutiveLosses}
          </div>
        </div>

        {/* Long vs Short Ratio */}
        <div className="rounded-xl border border-[#202838] bg-[#141A26] p-4 hover:border-[var(--accent-color)]/40 transition-all">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Directional Edge</span>
            <BarChart2 className="h-4 w-4" style={{ color: 'var(--accent-color, #3B82F6)' }} />
          </div>
          <div className="mt-2 font-mono text-base font-bold text-[#E2E8F0]">
            L: {metrics.longWinRate.toFixed(0)}% / S: {metrics.shortWinRate.toFixed(0)}%
          </div>
          <div className="mt-1 text-[11px] text-[#8493A8]">
            {metrics.longTrades} Long • {metrics.shortTrades} Short
          </div>
        </div>
      </div>

      {/* 2. PERFORMANCE CALENDAR */}
      <div className="rounded-xl border border-[#202838] bg-[#141A26] p-5 shadow-lg">
        {/* Calendar Header with Monthly Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#202838] pb-4">
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: 'var(--accent-muted, rgba(59,130,246,0.15))',
                color: 'var(--accent-color, #3B82F6)',
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg"
            >
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#EAF0F8]">Performance Calendar</h2>
              <p className="text-xs text-[#8493A8]">Click any date to view executions or write a 10-step Day Journal</p>
            </div>
          </div>

          {/* Month Navigator & Summary Badges */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-sm font-bold ${
                monthSummary.totalPnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'
              }`}>
                {formatCurrency(monthSummary.totalPnl, currency, true)}
              </span>
              <span className="rounded bg-[#101722] px-2 py-0.5 text-xs font-mono text-[#8493A8]">
                {monthSummary.winningDays}W - {monthSummary.losingDays}L ({monthSummary.totalTrades} Trades)
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-[#263448] bg-[#101722] p-1">
              <button
                onClick={prevMonth}
                className="rounded p-1 text-[#8493A8] hover:bg-[#151E2B] hover:text-[#EAF0F8]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-mono text-xs font-semibold text-[#EAF0F8]">
                {calendarDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={nextMonth}
                className="rounded p-1 text-[#8493A8] hover:bg-[#151E2B] hover:text-[#EAF0F8]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="mt-4">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#8493A8] uppercase tracking-wider pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Day Tiles */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-20 rounded-lg border border-transparent bg-transparent" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const dayData = calendarDaysData.get(dayNum)
              const hasTrades = Boolean(dayData && dayData.trades > 0)
              const isProfit = dayData && dayData.pnl > 0
              const isLoss = dayData && dayData.pnl < 0
              const formattedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

              return (
                <div
                  key={dayNum}
                  onClick={() => onOpenDayJournal(formattedDateStr)}
                  className={`group relative flex h-20 flex-col justify-between rounded-lg border p-2 transition-all cursor-pointer ${
                    hasTrades
                      ? isProfit
                        ? 'border-[#18C784]/30 bg-[#18C784]/10 hover:border-[#18C784] hover:bg-[#18C784]/15'
                        : isLoss
                        ? 'border-[#F05265]/30 bg-[#F05265]/10 hover:border-[#F05265] hover:bg-[#F05265]/15'
                        : 'border-[#263448] bg-[#101722] hover:border-[#4095FF]'
                      : 'border-[#263448]/50 bg-[#101722]/50 hover:border-[#263448]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#8493A8] group-hover:text-[#EAF0F8]">
                      {dayNum}
                    </span>
                    {hasTrades && (
                      <span className="rounded bg-[#090D14]/60 px-1.5 py-0.2 font-mono text-[9px] text-[#8493A8]">
                        {dayData?.trades} {dayData?.trades === 1 ? 'trade' : 'trades'}
                      </span>
                    )}
                  </div>

                  {hasTrades && (
                    <div className="text-right">
                      <div
                        className={`font-mono text-xs font-extrabold ${
                          isProfit ? 'text-[#18C784]' : isLoss ? 'text-[#F05265]' : 'text-[#8493A8]'
                        }`}
                      >
                        {formatCurrency(dayData?.pnl, currency, true)}
                      </div>
                      <div className="text-[9px] font-mono text-[#8493A8]">
                        {dayData?.winning}W / {dayData?.losing}L
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 3. PERFORMANCE CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative P&L Curve */}
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#263448] pb-3 mb-4">
            <h3 className="text-sm font-bold text-[#EAF0F8]">Cumulative P&L Curve</h3>
            <span className="font-mono text-xs font-semibold text-[#18C784]">
              {formatCurrency(metrics.netPnl, currency, true)}
            </span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {cumulativePnlData.length === 0 ? (
              <span className="text-xs text-[#8493A8]">No closed trades recorded yet in this time period.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativePnlData}>
                  <defs>
                    <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-color, #3B82F6)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--accent-color, #3B82F6)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#202838" vertical={false} />
                  <XAxis dataKey="tradeIndex" stroke="#8493A8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8493A8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#10141E', borderColor: '#202838', borderRadius: '8px', color: '#E2E8F0' }}
                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Net Cumulative P&L']}
                  />
                  <Area type="monotone" dataKey="netPnl" stroke="var(--accent-color, #3B82F6)" strokeWidth={2.5} fillOpacity={1} fill="url(#pnlGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Daily P&L Histogram */}
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#263448] pb-3 mb-4">
            <h3 className="text-sm font-bold text-[#EAF0F8]">Daily P&L Distribution</h3>
            <span className="text-xs text-[#8493A8]">Net profit / loss per active day</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {dailyPnlData.length === 0 ? (
              <span className="text-xs text-[#8493A8]">No daily profit/loss entries recorded yet.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnlData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263448" vertical={false} />
                  <XAxis dataKey="date" stroke="#8493A8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#8493A8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101722', borderColor: '#263448', borderRadius: '8px', color: '#EAF0F8' }}
                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Net Day P&L']}
                  />
                  <Bar dataKey="pnl">
                    {dailyPnlData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#18C784' : '#F05265'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Performance by Instrument */}
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#263448] pb-3 mb-4">
            <h3 className="text-sm font-bold text-[#EAF0F8]">Performance by Instrument</h3>
            <span className="text-xs text-[#8493A8]">Top symbols by Net P&L</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {instrumentPerformanceData.length === 0 ? (
              <span className="text-xs text-[#8493A8]">No instrument execution data yet.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={instrumentPerformanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#263448" horizontal={false} />
                  <XAxis type="number" stroke="#8493A8" fontSize={11} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="symbol" stroke="#8493A8" fontSize={11} tickLine={false} width={70} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101722', borderColor: '#263448', borderRadius: '8px', color: '#EAF0F8' }}
                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Net P&L']}
                  />
                  <Bar dataKey="pnl">
                    {instrumentPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#18C784' : '#F05265'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Performance by Weekday */}
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#263448] pb-3 mb-4">
            <h3 className="text-sm font-bold text-[#EAF0F8]">Performance by Weekday</h3>
            <span className="text-xs text-[#8493A8]">Monday through Friday edge</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {trades.length === 0 ? (
              <span className="text-xs text-[#8493A8]">No weekday executions recorded yet.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263448" vertical={false} />
                  <XAxis dataKey="name" stroke="#8493A8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8493A8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101722', borderColor: '#263448', borderRadius: '8px', color: '#EAF0F8' }}
                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'P&L']}
                  />
                  <Bar dataKey="pnl">
                    {weekdayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#287BFF' : '#F05265'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
