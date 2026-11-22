export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log('[PWA] New version of MediConnect is available.')
              } else {
                console.log('[PWA] MediConnect is cached for offline use.')
              }
            }
          }
        }
      })
      .catch((error) => {
        console.warn('[PWA] Service worker registration failed:', error)
      })
  })
}
