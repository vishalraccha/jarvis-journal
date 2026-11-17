import React, { useState } from 'react'
import {
  Menu,
  Calendar,
  Wallet,
  Coins,
  Plus,
  ChevronDown,
  Check,
  Power,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useFilter } from '@/context/FilterContext'
import { useSecurity } from '@/context/SecurityContext'
import { TimeFilterRange } from '@/types/database'
import { formatCurrency } from '@/lib/utils'

interface TopbarProps {
  onOpenMobileSidebar: () => void
  onOpenAddTrade: () => void
  onOpenSettings: () => void
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileSidebar,
  onOpenAddTrade,
  onOpenSettings,
}) => {
  const { accounts, activeAccount, setActiveAccount, currency, setCurrency, isSupabaseConnected } = useAuth()
  const { timeRange, setTimeRange, customStartDate, setCustomStartDate, customEndDate, setCustomEndDate } = useFilter()
  const { lock } = useSecurity()

  const [showCustomDates, setShowCustomDates] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)

  const currentBalance = activeAccount
    ? activeAccount.current_balance
    : accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0)

  const timeFilterOptions: { id: TimeFilterRange; label: string }[] = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom' },
  ]

  const currencies = ['USD', 'EUR', 'GBP', 'USDT']

  return (
    <header
      style={{ backgroundColor: 'var(--bg-surface, #10141E)', borderColor: 'var(--border-color, #202838)' }}
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b px-2 sm:px-4 lg:px-6 backdrop-blur-md"
    >
      {/* Left Area: Mobile Drawer Toggle & Global Date Filter */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          style={{ borderColor: 'var(--border-color, #202838)' }}
          className="rounded-lg border bg-[#141A26] p-2 text-[#8493A8] hover:text-[#E2E8F0] lg:hidden shrink-0"
          title="Open Navigation Menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Desktop Global Time Filter Pills */}
        <div style={{ borderColor: 'var(--border-color, #202838)' }} className="hidden sm:flex items-center gap-1 rounded-lg border bg-[#141A26]/80 p-1">
          {timeFilterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setTimeRange(opt.id)
                setShowCustomDates(opt.id === 'custom')
              }}
              style={{
                backgroundColor: timeRange === opt.id ? 'var(--accent-color, #3B82F6)' : undefined,
              }}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                timeRange === opt.id
                  ? 'text-white shadow-sm'
                  : 'text-[#8493A8] hover:text-[#E2E8F0]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Mobile Global Time Filter Dropdown */}
        <div style={{ borderColor: 'var(--border-color, #202838)' }} className="flex sm:hidden items-center rounded-lg border bg-[#141A26] px-2 py-1 text-xs">
          <Calendar className="mr-1 h-3.5 w-3.5 text-[#8493A8]" />
          <select
            value={timeRange}
            onChange={(e) => {
              const val = e.target.value as TimeFilterRange
              setTimeRange(val)
              setShowCustomDates(val === 'custom')
            }}
            className="bg-transparent font-medium text-xs text-[#E2E8F0] focus:outline-none cursor-pointer"
          >
            {timeFilterOptions.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-[#141A26] text-[#E2E8F0]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Date Range Popover/Inputs */}
        {timeRange === 'custom' && (
          <div style={{ borderColor: 'var(--border-color, #202838)' }} className="hidden md:flex items-center gap-2 rounded-lg border bg-[#141A26] px-2.5 py-1 text-xs">
            <span className="text-[#8493A8]">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded border border-[#202838] bg-[#10141E] px-1.5 py-0.5 text-xs text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
            />
            <span className="text-[#8493A8]">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded border border-[#202838] bg-[#10141E] px-1.5 py-0.5 text-xs text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Right Area: Account, Currency, Quick Add Trade, Power Off */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Account Selector & Balance */}
        <div className="relative">
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            style={{ borderColor: 'var(--border-color, #202838)' }}
            className="flex items-center gap-1.5 sm:gap-2.5 rounded-lg border bg-[#141A26] px-2 sm:px-3 py-1.5 text-xs text-[#E2E8F0] hover:border-[#3B82F6]/50 transition-colors cursor-pointer"
            title={`Selected: ${activeAccount?.name || 'All Accounts'} (Balance: ${formatCurrency(currentBalance, activeAccount?.currency || currency)})`}
          >
            <Wallet className="h-3.5 w-3.5 text-[#3B82F6] shrink-0" />
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <span className="max-w-[65px] sm:max-w-[110px] truncate font-medium text-[#E2E8F0]">
                {activeAccount?.name || 'All Accounts'}
              </span>
              <span className="text-[#8493A8] text-[10px]">•</span>
              <span className="font-mono font-bold text-[#18C784] text-xs shrink-0">
                {formatCurrency(currentBalance, activeAccount?.currency || currency)}
              </span>
            </div>
            <ChevronDown className="h-3 w-3 text-[#8493A8] shrink-0" />
          </button>

          {showAccountMenu && (
            <div
              style={{ borderColor: 'var(--border-color, #202838)' }}
              className="absolute right-0 mt-1.5 w-64 rounded-lg border bg-[#141A26] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-[#8493A8] uppercase">
                Switch Trading Account
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    setActiveAccount(null)
                    setShowAccountMenu(false)
                  }}
                  className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-xs transition-colors ${
                    activeAccount === null
                      ? 'bg-[#202838] text-white font-medium'
                      : 'text-[#8493A8] hover:bg-[#10141E] hover:text-[#E2E8F0]'
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-medium text-[#E2E8F0]">All Accounts (Combined)</span>
                    <span className="font-mono text-[10px] text-[#8493A8]">
                      Total Balance: {formatCurrency(accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0), currency)}
                    </span>
                  </div>
                  {activeAccount === null && <Check className="h-3.5 w-3.5 text-[#18C784]" />}
                </button>
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setActiveAccount(acc)
                      setShowAccountMenu(false)
                    }}
                    className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-xs transition-colors ${
                      activeAccount?.id === acc.id
                        ? 'bg-[#202838] text-white font-medium'
                        : 'text-[#8493A8] hover:bg-[#10141E] hover:text-[#E2E8F0]'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-medium text-[#E2E8F0]">{acc.name}</span>
                      <span className="font-mono text-[10px] text-[#8493A8]">
                        {acc.broker || acc.account_type.toUpperCase()} • <span className="text-[#18C784] font-semibold">{formatCurrency(acc.current_balance, acc.currency || currency)}</span>
                      </span>
                    </div>
                    {activeAccount?.id === acc.id && (
                      <Check className="h-3.5 w-3.5 text-[#18C784]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Currency Selector */}
        <div style={{ borderColor: 'var(--border-color, #202838)' }} className="hidden md:flex items-center rounded-lg border bg-[#141A26] px-2 py-1 text-xs">
          <Coins className="mr-1.5 h-3.5 w-3.5 text-[#8493A8]" />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-transparent font-mono text-xs text-[#E2E8F0] focus:outline-none cursor-pointer"
          >
            {currencies.map((c) => (
              <option key={c} value={c} className="bg-[#141A26] text-[#E2E8F0]">
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Supabase Status Pill */}
        <div
          title={isSupabaseConnected ? 'Connected to live Supabase PostgreSQL' : 'Local In-Memory Engine Active. Ready for Supabase link.'}
          style={{ borderColor: 'var(--border-color, #202838)' }}
          className="hidden lg:flex items-center gap-1.5 rounded-full border bg-[#141A26] px-2.5 py-1 text-[11px] text-[#8493A8]"
        >
          <span className={`h-2 w-2 rounded-full ${isSupabaseConnected ? 'bg-[#18C784]' : 'bg-[#3B82F6]'}`} />
          <span className="font-mono text-[10px]">
            {isSupabaseConnected ? 'SUPABASE LIVE' : 'SANDBOX MODE'}
          </span>
        </div>

        {/* Quick Add Trade Button */}
        <button
          onClick={onOpenAddTrade}
          style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
          className="flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Trade</span>
        </button>

        {/* Manual Power Off Button */}
        <button
          onClick={() => {
            if (confirm('Power off Jarvis Journal and terminate 12-hour session?')) {
              lock()
            }
          }}
          title="Manual Power Off (Lock Terminal Session)"
          className="flex items-center gap-1.5 rounded-lg border border-[#F05265]/40 bg-[#F05265]/10 px-2 sm:px-2.5 py-1.5 text-xs font-bold text-[#F05265] hover:bg-[#F05265] hover:text-white transition-all shadow-sm cursor-pointer"
        >
          <Power className="h-3.5 w-3.5" />
          <span className="hidden md:inline text-[11px]">Power Off</span>
        </button>
      </div>
    </header>
  )
}
