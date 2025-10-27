"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConfigInput, FullConfig } from "@/types/config";
import { backtest as backtestApi } from "@/services/api";
import { mergeConfig } from "@/lib/configUtils";
import NumberInput from "@/components/common/NumberInput";
import BacktestResults from "@/components/charts/BacktestResults";
import { useBacktestStream } from "@/hooks/useBacktestStream";
import type {
  BacktestChartPoint,
  BacktestDerivedStats,
  BacktestResult,
  RegimeBreakdown,
  TradeLike,
} from "@/types/backtest";
import { BacktestRun, upsertBacktestHistory } from "@/lib/storage";

type JobResponse = { jobId?: string | null };

const CONFIG_STORAGE_KEY = "app.config";
const BT_YEARS_STORAGE_KEY = "app.bt.years";
const BT_MONTHS_STORAGE_KEY = "app.bt.months";

const clampToNonNegativeInt = (value: number): number => Math.max(0, Math.round(value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const safeParseConfig = (raw: string | null): ConfigInput | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? (parsed as ConfigInput) : null;
  } catch {
    return null;
  }
};

const readStoredConfig = (): ConfigInput | null => {
  try {
    return safeParseConfig(localStorage.getItem(CONFIG_STORAGE_KEY));
  } catch {
    return null;
  }
};

const readStoredInt = (key: string): number | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  } catch {
    return null;
  }
};

const readTrainingValue = (field: "years" | "months"): number | null => {
  try {
    const cfg = readStoredConfig();
    const value = cfg?.training?.[field];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return Math.round(value);
    }
  } catch {
    // ignore
  }
  return null;
};

const isJobResponse = (value: unknown): value is JobResponse =>
  isRecord(value) &&
  (!("jobId" in value) ||
    typeof value.jobId === "string" ||
    value.jobId === null ||
    value.jobId === undefined);

const computeTradeStats = (trades: TradeLike[]) => {
  let wins = 0;
  let losses = 0;
  let pnlWins = 0;
  let pnlLoss = 0;

  for (const trade of trades) {
    const status = typeof trade.status === "string" ? trade.status.toUpperCase() : undefined;
    const rMultiple = typeof trade.r === "number" ? trade.r : undefined;

    if (status === "WON" || (rMultiple !== undefined && rMultiple > 0)) {
      wins += 1;
    } else if (status === "LOST" || (rMultiple !== undefined && rMultiple < 0)) {
      losses += 1;
    }

    const pnlUSD = typeof trade.pnlUSD === "number" ? trade.pnlUSD : undefined;
    if (pnlUSD !== undefined) {
      if (pnlUSD > 0) {
        pnlWins += pnlUSD;
      } else if (pnlUSD < 0) {
        pnlLoss += Math.abs(pnlUSD);
      }
    }
  }

  return { wins, losses, pnlWins, pnlLoss };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const deriveTradeTimestamps = (trades: TradeLike[]): number[] => {
  const parsed = trades
    .map((trade) => {
      const rec = trade as Record<string, unknown>;
      const candidates = [
        rec.time,
        rec.openedAt,
        rec.opened_at,
        rec.open_time,
        rec.openTs,
        rec.open_ts,
        rec.entry,
        rec.entryTime,
        rec.entry_at,
        rec.entryTs,
        rec.entry_ts,
        rec.closedAt,
        rec.closed_at,
        rec.closeTime,
        rec.close_at,
        rec.closeTs,
        rec.close_ts,
        rec.exit,
        rec.exitTime,
        rec.exit_at,
        rec.exitTs,
        rec.exit_ts,
      ];
      for (const candidate of candidates) {
        const ts = parseTimestamp(candidate);
        if (ts !== undefined) return ts;
      }
      return undefined;
    })
    .filter((ts): ts is number => typeof ts === "number" && Number.isFinite(ts) && ts > 0);

  const unique = Array.from(new Set(parsed));
  unique.sort((a, b) => a - b);
  return unique;
};

const DEFAULT_BAR_STEP_MS = 5 * 60 * 1000; // 5 minutes

const parseTimestamp = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1e12) return value; // assume milliseconds
    if (value > 1e9) return value * 1000; // assume seconds
    if (value > 1e6) return value * 1000; // assume seconds resolution
    return undefined;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return parseTimestamp(numeric);
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
};

