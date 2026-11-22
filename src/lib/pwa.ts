// Global PWA prompt listener captured at module load time so it is never missed
let deferredPrompt: any = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    window.dispatchEvent(new CustomEvent('pwa-prompt-ready'))
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    window.dispatchEvent(new CustomEvent('pwa-app-installed'))
  })
}

export function getDeferredPrompt(): any {
  return deferredPrompt
}

export function clearDeferredPrompt() {
  deferredPrompt = null
}
