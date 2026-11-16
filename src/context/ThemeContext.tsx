import React, { createContext, useContext, useState, useEffect } from 'react'

export type AppTheme = 'blue' | 'green' | 'orange' | 'yellow' | 'charcoal' | 'cyan' | 'purple'

export interface ThemeConfig {
  id: AppTheme
  name: string
  label: string
  colorName: string
  description: string
  bg: string
  surface: string
  card: string
  border: string
  accent: string
  accentHover: string
  accentMuted: string
  accentBorder: string
  textPrimary: string
  textMuted: string
}

// Consistent dark gray terminal foundation across ALL themes
const DARK_GRAY_FOUNDATION = {
  bg: '#0A0E17',
  surface: '#10141E',
  card: '#141A26',
  border: '#202838',
  textPrimary: '#E2E8F0',
  textMuted: '#8493A8',
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  blue: {
    id: 'blue',
    name: 'Dark Grey & Blue',
    label: 'Blue Terminal',
    colorName: 'Steel Blue',
    description: 'Dark grey terminal background with precision steel-blue accents.',
    ...DARK_GRAY_FOUNDATION,
    accent: '#3B82F6',
    accentHover: '#60A5FA',
    accentMuted: 'rgba(59, 130, 246, 0.15)',
    accentBorder: 'rgba(59, 130, 246, 0.4)',
  },
  green: {
    id: 'green',
    name: 'Dark Grey & Green',
    label: 'Emerald Terminal',
    colorName: 'Emerald Green',
    description: 'Dark grey terminal background with crisp emerald green accents.',
    ...DARK_GRAY_FOUNDATION,
    accent: '#10B981',
    accentHover: '#34D399',
    accentMuted: 'rgba(16, 185, 129, 0.15)',
    accentBorder: 'rgba(16, 185, 129, 0.4)',
  },
  orange: {
    id: 'orange',
    name: 'Dark Grey & Orange',
    label: 'Amber Terminal',
    colorName: 'Amber Orange',
    description: 'Dark grey terminal background with dynamic amber orange accents.',
    ...DARK_GRAY_FOUNDATION,
    accent: '#F97316',
    accentHover: '#FB923C',
    accentMuted: 'rgba(249, 115, 22, 0.15)',
    accentBorder: 'rgba(249, 115, 22, 0.4)',
  },
  yellow: {
    id: 'yellow',
    name: 'Dark Grey & Yellow',
    label: 'Gold / Yellow Terminal',
    colorName: 'Cyber Yellow',
    description: 'Dark grey terminal background with high-visibility gold/yellow accents.',
    ...DARK_GRAY_FOUNDATION,
    accent: '#EAB308',
    accentHover: '#FACC15',
    accentMuted: 'rgba(234, 179, 8, 0.15)',
    accentBorder: 'rgba(234, 179, 8, 0.4)',
  },
  charcoal: {
    id: 'charcoal',
    name: 'Dark Grey & Slate',
    label: 'Platinum Slate',
    colorName: 'Monochrome Slate',
    description: 'Dark grey terminal background with subtle stealth platinum slate accents.',
    ...DARK_GRAY_FOUNDATION,
    accent: '#94A3B8',
    accentHover: '#CBD5E1',
    accentMuted: 'rgba(148, 163, 184, 0.15)',
    accentBorder: 'rgba(148, 163, 184, 0.4)',
  },
  cyan: {
    id: 'cyan',
    name: 'Dark Grey & Cyan',
    label: 'Cyan Terminal',
    colorName: 'Electric Cyan',
    description: 'Dark grey terminal background with crisp cyan-blue highlights.',
    ...DARK_GRAY_FOUNDATION,
    accent: '#06B6D4',
    accentHover: '#22D3EE',
    accentMuted: 'rgba(6, 182, 212, 0.15)',
    accentBorder: 'rgba(6, 182, 212, 0.4)',
  },
  purple: {
    id: 'purple',
    name: 'Dark Grey & Purple',
    label: 'Violet Terminal',
    colorName: 'Royal Violet',
    description: 'Dark grey terminal background with executive purple accents.',
    ...DARK_GRAY_FOUNDATION,
    accent: '#8B5CF6',
    accentHover: '#A78BFA',
    accentMuted: 'rgba(139, 92, 246, 0.15)',
    accentBorder: 'rgba(139, 92, 246, 0.4)',
  },
}

interface ThemeContextType {
  theme: AppTheme
  setTheme: (t: AppTheme) => void
  themeConfig: ThemeConfig
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // In-memory theme state to comply with zero persistent browser storage
  const [theme, setTheme] = useState<AppTheme>('blue')

  const themeConfig = THEMES[theme] || THEMES.blue

  useEffect(() => {
    // Apply CSS variables to root
    const root = document.documentElement
    root.setAttribute('data-theme', themeConfig.id)
    root.style.setProperty('--bg-main', themeConfig.bg)
    root.style.setProperty('--bg-surface', themeConfig.surface)
    root.style.setProperty('--bg-card', themeConfig.card)
    root.style.setProperty('--border-color', themeConfig.border)
    root.style.setProperty('--accent-color', themeConfig.accent)
    root.style.setProperty('--accent-hover', themeConfig.accentHover)
    root.style.setProperty('--accent-muted', themeConfig.accentMuted)
    root.style.setProperty('--accent-border', themeConfig.accentBorder)
    root.style.setProperty('--text-primary', themeConfig.textPrimary)
    root.style.setProperty('--text-muted', themeConfig.textMuted)

    // Set body background to always keep dark grey
    document.body.style.backgroundColor = themeConfig.bg
    document.body.style.color = themeConfig.textPrimary
  }, [themeConfig])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
