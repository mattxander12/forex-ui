'use client';

import React, {useState, useEffect, useRef} from 'react';
import ConfigForm from '@/components/forms/ConfigForm';
import {Config, DEFAULTS, FullConfig} from '@/types/config';
import { mergeConfig } from '@/lib/configUtils';
import {backtest, train} from '@/services/api';
import { useBacktestStream } from '@/hooks/useBacktestStream';
import BacktestResults from "@/components/charts/BacktestResults";
import type { BacktestResult } from '@/types/backtest';
import {BacktestRun, upsertBacktestHistory} from '@/lib/storage';

export default function Page() {
    const [value, setValue] = useState<Config>(DEFAULTS);
    const [runState, setRunState] = useState<{ id: number; status: "idle" | "running" | "done" }>({ id: 0, status: "idle" });
    const [trainingBusy, setTrainingBusy] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [runConfig, setRunConfig] = useState<Config | null>(null);
    const runConfigRef = useRef<Config | null>(null);
    const [historySaved, setHistorySaved] = useState(false);
    const [streamResult, setStreamResult] = useState<BacktestResult | null>(null);
    const latestBacktestYearsRef = useRef<number | undefined>(undefined);

    const onTrainAction = async () => {
        setTrainingBusy(true);
        try {
            await train(value);
        } finally {
            setTrainingBusy(false);
        }
    };

    const onBacktestAction = async () => {
        setStreamResult(null);
        setRunState(s => ({ id: s.id + 1, status: "running" }));
        // Capture an exact merged config snapshot for this run
        const snapshot = mergeConfig(value);
        setRunConfig(snapshot);
        runConfigRef.current = snapshot;
        setHistorySaved(false);
        try {
            const result = await backtest(value);
            setJobId(result.jobId);
        } catch (error) {
            setRunState(s => ({ ...s, status: "idle" }));
            throw error;
        }
    };

    // Stream hook after summary state
    // @ts-expect-error stream hook typed separately
    useBacktestStream(jobId ?? "", setStreamResult);

    // Reset historySaved when a new jobId arrives to allow saving for new runs
    useEffect(() => {
      if (jobId) {
        setHistorySaved(false);
      }
    }, [jobId]);

    useEffect(() => {
      if (streamResult?.done === true) {
        setRunState(s => ({ ...s, status: "idle" }));

        if (!historySaved) {
          const {
            wins,
            losses,
            trades,
            winRate,
            profitFactor,
            avgR,
            totalR,
            maxDrawdownR,
            startBalance,
            endBalance
          } = streamResult || {};

          // Compute client-side summary metrics as fallbacks when backend omits them
          const tradesArray = Array.isArray(trades) ? trades : [];
          const tradesCount = Array.isArray(trades)
            ? trades.length
            : (typeof trades === 'number' ? trades : 0);
          const computedWins = tradesArray.reduce((acc: number, t: { status?: string; r?: number }) => acc + (t?.status === 'WON' || (typeof t?.r === 'number' && t.r > 0) ? 1 : 0), 0);
          const computedLosses = tradesArray.reduce((acc: number, t: { status?: string; r?: number }) => acc + (t?.status === 'LOST' || (typeof t?.r === 'number' && t.r < 0) ? 1 : 0), 0);
          const computedWinRate = tradesCount > 0 ? (computedWins / tradesCount) * 100 : undefined;
          // Profit factor: sum winners' |pnl| / sum losers' |pnl| (avoid div by zero)
          const pnlWins = tradesArray.filter(t => (t?.pnlUSD ?? 0) > 0).reduce((s, t) => s + (t?.pnlUSD ?? 0), 0);
          const pnlLoss = tradesArray.filter(t => (t?.pnlUSD ?? 0) < 0).reduce((s, t) => s + Math.abs(t?.pnlUSD ?? 0), 0);
          const computedProfitFactor = pnlLoss > 0 ? (pnlWins / pnlLoss) : (pnlWins > 0 ? Infinity : undefined);

          const cfg = (runConfigRef.current ?? runConfig) ?? mergeConfig(value);
          const effectiveStart = (typeof startBalance === 'number' ? startBalance : cfg.paper.startBalance);
          // Ending balance fallback: explicit endBalance -> last trade equityUSD -> start + sum pnlUSD
          const lastTradeEquity = tradesArray.length ? tradesArray[tradesArray.length - 1]?.equityUSD : undefined;
          const sumPnl = tradesArray.reduce((s, t) => s + (typeof t?.pnlUSD === 'number' ? t.pnlUSD : 0), 0);
          const computedEnd = typeof endBalance === 'number'
            ? endBalance
            : (typeof lastTradeEquity === 'number' ? lastTradeEquity : ((effectiveStart + sumPnl)));

          const run: BacktestRun = {
            timestamp: new Date().toISOString(),
            jobId: jobId ?? undefined,
            backtestYears: latestBacktestYearsRef.current,
            config: cfg as FullConfig,
            result: {
              wins: typeof wins === 'number' ? wins : computedWins || 0,
              losses: typeof losses === 'number' ? losses : computedLosses || 0,
              // Persist trades as a NUMBER in history (never an array):
              // - If SSE provided a numeric trade, use it
              // - If SSE provided a trade array, use its length
              // - If undefined, fallback to derived length (or 0)
              trades: (typeof trades === 'number')
                ? trades
                : (Array.isArray(trades) ? trades.length : (Array.isArray(tradesArray) ? tradesArray.length : 0)),
              winRate: typeof winRate === 'number' ? winRate : computedWinRate,
              profitFactor: typeof profitFactor === 'number' ? profitFactor : computedProfitFactor,
              avgR,
              totalR,
              maxDrawdownR,
              startBalance: typeof startBalance === 'number' ? startBalance : effectiveStart,
              endBalance: typeof endBalance === 'number' ? endBalance : computedEnd,
            },
          };

          upsertBacktestHistory(run, { force: streamResult?.done === true });
          setHistorySaved(true);
        }
      }
    }, [streamResult, runConfig, historySaved, value, jobId]);

    // Derive chartData with Month/Year X axis using trade times when available
  const chartData = (streamResult?.equityCurve ?? []).map((r, i) => {
      const balance = streamResult?.equityCurveUSD?.[i];
      const prevBalance = i > 0 ? streamResult?.equityCurveUSD?.[i - 1] : balance;
      const pnl = balance !== undefined && prevBalance !== undefined ? balance - prevBalance : 0;
      // Build numeric timestamp for time-scaled X axis
      const tradesArr = Array.isArray(streamResult?.trades) ? streamResult?.trades : [];
      const nearestIdx = Math.min(i, Math.max(tradesArr.length - 1, 0));
      const trade = tradesArr[i] ?? tradesArr[nearestIdx];
      const tStr = (trade?.openedAt ?? trade?.time) as string | undefined;
      let xTs: number = i; // fallback monotonic value if no time
      if (tStr) {
        const d = new Date(tStr);
        if (!isNaN(d.getTime())) {
          xTs = d.getTime();
        }
      } else if (i > 0) {
        // carry forward previous timestamp if exists
        const prevTradeArr = Array.isArray(streamResult?.trades) ? (streamResult!.trades as { openedAt?: string; time?: string }[]) : [];
        const prev = prevTradeArr[i - 1]?.openedAt ?? prevTradeArr[i - 1]?.time;
        const pd = prev ? new Date(prev) : null;
        if (pd && !isNaN(pd.getTime())) xTs = pd.getTime();
      }
      return { xTs, equityR: r, balance, pnl };
    });

    return (
        <>
            <ConfigForm
                value={value}
                onChangeAction={setValue}
                onTrain={onTrainAction}
                onBacktest={onBacktestAction}
                busy={{ training: trainingBusy, backtesting: runState.status === "running" }}
                runId={runState.id}
                onBacktestYearsChange={(yrs) => {
                    // Capture for history metadata only; backend currently doesn’t use it
                    latestBacktestYearsRef.current = yrs;
                }}
            />
            {streamResult && (
                <BacktestResults result={streamResult} chartData={chartData} />
            )}
        </>
    );
}