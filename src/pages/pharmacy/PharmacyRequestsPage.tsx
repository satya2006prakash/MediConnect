import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { InboxIcon, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import type { Order, Pharmacy } from '@/types/database'

type OrderWithPatient = Order & { patient: { full_name: string; phone: string } }

export function PharmacyRequestsPage() {
  const { profile } = useAuthStore()

  const { data: pharmacy } = useQuery({
    queryKey: ['pharmacy', profile?.id],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('pharmacies').select('id').eq('owner_id', profile!.id).maybeSingle()
        if (!data) return null
        return data as unknown as Pharmacy
      } catch {
        return null
      }
    },
    enabled: !!profile?.id,
  })

  const { data: requests = [], isLoading } = useQuery<OrderWithPatient[]>({
    queryKey: ['pharmacy-requests', pharmacy?.id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, patient:profiles(full_name, phone)')
          .eq('pharmacy_id', pharmacy!.id)
          .in('status', ['pending', 'accepted', 'bill_generated', 'bill_approved', 'processing', 'dispatched'])
          .order('created_at', { ascending: false })
        if (error) {
          console.error('Error fetching pharmacy requests:', error)
          return []
        }
        return (data || []) as OrderWithPatient[]
      } catch {
        return []
      }
    },
    enabled: !!pharmacy?.id,
  })


  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Refill Requests"
        description={`${requests.filter((r) => r.status === 'pending').length} pending action${requests.filter((r) => r.status === 'pending').length !== 1 ? 's' : ''}`}
        actions={
          <Link
            to="/pharmacy/orders"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border dark:border-[#30363D] hover:bg-slate-50 dark:hover:bg-[#21262D] text-slate-700 dark:text-slate-200 transition-colors"
          >
            View Order History
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {requests.length === 0 ? (
        <EmptyState icon={InboxIcon} title="No active requests" description="Refill requests from patients will appear here." />
      ) : (
        <div className="bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-lg divide-y divide-border dark:divide-[#30363D]">
          {requests.map((req) => (
            <Link
              key={req.id}
              to={`/pharmacy/requests/${req.id}`}
              className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-slate-50 dark:hover:bg-[#21262D] transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-[#F0F6FC]">{req.patient?.full_name ?? 'Patient'}</p>
                <p className="text-xs text-slate-400 dark:text-[#8B949E] mt-0.5">
                  {req.patient?.phone && `${req.patient.phone} · `}
                  {formatDate(req.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={req.status} />
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
