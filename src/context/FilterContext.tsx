import React, { createContext, useContext, useState, useMemo } from 'react'
import { TimeFilterRange } from '@/types/database'

interface FilterContextType {
  timeRange: TimeFilterRange
  setTimeRange: (range: TimeFilterRange) => void
  customStartDate: string
  setCustomStartDate: (date: string) => void
  customEndDate: string
  setCustomEndDate: (date: string) => void
  filterDateRange: { start: string; end: string }
  selectedAccountId: string
  setSelectedAccountId: (id: string) => void
  searchSymbol: string
  setSearchSymbol: (sym: string) => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeRange, setTimeRange] = useState<TimeFilterRange>('all')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [searchSymbol, setSearchSymbol] = useState<string>('')

  // Default custom range: last 30 days
  const today = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const [customStartDate, setCustomStartDate] = useState<string>(thirtyDaysAgo.toISOString().split('T')[0])
  const [customEndDate, setCustomEndDate] = useState<string>(today.toISOString().split('T')[0])

  const filterDateRange = useMemo(() => {
    const now = new Date()
    let start: Date
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    switch (timeRange) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        break
      case 'week': {
        const dayOfWeek = now.getDay()
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Monday
        start = new Date(now.setDate(diff))
        start.setHours(0, 0, 0, 0)
        break
      }
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
        break
      case 'custom':
        start = new Date(customStartDate)
        start.setHours(0, 0, 0, 0)
        if (customEndDate) {
          end = new Date(customEndDate)
          end.setHours(23, 59, 59, 999)
        }
        break
      case 'all':
      default:
        start = new Date(1970, 0, 1)
        break
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    }
  }, [timeRange, customStartDate, customEndDate])

  return (
    <FilterContext.Provider
      value={{
        timeRange,
        setTimeRange,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        filterDateRange,
        selectedAccountId,
        setSelectedAccountId,
        searchSymbol,
        setSearchSymbol,
      }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export function useFilter() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider')
  }
  return context
}
