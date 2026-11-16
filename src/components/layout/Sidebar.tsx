import React from 'react'
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  Target,
  PlaySquare,
  History,
  Bot,
  CheckSquare,
  TrendingUp,
  CreditCard,
  Sliders,
  Tag,
  Settings,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'

export type NavTab = 
  | 'dashboard'
  | 'trade-log'
  | 'journaling'
  | 'calendar'
  | 'analytics'
  | 'reports'
  | 'strategies'
  | 'trade-replay'
  | 'backtesting'
  | 'ai-insights'
  | 'routines'
  | 'progress-tracker'
  | 'trading-accounts'
  | 'instruments'
  | 'tags'
  | 'preferences'

interface SidebarProps {
  currentTab: NavTab
  onSelectTab: (tab: NavTab) => void
  isOpenMobile: boolean
  onCloseMobile: () => void
}

interface NavSection {
  title: string
  items: {
    id: NavTab
    label: string
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
    badge?: string
  }[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'JOURNAL',
    items: [
      { id: 'trade-log', label: 'Trade Log', icon: BookOpen },
      { id: 'journaling', label: 'Journaling', icon: FileSpreadsheet },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'reports', label: 'Reports', icon: TrendingUp },
    ],
  },
  {
    title: 'TRADING SYSTEM',
    items: [
      { id: 'strategies', label: 'Strategies', icon: Target },
      { id: 'trade-replay', label: 'Trade Replay', icon: PlaySquare, badge: 'PRO' },
      { id: 'backtesting', label: 'Backtesting', icon: History },
    ],
  },
  {
    title: 'PERFORMANCE',
    items: [
      { id: 'ai-insights', label: 'AI Insights', icon: Bot, badge: 'AI' },
      { id: 'routines', label: 'Routines', icon: CheckSquare },
      { id: 'progress-tracker', label: 'Progress Tracker', icon: ShieldCheck },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { id: 'trading-accounts', label: 'Trading Accounts', icon: CreditCard },
      { id: 'instruments', label: 'Instruments', icon: Sliders },
      { id: 'tags', label: 'Tags & Mistakes', icon: Tag },
      { id: 'preferences', label: 'Preferences', icon: Settings },
    ],
  },
]

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Persistent Sidebar */}
      <aside
        style={{ backgroundColor: 'var(--bg-surface, #10141E)', borderColor: 'var(--border-color, #202838)' }}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div style={{ borderColor: 'var(--border-color, #202838)' }} className="flex h-16 shrink-0 items-center justify-between border-b px-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[#141A26] border border-[#202838] font-mono text-sm font-bold text-[#E2E8F0] shadow-sm">
              JJ
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#0A0D14] bg-[#18C784]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-[#E2E8F0]">JARVIS</span>
                <span className="text-sm font-medium tracking-tight text-[#8493A8]">JOURNAL</span>
              </div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-[#64748B]">
                Trading Terminal
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <h3 className="px-3 text-[10px] font-semibold tracking-wider text-[#64748B] uppercase">
                {section.title}
              </h3>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id)
                        onCloseMobile()
                      }}
                      className={`group relative flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-[#141A26] text-white shadow-sm font-semibold border border-[#202838]'
                          : 'text-[#8493A8] hover:bg-[#141A26]/50 hover:text-[#E2E8F0]'
                      }`}
                    >
                      {isActive && (
                        <span
                          style={{ backgroundColor: 'var(--accent-color, #3B82F6)' }}
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md"
                        />
                      )}
                      <div className="flex items-center gap-2.5">
                        <Icon
                          style={{ color: isActive ? 'var(--accent-color, #3B82F6)' : undefined }}
                          className={`h-4 w-4 transition-colors ${
                            isActive ? '' : 'text-[#8493A8] group-hover:text-[#E2E8F0]'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          style={{
                            color: item.badge === 'AI' ? 'var(--accent-color, #3B82F6)' : undefined,
                            borderColor: item.badge === 'AI' ? 'var(--accent-border, rgba(59,130,246,0.3))' : undefined,
                            backgroundColor: item.badge === 'AI' ? 'var(--accent-muted, rgba(59,130,246,0.15))' : undefined,
                          }}
                          className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${
                            item.badge === 'AI'
                              ? 'border'
                              : 'bg-[#18C784]/15 text-[#18C784] border border-[#18C784]/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Status */}
        <div style={{ borderColor: 'var(--border-color, #202838)', backgroundColor: 'var(--bg-surface, #10141E)' }} className="shrink-0 border-t p-3">
          <div className="flex items-center justify-between text-[11px] text-[#8493A8]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#18C784] animate-pulse" />
              <span className="font-mono text-[10px] text-[#64748B]">TERMINAL ONLINE</span>
            </div>
            <span className="font-mono text-[10px] text-[#64748B]">v2.4.0</span>
          </div>
        </div>
      </aside>
    </>
  )
}
