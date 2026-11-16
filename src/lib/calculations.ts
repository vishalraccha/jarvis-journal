import { Trade, Instrument, DashboardMetrics, AssetClass, TradeDirection } from '@/types/database'

export interface CalculationInput {
  direction: TradeDirection
  entryPrice: number
  exitPrice?: number | null
  quantity: number
  stopLoss?: number | null
  takeProfit?: number | null
  commission?: number
  fees?: number
  instrument?: Partial<Instrument> | null
}

export interface CalculationResult {
  grossPnl: number
  commission: number
  fees: number
  netPnl: number
  roiPercentage: number
  rMultiple: number | null
  initialRisk: number | null
}

/**
 * Calculate Gross P&L and Net P&L based on asset specifications:
 * - Stocks & Crypto: Linear (price_diff * quantity)
 * - Futures & Commodities: (price_diff / tick_size) * tick_value * quantity OR price_diff * point_value * quantity
 * - Forex: Standard lot = 100,000 units. If contract_size is defined, use (price_diff * contract_size * quantity)
 */
export function calculateTradePnl(input: CalculationInput): CalculationResult {
  const {
    direction,
    entryPrice,
    exitPrice,
    quantity,
    stopLoss,
    commission = 0,
    fees = 0,
    instrument,
  } = input

  if (!exitPrice || isNaN(exitPrice) || entryPrice <= 0 || quantity <= 0) {
    // Open trade or invalid exit
    return {
      grossPnl: 0,
      commission,
      fees,
      netPnl: -commission - fees,
      roiPercentage: 0,
      rMultiple: null,
      initialRisk: null,
    }
  }

  const priceDiff = direction === 'long' 
    ? exitPrice - entryPrice 
    : entryPrice - exitPrice

  let grossPnl = 0

  if (instrument) {
    const { tick_size, tick_value, point_value, contract_size, asset_class } = instrument

    if (asset_class === 'futures' && tick_size && tick_value && tick_size > 0) {
      const ticks = priceDiff / tick_size
      grossPnl = ticks * tick_value * quantity
    } else if (point_value && point_value > 0) {
      grossPnl = priceDiff * point_value * quantity
    } else if (contract_size && contract_size > 0) {
      grossPnl = priceDiff * contract_size * quantity
    } else {
      grossPnl = priceDiff * quantity
    }
  } else {
    // Standard linear instrument
    grossPnl = priceDiff * quantity
  }

  // Round to 2 decimal places to avoid floating point anomalies
  grossPnl = Math.round(grossPnl * 100) / 100
  const netPnl = Math.round((grossPnl - commission - fees) * 100) / 100

  // Calculate ROI percentage based on position capital / cost
  const capitalInvested = entryPrice * quantity
  const roiPercentage = capitalInvested > 0 
    ? Math.round(((netPnl / capitalInvested) * 100) * 100) / 100 
    : 0

  // Calculate R-Multiple
  let rMultiple: number | null = null
  let initialRisk: number | null = null

  if (stopLoss && stopLoss > 0) {
    const riskDiff = direction === 'long' 
      ? entryPrice - stopLoss 
      : stopLoss - entryPrice

    if (riskDiff > 0) {
      if (instrument?.tick_size && instrument?.tick_value && instrument.tick_size > 0) {
        initialRisk = (riskDiff / instrument.tick_size) * instrument.tick_value * quantity
      } else if (instrument?.point_value && instrument.point_value > 0) {
        initialRisk = riskDiff * instrument.point_value * quantity
      } else if (instrument?.contract_size && instrument.contract_size > 0) {
        initialRisk = riskDiff * instrument.contract_size * quantity
      } else {
        initialRisk = riskDiff * quantity
      }

      if (initialRisk > 0) {
        rMultiple = Math.round((netPnl / initialRisk) * 100) / 100
      }
    }
  }

  return {
    grossPnl,
    commission,
    fees,
    netPnl,
    roiPercentage,
    rMultiple,
    initialRisk: initialRisk ? Math.round(initialRisk * 100) / 100 : null,
  }
}

/**
 * Computes complete analytics and dashboard metrics from a list of trades
 */