const extractTimestampRecursive = (
  value: unknown,
  keys: string[],
  depth = 0,
  maxDepth = 4
): number | undefined => {
  if (!isPlainObject(value) || depth > maxDepth) return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const ts = parseTimestamp(value[key]);
      if (ts !== undefined) return ts;
    }
  }
  for (const nested of Object.values(value)) {
    const ts = extractTimestampRecursive(nested, keys, depth + 1, maxDepth);
    if (ts !== undefined) return ts;
  }
  return undefined;
};

const parseGranularityToMs = (granularity?: string): number | undefined => {
  if (!granularity || typeof granularity !== "string") return undefined;
  const unit = granularity.charAt(0).toUpperCase();
  const magnitude = Number(granularity.slice(1) || "1");
  if (!Number.isFinite(magnitude) || magnitude <= 0) return undefined;
  const base: Record<string, number> = {
    S: 1000,
    M: 60 * 1000,
    H: 60 * 60 * 1000,
    D: 24 * 60 * 60 * 1000,
    W: 7 * 24 * 60 * 60 * 1000,
  };
  const unitMs = base[unit];
  if (!unitMs) return undefined;
  return unitMs * magnitude;
};

const subtractMonthsUtc = (timestamp: number, months: number): number => {
  const date = new Date(timestamp);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.getTime();
};

const buildChartData = (
  result: BacktestResult | null,
  tradesArray: TradeLike[],
  options: { config?: FullConfig | null; durationMonths: number }
): BacktestChartPoint[] => {
  if (!result?.equityCurve) return [];
  const balanceCurve = result.equityCurveUSD ?? [];

  const stepHintMs =
    parseGranularityToMs(options.config?.trading?.granularity) ?? DEFAULT_BAR_STEP_MS;

  const tradeTimes = deriveTradeTimestamps(tradesArray);
  const progress = result.progress;

  const endKeys = [
    "endTs",
    "end_ts",
    "end",
    "endTimestamp",
    "endMs",
    "toTs",
    "stopTs",
    "lastTs",
    "asOfTs",
    "completedAt",
  ];
  let endTs =
    extractTimestampRecursive(progress, endKeys) ??
    (tradeTimes.length ? tradeTimes[tradeTimes.length - 1] : undefined) ??
    Date.now();

  if (!Number.isFinite(endTs) || endTs <= 0) endTs = Date.now();

  const startKeys = [
    "startTs",
    "start_ts",
    "start",
    "startTimestamp",
    "fromTs",
    "beginTs",
    "windowStart",
    "firstTs",
  ];
  const startFromProgress = extractTimestampRecursive(progress, startKeys);
  const tradeStart = tradeTimes.length ? tradeTimes[0] : undefined;
  const fallbackMonths = Math.max(0, Math.round(options.durationMonths));
  const fallbackStart =
    fallbackMonths > 0 ? subtractMonthsUtc(endTs, fallbackMonths) : undefined;

  let startTs =
    startFromProgress ??
    tradeStart ??
    fallbackStart ??
    endTs - stepHintMs * Math.max(result.equityCurve.length - 1, 0);

  if (fallbackStart !== undefined && startTs < fallbackStart) {
    startTs = fallbackStart;
  }

  if (!Number.isFinite(startTs)) {
    startTs = endTs - stepHintMs * Math.max(result.equityCurve.length - 1, 0);
  }

  if (startTs > endTs) {
    const tmp = startTs;
    startTs = endTs;
    endTs = tmp;
  }

  const totalPoints = result.equityCurve.length;
  const effectiveStep =
    totalPoints > 1 && endTs !== startTs
      ? (endTs - startTs) / (totalPoints - 1)
      : stepHintMs;

  const timeline = Array.from({ length: totalPoints }, (_, index) => {
    if (totalPoints === 1) return endTs;
    return startTs + effectiveStep * index;
  });

  return result.equityCurve.map((equityValue, index) => {
    const balance =
      Array.isArray(balanceCurve) && typeof balanceCurve[index] === "number"
        ? (balanceCurve[index] as number)
        : undefined;
    const prevBalance =
      index > 0 && Array.isArray(balanceCurve) && typeof balanceCurve[index - 1] === "number"
        ? (balanceCurve[index - 1] as number)
        : undefined;
    const pnl =
      balance !== undefined && prevBalance !== undefined ? balance - prevBalance : 0;

    const xTs = timeline[index] ?? index;

    return {
      xTs,
      equityR: typeof equityValue === "number" && Number.isFinite(equityValue) ? equityValue : 0,
      balance,
      pnl,
    };
  });
};

