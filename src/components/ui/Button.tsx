import React from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'subtle'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  children?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#2457A7] text-white hover:bg-[#1D4685] active:bg-[#173666] border-transparent shadow-[0_1px_2px_0_rgba(36,87,167,0.2)] focus-visible:ring-[#2457A7]/30',
  secondary:
    'bg-[#159A91] text-white hover:bg-[#11827A] active:bg-[#0D6660] border-transparent shadow-[0_1px_2px_0_rgba(21,154,145,0.2)] focus-visible:ring-[#159A91]/30',
  outline:
    'bg-white dark:bg-[#161B22] text-[#182230] dark:text-[#F0F6FC] hover:bg-[#F8FAFC] dark:hover:bg-[#21262D] active:bg-[#F1F4F9] dark:active:bg-[#282E39] border-[#E5EAF0] dark:border-[#30363D] shadow-sm hover:border-[#D0D7E2] dark:hover:border-[#484F58] focus-visible:ring-[#2457A7]/20',
  ghost:
    'bg-transparent text-[#667085] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D] active:bg-[#E5EAF0] dark:active:bg-[#30363D] border-transparent focus-visible:ring-[#2457A7]/20',
  danger:
    'bg-[#D64545] text-white hover:bg-[#B53636] active:bg-[#962B2B] border-transparent shadow-[0_1px_2px_0_rgba(214,69,69,0.2)] focus-visible:ring-[#D64545]/30',
  subtle:
    'bg-[#EEF4FC] dark:bg-[#16243B] text-[#2457A7] dark:text-[#58A6FF] hover:bg-[#E1ECFA] dark:hover:bg-[#1F3659] active:bg-[#CBDDF4] dark:active:bg-[#173666] border-transparent focus-visible:ring-[#2457A7]/20',
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs h-7 gap-1.5 rounded',
  sm: 'px-3 py-1.5 text-xs h-8 gap-1.5 rounded',
  md: 'px-3.5 py-2 text-sm h-9 gap-2 rounded-md',
  lg: 'px-4.5 py-2.5 text-sm h-10 gap-2 rounded-md font-semibold',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium border transition-all duration-150 select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="shrink-0 flex items-center">{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
