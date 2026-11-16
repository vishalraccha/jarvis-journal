import React, { useState, useMemo } from 'react'
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  DollarSign,
  TrendingUp,
  Percent,
} from 'lucide-react'
import { Trade } from '@/types/database'
import { computeDashboardMetrics } from '@/lib/calculations'
import { formatCurrency, formatPercent, formatR } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

interface ReportsViewProps {
  trades: Trade[]
}

type ReportType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'instrument'
  | 'strategy'
  | 'risk'
  | 'mistakes'
  | 'duration'

export const ReportsView: React.FC<ReportsViewProps> = ({ trades }) => {
  const { currency } = useAuth()
  const [selectedReport, setSelectedReport] = useState<ReportType>('monthly')

  const metrics = useMemo(() => computeDashboardMetrics(trades), [trades])

  const reportList: { id: ReportType; label: string }[] = [
    { id: 'monthly', label: 'Monthly Performance Report' },
    { id: 'daily', label: 'Daily Performance Report' },
    { id: 'weekly', label: 'Weekly Performance Report' },
    { id: 'instrument', label: 'Instrument / Symbol Report' },
    { id: 'strategy', label: 'Strategy Playbook Report' },
    { id: 'risk', label: 'Risk Management & Drawdown Report' },
    { id: 'mistakes', label: 'Trader Mistake Analysis Report' },
    { id: 'duration', label: 'Trade Duration & Holding Report' },
  ]

  // Grouping for reports
  const monthlyData = useMemo(() => {
    const map = new Map<string, Trade[]>()
    trades.forEach((t) => {
      const monthKey = t.open_time.slice(0, 7) // YYYY-MM
      const cur = map.get(monthKey) || []
      cur.push(t)
      map.set(monthKey, cur)
    })

    return Array.from(map.entries()).map(([month, monthTrades]) => ({
      month,
      metrics: computeDashboardMetrics(monthTrades),
      trades: monthTrades,
    })).sort((a, b) => b.month.localeCompare(a.month))
  }, [trades])

  const handlePrint = () => {
    window.print()
  }

  const handleExportReportCSV = () => {
    const headers = ['ReportType', 'Period', 'NetPnL', 'GrossPnL', 'WinRate', 'TotalTrades', 'ProfitFactor']
    const rows = monthlyData.map(m => [
      selectedReport,
      m.month,
      m.metrics.netPnl,
      m.metrics.grossPnl,
      m.metrics.winRate,
      m.metrics.totalTrades,
      m.metrics.profitFactor,
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `jarvis_report_${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#287BFF]/20 text-[#4095FF]">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#EAF0F8]">Executive Trading Reports</h2>
            <p className="text-xs text-[#8493A8]">Audit-ready statements, risk summaries, and performance breakdowns</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportReportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-[#263448] bg-[#101722] px-3 py-1.5 text-xs font-medium text-[#8493A8] hover:text-[#EAF0F8]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-[#263448] bg-[#101722] px-3 py-1.5 text-xs font-medium text-[#8493A8] hover:text-[#EAF0F8]"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#202838] bg-[#141A26] p-2 text-xs no-print">
        {reportList.map((rep) => (
          <button
            key={rep.id}
            onClick={() => setSelectedReport(rep.id)}
            style={{
              backgroundColor: selectedReport === rep.id ? 'var(--accent-color, #3B82F6)' : undefined,
            }}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              selectedReport === rep.id
                ? 'text-white shadow-sm font-semibold'
                : 'text-[#8493A8] hover:bg-[#10141E] hover:text-[#E2E8F0]'
            }`}
          >
            {rep.label}
          </button>
        ))}
      </div>

      {/* Report Document Presentation */}
      <div className="rounded-xl border border-[#202838] bg-[#141A26] p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-[#202838] pb-4">
          <div>
            <div className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--accent-color, #3B82F6)' }}>JARVIS JOURNAL STATEMENT</div>
            <h1 className="text-xl font-extrabold text-[#E2E8F0] mt-1 capitalize">
              {reportList.find(r => r.id === selectedReport)?.label}
            </h1>
            <p className="text-xs text-[#8493A8]">Generated on {new Date().toLocaleString()}</p>
          </div>
          <div className="text-right">
            <span className="font-mono text-2xl font-extrabold text-[#18C784]">
              {formatCurrency(metrics.netPnl, currency, true)}
            </span>
            <div className="text-xs text-[#8493A8] font-mono">Net Realized P&L</div>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border border-[#263448] bg-[#101722] p-3.5">
            <span className="text-[10px] uppercase font-bold text-[#8493A8]">Gross Realized P&L</span>
            <div className="mt-1 font-mono text-base font-bold text-[#EAF0F8]">
              {formatCurrency(metrics.grossPnl, currency)}
            </div>
          </div>
          <div className="rounded-lg border border-[#263448] bg-[#101722] p-3.5">
            <span className="text-[10px] uppercase font-bold text-[#8493A8]">Win Rate</span>
            <div className="mt-1 font-mono text-base font-bold text-[#18C784]">
              {formatPercent(metrics.winRate)}
            </div>
          </div>
          <div className="rounded-lg border border-[#263448] bg-[#101722] p-3.5">
            <span className="text-[10px] uppercase font-bold text-[#8493A8]">Profit Factor</span>
            <div className="mt-1 font-mono text-base font-bold text-[#EAF0F8]">
              {metrics.profitFactor}
            </div>
          </div>
          <div className="rounded-lg border border-[#263448] bg-[#101722] p-3.5">
            <span className="text-[10px] uppercase font-bold text-[#8493A8]">Total Trades</span>
            <div className="mt-1 font-mono text-base font-bold text-[#4095FF]">
              {metrics.totalTrades}
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="overflow-x-auto rounded-lg border border-[#263448]">
          <table className="w-full text-left text-xs font-tabular">
            <thead className="border-b border-[#263448] bg-[#101722] text-[#8493A8] uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Period / Category</th>
                <th className="py-3 px-3 text-right">Trades</th>
                <th className="py-3 px-3 text-right">Win Rate</th>
                <th className="py-3 px-3 text-right">Avg Win</th>
                <th className="py-3 px-3 text-right">Avg Loss</th>
                <th className="py-3 px-3 text-right">Profit Factor</th>
                <th className="py-3 px-4 text-right">Net P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263448] bg-[#151E2B]">
              {monthlyData.map((m) => {
                const isProfit = m.metrics.netPnl >= 0
                return (
                  <tr key={m.month} className="hover:bg-[#1A2536]">
                    <td className="py-3 px-4 font-mono font-bold text-[#EAF0F8]">{m.month}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#8493A8]">{m.metrics.totalTrades}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-[#18C784]">
                      {m.metrics.winRate}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#18C784]">
                      +${m.metrics.averageWin.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#F05265]">
                      -${m.metrics.averageLoss.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#EAF0F8]">{m.metrics.profitFactor}</td>
                    <td className={`py-3 px-4 text-right font-mono font-extrabold ${
                      isProfit ? 'text-[#18C784]' : 'text-[#F05265]'
                    }`}>
                      {formatCurrency(m.metrics.netPnl, currency, true)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
