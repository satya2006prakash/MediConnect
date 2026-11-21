import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface Column<T> {
  key: string
  header: React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (item: T, index: number) => React.ReactNode
}

export interface PaginationConfig {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor?: (item: T, index: number) => string
  isLoading?: boolean
  emptyMessage?: string
  emptySubtext?: string
  emptyAction?: React.ReactNode
  onRowClick?: (item: T) => void
  pagination?: PaginationConfig
  className?: string
  compact?: boolean
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records found',
  emptySubtext = 'There is currently no data to display.',
  emptyAction,
  onRowClick,
  pagination,
  className,
  compact = false,
}: DataTableProps<T>) {
  const alignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center'
    if (align === 'right') return 'text-right'
    return 'text-left'
  }

  return (
    <div className={cn('bg-white border border-[#E5EAF0] rounded-lg overflow-hidden shadow-sm', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5EAF0] bg-[#F7F9FC]">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'text-[11px] font-semibold text-[#667085] uppercase tracking-wider',
                    alignClass(col.align),
                    compact ? 'px-4 py-2.5' : 'px-5 py-3'
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EAF0] bg-white">
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: 4 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className={compact ? 'px-4 py-3' : 'px-5 py-3.5'}>
                      <div className="h-4 bg-[#EEF2F6] rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state inside table
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center">
                  <div className="flex flex-col items-center justify-center max-w-xs mx-auto">
                    <div className="w-10 h-10 rounded-full bg-[#F0F3F7] flex items-center justify-center text-[#667085] mb-2.5">
                      <Inbox className="w-5 h-5 text-[#667085]" />
                    </div>
                    <p className="text-sm font-semibold text-[#182230]">{emptyMessage}</p>
                    <p className="text-xs text-[#667085] mt-1">{emptySubtext}</p>
                    {emptyAction && <div className="mt-4">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => {
                const key = keyExtractor ? keyExtractor(item, rowIdx) : (item.id ?? rowIdx)
                const isClickable = !!onRowClick

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={cn(
                      'transition-colors duration-100',
                      isClickable ? 'cursor-pointer hover:bg-[#F7F9FC]' : 'hover:bg-[#F9FAFC]'
                    )}
                  >
                    {columns.map((col, colIdx) => {
                      const value = item[col.key]
                      return (
                        <td
                          key={col.key || colIdx}
                          className={cn(
                            'text-[#182230]',
                            alignClass(col.align),
                            compact ? 'px-4 py-2.5 text-xs' : 'px-5 py-3.5 text-sm'
                          )}
                        >
                          {col.render ? col.render(item, rowIdx) : value ?? '—'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {pagination && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E5EAF0] bg-white text-xs text-[#667085]">
          <div>
            {pagination.totalItems !== undefined ? (
              <span>
                Showing <strong className="text-[#182230]">{data.length}</strong> of{' '}
                <strong className="text-[#182230]">{pagination.totalItems}</strong> entries
              </span>
            ) : (
              <span>
                Page <strong className="text-[#182230]">{pagination.currentPage}</strong> of{' '}
                <strong className="text-[#182230]">{pagination.totalPages}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="xs"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="xs"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
