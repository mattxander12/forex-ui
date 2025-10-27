'use client';

import { useEffect, useState } from "react";
import type { ConfigInput, FullConfig } from "@/types/config";
import { mergeConfig } from "@/lib/configUtils";
import { formatCurrency, formatDate, formatPercent } from "@/lib/formatters";
import type { BacktestResult } from "@/types/backtest";

type RunType = 'backtest' | 'mock-live';

interface UiRun {
    type: RunType;
    timestamp: string;
    jobId?: string;
    backtestYears?: number;
    config?: FullConfig;
    result?: BacktestResult;
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

const safeParseJson = (value: string | null): unknown => {
    if (!value) return undefined;
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return undefined;
    }
};

const sanitizeResult = (value: unknown): BacktestResult | undefined => {
    if (!isRecord(value)) return undefined;
    const result: BacktestResult = {};
    const numericKeys: Array<keyof BacktestResult> = [
        'wins',
        'losses',
        'winRate',
        'profitFactor',
        'avgR',
        'totalR',
        'maxDrawdownR',
        'startBalance',
        'endBalance',
    ];

    numericKeys.forEach((key) => {
        const numericValue = toNumber(value[key]);
        if (numericValue !== undefined) {
            result[key] = numericValue as never;
        }
    });

    const tradesNumeric = toNumber(value.trades);
    if (tradesNumeric !== undefined) {
        result.trades = tradesNumeric;
    } else if (Array.isArray(value.trades)) {
        result.trades = [];
    }

    return Object.keys(result).length > 0 ? result : undefined;
};

const sanitizeConfig = (value: unknown): FullConfig | undefined => {
    if (!isRecord(value)) return undefined;
    return mergeConfig(value as ConfigInput);
};

const mapBacktestEntry = (entry: unknown): UiRun | null => {
    if (!isRecord(entry) || typeof entry.timestamp !== 'string') return null;
    const config = sanitizeConfig(entry.config);
    const result = sanitizeResult(entry.result);
    const backtestYears = toNumber(entry.backtestYears);
    const jobId = typeof entry.jobId === 'string' ? entry.jobId : undefined;
    return {
        type: 'backtest',
        timestamp: entry.timestamp,
        jobId,
        backtestYears,
        config,
        result,
    };
};

const mapMockLiveEntry = (entry: unknown): UiRun | null => {
    if (!isRecord(entry) || entry.type !== 'mock-live' || typeof entry.timestamp !== 'string') return null;
    const config = sanitizeConfig(entry.config);
    const result = sanitizeResult(entry.result);
    const backtestYears = toNumber(entry.backtestYears);
    const jobId = typeof entry.jobId === 'string' ? entry.jobId : undefined;
    return {
        type: 'mock-live',
        timestamp: entry.timestamp,
        jobId,
        backtestYears,
        config,
        result,
    };
};

