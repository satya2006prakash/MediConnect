export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
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
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    register()
  } else {
    window.addEventListener('load', register)
  }
}
