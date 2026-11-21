import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getDaysRemaining(quantity: number, dailyDose: number): number {
  if (dailyDose <= 0) return Infinity
  return Math.floor(quantity / dailyDose)
}

export function getStockStatus(
  daysRemaining: number,
  threshold: number
): 'critical' | 'low' | 'adequate' | 'good' {
  if (daysRemaining <= 0) return 'critical'
  if (daysRemaining <= Math.floor(threshold / 2)) return 'critical'
  if (daysRemaining <= threshold) return 'low'
  if (daysRemaining <= threshold * 2) return 'adequate'
  return 'good'
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
