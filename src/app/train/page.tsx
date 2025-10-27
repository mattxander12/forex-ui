"use client";

import { useEffect, useState } from "react";
import type { ConfigInput, FullConfig } from "@/types/config";
import { mergeConfig } from "@/lib/configUtils";
import { train as trainApi } from "@/services/api";
import NumberInput from "@/components/common/NumberInput";

const CONFIG_STORAGE_KEY = "app.config";

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

const readTrainingYears = (): number | null => {
  try {
    const cfg = readStoredConfig();
    const value = cfg?.training?.years;
    if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
      return Math.round(value);
    }
  } catch {
    // ignore parse issues
  }
  return null;
};

type JobResponse = { jobId?: string | null };

const isJobResponse = (value: unknown): value is JobResponse =>
  isRecord(value) &&
  (!("jobId" in value) ||
    typeof value.jobId === "string" ||
    value.jobId === null ||
    value.jobId === undefined);

const clampYears = (value: number): number => Math.max(1, Math.round(value));

export default function TrainPage() {
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [years, setYears] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    return readTrainingYears() ?? 1;
  });

  useEffect(() => {
    try {
      const merged = mergeConfig(readStoredConfig() ?? {});
      merged.training.years = clampYears(years);
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore write failures
    }
  }, [years]);

  const handleTrain = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const snapshot: FullConfig = mergeConfig(readStoredConfig() ?? {});
      snapshot.training.years = clampYears(years);
      const response = (await trainApi(snapshot)) as unknown;
      const job = isJobResponse(response) && typeof response.jobId === "string" ? response.jobId : null;
      setJobId(job);
      setMessage("Training started.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Train</h1>
      <p className="text-slate-700 dark:text-slate-300 mb-6">
        Uses the currently applied configuration. Update settings on the Config page, click &ldquo;Apply Config&rdquo;, then set
        the training period and start training here.
      </p>
      <div className="max-w-sm mb-4">
        <NumberInput
          label="Training Years"
          value={years}
          integerOnly
          step={1}
          onChangeAction={(value) => setYears(clampYears(value))}
          hint="Whole number of years"
        />
      </div>
      <button
        disabled={busy}
        onClick={handleTrain}
        className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60"
      >
        {busy ? "Starting..." : "Start Training"}
      </button>
      {jobId && (
        <div className="mt-4 text-sm text-slate-700 dark:text-slate-300">
          Job ID: <span className="font-mono">{jobId}</span>
        </div>
      )}
      {message && (
        <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{message}</div>
      )}
    </div>
  );
}
