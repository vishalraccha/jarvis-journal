import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Sliders,
  Tag,
  Settings,
  Plus,
  Trash2,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react'
import { TradingAccount, Instrument, AccountType, AssetClass } from '@/types/database'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'

export const SettingsView: React.FC = () => {
  const { accounts, reloadAccounts, profile, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'accounts' | 'instruments' | 'supabase'>('accounts')

  // Accounts form
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [accName, setAccName] = useState('')
  const [accType, setAccType] = useState<AccountType>('live')
  const [accBroker, setAccBroker] = useState('')
  const [accBalance, setAccBalance] = useState(25000)
  const [accCurrency, setAccCurrency] = useState('USD')

  // Instruments
  const [instruments, setInstruments] = useState<Instrument[]>([])

  useEffect(() => {
    api.getInstruments().then(setInstruments)
  }, [])

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accName.trim()) return

    await api.createTradingAccount({
      user_id: 'user-jarvis-1',
      name: accName,
      account_type: accType,
      broker: accBroker || null,
      initial_balance: Number(accBalance),
      current_balance: Number(accBalance),
      currency: accCurrency,
      is_default: accounts.length === 0,
      is_active: true,
    })

    setIsAccountModalOpen(false)
    setAccName('')
    await reloadAccounts()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#263448] bg-[#151E2B] p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#287BFF]/20 text-[#4095FF]">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#EAF0F8]">Terminal Settings & Configuration</h2>
            <p className="text-xs text-[#8493A8]">Manage accounts, contract specifications, and database synchronization</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 rounded-xl border border-[#263448] bg-[#151E2B] p-2 text-xs">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
            activeTab === 'accounts'
              ? 'bg-[#287BFF] text-white shadow-md'
              : 'text-[#8493A8] hover:bg-[#101722] hover:text-[#EAF0F8]'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Trading Accounts</span>
        </button>
        <button
          onClick={() => setActiveTab('instruments')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
            activeTab === 'instruments'
              ? 'bg-[#287BFF] text-white shadow-md'
              : 'text-[#8493A8] hover:bg-[#101722] hover:text-[#EAF0F8]'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Contract Specs & Instruments</span>
        </button>
        <button
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
            activeTab === 'supabase'
              ? 'bg-[#287BFF] text-white shadow-md'
              : 'text-[#8493A8] hover:bg-[#101722] hover:text-[#EAF0F8]'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Supabase PostgreSQL Integration</span>
        </button>
      </div>

      {/* 1. Accounts Manager */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-[#EAF0F8]">Configured Trading Accounts ({accounts.length})</h3>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#287BFF] px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-[#4095FF]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="rounded-xl border border-[#263448] bg-[#151E2B] p-5 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#263448] pb-3 mb-3">
                    <span className="font-bold text-[#EAF0F8] text-sm">{acc.name}</span>
                    <span className="rounded bg-[#101722] px-2 py-0.5 text-[10px] uppercase font-bold text-[#4095FF]">
                      {acc.account_type}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-[#8493A8]">
                      <span>Broker:</span>
                      <span className="text-[#EAF0F8]">{acc.broker || 'Manual Entry'}</span>
                    </div>
                    <div className="flex justify-between text-[#8493A8]">
                      <span>Currency:</span>
                      <span className="font-mono text-[#EAF0F8]">{acc.currency}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#263448] flex items-center justify-between">
                  <span className="text-xs text-[#8493A8]">Current Balance:</span>
                  <span className="font-mono text-base font-extrabold text-[#18C784]">
                    ${acc.current_balance.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Instruments Specifications */}
      {activeTab === 'instruments' && (
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] shadow-lg overflow-hidden">
          <div className="p-4 border-b border-[#263448]">
            <h3 className="text-sm font-bold text-[#EAF0F8]">Financial Contract Specifications</h3>
            <p className="text-xs text-[#8493A8]">Tick size, tick value, point values and commission defaults</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-tabular">
              <thead className="border-b border-[#263448] bg-[#101722] text-[#8493A8] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Asset Class</th>
                  <th className="py-3 px-3 text-right">Tick Size</th>
                  <th className="py-3 px-3 text-right">Tick Value</th>
                  <th className="py-3 px-3 text-right">Point Value</th>
                  <th className="py-3 px-3 text-right">Default Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263448] bg-[#151E2B]">
                {instruments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-[#1A2536]">
                    <td className="py-3 px-4 font-mono font-bold text-[#EAF0F8]">{inst.symbol}</td>
                    <td className="py-3 px-3 text-[#EAF0F8]">{inst.name}</td>
                    <td className="py-3 px-3 uppercase text-[#8493A8]">{inst.asset_class}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#8493A8]">{inst.tick_size}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#8493A8]">${inst.tick_value}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#8493A8]">${inst.point_value}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#8493A8]">${inst.default_commission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Supabase Integration */}
      {activeTab === 'supabase' && (
        <div className="rounded-xl border border-[#263448] bg-[#151E2B] p-6 shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-[#263448] pb-4">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-[#287BFF]" />
              <div>
                <h3 className="text-base font-bold text-[#EAF0F8]">Supabase PostgreSQL Connection</h3>
                <p className="text-xs text-[#8493A8]">Row Level Security (RLS) data persistence layer</p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${
                isSupabaseConfigured
                  ? 'bg-[#18C784]/15 text-[#18C784] border border-[#18C784]/30'
                  : 'bg-[#4095FF]/15 text-[#4095FF] border border-[#4095FF]/30'
              }`}
            >
              {isSupabaseConfigured ? 'CONNECTED' : 'LOCAL ENGINE READY'}
            </span>
          </div>

          <div className="text-xs text-[#8493A8] leading-relaxed space-y-3">
            <p>
              Jarvis Journal connects directly to your Supabase project with Row Level Security. All trades, journals, strategies, and backtest sessions are isolated strictly to your authenticated user account.
            </p>
            <div className="rounded-lg border border-[#263448] bg-[#101722] p-4 font-mono text-xs text-[#EAF0F8] space-y-1">
              <div># Set in .env or Render/Vercel environment variables:</div>
              <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
              <div>VITE_SUPABASE_ANON_KEY=your-anon-key-here</div>
            </div>
            <p>
              Database migrations with all 23 normalized tables, triggers, and seed data are located in{' '}
              <code className="text-[#4095FF]">supabase/migrations/20261116000000_jarvis_journal_schema.sql</code>.
            </p>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-[#263448] bg-[#090D14] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#EAF0F8] mb-4">Add Trading Account</h3>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs text-[#8493A8] mb-1">Account Name</label>
                <input
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g. Apex 50k Futures #2"
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#8493A8] mb-1">Account Type</label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as AccountType)}
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none capitalize"
                >
                  <option value="live">Live Account</option>
                  <option value="evaluation">Evaluation (Prop Firm)</option>
                  <option value="funded">Funded Prop Account</option>
                  <option value="demo">Demo / Paper</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#8493A8] mb-1">Broker / Platform</label>
                <input
                  type="text"
                  value={accBroker}
                  onChange={(e) => setAccBroker(e.target.value)}
                  placeholder="e.g. Tradovate, Interactive Brokers, Binance"
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8493A8] mb-1">Starting Balance</label>
                <input
                  type="number"
                  value={accBalance}
                  onChange={(e) => setAccBalance(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#263448] bg-[#101722] px-3 py-2 font-mono text-xs text-[#EAF0F8] focus:border-[#287BFF] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#263448]">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="rounded-lg border border-[#263448] bg-[#101722] px-4 py-2 text-xs text-[#8493A8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#287BFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4095FF]"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
