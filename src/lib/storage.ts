import type {FullConfig} from "@/types/config";
import type {BacktestResult} from "@/types/backtest";

type PersistedResult = {
    wins?: number;
    losses?: number;
    trades?: number; // Always numeric in history
    winRate?: number;
    profitFactor?: number;
    avgR?: number;
    totalR?: number;
    maxDrawdownR?: number;
    startBalance?: number;
    endBalance?: number;
};

export interface BacktestRun {
    timestamp: string;
    jobId?: string;
    backtestYears?: number;
    config: FullConfig; // Always persist a concrete config snapshot
    result?: PersistedResult;
}

// Upsert: insert a new run or update the most recent run with the same jobId if the incoming
// result appears more complete (e.g., has endBalance, larger trades count, or has wins/losses)
export function upsertBacktestHistory(newRun: BacktestRun, opts?: { force?: boolean }): boolean {
    try {
        const historyRaw = localStorage.getItem("backtestHistory");
        const history: BacktestRun[] = historyRaw ? JSON.parse(historyRaw) : [];

        const idx = newRun.jobId ? history.findIndex(h => h.jobId === newRun.jobId) : -1;

        const toNum = (x: unknown): number => {
            if (typeof x === 'number' && Number.isFinite(x)) return x;
            if (typeof x === 'string') {
                const n = Number(x);
                return Number.isFinite(n) ? n : 0;
            }
            return 0;
        };
        const tradeCount = (t: unknown): number => Array.isArray(t) ? t.length : toNum(t);

        let updatedHistory: BacktestRun[];
        if (idx >= 0) {
            const prev = history[idx];
            const prevRes: Partial<BacktestResult> = (prev.result as Partial<BacktestResult>) || {};
            const nextRes: Partial<BacktestResult> = (newRun.result as Partial<BacktestResult>) || {};

            const prevTrades = tradeCount(prevRes.trades);
            const nextTrades = tradeCount(nextRes.trades);
            const prevWins = toNum(prevRes.wins);
            const nextWins = toNum(nextRes.wins);
            const prevLosses = toNum(prevRes.losses);
            const nextLosses = toNum(nextRes.losses);

            const prevWR = toNum(prevRes.winRate);
            const nextWR = toNum(nextRes.winRate);
            const prevPF = toNum(prevRes.profitFactor);
            const nextPF = toNum(nextRes.profitFactor);
            const prevEnd = toNum(prevRes.endBalance);
            const nextEnd = toNum(nextRes.endBalance);

            // Decide if an incoming result is more complete or should replace the previous
            const hasPrev = (v: unknown) => v !== undefined && v !== null;
            const isMoreComplete = (
                opts?.force === true ||
                // Prefer when 'done' is signaled in the incoming partial (passed via opts.force by caller)
                // Prefer when next has an endBalance defined and prev didn't, or value changed
                (!hasPrev(prevRes.endBalance) && hasPrev(nextRes.endBalance)) ||
                (hasPrev(prevRes.endBalance) && hasPrev(nextRes.endBalance) && nextEnd !== prevEnd) ||

                // Prefer when next has wins/losses defined or changed
                (!hasPrev(prevRes.wins) && hasPrev(nextRes.wins)) ||
                (!hasPrev(prevRes.losses) && hasPrev(nextRes.losses)) ||
                (nextWins !== prevWins) ||
                (nextLosses !== prevLosses) ||

                // Prefer when winRate/profitFactor become defined or changed (zero is valid)
                (!hasPrev(prevRes.winRate) && hasPrev(nextRes.winRate)) ||
                (!hasPrev(prevRes.profitFactor) && hasPrev(nextRes.profitFactor)) ||
                (nextWR !== prevWR) ||
                (nextPF !== prevPF) ||

                // Prefer when trades array/number increases or changes
                (nextTrades > prevTrades)
            );

            if (isMoreComplete) {
                const merged: BacktestRun = {
                    ...prev,
                    timestamp: prev.timestamp,
                    config: newRun.config || prev.config,
                    result: {...prevRes, ...nextRes} as PersistedResult,
                };
                updatedHistory = [
                    ...history.slice(0, idx),
                    merged,
                    ...history.slice(idx + 1),
                ];
            } else {
                updatedHistory = history;
            }
        } else {
            updatedHistory = [newRun, ...history];
        }

        try {
            localStorage.setItem("backtestHistory", JSON.stringify(updatedHistory));
            return true;
        } catch {
            if (updatedHistory.length > 1) {
                try {
                    localStorage.setItem("backtestHistory", JSON.stringify(updatedHistory.slice(0, -1)));
                    return true;
                } catch {
                }
            }
            return false;
        }
    } catch {
        try {
            localStorage.setItem("backtestHistory", JSON.stringify([newRun]));
            return true;
        } catch {
            return false;
        }
    }
}