export default function HistoryPage() {
    const [runs, setRuns] = useState<UiRun[]>([]);

    useEffect(() => {
        function readHistory() {
            try {
                const btRaw = safeParseJson(localStorage.getItem("backtestHistory"));
                const btRuns = Array.isArray(btRaw)
                    ? btRaw.map(mapBacktestEntry).filter((run): run is UiRun => run !== null)
                    : [];

                const liveRaw = safeParseJson(localStorage.getItem("runHistory"));
                const liveRuns = Array.isArray(liveRaw)
                    ? liveRaw.map(mapMockLiveEntry).filter((run): run is UiRun => run !== null)
                    : [];

                const all = [...liveRuns, ...btRuns].sort((a, b) => {
                    const tsA = new Date(a.timestamp).getTime();
                    const tsB = new Date(b.timestamp).getTime();
                    return tsB - tsA;
                });
                setRuns(all);
            } catch {
                setRuns([]);
            }
        }
        readHistory();
        const onStorage = (e: StorageEvent) => {
            if (e.key === "backtestHistory" || e.key === "runHistory") readHistory();
        };
        const onFocus = () => readHistory();
        window.addEventListener("storage", onStorage);
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onFocus);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onFocus);
        };
    }, []);

    const handleClearHistory = () => {
        try { localStorage.removeItem("backtestHistory"); } catch {}
        try { localStorage.removeItem("runHistory"); } catch {}
        setRuns([]);
    };

    return (
        <div className="max-w-5xl mx-auto mt-10">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    History
                </h1>
                <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium ml-4"
                    onClick={handleClearHistory}
                    disabled={runs.length === 0}
                >
                    Clear History
                </button>
            </div>

            {runs.length === 0 ? (
                <div className="rounded-xl border p-4 bg-white dark:bg-slate-800 shadow">
                    <p className="text-slate-700 dark:text-slate-300">
                        No runs saved yet.
                    </p>
                </div>
            ) : (
                <ul className="space-y-4">
                    {runs.map((run, index) => {
                        const tradesCount = Array.isArray(run.result?.trades)
                            ? run.result.trades.length
                            : (typeof run.result?.trades === 'number' ? run.result.trades : 0);
                        const profitFactorValue = typeof run.result?.profitFactor === 'number' ? run.result.profitFactor : undefined;
                        const profitFactorIsPositive =
                            profitFactorValue !== undefined
                                ? (Number.isFinite(profitFactorValue) ? profitFactorValue > 0 : profitFactorValue === Number.POSITIVE_INFINITY)
                                : undefined;
                        const profitFactorLabel =
                            profitFactorValue === undefined
                                ? "—"
                                : Number.isFinite(profitFactorValue)
                                    ? profitFactorValue.toFixed(2)
                                    : "∞";
                        const winRate = typeof run.result?.winRate === 'number' ? run.result.winRate : undefined;
                        const wins = typeof run.result?.wins === 'number' ? run.result.wins : 0;
                        const key = run.jobId ?? `${run.type}-${run.timestamp}-${index}`;
                        return (
                            <li key={key} className="rounded-xl border bg-white dark:bg-slate-800 shadow">
                                <details className="group">
                                    <summary className="cursor-pointer p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="transition-transform duration-200 group-open:rotate-90 text-white">▶</span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm text-slate-500">
                                                        {formatDate(run.timestamp)}
                                                    </span>
                                                    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${run.type === 'backtest' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'}`}>
                                                        {run.type}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                    {run.jobId && (
                                                        <span>
                                                            <strong>Job:</strong> <span className="font-mono">{run.jobId}</span>
                                                        </span>
                                                    )}
                                                    {run.backtestYears !== undefined && (
                                                        <span>
                                                            <strong>Years:</strong> {run.backtestYears}
                                                        </span>
                                                    )}
                                                    {run.config?.trading?.instrument && (
                                                        <span>
                                                            <strong>Instrument:</strong> {run.config.trading.instrument}
                                                        </span>
                                                    )}
                                                    {run.config?.trading?.granularity && (
                                                        <span>
                                                            <strong>Granularity:</strong> {run.config.trading.granularity}
                                                        </span>
                                                    )}
                                                    {run.config?.paper?.startBalance !== undefined && (
                                                        <span>
                                                            <strong>Start:</strong> {formatCurrency(run.config.paper.startBalance)}
                                                        </span>
                                                    )}
                                                    {run.result?.endBalance !== undefined && (
                                                        <span>
                                                            <strong>End:</strong> {formatCurrency(run.result.endBalance)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {run.type === 'backtest' ? (
                                            <span className="text-sm text-slate-700 dark:text-slate-300 ml-4 flex-shrink-0">
                                                Trades: <strong>{tradesCount}</strong>,{" "}
                                                Wins: <strong>{wins}</strong>,{" "}
                                                Win Rate: <strong>{formatPercent(winRate)}</strong>, Profit Factor: <strong>
                                                    <span
                                                        className={
                                                            profitFactorIsPositive === undefined
                                                                ? ""
                                                                : profitFactorIsPositive
                                                                    ? "text-green-600 dark:text-green-400"
                                                                    : "text-red-600 dark:text-red-400"
                                                        }
                                                    >
                                                        {profitFactorLabel}
                                                    </span>
                                                </strong>
                                            </span>
                                        ) : (
                                            <span className="text-sm text-slate-700 dark:text-slate-300 ml-4 flex-shrink-0">
                                                Live session (no summary). Open UI to see stream.
                                            </span>
                                        )}
                                    </summary>
                                    <pre className="mt-2 text-xs text-slate-700 dark:text-slate-300 overflow-x-auto bg-slate-100 dark:bg-slate-900 p-2 rounded">
                                        {JSON.stringify(run.config ?? {}, null, 2)}
                                    </pre>
                                </details>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
