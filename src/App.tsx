import React, { useState, useEffect } from 'react'
import { Sidebar, NavTab } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { DashboardView } from '@/components/views/DashboardView'
import { TradeLogView } from '@/components/views/TradeLogView'
import { JournalingView } from '@/components/views/JournalingView'
import { AnalyticsView } from '@/components/views/AnalyticsView'
import { ReportsView } from '@/components/views/ReportsView'
import { StrategiesView } from '@/components/views/StrategiesView'
import { TradeReplayView } from '@/components/views/TradeReplayView'
import { BacktestingView } from '@/components/views/BacktestingView'
import { AIInsightsView } from '@/components/views/AIInsightsView'
import { RoutinesView } from '@/components/views/RoutinesView'
import { ProgressTrackerView } from '@/components/views/ProgressTrackerView'
import { SettingsView } from '@/components/views/SettingsView'
import { AddTradeModal } from '@/components/trades/AddTradeModal'
import { TradeDetailModal } from '@/components/trades/TradeDetailModal'
import { ImportTradesModal } from '@/components/trades/ImportTradesModal'
import { api } from '@/services/api'
import { Trade, Strategy } from '@/types/database'
import { useAuth } from '@/context/AuthContext'
import { useFilter } from '@/context/FilterContext'

export const App: React.FC = () => {
  const { activeAccount } = useAuth()
  const { timeRange, filterDateRange, selectedAccountId } = useFilter()

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard')
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState<boolean>(false)

  // Global Trades & Strategies Data
  const [trades, setTrades] = useState<Trade[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [isLoadingTrades, setIsLoadingTrades] = useState<boolean>(true)

  // Selected trade for detail modal
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [isTradeDetailOpen, setIsTradeDetailOpen] = useState<boolean>(false)

  // Modals state
  const [isAddTradeOpen, setIsAddTradeOpen] = useState<boolean>(false)
  const [isImportTradesOpen, setIsImportTradesOpen] = useState<boolean>(false)

  // Journaling jump date
  const [journalDate, setJournalDate] = useState<string | undefined>(undefined)

  const loadData = async () => {
    try {
      setIsLoadingTrades(true)
      const fetchedTrades = await api.getTrades({
        accountId: activeAccount?.id || selectedAccountId,
        timeRange,
        startDate: filterDateRange.start,
        endDate: filterDateRange.end,
      })
      setTrades(fetchedTrades)

      const fetchedStrategies = await api.getStrategies()
      setStrategies(fetchedStrategies)
    } catch (err) {
      console.error('Failed to load trades:', err)
    } finally {
      setIsLoadingTrades(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeAccount, timeRange, filterDateRange, selectedAccountId])

  const handleOpenTradeDetail = (trade: Trade) => {
    setSelectedTrade(trade)
    setIsTradeDetailOpen(true)
  }

  const handleOpenDayJournal = (dateStr: string) => {
    setJournalDate(dateStr)
    setCurrentTab('journaling')
  }

  const handleDeleteTrade = async (id: string) => {
    await api.deleteTrade(id)
    await loadData()
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090D14] text-[#EAF0F8]">
      {/* 1. Persistent Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab)
          window.scrollTo(0, 0)
        }}
        isOpenMobile={isOpenMobileSidebar}
        onCloseMobile={() => setIsOpenMobileSidebar(false)}
      />

      {/* 2. Main Terminal Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar
          onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
          onOpenAddTrade={() => setIsAddTradeOpen(true)}
          onOpenSettings={() => setCurrentTab('preferences')}
        />

        {/* View Router */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {currentTab === 'dashboard' && (
              <DashboardView
                trades={trades}
                onOpenTradeDetail={handleOpenTradeDetail}
                onOpenDayJournal={handleOpenDayJournal}
              />
            )}

            {currentTab === 'trade-log' && (
              <TradeLogView
                trades={trades}
                onOpenTradeDetail={handleOpenTradeDetail}
                onOpenAddTrade={() => setIsAddTradeOpen(true)}
                onOpenImportTrades={() => setIsImportTradesOpen(true)}
                onDeleteTrade={handleDeleteTrade}
              />
            )}

            {currentTab === 'journaling' && (
              <JournalingView
                initialDate={journalDate}
                trades={trades}
              />
            )}

            {currentTab === 'calendar' && (
              <DashboardView
                trades={trades}
                onOpenTradeDetail={handleOpenTradeDetail}
                onOpenDayJournal={handleOpenDayJournal}
              />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView trades={trades} />
            )}

            {currentTab === 'reports' && (
              <ReportsView trades={trades} />
            )}

            {currentTab === 'strategies' && (
              <StrategiesView
                strategies={strategies}
                trades={trades}
                onRefresh={loadData}
              />
            )}

            {currentTab === 'trade-replay' && (
              <TradeReplayView trades={trades} />
            )}

            {currentTab === 'backtesting' && (
              <BacktestingView strategies={strategies} />
            )}

            {currentTab === 'ai-insights' && (
              <AIInsightsView trades={trades} />
            )}

            {currentTab === 'routines' && (
              <RoutinesView />
            )}

            {currentTab === 'progress-tracker' && (
              <ProgressTrackerView />
            )}

            {(currentTab === 'trading-accounts' || currentTab === 'instruments' || currentTab === 'tags' || currentTab === 'preferences') && (
              <SettingsView />
            )}
          </div>
        </main>
      </div>

      {/* 3. Global Modals */}
      <AddTradeModal
        isOpen={isAddTradeOpen}
        onClose={() => setIsAddTradeOpen(false)}
        onTradeAdded={loadData}
      />

      <TradeDetailModal
        trade={selectedTrade}
        isOpen={isTradeDetailOpen}
        onClose={() => {
          setIsTradeDetailOpen(false)
          setSelectedTrade(null)
        }}
      />

      <ImportTradesModal
        isOpen={isImportTradesOpen}
        onClose={() => setIsImportTradesOpen(false)}
        onImportComplete={loadData}
      />
    </div>
  )
}
export default App
