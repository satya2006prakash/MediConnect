import { useState, useEffect } from 'react'
import { Download, CheckCircle, Share, Smartphone } from 'lucide-react'
import { getDeferredPrompt, clearDeferredPrompt } from '@/lib/pwa'

interface PWAInstallButtonProps {
  variant?: 'card' | 'compact' | 'button'
  className?: string
}

export function PWAInstallButton({ variant = 'card', className = '' }: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => getDeferredPrompt())
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [showFallbackTip, setShowFallbackTip] = useState(false)

  useEffect(() => {
    // 1. Check if already installed / standalone
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    setIsStandalone(standalone)

    // 2. Check if iOS
    const ua = window.navigator.userAgent
    const ios = /iphone|ipad|ipod/i.test(ua)
    setIsIOS(ios)

    // Check existing prompt
    const existing = getDeferredPrompt()
    if (existing) {
      setDeferredPrompt(existing)
    }

    const onPromptReady = () => {
      setDeferredPrompt(getDeferredPrompt())
    }

    const onAppInstalled = () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
      clearDeferredPrompt()
      setShowIOSGuide(false)
      setShowFallbackTip(false)
    }

    window.addEventListener('pwa-prompt-ready', onPromptReady)
    window.addEventListener('pwa-app-installed', onAppInstalled)

    // Also listen locally as backup
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('pwa-prompt-ready', onPromptReady)
      window.removeEventListener('pwa-app-installed', onAppInstalled)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide((prev) => !prev)
      return
    }

    const promptEvent = deferredPrompt || getDeferredPrompt()

    if (promptEvent) {
      try {
        promptEvent.prompt()
        const { outcome } = await promptEvent.userChoice
        if (outcome === 'accepted') {
          setIsStandalone(true)
          setDeferredPrompt(null)
          clearDeferredPrompt()
        }
      } catch (err) {
        console.warn('Install prompt error:', err)
        setShowFallbackTip(true)
      }
    } else {
      setShowFallbackTip((prev) => !prev)
    }
  }

  // If already installed, show a clean indicator
  if (isStandalone) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium py-1.5 px-3 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 ${className}`}>
        <CheckCircle className="w-3.5 h-3.5" />
        <span>MediConnect App is installed</span>
      </div>
    )
  }

  // Compact variant (e.g. for bottom of Login Page)
  if (variant === 'compact') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-[#2457A7]/30 dark:border-[#2457A7]/40 bg-[#EEF4FC] dark:bg-[#16243B] text-[#2457A7] dark:text-[#58A6FF] hover:bg-[#E1ECFA] dark:hover:bg-[#1F3659] transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          <Smartphone className="w-4 h-4" />
          <span>Install MediConnect App</span>
        </button>

        {showIOSGuide && (
          <div className="w-full text-left bg-slate-50 dark:bg-[#0D1117] border border-border dark:border-[#30363D] rounded-lg p-2.5 text-[11px] text-slate-600 dark:text-slate-300 space-y-1 animate-in fade-in">
            <p className="font-semibold text-slate-900 dark:text-[#F0F6FC] flex items-center gap-1">
              <Share className="w-3 h-3 text-primary-600" />
              On iPhone / iPad Safari:
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              Tap <span className="font-medium text-slate-700 dark:text-slate-200">Share</span> (the box with arrow), then select <span className="font-medium text-slate-700 dark:text-slate-200">&apos;Add to Home Screen&apos;</span>.
            </p>
          </div>
        )}

        {showFallbackTip && (
          <div className="w-full text-left bg-slate-50 dark:bg-[#0D1117] border border-border dark:border-[#30363D] rounded-lg p-2.5 text-[11px] text-slate-600 dark:text-slate-300 space-y-1 animate-in fade-in">
            <p className="font-semibold text-slate-900 dark:text-[#F0F6FC]">
              Install from browser:
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              Click the <span className="font-medium text-slate-700 dark:text-slate-200">Install icon</span> in your browser address bar (top right in Chrome/Edge) or choose &apos;Install app&apos; from the browser menu.
            </p>
          </div>
        )}
      </div>
    )
  }

  // Card variant (for bottom of main Landing Page)
  return (
    <div className={`w-full max-w-xl mx-auto bg-white dark:bg-[#161B22] border border-border dark:border-[#30363D] rounded-2xl p-5 sm:p-6 shadow-xs ${className}`}>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
        <img
          src="/icons/icon-192x192.png"
          alt="MediConnect"
          className="w-14 h-14 rounded-2xl border border-border dark:border-[#30363D] shadow-xs object-contain p-1 bg-white flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-[#F0F6FC]">
            Install MediConnect on your Device
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Add MediConnect to your Home Screen or Desktop for fast 1-tap access, daily dose reminders, and offline capability.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2457A7] hover:bg-[#1E4888] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{isIOS ? 'Install on iPhone / iPad' : 'Install MediConnect App'}</span>
            </button>
            <span className="text-xs text-slate-400 dark:text-slate-400">
              Fast, free &amp; lightweight
            </span>
          </div>

          {showIOSGuide && (
            <div className="mt-3 bg-slate-50 dark:bg-[#0D1117] border border-border dark:border-[#30363D] rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 animate-in fade-in">
              <p className="font-semibold text-slate-900 dark:text-[#F0F6FC] flex items-center gap-1.5">
                <Share className="w-3.5 h-3.5 text-primary-600" />
                To install on your iPhone or iPad:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400 text-xs">
                <li>Tap the <span className="font-medium text-slate-700 dark:text-slate-200">Share</span> icon in the Safari bottom bar.</li>
                <li>Scroll down and tap <span className="font-medium text-slate-700 dark:text-slate-200">&apos;Add to Home Screen&apos;</span>.</li>
              </ol>
            </div>
          )}

          {showFallbackTip && (
            <div className="mt-3 bg-slate-50 dark:bg-[#0D1117] border border-border dark:border-[#30363D] rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300 space-y-1 animate-in fade-in">
              <p className="font-semibold text-slate-900 dark:text-[#F0F6FC]">
                To install from your desktop or mobile browser:
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Click the <span className="font-medium text-slate-700 dark:text-slate-200">Install icon</span> in the browser address bar (top-right of Chrome/Edge) or select <span className="font-medium text-slate-700 dark:text-slate-200">&apos;Install App&apos;</span> from your browser menu.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

