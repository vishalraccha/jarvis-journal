import React, { useState, useEffect, useRef } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Upload,
  Calendar,
  Layers,
  BarChart2,
  Sliders,
  DollarSign,
  Info,
} from 'lucide-react'
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData } from 'lightweight-charts'
import { Trade, HistoricalCandle } from '@/types/database'

interface TradeReplayViewProps {
  trades: Trade[]
}

// Pluggable Market Data Provider Interface
export interface IMarketDataProvider {
  name: string
  fetchCandles: (symbol: string, timeframe: string, limit: number) => Promise<HistoricalCandle[]>
}

// Default In-Memory & CSV Historical Data Provider
export class LocalReplayDataProvider implements IMarketDataProvider {
  name = 'Historical CSV & Local Engine'

  async fetchCandles(symbol: string, timeframe: string, limit: number = 60): Promise<HistoricalCandle[]> {
    // Generate realistic tick-based candles for replay testing
    const now = Math.floor(Date.now() / 1000)
    const candles: HistoricalCandle[] = []
    let basePrice = symbol.includes('BTC') ? 91200 : symbol.includes('NQ') ? 20850 : 5950

    for (let i = limit; i >= 0; i--) {
      const time = now - i * 300 // 5m intervals
      const delta = (Math.sin(i * 0.4) * 15) + ((Math.random() - 0.48) * 20)
      const open = basePrice
      const close = basePrice + delta
      const high = Math.max(open, close) + Math.random() * 8
      const low = Math.min(open, close) - Math.random() * 8
      const volume = Math.floor(Math.random() * 500 + 100)

      candles.push({
        symbol,
        timeframe,
        timestamp: time,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume,
      })
      basePrice = close
    }

    return candles
  }
}

