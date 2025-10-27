'use client';

import ResultsChart from './ResultsChart';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
import clsx from "clsx";
import type { BacktestChartPoint, BacktestDerivedStats, BacktestResult } from "@/types/backtest";

interface BacktestResultsProps {
    result: BacktestResult;
    chartData: BacktestChartPoint[];
    derived?: BacktestDerivedStats;
    className?: string;
}

const formatDuration = (ms?: number): string => {
    if (!ms || !Number.isFinite(ms)) return "—";
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes && parts.length < 2) parts.push(`${minutes}m`);
    if (!parts.length) return "<1m";
    return parts.join(" ");
};

const formatNumber = (value?: number, digits = 2): string => {
    if (value === undefined || value === null || Number.isNaN(value)) return "—";
    return value.toFixed(digits);
};

// Regime tooltips requested: lowvol, range, trend
const normalizeRegimeKey = (name: string): string => name.toLowerCase().replace(/[^a-z]/g, "");
const regimeTooltipMap: Record<string, string> = {
    lowvol: "Low Volatility: market shows smaller price swings; expect tighter ranges and lower ATR.",
    range: "Range-bound: price oscillates within a band; favor mean-reversion and fade breakouts.",
    trend: "Trend: sustained directional movement; favor pullbacks and breakouts in trend direction.",
};

