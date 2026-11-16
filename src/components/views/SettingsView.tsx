import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Sliders,
  Tag as TagIcon,
  Settings,
  Plus,
  Trash2,
  Database,
  Palette,
  Check,
  CheckCircle2,
  Globe,
  Coins,
  Shield,
  X,
} from 'lucide-react'
import { TradingAccount, Instrument, Tag, AccountType, AssetClass } from '@/types/database'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useTheme, THEMES, AppTheme } from '@/context/ThemeContext'

interface SettingsViewProps {
  initialTab?: string
  onTabChange?: (tab: string) => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialTab = 'trading-accounts',
  onTabChange,
}) => {
  const { accounts, reloadAccounts, profile, refreshProfile, currency, setCurrency } = useAuth()
  const { theme, setTheme } = useTheme()

  // Map route names to internal tabs
  const resolveTab = (t: string) => {
    if (t === 'trading-accounts') return 'accounts'
    if (t === 'instruments') return 'instruments'
    if (t === 'tags') return 'tags'
    if (t === 'preferences') return 'preferences'
    return 'accounts'
  }

  const [activeTab, setActiveTab] = useState<'accounts' | 'instruments' | 'tags' | 'preferences'>(
    resolveTab(initialTab)
  )

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTab(initialTab))
    }
  }, [initialTab])

  // --- ACCOUNTS STATE ---
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [accName, setAccName] = useState('')
  const [accType, setAccType] = useState<AccountType>('live')
  const [accBroker, setAccBroker] = useState('')
  const [accBalance, setAccBalance] = useState(10000)
  const [accCurrency, setAccCurrency] = useState('USD')

  // --- INSTRUMENTS STATE ---
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [isInstrumentModalOpen, setIsInstrumentModalOpen] = useState(false)
  const [instSymbol, setInstSymbol] = useState('')
  const [instName, setInstName] = useState('')
  const [instAssetClass, setInstAssetClass] = useState<AssetClass>('futures')
  const [instTickSize, setInstTickSize] = useState(0.25)
  const [instTickValue, setInstTickValue] = useState(5.0)
  const [instPointValue, setInstPointValue] = useState(20.0)
  const [instContractSize, setInstContractSize] = useState(1.0)
  const [instCommission, setInstCommission] = useState(2.25)

  // --- TAGS STATE ---
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagCategory, setSelectedTagCategory] = useState<string>('all')
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [tagName, setTagName] = useState('')
  const [tagCategory, setTagCategory] = useState<'setup' | 'mistake' | 'emotion' | 'market_condition' | 'general'>('setup')
  const [tagColor, setTagColor] = useState('#3B82F6')

  // Load data
  const loadData = async () => {
    const insts = await api.getInstruments()
    setInstruments(insts)
    const tgs = await api.getTags()
    setTags(tgs)
  }

  useEffect(() => {
    loadData()
  }, [])

  // --- ACCOUNT HANDLERS ---
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

  const handleDeleteAccount = async (id: string, name: string) => {
    if (confirm(`Delete trading account "${name}" permanently?`)) {
      await api.deleteTradingAccount(id)
      await reloadAccounts()
    }
  }

  // --- INSTRUMENT HANDLERS ---
  const handleCreateInstrument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instSymbol.trim() || !instName.trim()) return

    const newInst = await api.createInstrument({
      symbol: instSymbol.toUpperCase().trim(),
      name: instName.trim(),
      asset_class: instAssetClass,
      tick_size: Number(instTickSize),
      tick_value: Number(instTickValue),
      point_value: Number(instPointValue),
      contract_size: Number(instContractSize),
      default_commission: Number(instCommission),
      currency: 'USD',
    })

    setInstruments(prev => [...prev, newInst])
    setIsInstrumentModalOpen(false)
    setInstSymbol('')
    setInstName('')
  }

  const handleDeleteInstrument = async (id: string, sym: string) => {
    if (confirm(`Delete custom instrument "${sym}"?`)) {
      await api.deleteInstrument(id)
      setInstruments(prev => prev.filter(i => i.id !== id))
    }
  }

  // --- TAG HANDLERS ---
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName.trim()) return

    const newT = await api.createTag({
      user_id: 'user-jarvis-1',
      name: tagName.trim(),
      category: tagCategory,
      color: tagColor,
    })

    setTags(prev => [...prev, newT])
    setIsTagModalOpen(false)
    setTagName('')
  }

  const handleDeleteTag = async (id: string, name: string) => {
    if (confirm(`Delete tag "${name}"?`)) {
      await api.deleteTag(id)
      setTags(prev => prev.filter(t => t.id !== id))
    }
  }

  const filteredTags = selectedTagCategory === 'all'
    ? tags
    : tags.filter(t => t.category === selectedTagCategory)

  const handleTabSwitch = (t: 'accounts' | 'instruments' | 'tags' | 'preferences') => {
    setActiveTab(t)
    if (onTabChange) {
      if (t === 'accounts') onTabChange('trading-accounts')
      else onTabChange(t)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#202838] bg-[#141A26] p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#202838] text-[#3B82F6]">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E2E8F0]">Settings & Preferences</h2>
            <p className="text-xs text-[#8493A8]">Manage accounts, contract specifications, mistake tagging, and themes</p>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#202838] bg-[#10141E] p-1.5 text-xs">
        <button
          onClick={() => handleTabSwitch('accounts')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
            activeTab === 'accounts'
              ? 'bg-[#202838] text-white shadow-sm'
              : 'text-[#8493A8] hover:text-[#E2E8F0]'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Trading Accounts ({accounts.length})</span>
        </button>

        <button
          onClick={() => handleTabSwitch('instruments')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
            activeTab === 'instruments'
              ? 'bg-[#202838] text-white shadow-sm'
              : 'text-[#8493A8] hover:text-[#E2E8F0]'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Instruments & Contract Specs ({instruments.length})</span>
        </button>

        <button
          onClick={() => handleTabSwitch('tags')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
            activeTab === 'tags'
              ? 'bg-[#202838] text-white shadow-sm'
              : 'text-[#8493A8] hover:text-[#E2E8F0]'
          }`}
        >
          <TagIcon className="h-4 w-4" />
          <span>Tags & Mistakes ({tags.length})</span>
        </button>

        <button
          onClick={() => handleTabSwitch('preferences')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
            activeTab === 'preferences'
              ? 'bg-[#202838] text-white shadow-sm'
              : 'text-[#8493A8] hover:text-[#E2E8F0]'
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>Preferences & Themes</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. TRADING ACCOUNTS */}
      {/* ============================================================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-[#E2E8F0]">Trading Accounts</h3>
              <p className="text-xs text-[#8493A8]">Configure funded, evaluation, or live brokerage balances</p>
            </div>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#202838] border border-[#3B82F6]/40 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:border-[#3B82F6]"
            >
              <Plus className="h-3.5 w-3.5 text-[#3B82F6]" />
              <span>Add Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="rounded-xl border border-[#202838] bg-[#141A26] p-5 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#202838] pb-3 mb-3">
                    <span className="font-bold text-[#E2E8F0] text-sm">{acc.name}</span>
                    <span className="rounded bg-[#10141E] px-2 py-0.5 text-[10px] uppercase font-bold text-[#3B82F6]">
                      {acc.account_type}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-[#8493A8]">
                      <span>Broker / Firm:</span>
                      <span className="text-[#E2E8F0]">{acc.broker || 'Manual Entry'}</span>
                    </div>
                    <div className="flex justify-between text-[#8493A8]">
                      <span>Base Currency:</span>
                      <span className="font-mono text-[#E2E8F0]">{acc.currency}</span>
                    </div>
                    <div className="flex justify-between text-[#8493A8]">
                      <span>Starting Capital:</span>
                      <span className="font-mono text-[#E2E8F0]">${acc.initial_balance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#202838] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-[#8493A8] block">Current Balance</span>
                    <span className="font-mono text-base font-extrabold text-[#18C784]">
                      ${acc.current_balance.toLocaleString()}
                    </span>
                  </div>
                  {accounts.length > 1 && (
                    <button
                      onClick={() => handleDeleteAccount(acc.id, acc.name)}
                      className="rounded p-1.5 text-[#8493A8] hover:text-[#F05265] transition-colors"
                      title="Delete Account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. INSTRUMENTS & CONTRACT SPECIFICATIONS */}
      {/* ============================================================== */}
      {activeTab === 'instruments' && (
        <div className="rounded-xl border border-[#202838] bg-[#141A26] shadow-lg overflow-hidden">
          <div className="p-4 border-b border-[#202838] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#E2E8F0]">Instruments & Contract Specifications</h3>
              <p className="text-xs text-[#8493A8]">Point values, tick sizes, and default broker commissions used for automated calculations</p>
            </div>
            <button
              onClick={() => setIsInstrumentModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#202838] border border-[#3B82F6]/40 px-3.5 py-1.5 text-xs font-semibold text-white hover:border-[#3B82F6]"
            >
              <Plus className="h-3.5 w-3.5 text-[#3B82F6]" />
              <span>Add Custom Instrument</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-tabular">
              <thead className="border-b border-[#202838] bg-[#10141E] text-[#8493A8] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Asset Class</th>
                  <th className="py-3 px-3 text-right">Tick Size</th>
                  <th className="py-3 px-3 text-right">Tick Value</th>
                  <th className="py-3 px-3 text-right">Point Value</th>
                  <th className="py-3 px-3 text-right">Default Fee</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202838] bg-[#141A26]">
                {instruments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-[#1A2232] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#E2E8F0]">{inst.symbol}</td>
                    <td className="py-3 px-3 text-[#E2E8F0]">{inst.name}</td>
                    <td className="py-3 px-3 uppercase text-[#8493A8] text-[10px] font-semibold">{inst.asset_class}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#8493A8]">{inst.tick_size}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#8493A8]">${inst.tick_value}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#8493A8]">${inst.point_value}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#8493A8]">${inst.default_commission}</td>
                    <td className="py-3 px-3 text-right">
                      {inst.id.startsWith('inst-custom') || inst.id.startsWith('inst-') && Number(inst.id.replace('inst-', '')) > 20 ? (
                        <button
                          onClick={() => handleDeleteInstrument(inst.id, inst.symbol)}
                          className="rounded p-1 text-[#8493A8] hover:text-[#F05265]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-[#8493A8]">Standard</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. TAGS & MISTAKES */}
      {/* ============================================================== */}
      {activeTab === 'tags' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#202838] bg-[#141A26] p-4">
            <div>
              <h3 className="text-sm font-bold text-[#E2E8F0]">Execution Tags & Mistake Tracking</h3>
              <p className="text-xs text-[#8493A8]">Categorize your setups, identify emotional leaks, and tag psychological mistakes</p>
            </div>
            <button
              onClick={() => setIsTagModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#202838] border border-[#3B82F6]/40 px-3.5 py-1.5 text-xs font-semibold text-white hover:border-[#3B82F6]"
            >
              <Plus className="h-3.5 w-3.5 text-[#3B82F6]" />
              <span>Create Tag / Mistake</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {['all', 'setup', 'mistake', 'emotion', 'market_condition'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedTagCategory(cat)}
                className={`rounded-lg px-3 py-1 font-medium capitalize transition-all ${
                  selectedTagCategory === cat
                    ? 'bg-[#202838] text-white border border-[#3B82F6]/50'
                    : 'bg-[#10141E] text-[#8493A8] border border-[#202838] hover:text-[#E2E8F0]'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Tags Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredTags.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-[#202838] bg-[#141A26] p-3 shadow"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: t.color || '#3B82F6' }}
                  />
                  <div>
                    <span className="font-semibold text-xs text-[#E2E8F0]">{t.name}</span>
                    <span className="block text-[10px] text-[#8493A8] uppercase">{t.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTag(t.id, t.name)}
                  className="rounded p-1 text-[#8493A8] hover:text-[#F05265] transition-colors"
                  title="Delete Tag"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. PREFERENCES & THEMES */}
      {/* ============================================================== */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {/* THEME SELECTION SECTION */}
          <div className="rounded-xl border border-[#202838] bg-[#141A26] p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#202838] pb-3">
              <Palette className="h-5 w-5 text-[#3B82F6]" style={{ color: 'var(--accent-color, #3B82F6)' }} />
              <div>
                <h3 className="text-sm font-bold text-[#E2E8F0]">Terminal Color Theme</h3>
                <p className="text-xs text-[#8493A8]">Consistent institutional dark grey base with dynamic accent colors (Green, Orange, Blue, Yellow, Slate)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {(Object.keys(THEMES) as AppTheme[]).map((themeKey) => {
                const item = THEMES[themeKey]
                const isSelected = theme === themeKey
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => setTheme(themeKey)}
                    style={{
                      borderColor: isSelected ? item.accent : 'var(--border-color, #202838)',
                      boxShadow: isSelected ? `0 0 0 1px ${item.accent}` : undefined,
                    }}
                    className={`relative rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'bg-[#10141E]'
                        : 'border-[#202838] bg-[#10141E]/60 hover:border-[#202838]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.accent }} />
                        <span className="font-bold text-xs text-[#E2E8F0]">{item.name}</span>
                      </div>
                      {isSelected && (
                        <span
                          style={{ backgroundColor: item.accent }}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm"
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8493A8] mb-3 leading-relaxed">{item.description}</p>

                    {/* Palette swatch preview */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-[#202838]/60 text-[10px] text-[#8493A8]">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 rounded border border-[#202838]" style={{ backgroundColor: item.bg }} title="Dark Grey Background" />
                        <span className="h-3.5 w-3.5 rounded border border-[#202838]" style={{ backgroundColor: item.card }} title="Dark Grey Card" />
                        <span className="h-3.5 px-1.5 rounded font-mono text-[9px] font-bold text-center flex items-center justify-center text-white" style={{ backgroundColor: item.accent }} title="Accent Color">
                          {item.colorName}
                        </span>
                      </div>
                      <span className="font-medium text-[11px]" style={{ color: item.accent }}>
                        {isSelected ? 'Active' : 'Select'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* GENERAL PREFERENCES */}
          <div className="rounded-xl border border-[#202838] bg-[#141A26] p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#202838] pb-3">
              <Globe className="h-5 w-5 text-[#3B82F6]" />
              <div>
                <h3 className="text-sm font-bold text-[#E2E8F0]">Regional & Currency Settings</h3>
                <p className="text-xs text-[#8493A8]">Base reporting currency and trading session timezone</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#8493A8] mb-1.5 font-medium">Default Display Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-[#202838] bg-[#10141E] px-3 py-2 text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="USDT">USDT (₮)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1.5 font-medium">Trading Session Timezone</label>
                <select
                  defaultValue="America/New_York"
                  className="w-full rounded-lg border border-[#202838] bg-[#10141E] px-3 py-2 text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
                >
                  <option value="America/New_York">Eastern Time (New York / US Open)</option>
                  <option value="America/Chicago">Central Time (Chicago / CME Futures)</option>
                  <option value="UTC">UTC (Universal Time)</option>
                  <option value="Europe/London">London / GMT</option>
                  <option value="Asia/Tokyo">Tokyo / JST</option>
                  <option value="Asia/Kolkata">IST (India Standard Time)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SUPABASE CONNECTION STATUS */}
          <div className="rounded-xl border border-[#202838] bg-[#141A26] p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#202838] pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="h-5 w-5 text-[#3B82F6]" />
                <div>
                  <h3 className="text-sm font-bold text-[#E2E8F0]">Supabase PostgreSQL Synchronization</h3>
                  <p className="text-xs text-[#8493A8]">Row Level Security (RLS) encrypted database connection</p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${
                  isSupabaseConfigured
                    ? 'bg-[#18C784]/15 text-[#18C784] border border-[#18C784]/30'
                    : 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30'
                }`}
              >
                {isSupabaseConfigured ? 'CONNECTED' : 'LOCAL ENGINE READY'}
              </span>
            </div>

            <div className="text-xs text-[#8493A8] leading-relaxed space-y-2">
              <p>
                All your trading accounts, custom instruments, playbook setups, and journal entries are securely managed.
              </p>
              <div className="rounded-lg border border-[#202838] bg-[#10141E] p-3 font-mono text-[11px] text-[#E2E8F0]">
                VITE_SUPABASE_URL=https://your-project.supabase.co
                <br />
                VITE_SUPABASE_ANON_KEY=your-anon-key-here
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD CUSTOM INSTRUMENT MODAL --- */}
      {isInstrumentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-[#202838] bg-[#10141E] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#E2E8F0] mb-4">Add Custom Instrument</h3>
            <form onSubmit={handleCreateInstrument} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8493A8] mb-1">Symbol Ticker</label>
                <input
                  type="text"
                  value={instSymbol}
                  onChange={(e) => setInstSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. MNQ, MES, CL, EUR/JPY"
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] uppercase font-mono focus:border-[#3B82F6] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1">Full Instrument Name</label>
                <input
                  type="text"
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="e.g. Micro E-mini Nasdaq-100 Futures"
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1">Asset Class</label>
                <select
                  value={instAssetClass}
                  onChange={(e) => setInstAssetClass(e.target.value as AssetClass)}
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] capitalize focus:border-[#3B82F6] focus:outline-none"
                >
                  <option value="futures">Futures</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="stocks">Stocks / Equities</option>
                  <option value="forex">Forex</option>
                  <option value="commodities">Commodities</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#8493A8] mb-1">Tick Size</label>
                  <input
                    type="number"
                    step="any"
                    value={instTickSize}
                    onChange={(e) => setInstTickSize(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 font-mono text-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-[#8493A8] mb-1">Tick Value ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={instTickValue}
                    onChange={(e) => setInstTickValue(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 font-mono text-[#E2E8F0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#8493A8] mb-1">Point Value ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={instPointValue}
                    onChange={(e) => setInstPointValue(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 font-mono text-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-[#8493A8] mb-1">Roundtrip Commission ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={instCommission}
                    onChange={(e) => setInstCommission(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 font-mono text-[#E2E8F0]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#202838]">
                <button
                  type="button"
                  onClick={() => setIsInstrumentModalOpen(false)}
                  className="rounded-lg border border-[#202838] bg-[#141A26] px-4 py-2 text-[#8493A8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#202838] border border-[#3B82F6]/60 px-4 py-2 font-bold text-white hover:border-[#3B82F6]"
                >
                  Save Instrument
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD TAG MODAL --- */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-[#202838] bg-[#10141E] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#E2E8F0] mb-4">Create Tag or Mistake</h3>
            <form onSubmit={handleCreateTag} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8493A8] mb-1">Tag Name</label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="e.g. Premature Profit Take, Trend Pullback"
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1">Category</label>
                <select
                  value={tagCategory}
                  onChange={(e) => setTagCategory(e.target.value as any)}
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] capitalize focus:border-[#3B82F6] focus:outline-none"
                >
                  <option value="setup">Trading Setup</option>
                  <option value="mistake">Execution Mistake</option>
                  <option value="emotion">Emotional State</option>
                  <option value="market_condition">Market Condition</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1">Color Marker</label>
                <div className="flex items-center gap-2">
                  {['#3B82F6', '#18C784', '#F05265', '#EAB308', '#A855F7', '#EC4899', '#64748B'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setTagColor(col)}
                      className={`h-6 w-6 rounded-full transition-transform ${tagColor === col ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#202838]">
                <button
                  type="button"
                  onClick={() => setIsTagModalOpen(false)}
                  className="rounded-lg border border-[#202838] bg-[#141A26] px-4 py-2 text-[#8493A8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#202838] border border-[#3B82F6]/60 px-4 py-2 font-bold text-white hover:border-[#3B82F6]"
                >
                  Save Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD ACCOUNT MODAL --- */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-[#202838] bg-[#10141E] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#E2E8F0] mb-4">Add Trading Account</h3>
            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8493A8] mb-1">Account Name</label>
                <input
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g. Apex 50k Futures #2"
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1">Account Type</label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as AccountType)}
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none capitalize"
                >
                  <option value="live">Live Account</option>
                  <option value="evaluation">Evaluation (Prop Firm)</option>
                  <option value="funded">Funded Prop Account</option>
                  <option value="demo">Demo / Paper</option>
                </select>
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1">Broker / Platform</label>
                <input
                  type="text"
                  value={accBroker}
                  onChange={(e) => setAccBroker(e.target.value)}
                  placeholder="e.g. Tradovate, Interactive Brokers, Binance"
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1">Starting Capital ($)</label>
                <input
                  type="number"
                  value={accBalance}
                  onChange={(e) => setAccBalance(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 font-mono text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#202838]">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="rounded-lg border border-[#202838] bg-[#141A26] px-4 py-2 text-[#8493A8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#202838] border border-[#3B82F6]/60 px-4 py-2 font-bold text-white hover:border-[#3B82F6]"
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
