import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import type { BacktestResult, TradeLike } from '@/types/backtest';

interface ExtendedEventSource extends EventSource {
    _jobId?: string;
    _connecting?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
};

const normalizeTrades = (raw: unknown): TradeLike[] => {
    // Accept either a single trade object or an array of trade objects
    const inputArray: unknown[] = Array.isArray(raw) ? raw : [raw];
    return inputArray
        .map((item) => (isRecord(item) ? { ...item } as TradeLike : null))
        .filter((item): item is TradeLike => item !== null)
        .map((trade) => {
            const rec = trade as Record<string, unknown>;
            const openedAt = (rec.openedAt as string | undefined) ?? (rec.opened_at as string | undefined);
            const time = (rec.time as string | undefined) ?? (rec.time as string | undefined);

            // If time is missing or clearly not a valid date string, but openedAt is valid, use openedAt for time
            const timeParsed = typeof time === 'string' ? Date.parse(time) : NaN;
            const openedParsed = typeof openedAt === 'string' ? Date.parse(openedAt) : NaN;
            if ((typeof time !== 'string' || Number.isNaN(timeParsed)) && !Number.isNaN(openedParsed)) {
                trade.time = openedAt as string;
            }

            return trade;
        });
};

const normalizeResult = (raw: unknown): Partial<BacktestResult> => {
    if (!isRecord(raw)) return {};
    const output: Partial<BacktestResult> = {};

    if (Array.isArray(raw.trades)) {
        output.trades = normalizeTrades(raw.trades);
    } else {
        const tradesNum = toNumber(raw.trades);
        if (typeof tradesNum === 'number') output.trades = tradesNum;
    }

    const equityCurve = raw.equityCurve ?? raw.equity_curve;
    if (Array.isArray(equityCurve)) output.equityCurve = equityCurve.filter((n): n is number => typeof n === 'number');

    const equityCurveUSD = raw.equityCurveUSD ?? raw.equity_curve_usd ?? raw.equity_usd ?? raw.balance_curve_usd;
    if (Array.isArray(equityCurveUSD)) output.equityCurveUSD = equityCurveUSD.filter((n): n is number => typeof n === 'number');

    const wins = toNumber(raw.wins);
    if (typeof wins === 'number') output.wins = wins;

    const losses = toNumber(raw.losses);
    if (typeof losses === 'number') output.losses = losses;

    const winRate = toNumber((raw as Record<string, unknown>).winRate ?? raw.win_rate);
    if (typeof winRate === 'number') output.winRate = winRate;

    const profitFactor = toNumber((raw as Record<string, unknown>).profitFactor ?? raw.profit_factor);
    if (typeof profitFactor === 'number') output.profitFactor = profitFactor;

    const avgR = toNumber((raw as Record<string, unknown>).avgR ?? raw.avg_r);
    if (typeof avgR === 'number') output.avgR = avgR;

    const totalR = toNumber((raw as Record<string, unknown>).totalR ?? raw.total_r);
    if (typeof totalR === 'number') output.totalR = totalR;

    const maxDrawdownR = toNumber((raw as Record<string, unknown>).maxDrawdownR ?? raw.max_drawdown_r ?? raw.max_drawdownR);
    if (typeof maxDrawdownR === 'number') output.maxDrawdownR = maxDrawdownR;

    const startBalance = toNumber((raw as Record<string, unknown>).startBalance ?? raw.start_balance);
    if (typeof startBalance === 'number') output.startBalance = startBalance;

    const endBalance = toNumber((raw as Record<string, unknown>).endBalance ?? raw.end_balance ?? raw.endingBalance ?? raw.ending_balance);
    if (typeof endBalance === 'number') output.endBalance = endBalance;

    return output;
};

type MergeSource = 'trade' | 'result' | 'progress' | 'done' | 'other';