const formatRegimeName = (name: string): string =>
  name
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const determineRegime = (trade: TradeLike): string => {
  if (typeof trade.regime === "string" && trade.regime.trim()) return trade.regime.trim();
  if (isPlainObject(trade.regime)) {
    const regObj = trade.regime as Record<string, unknown>;
    if (typeof regObj.name === "string" && regObj.name.trim()) return regObj.name.trim();
    if (typeof regObj.type === "string" && regObj.type.trim()) return regObj.type.trim();
  }
  if (typeof trade.regimeTag === "string" && trade.regimeTag.trim()) return trade.regimeTag.trim();
  if (typeof trade.regimeLabel === "string" && trade.regimeLabel.trim())
    return trade.regimeLabel.trim();
  const hint =
    (trade as Record<string, unknown>).regime_type ??
    (trade as Record<string, unknown>).regimeName ??
    (trade as Record<string, unknown>).regime_key;
  if (typeof hint === "string" && hint.trim()) return hint.trim();
  return "UNKNOWN";
};

const computeDerivedStats = (trades: TradeLike[], chart: BacktestChartPoint[], opts?: { totalTradesCount?: number }): BacktestDerivedStats => {
  const result: BacktestDerivedStats = { regimeStats: [] };

  const openKeys = [
    "openedAt",
    "opened_at",
    "openAt",
    "open_at",
    "openTime",
    "open_time",
    "openTs",
    "open_ts",
    "entry",
    "entryTime",
    "entry_at",
    "entryTs",
    "entry_ts",
    "time",
  ];
  const closeKeys = [
    "closedAt",
    "closed_at",
    "closed",
    "closeTime",
    "close_time",
    "close_at",
    "closeTs",
    "close_ts",
    "endTs",
    "end_ts",
    "exit",
    "exitTime",
    "exit_time",
    "exit_at",
    "exitTs",
    "exit_ts",
  ];

  const regimeMap = new Map<string, { trades: number; wins: number; totalR: number }>();
  const openTimes: number[] = [];
  const closeTimesExplicit: number[] = [];
  const enrichedTrades = trades.map((trade, idx) => {
    const openTs =
      extractTimestampRecursive(trade, openKeys, 0, 2) ??
      parseTimestamp((trade as Record<string, unknown>).time) ??
      undefined;
    const closeTs = extractTimestampRecursive(trade, closeKeys, 0, 2);
    if (openTs !== undefined) openTimes.push(openTs);
    if (closeTs !== undefined) closeTimesExplicit.push(closeTs);

    const regime = formatRegimeName(determineRegime(trade));
    const entry = regimeMap.get(regime) ?? { trades: 0, wins: 0, totalR: 0 };
    entry.trades += 1;
    const numericR = Number((trade as Record<string, unknown>).r);
    if (Number.isFinite(numericR)) {
      entry.totalR += numericR as number;
      if (numericR > 0) entry.wins += 1;
    } else {
      const status =
        typeof trade.status === "string" ? trade.status.trim().toUpperCase() : undefined;
      if (status === "WON") entry.wins += 1;
    }
    regimeMap.set(regime, entry);

    return { trade, idx, openTs, closeTs };
  });

  const chartEnd = chart.length ? chart[chart.length - 1].xTs : Date.now();
  const chartStart = chart.length ? chart[0].xTs : Date.now();

  const sortedWithOpen = enrichedTrades
    .filter((entry) => entry.openTs !== undefined && Number.isFinite(entry.openTs) && (entry.openTs as number) > 0)
    .sort((a, b) => (a.openTs as number) - (b.openTs as number));

  let durationSum = 0;
  let durationCount = 0;
  let maxDuration = 0;
  let maxTrade: TradeLike | undefined;
  let maxOpenTs: number | undefined;
  let maxCloseTs: number | undefined;

  for (let i = 0; i < sortedWithOpen.length; i += 1) {
    const { trade, openTs, closeTs } = sortedWithOpen[i];
    if (openTs === undefined) continue;
    let effectiveClose = closeTs;
    if (effectiveClose === undefined) {
      const next = sortedWithOpen[i + 1];
      effectiveClose = next?.openTs ?? chartEnd;
    }
    if (effectiveClose !== undefined && effectiveClose >= openTs) {
      const duration = effectiveClose - openTs;
      durationSum += duration;
      durationCount += 1;
      if (duration > maxDuration) {
        maxDuration = duration;
        maxTrade = trade;
        maxOpenTs = openTs;
        maxCloseTs = effectiveClose;
      }
    }
  }

  if (durationCount > 0) {
    result.avgDurationMs = durationSum / durationCount;
    result.maxDurationMs = maxDuration;
    result.maxDurationTrade = maxTrade;
    result.maxDurationOpenTs = maxOpenTs;
    result.maxDurationCloseTs = maxCloseTs;
  }

  const inferredCloseTimes =
    closeTimesExplicit.length > 0
      ? closeTimesExplicit
      : sortedWithOpen.map((entry, idx) => {
          const next = sortedWithOpen[idx + 1];
          return next?.openTs ?? chartEnd;
        });

  const rangeStart = openTimes.length ? Math.min(...openTimes) : chartStart;
  const rangeEnd = inferredCloseTimes.length ? Math.max(...inferredCloseTimes) : chartEnd;
  const dayMs = 24 * 60 * 60 * 1000;
  const rangeMs = Math.max(rangeEnd - rangeStart, dayMs);
  const tradesPerDay = trades.length / (rangeMs / dayMs);
  result.tradesPerDay = tradesPerDay;
  result.tradesPerWeek = tradesPerDay * 7;

  const regimeStats: RegimeBreakdown[] = Array.from(regimeMap.entries()).map(([regime, data]) => ({
    regime,
    trades: data.trades,
    wins: data.wins,
    totalR: data.totalR,
    winRate: data.trades > 0 ? data.wins / data.trades : undefined,
  }));
  regimeStats.sort((a, b) => b.trades - a.trades);
  result.regimeStats = regimeStats;

  return result;
};

