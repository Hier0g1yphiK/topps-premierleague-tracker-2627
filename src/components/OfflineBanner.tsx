import { useState, useEffect, useRef } from 'react';

export interface OfflineBannerProps {
  isOffline: boolean;
}

/**
 * Persistent top banner displayed when the device is offline.
 * When connectivity is restored (isOffline transitions from true to false),
 * the banner stays visible briefly then auto-hides within 5 seconds.
 */
export function OfflineBanner({ isOffline }: OfflineBannerProps) {
  const [visible, setVisible] = useState(isOffline);
  const wasOffline = useRef(isOffline);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOffline) {
      // Going offline — show banner immediately
      setVisible(true);
      wasOffline.current = true;
      // Clear any pending hide timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else if (wasOffline.current) {
      // Coming back online — hide banner within 5 seconds
      wasOffline.current = false;
      timerRef.current = setTimeout(() => {
        setVisible(false);
        timerRef.current = null;
      }, 5000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isOffline]);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-50 w-full bg-amber-100 border-b border-amber-300 px-4 py-3 text-center text-sm text-amber-900"
    >
      <span className="font-medium">You are offline.</span>{' '}
      Displayed data may be stale and changes will sync when connectivity is restored.
    </div>
  );
}
