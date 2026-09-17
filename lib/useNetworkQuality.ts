'use client';

import { useState, useEffect } from 'react';

export interface NetworkQuality {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  saveData: boolean;
  isLowBandwidth: boolean;
  rtt?: number;
  downlink?: number;
}

export function useNetworkQuality(): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>({
    effectiveType: 'unknown',
    saveData: false,
    isLowBandwidth: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nav = navigator as any;
    const connection =
      nav.connection || nav.mozConnection || nav.webkitConnection;

    const updateConnectionStatus = () => {
      if (!connection) {
        setQuality({
          effectiveType: '4g',
          saveData: false,
          isLowBandwidth: false,
        });
        return;
      }

      const effectiveType = connection.effectiveType || '4g';
      const saveData = !!connection.saveData;
      const isLow =
        saveData ||
        effectiveType === 'slow-2g' ||
        effectiveType === '2g' ||
        effectiveType === '3g';

      setQuality({
        effectiveType,
        saveData,
        isLowBandwidth: isLow,
        rtt: connection.rtt,
        downlink: connection.downlink,
      });
    };

    updateConnectionStatus();

    if (connection && typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', updateConnectionStatus);
      return () => {
        connection.removeEventListener('change', updateConnectionStatus);
      };
    }
  }, []);

  return quality;
}
