'use client';

import { useEffect, useState } from "react";
// ... rest of imports and code ...
import type { Config } from "@/types/config";
import { formatDate, formatPercent, formatCurrency } from "@/lib/formatters";
import {BacktestResult} from "@/types/backtest";

interface Run {
    timestamp: string;
    config: Config;
    result?: BacktestResult;
}

export default function HistoryPage() {
    const [runs, setRuns] = useState<Run[]>([]);

    useEffect(() => {
        const history = JSON.parse(localStorage.getItem("backtestHistory") || "[]");
        setRuns(history);
    }, []);

    // Handler to clear history
    const handleClearHistory = () => {
        localStorage.removeItem("backtestHistory");
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
                        No backtest runs saved yet.
                    </p>
                </div>
            ) : (
                <ul className="space-y-4">
                    {runs.map((run, i) => {
                        console.log("run", run);
                        const tradesCount = Array.isArray(run.result?.trades)
                            ? run.result?.trades.length
                            : run.result?.trades ?? 0;
                        return (
                        <li key={i} className="rounded-xl border bg-white dark:bg-slate-800 shadow">
                            <details className="group">
                                <summary className="cursor-pointer p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="transition-transform duration-200 group-open:rotate-90 text-white">▶</span>
                                        <div>
                                            <span className="font-mono text-sm text-slate-500">
                                                {formatDate(run.timestamp)}
                                            </span>
                                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-4 items-center">
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
                                                {run.config?.account?.startingBalance !== undefined && (
                                                    <span>
                                                        <strong>Start:</strong> {formatCurrency(run.config.account.startingBalance)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-sm text-slate-700 dark:text-slate-300 ml-4 flex-shrink-0">
                                        Trades: <strong>{tradesCount}</strong>,{" "}
                                        Wins: <strong>{run.result?.wins ?? 0}</strong>,{" "}
                                        Win Rate: <strong>{formatPercent(run.result?.winRate)}</strong>, Profit Factor: <strong>
                                            <span className={
                                                run.result?.profitFactor !== undefined
                                                    ? run.result.profitFactor > 0
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-red-600 dark:text-red-400"
                                                    : ""
                                            }>
                                                {run.result?.profitFactor?.toFixed(2) ?? "—"}
                                            </span>
                                        </strong>
                                    </span>
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
// (no changes here, this is just context for searchability)
// (no changes here, this is just context for searchability)