import React, { createContext, useContext, useState, useEffect } from 'react'
import { Profile, TradingAccount } from '@/types/database'
import { api } from '@/services/api'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface AuthContextType {
  profile: Profile | null
  accounts: TradingAccount[]
  activeAccount: TradingAccount | null
  setActiveAccount: (account: TradingAccount | null) => void
  currency: string
  setCurrency: (curr: string) => void
  isLoading: boolean
  isSupabaseConnected: boolean
  reloadAccounts: () => Promise<void>
  refreshProfile: () => Promise<void>
  login: (email: string, pass: string) => Promise<{ error: any }>
  signup: (email: string, pass: string) => Promise<{ error: any }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [activeAccount, setActiveAccount] = useState<TradingAccount | null>(null)
  const [currency, setCurrency] = useState<string>('USD')
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const prof = await api.getProfile()
      setProfile(prof)
      setCurrency(prof.base_currency || 'USD')

      const accs = await api.getTradingAccounts()
      setAccounts(accs)
      const defaultAcc = accs.find(a => a.is_default) || accs[0] || null
      setActiveAccount(defaultAcc)
    } catch (err) {
      console.error('Error loading initial auth/profile data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          await loadData()
        } else if (event === 'SIGNED_OUT') {
          await loadData()
        }
      })

      return () => {
        authListener.subscription.unsubscribe()
      }
    }
  }, [])

  const reloadAccounts = async () => {
    const accs = await api.getTradingAccounts()
    setAccounts(accs)
    if (activeAccount) {
      const updated = accs.find(a => a.id === activeAccount.id)
      if (updated) setActiveAccount(updated)
    }
  }

  const refreshProfile = async () => {
    const prof = await api.getProfile()
    setProfile(prof)
  }

  const login = async (email: string, pass: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (!error) await loadData()
      return { error }
    }
    // Sandbox / In-memory local user
    await loadData()
    return { error: null }
  }

  const signup = async (email: string, pass: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signUp({ email, password: pass })
      return { error }
    }
    return { error: null }
  }

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    await loadData()
  }

  return (
    <AuthContext.Provider
      value={{
        profile,
        accounts,
        activeAccount,
        setActiveAccount,
        currency,
        setCurrency,
        isLoading,
        isSupabaseConnected: isSupabaseConfigured,
        reloadAccounts,
        refreshProfile,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
