import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { sendAppNotification } from '@/lib/notifications'
import { getDaysRemaining, getStockStatus } from '@/lib/utils'
import {
  getLocalDateString,
  getYesterdayDateString,
  getDaysDifference,
  getMedicineLastConsumedDate,
  isDoseTakenToday,
  updateMedicineStockAndDose,
} from '@/lib/medicineUtils'
import type { Medicine } from '@/types/database'

export function useMedicineConsumption() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const catchupRunningRef = useRef(false)

  // ─────────────────────────────────────────────────────────────
  // Option 1: Auto Date-Based Catch-Up
  // Reconciles missed days automatically when patient loads app
  // ─────────────────────────────────────────────────────────────
  const runAutoCatchup = useCallback(async () => {
    if (!profile?.id || profile.role !== 'patient') return
    if (catchupRunningRef.current) return

    const todayStr = getLocalDateString()
    const sessionKey = `mc_catchup_checked_${profile.id}_${todayStr}`
    
    // Check if catch-up already ran today in this session
    if (sessionStorage.getItem(sessionKey)) return

    catchupRunningRef.current = true

    try {
      const { data, error } = await supabase
        .from('medicines')
        .select('*')
        .eq('user_id', profile.id)

      if (error || !data || data.length === 0) {
        sessionStorage.setItem(sessionKey, '1')
        return
      }

      const medicines = data as Medicine[]
      const updatedNames: string[] = []

      for (const med of medicines) {
        if (!med.daily_dose || med.daily_dose <= 0) continue

        const lastConsumed = getMedicineLastConsumedDate(med)
        const diffDays = getDaysDifference(lastConsumed, todayStr)

        // If diffDays > 1, at least 1 day was missed prior to today
        // (diffDays === 1 means last consumed was yesterday, so 0 missed days)
        if (diffDays > 1) {
          const missedDays = diffDays - 1
          const deduction = Number((missedDays * med.daily_dose).toFixed(2))
          const newQty = Math.max(0, Number((med.current_quantity - deduction).toFixed(2)))
          const yesterdayStr = getYesterdayDateString()

          const result = await updateMedicineStockAndDose(med.id, newQty, yesterdayStr)
          if (result.success) {
            updatedNames.push(`${med.name} (-${deduction} ${med.unit})`)

            // Check if stock became low or critical after missed days deduction
            const daysLeft = getDaysRemaining(newQty, med.daily_dose)
            const status = getStockStatus(daysLeft, med.reminder_threshold)

            if (status === 'low' || status === 'critical') {
              sendAppNotification({
                userId: profile.id,
                type: 'low_stock',
                title: `Low Stock Alert: ${med.name}`,
                body: `${med.name} has only ${daysLeft} days of doses remaining (${newQty} ${med.unit}s left). Consider ordering a refill soon.`,
                referenceId: med.id,
              })
            }
          }
        }
      }

      sessionStorage.setItem(sessionKey, '1')

      if (updatedNames.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['medicines', profile.id] })
        toast(
          `Auto Stock Catch-up: Reconciled missed days for ${updatedNames.length} medicine(s).`,
          {
            icon: '📅',
            duration: 6000,
          }
        )
      }
    } catch (err) {
      console.warn('Auto catch-up error:', err)
    } finally {
      catchupRunningRef.current = false
    }
  }, [profile?.id, profile?.role, queryClient])

  // Run on mount
  useEffect(() => {
    runAutoCatchup()
  }, [runAutoCatchup])

  // ─────────────────────────────────────────────────────────────
  // Option 2: Interactive Daily Dose Logging
  // ─────────────────────────────────────────────────────────────

  const takeDose = useCallback(
    async (med: Medicine) => {
      if (!profile?.id) return

      if (isDoseTakenToday(med)) {
        toast.error(`Today's dose for ${med.name} has already been logged.`)
        return
      }

      if (med.current_quantity <= 0) {
        toast.error(`Cannot log dose: ${med.name} is out of stock.`)
        return
      }

      const todayStr = getLocalDateString()
      const dose = med.daily_dose || 1
      const newQty = Math.max(0, Number((med.current_quantity - dose).toFixed(2)))

      // Store undo snapshot
      const undoData = {
        prevQty: med.current_quantity,
        prevDate: getMedicineLastConsumedDate(med),
        timestamp: Date.now(),
      }
      localStorage.setItem(`mc_undo_${med.id}`, JSON.stringify(undoData))

      const result = await updateMedicineStockAndDose(med.id, newQty, todayStr)

      if (!result.success) {
        toast.error('Failed to log dose. Please try again.')
        return
      }

      queryClient.invalidateQueries({ queryKey: ['medicines', profile.id] })

      const daysLeft = getDaysRemaining(newQty, med.daily_dose)
      const status = getStockStatus(daysLeft, med.reminder_threshold)

      if (status === 'low' || status === 'critical') {
        sendAppNotification({
          userId: profile.id,
          type: 'low_stock',
          title: `Low Stock Alert: ${med.name}`,
          body: `${med.name} is running low (${daysLeft} days remaining). Please refill soon.`,
          referenceId: med.id,
        })
      }

      toast.success(
        `Logged dose: -${dose} ${med.unit} for ${med.name} (${newQty} remaining).`,
        { icon: '✓', duration: 4000 }
      )
    },
    [profile?.id, queryClient]
  )

  const undoDose = useCallback(
    async (med: Medicine) => {
      if (!profile?.id) return

      const undoRaw = localStorage.getItem(`mc_undo_${med.id}`)
      let targetQty = med.current_quantity + (med.daily_dose || 1)
      let targetDate = getYesterdayDateString()

      if (undoRaw) {
        try {
          const parsed = JSON.parse(undoRaw)
          if (typeof parsed.prevQty === 'number') {
            targetQty = parsed.prevQty
            targetDate = parsed.prevDate || getYesterdayDateString()
          }
        } catch {
          // ignore json parse error
        }
        localStorage.removeItem(`mc_undo_${med.id}`)
      }

      const result = await updateMedicineStockAndDose(med.id, targetQty, targetDate)

      if (!result.success) {
        toast.error('Failed to undo dose.')
        return
      }

      queryClient.invalidateQueries({ queryKey: ['medicines', profile.id] })
      toast.success(`Dose undone for ${med.name}. Stock restored to ${targetQty} ${med.unit}s.`)
    },
    [profile?.id, queryClient]
  )

  return {
    takeDose,
    undoDose,
    isDoseTakenToday,
    getMedicineLastConsumedDate,
    runAutoCatchup,
  }
}
