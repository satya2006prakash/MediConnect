import { useQuery } from '@tanstack/react-query'
import { Users, Building2, ShoppingBag, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { StatsCard } from '@/components/ui/StatsCard'
import { Card, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      try {
        const [usersRes, pharmaciesRes, ordersRes, complaintsRes] = await Promise.all([
          supabase.from('profiles').select('id, role, created_at').neq('role', 'admin'),
          supabase.from('pharmacies').select('id, status, created_at'),
          supabase.from('orders').select('id, status, created_at'),
          supabase.from('complaints').select('id, status, created_at'),
        ])

        const users = usersRes.data || []
        const pharmacies = pharmaciesRes.data || []
        const orders = ordersRes.data || []
        const complaints = complaintsRes.data || []

        return { users, pharmacies, orders, complaints }
      } catch {
        return {
          users: [],
          pharmacies: [],
          orders: [],
          complaints: [],
        }
      }
    },
  })


  if (isLoading || !stats) return <PageLoader />

  const pendingPharmacies = stats.pharmacies.filter((p) => p.status === 'pending').length
  const openComplaints = stats.complaints.filter((c) => c.status === 'open').length

  // Build last-7-days order chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })

  const ordersByDay = last7Days.map((day) => ({
    date: day.slice(5),
    orders: stats.orders.filter((o) => o.created_at.slice(0, 10) === day).length,
  }))

  const pharmacyStatusData = [
    { label: 'Verified', value: stats.pharmacies.filter((p) => p.status === 'verified').length, fill: '#16a34a' },
    { label: 'Pending', value: pendingPharmacies, fill: '#d97706' },
    { label: 'Suspended', value: stats.pharmacies.filter((p) => p.status === 'suspended').length, fill: '#dc2626' },
  ]

  return (
    <div className="space-y-6 min-w-0 w-full">
      <PageHeader
        title="Platform Overview"
        description="Real-time analytics across the MediConnect platform."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 min-w-0">
        <StatsCard label="Total users" value={stats.users.length} icon={Users} />
        <StatsCard label="Pharmacies" value={stats.pharmacies.length} icon={Building2} />
        <StatsCard label="Total orders" value={stats.orders.length} icon={ShoppingBag} />
        <StatsCard label="Open complaints" value={openComplaints} icon={AlertCircle} iconClassName="bg-red-50" />
      </div>

      {/* Alerts */}
      {pendingPharmacies > 0 && (
        <div className="mb-5 flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{pendingPharmacies}</strong> {pendingPharmacies === 1 ? 'pharmacy awaits' : 'pharmacies await'} verification.{' '}
            <a href="/admin/pharmacies" className="underline font-medium">Review now →</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
        {/* Orders over time */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader title="Orders — last 7 days" />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ordersByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6 }} />
              <Line type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Pharmacy status */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader title="Pharmacy status breakdown" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pharmacyStatusData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6 }} />
              <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
