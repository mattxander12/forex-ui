"use client";

import {useCallback, useState} from 'react';
import {useLiveStream} from '@/hooks/useLiveStream';
import type {LiveTrade} from '@/types/live';

const apiBase = (process.env.NEXT_PUBLIC_API_BASE ?? '') + '/' + (process.env.NEXT_PUBLIC_API_VERSION ?? '');

export default function LivePage() {
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [instrument, setInstrument] = useState<string>('EUR_USD');
  const [granularity, setGranularity] = useState<string>('M5');
  const [busy, setBusy] = useState<boolean>(false);

  const state = useLiveStream(jobId);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      const url = `${apiBase}/live/mock/start?instrument=${encodeURIComponent(instrument)}&granularity=${encodeURIComponent(granularity)}&jobId=${encodeURIComponent(`live-${Date.now()}`)}`;
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) throw new Error(`Start failed: ${res.status}`);
      const json = await res.json();
      setJobId(json.jobId);
      // Persist a mock-live run entry for History
      try {
        const cfgRaw = localStorage.getItem('app.config');
        const cfg = cfgRaw ? JSON.parse(cfgRaw) : null;
        const entry = { type: 'mock-live', timestamp: new Date().toISOString(), jobId: json.jobId, config: cfg ?? { trading: { instrument, granularity } } };
        const raw = localStorage.getItem('runHistory');
        const arr = raw ? JSON.parse(raw) : [];
        const updated = [entry, ...(Array.isArray(arr) ? arr : [])];
        localStorage.setItem('runHistory', JSON.stringify(updated));
      } catch {}
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [instrument, granularity]);

  const stop = useCallback(async () => {
    if (!jobId) return;
    setBusy(true);
    try {
      const url = `${apiBase}/live/mock/stop?jobId=${encodeURIComponent(jobId)}`;
      await fetch(url, { method: 'POST' });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [jobId]);

  const trades = state.trades as LiveTrade[];

  return (
    <div className="max-w-5xl mx-auto mt-8 p-4">
      <h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Mock Live Trading</h1>

      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">Instrument</label>
          <input className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value={instrument} onChange={e=>setInstrument(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">Granularity</label>
          <input className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value={granularity} onChange={e=>setGranularity(e.target.value)} />
        </div>
        <button disabled={busy} onClick={start} className="px-3 py-1.5 rounded bg-emerald-600 text-white disabled:opacity-60">Start</button>
        <button disabled={busy || !jobId} onClick={stop} className="px-3 py-1.5 rounded bg-rose-600 text-white disabled:opacity-60">Stop</button>
        {jobId && <span className="text-sm text-slate-500 dark:text-slate-400">jobId: {jobId}</span>}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">Signal</div>
          <div className="mt-1 font-mono text-sm text-slate-800 dark:text-slate-100">{state.signal ? `${state.signal.label} (pUp=${state.signal.pUp.toFixed(2)}, pDown=${state.signal.pDown.toFixed(2)})` : '—'}</div>
        </div>
        <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">Last Order</div>
          <div className="mt-1 font-mono text-sm text-slate-800 dark:text-slate-100">{state.lastOrder ? `${state.lastOrder.side} ${state.lastOrder.units.toFixed(2)} units` : '—'}</div>
        </div>
        <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">Equity</div>
          <div className="mt-1 font-mono text-sm text-slate-800 dark:text-slate-100">
            {state.equity ? `Equity $${state.equity.equityUSD.toFixed(2)} | RealizedR ${state.equity.realizedR.toFixed(2)} | Open ${state.equity.openCount}` : '—'}
          </div>
        </div>
      </div>

      <div className="rounded border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
        <div className="text-sm font-semibold mb-2 text-slate-900 dark:text-slate-100">Trades</div>
        {trades.length === 0 ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">No trades yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-800 dark:text-slate-100">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-1">Side</th>
                  <th className="px-2 py-1">Entry</th>
                  <th className="px-2 py-1">Exit</th>
                  <th className="px-2 py-1">R</th>
                  <th className="px-2 py-1">PnL USD</th>
                  <th className="px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, idx) => (
                  <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-2 py-1">{t.side}</td>
                    <td className="px-2 py-1">{t.entry.toFixed(5)}</td>
                    <td className="px-2 py-1">{t.exit.toFixed(5)}</td>
                    <td className="px-2 py-1">{t.r.toFixed(2)}</td>
                    <td className="px-2 py-1">{t.pnlUSD.toFixed(2)}</td>
                    <td className="px-2 py-1">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
