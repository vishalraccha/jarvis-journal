import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined, currency = 'USD', showSign = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00'
  }
  
  const sign = showSign && amount > 0 ? '+' : ''
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

  return `${sign}${formatted}`
}

export function formatPercent(value: number | null | undefined, showSign = false): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%'
  }
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatR(r: number | null | undefined): string {
  if (r === null || r === undefined || isNaN(r)) {
    return '0.00R'
  }
  const sign = r > 0 ? '+' : ''
  return `${sign}${r.toFixed(2)}R`
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0'
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
