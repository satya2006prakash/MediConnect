import React, { useEffect } from 'react'
import { X, AlertTriangle, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showCloseButton?: boolean
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Subtle healthcare backdrop with soft blur */}
      <div
        className="fixed inset-0 bg-[#182230]/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-white rounded-lg shadow-[0_10px_25px_-5px_rgba(24,34,48,0.15)] border border-[#E5EAF0] z-10 transition-all overflow-hidden max-h-[92vh] flex flex-col',
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-start justify-between px-5 py-4 border-b border-[#E5EAF0] shrink-0">
            <div>
              <h3 className="text-base font-semibold text-[#182230] tracking-tight">{title}</h3>
              {description && (
                <p className="mt-0.5 text-xs text-[#667085] leading-relaxed">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="ml-3 p-1 rounded-md text-[#98A2B3] hover:text-[#182230] hover:bg-[#F0F3F7] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2457A7]/20"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {/* Optional Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[#E5EAF0] bg-[#F7F9FC] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Confirmation Modal (For Critical or Affirmative actions) ────────────────

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary' | 'secondary'
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading,
}: ConfirmDialogProps) {
  const isDestructive = variant === 'danger'
  const displayDesc = description ?? message ?? ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm" showCloseButton={false}>
      <div className="flex items-start gap-3.5 mb-4">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5',
            isDestructive ? 'bg-[#FBEFEF] text-[#D64545]' : 'bg-[#EEF4FC] text-[#2457A7]'
          )}
        >
          {isDestructive ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <HelpCircle className="w-5 h-5" />
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#182230]">{title}</h4>
          {displayDesc && <p className="text-xs text-[#667085] mt-1 leading-relaxed">{displayDesc}</p>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5EAF0]">
        <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant}
          size="sm"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
