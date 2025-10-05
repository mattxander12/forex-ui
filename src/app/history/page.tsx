'use client';

import { useEffect, useState } from "react";
// ... rest of imports and code ...
import type { Config } from "@/types/config";
import { formatDate, formatPercent, formatCurrency } from "@/lib/formatters";
import {BacktestResult} from "@/types/backtest";

type RunType = 'backtest' | 'mock-live';

interface Run {
    type: RunType;
    timestamp: string;
    jobId?: string;
    backtestYears?: number;
    config: Config;
    result?: BacktestResult;
}

export default function HistoryPage() {
    const [runs, setRuns] = useState<Run[]>([]);

    useEffect(() => {
        function readHistory() {
            try {
                const btRaw = localStorage.getItem("backtestHistory");
                const btArr: any[] = btRaw ? JSON.parse(btRaw) : [];
                const btRuns: Run[] = Array.isArray(btArr) ? btArr.map(r => ({...r, type: 'backtest' as RunType})) : [];

                const liveRaw = localStorage.getItem("runHistory");
                const liveArr: any[] = liveRaw ? JSON.parse(liveRaw) : [];
                const liveRuns: Run[] = Array.isArray(liveArr) ? liveArr.filter(r => r && r.type === 'mock-live') : [];

                const all = [...liveRuns, ...btRuns].sort((a, b) => (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
                setRuns(all);
            } catch {
                setRuns([]);
            }
        }
        readHistory();
        const onStorage = (e: StorageEvent) => {
            if (e.key === "backtestHistory" || e.key === 'runHistory') readHistory();
        };
        const onFocus = () => readHistory();
        window.addEventListener('storage', onStorage);
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onFocus);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onFocus);
        };
    }, []);

    // Handler to clear history
    const handleClearHistory = () => {
        localStorage.removeItem("backtestHistory");
        localStorage.removeItem("runHistory");
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
                    {runs.map((run, i) => {
                        const tradesCount = Array.isArray(run.result?.trades)
                            ? run.result?.trades.length
                            : (run.result?.trades as unknown as number) ?? 0;
                        return (
                        <li key={i} className="rounded-xl border bg-white dark:bg-slate-800 shadow">
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
                                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-4 items-center">
                                                {run.jobId && (
                                                    <span>
                                                        <strong>Job ID:</strong> {run.jobId}
                                                    </span>
                                                )}
                                                {run.config?.training?.months && (run.config.training.months as any) > 0 ? (
                                                    <span>
                                                        <strong>Backtest Months:</strong> {run.config.training.months}
                                                    </span>
                                                ) : (
                                                    run.backtestYears ? (
                                                        <span>
                                                            <strong>Backtest Years:</strong> {run.backtestYears}
                                                        </span>
                                                    ) : null
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
                                                        <strong>End:</strong> {formatCurrency((run.result as any).endBalance)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {run.type === 'backtest' ? (
                                        <span className="text-sm text-slate-700 dark:text-slate-300 ml-4 flex-shrink-0">
                                            Trades: <strong>{tradesCount}</strong>,{" "}
                                            Wins: <strong>{(run.result as any)?.wins ?? 0}</strong>,{" "}
                                            Win Rate: <strong>{formatPercent((run.result as any)?.winRate)}</strong>, Profit Factor: <strong>
                                                <span className={
                                                    (run.result as any)?.profitFactor !== undefined
                                                        ? (run.result as any).profitFactor > 0
                                                            ? "text-green-600 dark:text-green-400"
                                                            : "text-red-600 dark:text-red-400"
                                                        : ""
                                                }>
                                                    {(run.result as any)?.profitFactor?.toFixed?.(2) ?? "—"}
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
                                    {JSON.stringify(run.config, null, 2)}
                                </pre>
                            </details>
                        </li>
                    )})}
                </ul>
            )}
        </div>
    );
}