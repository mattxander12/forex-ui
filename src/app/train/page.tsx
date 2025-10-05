"use client";

import { useEffect, useState } from "react";
import type { Config } from "@/types/config";
import { train as trainApi } from "@/services/api";
import NumberInput from "@/components/common/NumberInput";

export default function TrainPage() {
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [years, setYears] = useState<number>(() => {
    try { const raw = localStorage.getItem('app.config'); if (raw) { const cfg = JSON.parse(raw) as Config; const y = Number((cfg as any)?.training?.years ?? 1); if (Number.isFinite(y) && y>=1) return y; } } catch {}
    return 1;
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('app.config');
      const cfg: any = raw ? JSON.parse(raw) : {};
      cfg.training = cfg.training ?? {};
      cfg.training.years = Math.max(1, Math.round(years));
      localStorage.setItem('app.config', JSON.stringify(cfg));
    } catch {}
  }, [years]);

  const handleTrain = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const raw = localStorage.getItem("app.config");
      const cfg: Config = raw ? JSON.parse(raw) : {} as any;
      const resp = await trainApi(cfg);
      setJobId(resp?.jobId ?? null);
      setMessage("Training started.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Train</h1>
      <p className="text-slate-700 dark:text-slate-300 mb-6">
        Uses the currently applied configuration. Update settings on the Config page, click "Apply Config", then set training period and start training here.
      </p>
      <div className="max-w-sm mb-4">
        <NumberInput
          label="Training Years"
          value={years}
          integerOnly={true}
          step={1}
          onChangeAction={(v) => setYears(Math.max(1, Math.round(v)))}
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
        <div className="mt-4 text-sm text-slate-700 dark:text-slate-300">Job ID: <span className="font-mono">{jobId}</span></div>
      )}
      {message && (
        <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{message}</div>
      )}
    </div>
  );
}
