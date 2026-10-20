import { registerSW } from 'virtual:pwa-register';

let updateSWFunction: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function initServiceWorker(onOfflineReady?: () => void, onNeedRefresh?: () => void) {
  if ('serviceWorker' in navigator) {
    updateSWFunction = registerSW({
      immediate: true,
      onOfflineReady() {
        // App is now cached and ready to work offline
        if (onOfflineReady) {
          onOfflineReady();
        }
      },
      onNeedRefresh() {
        if (onNeedRefresh) {
          onNeedRefresh();
        }
      },
      onRegisterError(error) {
        console.warn('Service Worker registration error:', error);
      },
    });
  }
}

export function triggerSWUpdate() {
  if (updateSWFunction) {
    updateSWFunction(true);
  } else {
    window.location.reload();
  }
}
