import { cn, formatDateTime } from '@/lib/utils'
import type { OrderStatus } from '@/types/database'
import { Check, Clock, Package, Truck, CheckCircle, XCircle, FileText, ThumbsUp } from 'lucide-react'

export interface TimelineStep {
  status: OrderStatus
  label: string
  icon: React.ReactNode
  description?: string
}

const steps: TimelineStep[] = [
  { status: 'pending', label: 'Refill Request Sent', icon: <Clock className="w-3.5 h-3.5" /> },
  { status: 'accepted', label: 'Accepted by Pharmacy', icon: <Check className="w-3.5 h-3.5" /> },
  { status: 'bill_generated', label: 'Bill Issued', icon: <FileText className="w-3.5 h-3.5" /> },
  { status: 'bill_approved', label: 'Bill Approved by Patient', icon: <ThumbsUp className="w-3.5 h-3.5" /> },
  { status: 'processing', label: 'Pharmacy Processing Order', icon: <Package className="w-3.5 h-3.5" /> },
  { status: 'dispatched', label: 'Out for Delivery', icon: <Truck className="w-3.5 h-3.5" /> },
  { status: 'delivered', label: 'Delivered', icon: <CheckCircle className="w-3.5 h-3.5" /> },
]

const statusOrder: OrderStatus[] = [
  'pending',
  'accepted',
  'bill_generated',
  'bill_approved',
  'processing',
  'dispatched',
  'delivered',
]

export interface OrderTimelineProps {
  currentStatus: OrderStatus
  timestamps?: Partial<Record<OrderStatus, string>>
  className?: string
}

export function OrderTimeline({ currentStatus, timestamps, className }: OrderTimelineProps) {
  const isTerminal = currentStatus === 'rejected' || currentStatus === 'cancelled'
  const currentIndex = statusOrder.indexOf(currentStatus)

  if (isTerminal) {
    return (
      <div className={cn('flex items-center gap-3 p-4 bg-[#FBEFEF] rounded-lg border border-[#F6CACA]', className)}>
        <div className="w-8 h-8 rounded-full bg-[#D64545] text-white flex items-center justify-center shrink-0">
          <XCircle className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#182230] capitalize">Order {currentStatus}</p>
          <p className="text-xs text-[#667085]">This refill order has been marked as {currentStatus}.</p>
        </div>
      </div>
    )
  }

  return (
    <ol className={cn('relative', className)}>
      {steps.map((step, index) => {
        const isDone = currentIndex > index
        const isCurrent = currentIndex === index

        return (
          <li key={step.status} className="flex gap-3 pb-5 last:pb-0">
            {/* Step Marker Dot + Line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-colors',
                  isDone
                    ? 'bg-[#2457A7] border-[#2457A7] text-white'
                    : isCurrent
                    ? 'bg-white border-[#2457A7] text-[#2457A7] shadow-[0_0_0_3px_rgba(36,87,167,0.15)]'
                    : 'bg-white border-[#E5EAF0] text-[#98A2B3]'
                )}
              >
                {step.icon}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-[2px] flex-1 mt-1 rounded-full',
                    isDone ? 'bg-[#2457A7]' : 'bg-[#E5EAF0]'
                  )}
                />
              )}
            </div>

            {/* Label and Timestamp */}
            <div className="pt-1 pb-4">
              <p
                className={cn(
                  'text-xs font-semibold',
                  isCurrent
                    ? 'text-[#182230]'
                    : isDone
                    ? 'text-[#182230]/80'
                    : 'text-[#98A2B3]'
                )}
              >
                {step.label}
              </p>
              {timestamps?.[step.status] && (
                <p className="text-[11px] text-[#667085] mt-0.5">
                  {formatDateTime(timestamps[step.status]!)}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
