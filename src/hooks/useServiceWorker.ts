import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseServiceWorkerResult {
  needsRefresh: boolean;
  updateServiceWorker: () => void;
}

/**
 * Detects when a new service worker version is available and exposes
 * state + action to prompt the user to reload.
 *
 * Works with vite-plugin-pwa's registerSW from 'virtual:pwa-register'
 * when available, or falls back to the raw Service Worker API to detect
 * `updatefound` events.
 */
export function useServiceWorker(): UseServiceWorkerResult {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const updateFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Attempt to use vite-plugin-pwa's registerSW
    let cleanup: (() => void) | undefined;

    async function tryRegisterPWA() {
      try {
        // Dynamic import so it doesn't break if vite-plugin-pwa isn't installed yet
        const { registerSW } = await import('virtual:pwa-register');
        const updateSW = registerSW({
          onNeedRefresh() {
            setNeedsRefresh(true);
          },
          onOfflineReady() {
            // App is ready for offline use — no action needed here
          },
        });

        // registerSW returns an update function that triggers SW update
        updateFnRef.current = () => {
          updateSW(true);
        };
      } catch {
        // vite-plugin-pwa not available — fall back to raw Service Worker API
        registerWithRawAPI();
      }
    }

    function registerWithRawAPI() {
      if (!('serviceWorker' in navigator)) {
        return;
      }

      navigator.serviceWorker.getRegistration().then((registration) => {
        if (!registration) return;

        // If there's already a waiting worker, an update is available
        if (registration.waiting) {
          setNeedsRefresh(true);
          updateFnRef.current = () => {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          };
          return;
        }

        // Listen for new service workers being installed
        function handleUpdateFound() {
          const newWorker = registration!.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW installed while we have an active one — update available
              setNeedsRefresh(true);
              updateFnRef.current = () => {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              };
            }
          });
        }

        registration.addEventListener('updatefound', handleUpdateFound);

        cleanup = () => {
          registration.removeEventListener('updatefound', handleUpdateFound);
        };
      });

      // Also listen for controller change (another tab triggered the update)
      let refreshing = false;
      function handleControllerChange() {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      }

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      const prevCleanup = cleanup;
      cleanup = () => {
        prevCleanup?.();
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }

    tryRegisterPWA();

    return () => {
      cleanup?.();
    };
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (updateFnRef.current) {
      updateFnRef.current();
    } else {
      // Fallback: just reload the page
      window.location.reload();
    }
  }, []);

  return { needsRefresh, updateServiceWorker };
}
