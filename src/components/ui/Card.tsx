import React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  variant?: 'default' | 'subtle' | 'interactive'
}

const paddingStyles = {
  none: '',
  sm: 'p-3.5 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
}

const variantStyles = {
  default: 'bg-white dark:bg-[#161B22] border-[#E5EAF0] dark:border-[#30363D] shadow-[0_1px_3px_0_rgba(24,34,48,0.05)]',
  subtle: 'bg-[#F7F9FC] dark:bg-[#0D1117] border-[#E5EAF0] dark:border-[#30363D]',
  interactive:
    'bg-white dark:bg-[#161B22] border-[#E5EAF0] dark:border-[#30363D] shadow-[0_1px_3px_0_rgba(24,34,48,0.05)] hover:border-[#CBD5E1] dark:hover:border-[#484F58] hover:shadow-[0_4px_6px_-1px_rgba(24,34,48,0.07)] transition-all cursor-pointer',
}

export function Card({
  children,
  className,
  padding = 'md',
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border',
        variantStyles[variant],
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function CardHeader({
  title,
  description,
  subtitle,
  actions,
  icon,
  className,
}: CardHeaderProps) {
  const subContent = description ?? subtitle
  return (
    <div
      className={cn(
        'flex items-start justify-between pb-3.5 border-b border-[#E5EAF0] dark:border-[#30363D] mb-4 gap-3',
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        {icon && (
          <div className="w-8 h-8 rounded bg-[#EEF4FC] dark:bg-[#2457A7]/25 text-[#2457A7] dark:text-[#58A6FF] flex items-center justify-center shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-[#182230] dark:text-[#F0F6FC] tracking-tight">{title}</h3>
          {subContent && (
            <p className="mt-0.5 text-xs text-[#667085] dark:text-[#8B949E] leading-relaxed">{subContent}</p>
          )}
        </div>
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('space-y-4', className)}>{children}</div>
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'pt-3.5 mt-4 border-t border-[#E5EAF0] dark:border-[#30363D] flex items-center justify-between gap-3 text-xs text-[#667085] dark:text-[#8B949E]',
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── Unified Section Grouping (Avoids floating card soup) ────────────────────

export function CardGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-[#161B22] border border-[#E5EAF0] dark:border-[#30363D] rounded-lg shadow-[0_1px_3px_0_rgba(24,34,48,0.05)] divide-y divide-[#E5EAF0] dark:divide-[#30363D] overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  )
}
