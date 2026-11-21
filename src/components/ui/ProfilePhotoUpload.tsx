import React, { useRef, useState } from 'react'
import { Camera, Trash2, Upload, Loader2, User, Store, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export interface ProfilePhotoUploadProps {
  currentAvatarUrl?: string | null
  name?: string
  role?: 'patient' | 'pharmacy_admin' | 'admin'
  userId?: string
  onAvatarChange: (newAvatarUrl: string | null) => Promise<void> | void
  className?: string
}

/**
 * Resizes and compresses an image file to a square 320x320 JPEG data URL
 */
async function compressImageToSquare(file: File, size = 320, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return resolve(reader.result as string)
        }

        // Center crop to square
        const minDim = Math.min(img.width, img.height)
        const sx = (img.width - minDim) / 2
        const sy = (img.height - minDim) / 2

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function ProfilePhotoUpload({
  currentAvatarUrl,
  name,
  role = 'patient',
  userId,
  onAvatarChange,
  className,
}: ProfilePhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)

  // Sync if prop updates
  React.useEffect(() => {
    setPreviewUrl(currentAvatarUrl || null)
  }, [currentAvatarUrl])

  const initial = (name?.trim()?.charAt(0) || 'U').toUpperCase()

  const roleStyles = {
    patient: {
      bg: 'bg-[#EEF4FC] dark:bg-[#2457A7]/25',
      text: 'text-[#2457A7] dark:text-[#58A6FF]',
      border: 'border-[#CBDDF4] dark:border-[#2457A7]/40',
      icon: <User className="w-10 h-10" />,
    },
    pharmacy_admin: {
      bg: 'bg-[#EBF8F7] dark:bg-[#159A91]/25',
      text: 'text-[#159A91] dark:text-[#38D9A9]',
      border: 'border-[#C8ECE9] dark:border-[#159A91]/40',
      icon: <Store className="w-10 h-10" />,
    },
    admin: {
      bg: 'bg-[#182230] dark:bg-[#243247]',
      text: 'text-white',
      border: 'border-[#2A384C]',
      icon: <Shield className="w-10 h-10" />,
    },
  }[role]

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file must be under 5 MB')
      return
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WebP)')
      return
    }

    setIsProcessing(true)

    try {
      // 1. Client-side compress to square JPEG
      const compressedDataUrl = await compressImageToSquare(file, 320, 0.85)

      let finalUrl = compressedDataUrl

      // 2. Attempt Supabase Storage upload if bucket exists
      if (userId) {
        try {
          const filePath = `${userId}/${Date.now()}-avatar.jpg`
          // convert dataURL to blob
          const res = await fetch(compressedDataUrl)
          const blob = await res.blob()

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true })

          if (!uploadError) {
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
            if (data?.publicUrl) {
              finalUrl = data.publicUrl
            }
          }
        } catch {
          // If storage bucket isn't set up, the compressed data URL is used safely
        }
      }

      setPreviewUrl(finalUrl)
      await onAvatarChange(finalUrl)
      toast.success('Profile photo updated successfully!')
    } catch (err: any) {
      console.error('Avatar upload error:', err)
      toast.error(err?.message || 'Failed to process image')
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = async () => {
    setIsProcessing(true)
    try {
      setPreviewUrl(null)
      await onAvatarChange(null)
      toast.success('Profile photo removed')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove photo')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={cn('flex flex-col sm:flex-row items-center sm:items-start gap-5', className)}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Avatar Circle Container */}
      <div className="relative group shrink-0">
        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={cn(
            'w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 overflow-hidden flex items-center justify-center cursor-pointer transition-all duration-200 shadow-xs relative',
            roleStyles.border,
            previewUrl ? 'bg-slate-100 dark:bg-slate-800' : roleStyles.bg
          )}
          title="Click to change photo"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={name || 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className={cn('text-3xl sm:text-4xl font-bold select-none', roleStyles.text)}>
              {initial}
            </span>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {isProcessing ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : (
              <>
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-medium tracking-wide">Change</span>
              </>
            )}
          </div>
        </div>

        {/* Camera Badge Icon */}
        <button
          type="button"
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-md border-2 border-white dark:border-[#161B22] flex items-center justify-center transition-transform hover:scale-105 focus:outline-none"
          title="Upload new photo"
          disabled={isProcessing}
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* Controls & Guidance */}
      <div className="flex-1 text-center sm:text-left space-y-2">
        <h3 className="text-sm font-semibold text-[#182230] dark:text-[#F0F6FC]">
          {role === 'pharmacy_admin'
            ? 'Pharmacy Logo / Profile Photo'
            : role === 'admin'
              ? 'Administrator Profile Photo'
              : 'Profile Photo'}
        </h3>
        <p className="text-xs text-[#667085] dark:text-[#8B949E] leading-relaxed max-w-md">
          {role === 'pharmacy_admin'
            ? 'Upload your official pharmacy store logo or dispensing partner photo. This appears on patient orders and invoices.'
            : role === 'admin'
              ? 'Personalize your platform administrator profile. Visible across system administration panels.'
              : 'Upload a clear profile picture so pharmacies and administrators can identify your refill requests.'}
        </p>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isProcessing}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
          >
            {previewUrl ? 'Change Photo' : 'Upload Photo'}
          </Button>

          {previewUrl && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRemovePhoto}
              disabled={isProcessing}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Remove
            </Button>
          )}
        </div>

        <p className="text-[11px] text-[#98A2B3] dark:text-[#667085]">
          Supported formats: JPG, PNG, WebP (max 5 MB).
        </p>
      </div>
    </div>
  )
}