export default function BacktestResults({ result, chartData, derived, className }: BacktestResultsProps) {
    const tradesCount = Array.isArray(result.trades)
        ? result.trades.length
        : (typeof result.trades === 'number' ? result.trades : 0);

    const profitFactor = typeof result.profitFactor === 'number' ? result.profitFactor : undefined;
    const profitFactorIsPositive =
        profitFactor !== undefined
            ? (Number.isFinite(profitFactor) ? profitFactor > 0 : profitFactor === Number.POSITIVE_INFINITY)
            : undefined;
    const profitFactorLabel =
        profitFactor === undefined ? "—" : Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞";
    const profitFactorClass =
        profitFactorIsPositive === undefined
            ? ""
            : profitFactorIsPositive
                ? "text-green-600"
                : "text-red-600";
    const avgR = typeof result.avgR === 'number' ? result.avgR : undefined;
    const totalR = typeof result.totalR === 'number' ? result.totalR : undefined;
    const maxDrawdownR = typeof result.maxDrawdownR === 'number' ? result.maxDrawdownR : undefined;
    const startBalance = typeof result.startBalance === 'number' ? result.startBalance : undefined;
    const endBalance = typeof result.endBalance === 'number' ? result.endBalance : undefined;
    const totalPl = startBalance !== undefined && endBalance !== undefined ? endBalance - startBalance : undefined;
    const balanceValues = chartData
        .map((point) => (typeof point.balance === 'number' && Number.isFinite(point.balance) ? point.balance : undefined))
        .filter((value): value is number => value !== undefined);
    const maxBalance = balanceValues.length > 0 ? Math.max(...balanceValues) : undefined;
    const avgDurationLabel = formatDuration(derived?.avgDurationMs);
    const longestDurationLabel = formatDuration(derived?.maxDurationMs);
    const longestOpened =
        derived?.maxDurationOpenTs !== undefined
            ? formatDate(new Date(derived.maxDurationOpenTs))
            : undefined;
    const tradesPerDayLabel = derived?.tradesPerDay !== undefined ? formatNumber(derived.tradesPerDay, 2) : "—";
    const tradesPerWeekLabel = derived?.tradesPerWeek !== undefined ? formatNumber(derived.tradesPerWeek, 2) : "—";

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
                    <dd className={`mt-1 text-lg font-mono ${profitFactorClass}`}>
                        {profitFactorLabel}
                    </dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Average R</dt>
                    <dd className="mt-1 text-lg font-mono">{avgR !== undefined ? avgR.toFixed(3) : "—"}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Total R</dt>
                    <dd className="mt-1 text-lg font-mono">{totalR !== undefined ? totalR.toFixed(2) : "—"}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Max Drawdown (R)</dt>
                    <dd className="mt-1 text-lg font-mono">{maxDrawdownR !== undefined ? maxDrawdownR.toFixed(2) : "—"}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Starting Balance</dt>
                    <dd className="mt-1 text-lg font-mono">
                        {startBalance !== undefined ? formatCurrency(startBalance) : "—"}
                    </dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Ending Balance</dt>
                    <dd className="mt-1 text-lg font-mono">
                        {endBalance !== undefined ? formatCurrency(endBalance) : "—"}
                    </dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Max Balance</dt>
                    <dd className="mt-1 text-lg font-mono">
                        {maxBalance !== undefined ? formatCurrency(maxBalance) : "—"}
                    </dd>
                </div>
                <div className="col-span-2 md:col-span-3">
                    <dt className="text-sm font-medium">Total P/L</dt>
                    <dd className={`mt-1 text-lg font-mono ${totalPl !== undefined && totalPl >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {totalPl !== undefined
                            ? formatCurrency(totalPl)
                            : "—"}
                    </dd>
                </div>
            </dl>

            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 text-slate-700 dark:text-slate-300 border-t pt-6">
                <div>
                    <dt className="text-sm font-medium">Avg Trade Duration</dt>
                    <dd className="mt-1 text-lg font-mono">{avgDurationLabel}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Longest Trade</dt>
                    <dd className="mt-1 text-lg font-mono">
                        {longestDurationLabel}
                        {longestOpened ? (
                            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Opened {longestOpened}
                            </span>
                        ) : null}
                    </dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Trades / Day</dt>
                    <dd className="mt-1 text-lg font-mono">{tradesPerDayLabel}</dd>
                </div>
                <div>
                    <dt className="text-sm font-medium">Trades / Week</dt>
                    <dd className="mt-1 text-lg font-mono">{tradesPerWeekLabel}</dd>
                </div>
            </dl>

            {derived?.regimeStats.length ? (
                <div className="border-t pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-3">
                        Regime Breakdown
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left text-slate-700 dark:text-slate-300">
                            <thead className="uppercase text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="py-2 pr-4" title="The market regime label this trade belonged to (e.g., Low Volatility, Trend, Chop).">Regime</th>
                                    <th className="py-2 pr-4 text-right" title="Number of trades taken in this regime.">Trades</th>
                                    <th className="py-2 pr-4 text-right" title="Number of winning trades in this regime.">Wins</th>
                                    <th className="py-2 pr-4 text-right" title="Wins divided by total trades for this regime.">Win Rate</th>
                                    <th className="py-2 pr-4 text-right" title="Sum of R-multiples across all trades in this regime (positive is good, negative is bad).">Total R</th>
                                </tr>
                            </thead>
                            <tbody>
                                {derived.regimeStats.map((stat) => (
                                    <tr key={stat.regime} className="border-b border-slate-200 dark:border-slate-800 last:border-0">
                                        <td className="py-2 pr-4 font-medium">
                                            {stat.regime}
                                            {(() => {
                                                const key = normalizeRegimeKey(stat.regime);
                                                const tip = regimeTooltipMap[key];
                                                return tip ? (
                                                    <span
                                                        className="ml-1 text-xs text-slate-500 dark:text-slate-400 cursor-help align-middle"
                                                        title={tip}
                                                    >
                                                        ⓘ
                                                    </span>
                                                ) : null;
                                            })()}
                                        </td>
                                        <td className="py-2 pr-4 text-right font-mono">{stat.trades}</td>
                                        <td className="py-2 pr-4 text-right font-mono">{stat.wins}</td>
                                        <td className="py-2 pr-4 text-right font-mono">
                                            {stat.winRate !== undefined ? formatPercent(stat.winRate, 1) : "–"}
                                        </td>
                                        <td className={`py-2 pr-4 text-right font-mono ${stat.totalR >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                            {stat.totalR.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}

            <div className="border-t pt-6">
                <ResultsChart data={chartData} xLabel="Month/Year" yLeftLabel="Equity (R)" />
            </div>
        </div>
    );
}
