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
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
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
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null)

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
  const [isSubmittingInstrument, setIsSubmittingInstrument] = useState(false)
  const [instrumentError, setInstrumentError] = useState<string | null>(null)
  const [instrumentSuccess, setInstrumentSuccess] = useState<string | null>(null)

  // --- TAGS STATE ---
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagCategory, setSelectedTagCategory] = useState<string>('all')
  const [isTagModalOpen, setIsTagModalOpen] = useState(false)
  const [tagName, setTagName] = useState('')
  const [tagCategory, setTagCategory] = useState<'setup' | 'mistake' | 'emotion' | 'market_condition' | 'general'>('setup')
  const [tagColor, setTagColor] = useState('#3B82F6')
  const [isSubmittingTag, setIsSubmittingTag] = useState(false)
  const [tagError, setTagError] = useState<string | null>(null)
  const [tagSuccess, setTagSuccess] = useState<string | null>(null)

  // --- DATABASE HEALTH STATE ---
  const [dbHealth, setDbHealth] = useState<{ isConnected: boolean; tablesExist: boolean; error?: string } | null>(null)
  const [isProbingDb, setIsProbingDb] = useState(false)
  const [hasCopiedSql, setHasCopiedSql] = useState(false)

  // Load data
  const loadData = async () => {
    try {
      const insts = await api.getInstruments()
      setInstruments(insts)
      const tgs = await api.getTags()
      setTags(tgs)
      checkDbHealth()
    } catch (err) {
      console.error('Error loading settings data:', err)
    }
  }

  const checkDbHealth = async () => {
    setIsProbingDb(true)
    try {
      const health = await api.checkDatabaseHealth()
      setDbHealth(health)
    } finally {
      setIsProbingDb(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // --- ACCOUNT HANDLERS ---
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accName.trim()) {
      setAccountError('Account name is required.')
      return
    }

    setIsSubmittingAccount(true)
    setAccountError(null)
    setAccountSuccess(null)

    try {
      const newAcc = await api.createTradingAccount({
        user_id: 'user-jarvis-1',
        name: accName.trim(),
        account_type: accType,
        broker: accBroker.trim() || null,
        initial_balance: Number(accBalance) || 0,
        current_balance: Number(accBalance) || 0,
        currency: accCurrency,
        is_default: accounts.length === 0,
        is_active: true,
      })

      setAccountSuccess(`Account "${newAcc.name}" created successfully!`)
      await reloadAccounts()

      setTimeout(() => {
        setIsAccountModalOpen(false)
        setAccName('')
        setAccBroker('')
        setAccountSuccess(null)
        setIsSubmittingAccount(false)
      }, 500)
    } catch (err: any) {
      console.error('Error creating trading account:', err)
      setAccountError(err.message || 'An error occurred while creating the trading account.')
      setIsSubmittingAccount(false)
    }
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
    if (!instSymbol.trim() || !instName.trim()) {
      setInstrumentError('Symbol and full instrument name are required.')
      return
    }

    setIsSubmittingInstrument(true)
    setInstrumentError(null)
    setInstrumentSuccess(null)

    try {
      const newInst = await api.createInstrument({
        symbol: instSymbol.toUpperCase().trim(),
        name: instName.trim(),
        asset_class: instAssetClass,
        tick_size: Number(instTickSize) || 0.01,
        tick_value: Number(instTickValue) || 1.0,
        point_value: Number(instPointValue) || 1.0,
        contract_size: Number(instContractSize) || 1.0,
        default_commission: Number(instCommission) || 0.0,
        currency: 'USD',
      })

      setInstruments(prev => [...prev, newInst])
      setInstrumentSuccess(`Instrument "${newInst.symbol}" added successfully!`)

      setTimeout(() => {
        setIsInstrumentModalOpen(false)
        setInstSymbol('')
        setInstName('')
        setInstrumentSuccess(null)
        setIsSubmittingInstrument(false)
      }, 500)
    } catch (err: any) {
      console.error('Error creating instrument:', err)
      setInstrumentError(err.message || 'Failed to create instrument.')
      setIsSubmittingInstrument(false)
    }
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
    if (!tagName.trim()) {
      setTagError('Tag name is required.')
      return
    }

    setIsSubmittingTag(true)
    setTagError(null)
    setTagSuccess(null)

    try {
      const newT = await api.createTag({
        user_id: 'user-jarvis-1',
        name: tagName.trim(),
        category: tagCategory,
        color: tagColor,
      })

      setTags(prev => [...prev, newT])
      setTagSuccess(`Tag "${newT.name}" created successfully!`)

      setTimeout(() => {
        setIsTagModalOpen(false)
        setTagName('')
        setTagSuccess(null)
        setIsSubmittingTag(false)
      }, 500)
    } catch (err: any) {
      console.error('Error creating tag:', err)
      setTagError(err.message || 'Failed to create tag.')
      setIsSubmittingTag(false)
    }
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202838] pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="h-5 w-5 text-[#3B82F6]" />
                <div>
                  <h3 className="text-sm font-bold text-[#E2E8F0]">Supabase PostgreSQL Cloud Database</h3>
                  <p className="text-xs text-[#8493A8]">Row-Level Security (RLS) encrypted database connection</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={checkDbHealth}
                  disabled={isProbingDb}
                  className="flex items-center gap-1.5 rounded-lg border border-[#202838] bg-[#10141E] px-2.5 py-1 text-xs text-[#8493A8] hover:text-[#E2E8F0] transition-colors"
                  title="Re-check Supabase database connection and tables"
                >
                  <RefreshCw className={`h-3 w-3 ${isProbingDb ? 'animate-spin text-[#3B82F6]' : ''}`} />
                  <span>{isProbingDb ? 'Checking...' : 'Check Status'}</span>
                </button>
                <span
                  className={`rounded-full px-3 py-1 font-mono text-xs font-bold border ${
                    dbHealth?.tablesExist
                      ? 'bg-[#18C784]/15 text-[#18C784] border-[#18C784]/30'
                      : isSupabaseConfigured
                      ? 'bg-[#EAB308]/15 text-[#EAB308] border-[#EAB308]/30'
                      : 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30'
                  }`}
                >
                  {dbHealth?.tablesExist
                    ? 'CONNECTED & TABLES LIVE'
                    : isSupabaseConfigured
                    ? 'LINKED (TABLES SETUP PENDING)'
                    : 'LOCAL ENGINE READY'}
                </span>
              </div>
            </div>

            {/* If tables are missing, provide clear notice and 1-click copy SQL script */}
            {isSupabaseConfigured && !dbHealth?.tablesExist && (
              <div className="rounded-lg border border-[#EAB308]/30 bg-[#EAB308]/10 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-[#EAB308] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#EAF0F8]">
                      Database Tables Pending in Your Supabase Project
                    </p>
                    <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                      Your Supabase credentials (<span className="font-mono text-[#EAB308]">hclxoemiitxjzvlvvbci</span>) are configured, but the database tables have not been created in Supabase yet. Current trades and accounts run seamlessly in your local terminal session.
                    </p>
                    <p className="text-[11px] text-[#8493A8]">
                      To activate permanent cloud sync, copy the 1-click setup SQL below, paste it into your Supabase SQL Editor, and click <strong>Run</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const sql = `-- JARVIS JOURNAL DIRECT SETUP
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.profiles (id TEXT PRIMARY KEY DEFAULT 'user-jarvis-1', username TEXT DEFAULT 'trader', full_name TEXT DEFAULT 'Jarvis Trader', avatar_url TEXT, base_currency TEXT DEFAULT 'USD' NOT NULL, timezone TEXT DEFAULT 'America/New_York' NOT NULL, onboarding_completed BOOLEAN DEFAULT true NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
INSERT INTO public.profiles (id, username, full_name, base_currency, timezone, onboarding_completed) VALUES ('user-jarvis-1', 'trader', 'Jarvis Trader', 'USD', 'America/New_York', true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.trading_accounts (id TEXT PRIMARY KEY DEFAULT ('acc-' || extract(epoch from now())::bigint), user_id TEXT NOT NULL DEFAULT 'user-jarvis-1', name TEXT NOT NULL, account_type TEXT NOT NULL DEFAULT 'live', broker TEXT, initial_balance NUMERIC(16, 2) NOT NULL DEFAULT 10000.00, current_balance NUMERIC(16, 2) NOT NULL DEFAULT 10000.00, currency TEXT NOT NULL DEFAULT 'USD', is_default BOOLEAN NOT NULL DEFAULT false, is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
INSERT INTO public.trading_accounts (id, user_id, name, account_type, broker, initial_balance, current_balance, currency, is_default, is_active) VALUES ('acc-1', 'user-jarvis-1', 'Primary Trading Account', 'live', 'Live Brokerage', 10000.00, 10000.00, 'USD', true, true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.instruments (id TEXT PRIMARY KEY DEFAULT ('inst-' || extract(epoch from now())::bigint), user_id TEXT DEFAULT 'user-jarvis-1', symbol TEXT NOT NULL, name TEXT NOT NULL, asset_class TEXT NOT NULL DEFAULT 'futures', tick_size NUMERIC(18, 8) NOT NULL DEFAULT 0.01, tick_value NUMERIC(18, 8) NOT NULL DEFAULT 1.00, contract_size NUMERIC(18, 8) NOT NULL DEFAULT 1.00, point_value NUMERIC(18, 8) NOT NULL DEFAULT 1.00, default_commission NUMERIC(16, 4) NOT NULL DEFAULT 0.00, currency TEXT NOT NULL DEFAULT 'USD', created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);

CREATE TABLE IF NOT EXISTS public.strategies (id TEXT PRIMARY KEY DEFAULT ('strat-' || extract(epoch from now())::bigint), user_id TEXT NOT NULL DEFAULT 'user-jarvis-1', name TEXT NOT NULL, description TEXT, entry_conditions TEXT, exit_conditions TEXT, stop_loss_rules TEXT, take_profit_rules TEXT, screenshot_url TEXT, color TEXT DEFAULT '#3B82F6', is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);

CREATE TABLE IF NOT EXISTS public.tags (id TEXT PRIMARY KEY DEFAULT ('tag-' || extract(epoch from now())::bigint), user_id TEXT NOT NULL DEFAULT 'user-jarvis-1', name TEXT NOT NULL, color TEXT DEFAULT '#3B82F6' NOT NULL, category TEXT NOT NULL DEFAULT 'setup', created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);

CREATE TABLE IF NOT EXISTS public.trades (id TEXT PRIMARY KEY DEFAULT ('trade-' || extract(epoch from now())::bigint), user_id TEXT NOT NULL DEFAULT 'user-jarvis-1', account_id TEXT NOT NULL, instrument_id TEXT, symbol TEXT NOT NULL, asset_class TEXT NOT NULL DEFAULT 'futures', direction TEXT NOT NULL DEFAULT 'long', status TEXT NOT NULL DEFAULT 'closed', open_time TIMESTAMPTZ NOT NULL, close_time TIMESTAMPTZ, quantity NUMERIC(18, 6) NOT NULL DEFAULT 1, entry_price NUMERIC(18, 6) NOT NULL, exit_price NUMERIC(18, 6), stop_loss NUMERIC(18, 6), take_profit NUMERIC(18, 6), gross_pnl NUMERIC(16, 2) DEFAULT 0.00, commission NUMERIC(16, 2) DEFAULT 0.00, fees NUMERIC(16, 2) DEFAULT 0.00, net_pnl NUMERIC(16, 2) DEFAULT 0.00, roi_percentage NUMERIC(10, 4) DEFAULT 0.00, r_multiple NUMERIC(10, 4), strategy_id TEXT, setup TEXT, notes TEXT, emotional_state TEXT, mistakes TEXT[] DEFAULT '{}', mae NUMERIC(18, 6), mfe NUMERIC(18, 6), market_session TEXT, duration_minutes INT, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);

CREATE TABLE IF NOT EXISTS public.daily_journals (id TEXT PRIMARY KEY DEFAULT ('journal-' || extract(epoch from now())::bigint), user_id TEXT NOT NULL DEFAULT 'user-jarvis-1', date DATE NOT NULL, journal_type TEXT NOT NULL DEFAULT 'daily', market_overview TEXT, trading_plan TEXT, important_levels TEXT, expected_direction TEXT, setups_watched TEXT, trades_taken_summary TEXT, mistakes_made TEXT, emotional_state TEXT, lessons_learned TEXT, improvements_tomorrow TEXT, notes_rich_text TEXT, mood_score INT DEFAULT 4, attachments TEXT[] DEFAULT '{}', save_status TEXT DEFAULT 'saved', created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, CONSTRAINT unique_daily_journal_date_type UNIQUE (user_id, date, journal_type));

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_journals DISABLE ROW LEVEL SECURITY;`

                      await navigator.clipboard.writeText(sql)
                      setHasCopiedSql(true)
                      setTimeout(() => setHasCopiedSql(false), 3000)
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-[#EAB308] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#EAB308]/90 transition-all cursor-pointer shadow-sm"
                  >
                    {hasCopiedSql ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{hasCopiedSql ? 'SQL Script Copied!' : 'Copy SQL Setup Script'}</span>
                  </button>

                  <a
                    href="https://supabase.com/dashboard/project/hclxoemiitxjzvlvvbci/sql/new"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-[#202838] bg-[#141A26] px-3 py-1.5 text-xs font-medium text-[#E2E8F0] hover:text-[#3B82F6] hover:border-[#3B82F6]/50 transition-colors"
                  >
                    <span>Open Supabase SQL Editor</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )}

            <div className="text-xs text-[#8493A8] leading-relaxed space-y-2">
              <p>
                Single source of truth architecture: all trading accounts, custom instruments, playbook setups, and journal entries are mapped directly to Supabase.
              </p>
              <div className="rounded-lg border border-[#202838] bg-[#10141E] p-3 font-mono text-[11px] text-[#E2E8F0]">
                VITE_SUPABASE_URL=https://hclxoemiitxjzvlvvbci.supabase.co
                <br />
                VITE_SUPABASE_ANON_KEY=sb_publishable_YoanH5xywDOR4VaqdBCp0g_X5b8Dxvj
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD CUSTOM INSTRUMENT MODAL --- */}
      {isInstrumentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-[#202838] bg-[#10141E] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#E2E8F0]">Add Custom Instrument</h3>
              <button
                type="button"
                onClick={() => {
                  setIsInstrumentModalOpen(false)
                  setInstrumentError(null)
                  setInstrumentSuccess(null)
                }}
                className="text-[#8493A8] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {instrumentError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F05265]/40 bg-[#F05265]/10 p-3 text-xs text-[#F05265]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error: </span>
                  <span>{instrumentError}</span>
                </div>
              </div>
            )}

            {instrumentSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#18C784]/40 bg-[#18C784]/10 p-3 text-xs text-[#18C784]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{instrumentSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateInstrument} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8493A8] mb-1 font-medium">Symbol Ticker <span className="text-[#F05265]">*</span></label>
                <input
                  type="text"
                  value={instSymbol}
                  onChange={(e) => setInstSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. MNQ, MES, CL, EUR/JPY"
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] uppercase font-mono focus:border-[#3B82F6] focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1 font-medium">Full Instrument Name <span className="text-[#F05265]">*</span></label>
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
                <label className="block text-[#8493A8] mb-1 font-medium">Asset Class</label>
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
                  <label className="block text-[#8493A8] mb-1 font-medium">Tick Size</label>
                  <input
                    type="number"
                    step="any"
                    value={instTickSize}
                    onChange={(e) => setInstTickSize(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 font-mono text-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-[#8493A8] mb-1 font-medium">Tick Value ($)</label>
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
                  <label className="block text-[#8493A8] mb-1 font-medium">Point Value ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={instPointValue}
                    onChange={(e) => setInstPointValue(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 font-mono text-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block text-[#8493A8] mb-1 font-medium">Roundtrip Commission ($)</label>
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
                  disabled={isSubmittingInstrument}
                  onClick={() => {
                    setIsInstrumentModalOpen(false)
                    setInstrumentError(null)
                    setInstrumentSuccess(null)
                  }}
                  className="rounded-lg border border-[#202838] bg-[#141A26] px-4 py-2 text-[#8493A8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInstrument}
                  style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 font-bold text-white shadow hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingInstrument ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Instrument</span>
                  )}
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#E2E8F0]">Create Tag or Mistake</h3>
              <button
                type="button"
                onClick={() => {
                  setIsTagModalOpen(false)
                  setTagError(null)
                  setTagSuccess(null)
                }}
                className="text-[#8493A8] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {tagError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F05265]/40 bg-[#F05265]/10 p-3 text-xs text-[#F05265]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error: </span>
                  <span>{tagError}</span>
                </div>
              </div>
            )}

            {tagSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#18C784]/40 bg-[#18C784]/10 p-3 text-xs text-[#18C784]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{tagSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateTag} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8493A8] mb-1 font-medium">Tag Name <span className="text-[#F05265]">*</span></label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="e.g. Premature Profit Take, Trend Pullback"
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1 font-medium">Category</label>
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
                <label className="block text-[#8493A8] mb-1 font-medium">Color Marker</label>
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
                  disabled={isSubmittingTag}
                  onClick={() => {
                    setIsTagModalOpen(false)
                    setTagError(null)
                    setTagSuccess(null)
                  }}
                  className="rounded-lg border border-[#202838] bg-[#141A26] px-4 py-2 text-[#8493A8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTag}
                  style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 font-bold text-white shadow hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingTag ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Tag</span>
                  )}
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#E2E8F0]">Add Trading Account</h3>
              <button
                type="button"
                onClick={() => {
                  setIsAccountModalOpen(false)
                  setAccountError(null)
                  setAccountSuccess(null)
                }}
                className="text-[#8493A8] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {accountError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#F05265]/40 bg-[#F05265]/10 p-3 text-xs text-[#F05265]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Error: </span>
                  <span>{accountError}</span>
                </div>
              </div>
            )}

            {accountSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#18C784]/40 bg-[#18C784]/10 p-3 text-xs text-[#18C784]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{accountSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8493A8] mb-1 font-medium">Account Name <span className="text-[#F05265]">*</span></label>
                <input
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g. Apex 50k Futures #2"
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1 font-medium">Account Type</label>
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
                <label className="block text-[#8493A8] mb-1 font-medium">Broker / Platform</label>
                <input
                  type="text"
                  value={accBroker}
                  onChange={(e) => setAccBroker(e.target.value)}
                  placeholder="e.g. Tradovate, Interactive Brokers, Binance"
                  className="w-full rounded-lg border border-[#202838] bg-[#141A26] px-3 py-2 text-[#E2E8F0] focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8493A8] mb-1 font-medium">Starting Capital ($) <span className="text-[#F05265]">*</span></label>
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
                  disabled={isSubmittingAccount}
                  onClick={() => {
                    setIsAccountModalOpen(false)
                    setAccountError(null)
                    setAccountSuccess(null)
                  }}
                  className="rounded-lg border border-[#202838] bg-[#141A26] px-4 py-2 text-[#8493A8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAccount}
                  style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 font-bold text-white shadow hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingAccount ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
