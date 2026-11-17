import React, { useState } from 'react'
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Shield,
  Layers,
  Award,
  ArrowUpRight,
  TrendingUp,
  X,
  AlertCircle,
} from 'lucide-react'
import { Strategy, Trade } from '@/types/database'
import { api } from '@/services/api'
import { computeDashboardMetrics } from '@/lib/calculations'
import { formatCurrency, formatPercent, formatR } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

interface StrategiesViewProps {
  strategies: Strategy[]
  trades: Trade[]
  onRefresh: () => void
}

export const StrategiesView: React.FC<StrategiesViewProps> = ({
  strategies,
  trades,
  onRefresh,
}) => {
  const { currency } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [entryConditions, setEntryConditions] = useState('')
  const [exitConditions, setExitConditions] = useState('')
  const [stopLossRules, setStopLossRules] = useState('')
  const [takeProfitRules, setTakeProfitRules] = useState('')
  const [color, setColor] = useState('#287BFF')

  const openCreateModal = () => {
    setEditingStrategy(null)
    setSaveError(null)
    setName('')
    setDescription('')
    setEntryConditions('')
    setExitConditions('')
    setStopLossRules('')
    setTakeProfitRules('')
    setColor('#287BFF')
    setIsModalOpen(true)
  }

  const openEditModal = (strat: Strategy) => {
    setEditingStrategy(strat)
    setSaveError(null)
    setName(strat.name)
    setDescription(strat.description || '')
    setEntryConditions(strat.entry_conditions || '')
    setExitConditions(strat.exit_conditions || '')
    setStopLossRules(strat.stop_loss_rules || '')
    setTakeProfitRules(strat.take_profit_rules || '')
    setColor(strat.color || '#287BFF')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    setSaveError(null)

    try {
      if (editingStrategy) {
        await api.updateStrategy(editingStrategy.id, {
          name,
          description,
          entry_conditions: entryConditions,
          exit_conditions: exitConditions,
          stop_loss_rules: stopLossRules,
          take_profit_rules: takeProfitRules,
          color,
        })
      } else {
        await api.createStrategy({
          user_id: 'user-jarvis-1',
          name,
          description,
          entry_conditions: entryConditions,
          exit_conditions: exitConditions,
          stop_loss_rules: stopLossRules,
          take_profit_rules: takeProfitRules,
          color,
          is_active: true,
        })
      }

      setIsModalOpen(false)
      onRefresh()
    } catch (err: any) {
      console.error('Error saving strategy:', err)
      setSaveError(err.message || 'Error saving strategy.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, stratName: string) => {
    if (confirm(`Delete playbook strategy "${stratName}" permanently?`)) {
      await api.deleteStrategy(id)
      onRefresh()
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#202838] bg-[#141A26] p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: 'var(--accent-muted, rgba(59,130,246,0.15))',
              color: 'var(--accent-color, #3B82F6)',
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg"
          >
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E2E8F0]">Playbook Strategies & Setups</h2>
            <p className="text-xs text-[#8493A8]">Define edge rules, entry/exit criteria, and evaluate statistical viability</p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Strategy</span>
        </button>
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {strategies.map((strat) => {
          const stratTrades = trades.filter(t => t.strategy_id === strat.id || t.setup === strat.name)
          const metrics = computeDashboardMetrics(stratTrades)
          const isProfit = metrics.netPnl >= 0

          return (
            <div
              key={strat.id}
              className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#263448] pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: strat.color || '#287BFF' }}
                    />
                    <h3 className="text-sm font-bold text-[#EAF0F8]">{strat.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(strat)}
                      className="rounded p-1 text-[#8493A8] hover:text-[#4095FF]"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(strat.id, strat.name)}
                      className="rounded p-1 text-[#8493A8] hover:text-[#F05265]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#8493A8] mb-4">
                  {strat.description || 'No description added.'}
                </p>

                {/* Strategy Rules Breakdown */}
                <div className="space-y-2 mb-4 text-xs">
                  {strat.entry_conditions && (
                    <div className="rounded-lg border border-[#263448] bg-[#101722] p-2.5">
                      <span className="font-semibold text-[#18C784]">Entry Signal:</span>
                      <p className="text-[#8493A8] mt-0.5">{strat.entry_conditions}</p>
                    </div>
                  )}
                  {strat.exit_conditions && (
                    <div className="rounded-lg border border-[#263448] bg-[#101722] p-2.5">
                      <span className="font-semibold text-[#4095FF]">Exit / Target:</span>
                      <p className="text-[#8493A8] mt-0.5">{strat.exit_conditions}</p>
                    </div>
                  )}
                  {strat.stop_loss_rules && (
                    <div className="rounded-lg border border-[#263448] bg-[#101722] p-2.5">
                      <span className="font-semibold text-[#F05265]">Risk / SL Rules:</span>
                      <p className="text-[#8493A8] mt-0.5">{strat.stop_loss_rules}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-4 gap-2 rounded-lg border border-[#263448] bg-[#101722] p-3 text-center">
                <div>
                  <div className="text-[10px] text-[#8493A8]">Trades</div>
                  <div className="font-mono text-xs font-bold text-[#EAF0F8]">{metrics.totalTrades}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8493A8]">Win Rate</div>
                  <div className="font-mono text-xs font-bold text-[#18C784]">{formatPercent(metrics.winRate)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8493A8]">Profit Factor</div>
                  <div className="font-mono text-xs font-bold text-[#EAF0F8]">{metrics.profitFactor}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8493A8]">Net P&L</div>
                  <div className={`font-mono text-xs font-bold ${isProfit ? 'text-[#18C784]' : 'text-[#F05265]'}`}>
                    {formatCurrency(metrics.netPnl, currency, true)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Strategy Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-xl border border-[#263448] bg-[#090D14] shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between border-b border-[#263448] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#EAF0F8]">
                {editingStrategy ? 'Edit Strategy Playbook' : 'Create Playbook Strategy'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-[#8493A8] hover:bg-[#151E2B] hover:text-[#EAF0F8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {saveError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F05265]/40 bg-[#F05265]/10 p-3 text-xs text-[#F05265]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error: </span>
                  <span>{saveError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8493A8] mb-1">Strategy Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Opening Range Breakout (ORB)"
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8493A8] mb-1">Description / Core Concept</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of market context, session, and rationale"
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8493A8] mb-1">Entry Criteria</label>
                <textarea
                  rows={2}
                  value={entryConditions}
                  onChange={(e) => setEntryConditions(e.target.value)}
                  placeholder="Exact trigger (e.g. 5m candle close above 15m range with volume confirmation)"
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8493A8] mb-1">Exit / Take Profit Rules</label>
                <textarea
                  rows={2}
                  value={exitConditions}
                  onChange={(e) => setExitConditions(e.target.value)}
                  placeholder="e.g. 2R target or opposing key liquidity pool"
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8493A8] mb-1">Stop Loss & Risk Management</label>
                <textarea
                  rows={2}
                  value={stopLossRules}
                  onChange={(e) => setStopLossRules(e.target.value)}
                  placeholder="e.g. Midpoint of breakout candle, max 1.5% capital risk"
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#263448]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-[#202838] bg-[#141A26] px-4 py-2 text-xs text-[#8493A8] hover:text-[#E2E8F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingStrategy ? 'Update Strategy' : 'Create Strategy'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
