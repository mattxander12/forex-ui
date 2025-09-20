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

        // Normalize helper: map snake_case and alternative keys to our BacktestResult shape
        function normalizeResult(raw: unknown): Partial<BacktestResult> {
            if (!raw || typeof raw !== 'object') return {};
            const out: Partial<BacktestResult> = {};

            const toNum = (x: unknown): number | undefined => {
                if (typeof x === 'number') return Number.isFinite(x) ? x : undefined;
                if (typeof x === 'string') {
                    const n = Number(x);
                    return Number.isFinite(n) ? n : undefined;
                }
                return undefined;
            };

            // Trades
            if (Array.isArray((raw as any).trades)) out.trades = (raw as any).trades as any[];
            else {
                const t = toNum((raw as any).trades);
                if (typeof t === 'number') out.trades = t;
            }

            // Equity curves
            const ec = (raw as any).equityCurve ?? (raw as any).equity_curve;
            if (Array.isArray(ec)) out.equityCurve = ec;
            const ecUsd = (raw as any).equityCurveUSD ?? (raw as any).equity_curve_usd ?? (raw as any).equity_usd ?? (raw as any).balance_curve_usd;
            if (Array.isArray(ecUsd)) out.equityCurveUSD = ecUsd;

            // Summary metrics
            const wins = toNum((raw as any).wins);
            if (typeof wins === 'number') out.wins = wins;
            const losses = toNum((raw as any).losses);
            if (typeof losses === 'number') out.losses = losses;

            const wr = toNum((raw as any).winRate ?? (raw as any).win_rate);
            if (typeof wr === 'number') out.winRate = wr;

            const pf = toNum((raw as any).profitFactor ?? (raw as any).profit_factor);
            if (typeof pf === 'number') out.profitFactor = pf;

            const avgR = toNum((raw as any).avgR ?? (raw as any).avg_r);
            if (typeof avgR === 'number') out.avgR = avgR;

            const totalR = toNum((raw as any).totalR ?? (raw as any).total_r);
            if (typeof totalR === 'number') out.totalR = totalR;

            const mddR = toNum((raw as any).maxDrawdownR ?? (raw as any).max_drawdown_r ?? (raw as any).max_drawdownR);
            if (typeof mddR === 'number') out.maxDrawdownR = mddR;

            const sb = toNum((raw as any).startBalance ?? (raw as any).start_balance);
            if (typeof sb === 'number') out.startBalance = sb;

            const eb = toNum((raw as any).endBalance ?? (raw as any).end_balance ?? (raw as any).endingBalance ?? (raw as any).ending_balance);
            if (typeof eb === 'number') out.endBalance = eb;

            return out;
        }

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
                const arr = Array.isArray(data) ? data : [data];
                const trades = arr.map((t: unknown) => {
                    const tt: Record<string, unknown> = { ...(t as Record<string, unknown>) };
                    const openedAt = tt.openedAt ?? tt.opened_at ?? null;
                    const timeStr: string | undefined = tt.time;
                    const parsed = timeStr ? Date.parse(timeStr) : NaN;
                    if ((!timeStr || Number.isNaN(parsed)) && openedAt) {
                        tt.time = openedAt;
                    }
                    return tt;
                });
                mergeState({ trades }, 'trade');
            } catch {}
        });

        source.addEventListener('heartbeat', (_ev: MessageEvent) => {
            if (cancelled) return;
            // no-op heartbeat to keep connection alive
        });

        source.addEventListener('progress', (ev: MessageEvent) => {
            if (cancelled) return;
            try {
                const data = JSON.parse(ev.data);
                const normalized = normalizeResult(data);
                const update = { ...normalized, progress: data } as Partial<BacktestResult> & { progress: unknown };
                // other fields like leverage are kept within progress only
                mergeState(update, 'progress');
            } catch {}
        });

        source.addEventListener('result', (ev: MessageEvent) => {
            if (cancelled) return;
            try {
                const data = JSON.parse(ev.data);
                const normalized = normalizeResult(data);
                mergeState(normalized, 'result');
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