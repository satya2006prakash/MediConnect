import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Users, Search, Trash2, AlertTriangle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/database'

export function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const queryClient = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) {
          console.error('Error fetching users:', error)
          return []
        }
        return (data || []) as Profile[]
      } catch {
        return []
      }
    },
  })

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteTarget.id }),
      })
      let data: any = {}
      try {
        data = await res.json()
      } catch {
        throw new Error('Server returned an unexpected response. Please refresh the page and try again.')
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user account')
      }
      toast.success(`User "${deleteTarget.full_name}" deleted permanently`)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err.message || 'Error deleting user')
    } finally {
      setIsDeleting(false)
    }
  }

  const filtered = users.filter((u) => {
    const matchesSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.city ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (isLoading) return <PageLoader />

  const rolePill = (role: string) => {
    const cls = {
      patient: 'bg-blue-50 text-blue-700',
      pharmacy_admin: 'bg-purple-50 text-purple-700',
      admin: 'bg-slate-100 text-slate-600',
    }[role] ?? 'bg-slate-100 text-slate-500'

    return (
      <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', cls)}>
        {role.replace('_', ' ')}
      </span>
    )
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        description={`${users.length} total users`}
      />

      <div className="flex gap-3 mb-5">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-sm border border-border rounded bg-white placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-border rounded bg-white text-slate-700 focus:outline-none focus:border-primary-500"
        >
          <option value="all">All roles</option>
          <option value="patient">Patients</option>
          <option value="pharmacy_admin">Pharmacy admins</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-x-auto shadow-2xs">
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">City</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-primary-700">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user.full_name}</p>
                        {user.phone && <p className="text-xs text-slate-400">{user.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">{rolePill(user.role)}</td>
                  <td className="px-5 py-3.5 text-slate-500">{user.city ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(user.created_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {user.role === 'admin' ? (
                      <span className="text-xs text-slate-400 font-medium italic">Protected</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(user)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs h-8 px-2.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" />
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-red-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">Delete User Account</h3>
                  <p className="text-xs text-slate-500">Permanent administrator action</p>
                </div>
              </div>
              <button
                onClick={() => !isDeleting && setDeleteTarget(null)}
                disabled={isDeleting}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete the account for{' '}
              <strong className="text-slate-900">{deleteTarget.full_name}</strong> ({rolePill(deleteTarget.role)})?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 mb-5 leading-relaxed">
              ⚠️ This action cannot be undone. This will permanently delete the user's Supabase Auth identity, profile, and all dependent orders, store inventory, complaints, and medicines.
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