export function computeDashboardMetrics(trades: Trade[]): DashboardMetrics {
  const closedTrades = trades.filter((t) => t.status === 'closed')
  const totalTrades = closedTrades.length

  if (totalTrades === 0) {
    return {
      netPnl: 0,
      grossPnl: 0,
      winRate: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      averageR: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      expectancy: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      avgHoldingTimeMinutes: 0,
      totalVolume: 0,
      longTrades: 0,
      shortTrades: 0,
      longWinRate: 0,
      shortWinRate: 0,
    }
  }

  let grossPnl = 0
  let netPnl = 0
  let grossProfits = 0
  let grossLosses = 0

  let winningTrades = 0
  let losingTrades = 0
  let breakEvenTrades = 0

  let totalWinAmount = 0
  let totalLossAmount = 0
  let totalR = 0
  let tradesWithR = 0

  let longTrades = 0
  let shortTrades = 0
  let longWins = 0
  let shortWins = 0

  let currentConsecutiveWins = 0
  let maxConsecutiveWins = 0
  let currentConsecutiveLosses = 0
  let maxConsecutiveLosses = 0

  let totalHoldingMinutes = 0
  let holdingTradesCount = 0
  let totalVolume = 0

  // Sort chronologically for accurate drawdown and consecutive streaks calculation
  const sorted = [...closedTrades].sort(
    (a, b) => new Date(a.open_time).getTime() - new Date(b.open_time).getTime()
  )

  let peakEquity = 0
  let runningPnl = 0
  let maxDrawdown = 0

  for (const t of sorted) {
    const net = t.net_pnl || 0
    const gross = t.gross_pnl || 0
    netPnl += net
    grossPnl += gross
    totalVolume += (t.quantity || 0) * (t.entry_price || 0)

    if (t.duration_minutes && t.duration_minutes > 0) {
      totalHoldingMinutes += t.duration_minutes
      holdingTradesCount++
    }

    if (t.direction === 'long') {
      longTrades++
      if (net > 0) longWins++
    } else {
      shortTrades++
      if (net > 0) shortWins++
    }

    if (net > 0.001) {
      winningTrades++
      grossProfits += net
      totalWinAmount += net

      currentConsecutiveWins++
      currentConsecutiveLosses = 0
      if (currentConsecutiveWins > maxConsecutiveWins) {
        maxConsecutiveWins = currentConsecutiveWins
      }
    } else if (net < -0.001) {
      losingTrades++
      grossLosses += Math.abs(net)
      totalLossAmount += Math.abs(net)

      currentConsecutiveLosses++
      currentConsecutiveWins = 0
      if (currentConsecutiveLosses > maxConsecutiveLosses) {
        maxConsecutiveLosses = currentConsecutiveLosses
      }
    } else {
      breakEvenTrades++
      currentConsecutiveWins = 0
      currentConsecutiveLosses = 0
    }

    if (t.r_multiple !== null && t.r_multiple !== undefined) {
      totalR += t.r_multiple
      tradesWithR++
    }

    // Running drawdown calculation
    runningPnl += net
    if (runningPnl > peakEquity) {
      peakEquity = runningPnl
    }
    const currentDrawdown = peakEquity - runningPnl
    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown
    }
  }

  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
  const profitFactor = grossLosses > 0 ? grossProfits / grossLosses : grossProfits > 0 ? 99.99 : 0
  const averageWin = winningTrades > 0 ? totalWinAmount / winningTrades : 0
  const averageLoss = losingTrades > 0 ? totalLossAmount / losingTrades : 0
  const averageR = tradesWithR > 0 ? totalR / tradesWithR : 0

  // Expectancy formula: (Win% * AvgWin) - (Loss% * AvgLoss)
  const winProb = winningTrades / totalTrades
  const lossProb = losingTrades / totalTrades
  const expectancy = (winProb * averageWin) - (lossProb * averageLoss)

  const avgHoldingTimeMinutes = holdingTradesCount > 0 
    ? Math.round(totalHoldingMinutes / holdingTradesCount) 
    : 0

  const longWinRate = longTrades > 0 ? (longWins / longTrades) * 100 : 0
  const shortWinRate = shortTrades > 0 ? (shortWins / shortTrades) * 100 : 0

  return {
    netPnl: Math.round(netPnl * 100) / 100,
    grossPnl: Math.round(grossPnl * 100) / 100,
    winRate: Math.round(winRate * 10) / 10,
    totalTrades,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    profitFactor: Math.round(profitFactor * 100) / 100,
    averageWin: Math.round(averageWin * 100) / 100,
    averageLoss: Math.round(averageLoss * 100) / 100,
    averageR: Math.round(averageR * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownPercent: peakEquity > 0 ? Math.round((maxDrawdown / peakEquity) * 10000) / 100 : 0,
    expectancy: Math.round(expectancy * 100) / 100,
    consecutiveWins: maxConsecutiveWins,
    consecutiveLosses: maxConsecutiveLosses,
    avgHoldingTimeMinutes,
    totalVolume: Math.round(totalVolume),
    longTrades,
    shortTrades,
    longWinRate: Math.round(longWinRate * 10) / 10,
    shortWinRate: Math.round(shortWinRate * 10) / 10,
  }
}
