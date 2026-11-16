import React, { useState, useEffect } from 'react'
import {
  CheckSquare,
  Square,
  Clock,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Award,
} from 'lucide-react'
import { Routine } from '@/types/database'
import { api } from '@/services/api'

export const RoutinesView: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  const loadRoutines = async () => {
    const list = await api.getRoutines(selectedDate)
    setRoutines(list)
  }

  useEffect(() => {
    loadRoutines()
  }, [selectedDate])

  const handleToggle = async (routineId: string, itemId: string, currentState: boolean) => {
    const nextState = !currentState
    // Optimistic update
    setRoutines(prev =>
      prev.map(r => {
        if (r.id !== routineId) return r
        return {
          ...r,
          items: r.items.map(it => (it.id === itemId ? { ...it, is_completed: nextState } : it)),
        }
      })
    )
    await api.toggleRoutineItem(itemId, routineId, selectedDate, nextState)
  }

  // Calculate overall discipline score for today
  let totalItems = 0
  let completedItems = 0
  routines.forEach(r => {
    r.items.forEach(it => {
      totalItems++
      if (it.is_completed) completedItems++
    })
  })
  const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#202838] bg-[#141A26] p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: 'var(--accent-muted, rgba(59,130,246,0.15))',
              color: 'var(--accent-color, #3B82F6)',
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg"
          >
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E2E8F0]">Daily Trading Routines & Checklists</h2>
            <p className="text-xs text-[#8493A8]">Pre-market, execution, and post-market discipline protocols</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#202838] bg-[#10141E] px-3 py-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--accent-color, #3B82F6)' }} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-mono text-xs text-[#E2E8F0] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[#263448] bg-[#101722] px-3 py-1.5 text-xs font-mono font-bold">
            <span className="text-[#8493A8]">Discipline:</span>
            <span className={completionPercent >= 80 ? 'text-[#18C784]' : 'text-[#EAB308]'}>
              {completionPercent}% ({completedItems}/{totalItems})
            </span>
          </div>
        </div>
      </div>

      {/* Routine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {routines.map((routine) => {
          const routineCompleted = routine.items.filter(i => i.is_completed).length
          const routineTotal = routine.items.length
          const isAllDone = routineTotal > 0 && routineCompleted === routineTotal

          return (
            <div
              key={routine.id}
              className={`rounded-xl border p-5 shadow-lg flex flex-col justify-between transition-all ${
                isAllDone
                  ? 'border-[#18C784]/40 bg-[#151E2B]'
                  : 'border-[#263448] bg-[#151E2B]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#263448] pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#EAF0F8]">{routine.title}</h3>
                    <p className="text-[11px] text-[#8493A8]">{routine.description}</p>
                  </div>
                  <span className={`font-mono text-xs font-bold ${isAllDone ? 'text-[#18C784]' : 'text-[#4095FF]'}`}>
                    {routineCompleted}/{routineTotal}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-2.5">
                  {routine.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggle(routine.id, item.id, Boolean(item.is_completed))}
                      className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-all cursor-pointer ${
                        item.is_completed
                          ? 'border-[#18C784]/30 bg-[#18C784]/10 text-[#EAF0F8]'
                          : 'border-[#263448] bg-[#101722] text-[#8493A8] hover:text-[#EAF0F8]'
                      }`}
                    >
                      <button className="mt-0.5 shrink-0 text-[#287BFF]">
                        {item.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-[#18C784]" />
                        ) : (
                          <Square className="h-4 w-4 text-[#8493A8]" />
                        )}
                      </button>
                      <span className={item.is_completed ? 'line-through text-[#8493A8]' : ''}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
