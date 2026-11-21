import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Store, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ProfilePhotoUpload } from '@/components/ui/ProfilePhotoUpload'
import toast from 'react-hot-toast'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  address: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

export function ProfilePage() {
  const { user, profile, fetchProfile, updateProfileAvatar } = useAuthStore()
  const isPharmacy = profile?.role === 'pharmacy_admin'
  const isAdmin = profile?.role === 'admin'

  // Fetch pharmacy details if role is pharmacy_admin
  const { data: pharmacy } = useQuery({
    queryKey: ['my-pharmacy', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('owner_id', profile!.id)
        .maybeSingle()
      if (error) return null
      return data
    },
    enabled: isPharmacy && !!profile?.id,
  })

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      city: profile?.city ?? '',
      pincode: profile?.pincode ?? '',
      address: profile?.address ?? '',
    },
  })

  const handleAvatarChange = async (newUrl: string | null) => {
    if (!profile) return
    try {
      // 1. Update user metadata in Supabase Auth
      await supabase.auth.updateUser({
        data: { avatar_url: newUrl },
      })

      // 2. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: newUrl, updated_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (profileError) {
        console.warn('Profiles update error:', profileError.message)
      }

      // 3. Update auth store so changes propagate immediately
      updateProfileAvatar(newUrl)
    } catch (err: any) {
      console.error('Failed to update avatar:', err)
      toast.error('Failed to update avatar')
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      // 1. Update user metadata in Supabase Auth
      await supabase.auth.updateUser({
        data: {
          full_name: data.full_name,
          phone: data.phone,
          city: data.city,
          pincode: data.pincode,
          address: data.address,
        },
      })

      // 2. Update profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', profile!.id)

      if (error) {
        // Fallback if profiles table is not yet migrated in Supabase
        if (error.message.includes('schema cache') || error.message.includes('profiles')) {
          useAuthStore.getState().setProfile({
            ...profile!,
            ...data,
            phone: data.phone || null,
            city: data.city || null,
            pincode: data.pincode || null,
            address: data.address || null,
            updated_at: new Date().toISOString(),
          })
          toast.success('Saved! Run supabase/full_setup.sql in Supabase SQL editor to create persistent tables.')
          return
        }
        throw error
      }
      await fetchProfile(profile!.id)
    },
    onSuccess: () => toast.success('Profile updated successfully'),
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={isPharmacy ? 'Pharmacy Profile' : isAdmin ? 'Administrator Profile' : 'Personal Profile'}
        description={
          isPharmacy
            ? 'Manage your pharmacy store details, license information, and logo.'
            : isAdmin
              ? 'Manage administrator identity and account information.'
              : 'Manage your personal profile and medicine delivery details.'
        }
      />

      {/* Section 1: Profile Photo Upload */}
      <Card>
        <CardHeader
          title={isPharmacy ? 'Pharmacy Logo / Profile Photo' : 'Profile Photo'}
          description={
            isPharmacy
              ? 'Upload your store logo or dispensing partner photo. This appears on patient orders and invoices.'
              : 'Upload a personal profile photo visible across the platform.'
          }
        />
        <ProfilePhotoUpload
          currentAvatarUrl={profile?.avatar_url}
          name={profile?.full_name}
          role={profile?.role}
          userId={profile?.id}
          onAvatarChange={handleAvatarChange}
        />
      </Card>

      {/* Pharmacy Information Summary (for Pharmacy Admin) */}
      {isPharmacy && pharmacy && (
        <Card>
          <CardHeader
            title="Pharmacy Store Information"
            description="Verified dispensing partner details."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#F7F9FC] dark:bg-[#0D1117] rounded-lg border border-[#E5EAF0] dark:border-[#30363D]">
              <span className="text-[#667085] dark:text-[#8B949E] flex items-center gap-1.5 mb-1">
                <Store className="w-3.5 h-3.5 text-[#159A91]" />
                Pharmacy Name
              </span>
              <p className="font-semibold text-sm text-[#182230] dark:text-[#F0F6FC]">{pharmacy.name}</p>
            </div>

            <div className="p-3 bg-[#F7F9FC] dark:bg-[#0D1117] rounded-lg border border-[#E5EAF0] dark:border-[#30363D]">
              <span className="text-[#667085] dark:text-[#8B949E] flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-[#2457A7]" />
                Drug License Number
              </span>
              <p className="font-mono font-semibold text-xs text-[#182230] dark:text-[#F0F6FC]">{pharmacy.license_number || 'Under review'}</p>
            </div>

            <div className="p-3 bg-[#F7F9FC] dark:bg-[#0D1117] rounded-lg border border-[#E5EAF0] dark:border-[#30363D]">
              <span className="text-[#667085] dark:text-[#8B949E] block mb-1">Verification Status</span>
              <StatusBadge status={pharmacy.status} />
            </div>

            <div className="p-3 bg-[#F7F9FC] dark:bg-[#0D1117] rounded-lg border border-[#E5EAF0] dark:border-[#30363D]">
              <span className="text-[#667085] dark:text-[#8B949E] block mb-1">Operating City</span>
              <p className="font-semibold text-[#182230] dark:text-[#F0F6FC]">{pharmacy.city || '—'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Section 2: Contact & Location Details */}
      <Card>
        <CardHeader
          title={isPharmacy ? 'Store Contact & Manager Details' : 'Personal Details'}
          description={isPharmacy ? 'Dispensing contact information and physical address.' : 'Your name, phone number, and delivery address.'}
        />

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={isPharmacy ? 'Manager / Pharmacist name' : 'Full name'}
              error={errors.full_name?.message}
              required
              {...register('full_name')}
            />
            <Input label="Phone number" type="tel" error={errors.phone?.message} {...register('phone')} />
          </div>
          <Input label="Address" error={errors.address?.message} {...register('address')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="City" error={errors.city?.message} {...register('city')} />
            <Input label="Pincode" maxLength={6} error={errors.pincode?.message} {...register('pincode')} />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={isSubmitting || mutation.isPending} disabled={!isDirty}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Section 3: Account info (read-only) */}
      <Card>
        <CardHeader title="Account Information" />
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-border dark:border-[#30363D]">
            <span className="text-slate-500 dark:text-[#8B949E]">Email Address</span>
            <span className="font-medium text-slate-900 dark:text-[#F0F6FC]">{user?.email || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border dark:border-[#30363D]">
            <span className="text-slate-500 dark:text-[#8B949E]">Portal Genre</span>
            <span className="font-medium text-slate-900 dark:text-[#F0F6FC] capitalize">
              {profile?.role === 'pharmacy_admin' ? 'Pharmacy Dispensing Partner' : profile?.role === 'admin' ? 'Super Administrator' : 'Patient'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500 dark:text-[#8B949E]">Member since</span>
            <span className="text-slate-900 dark:text-[#F0F6FC]">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
