'use client';

import { useState, useEffect } from 'react';
import { useNetworkQuality } from '@/lib/useNetworkQuality';
import { WifiOff, Zap, X } from 'lucide-react';

export function LowBandwidthBanner() {
  const { isLowBandwidth, effectiveType, saveData } = useNetworkQuality();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLowBandwidth && !dismissed) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [isLowBandwidth, dismissed]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-fade-in pointer-events-auto">
      <div className="flex items-center gap-2.5 px-3.5 py-2 bg-zinc-900/95 border border-zinc-700/80 rounded-full shadow-2xl backdrop-blur-md text-xs text-white">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold">
          <Zap className="w-3.5 h-3.5" />
          <span>Lite Mode</span>
        </div>
        <span className="text-zinc-400 hidden sm:inline text-[11px]">
          ({saveData ? 'Data Saver' : effectiveType.toUpperCase()} · Low-bandwidth speed active)
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="ml-1 text-zinc-400 hover:text-white p-0.5 rounded-full transition-colors cursor-pointer"
          title="Dismiss notice"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
