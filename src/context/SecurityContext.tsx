import React, { createContext, useContext, useState, useEffect } from 'react'

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000 // 12 hours in milliseconds
const SESSION_COOKIE_NAME = 'jj_stark_clearance'
const CORRECT_PASSPHRASE = 'Loveu3000'

interface SecurityContextType {
  isLocked: boolean
  unlock: (pwd: string) => { success: boolean; message?: string }
  lock: () => void
  timeRemainingMs: number
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

// Helper: Read session cookie
function getSessionExpiryFromCookie(): number | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SESSION_COOKIE_NAME}=`))
  if (!match) return null

  const val = Number(match.split('=')[1])
  if (isNaN(val)) return null
  return val
}

// Helper: Set session cookie with 12 hour expiry
function setSessionExpiryCookie(expiryTimestamp: number) {
  const maxAgeSeconds = Math.max(0, Math.floor((expiryTimestamp - Date.now()) / 1000))
  document.cookie = `${SESSION_COOKIE_NAME}=${expiryTimestamp}; max-age=${maxAgeSeconds}; path=/; SameSite=Strict`
}

// Helper: Clear session cookie
function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE_NAME}=; max-age=0; path=/; SameSite=Strict`
}

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const expiry = getSessionExpiryFromCookie()
    if (!expiry) return true
    // If current time is past expiry, session is expired
    if (Date.now() >= expiry) {
      clearSessionCookie()
      return true
    }
    return false
  })

  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(() => {
    const expiry = getSessionExpiryFromCookie()
    return expiry ? Math.max(0, expiry - Date.now()) : 0
  })

  // Timer: Check every 10 seconds if 12-hour session expired
  useEffect(() => {
    const interval = setInterval(() => {
      const expiry = getSessionExpiryFromCookie()
      if (expiry) {
        const remaining = expiry - Date.now()
        if (remaining <= 0) {
          clearSessionCookie()
          setIsLocked(true)
          setTimeRemainingMs(0)
        } else {
          setTimeRemainingMs(remaining)
        }
      } else if (!isLocked) {
        setIsLocked(true)
        setTimeRemainingMs(0)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [isLocked])

  const unlock = (pwd: string) => {
    if (pwd.trim() === CORRECT_PASSPHRASE) {
      const newExpiry = Date.now() + TWELVE_HOURS_MS
      setSessionExpiryCookie(newExpiry)
      setIsLocked(false)
      setTimeRemainingMs(TWELVE_HOURS_MS)
      return { success: true }
    } else {
      return {
        success: false,
        message: 'You are Ultron and you are not permitted.',
      }
    }
  }

  const lock = () => {
    clearSessionCookie()
    setIsLocked(true)
    setTimeRemainingMs(0)
  }

  return (
    <SecurityContext.Provider value={{ isLocked, unlock, lock, timeRemainingMs }}>
      {children}
    </SecurityContext.Provider>
  )
}

export function useSecurity() {
  const ctx = useContext(SecurityContext)
  if (!ctx) throw new Error('useSecurity must be used within SecurityProvider')
  return ctx
}
