import React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, ChevronDown, Search, X } from 'lucide-react'

// ─── Input Component ─────────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  badge?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, badge, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="text-xs font-medium text-[#182230] dark:text-[#F0F6FC]">
              {label}
              {props.required && <span className="text-[#D64545] ml-0.5">*</span>}
            </label>
            {badge && <div>{badge}</div>}
          </div>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#667085] dark:text-[#8B949E]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-9 text-sm rounded-md border bg-white dark:bg-[#0D1117] text-[#182230] dark:text-[#F0F6FC] placeholder:text-[#98A2B3] dark:placeholder:text-[#6E7681]',
              'border-[#E5EAF0] dark:border-[#30363D] transition-all duration-150 outline-none',
              leftIcon ? 'pl-9 pr-3' : 'px-3',
              rightIcon ? 'pr-9' : '',
              'focus:border-[#2457A7] focus:ring-2 focus:ring-[#2457A7]/15 focus:bg-white dark:focus:bg-[#0D1117]',
              'hover:border-[#CBD5E1] dark:hover:border-[#484F58]',
              'disabled:bg-[#F7F9FC] dark:disabled:bg-[#161B22] disabled:text-[#98A2B3] disabled:cursor-not-allowed disabled:border-[#E5EAF0]',
              error && 'border-[#D64545] focus:border-[#D64545] focus:ring-[#D64545]/15 hover:border-[#D64545]',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-[#667085] dark:text-[#8B949E]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-[#D64545] mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {hint && !error && (
          <p className="text-xs text-[#667085] mt-0.5">{hint}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ─── Textarea Component ──────────────────────────────────────────────────────

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, rows = 3, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[#182230] dark:text-[#F0F6FC]">
            {label}
            {props.required && <span className="text-[#D64545] ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-md border bg-white dark:bg-[#0D1117] text-[#182230] dark:text-[#F0F6FC] placeholder:text-[#98A2B3] dark:placeholder:text-[#6E7681]',
            'border-[#E5EAF0] dark:border-[#30363D] transition-all duration-150 outline-none resize-y',
            'focus:border-[#2457A7] focus:ring-2 focus:ring-[#2457A7]/15 focus:bg-white dark:focus:bg-[#0D1117]',
            'hover:border-[#CBD5E1] dark:hover:border-[#484F58]',
            'disabled:bg-[#F7F9FC] dark:disabled:bg-[#161B22] disabled:text-[#98A2B3] disabled:cursor-not-allowed',
            error && 'border-[#D64545] focus:border-[#D64545] focus:ring-[#D64545]/15 hover:border-[#D64545]',
            className
          )}
          {...props}
        />
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-[#D64545] mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {hint && !error && (
          <p className="text-xs text-[#667085] mt-0.5">{hint}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

// ─── Select Component ────────────────────────────────────────────────────────

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[#182230] dark:text-[#F0F6FC]">
            {label}
            {props.required && <span className="text-[#D64545] ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-9 pl-3 pr-8 text-sm rounded-md border bg-white dark:bg-[#0D1117] text-[#182230] dark:text-[#F0F6FC]',
              'border-[#E5EAF0] dark:border-[#30363D] transition-all duration-150 outline-none appearance-none cursor-pointer',
              'focus:border-[#2457A7] focus:ring-2 focus:ring-[#2457A7]/15',
              'hover:border-[#CBD5E1] dark:hover:border-[#484F58]',
              'disabled:bg-[#F7F9FC] dark:disabled:bg-[#161B22] disabled:text-[#98A2B3] disabled:cursor-not-allowed',
              error && 'border-[#D64545] focus:border-[#D64545] focus:ring-[#D64545]/15',
              className
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 pointer-events-none text-[#667085] dark:text-[#8B949E]">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-[#D64545] mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {hint && !error && (
          <p className="text-xs text-[#667085] dark:text-[#8B949E] mt-0.5">{hint}</p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

// ─── SearchBar Component ─────────────────────────────────────────────────────

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  shortcutKey?: string
  size?: 'sm' | 'md'
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  shortcutKey,
  size = 'md',
}: SearchBarProps) {
  return (
    <div className={cn('relative flex items-center w-full', className)}>
      <Search className="absolute left-3 w-4 h-4 text-[#667085] dark:text-[#8B949E] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-9 text-sm rounded-md border bg-white dark:bg-[#0D1117] text-[#182230] dark:text-[#F0F6FC] placeholder:text-[#98A2B3] dark:placeholder:text-[#6E7681]',
          'border-[#E5EAF0] dark:border-[#30363D] transition-all duration-150 outline-none',
          'focus:border-[#2457A7] focus:ring-2 focus:ring-[#2457A7]/15 focus:bg-white dark:focus:bg-[#0D1117]',
          'hover:border-[#CBD5E1] dark:hover:border-[#484F58]',
          value ? 'pr-8' : shortcutKey ? 'pr-12' : 'pr-3',
          size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm'
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 p-0.5 rounded text-[#98A2B3] dark:text-[#8B949E] hover:text-[#182230] dark:hover:text-[#F0F6FC] hover:bg-[#F0F3F7] dark:hover:bg-[#21262D] transition-colors"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : shortcutKey ? (
        <span className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-medium bg-[#F0F3F7] dark:bg-[#21262D] text-[#667085] dark:text-[#8B949E] border border-[#E5EAF0] dark:border-[#30363D] rounded">
          {shortcutKey}
        </span>
      ) : null}
    </div>
  )
}
