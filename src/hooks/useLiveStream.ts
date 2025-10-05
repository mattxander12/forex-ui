import {useEffect, useRef, useState} from 'react';
import type { LiveEquity, LiveOrder, LiveSignal, LiveState, LiveTrade } from '@/types/live';

interface ExtendedEventSource extends EventSource {
  _jobId?: string;
  _connecting?: boolean;
}

export function useLiveStream(jobId?: string) {
  const esRef = useRef<ExtendedEventSource | null>(null);
  const [state, setState] = useState<LiveState>({ trades: [] });

  useEffect(() => {
    if (!jobId) return;

    if (esRef.current && esRef.current._jobId === jobId) {
      if (esRef.current._connecting) return;
      return;
    }

    if (esRef.current) {
      try { esRef.current.close(); } catch {}
      esRef.current = null;
    }

    const base = process.env.NEXT_PUBLIC_API_BASE ?? '';
    const version = process.env.NEXT_PUBLIC_API_VERSION ?? '';
    const es: ExtendedEventSource = new EventSource(`${base}/${version}/stream?jobId=${encodeURIComponent(jobId)}&t=${Date.now()}`);
    es._jobId = jobId;
    es._connecting = true;

    es.onopen = () => { es._connecting = false; };
    es.onerror = () => { es._connecting = false; };

    const onSignal = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as LiveSignal;
        setState(prev => ({ ...prev, signal: data }));
      } catch {}
    };

    const onOrder = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as LiveOrder;
        setState(prev => ({ ...prev, lastOrder: data }));
      } catch {}
    };

    const onTrade = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as LiveTrade;
        setState(prev => ({ ...prev, trades: [...prev.trades, data] }));
      } catch {}
    };

    const onEquity = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as LiveEquity;
        setState(prev => ({ ...prev, equity: data }));
      } catch {}
    };

    es.addEventListener('signal', onSignal);
    es.addEventListener('order', onOrder);
    es.addEventListener('trade', onTrade);
    es.addEventListener('equity', onEquity);

    esRef.current = es;

    return () => {
      try { es.removeEventListener('signal', onSignal); } catch {}
      try { es.removeEventListener('order', onOrder); } catch {}
      try { es.removeEventListener('trade', onTrade); } catch {}
      try { es.removeEventListener('equity', onEquity); } catch {}
      try { es.close(); } catch {}
      esRef.current = null;
    };
  }, [jobId]);

  return state;
}
