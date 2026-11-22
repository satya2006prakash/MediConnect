import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true

    if (isStandalone) {
      return
    }

    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('mediconnect-pwa-dismissed') === 'true'

    // 2. Detect iOS devices
    const ua = window.navigator.userAgent
    const isIosDevice = /iphone|ipad|ipod/i.test(ua)
    setIsIOS(isIosDevice)

    if (isIosDevice && !isDismissed) {
      // Show iOS install reminder after a gentle delay
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
      return () => clearTimeout(timer)
    }

    // 3. Listen for Chromium/Android beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (!isDismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true)
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setShowIOSGuide(false)
    sessionStorage.setItem('mediconnect-pwa-dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <aside
      aria-label="PWA install banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-white dark:bg-[#161B22] border border-[#2457A7]/20 dark:border-[#30363D] rounded-2xl shadow-xl p-4 flex flex-col gap-3 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <img
            src="/icons/icon-192x192.png"
            alt="MediConnect App"
            className="w-12 h-12 rounded-xl shadow-xs border border-border flex-shrink-0 object-contain p-0.5 bg-white"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F0F6FC] leading-snug">
                Install MediConnect App
              </h3>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Install on your home screen for quick offline access, pill reminders, and fast refills.
            </p>
          </div>
        </div>

        {showIOSGuide ? (
          <div className="bg-slate-50 dark:bg-[#0D1117] border border-border dark:border-[#30363D] rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <p className="font-semibold text-slate-900 dark:text-[#F0F6FC] flex items-center gap-1.5">
              <Share className="w-3.5 h-3.5 text-primary-600" />
              To install on your iPhone or iPad:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400">
              <li>Tap the <span className="font-medium text-slate-700 dark:text-slate-200">Share</span> icon in the Safari bottom bar.</li>
              <li>Scroll down and tap <span className="font-medium text-slate-700 dark:text-slate-200">&apos;Add to Home Screen&apos;</span>.</li>
            </ol>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[#2457A7] hover:bg-[#1E4888] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIOS ? 'How to Install' : 'Install App'}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="py-2 px-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#21262D] rounded-lg transition-colors"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

