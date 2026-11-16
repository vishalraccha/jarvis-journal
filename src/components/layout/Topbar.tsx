import React, { useState } from 'react'
import {
  Menu,
  Calendar,
  Wallet,
  Coins,
  Plus,
  Bell,
  ChevronDown,
  Database,
  CheckCircle2,
  User,
  LogOut,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useFilter } from '@/context/FilterContext'
import { TimeFilterRange } from '@/types/database'

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
  const { profile, accounts, activeAccount, setActiveAccount, currency, setCurrency, isSupabaseConnected, logout } = useAuth()
  const { timeRange, setTimeRange, customStartDate, setCustomStartDate, customEndDate, setCustomEndDate } = useFilter()

  const [showCustomDates, setShowCustomDates] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#263448] bg-[#090D14]/95 px-4 backdrop-blur-md lg:px-6">
      {/* Left Area: Mobile Toggle & Global Date Filter */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded-md border border-[#263448] bg-[#101722] p-2 text-[#8493A8] hover:text-[#EAF0F8] lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Global Time Filter Pills */}
        <div className="hidden items-center gap-1 rounded-lg border border-[#263448] bg-[#101722] p-1 sm:flex">
          {timeFilterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setTimeRange(opt.id)
                if (opt.id === 'custom') {
                  setShowCustomDates(true)
                } else {
                  setShowCustomDates(false)
                }
              }}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                timeRange === opt.id
                  ? 'bg-[#287BFF] text-white shadow-sm'
                  : 'text-[#8493A8] hover:text-[#EAF0F8]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Popover/Inputs */}
        {timeRange === 'custom' && (
          <div className="flex items-center gap-2 rounded-lg border border-[#263448] bg-[#101722] px-2.5 py-1 text-xs">
            <span className="text-[#8493A8]">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded border border-[#263448] bg-[#151E2B] px-1.5 py-0.5 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
            />
            <span className="text-[#8493A8]">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded border border-[#263448] bg-[#151E2B] px-1.5 py-0.5 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Right Area: Account, Currency, Quick Add Trade, Profile */}
      <div className="flex items-center gap-2.5">
        {/* Account Selector */}
        <div className="relative">
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            className="flex items-center gap-2 rounded-lg border border-[#263448] bg-[#101722] px-3 py-1.5 text-xs text-[#EAF0F8] hover:border-[#4095FF]/50 transition-colors"
          >
            <Wallet className="h-3.5 w-3.5 text-[#287BFF]" />
            <span className="max-w-[130px] truncate font-medium">
              {activeAccount?.name || 'All Accounts'}
            </span>
            <ChevronDown className="h-3 w-3 text-[#8493A8]" />
          </button>

          {showAccountMenu && (
            <div
              className="absolute right-0 mt-1.5 w-60 rounded-lg border border-[#263448] bg-[#151E2B] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setShowAccountMenu(false)}
            >
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8493A8]">
                Select Trading Account
              </div>
              <button
                onClick={() => setActiveAccount(null)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-left ${
                  !activeAccount ? 'bg-[#287BFF]/20 text-[#4095FF] font-medium' : 'text-[#8493A8] hover:bg-[#101722] hover:text-[#EAF0F8]'
                }`}
              >
                <span>Consolidated (All Accounts)</span>
              </button>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setActiveAccount(acc)}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-left ${
                    activeAccount?.id === acc.id
                      ? 'bg-[#287BFF]/20 text-[#4095FF] font-medium'
                      : 'text-[#8493A8] hover:bg-[#101722] hover:text-[#EAF0F8]'
                  }`}
                >
                  <div className="truncate">
                    <div className="font-medium text-[#EAF0F8] truncate">{acc.name}</div>
                    <div className="text-[10px] text-[#8493A8] capitalize">{acc.account_type} • {acc.currency}</div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#18C784]">
                    ${acc.current_balance.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Currency Selector */}
        <div className="hidden md:flex items-center rounded-lg border border-[#263448] bg-[#101722] px-2 py-1 text-xs">
          <Coins className="mr-1.5 h-3.5 w-3.5 text-[#8493A8]" />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-transparent font-mono text-xs text-[#EAF0F8] focus:outline-none cursor-pointer"
          >
            {currencies.map((c) => (
              <option key={c} value={c} className="bg-[#151E2B] text-[#EAF0F8]">
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Supabase Status Pill */}
        <div
          title={isSupabaseConnected ? 'Connected to live Supabase PostgreSQL' : 'Local In-Memory Engine Active. Ready for Supabase link.'}
          className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#263448] bg-[#101722] px-2.5 py-1 text-[11px] text-[#8493A8]"
        >
          <span className={`h-2 w-2 rounded-full ${isSupabaseConnected ? 'bg-[#18C784]' : 'bg-[#4095FF]'}`} />
          <span className="font-mono text-[10px]">
            {isSupabaseConnected ? 'SUPABASE LIVE' : 'SANDBOX MODE'}
          </span>
        </div>

        {/* Quick Add Trade Button */}
        <button
          onClick={onOpenAddTrade}
          className="flex items-center gap-1.5 rounded-lg bg-[#287BFF] px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#287BFF]/20 hover:bg-[#4095FF] transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Trade</span>
        </button>

        {/* Profile Avatar / Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#263448] bg-[#151E2B] text-[#8493A8] hover:text-[#EAF0F8] transition-colors"
          >
            <User className="h-4 w-4 text-[#287BFF]" />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 mt-1.5 w-52 rounded-lg border border-[#263448] bg-[#151E2B] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setShowUserMenu(false)}
            >
              <div className="border-b border-[#263448] px-3 py-2">
                <div className="text-xs font-semibold text-[#EAF0F8]">{profile?.full_name || 'Jarvis Trader'}</div>
                <div className="text-[10px] text-[#8493A8] truncate">@{profile?.username || 'trader'}</div>
              </div>
              <div className="py-1">
                <button
                  onClick={onOpenSettings}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-[#8493A8] hover:bg-[#101722] hover:text-[#EAF0F8]"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Profile & Settings</span>
                </button>
                <button
                  onClick={() => logout()}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-[#F05265] hover:bg-[#F05265]/10"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
