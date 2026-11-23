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

export function generateUniqueBillNumber(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `MC-${year}${month}${day}-${randomSuffix}`
}

export interface BillMetadata {
  bill_number?: string
  discount_percent: number
  discount_amount: number
  tax_percent: number
  tax_amount: number
  delivery_fee?: number
  note?: string
}

export interface ParsedBillDetails {
  billNumber: string
  discountPercent: number
  discountAmount: number
  taxPercent: number
  taxAmount: number
  taxableSubtotal: number
  note?: string
}

export function parseBillMetadata(
  patientNote: string | null | undefined,
  subtotal: number = 0,
  tax: number = 0,
  deliveryFee: number = 0,
  total: number = 0,
  fallbackId?: string
): ParsedBillDetails {
  const defaultFallbackBillNumber = fallbackId
    ? `MC-BILL-${fallbackId.replace(/-/g, '').slice(0, 6).toUpperCase()}`
    : 'MC-BILL-RECORD'

  if (patientNote) {
    try {
      const parsed = JSON.parse(patientNote)
      if (parsed && typeof parsed === 'object') {
        const billNumber = parsed.bill_number || defaultFallbackBillNumber
        const discountPercent = Number(parsed.discount_percent) || 0
        const discountAmount =
          typeof parsed.discount_amount === 'number'
            ? parsed.discount_amount
            : Math.round(((subtotal * discountPercent) / 100) * 100) / 100
        const taxPercent = Number(parsed.tax_percent) || 0
        const taxAmount = typeof parsed.tax_amount === 'number' ? parsed.tax_amount : tax
        const taxableSubtotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100)
        return {
          billNumber,
          discountPercent,
          discountAmount,
          taxPercent,
          taxAmount,
          taxableSubtotal,
          note: parsed.note || '',
        }
      }
    } catch {
      // not JSON, fallback to plain text note below
    }
  }

  // Fallback calculation for older records or plain-text notes
  const calculatedDiscount = Math.max(0, Math.round(((subtotal + deliveryFee + tax) - total) * 100) / 100)
  const discountPercent = subtotal > 0 && calculatedDiscount > 0 ? (calculatedDiscount / subtotal) * 100 : 0
  const taxableSubtotal = Math.max(0, Math.round((subtotal - calculatedDiscount) * 100) / 100)
  const taxPercent = taxableSubtotal > 0 && tax > 0 ? (tax / taxableSubtotal) * 100 : 0

  return {
    billNumber: defaultFallbackBillNumber,
    discountPercent: Number(discountPercent.toFixed(1)),
    discountAmount: calculatedDiscount,
    taxPercent: Number(taxPercent.toFixed(1)),
    taxAmount: tax,
    taxableSubtotal,
    note: patientNote || undefined,
  }
}
