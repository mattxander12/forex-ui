'use client';

import React, {useState, useEffect} from 'react';
import ConfigForm from '@/components/forms/ConfigForm';
import {Config, DEFAULTS} from '@/types/config';
import {backtest, train} from '@/services/api';
import { useBacktestStream } from '@/hooks/useBacktestStream';
import BacktestResults from "@/components/charts/BacktestResults";
import type { BacktestResult } from '@/types/backtest';

export default function Page() {
    const [value, setValue] = useState<Config>(DEFAULTS);
    const [runState, setRunState] = useState<{ id: number; status: "idle" | "running" | "done" }>({ id: 0, status: "idle" });
    const [trainingBusy, setTrainingBusy] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [runConfig, setRunConfig] = useState<Config | null>(null);
    const [historySaved, setHistorySaved] = useState(false);
    const [streamResult, setStreamResult] = useState<BacktestResult | null>(null);

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
        setRunConfig(value);
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
    // @ts-ignore
    useBacktestStream(jobId ?? "", setStreamResult);

    useEffect(() => {
      if (
        typeof streamResult?.wins !== "undefined" ||
        typeof streamResult?.endBalance !== "undefined"
      ) {
        setRunState(s => ({ ...s, status: "idle" }));

        if (!historySaved) {
          const history = JSON.parse(localStorage.getItem("backtestHistory") || "[]");
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
          const run = {
            timestamp: new Date().toISOString(),
            config: runConfig,
            result: { wins, losses, trades, winRate, profitFactor, avgR, totalR, maxDrawdownR, startBalance, endBalance },
          };
          localStorage.setItem("backtestHistory", JSON.stringify([run, ...history]));
          setHistorySaved(true);
        }
      }
    }, [streamResult, runConfig, historySaved]);

    // Derive chartData from streamResult?.equityCurve and streamResult?.equityCurveUSD
    const chartData = (streamResult?.equityCurve ?? []).map((r, i) => {
      const balance = streamResult?.equityCurveUSD?.[i];
      const prevBalance = i > 0 ? streamResult?.equityCurveUSD?.[i - 1] : balance;
      const pnl = balance !== undefined && prevBalance !== undefined ? balance - prevBalance : 0;
      return { i, equityR: r, balance, pnl };
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
            />
            {streamResult && (
                <BacktestResults result={streamResult} chartData={chartData} />
            )}
        </>
    );
}