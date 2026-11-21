import React from 'react'
import { cn } from '@/lib/utils'
import type { OrderStatus, PharmacyStatus, BillStatus, ComplaintStatus } from '@/types/database'

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral' | 'subtle'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  withDot?: boolean
  className?: string
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  primary: {
    container: 'bg-[#EEF4FC] text-[#2457A7] border-[#CBDDF4] dark:bg-[#16243B] dark:text-[#58A6FF] dark:border-[#1F3659]',
    dot: 'bg-[#2457A7] dark:bg-[#58A6FF]',
  },
  secondary: {
    container: 'bg-[#EBF8F7] text-[#159A91] border-[#C8ECE9] dark:bg-[#102624] dark:text-[#3FB950] dark:border-[#173E3B]',
    dot: 'bg-[#159A91] dark:bg-[#3FB950]',
  },
  success: {
    container: 'bg-[#E8F5EF] text-[#16865B] border-[#C6E6D8] dark:bg-[#0E291C] dark:text-[#3FB950] dark:border-[#15452F]',
    dot: 'bg-[#16865B] dark:bg-[#3FB950]',
  },
  warning: {
    container: 'bg-[#FBF4E8] text-[#D99122] border-[#F3DCBA] dark:bg-[#2A1D0B] dark:text-[#D29922] dark:border-[#4A3314]',
    dot: 'bg-[#D99122] dark:bg-[#D29922]',
  },
  danger: {
    container: 'bg-[#FBEFEF] text-[#D64545] border-[#F6CACA] dark:bg-[#2B1313] dark:text-[#F85149] dark:border-[#4A1E1E]',
    dot: 'bg-[#D64545] dark:bg-[#F85149]',
  },
  neutral: {
    container: 'bg-[#F0F3F7] text-[#667085] border-[#E5EAF0] dark:bg-[#21262D] dark:text-[#8B949E] dark:border-[#30363D]',
    dot: 'bg-[#667085] dark:bg-[#8B949E]',
  },
  subtle: {
    container: 'bg-[#F7F9FC] text-[#667085] border-[#E5EAF0] dark:bg-[#161B22] dark:text-[#8B949E] dark:border-[#30363D]',
    dot: 'bg-[#667085] dark:bg-[#8B949E]',
  },
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] gap-1.5',
  md: 'px-2.5 py-1 text-xs gap-1.5',
}

export function Badge({
  variant = 'neutral',
  size = 'sm',
  withDot = false,
  className,
  children,
}: BadgeProps) {
  const styles = variantStyles[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded border tracking-tight select-none',
        styles.container,
        sizeStyles[size],
        className
      )}
    >
      {withDot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', styles.dot)}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  )
}

// ─── Semantic Status Mapping ─────────────────────────────────────────────────

type StatusValue = OrderStatus | PharmacyStatus | BillStatus | ComplaintStatus | string

interface StatusConfig {
  label: string
  variant: BadgeVariant
}

const statusConfig: Record<string, StatusConfig> = {
  // Order Lifecycle
  pending: { label: 'Pending Request', variant: 'warning' },
  pharmacy_review: { label: 'Under Review', variant: 'secondary' },
  accepted: { label: 'Accepted', variant: 'secondary' },
  bill_generated: { label: 'Bill Ready', variant: 'primary' },
  bill_sent: { label: 'Bill Ready', variant: 'primary' },
  bill_approved: { label: 'Bill Approved', variant: 'primary' },
  processing: { label: 'Fulfilling', variant: 'secondary' },
  dispatched: { label: 'Dispatched', variant: 'secondary' },
  out_for_delivery: { label: 'Dispatched', variant: 'secondary' },
  delivered: { label: 'Delivered', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },

  // Pharmacy Statuses
  verified: { label: 'Verified', variant: 'success' },
  suspended: { label: 'Suspended', variant: 'danger' },

  // Bill Statuses
  approved: { label: 'Approved', variant: 'success' },

  // Complaint Statuses
  open: { label: 'Open Issue', variant: 'warning' },
  under_review: { label: 'Under Review', variant: 'primary' },
  resolved: { label: 'Resolved', variant: 'success' },
  dismissed: { label: 'Dismissed', variant: 'neutral' },

  // Medicine Stock Statuses
  critical: { label: 'Critical Stock', variant: 'danger' },
  low: { label: 'Low Stock', variant: 'warning' },
  adequate: { label: 'Adequate', variant: 'primary' },
  good: { label: 'Good Stock', variant: 'success' },
}

export interface StatusBadgeProps {
  type?: 'order' | 'pharmacy' | 'stock' | 'bill' | 'complaint' | string
  status: StatusValue
  withDot?: boolean
  size?: BadgeSize
  className?: string
}

export function StatusBadge({ status, withDot = true, size = 'sm', className }: StatusBadgeProps) {
  const normalizedKey = status?.toLowerCase()
  const config = statusConfig[normalizedKey] ?? {
    label: status ? status.replace(/_/g, ' ') : 'Unknown',
    variant: 'neutral' as BadgeVariant,
  }

  return (
    <Badge
      variant={config.variant}
      size={size}
      withDot={withDot}
      className={cn('capitalize', className)}
    >
      {config.label}
    </Badge>
  )
}
