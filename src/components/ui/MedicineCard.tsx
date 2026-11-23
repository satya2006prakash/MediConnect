import { cn, getDaysRemaining, getStockStatus } from '@/lib/utils'
import { isDoseTakenToday } from '@/lib/medicineUtils'
import type { Medicine } from '@/types/database'
import { Pill, Edit2, Trash2, Check, CheckCircle2, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'

export interface MedicineCardProps {
  medicine: Medicine
  onEdit?: (medicine: Medicine) => void
  onDelete?: (medicine: Medicine) => void
  onClick?: (medicine: Medicine) => void
  onTakeDose?: (medicine: Medicine) => void
  onUndoDose?: (medicine: Medicine) => void
  showDoseActions?: boolean
  className?: string
}

const stockBarColors: Record<string, string> = {
  critical: 'bg-[#D64545]',
  low: 'bg-[#D99122]',
  adequate: 'bg-[#2457A7]',
  good: 'bg-[#16865B]',
}

const stockBadgeVariant: Record<string, 'danger' | 'warning' | 'primary' | 'success'> = {
  critical: 'danger',
  low: 'warning',
  adequate: 'primary',
  good: 'success',
}

export function MedicineCard({
  medicine,
  onEdit,
  onDelete,
  onClick,
  onTakeDose,
  onUndoDose,
  showDoseActions = true,
  className,
}: MedicineCardProps) {
  const daysRemaining = getDaysRemaining(medicine.current_quantity, medicine.daily_dose)
  const status = getStockStatus(daysRemaining, medicine.reminder_threshold)
  const maxRefillDays = Math.max(30, medicine.reminder_threshold * 3)
  const barWidth = Math.min(100, (daysRemaining / maxRefillDays) * 100)
  const takenToday = isDoseTakenToday(medicine)

  return (
    <div
      className={cn(
        'bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-lg p-4 sm:p-5 flex flex-col justify-between shadow-[0_1px_3px_0_rgba(24,34,48,0.05)] transition-all duration-150',
        onClick && 'cursor-pointer hover:border-[#CBD5E1] dark:hover:border-[#58A6FF]/40 hover:shadow-[0_4px_6px_-1px_rgba(24,34,48,0.06)]',
        className
      )}
      onClick={() => onClick?.(medicine)}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#EEF4FC] text-[#2457A7] dark:bg-[#16243B] dark:text-[#58A6FF] flex items-center justify-center shrink-0">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#182230] dark:text-[#F0F6FC] leading-snug">
                {medicine.name}
              </h3>
              <p className="text-xs text-[#667085] dark:text-[#8B949E] mt-0.5">
                {[medicine.brand, medicine.dosage, medicine.form].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(medicine)
                }}
                className="p-1 rounded text-[#98A2B3] hover:text-[#182230] dark:hover:text-[#F0F6FC] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D] transition-colors"
                title="Edit medicine"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(medicine)
                }}
                className="p-1 rounded text-[#98A2B3] hover:text-[#D64545] dark:hover:text-[#F85149] hover:bg-[#FBEFEF] dark:hover:bg-red-950/30 transition-colors"
                title="Delete medicine"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Stock Meter */}
        <div className="space-y-1.5 mt-4 pt-3 border-t border-[#E5EAF0] dark:border-[#30363D]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#667085] dark:text-[#8B949E]">
              <strong className="text-[#182230] dark:text-[#F0F6FC] font-semibold">{medicine.current_quantity}</strong> {medicine.unit}s remaining
            </span>
            <Badge variant={stockBadgeVariant[status]} size="sm" withDot>
              {daysRemaining === Infinity ? '∞' : `${daysRemaining} days`}
            </Badge>
          </div>

          <div className="h-1.5 w-full bg-[#EEF2F6] dark:bg-[#21262D] rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', stockBarColors[status])}
              style={{ width: `${Math.max(3, barWidth)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#667085] dark:text-[#8B949E] pt-0.5">
            <span>Dose: {medicine.daily_dose} {medicine.unit}/day</span>
            <span>Alert at ≤ {medicine.reminder_threshold}d</span>
          </div>
        </div>
      </div>

      {/* Daily Dose Action Footer */}
      {showDoseActions && (onTakeDose || onUndoDose) && (
        <div className="mt-4 pt-3 border-t border-[#E5EAF0] dark:border-[#30363D]">
          {takenToday ? (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Taken today</span>
              </div>
              {onUndoDose && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onUndoDose(medicine)
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#667085] dark:text-[#8B949E] hover:text-[#D64545] dark:hover:text-[#F85149] transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Undo today's dose"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={medicine.current_quantity <= 0}
              onClick={(e) => {
                e.stopPropagation()
                onTakeDose?.(medicine)
              }}
              className={cn(
                'w-full justify-center text-xs py-1.5 h-8 gap-1.5 font-medium transition-colors',
                medicine.current_quantity <= 0
                  ? 'opacity-60 cursor-not-allowed'
                  : 'bg-[#EEF4FC] hover:bg-[#DCE9FA] text-[#2457A7] dark:bg-[#16243B] dark:text-[#58A6FF] dark:hover:bg-[#1f3354] border border-[#2457A7]/20 dark:border-[#58A6FF]/30'
              )}
            >
              <Check className="w-3.5 h-3.5" />
              {medicine.current_quantity <= 0
                ? 'Out of stock'
                : `Take dose (-${medicine.daily_dose} ${medicine.unit})`}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
