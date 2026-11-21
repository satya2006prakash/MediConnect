import { AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  onBack?: () => void
  className?: string
  compact?: boolean
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this healthcare information. Please try again.',
  onRetry,
  onBack,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'bg-white border border-[#E5EAF0] rounded-lg text-center flex flex-col items-center justify-center',
        compact ? 'p-6' : 'p-10 min-h-[320px]',
        className
      )}
    >
      <div className="w-11 h-11 rounded-full bg-[#FBEFEF] text-[#D64545] flex items-center justify-center mb-3 shrink-0">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold text-[#182230]">{title}</h3>
      <p className="mt-1 text-xs text-[#667085] max-w-sm leading-relaxed">{message}</p>
      {(onRetry || onBack) && (
        <div className="mt-5 flex items-center gap-2">
          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Go back
            </Button>
          )}
          {onRetry && (
            <Button
              variant="primary"
              size="sm"
              onClick={onRetry}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