export default function BacktestPage() {
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [years, setYears] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return readStoredInt(BT_YEARS_STORAGE_KEY) ?? readTrainingValue("years") ?? 0;
  });

  const [months, setMonths] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return readStoredInt(BT_MONTHS_STORAGE_KEY) ?? readTrainingValue("months") ?? 0;
  });

  const [result, setResult] = useState<BacktestResult | null>(null);
  const runConfigRef = useRef<FullConfig | null>(null);
  const [historySaved, setHistorySaved] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(BT_YEARS_STORAGE_KEY, String(years));
    } catch {
      // ignore write failures
    }
  }, [years]);

  useEffect(() => {
    try {
      localStorage.setItem(BT_MONTHS_STORAGE_KEY, String(months));
    } catch {
      // ignore write failures
    }
  }, [months]);

  useBacktestStream(jobId ?? "", setResult);

  const handleBacktest = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    setResult(null);
    setHistorySaved(false);

    try {
      const storedConfig = typeof window !== "undefined" ? readStoredConfig() : null;
      const snapshot = mergeConfig(storedConfig ?? {});
      snapshot.training.years = clampToNonNegativeInt(years);
      snapshot.training.months = clampToNonNegativeInt(months);

      runConfigRef.current = snapshot;

      const response = (await backtestApi(snapshot)) as unknown;
      if (isJobResponse(response) && response.jobId) {
        setJobId(response.jobId);
      } else {
        setJobId(null);
      }
      setMessage("Backtest started.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }, [years, months]);

  useEffect(() => {
    if (!result?.done || historySaved) return;

    const tradesArray: TradeLike[] = Array.isArray(result.trades) ? result.trades : [];
    const { wins, losses, pnlWins, pnlLoss } = computeTradeStats(tradesArray);
    const profitFactor =
      pnlLoss > 0 ? pnlWins / pnlLoss : pnlWins > 0 ? Number.POSITIVE_INFINITY : undefined;

    const storedSnapshot =
      runConfigRef.current ?? mergeConfig((typeof window !== "undefined" ? readStoredConfig() : null) ?? {});

    const startBalance = result.startBalance ?? storedSnapshot.paper.startBalance;
    const endBalance = result.endBalance ?? storedSnapshot.paper.startBalance;

    const tradesCount =
      typeof result.trades === "number" ? result.trades : tradesArray.length;

    const normalizedProfitFactor =
      profitFactor !== undefined && Number.isFinite(profitFactor) ? profitFactor : undefined;

    const run: BacktestRun = {
      timestamp: new Date().toISOString(),
      jobId: jobId ?? undefined,
      backtestYears: years,
      config: storedSnapshot,
      result: {
        wins: result.wins ?? wins,
        losses: result.losses ?? losses,
        trades: tradesCount,
        winRate: result.winRate,
        profitFactor: result.profitFactor ?? normalizedProfitFactor,
        avgR: result.avgR,
        totalR: result.totalR,
        maxDrawdownR: result.maxDrawdownR,
        startBalance,
        endBalance,
      },
    };

    upsertBacktestHistory(run, { force: true });
    setHistorySaved(true);
  }, [result, historySaved, years, jobId]);

  const snapshot = runConfigRef.current;
  const effectiveYears = snapshot?.training?.years ?? Math.max(0, years);
  const effectiveMonths = snapshot?.training?.months ?? Math.max(0, months);
  const totalMonths = effectiveYears * 12 + effectiveMonths;
  const tradesArray = useMemo<TradeLike[]>(
    () => (Array.isArray(result?.trades) ? (result.trades as TradeLike[]) : []),
    [result]
  );
  const chartData = buildChartData(
    result,
    tradesArray,
    {
      config: snapshot,
      durationMonths: totalMonths,
    }
  );
  const derivedStats = useMemo<BacktestDerivedStats>(
    () => computeDerivedStats(tradesArray, chartData),
    [tradesArray, chartData]
  );

  return (
    <div className="max-w-5xl mx-auto mt-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Backtest</h1>
      <p className="text-slate-700 dark:text-slate-300 mb-4">
        Uses the currently applied configuration. Update settings on the Config page, click
        &ldquo;Apply Config&rdquo;, then start a backtest here.
      </p>
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <NumberInput
          label="Backtest Years"
          value={years}
          integerOnly
          onChangeAction={(value) => setYears(clampToNonNegativeInt(value))}
          hint="Can be 0 if using months-only"
        />
        <NumberInput
          label="Backtest Months"
          value={months}
          integerOnly
          onChangeAction={(value) => setMonths(clampToNonNegativeInt(value))}
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
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Job ID: <span className="font-mono">{jobId}</span>
          </span>
        )}
      </div>
      {message && (
        <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{message}</div>
      )}
      {result && (
        <div className="mt-6">
          <BacktestResults result={result} chartData={chartData} derived={derivedStats} />
        </div>
      )}
    </div>
  );
}
