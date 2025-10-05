"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Config, FullConfig } from "@/types/config";
import { backtest as backtestApi } from "@/services/api";
import { mergeConfig } from "@/lib/configUtils";
import NumberInput from "@/components/common/NumberInput";
import BacktestResults from "@/components/charts/BacktestResults";
import { useBacktestStream } from "@/hooks/useBacktestStream";
import type { BacktestResult } from "@/types/backtest";
import { BacktestRun, upsertBacktestHistory } from "@/lib/storage";

export default function BacktestPage() {
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [years, setYears] = useState<number>(() => {
    try { const raw = localStorage.getItem('app.bt.years'); if (raw) { const n = parseInt(raw,10); if (Number.isFinite(n) && n>=0) return n; } } catch {}
    try { const cfgRaw = localStorage.getItem('app.config'); if (cfgRaw) { const cfg = JSON.parse(cfgRaw) as Config; const y = Number((cfg as any)?.training?.years ?? 1); if (Number.isFinite(y) && y>=0) return y; } } catch {}
    return 0;
  });
  const [months, setMonths] = useState<number>(() => {
    try { const raw = localStorage.getItem('app.bt.months'); if (raw) { const n = parseInt(raw,10); if (Number.isFinite(n) && n>=0) return n; } } catch {}
    try { const cfgRaw = localStorage.getItem('app.config'); if (cfgRaw) { const cfg = JSON.parse(cfgRaw) as Config; const m = Number((cfg as any)?.training?.months ?? 0); if (Number.isFinite(m) && m>=0) return m; } } catch {}
    return 0;
  });
  const [result, setResult] = useState<BacktestResult | null>(null);
  const runConfigRef = useRef<FullConfig | null>(null);
  const [historySaved, setHistorySaved] = useState(false);

  useEffect(() => { try { localStorage.setItem('app.bt.years', String(years)); } catch {} }, [years]);
  useEffect(() => { try { localStorage.setItem('app.bt.months', String(months)); } catch {} }, [months]);

  // Stream SSE
  // @ts-expect-error using generic hook
  useBacktestStream(jobId ?? '', setResult);

  const handleBacktest = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    setResult(null);
    setHistorySaved(false);
    try {
      const raw = localStorage.getItem("app.config");
      const baseCfg: Config = raw ? JSON.parse(raw) : ({} as any);
      const snapshot = mergeConfig(baseCfg);
      try {
        (snapshot as any).training = (snapshot as any).training ?? {};
        (snapshot as any).training.years = Math.max(0, Math.round(years));
        (snapshot as any).training.months = Math.max(0, Math.round(months));
      } catch {}
      runConfigRef.current = snapshot as FullConfig;
      const resp = await backtestApi(snapshot as any);
      setJobId(resp?.jobId ?? null);
      setMessage("Backtest started.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [years, months]);

  useEffect(() => {
    if (result && (result as any).done === true && !historySaved) {
      const tradesArray = Array.isArray(result.trades) ? result.trades as any[] : [];
      const computedWins = tradesArray.reduce((acc, t) => acc + ((t?.status === 'WON' || (typeof t?.r === 'number' && t.r > 0)) ? 1 : 0), 0);
      const computedLosses = tradesArray.reduce((acc, t) => acc + ((t?.status === 'LOST' || (typeof t?.r === 'number' && t.r < 0)) ? 1 : 0), 0);
      const pnlWins = tradesArray.filter(t => (t?.pnlUSD ?? 0) > 0).reduce((s, t) => s + (t?.pnlUSD ?? 0), 0);
      const pnlLoss = tradesArray.filter(t => (t?.pnlUSD ?? 0) < 0).reduce((s, t) => s + Math.abs(t?.pnlUSD ?? 0), 0);
      const computedProfitFactor = pnlLoss > 0 ? (pnlWins / pnlLoss) : (pnlWins > 0 ? Infinity : undefined);
      const cfg = (runConfigRef.current ?? (mergeConfig((JSON.parse(localStorage.getItem('app.config')||'{}')||{}) as any) as FullConfig));
      const startBalance = (result as any).startBalance ?? (cfg as any)?.paper?.startBalance;
      const endBalance = (result as any).endBalance;
      const run: BacktestRun = {
        timestamp: new Date().toISOString(),
        jobId: jobId ?? undefined,
        backtestYears: years,
        config: cfg as FullConfig,
        result: {
          wins: (result as any).wins ?? computedWins,
          losses: (result as any).losses ?? computedLosses,
          trades: typeof (result as any).trades === 'number' ? (result as any).trades : tradesArray.length,
          winRate: (result as any).winRate,
          profitFactor: (result as any).profitFactor ?? computedProfitFactor,
          avgR: (result as any).avgR,
          totalR: (result as any).totalR,
          maxDrawdownR: (result as any).maxDrawdownR,
          startBalance: startBalance,
          endBalance: endBalance,
        }
      };
      upsertBacktestHistory(run, { force: true });
      setHistorySaved(true);
    }
  }, [result, historySaved, years, jobId]);

  const chartData = (result?.equityCurve ?? []).map((r, i) => {
    const balance = result?.equityCurveUSD?.[i];
    const prevBalance = i > 0 ? result?.equityCurveUSD?.[i - 1] : balance;
    const pnl = balance !== undefined && prevBalance !== undefined ? (balance - prevBalance) : 0;
    const tradesArr = Array.isArray(result?.trades) ? (result!.trades as any[]) : [];
    const nearestIdx = Math.min(i, Math.max(tradesArr.length - 1, 0));
    const trade = tradesArr[i] ?? tradesArr[nearestIdx];
    const tStr = (trade?.openedAt ?? trade?.time) as string | undefined;
    let xTs: number = i;
    if (tStr) {
      const d = new Date(tStr);
      if (!isNaN(d.getTime())) xTs = d.getTime();
    }
    return { xTs, equityR: r as number, balance, pnl };
  });

  return (
    <div className="max-w-5xl mx-auto mt-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Backtest</h1>
      <p className="text-slate-700 dark:text-slate-300 mb-4">
        Uses the currently applied configuration. Update settings on the Config page, click "Apply Config", then start a backtest here.
      </p>
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <NumberInput
          label="Backtest Years"
          value={years}
          integerOnly={true}
          onChangeAction={(v) => setYears(Math.max(0, Math.round(v)))}
          hint="Can be 0 if using months-only"
        />
        <NumberInput
          label="Backtest Months"
          value={months}
          integerOnly={true}
          onChangeAction={(v) => setMonths(Math.max(0, Math.round(v)))}
          hint="Adds to years (totalMonths = years×12 + months)"
        />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <button
          disabled={busy}
          onClick={handleBacktest}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60"
        >
          {busy ? "Starting..." : "Start Backtest"}
        </button>
        {jobId && (
          <span className="text-sm text-slate-700 dark:text-slate-300">Job ID: <span className="font-mono">{jobId}</span></span>
        )}
      </div>
      {message && (
        <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{message}</div>
      )}
      {result && (
        <div className="mt-6">
          <BacktestResults result={result} chartData={chartData} />
        </div>
      )}
    </div>
  );
}
