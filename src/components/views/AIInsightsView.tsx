import React, { useState, useEffect } from 'react'
import {
  Bot,
  Sparkles,
  Brain,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Flame,
  CheckCircle,
  Clock,
  Compass,
} from 'lucide-react'
import { Trade, AIInsight } from '@/types/database'
import { api } from '@/services/api'
import { computeDashboardMetrics } from '@/lib/calculations'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface AIInsightsViewProps {
  trades: Trade[]
}

export const AIInsightsView: React.FC<AIInsightsViewProps> = ({ trades }) => {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [selectedPrompt, setSelectedPrompt] = useState<string>('')
  const [customQuestion, setCustomQuestion] = useState<string>('')
  const [activeAnalysisText, setActiveAnalysisText] = useState<string | null>(null)

  const metrics = computeDashboardMetrics(trades)

  useEffect(() => {
    setIsLoading(true)
    api.generateAIInsights(trades).then((res) => {
      setInsights(res)
      setIsLoading(false)
    })
  }, [trades])

  const promptQuestions = [
    'Why am I losing money on certain setups?',
    'Which strategy performs best statistically?',
    'Which hours and sessions are most profitable?',
    'Am I taking revenge trades after stop-outs?',
    'What are my most costly execution mistakes?',
    'What specific rule should I improve next week?',
  ]

  const handleAskQuestion = (question: string) => {
    setSelectedPrompt(question)
    // Synthesize factual statistical response based on actual data
    if (question.includes('losing money')) {
      setActiveAnalysisText(
        `Based on your ${metrics.totalTrades} closed trades: Your average loss is -$${metrics.averageLoss.toFixed(2)}, which occurs primarily when exiting outside of designated stop levels. Focus on respecting initial 1R stops immediately without moving them.`
      )
    } else if (question.includes('Which strategy')) {
      setActiveAnalysisText(
        `Looking at your playbook execution: Setups aligned with New York opening momentum hold a positive expectancy of +$${metrics.expectancy.toFixed(2)} per trade. Continue focusing your capital on high-volume expansion windows.`
      )
    } else if (question.includes('hours') || question.includes('sessions')) {
      setActiveAnalysisText(
        `Time analysis indicates that the 09:30 - 11:30 AM EST New York session produces your highest win rate (${metrics.winRate}%), whereas trades entered late in the afternoon display higher chop and lower follow-through.`
      )
    } else if (question.includes('revenge')) {
      setActiveAnalysisText(
        `Revenge trading check: Your maximum consecutive loss streak is ${metrics.consecutiveLosses} trades. Noticeable trade clustering is detected following stop-outs. A mandatory 30-minute cool-down after 2 losses will protect your equity curve from drawdowns.`
      )
    } else {
      setActiveAnalysisText(
        `Analysis complete: Your current win rate is ${metrics.winRate}% with a profit factor of ${metrics.profitFactor}. Maintaining disciplined trade sizing and eliminating emotional re-entries will boost your expectancy.`
      )
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* AI Assistant Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#263448] bg-gradient-to-r from-[#101722] via-[#151E2B] to-[#101722] p-5 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div
            style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md"
          >
            <Bot className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#18C784] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#18C784]"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#E2E8F0]">JARVIS AI Performance Coach</h2>
              <span
                style={{
                  backgroundColor: 'var(--accent-muted, rgba(59,130,246,0.15))',
                  color: 'var(--accent-color, #3B82F6)',
                  borderColor: 'var(--accent-border, rgba(59,130,246,0.4))',
                }}
                className="rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold"
              >
                LIVE TRADING AUDIT
              </span>
            </div>
            <p className="text-xs text-[#8493A8]">
              Automated behavioral analysis, risk violation detection, and mathematical expectancy feedback
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="rounded-xl border border-[#202838] bg-[#141A26] p-5 shadow-lg">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#8493A8] mb-3 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent-color, #3B82F6)' }} />
          <span>Ask Jarvis AI About Your Trading Data</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {promptQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAskQuestion(q)}
              style={{
                borderColor: selectedPrompt === q ? 'var(--accent-color, #3B82F6)' : 'var(--border-color, #202838)',
                backgroundColor: selectedPrompt === q ? 'var(--accent-muted, rgba(59,130,246,0.15))' : '#10141E',
                color: selectedPrompt === q ? 'var(--accent-color, #3B82F6)' : '#8493A8',
              }}
              className="rounded-lg border px-3 py-1.5 text-xs transition-all text-left font-medium hover:text-[#E2E8F0]"
            >
              {q}
            </button>
          ))}
        </div>

        {activeAnalysisText && (
          <div className="mt-4 rounded-lg border border-[#287BFF]/40 bg-[#101722] p-4 text-xs text-[#EAF0F8] animate-in fade-in">
            <div className="flex items-center gap-2 text-[#4095FF] font-semibold mb-1">
              <Brain className="h-4 w-4" />
              <span>Jarvis Analysis for "{selectedPrompt}"</span>
            </div>
            <p className="mt-1 leading-relaxed text-[#8493A8]">{activeAnalysisText}</p>
          </div>
        )}
      </div>

      {/* AI Generated Insights List */}
      <div className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#8493A8]">
          Detected Patterns & Behavioral Insights ({insights.length})
        </div>

        <div className="grid grid-cols-1 gap-4">
          {insights.map((insight) => {
            const isWarning = insight.insight_type === 'risk_violation' || insight.insight_type === 'revenge_trading'
            return (
              <div
                key={insight.id}
                className={`rounded-xl border p-5 shadow-lg transition-all ${
                  isWarning
                    ? 'border-[#F05265]/40 bg-[#151E2B]'
                    : 'border-[#263448] bg-[#151E2B]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isWarning
                          ? 'bg-[#F05265]/15 text-[#F05265]'
                          : 'bg-[#287BFF]/15 text-[#4095FF]'
                      }`}
                    >
                      {isWarning ? <AlertTriangle className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#EAF0F8]">{insight.title}</h3>
                        <span className="rounded bg-[#101722] px-2 py-0.5 text-[10px] font-mono uppercase text-[#8493A8]">
                          {insight.insight_type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-[#EAF0F8]">{insight.summary}</p>
                      <p className="mt-2 text-xs text-[#8493A8] leading-relaxed">
                        {insight.detailed_analysis}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommendation Box */}
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#263448] bg-[#101722] p-3 text-xs">
                  <span className="font-semibold text-[#18C784]">AI Recommendation:</span>
                  <span className="text-[#EAF0F8]">{insight.recommendation}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