const mergeState =
    (setResult: Dispatch<SetStateAction<BacktestResult | null>>) =>
        (update: Partial<BacktestResult> & { done?: boolean; progress?: Record<string, unknown> }, from: MergeSource) => {
            setResult((prev) => {
                const previous = prev ?? {};
                // Start from previous, then merge fields explicitly to avoid accidental downgrades (e.g., trades array -> number)
                const merged: BacktestResult = { ...previous };

                // Handle trades with special rules
                if (from === 'trade' && Array.isArray(update.trades)) {
                    const existing = Array.isArray(previous.trades) ? previous.trades : [];
                    merged.trades = [...existing, ...update.trades];
                } else if (from === 'result' && Array.isArray(update.trades)) {
                    const incomingLength = update.trades.length;
                    const previousLength = Array.isArray(previous.trades) ? previous.trades.length : 0;
                    merged.trades = incomingLength >= previousLength ? update.trades : previous.trades;
                } else if (update.trades !== undefined && !Array.isArray(update.trades)) {
                    // Do not overwrite an existing array of trades with a numeric count.
                    if (!Array.isArray(previous.trades)) {
                        merged.trades = update.trades;
                    }
                }

                // Merge other fields explicitly
                if (update.equityCurve !== undefined) merged.equityCurve = update.equityCurve;
                if (update.equityCurveUSD !== undefined) merged.equityCurveUSD = update.equityCurveUSD;
                if (update.wins !== undefined) merged.wins = update.wins;
                if (update.losses !== undefined) merged.losses = update.losses;
                if (update.winRate !== undefined) merged.winRate = update.winRate;
                if (update.profitFactor !== undefined) merged.profitFactor = update.profitFactor;
                if (update.avgR !== undefined) merged.avgR = update.avgR;
                if (update.totalR !== undefined) merged.totalR = update.totalR;
                if (update.maxDrawdownR !== undefined) merged.maxDrawdownR = update.maxDrawdownR;
                if (update.startBalance !== undefined) merged.startBalance = update.startBalance;
                if (update.endBalance !== undefined) merged.endBalance = update.endBalance;
                if (update.progress !== undefined) merged.progress = update.progress;
                if (update.done !== undefined) merged.done = update.done;

                return merged;
            });
        };

export function useBacktestStream(jobId: string, setResult: Dispatch<SetStateAction<BacktestResult | null>>) {
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

        const applyUpdate = mergeState(setResult);

        source.onopen = () => {
            source._connecting = false;
        };

        source.onerror = (err) => {
            source._connecting = false;
            console.error("SSE error:", err);
        };

        // Event listeners
        source.addEventListener('trade', (ev: MessageEvent) => {
            if (cancelled) return;
            try {
                const data = JSON.parse(ev.data);
                const trades = normalizeTrades(data);
                applyUpdate({ trades }, 'trade');
            } catch {}
        });

        source.addEventListener('heartbeat', () => {
            if (cancelled) return;
            // no-op heartbeat to keep connection alive
        });

        source.addEventListener('progress', (ev: MessageEvent) => {
            if (cancelled) return;
            try {
                const data = JSON.parse(ev.data);
                const normalized = normalizeResult(data);
                const progressPayload = isRecord(data) ? data : undefined;
                const update = { ...normalized, progress: progressPayload };
                // other fields like leverage are kept within progress only
                applyUpdate(update, 'progress');
            } catch {}
        });

        source.addEventListener('result', (ev: MessageEvent) => {
            if (cancelled) return;
            try {
                const data = JSON.parse(ev.data);
                const normalized = normalizeResult(data);
                applyUpdate(normalized, 'result');
            } catch {}
        });

        source.addEventListener('done', () => {
            if (cancelled) return;
            try {
                applyUpdate({ done: true }, 'done');
            } finally {
                try { source.close(); } catch {}
                esRef.current = null;
            }
        });

        esRef.current = source;

        return () => {
            cancelled = true;
            try { source.close(); } catch {}
            esRef.current = null;
        };
    }, [jobId, setResult]);

    // No return value, result is managed by provided setter
}
