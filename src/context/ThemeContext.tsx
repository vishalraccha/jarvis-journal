import React, { createContext, useContext, useState, useEffect } from 'react'

export type AppTheme = 'charcoal' | 'obsidian' | 'midnight' | 'emerald' | 'cyber'

export interface ThemeConfig {
  id: AppTheme
  name: string
  description: string
  bg: string
  surface: string
  card: string
  border: string
  accent: string
  accentHover: string
  textPrimary: string
  textMuted: string
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  charcoal: {
    id: 'charcoal',
    name: 'Dark Charcoal & Steel (Default)',
    description: 'Refined institutional trading desk. Subtle dark grey with precision steel-blue accents.',
    bg: '#0A0D14',
    surface: '#10141E',
    card: '#141A26',
    border: '#202838',
    accent: '#3B82F6',
    accentHover: '#60A5FA',
    textPrimary: '#E2E8F0',
    textMuted: '#8493A8',
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Grey (Monochrome)',
    description: 'Minimalist stealth terminal. Pure neutral dark greys with platinum highlights.',
    bg: '#09090B',
    surface: '#0F0F12',
    card: '#141418',
    border: '#23232A',
    accent: '#71717A',
    accentHover: '#A1A1AA',
    textPrimary: '#F4F4F5',
    textMuted: '#71717A',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Navy',
    description: 'Deep midnight blue tones reminiscent of Bloomberg professional terminals.',
    bg: '#070A12',
    surface: '#0D1220',
    card: '#11182B',
    border: '#1B253D',
    accent: '#2563EB',
    accentHover: '#3B82F6',
    textPrimary: '#E0E7FF',
    textMuted: '#7E8FA6',
  },
  emerald: {
    id: 'emerald',
    name: 'Onyx Emerald',
    description: 'Trading floor theme with dark graphite and muted emerald accents.',
    bg: '#070D0B',
    surface: '#0D1612',
    card: '#121E19',
    border: '#1B2F25',
    accent: '#10B981',
    accentHover: '#34D399',
    textPrimary: '#ECFDF5',
    textMuted: '#6EE7B7',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Terminal',
    description: 'High-contrast dark terminal with precision cyan-blue highlights.',
    bg: '#05070B',
    surface: '#0B0F17',
    card: '#0F1522',
    border: '#1B2436',
    accent: '#0EA5E9',
    accentHover: '#38BDF8',
    textPrimary: '#F0F9FF',
    textMuted: '#7DD3FC',
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
  const [theme, setTheme] = useState<AppTheme>('charcoal')

  const themeConfig = THEMES[theme]

  useEffect(() => {
    // Apply CSS variables to root
    const root = document.documentElement
    root.style.setProperty('--bg-main', themeConfig.bg)
    root.style.setProperty('--bg-surface', themeConfig.surface)
    root.style.setProperty('--bg-card', themeConfig.card)
    root.style.setProperty('--border-color', themeConfig.border)
    root.style.setProperty('--accent-color', themeConfig.accent)
    root.style.setProperty('--accent-hover', themeConfig.accentHover)
    root.style.setProperty('--text-primary', themeConfig.textPrimary)
    root.style.setProperty('--text-muted', themeConfig.textMuted)

    // Set body background
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
