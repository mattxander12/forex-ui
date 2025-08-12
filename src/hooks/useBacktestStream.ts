import { useEffect, useRef } from 'react';
import type {BacktestResult, Trade} from '@/types/backtest';

interface ExtendedEventSource extends EventSource {
    _jobId?: string;
    _connecting?: boolean;
}

export function useBacktestStream(jobId: string, setResult: (res: (prev: BacktestResult) => (BacktestResult)) => void) {
    const esRef = useRef<ExtendedEventSource | null>(null);

    useEffect(() => {
        if (!jobId) return;

        // Prevent duplicate connections
        if (esRef.current && esRef.current._jobId === jobId) {
            if (esRef.current._connecting) return;
            return;
        }

        // Close old EventSource
        if (esRef.current) {
            try { esRef.current.close(); } catch {}
            esRef.current = null;
        }

        let cancelled = false;

        const base = process.env.NEXT_PUBLIC_API_BASE ?? '';
        const version = process.env.NEXT_PUBLIC_API_VERSION ?? '';
        const source: ExtendedEventSource = new EventSource(
            `${base}/${version}/stream?jobId=${encodeURIComponent(jobId)}&t=${Date.now()}`
        );
        source._jobId = jobId;
        source._connecting = true;

        source.onopen = () => {
            source._connecting = false;
            console.log("SSE connected:", jobId);
        };

        source.onerror = (err) => {
            source._connecting = false;
            console.error("SSE error:", err);
        };

        // Merge helper
        function mergeState(
            update: Partial<BacktestResult> & { done?: boolean; progress?: unknown },
            from: 'trade' | 'result' | 'progress' | 'done' | string = 'other'
        ) {
            setResult((prev: BacktestResult) => {
                if (!prev) {
                    const initial: BacktestResult = { ...update };
                    if (!initial.trades) initial.trades = [];
                    return initial;
                }
                const merged: BacktestResult = { ...prev, ...update };
                if (from === 'trade') {
                    if (Array.isArray(update.trades)) {
                        merged.trades = [
                            ...(Array.isArray(prev.trades) ? prev.trades : []),
                            ...update.trades
                        ];
                    } else {
                        // If trades is not an array (could be number or undefined), just keep previous trades
                        merged.trades = prev.trades || [];
                    }
                } else if (from === 'result') {
                    if (Array.isArray(update.trades)) {
                        const tradesArray = update.trades as Trade[];
                        merged.trades = tradesArray.length > ((Array.isArray(prev.trades) ? prev.trades.length : 0))
                            ? tradesArray
                            : prev.trades;
                    } else {
                        // If trades is a number or undefined, keep previous trades
                        merged.trades = prev.trades;
                    }
                }
                if (Object.prototype.hasOwnProperty.call(update, "equityCurve") && update.equityCurve !== undefined) {
                    merged.equityCurve = update.equityCurve;
                }
                return merged;
            });
        }

        // Event listeners
        source.addEventListener('trade', (ev: MessageEvent) => {
            if (cancelled) return;
            try {
                const data = JSON.parse(ev.data);
                const trades = Array.isArray(data) ? data : [data];
                mergeState({ trades }, 'trade');
            } catch {}
        });

        source.addEventListener('progress', (ev: MessageEvent) => {
            if (cancelled) return;
            try {
                const data = JSON.parse(ev.data);
                mergeState({ progress: data }, 'progress');
            } catch {}
        });

        source.addEventListener('result', (ev: MessageEvent) => {
            if (cancelled) return;
            try {
                const data = JSON.parse(ev.data);
                mergeState(data, 'result');
            } catch {}
        });

        source.addEventListener('done', (ev: MessageEvent) => {
            if (cancelled) return;
            try {
                const data = JSON.parse(ev.data);
                mergeState({ done: true }, 'done');
                try { source.close(); } catch {}
                esRef.current = null;
                console.log("Backtest stream done:", data);
            } catch {
                mergeState({ done: true }, 'done');
                try { source.close(); } catch {}
                esRef.current = null;
                console.log("Backtest stream done");
            }
        });

        esRef.current = source;

        return () => {
            cancelled = true;
            try { source.close(); } catch {}
            esRef.current = null;
        };
    }, [jobId]);

    // No return value, result is managed by provided setter
}