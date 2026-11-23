import { supabase } from '@/lib/supabase'
import type { Medicine } from '@/types/database'

/**
 * Returns today's date in local YYYY-MM-DD format
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns yesterday's date in local YYYY-MM-DD format
 */
export function getYesterdayDateString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return getLocalDateString(d)
}

/**
 * Calculates number of calendar days between two YYYY-MM-DD date strings
 */
export function getDaysDifference(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr + 'T00:00:00')
  const end = new Date(endDateStr + 'T00:00:00')
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Retrieves the last consumed date for a medicine, checking DB row first then localStorage fallback.
 * If never set, defaults to yesterday so 0 missed days are deducted initially.
 */
export function getMedicineLastConsumedDate(med: Medicine): string {
  if (med.last_consumed_date) {
    return med.last_consumed_date
  }
  const cached = localStorage.getItem(`mc_last_consumed_${med.id}`)
  if (cached) {
    return cached
  }
  return getYesterdayDateString()
}

/**
 * Returns true if today's dose has already been recorded for this medicine
 */
export function isDoseTakenToday(med: Medicine): boolean {
  const lastConsumed = getMedicineLastConsumedDate(med)
  return lastConsumed === getLocalDateString()
}

/**
 * Updates medicine stock and last_consumed_date in Supabase with automatic graceful fallback
 * if column last_consumed_date is not yet present on remote DB.
 */
export async function updateMedicineStockAndDose(
  medicineId: string,
  newQuantity: number,
  newConsumedDate: string | null
): Promise<{ success: boolean; error?: any }> {
  // Always update localStorage cache
  if (newConsumedDate) {
    localStorage.setItem(`mc_last_consumed_${medicineId}`, newConsumedDate)
  } else {
    localStorage.removeItem(`mc_last_consumed_${medicineId}`)
  }

  // 1. Try updating both current_quantity and last_consumed_date
  const { error: fullError } = await supabase
    .from('medicines')
    .update({
      current_quantity: newQuantity,
      last_consumed_date: newConsumedDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', medicineId)

  if (!fullError) {
    return { success: true }
  }

  // 2. Fallback: if remote table does not yet have column last_consumed_date (code 42703)
  if (fullError.code === '42703' || fullError.message?.includes('last_consumed_date')) {
    const { error: fallbackError } = await supabase
      .from('medicines')
      .update({
        current_quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', medicineId)

    if (fallbackError) {
      return { success: false, error: fallbackError }
    }
    return { success: true }
  }

  return { success: false, error: fullError }
}
