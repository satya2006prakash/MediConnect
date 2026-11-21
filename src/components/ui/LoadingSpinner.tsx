import { cn } from '@/lib/utils'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white' | 'neutral'
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-10 h-10 border-[2.5px]',
}

const colorClasses = {
  primary: 'border-[#CBDDF4] border-t-[#2457A7]',
  secondary: 'border-[#C8ECE9] border-t-[#159A91]',
  white: 'border-white/30 border-t-white',
  neutral: 'border-[#E5EAF0] border-t-[#667085]',
}

export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'rounded-full animate-spin shrink-0',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  )
}

export function PageLoader({ message = 'Loading MediConnect data…' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" color="primary" />
        <p className="text-xs font-medium text-[#667085] tracking-wide animate-pulse">
          {message}
        </p>
      </div>
    </div>
  )
}