export const TradeReplayView: React.FC<TradeReplayViewProps> = ({ trades }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartApiRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const [symbol, setSymbol] = useState<string>('NQ')
  const [timeframe, setTimeframe] = useState<string>('5m')
  const [allCandles, setAllCandles] = useState<HistoricalCandle[]>([])
  const [currentBarIndex, setCurrentBarIndex] = useState<number>(15)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1) // 1x, 2x, 5x

  const dataProvider = useRef<IMarketDataProvider>(new LocalReplayDataProvider())

  // Load initial candles
  useEffect(() => {
    dataProvider.current.fetchCandles(symbol, timeframe, 80).then((candles) => {
      setAllCandles(candles)
      setCurrentBarIndex(Math.min(25, candles.length - 1))
    })
  }, [symbol, timeframe])

  // Chart setup
  useEffect(() => {
    if (!chartContainerRef.current) return

    if (chartApiRef.current) {
      chartApiRef.current.remove()
      chartApiRef.current = null
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 480,
      layout: {
        background: { color: '#090D14' },
        textColor: '#8493A8',
      },
      grid: {
        vertLines: { color: '#151E2B' },
        horzLines: { color: '#151E2B' },
      },
      timeScale: {
        borderColor: '#263448',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#263448',
      },
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#18C784',
      downColor: '#F05265',
      borderVisible: false,
      wickUpColor: '#18C784',
      wickDownColor: '#F05265',
    })

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    })

    chartApiRef.current = chart
    candleSeriesRef.current = candlestickSeries
    volumeSeriesRef.current = volumeSeries

    const handleResize = () => {
      if (chartContainerRef.current && chartApiRef.current) {
        chartApiRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartApiRef.current) {
        chartApiRef.current.remove()
        chartApiRef.current = null
      }
    }
  }, [])

  // Update chart when currentBarIndex changes
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || allCandles.length === 0) return

    const visibleCandles = allCandles.slice(0, currentBarIndex + 1)
    const cData: CandlestickData[] = visibleCandles.map((c) => ({
      time: Number(c.timestamp) as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    const vData: HistogramData[] = visibleCandles.map((c) => ({
      time: Number(c.timestamp) as any,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(24, 199, 132, 0.3)' : 'rgba(240, 82, 101, 0.3)',
    }))

    candleSeriesRef.current.setData(cData)
    volumeSeriesRef.current.setData(vData)
  }, [currentBarIndex, allCandles])

  // Playback timer loop
  useEffect(() => {
    let timer: any = null
    if (isPlaying) {
      const intervalMs = Math.max(200, 1000 / playbackSpeed)
      timer = setInterval(() => {
        setCurrentBarIndex((prev) => {
          if (prev >= allCandles.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, intervalMs)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isPlaying, playbackSpeed, allCandles.length])

  const stepForward = () => {
    setIsPlaying(false)
    setCurrentBarIndex(prev => Math.min(allCandles.length - 1, prev + 1))
  }

  const stepBackward = () => {
    setIsPlaying(false)
    setCurrentBarIndex(prev => Math.max(5, prev - 1))
  }

  const resetReplay = () => {
    setIsPlaying(false)
    setCurrentBarIndex(15)
  }

  const currentCandle = allCandles[currentBarIndex]

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Replay Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#287BFF]/20 text-[#4095FF]">
            <Play className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#EAF0F8]">Historical Trade Replay Engine</h2>
            <p className="text-xs text-[#8493A8]">Bar-by-bar market playback using Lightweight Charts</p>
          </div>
        </div>

        {/* Symbol & Timeframe Selectors */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-[#263448] bg-[#101722] px-2.5 py-1 text-xs">
            <span className="text-[#8493A8]">Symbol:</span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-transparent font-mono font-bold text-[#EAF0F8] focus:outline-none cursor-pointer"
            >
              <option value="NQ" className="bg-[#151E2B]">NQ (Nasdaq)</option>
              <option value="ES" className="bg-[#151E2B]">ES (S&P 500)</option>
              <option value="BTC/USDT" className="bg-[#151E2B]">BTC/USDT</option>
              <option value="XAU/USD" className="bg-[#151E2B]">XAU/USD (Gold)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-[#263448] bg-[#101722] px-2.5 py-1 text-xs">
            <span className="text-[#8493A8]">Timeframe:</span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-transparent font-mono text-[#EAF0F8] focus:outline-none cursor-pointer"
            >
              <option value="1m" className="bg-[#151E2B]">1m</option>
              <option value="5m" className="bg-[#151E2B]">5m</option>
              <option value="15m" className="bg-[#151E2B]">15m</option>
              <option value="1h" className="bg-[#151E2B]">1h</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-xl space-y-4">
        {/* Playback Controls Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#263448] pb-3 text-xs">
          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={resetReplay}
              title="Reset to beginning"
              className="rounded-lg border border-[#263448] bg-[#101722] p-2 text-[#8493A8] hover:text-[#EAF0F8]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={stepBackward}
              title="Step 1 bar backward"
              className="rounded-lg border border-[#263448] bg-[#101722] p-2 text-[#8493A8] hover:text-[#EAF0F8]"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 font-semibold text-white shadow-md transition-all ${
                isPlaying
                  ? 'bg-[#EAB308] hover:bg-[#ca9a04]'
                  : 'bg-[#287BFF] hover:bg-[#4095FF] shadow-[#287BFF]/20'
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={stepForward}
              title="Step 1 bar forward"
              className="rounded-lg border border-[#263448] bg-[#101722] p-2 text-[#8493A8] hover:text-[#EAF0F8]"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[#8493A8]">Speed:</span>
            <div className="flex items-center rounded-lg border border-[#263448] bg-[#101722] p-0.5 font-mono text-[11px]">
              {[0.5, 1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`rounded px-2 py-1 ${
                    playbackSpeed === speed ? 'bg-[#287BFF] text-white font-bold' : 'text-[#8493A8] hover:text-[#EAF0F8]'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Current Bar Info */}
          {currentCandle && (
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-[#8493A8]">Bar: {currentBarIndex + 1}/{allCandles.length}</span>
              <span className="text-[#EAF0F8]">Price: ${currentCandle.close.toFixed(2)}</span>
              <span className={currentCandle.close >= currentCandle.open ? 'text-[#18C784]' : 'text-[#F05265]'}>
                {((currentCandle.close - currentCandle.open) / currentCandle.open * 100).toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Chart Canvas */}
        <div ref={chartContainerRef} className="w-full h-[480px] rounded-lg bg-[#090D14]" />
      </div>
    </div>
  )
}
