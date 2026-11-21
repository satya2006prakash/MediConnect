import React from 'react'
import { cn } from '@/lib/utils'
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react'

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

export interface AlertProps {
  variant?: AlertVariant
  title?: string
  description?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
  onDismiss?: () => void
  className?: string
  children?: React.ReactNode
}

const variantConfig: Record<
  AlertVariant,
  { container: string; iconColor: string; defaultIcon: React.ReactNode }
> = {
  info: {
    container: 'bg-[#EEF4FC] border-[#CBDDF4] text-[#182230]',
    iconColor: 'text-[#2457A7]',
    defaultIcon: <Info className="w-4 h-4" />,
  },
  success: {
    container: 'bg-[#E8F5EF] border-[#C6E6D8] text-[#182230]',
    iconColor: 'text-[#16865B]',
    defaultIcon: <CheckCircle2 className="w-4 h-4" />,
  },
  warning: {
    container: 'bg-[#FBF4E8] border-[#F3DCBA] text-[#182230]',
    iconColor: 'text-[#D99122]',
    defaultIcon: <AlertTriangle className="w-4 h-4" />,
  },
  danger: {
    container: 'bg-[#FBEFEF] border-[#F6CACA] text-[#182230]',
    iconColor: 'text-[#D64545]',
    defaultIcon: <AlertCircle className="w-4 h-4" />,
  },
}

export function Alert({
  variant = 'info',
  title,
  description,
  icon,
  action,
  onDismiss,
  className,
  children,
}: AlertProps) {
  const config = variantConfig[variant]
  const displayIcon = icon ?? config.defaultIcon

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-lg border text-sm',
        config.container,
        className
      )}
    >
      <div className={cn('shrink-0 mt-0.5', config.iconColor)}>{displayIcon}</div>
      <div className="flex-1 min-w-0">
        {title && <h4 className="text-xs font-semibold text-[#182230] mb-0.5">{title}</h4>}
        {description && <div className="text-xs text-[#182230]/90 leading-relaxed">{description}</div>}
        {children && <div className="text-xs text-[#182230]/90 leading-relaxed">{children}</div>}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 text-[#667085] hover:text-[#182230] rounded transition-colors"
          title="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
