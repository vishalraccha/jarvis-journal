import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Clock,
  Target,
  Zap,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api, STANDARD_INSTRUMENTS } from '@/services/api'
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
  const [instruments, setInstruments] = useState<Instrument[]>(STANDARD_INSTRUMENTS)

  // Quick Symbol Preset Categories
  const symbolPresets = [
    { label: 'Futures', symbols: ['NQ', 'ES', 'YM', 'RTY', 'CL', 'GC'] },
    { label: 'Crypto', symbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] },
    { label: 'Stocks / ETFs', symbols: ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN'] },
    { label: 'Forex', symbols: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'] },
    { label: 'Commodities', symbols: ['XAU/USD'] },
  ]

  const [accountId, setAccountId] = useState<string>('')
  const [symbol, setSymbol] = useState<string>('NQ')
  const [isCustomSymbol, setIsCustomSymbol] = useState<boolean>(false)
  const [customSymbolInput, setCustomSymbolInput] = useState<string>('')
  const [assetClass, setAssetClass] = useState<AssetClass>('futures')
  const [direction, setDirection] = useState<TradeDirection>('long')
  const [status, setStatus] = useState<TradeStatus>('closed')

  // Auto timestamps
  const getCurrentLocalISOString = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  const [openTime, setOpenTime] = useState<string>(getCurrentLocalISOString())
  const [closeTime, setCloseTime] = useState<string>(getCurrentLocalISOString())

  const [quantity, setQuantity] = useState<number>(1)
  const [entryPrice, setEntryPrice] = useState<number | string>(20800)
  const [exitPrice, setExitPrice] = useState<number | string>(20900)
  const [stopLoss, setStopLoss] = useState<number | string>(20750)
  const [takeProfit, setTakeProfit] = useState<number | string>(20900)
  const [commission, setCommission] = useState<number>(4.5)
  const [fees, setFees] = useState<number>(1.0)
  const [strategyId, setStrategyId] = useState<string>('')
  const [setup, setSetup] = useState<string>('Opening Range Breakout')
  const [emotionalState, setEmotionalState] = useState<string>('Calm and Disciplined')
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([])
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (activeAccount) {
      setAccountId(activeAccount.id)
    } else if (accounts.length > 0) {
      setAccountId(accounts[0].id)
    }
    api.getStrategies().then(setStrategies)
    api.getInstruments().then((insts) => {
      if (insts && insts.length > 0) setInstruments(insts)
    })
  }, [activeAccount, accounts, isOpen])

  // Automatically update specifications when a symbol is picked
  const handleSelectSymbol = (sym: string) => {
    if (sym === 'CUSTOM') {
      setIsCustomSymbol(true)
      return
    }
    setIsCustomSymbol(false)
    setSymbol(sym)

    const matched = instruments.find(i => i.symbol.toUpperCase() === sym.toUpperCase())
    if (matched) {
      setAssetClass(matched.asset_class)
      setCommission(matched.default_commission || (matched.asset_class === 'futures' ? 4.5 : 0))

      // Sensible default quantities
      if (matched.asset_class === 'futures') setQuantity(1)
      else if (matched.asset_class === 'crypto') setQuantity(0.1)
      else if (matched.asset_class === 'stocks') setQuantity(100)
      else if (matched.asset_class === 'forex') setQuantity(1)
      else setQuantity(1)
    } else {
      // Auto classify based on symbol naming convention
      if (sym.includes('/USDT')) {
        setAssetClass('crypto')
        setQuantity(0.1)
        setCommission(1.5)
      } else if (sym.includes('/USD')) {
        setAssetClass(sym.includes('XAU') ? 'commodities' : 'forex')
        setQuantity(1)
        setCommission(2.5)
      } else if (['NQ', 'ES', 'YM', 'RTY', 'CL', 'GC'].includes(sym)) {
        setAssetClass('futures')
        setQuantity(1)
        setCommission(4.5)
      } else {
        setAssetClass('stocks')
        setQuantity(100)
        setCommission(0)
      }
    }
  }

  const activeSymbol = isCustomSymbol ? customSymbolInput.toUpperCase() : symbol
  const matchedInstrument = instruments.find(i => i.symbol.toUpperCase() === activeSymbol)

  // Real-time P&L calculation
  const preview = useMemo(() => {
    return calculateTradePnl({
      direction,
      entryPrice: Number(entryPrice) || 0,
      exitPrice: status === 'closed' ? Number(exitPrice) || null : null,
      quantity: Number(quantity) || 0,
      stopLoss: stopLoss ? Number(stopLoss) : null,
      takeProfit: takeProfit ? Number(takeProfit) : null,
      commission: Number(commission) || 0,
      fees: Number(fees) || 0,
      instrument: matchedInstrument,
    })
  }, [direction, entryPrice, exitPrice, status, quantity, stopLoss, takeProfit, commission, fees, matchedInstrument])

  // Quick 1R, 2R, 3R Target Calculation Automation
  const handleAutoSetTargetR = (rMult: number) => {
    const entry = Number(entryPrice)
    const sl = Number(stopLoss)
    if (!entry || !sl) return

    const riskDistance = Math.abs(entry - sl)
    if (riskDistance <= 0) return

    let targetPrice = 0
    if (direction === 'long') {
      targetPrice = entry + (riskDistance * rMult)
    } else {
      targetPrice = entry - (riskDistance * rMult)
    }

    targetPrice = Math.round(targetPrice * 100) / 100
    setExitPrice(targetPrice)
    setTakeProfit(targetPrice)
  }

  // Quick Time Shortcuts
  const setNowTimes = () => {
    const nowStr = getCurrentLocalISOString()
    setOpenTime(nowStr)
    setCloseTime(nowStr)
  }

  const setNYOpenTimes = () => {
    const d = new Date()
    d.setHours(9, 30, 0, 0)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    const openStr = d.toISOString().slice(0, 16)
    d.setMinutes(d.getMinutes() + 30) // +30m
    const closeStr = d.toISOString().slice(0, 16)
    setOpenTime(openStr)
    setCloseTime(closeStr)
  }

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
    if (!activeSymbol.trim()) {
      alert('Please select or enter a valid symbol')
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
        symbol: activeSymbol,
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
      console.error('Error saving trade:', err)
      setSubmitError(err.message || 'Unknown error occurred while saving trade.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl border border-[#202838] bg-[#10141E] shadow-2xl animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#202838] px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: 'var(--accent-muted, rgba(59,130,246,0.15))',
                color: 'var(--accent-color, #3B82F6)',
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg"
            >
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#E2E8F0]">Quick Trade Entry</h2>
              <p className="text-xs text-[#8493A8]">Automated symbol presets, risk targeting, and live P&L calculation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8493A8] hover:bg-[#141A26] hover:text-[#E2E8F0]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-[#F05265]/40 bg-[#F05265]/10 p-3 text-xs text-[#F05265]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error saving trade: </span>
                <span>{submitError}</span>
              </div>
            </div>
          )}

          {/* Live Calculation Header Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-[#263448] bg-[#151E2B] p-3.5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8493A8]">Net Realized P&L</span>
              <div className={`font-mono text-base font-extrabold ${preview.netPnl >= 0 ? 'text-[#18C784]' : 'text-[#F05265]'}`}>
                {formatCurrency(preview.netPnl, currency, true)}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8493A8]">Gross P&L</span>
              <div className="font-mono text-base font-bold text-[#EAF0F8]">
                {formatCurrency(preview.grossPnl, currency, true)}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8493A8]">Realized R-Multiple</span>
              <div className="font-mono text-base font-bold text-[#4095FF]">
                {preview.rMultiple !== null ? formatR(preview.rMultiple) : 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8493A8]">Initial Dollar Risk</span>
              <div className="font-mono text-base font-bold text-[#F05265]">
                {preview.initialRisk ? `-$${preview.initialRisk.toFixed(2)}` : 'N/A'}
              </div>
            </div>
          </div>

          {/* 1. AUTOMATED SYMBOL SELECTION (Dropdown with categories + custom option) */}
          <div className="rounded-xl border border-[#263448] bg-[#101722] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4095FF] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Select Symbol (Automates Asset Specs & Commissions)</span>
              </label>
              <span className="font-mono text-xs font-bold text-[#18C784]">
                Active: {activeSymbol || 'None'} ({assetClass.toUpperCase()})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Symbol Dropdown */}
              <div>
                <select
                  value={isCustomSymbol ? 'CUSTOM' : symbol}
                  onChange={(e) => handleSelectSymbol(e.target.value)}
                  className="w-full rounded-lg border border-[#263448] bg-[#151E2B] px-3 py-2.5 font-mono text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none cursor-pointer"
                >
                  {symbolPresets.map((group) => (
                    <optgroup key={group.label} label={group.label} className="bg-[#101722] text-[#8493A8]">
                      {group.symbols.map((s) => (
                        <option key={s} value={s} className="bg-[#151E2B] text-[#EAF0F8]">
                          {s}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="CUSTOM" className="bg-[#151E2B] text-[#4095FF] font-bold">
                    + Custom Symbol / Ticker...
                  </option>
                </select>
              </div>

              {/* Custom Symbol Input (if selected) */}
              {isCustomSymbol ? (
                <div>
                  <input
                    type="text"
                    value={customSymbolInput}
                    onChange={(e) => setCustomSymbolInput(e.target.value.toUpperCase())}
                    placeholder="Enter ticker (e.g. MSFT, EUR/JPY)..."
                    className="w-full rounded-lg border border-[#287BFF] bg-[#151E2B] px-3 py-2.5 font-mono text-xs text-[#EAF0F8] focus:outline-none uppercase"
                    autoFocus
                    required
                  />
                </div>
              ) : (
                /* Quick 1-click popular pills */
                <div className="flex flex-wrap items-center gap-1.5">
                  {['NQ', 'ES', 'BTC/USDT', 'XAU/USD', 'SPY', 'NVDA'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSelectSymbol(s)}
                      className={`rounded px-2.5 py-1 font-mono text-xs transition-all ${
                        symbol === s && !isCustomSymbol
                          ? 'bg-[#287BFF] text-white font-bold'
                          : 'border border-[#263448] bg-[#151E2B] text-[#8493A8] hover:text-[#EAF0F8]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Account, Direction & Status */}
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
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('long')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                    direction === 'long'
                      ? 'bg-[#18C784] text-black shadow-md'
                      : 'border border-[#263448] bg-[#101722] text-[#8493A8] hover:text-[#EAF0F8]'
                  }`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('short')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                    direction === 'short'
                      ? 'bg-[#F05265] text-white shadow-md'
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
                  className={`rounded-lg py-2 text-xs font-bold transition-all ${
                    status === 'closed'
                      ? 'bg-[#287BFF] text-white shadow-md'
                      : 'border border-[#263448] bg-[#101722] text-[#8493A8] hover:text-[#EAF0F8]'
                  }`}
                >
                  Closed Trade
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('open')}
                  className={`rounded-lg py-2 text-xs font-bold transition-all ${
                    status === 'open'
                      ? 'bg-[#4095FF] text-white shadow-md'
                      : 'border border-[#263448] bg-[#101722] text-[#8493A8] hover:text-[#EAF0F8]'
                  }`}
                >
                  Open Trade
                </button>
              </div>
            </div>
          </div>

          {/* Pricing, Quantity & Automated Target Buttons */}
          <div className="rounded-xl border border-[#263448] bg-[#101722] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8493A8]">
                Prices & Automated Target R Calculator
              </span>
              {/* Quick Target Calculation Buttons */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#8493A8] mr-1">Auto-target:</span>
                {[1, 1.5, 2, 3].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleAutoSetTargetR(r)}
                    title={`Calculate exit target at ${r}R`}
                    style={{
                      backgroundColor: 'var(--accent-muted, rgba(59,130,246,0.15))',
                      color: 'var(--accent-color, #3B82F6)',
                    }}
                    className="rounded px-2 py-0.5 font-mono text-[10px] font-bold hover:opacity-80 transition-colors"
                  >
                    +{r}R
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#8493A8] mb-1">Quantity / Size</label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[#263448] bg-[#151E2B] px-3 py-2 font-mono text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8493A8] mb-1">Entry Price</label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full rounded-lg border border-[#263448] bg-[#151E2B] px-3 py-2 font-mono text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8493A8] mb-1">Stop Loss (SL)</label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full rounded-lg border border-[#263448] bg-[#151E2B] px-3 py-2 font-mono text-xs text-[#F05265] focus:border-[#287BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8493A8] mb-1">Exit Price</label>
                <input
                  type="number"
                  step="any"
                  disabled={status === 'open'}
                  value={status === 'open' ? '' : exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="w-full rounded-lg border border-[#263448] bg-[#151E2B] px-3 py-2 font-mono text-xs text-[#18C784] focus:border-[#287BFF] focus:outline-none disabled:opacity-40"
                  required={status === 'closed'}
                />
              </div>
            </div>
          </div>

          {/* Quick Date/Time Shortcuts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8493A8]">
              <span>Execution Date & Time</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={setNowTimes}
                  className="flex items-center gap-1 rounded bg-[#101722] px-2 py-0.5 text-[10px] text-[#4095FF] hover:bg-[#151E2B]"
                >
                  <Clock className="h-3 w-3" />
                  <span>Now</span>
                </button>
                <button
                  type="button"
                  onClick={setNYOpenTimes}
                  className="rounded bg-[#101722] px-2 py-0.5 text-[10px] text-[#8493A8] hover:text-[#EAF0F8]"
                >
                  Today 09:30 AM
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-[#8493A8] mb-1">Open Time</label>
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
                  <label className="block text-[11px] text-[#8493A8] mb-1">Close Time</label>
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
          </div>

          {/* Strategy & Setup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Strategy Playbook</label>
              <select
                value={strategyId}
                onChange={(e) => {
                  setStrategyId(e.target.value)
                  const strat = strategies.find(s => s.id === e.target.value)
                  if (strat) setSetup(strat.name)
                }}
                className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
              >
                <option value="">-- Discretionary / No Strategy --</option>
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
          </div>

          {/* Mistake Tagging */}
          <div>
            <label className="block text-xs font-medium text-[#8493A8] mb-2">Identify Any Execution Mistakes (Optional)</label>
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
            <label className="block text-xs font-medium text-[#8493A8] mb-1.5">Trade Notes & Rationale</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why did you enter? Key level observed?"
              className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[#202838] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#202838] bg-[#141A26] px-4 py-2 text-xs font-medium text-[#8493A8] hover:text-[#E2E8F0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
              className="flex items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Saving Trade...' : 'Save Trade to Journal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
