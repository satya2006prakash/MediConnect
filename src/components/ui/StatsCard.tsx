import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface StatsCardProps {
  label?: string
  title?: string
  value: string | number
  subtext?: string
  icon?: LucideIcon
  iconColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  iconClassName?: string
  trend?: { value: string; positive?: boolean; isPositive?: boolean }
  className?: string
}

const iconTintMap = {
  primary: 'bg-[#EEF4FC] text-[#2457A7] dark:bg-[#16243B] dark:text-[#58A6FF]',
  secondary: 'bg-[#EBF8F7] text-[#159A91] dark:bg-[#102624] dark:text-[#3FB950]',
  success: 'bg-[#E8F5EF] text-[#16865B] dark:bg-[#0E291C] dark:text-[#3FB950]',
  warning: 'bg-[#FBF4E8] text-[#D99122] dark:bg-[#2A1D0B] dark:text-[#D29922]',
  danger: 'bg-[#FBEFEF] text-[#D64545] dark:bg-[#2B1313] dark:text-[#F85149]',
}

export function StatsCard({
  label,
  title,
  value,
  subtext,
  icon: Icon,
  iconColor = 'primary',
  iconClassName,
  trend,
  className,
}: StatsCardProps) {
  const displayLabel = label ?? title ?? ''
  const isTrendPositive = trend ? (trend.positive ?? trend.isPositive ?? true) : false
  return (
    <div
      className={cn(
        'bg-white border border-[#E5EAF0] rounded-lg p-4 sm:p-5 flex items-start justify-between shadow-[0_1px_3px_0_rgba(24,34,48,0.05)]',
        className
      )}
    >
      <div className="space-y-1">
        <p className="text-xs font-medium text-[#667085] tracking-wide">{displayLabel}</p>
        <p className="text-2xl font-semibold text-[#182230] tracking-tight">{value}</p>
        <div className="flex items-center gap-2 pt-0.5">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded',
                isTrendPositive
                  ? 'bg-[#E8F5EF] text-[#16865B] dark:bg-[#0E291C] dark:text-[#3FB950]'
                  : 'bg-[#FBEFEF] text-[#D64545] dark:bg-[#2B1313] dark:text-[#F85149]'
              )}
            >
              {isTrendPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {subtext && <span className="text-xs text-[#667085]">{subtext}</span>}
        </div>
      </div>
      {Icon && (
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
            iconTintMap[iconColor],
            iconClassName
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  )
}
