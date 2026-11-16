import React, { useState, useMemo } from 'react'
import {
  Calendar,
  Layers,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Tag as TagIcon,
  Smile,
  Meh,
  Frown,
  Eye,
  SlidersHorizontal,
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
} from 'recharts'
import { Trade, TradeDirection } from '@/types/database'
import { formatCurrency, formatPercent, formatR, formatDate, formatDateTime } from '@/lib/utils'
import { computeDashboardMetrics } from '@/lib/calculations'
import { useAuth } from '@/context/AuthContext'

interface TradeLogViewProps {
  trades: Trade[]
  onOpenTradeDetail: (trade: Trade) => void
  onOpenAddTrade: () => void
  onOpenImportTrades: () => void
  onDeleteTrade: (id: string) => Promise<void>
}

type TradeLogSubView = 'day' | 'week' | 'all'

export const TradeLogView: React.FC<TradeLogViewProps> = ({
  trades,
  onOpenTradeDetail,
  onOpenAddTrade,
  onOpenImportTrades,
  onDeleteTrade,
}) => {
  const { currency } = useAuth()
  const [subView, setSubView] = useState<TradeLogSubView>('all')

  // Search, Filter & Sort State for ALL View
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDirection, setFilterDirection] = useState<'all' | 'long' | 'short'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all')
  const [sortField, setSortField] = useState<keyof Trade>('open_time')
  const [sortAsc, setSortAsc] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Expanded states for Day and Week views
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({})

  const toggleDayExpand = (dateKey: string) => {
    setExpandedDays(prev => ({ ...prev, [dateKey]: !prev[dateKey] }))
  }

  const toggleWeekExpand = (weekKey: string) => {
    setExpandedWeeks(prev => ({ ...prev, [weekKey]: !prev[weekKey] }))
  }

  // Filter & Sort Trades for ALL View
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchSearch = searchTerm === '' ||
        t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.strategy?.name && t.strategy.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.setup && t.setup.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchDir = filterDirection === 'all' || t.direction === filterDirection
      const matchStat = filterStatus === 'all' || t.status === filterStatus

      return matchSearch && matchDir && matchStat
    }).sort((a, b) => {
      let valA: any = a[sortField]
      let valB: any = b[sortField]

      if (sortField === 'open_time' || sortField === 'close_time') {
        valA = new Date(valA || 0).getTime()
        valB = new Date(valB || 0).getTime()
      }

      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })
  }, [trades, searchTerm, filterDirection, filterStatus, sortField, sortAsc])

  // Pagination
  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTrades.slice(start, start + pageSize)
  }, [filteredTrades, currentPage, pageSize])

  // Grouped by Day for DAY View
  const dayGroups = useMemo(() => {
    const groups = new Map<string, Trade[]>()
    trades.forEach((t) => {
      const dayKey = t.open_time.split('T')[0]
      const cur = groups.get(dayKey) || []
      cur.push(t)
      groups.set(dayKey, cur)
    })

    return Array.from(groups.entries())
      .map(([date, dayTrades]) => {
        const metrics = computeDashboardMetrics(dayTrades)
        return {
          date,
          trades: dayTrades,
          metrics,
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [trades])

  // Grouped by Week for WEEK View
  const weekGroups = useMemo(() => {
    const groups = new Map<string, Trade[]>()
    trades.forEach((t) => {
      const d = new Date(t.open_time)
      const dayOfWeek = d.getDay()
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // start on Monday
      const monday = new Date(d.setDate(diff))
      const weekKey = monday.toISOString().split('T')[0]

      const cur = groups.get(weekKey) || []
      cur.push(t)
      groups.set(weekKey, cur)
    })

    return Array.from(groups.entries())
      .map(([weekStart, weekTrades]) => {
        const metrics = computeDashboardMetrics(weekTrades)
        const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().split('T')[0]
        return {
          weekStart,
          weekEnd,
          trades: weekTrades,
          metrics,
        }
      })
      .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime())
  }, [trades])

  // Export to CSV function
  const handleExportCSV = () => {
    const headers = [
      'ID', 'Symbol', 'AssetClass', 'Direction', 'Status',
      'OpenTime', 'CloseTime', 'Quantity', 'EntryPrice', 'ExitPrice',
      'StopLoss', 'TakeProfit', 'GrossPnL', 'NetPnL', 'RMultiple', 'ROIPercent'
    ]
    const rows = filteredTrades.map(t => [
      t.id, t.symbol, t.asset_class, t.direction, t.status,
      t.open_time, t.close_time || '', t.quantity, t.entry_price, t.exit_price || '',
      t.stop_loss || '', t.take_profit || '', t.gross_pnl, t.net_pnl, t.r_multiple || '', t.roi_percentage
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `jarvis_trades_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSort = (field: keyof Trade) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Controls: Subview switcher, Search, Filters, CSV Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
        {/* View Switcher: DAY | WEEK | ALL */}
        <div className="flex items-center rounded-lg border border-[#263448] bg-[#101722] p-1">
          <button
            onClick={() => setSubView('day')}
            className={`rounded px-4 py-1.5 text-xs font-semibold transition-all ${
              subView === 'day'
                ? 'bg-[#287BFF] text-white shadow-sm'
                : 'text-[#8493A8] hover:text-[#EAF0F8]'
            }`}
          >
            DAY
          </button>
          <button
            onClick={() => setSubView('week')}
            className={`rounded px-4 py-1.5 text-xs font-semibold transition-all ${
              subView === 'week'
                ? 'bg-[#287BFF] text-white shadow-sm'
                : 'text-[#8493A8] hover:text-[#EAF0F8]'
            }`}
          >
            WEEK
          </button>
          <button
            onClick={() => setSubView('all')}
            className={`rounded px-4 py-1.5 text-xs font-semibold transition-all ${
              subView === 'all'
                ? 'bg-[#287BFF] text-white shadow-sm'
                : 'text-[#8493A8] hover:text-[#EAF0F8]'
            }`}
          >
            ALL
          </button>
        </div>

        {/* Action Buttons: Import, Export, Add Trade */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8493A8]" />
            <input
              type="text"
              placeholder="Search symbol, setup..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-lg border border-[#263448] bg-[#101722] pl-8 pr-3 py-1.5 text-xs text-[#EAF0F8] placeholder-[#8493A8] focus:border-[#287BFF] focus:outline-none w-44 sm:w-56"
            />
          </div>

          <button
            onClick={handleExportCSV}
            title="Export filtered trades to CSV"
            className="flex items-center gap-1.5 rounded-lg border border-[#263448] bg-[#101722] px-3 py-1.5 text-xs font-medium text-[#8493A8] hover:text-[#EAF0F8]"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>

          <button
            onClick={onOpenImportTrades}
            title="Import trades via CSV"
            className="flex items-center gap-1.5 rounded-lg border border-[#263448] bg-[#101722] px-3 py-1.5 text-xs font-medium text-[#8493A8] hover:text-[#EAF0F8]"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Import</span>
          </button>

          <button
            onClick={onOpenAddTrade}
            className="flex items-center gap-1.5 rounded-lg bg-[#287BFF] px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#287BFF]/20 hover:bg-[#4095FF]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Trade</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. ALL VIEW: Sortable, Filterable Trading Table */}
      {/* ------------------------------------------------------------- */}
      {subView === 'all' && (
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] shadow-lg overflow-hidden">
          {/* Table Filters Bar */}
          <div className="flex items-center justify-between border-b border-[#263448] px-4 py-2.5 text-xs text-[#8493A8]">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#EAF0F8]">Showing {filteredTrades.length} Trades</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px]">Dir:</span>
                <select
                  value={filterDirection}
                  onChange={(e) => setFilterDirection(e.target.value as any)}
                  className="rounded border border-[#263448] bg-[#101722] px-2 py-0.5 text-xs text-[#EAF0F8] focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px]">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="rounded border border-[#263448] bg-[#101722] px-2 py-0.5 text-xs text-[#EAF0F8] focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="closed">Closed</option>
                  <option value="open">Open</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#263448] bg-[#101722] text-[#8493A8] uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('open_time')}>
                    Date / Time
                  </th>
                  <th className="py-3 px-3 cursor-pointer" onClick={() => handleSort('symbol')}>
                    Symbol
                  </th>
                  <th className="py-3 px-3 cursor-pointer" onClick={() => handleSort('direction')}>
                    Side
                  </th>
                  <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort('quantity')}>
                    Qty
                  </th>
                  <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort('entry_price')}>
                    Entry
                  </th>
                  <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort('exit_price')}>
                    Exit
                  </th>
                  <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort('net_pnl')}>
                    Net P&L
                  </th>
                  <th className="py-3 px-3 text-right cursor-pointer" onClick={() => handleSort('r_multiple')}>
                    R-Mult
                  </th>
                  <th className="py-3 px-3 cursor-pointer" onClick={() => handleSort('strategy_id')}>
                    Strategy / Setup
                  </th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263448] bg-[#151E2B]/50 font-tabular">
                {paginatedTrades.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-xs text-[#8493A8]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Layers className="h-8 w-8 text-[#263448]" />
                        <span className="font-semibold text-[#EAF0F8]">No trades recorded yet</span>
                        <span className="text-[11px] text-[#8493A8]">Click "+ Add Trade" above to log your first trade or import your broker CSV</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTrades.map((t) => {
                  const isWin = t.net_pnl > 0
                  const isLoss = t.net_pnl < 0
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-[#1A2536] transition-colors cursor-pointer"
                      onClick={() => onOpenTradeDetail(t)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#EAF0F8]">{formatDate(t.open_time)}</div>
                        <div className="text-[10px] text-[#8493A8]">
                          {new Date(t.open_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-[#EAF0F8]">{t.symbol}</div>
                        <div className="text-[10px] text-[#8493A8] uppercase">{t.asset_class}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            t.direction === 'long'
                              ? 'bg-[#18C784]/15 text-[#18C784]'
                              : 'bg-[#F05265]/15 text-[#F05265]'
                          }`}
                        >
                          {t.direction === 'long' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {t.direction}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#EAF0F8]">
                        {t.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#EAF0F8]">
                        ${t.entry_price}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#EAF0F8]">
                        {t.exit_price ? `$${t.exit_price}` : <span className="text-[#4095FF]">Open</span>}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${
                        isWin ? 'text-[#18C784]' : isLoss ? 'text-[#F05265]' : 'text-[#8493A8]'
                      }`}>
                        {formatCurrency(t.net_pnl, currency, true)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-[#EAF0F8]">
                        {t.r_multiple ? formatR(t.r_multiple) : '-'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-xs font-medium text-[#EAF0F8] truncate max-w-[140px]">
                          {t.strategy?.name || t.setup || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenTradeDetail(t)}
                            title="View Trade Chart & Executions"
                            className="rounded p-1 text-[#8493A8] hover:text-[#4095FF]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete trade ${t.symbol} permanently?`)) {
                                await onDeleteTrade(t.id)
                              }
                            }}
                            title="Delete Trade"
                            className="rounded p-1 text-[#8493A8] hover:text-[#F05265]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-[#263448] px-4 py-3 text-xs text-[#8493A8]">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="rounded border border-[#263448] bg-[#101722] px-2.5 py-1 disabled:opacity-40 hover:text-[#EAF0F8]"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="rounded border border-[#263448] bg-[#101722] px-2.5 py-1 disabled:opacity-40 hover:text-[#EAF0F8]"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. DAY VIEW: Chronological Trading Days with Expandable List */}
      {/* ------------------------------------------------------------- */}
      {subView === 'day' && (
        <div className="space-y-4">
          {dayGroups.length === 0 ? (
            <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-12 text-center text-xs text-[#8493A8]">
              <div className="flex flex-col items-center justify-center gap-2">
                <Calendar className="h-8 w-8 text-[#263448]" />
                <span className="font-semibold text-[#EAF0F8]">No trading days found</span>
                <span className="text-[11px] text-[#8493A8]">Days will appear here chronologically as you record your executions</span>
              </div>
            </div>
          ) : (
            dayGroups.map((group) => {
            const isExpanded = Boolean(expandedDays[group.date])
            const isProfit = group.metrics.netPnl > 0
            const isLoss = group.metrics.netPnl < 0

            return (
              <div
                key={group.date}
                className="rounded-xl border border-[#263448] bg-[#151E2B] shadow-lg overflow-hidden transition-all"
              >
                {/* Day Summary Header */}
                <div
                  onClick={() => toggleDayExpand(group.date)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[#1A2536] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-[#8493A8]">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#EAF0F8]">{formatDate(group.date)}</h3>
                        <span className="rounded bg-[#101722] px-2 py-0.5 text-[10px] font-mono text-[#8493A8]">
                          {group.trades.length} {group.trades.length === 1 ? 'trade' : 'trades'}
                        </span>
                      </div>
                      <div className="text-xs text-[#8493A8] mt-0.5">
                        Win Rate: {formatPercent(group.metrics.winRate)} ({group.metrics.winningTrades}W / {group.metrics.losingTrades}L)
                      </div>
                    </div>
                  </div>

                  {/* Day P&L Badges */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className={`font-mono text-base font-extrabold ${
                        isProfit ? 'text-[#18C784]' : isLoss ? 'text-[#F05265]' : 'text-[#8493A8]'
                      }`}>
                        {formatCurrency(group.metrics.netPnl, currency, true)}
                      </div>
                      <div className="text-[10px] text-[#8493A8]">Profit Factor: {group.metrics.profitFactor}</div>
                    </div>
                  </div>
                </div>

                {/* Expanded Day Trades List */}
                {isExpanded && (
                  <div className="border-t border-[#263448] bg-[#101722]/60 p-4 space-y-2">
                    <div className="grid grid-cols-1 divide-y divide-[#263448]">
                      {group.trades.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => onOpenTradeDetail(t)}
                          className="flex items-center justify-between py-2.5 px-3 hover:bg-[#151E2B] rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`rounded p-1 ${t.direction === 'long' ? 'text-[#18C784]' : 'text-[#F05265]'}`}>
                              {t.direction === 'long' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#EAF0F8]">
                                <span>{t.symbol}</span>
                                <span className="text-[10px] text-[#8493A8] uppercase font-normal">{t.direction}</span>
                              </div>
                              <div className="text-[10px] text-[#8493A8]">
                                Entry: ${t.entry_price} • Exit: ${t.exit_price || '-'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`font-mono text-xs font-bold ${
                              t.net_pnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'
                            }`}>
                              {formatCurrency(t.net_pnl, currency, true)}
                            </div>
                            <div className="text-[10px] text-[#8493A8]">
                              {t.r_multiple ? formatR(t.r_multiple) : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          }))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. WEEK VIEW: Weekly Summaries & Tiles */}
      {/* ------------------------------------------------------------- */}
      {subView === 'week' && (
        <div className="space-y-4">
          {weekGroups.length === 0 ? (
            <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-12 text-center text-xs text-[#8493A8]">
              <div className="flex flex-col items-center justify-center gap-2">
                <Calendar className="h-8 w-8 text-[#263448]" />
                <span className="font-semibold text-[#EAF0F8]">No weekly records found</span>
                <span className="text-[11px] text-[#8493A8]">Weeks will appear here automatically as you log your trades</span>
              </div>
            </div>
          ) : (
            weekGroups.map((group) => {
            const isExpanded = Boolean(expandedWeeks[group.weekStart])
            const isProfit = group.metrics.netPnl > 0
            const isLoss = group.metrics.netPnl < 0

            return (
              <div
                key={group.weekStart}
                className="rounded-xl border border-[#263448] bg-[#151E2B] shadow-lg overflow-hidden"
              >
                {/* Week Header */}
                <div
                  onClick={() => toggleWeekExpand(group.weekStart)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[#1A2536] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-[#8493A8]">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div>
                      <h3 className="text-sm font-bold text-[#EAF0F8]">
                        Week of {formatDate(group.weekStart)} - {formatDate(group.weekEnd)}
                      </h3>
                      <div className="text-xs text-[#8493A8]">
                        {group.trades.length} Trades • Win Rate: {formatPercent(group.metrics.winRate)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-mono text-base font-extrabold ${
                      isProfit ? 'text-[#18C784]' : isLoss ? 'text-[#F05265]' : 'text-[#8493A8]'
                    }`}>
                      {formatCurrency(group.metrics.netPnl, currency, true)}
                    </div>
                    <div className="text-[10px] text-[#8493A8]">Profit Factor: {group.metrics.profitFactor}</div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#263448] bg-[#101722]/60 p-4">
                    <div className="grid grid-cols-1 divide-y divide-[#263448]">
                      {group.trades.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => onOpenTradeDetail(t)}
                          className="flex items-center justify-between py-2 px-3 hover:bg-[#151E2B] rounded cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#EAF0F8]">{t.symbol}</span>
                            <span className="text-[10px] uppercase text-[#8493A8]">{t.direction}</span>
                            <span className="text-[10px] text-[#8493A8]">({formatDate(t.open_time)})</span>
                          </div>
                          <div className={`font-mono text-xs font-bold ${
                            t.net_pnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'
                          }`}>
                            {formatCurrency(t.net_pnl, currency, true)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          }))}
        </div>
      )}
    </div>
  )
}
