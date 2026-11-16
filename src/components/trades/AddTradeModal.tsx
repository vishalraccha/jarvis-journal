import React, { useState, useEffect } from 'react'
import { X, Calculator, ArrowUpRight, ArrowDownRight, Tag as TagIcon, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/services/api'
import { Strategy, Instrument, TradeDirection, TradeStatus, AssetClass } from '@/types/database'
import { calculateTradePnl } from '@/lib/calculations'
import { formatCurrency, formatPercent, formatR } from '@/lib/utils'

interface AddTradeModalProps {
  isOpen: boolean
  onClose: () => void
  onTradeAdded: () => void
}

export const AddTradeModal: React.FC<AddTradeModalProps> = ({
  isOpen,
  onClose,
  onTradeAdded,
}) => {
  const { accounts, activeAccount, currency } = useAuth()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [instruments, setInstruments] = useState<Instrument[]>([])

  const [accountId, setAccountId] = useState<string>('')
  const [symbol, setSymbol] = useState<string>('NQ')
  const [assetClass, setAssetClass] = useState<AssetClass>('futures')
  const [direction, setDirection] = useState<TradeDirection>('long')
  const [status, setStatus] = useState<TradeStatus>('closed')
  const [openTime, setOpenTime] = useState<string>(new Date().toISOString().slice(0, 16))
  const [closeTime, setCloseTime] = useState<string>(new Date().toISOString().slice(0, 16))
  const [quantity, setQuantity] = useState<number>(1)
  const [entryPrice, setEntryPrice] = useState<number>(20800)
  const [exitPrice, setExitPrice] = useState<number>(20880)
  const [stopLoss, setStopLoss] = useState<number>(20750)
  const [takeProfit, setTakeProfit] = useState<number>(20900)
  const [commission, setCommission] = useState<number>(4.5)
  const [fees, setFees] = useState<number>(1.0)
  const [strategyId, setStrategyId] = useState<string>('')
  const [setup, setSetup] = useState<string>('Opening Range Breakout')
  const [emotionalState, setEmotionalState] = useState<string>('Calm and Disciplined')
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([])
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (activeAccount) {
      setAccountId(activeAccount.id)
    } else if (accounts.length > 0) {
      setAccountId(accounts[0].id)
    }
    api.getStrategies().then(setStrategies)
    api.getInstruments().then(setInstruments)
  }, [activeAccount, accounts, isOpen])

  // Real-time P&L calculation
  const matchedInstrument = instruments.find(i => i.symbol.toUpperCase() === symbol.toUpperCase())
  const preview = calculateTradePnl({
    direction,
    entryPrice: Number(entryPrice),
    exitPrice: status === 'closed' ? Number(exitPrice) : null,
    quantity: Number(quantity),
    stopLoss: stopLoss ? Number(stopLoss) : null,
    takeProfit: takeProfit ? Number(takeProfit) : null,
    commission: Number(commission),
    fees: Number(fees),
    instrument: matchedInstrument,
  })

  const commonMistakes = [
    'Chased price / Late entry',
    'Moved stop loss against trade',
    'Overleveraged position',
    'Exited prematurely before target',
    'Revenge trade after loss',
    'Failed to wait for candle confirmation',
  ]

  const handleToggleMistake = (m: string) => {
    setSelectedMistakes(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId) {
      alert('Please select a trading account')
      return
    }

    try {
      setIsSubmitting(true)
      const durationMinutes = status === 'closed' && closeTime && openTime
        ? Math.max(1, Math.round((new Date(closeTime).getTime() - new Date(openTime).getTime()) / 60000))
        : 0

      await api.createTrade({
        user_id: 'user-jarvis-1',
        account_id: accountId,
        instrument_id: matchedInstrument?.id || null,
        symbol: symbol.toUpperCase(),
        asset_class: assetClass,
        direction,
        status,
        open_time: new Date(openTime).toISOString(),
        close_time: status === 'closed' ? new Date(closeTime).toISOString() : null,
        quantity: Number(quantity),
        entry_price: Number(entryPrice),
        exit_price: status === 'closed' ? Number(exitPrice) : null,
        stop_loss: stopLoss ? Number(stopLoss) : null,
        take_profit: takeProfit ? Number(takeProfit) : null,
        gross_pnl: preview.grossPnl,
        commission: Number(commission),
        fees: Number(fees),
        net_pnl: preview.netPnl,
        roi_percentage: preview.roiPercentage,
        r_multiple: preview.rMultiple,
        strategy_id: strategyId || null,
        setup: setup || null,
        emotional_state: emotionalState || null,
        mistakes: selectedMistakes,
        mae: null,
        mfe: null,
        notes: notes || null,
        market_session: new Date(openTime).getHours() < 13 ? 'new_york' : 'london',
        duration_minutes: durationMinutes,
      })

      onTradeAdded()
      onClose()
    } catch (err: any) {
      alert(`Error saving trade: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-[#263448] bg-[#090D14] shadow-2xl animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#263448] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#287BFF]/20 text-[#4095FF]">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#EAF0F8]">Add New Trade</h2>
              <p className="text-xs text-[#8493A8]">Log trade execution with live terminal calculations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8493A8] hover:bg-[#151E2B] hover:text-[#EAF0F8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Real-time Calculation Header Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-[#263448] bg-[#151E2B] p-3.5">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#8493A8]">Gross P&L</span>
              <div className={`font-mono text-base font-bold ${preview.grossPnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'}`}>
                {formatCurrency(preview.grossPnl, currency, true)}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#8493A8]">Net P&L (after fees)</span>
              <div className={`font-mono text-base font-bold ${preview.netPnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'}`}>
                {formatCurrency(preview.netPnl, currency, true)}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#8493A8]">R-Multiple</span>
              <div className="font-mono text-base font-bold text-[#EAF0F8]">
                {preview.rMultiple !== null ? formatR(preview.rMultiple) : 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#8493A8]">Return on Risk</span>
              <div className="font-mono text-base font-bold text-[#4095FF]">
                {preview.roiPercentage ? formatPercent(preview.roiPercentage, true) : '0.00%'}
              </div>
            </div>
          </div>

          {/* Core Trade Properties */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. NQ, ES, BTC/USDT"
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 font-mono text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Asset Class</label>
              <select
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none capitalize"
              >
                <option value="futures">Futures</option>
                <option value="crypto">Cryptocurrency</option>
                <option value="stocks">Stocks</option>
                <option value="forex">Forex</option>
                <option value="commodities">Commodities</option>
              </select>
            </div>
          </div>

          {/* Direction & Status Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('long')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                    direction === 'long'
                      ? 'bg-[#18C784] text-black shadow-md shadow-[#18C784]/20'
                      : 'border border-[#263448] bg-[#101722] text-[#8493A8] hover:text-[#EAF0F8]'
                  }`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('short')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                    direction === 'short'
                      ? 'bg-[#F05265] text-white shadow-md shadow-[#F05265]/20'
                      : 'border border-[#263448] bg-[#101722] text-[#8493A8] hover:text-[#EAF0F8]'
                  }`}
                >
                  <ArrowDownRight className="h-4 w-4" />
                  SHORT
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('closed')}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    status === 'closed'
                      ? 'bg-[#287BFF] text-white shadow-md shadow-[#287BFF]/20'
                      : 'border border-[#263448] bg-[#101722] text-[#8493A8] hover:text-[#EAF0F8]'
                  }`}
                >
                  Closed Trade
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('open')}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    status === 'open'
                      ? 'bg-[#4095FF] text-white shadow-md shadow-[#4095FF]/20'
                      : 'border border-[#263448] bg-[#101722] text-[#8493A8] hover:text-[#EAF0F8]'
                  }`}
                >
                  Open Position
                </button>
              </div>
            </div>
          </div>

          {/* Pricing & Execution Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Quantity / Lots</label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 font-mono text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Entry Price</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 font-mono text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Exit Price</label>
              <input
                type="number"
                step="any"
                disabled={status === 'open'}
                value={status === 'open' ? '' : exitPrice}
                onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 font-mono text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none disabled:opacity-50"
                required={status === 'closed'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Stop Loss (SL)</label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 font-mono text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
              />
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Open Time</label>
              <input
                type="datetime-local"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                required
              />
            </div>
            {status === 'closed' && (
              <div>
                <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Close Time</label>
                <input
                  type="datetime-local"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                  required
                />
              </div>
            )}
          </div>

          {/* Strategy, Setup & Psychology */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Strategy Playbook</label>
              <select
                value={strategyId}
                onChange={(e) => setStrategyId(e.target.value)}
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
              >
                <option value="">-- None / Discretionary --</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Setup Name</label>
              <input
                type="text"
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                placeholder="e.g. 5m FVG Sweep, Breakout"
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Emotional State</label>
              <input
                type="text"
                value={emotionalState}
                onChange={(e) => setEmotionalState(e.target.value)}
                placeholder="e.g. Calm, Patient, Slightly hesitant"
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
              />
            </div>
          </div>

          {/* Mistake Tagging */}
          <div>
            <label className="block text-xs font-medium text-[#8493A8] mb-2">Identify Any Execution Mistakes</label>
            <div className="flex flex-wrap gap-2">
              {commonMistakes.map((m) => {
                const isSelected = selectedMistakes.includes(m)
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleToggleMistake(m)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-all ${
                      isSelected
                        ? 'border-[#F05265] bg-[#F05265]/15 text-[#F05265] font-medium'
                        : 'border-[#263448] bg-[#101722] text-[#8493A8] hover:text-[#EAF0F8]'
                    }`}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Trade Notes */}
          <div>
            <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Trade Notes & Reflections</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you observe? Why did you enter? Did you follow your rules?"
              className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[#263448] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#263448] bg-[#101722] px-4 py-2 text-xs font-medium text-[#8493A8] hover:text-[#EAF0F8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-[#287BFF] px-5 py-2 text-xs font-semibold text-white shadow-md shadow-[#287BFF]/25 hover:bg-[#4095FF] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving to Database...' : 'Save Trade to Journal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
