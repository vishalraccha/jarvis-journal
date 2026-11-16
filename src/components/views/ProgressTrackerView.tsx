import React, { useMemo } from 'react'
import {
  ShieldCheck,
  Flame,
  Award,
  CheckCircle2,
  Calendar,
  Activity,
  TrendingUp,
} from 'lucide-react'
import { formatPercent } from '@/lib/utils'

export const ProgressTrackerView: React.FC = () => {
  // Generate sample historical 60-day discipline streak for the progress heatmap
  const historicalDays = useMemo(() => {
    const list = []
    const today = new Date()
    for (let i = 59; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dayOfWeek = d.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const score = isWeekend ? 0 : Math.floor(Math.random() * 40 + 60) // 60% to 100% on trading days
      list.push({
        date: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        isWeekend,
        score,
      })
    }
    return list
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#287BFF]/20 text-[#4095FF]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#EAF0F8]">Trader Discipline & Habit Tracker</h2>
            <p className="text-xs text-[#8493A8]">Consistency metrics, routine streaks, and process compliance</p>
          </div>
        </div>
      </div>

      {/* Top Discipline KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Discipline Score</span>
            <Award className="h-4 w-4 text-[#18C784]" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#18C784]">
            92.4%
          </div>
          <p className="mt-1 text-xs text-[#8493A8]">Based on 60 days checklist follow-through</p>
        </div>

        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Current Streak</span>
            <Flame className="h-4 w-4 text-[#EAB308]" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#EAF0F8]">
            14 Days
          </div>
          <p className="mt-1 text-xs text-[#8493A8]">Consecutive daily routines completed</p>
        </div>

        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Weekly Consistency</span>
            <Activity className="h-4 w-4 text-[#4095FF]" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#4095FF]">
            96.0%
          </div>
          <p className="mt-1 text-xs text-[#8493A8]">5 of 5 market days fully prepped</p>
        </div>

        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
          <div className="flex items-center justify-between text-[#8493A8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Monthly Compliance</span>
            <Calendar className="h-4 w-4 text-[#287BFF]" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-[#EAF0F8]">
            89.5%
          </div>
          <p className="mt-1 text-xs text-[#8493A8]">Process fidelity rating</p>
        </div>
      </div>

      {/* Historical Discipline Heatmap (GitHub style) */}
      <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg">
        <div className="border-b border-[#263448] pb-3 mb-4">
          <h3 className="text-sm font-bold text-[#EAF0F8]">60-Day Discipline Consistency Heatmap</h3>
          <p className="text-xs text-[#8493A8]">Darker green tiles indicate higher percentage of completed checklist protocols</p>
        </div>

        <div className="flex flex-wrap gap-1.5 p-2 bg-[#101722] rounded-lg border border-[#263448]">
          {historicalDays.map((d, idx) => {
            const bgClass = d.isWeekend
              ? 'bg-[#151E2B]/40 border-transparent opacity-40'
              : d.score >= 90
              ? 'bg-[#18C784] border-[#18C784]'
              : d.score >= 75
              ? 'bg-[#18C784]/60 border-[#18C784]/60'
              : 'bg-[#EAB308]/60 border-[#EAB308]/60'

            return (
              <div
                key={idx}
                title={`${d.date}: ${d.isWeekend ? 'Weekend' : `${d.score}% Discipline`}`}
                className={`h-6 w-6 rounded border transition-transform hover:scale-110 flex items-center justify-center font-mono text-[9px] ${bgClass}`}
              >
                {!d.isWeekend && <span className="text-black font-bold">{d.dayNum}</span>}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-[#8493A8]">
          <span>Past 60 Days Trading Protocol Adherence</span>
          <div className="flex items-center gap-2">
            <span>Lower</span>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-[#101722] border border-[#263448]" />
              <span className="h-3 w-3 rounded bg-[#EAB308]/60" />
              <span className="h-3 w-3 rounded bg-[#18C784]/60" />
              <span className="h-3 w-3 rounded bg-[#18C784]" />
            </div>
            <span>Higher</span>
          </div>
        </div>
      </div>
    </div>
  )
}
