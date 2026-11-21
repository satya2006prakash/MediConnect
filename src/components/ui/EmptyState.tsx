import React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode | { label: string; onClick: () => void }
  bordered?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  bordered = false,
  className,
}: EmptyStateProps) {
  const isActionConfig =
    action &&
    typeof action === 'object' &&
    'label' in action &&
    'onClick' in action

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12',
        bordered && 'bg-white border border-[#E5EAF0] rounded-lg shadow-[0_1px_3px_0_rgba(24,34,48,0.05)]',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[#EEF4FC] text-[#2457A7] flex items-center justify-center mb-3.5 shrink-0">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[#182230]">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-[#667085] max-w-sm leading-relaxed">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {isActionConfig ? (
            <Button
              variant="primary"
              size="sm"
              onClick={(action as { label: string; onClick: () => void }).onClick}
            >
              {(action as { label: string; onClick: () => void }).label}
            </Button>
          ) : (
            (action as React.ReactNode)
          )}
        </div>
      )}
    </div>
  )
}
