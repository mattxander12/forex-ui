'use client';

import ResultsChart from './ResultsChart';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import clsx from "clsx";

export default function BacktestResults({ result, chartData, className }: { result: any, chartData: any[], className?: string }) {
    const tradesCount =
        Array.isArray(result?.trades) ? result.trades.length : result?.trades ?? 0;

    const rootClass = clsx(
        "max-w-5xl mx-auto mt-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 md:p-8 space-y-6",
        className
    );

    return (
        <div className={rootClass}>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Backtest Results</h2>

            <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-slate-700 dark:text-slate-300">
                <div>
                    <dt className="text-sm font-medium">Trades</dt>
                    <dd className="mt-1 text-lg font-mono">{tradesCount}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Wins</dt>
                    <dd className="mt-1 text-lg font-mono">{result.wins ?? 0}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Losses</dt>
                    <dd className="mt-1 text-lg font-mono">{result.losses ?? 0}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Win Rate</dt>
                    <dd className="mt-1 text-lg font-mono">{formatPercent(result.winRate)}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Profit Factor</dt>
                    <dd className={`mt-1 text-lg font-mono ${result.profitFactor > 0 ? "text-green-600" : "text-red-600"}`}>
                        {result.profitFactor?.toFixed(2) ?? "—"}
                    </dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Average R</dt>
                    <dd className="mt-1 text-lg font-mono">{result.avgR?.toFixed(3) ?? "—"}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Total R</dt>
                    <dd className="mt-1 text-lg font-mono">{result.totalR?.toFixed(2) ?? "—"}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Max Drawdown (R)</dt>
                    <dd className="mt-1 text-lg font-mono">{result.maxDrawdownR?.toFixed(2) ?? "—"}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Starting Balance</dt>
                    <dd className="mt-1 text-lg font-mono">
                        {result.startBalance !== undefined ? formatCurrency(result.startBalance) : "—"}
                    </dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Ending Balance</dt>
                    <dd className="mt-1 text-lg font-mono">
                        {result.endBalance !== undefined ? formatCurrency(result.endBalance) : "—"}
                    </dd>
                </div>
                <div className="col-span-2 md:col-span-3">
                    <dt className="text-sm font-medium">Total P/L</dt>
                    <dd className={`mt-1 text-lg font-mono ${result.endBalance - result.startBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {result.startBalance !== undefined && result.endBalance !== undefined
                            ? formatCurrency(result.endBalance - result.startBalance)
                            : "—"}
                    </dd>
                </div>
            </dl>

            <div className="border-t pt-6">
                <ResultsChart data={chartData} xLabel="Trade Number" yLeftLabel="Equity (R)" />
            </div>
        </div>
    );
}