import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

export interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export function ThemeToggle({ className, size = 'sm', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1',
        isDark
          ? 'bg-[#161B22] border-[#30363D] text-amber-400 hover:bg-[#21262D] hover:text-amber-300 focus:ring-amber-400'
          : 'bg-white border-[#E5EAF0] text-slate-600 hover:bg-[#F0F3F7] hover:text-slate-900 focus:ring-[#2457A7]',
        size === 'sm' ? 'h-8 px-2.5 gap-1.5 text-xs' : 'h-9 px-3 gap-2 text-sm',
        className
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className={cn('shrink-0 transition-transform duration-200 rotate-0', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      ) : (
        <Moon className={cn('shrink-0 transition-transform duration-200 rotate-0', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      )}
      {showLabel && (
        <span className="font-medium">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  )
}
