import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  to?: string
  className?: string
  imageClassName?: string
}

const heightMap = {
  xs: 'h-7 sm:h-8',
  sm: 'h-9 sm:h-10',
  md: 'h-11 sm:h-12',
  lg: 'h-14 sm:h-16',
  xl: 'h-18 sm:h-20',
}

export function Logo({
  size = 'md',
  to,
  className,
  imageClassName,
}: LogoProps) {
  const content = (
    <div className={cn('inline-flex items-center shrink-0', className)}>
      {/* Light Mode Logo */}
      <img
        src="/mediconnect-logo.png"
        alt="MediConnect – Your Health. Connected."
        className={cn(
          'w-auto object-contain transition-opacity hover:opacity-95 dark:hidden',
          heightMap[size],
          imageClassName
        )}
      />
      {/* Dark Mode Logo (white text for maximum contrast) */}
      <img
        src="/mediconnect-logo-dark.png"
        alt="MediConnect – Your Health. Connected."
        className={cn(
          'w-auto object-contain transition-opacity hover:opacity-95 hidden dark:block',
          heightMap[size],
          imageClassName
        )}
      />
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    )
  }

  return content
}
