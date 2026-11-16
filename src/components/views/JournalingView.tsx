import React, { useState, useEffect } from 'react'
import {
  FileText,
  Calendar,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  Smile,
  Meh,
  Frown,
  Plus,
  Search,
  BookOpen,
  Image as ImageIcon,
  Tag as TagIcon,
} from 'lucide-react'
import { api } from '@/services/api'
import { DailyJournal, JournalType, Trade } from '@/types/database'
import { formatDate } from '@/lib/utils'

interface JournalingViewProps {
  initialDate?: string
  trades: Trade[]
}

export const JournalingView: React.FC<JournalingViewProps> = ({
  initialDate,
  trades,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  )
  const [journalType, setJournalType] = useState<JournalType>('daily')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [moodScore, setMoodScore] = useState<number>(4)

  // 10-step template state
  const [marketOverview, setMarketOverview] = useState('')
  const [tradingPlan, setTradingPlan] = useState('')
  const [importantLevels, setImportantLevels] = useState('')
  const [expectedDirection, setExpectedDirection] = useState('')
  const [setupsWatched, setSetupsWatched] = useState('')
  const [tradesTakenSummary, setTradesTakenSummary] = useState('')
  const [mistakesMade, setMistakesMade] = useState('')
  const [emotionalState, setEmotionalState] = useState('')
  const [lessonsLearned, setLessonsLearned] = useState('')
  const [improvementsTomorrow, setImprovementsTomorrow] = useState('')
  const [notesRichText, setNotesRichText] = useState('')

  // Trades on selected date
  const tradesOnThisDate = trades.filter(t => t.open_time.startsWith(selectedDate))

  // Load existing journal for this date and type
  useEffect(() => {
    let isCancelled = false
    const loadJournal = async () => {
      try {
        const j = await api.getJournalByDate(selectedDate, journalType)
        if (isCancelled) return

        if (j) {
          setMarketOverview(j.market_overview || '')
          setTradingPlan(j.trading_plan || '')
          setImportantLevels(j.important_levels || '')
          setExpectedDirection(j.expected_direction || '')
          setSetupsWatched(j.setups_watched || '')
          setTradesTakenSummary(j.trades_taken_summary || '')
          setMistakesMade(j.mistakes_made || '')
          setEmotionalState(j.emotional_state || '')
          setLessonsLearned(j.lessons_learned || '')
          setImprovementsTomorrow(j.improvements_tomorrow || '')
          setNotesRichText(j.notes_rich_text || '')
          setMoodScore(j.mood_score || 3)
          setSaveStatus('saved')
        } else {
          // Pre-populate summary of trades if any exist on this day
          if (tradesOnThisDate.length > 0) {
            const syms = tradesOnThisDate.map(t => `${t.symbol} (${t.direction.toUpperCase()} P&L: $${t.net_pnl})`).join(', ')
            setTradesTakenSummary(`Executed ${tradesOnThisDate.length} trades: ${syms}`)
          } else {
            setTradesTakenSummary('')
          }
          setMarketOverview('')
          setTradingPlan('')
          setImportantLevels('')
          setExpectedDirection('')
          setSetupsWatched('')
          setMistakesMade('')
          setEmotionalState('')
          setLessonsLearned('')
          setImprovementsTomorrow('')
          setNotesRichText('')
          setMoodScore(4)
        }
      } catch (err) {
        console.error('Failed to load journal entry:', err)
      }
    }

    loadJournal()
    return () => {
      isCancelled = true
    }
  }, [selectedDate, journalType])

  const handleSaveJournal = async () => {
    try {
      setSaveStatus('saving')
      await api.upsertDailyJournal({
        date: selectedDate,
        journal_type: journalType,
        market_overview: marketOverview,
        trading_plan: tradingPlan,
        important_levels: importantLevels,
        expected_direction: expectedDirection,
        setups_watched: setupsWatched,
        trades_taken_summary: tradesTakenSummary,
        mistakes_made: mistakesMade,
        emotional_state: emotionalState,
        lessons_learned: lessonsLearned,
        improvements_tomorrow: improvementsTomorrow,
        notes_rich_text: notesRichText,
        mood_score: moodScore,
      })
      setSaveStatus('saved')
    } catch (err) {
      console.error(err)
      setSaveStatus('error')
    }
  }

  const journalTypes: { id: JournalType; label: string }[] = [
    { id: 'pre_market', label: 'Pre-Market Prep' },
    { id: 'daily', label: '10-Step Daily Journal' },
    { id: 'post_market', label: 'Post-Market Debrief' },
    { id: 'weekly_review', label: 'Weekly Review' },
    { id: 'monthly_review', label: 'Monthly Review' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Journal Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#202838] bg-[#141A26] p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: 'var(--accent-muted, rgba(59,130,246,0.15))',
              color: 'var(--accent-color, #3B82F6)',
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg"
          >
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E2E8F0]">Trading Journal & Notebook</h2>
            <p className="text-xs text-[#8493A8]">Structured reflection, market plans, and psychological calibration</p>
          </div>
        </div>

        {/* Date and Save Status */}
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

          <button
            onClick={handleSaveJournal}
            disabled={saveStatus === 'saving'}
            style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{saveStatus === 'saving' ? 'Saving...' : 'Save Entry'}</span>
          </button>
        </div>
      </div>

      {/* Journal Type Switcher & Mood Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#202838] bg-[#141A26] p-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {journalTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setJournalType(type.id)}
              style={{
                backgroundColor: journalType === type.id ? 'var(--accent-color, #3B82F6)' : undefined,
              }}
              className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                journalType === type.id
                  ? 'text-white shadow-sm'
                  : 'text-[#8493A8] hover:bg-[#10141E] hover:text-[#E2E8F0]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Mood Selector */}
        <div className="flex items-center gap-2 text-xs text-[#8493A8]">
          <span>Trader Mindset:</span>
          <div className="flex items-center gap-1 bg-[#101722] p-1 rounded-lg border border-[#263448]">
            <button
              onClick={() => setMoodScore(5)}
              title="Calm & Disciplined"
              className={`p-1 rounded ${moodScore === 5 ? 'bg-[#18C784]/20 text-[#18C784]' : 'text-[#8493A8]'}`}
            >
              <Smile className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMoodScore(3)}
              title="Neutral / Slightly Stressed"
              className={`p-1 rounded ${moodScore === 3 ? 'bg-[#EAB308]/20 text-[#EAB308]' : 'text-[#8493A8]'}`}
            >
              <Meh className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMoodScore(1)}
              title="Frustrated / Revenge Mentality"
              className={`p-1 rounded ${moodScore === 1 ? 'bg-[#F05265]/20 text-[#F05265]' : 'text-[#8493A8]'}`}
            >
              <Frown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Journaling Form: 10-Step Template */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Prep & Execution */}
        <div className="space-y-4">
          {/* 1. Market Overview */}
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
            <label className="block text-xs font-semibold text-[#4095FF] mb-1.5 uppercase tracking-wider">
              1. Market Overview & Macro Context
            </label>
            <textarea
              rows={3}
              value={marketOverview}
              onChange={(e) => setMarketOverview(e.target.value)}
              placeholder="What are the major catalysts today? (FOMC, CPI, bond yields, trend direction)"
              className="w-full rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs text-[#EAF0F8] placeholder-[#8493A8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>

          {/* 2. Today's Plan */}
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
            <label className="block text-xs font-semibold text-[#4095FF] mb-1.5 uppercase tracking-wider">
              2. Today's Trading Plan & Bias
            </label>
            <textarea
              rows={3}
              value={tradingPlan}
              onChange={(e) => setTradingPlan(e.target.value)}
              placeholder="What is your directional thesis? Bullish above X, bearish below Y..."
              className="w-full rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs text-[#EAF0F8] placeholder-[#8493A8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>

          {/* 3. Important Levels */}
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
            <label className="block text-xs font-semibold text-[#4095FF] mb-1.5 uppercase tracking-wider">
              3. Key Support, Resistance & Liquidity Levels
            </label>
            <textarea
              rows={3}
              value={importantLevels}
              onChange={(e) => setImportantLevels(e.target.value)}
              placeholder="Prior Day High (PDH), Prior Day Low (PDL), Overnight High/Low, FVG zones..."
              className="w-full rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs text-[#EAF0F8] placeholder-[#8493A8] focus:border-[#287BFF] focus:outline-none font-mono"
            />
          </div>

          {/* 4. Expected Market Direction */}
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
            <label className="block text-xs font-semibold text-[#4095FF] mb-1.5 uppercase tracking-wider">
              4. Expected Market Direction & Triggers
            </label>
            <textarea
              rows={3}
              value={expectedDirection}
              onChange={(e) => setExpectedDirection(e.target.value)}
              placeholder="What specific confirmation is required prior to risking capital?"
              className="w-full rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs text-[#EAF0F8] placeholder-[#8493A8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>

          {/* 5. Setups Watched */}
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
            <label className="block text-xs font-semibold text-[#4095FF] mb-1.5 uppercase tracking-wider">
              5. Trading Setups Monitored
            </label>
            <textarea
              rows={3}
              value={setupsWatched}
              onChange={(e) => setSetupsWatched(e.target.value)}
              placeholder="e.g. 15m ORB on NQ, 5m FVG sweep on ES, Breakout retest on BTC"
              className="w-full rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs text-[#EAF0F8] placeholder-[#8493A8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>
        </div>

        {/* Right Column: Execution Review & Psychology */}
        <div className="space-y-4">
          {/* 6. Trades Taken */}
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
            <label className="block text-xs font-semibold text-[#18C784] mb-1.5 uppercase tracking-wider">
              6. Executed Trades Summary
            </label>
            <textarea
              rows={3}
              value={tradesTakenSummary}
              onChange={(e) => setTradesTakenSummary(e.target.value)}
              placeholder="Summary of all entries, exits and rationale for the day..."
              className="w-full rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs text-[#EAF0F8] placeholder-[#8493A8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>

          {/* 7. Mistakes Made */}
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
            <label className="block text-xs font-semibold text-[#F05265] mb-1.5 uppercase tracking-wider">
              7. Mistakes Made & Rule Adherence
            </label>
            <textarea
              rows={3}
              value={mistakesMade}
              onChange={(e) => setMistakesMade(e.target.value)}
              placeholder="Did you enter prematurely? Did you chase price? Did you respect stop losses?"
              className="w-full rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs text-[#EAF0F8] placeholder-[#8493A8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>

          {/* 8. Emotional State */}
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
            <label className="block text-xs font-semibold text-[#4095FF] mb-1.5 uppercase tracking-wider">
              8. Emotional State & Mental Psychology
            </label>
            <textarea
              rows={3}
              value={emotionalState}
              onChange={(e) => setEmotionalState(e.target.value)}
              placeholder="How were your nerves? Did you feel greedy, fearful, rushed, or relaxed?"
              className="w-full rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs text-[#EAF0F8] placeholder-[#8493A8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>

          {/* 9. Lessons Learned */}
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
            <label className="block text-xs font-semibold text-[#18C784] mb-1.5 uppercase tracking-wider">
              9. Lessons Learned
            </label>
            <textarea
              rows={3}
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              placeholder="What did today's price action teach you? What can you replicate?"
              className="w-full rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs text-[#EAF0F8] placeholder-[#8493A8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>

          {/* 10. Tomorrow's Improvements */}
          <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
            <label className="block text-xs font-semibold text-[#4095FF] mb-1.5 uppercase tracking-wider">
              10. Tomorrow's Actionable Improvements
            </label>
            <textarea
              rows={3}
              value={improvementsTomorrow}
              onChange={(e) => setImprovementsTomorrow(e.target.value)}
              placeholder="1 or 2 specific behavioral commitments for the next trading session."
              className="w-full rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs text-[#EAF0F8] placeholder-[#8493A8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
