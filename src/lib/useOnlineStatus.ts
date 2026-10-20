import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isUnstable: boolean;
  wasOffline: boolean;
  effectiveType?: string;
  lastOnlineAt: Date;
}

export function useOnlineStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [isUnstable, setIsUnstable] = useState<boolean>(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date>(new Date());
  const [effectiveType, setEffectiveType] = useState<string | undefined>(() => {
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } })?.connection;
    return conn?.effectiveType;
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
      setIsUnstable(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API for unstable network detection
    const navConn = (navigator as unknown as {
      connection?: {
        effectiveType?: string;
        rtt?: number;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    })?.connection;

    const checkConnectionQuality = () => {
      if (navConn) {
        setEffectiveType(navConn.effectiveType);
        // Unstable if 'slow-2g' or '2g' or RTT > 800ms
        const unstable =
          navConn.effectiveType === 'slow-2g' ||
          navConn.effectiveType === '2g' ||
          (typeof navConn.rtt === 'number' && navConn.rtt > 800);
        setIsUnstable(Boolean(unstable));
      }
    };

    if (navConn && navConn.addEventListener) {
      navConn.addEventListener('change', checkConnectionQuality);
      checkConnectionQuality();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (navConn && navConn.removeEventListener) {
        navConn.removeEventListener('change', checkConnectionQuality);
      }
    };
  }, []);

  return {
    isOnline,
    isUnstable,
    wasOffline,
    effectiveType,
    lastOnlineAt,
  };
}
