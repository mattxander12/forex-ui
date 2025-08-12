'use client';

import {useCallback, useMemo, useState} from 'react';
import clsx from 'clsx';
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import NumberInput from "@/components/common/NumberInput";
import Toggle from "@/components/common/Toggle";
import {Config, FullConfig} from "@/types/config";
import {mergeConfig} from "@/lib/configUtils";

export interface ConfigFormProps {
    value: Config;
    onChangeAction: (cfg: Config) => void;
    onTrain: () => void | Promise<void>;
    onBacktest: () => void | Promise<void>;
    className?: string;
    busy?: { training: boolean; backtesting: boolean };
    runId: number;
}

export default function ConfigForm({
    value, onChangeAction, onTrain, onBacktest, className, busy, runId
}: ConfigFormProps) {
    const rootClass = clsx(
        "max-w-5xl mx-auto mt-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 md:p-8",
        className
    );

    const cfg = useMemo<FullConfig>(() => mergeConfig(value), [value]);

    // Strongly typed update handler (avoids structuredClone, keeps referential stability)
    const update = useCallback((mutate: (cfg: FullConfig) => void) => {
        const next: FullConfig = {
            ...cfg,
            trading: {...cfg.trading},
            paper: {...cfg.paper},
            account: {...cfg.account},
            training: {...cfg.training},
            marketData: {...cfg.marketData},
            execution: {...cfg.execution},
            risk: {...cfg.risk},
            filter: {...cfg.filter},
        };
        mutate(next);
        onChangeAction(next);
    }, [cfg, onChangeAction]);

    const [backtestYears, setBacktestYears] = useState<number>(1);
    const [trainingMessage, setTrainingMessage] = useState<string | null>(null);
    const busyObj = {
        training: !!busy?.training,
        backtesting: !!busy?.backtesting,
    };
    return (
        <section className={rootClass}>
            <header className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Configuration</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Tune parameters, train a model, and run backtests. Tooltips explain each field.
                </p>
            </header>

            {/* MARKET SETUP */}
            <details open>
                <summary className="mb-3 flex items-center justify-between cursor-pointer select-none">
                    <span className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-300">Market Setup</span>
                    <span className="h-px flex-1 ml-4 bg-slate-200 dark:bg-slate-700"/>
                </summary>
                <div className="grid md:grid-cols-3 gap-4">
                    <Input label="Instrument" hint="e.g., EUR_USD, GBP_USD (OANDA naming)"
                           value={cfg.trading.instrument}
                           onChangeAction={(v) => update(c => c.trading.instrument = v)}/>
                    <Select label="Granularity" hint="Candle timeframe (OANDA)" value={cfg.trading.granularity}
                            options={['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D']}
                            onChangeAction={(v) => update(c => c.trading.granularity = v)}/>
                    <NumberInput label="Warmup" hint="Bars to stabilize indicators before training/backtest"
                                 value={cfg.trading.warmup}
                                 onChangeAction={(v) => update(c => c.trading.warmup = v)}/>
                    <NumberInput label="Fast MA" hint="Short moving average period used as a feature"
                                 value={cfg.trading.fastSma}
                                 onChangeAction={(v) => update(c => c.trading.fastSma = v)}/>
                    <NumberInput label="Slow MA" hint="Long moving average period used as a feature"
                                 value={cfg.trading.slowSma}
                                 onChangeAction={(v) => update(c => c.trading.slowSma = v)}/>
                    <Select label="MA Type" hint="Affects features & regime filters" value={cfg.trading.maType}
                            options={['SMA', 'EMA', 'HYBRID']}
                            onChangeAction={(v) => update(c => c.trading.maType = v as 'SMA' | 'EMA' | 'HYBRID')}/>
                    <NumberInput label="Max Spread (pips)" hint="Skip trades when current spread exceeds this value"
                                 step={0.1} value={cfg.trading.maxSpreadPips}
                                 onChangeAction={(v) => update(c => c.trading.maxSpreadPips = v)}/>
                </div>
            </details>

            {/* RISK & POSITION SIZING */}
            <details open>
                <summary className="mb-3 flex items-center justify-between mt-10 cursor-pointer select-none">
                    <span className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-300">Risk &amp; Position Sizing</span>
                    <span className="h-px flex-1 ml-4 bg-slate-200 dark:bg-slate-700"/>
                </summary>
                <div className="grid md:grid-cols-3 gap-4">
                    <Toggle label="Paper Enabled" hint="Simulate orders instead of placing real ones"
                            value={cfg.paper.enabled}
                            onChangeAction={(v) => update(c => c.paper.enabled = v)}/>
                    <Select label="Mode" hint="ATR = volatility‑based stops; PIPS = fixed stop size" value={cfg.paper.mode}
                            options={['ATR', 'PIPS']}
                            onChangeAction={(v) => update(c => c.paper.mode = v as 'ATR' | 'PIPS')}/>
                    <NumberInput label="ATR Period" hint="Bars used to compute ATR (when mode=ATR)"
                                 value={cfg.paper.atrPeriod}
                                 onChangeAction={(v) => update(c => c.paper.atrPeriod = v)}/>
                    <NumberInput label="Fixed Stop (pips)" hint="Only used when mode=PIPS" step={0.1} value={cfg.paper.pips}
                                 onChangeAction={(v) => update(c => c.paper.pips = v)}/>
                    <NumberInput
                        label="Stop ATR Multiplier"
                        hint="Stop distance = ATR × multiplier"
                        step={0.1}
                        value={cfg.paper.stopAtrMult}
                        onChangeAction={(v) => update(c => c.paper.stopAtrMult = v)}
                    />
                    <NumberInput label="Risk/Reward" hint="Take‑profit distance = R × stop distance" step={0.1}
                                 value={cfg.paper.rr}
                                 onChangeAction={(v) => update(c => c.paper.rr = v)}/>
                    <NumberInput label="Risk % (of cap)" hint="Percent of account capital risked per trade" step={0.05}
                                 value={cfg.paper.risk}
                                 onChangeAction={(v) => update(c => c.paper.risk = v)}/>
                    <NumberInput
                        label="Leverage"
                        hint="Max notional = equity × leverage"
                        step={1}
                        value={cfg.paper.leverage}
                        onChangeAction={(v) => update(c => c.paper.leverage = v)}
                    />
                    <NumberInput label="Max Open/Instrument" hint="Max simultaneous paper trades per pair"
                                 value={cfg.paper.maxOpenPerInstrument}
                                 onChangeAction={(v) => update(c => c.paper.maxOpenPerInstrument = v)}/>
                    <NumberInput
                        label="Starting Balance ($)"
                        hint="Used to simulate cash P&amp;L on the chart"
                        step={100}
                        value={cfg.account.startingBalance}
                        onChangeAction={(v) => update(c => {
                            c.account = c.account ?? {startingBalance: 10000};
                            c.account.startingBalance = v;
                        })}
                    />
                </div>
            </details>

            {/* TRAINING PARAMETERS */}
            <details>
                <summary className="mb-3 flex items-center justify-between mt-10 cursor-pointer select-none">
                    <span className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-300">Training Parameters</span>
                    <span className="h-px flex-1 ml-4 bg-slate-200 dark:bg-slate-700"/>
                </summary>
                <div className="grid md:grid-cols-3 gap-4">
                    <NumberInput label="Training Years" hint="History length to pull when training via UI"
                                 value={cfg.training.years}
                                 onChangeAction={(v) => update(c => {
                                     c.training = c.training ?? {years: 1, valSplit: 0.2, model: 'SGD', labelH: 10};
                                     c.training.years = v;
                                 })}/>
                    <NumberInput step={0.05} label="Validation Split" hint="Hold‑out fraction for validation, 0..0.8"
                                 value={cfg.training.valSplit}
                                 onChangeAction={(v) => update(c => {
                                     c.training = c.training ?? {years: 1, valSplit: 0.2, model: 'SGD', labelH: 10};
                                     c.training.valSplit = v;
                                 })}/>
                    <Select label="Model" hint="Select server‑side learner"
                            value={cfg.training.model} options={["SGD", "Tree", "RF"]}
                            onChangeAction={(v) => update(c => {
                                c.training = c.training ?? {years: 1, valSplit: 0.2, model: 'SGD', labelH: 10};
                                c.training.model = v as 'SGD' | 'Tree' | 'RF';
                            })}/>
                    <NumberInput label="Label Horizon (H)" hint="Bars used to resolve win/lose in labeling"
                                 value={cfg.training.labelH}
                                 onChangeAction={(v) => update(c => {
                                     c.training = c.training ?? {years: 1, valSplit: 0.2, model: 'SGD', labelH: 10};
                                     c.training.labelH = v;
                                 })}/>
                    <NumberInput label="Extra Lookback" hint="Additional bars fetched to compute indicators"
                                 value={cfg.marketData.lookback}
                                 onChangeAction={(v) => update(c => {
                                     c.marketData = c.marketData ?? {lookback: 0, atrMult: 1.0};
                                     c.marketData.lookback = v;
                                 })}/>
                    <NumberInput step={0.1} label="ATR Multiplier"
                                 hint="Stop distance = ATR × multiplier (when mode=ATR)" value={cfg.marketData.atrMult}
                                 onChangeAction={(v) => update(c => {
                                     c.marketData = c.marketData ?? {lookback: 0, atrMult: 1.0};
                                     c.marketData.atrMult = v;
                                 })}/>
                </div>
            </details>

            {/* EXECUTION PARAMETERS */}
            <details>
                <summary className="mb-3 flex items-center justify-between mt-10 cursor-pointer select-none">
                    <span className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-300">Execution Parameters</span>
                    <span className="h-px flex-1 ml-4 bg-slate-200 dark:bg-slate-700"/>
                </summary>
                <div className="grid md:grid-cols-3 gap-4">
                    <NumberInput step={0.05} label="Signal Threshold"
                                 hint="Min model confidence required to take a trade (0..1)"
                                 value={cfg.execution.signalThreshold}
                                 onChangeAction={(v) => update(c => {
                                     c.execution = c.execution ?? {
                                         signalThreshold: 0,
                                         slippagePips: 0,
                                         commissionPips: 0
                                     };
                                     c.execution.signalThreshold = v;
                                 })}/>
                    <NumberInput step={0.1} label="Slippage (pips)" hint="Applied to entries & exits in simulation"
                                 value={cfg.execution.slippagePips}
                                 onChangeAction={(v) => update(c => {
                                     c.execution = c.execution ?? {
                                         signalThreshold: 0,
                                         slippagePips: 0,
                                         commissionPips: 0
                                     };
                                     c.execution.slippagePips = v;
                                 })}/>
                    <NumberInput step={0.1} label="Commission (pips)" hint="Per‑side trading cost in pips"
                                 value={cfg.execution.commissionPips}
                                 onChangeAction={(v) => update(c => {
                                     c.execution = c.execution ?? {
                                         signalThreshold: 0,
                                         slippagePips: 0,
                                         commissionPips: 0
                                     };
                                     c.execution.commissionPips = v;
                                 })}/>
                </div>
            </details>

            {/* RISK CONTROLS */}
            <details>
                <summary className="mb-3 flex items-center justify-between mt-10 cursor-pointer select-none">
                    <span className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-300">Risk Controls</span>
                    <span className="h-px flex-1 ml-4 bg-slate-200 dark:bg-slate-700"/>
                </summary>
                <div className="grid md:grid-cols-3 gap-4">
                    <NumberInput step={0.5} label="Max Daily Loss (R)" hint="Stop backtest for the day when breached"
                                 value={cfg.risk.maxDailyLossR}
                                 onChangeAction={(v) => update(c => {
                                     c.risk = c.risk ?? {maxDailyLossR: 999, maxConsecLosses: 999};
                                     c.risk.maxDailyLossR = v;
                                 })}/>
                    <NumberInput label="Max Consecutive Losses" hint="Pause after N losing trades in a row"
                                 value={cfg.risk.maxConsecLosses}
                                 onChangeAction={(v) => update(c => {
                                     c.risk = c.risk ?? {maxDailyLossR: 999, maxConsecLosses: 999};
                                     c.risk.maxConsecLosses = v;
                                 })}/>
                </div>
            </details>

            {/* EXECUTION FILTERS */}
            <details>
                <summary className="mb-3 flex items-center justify-between mt-10 cursor-pointer select-none">
                    <span className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-300">Execution Filters</span>
                    <span className="h-px flex-1 ml-4 bg-slate-200 dark:bg-slate-700"/>
                </summary>
                <div className="grid md:grid-cols-3 gap-4">
                    <NumberInput step={0.01} label="EV Margin" hint="Adds to 1/(1+RR) for min win prob"
                                 value={cfg.filter.evMargin}
                                 onChangeAction={(v) => update(c => {
                                     c.filter = c.filter ?? {
                                         evMargin: 0.08,
                                         evMarginR: 0.30,
                                         atrWindow: 20,
                                         atrPercentile: 40,
                                         session: '13:00-17:00Z',
                                         rsiLong: 55,
                                         rsiShort: 45,
                                         onePerDay: true
                                     };
                                     c.filter.evMargin = v;
                                 })}/>
                    <NumberInput step={0.05} label="EV Margin (R)"
                                 hint="Require EV_R = p*RR - (1-p)*1 to be ≥ this value" value={cfg.filter.evMarginR}
                                 onChangeAction={(v) => update(c => {
                                     c.filter = c.filter ?? {
                                         evMargin: 0.08,
                                         evMarginR: 0.30,
                                         atrWindow: 20,
                                         atrPercentile: 40,
                                         session: '13:00-17:00Z',
                                         rsiLong: 55,
                                         rsiShort: 45,
                                         onePerDay: true
                                     };
                                     c.filter.evMarginR = v;
                                 })}/>
                    <NumberInput label="ATR Window" hint="Bars for ATR percentile window" value={cfg.filter.atrWindow}
                                 onChangeAction={(v) => update(c => {
                                     c.filter = c.filter ?? {
                                         evMargin: 0.08,
                                         evMarginR: 0.30,
                                         atrWindow: 20,
                                         atrPercentile: 40,
                                         session: '13:00-17:00Z',
                                         rsiLong: 55,
                                         rsiShort: 45,
                                         onePerDay: true
                                     };
                                     c.filter.atrWindow = v;
                                 })}/>
                    <NumberInput step={1} label="ATR Percentile" hint="0..100 threshold for ATR"
                                 value={cfg.filter.atrPercentile}
                                 onChangeAction={(v) => update(c => {
                                     c.filter = c.filter ?? {
                                         evMargin: 0.08,
                                         evMarginR: 0.30,
                                         atrWindow: 20,
                                         atrPercentile: 40,
                                         session: '13:00-17:00Z',
                                         rsiLong: 55,
                                         rsiShort: 45,
                                         onePerDay: true
                                     };
                                     c.filter.atrPercentile = v;
                                 })}/>
                    <Input label="Session (UTC)" hint="e.g., 13:00-17:00Z" value={cfg.filter.session}
                           onChangeAction={(v) => update(c => {
                               c.filter = c.filter ?? {
                                   evMargin: 0.08,
                                   evMarginR: 0.30,
                                   atrWindow: 20,
                                   atrPercentile: 40,
                                   session: '13:00-17:00Z',
                                   rsiLong: 55,
                                   rsiShort: 45,
                                   onePerDay: true
                               };
                               c.filter.session = v;
                           })}/>
                    <NumberInput step={1} label="RSI Long Threshold" hint="> 55 recommended" value={cfg.filter.rsiLong}
                                 onChangeAction={(v) => update(c => {
                                     c.filter = c.filter ?? {
                                         evMargin: 0.08,
                                         evMarginR: 0.30,
                                         atrWindow: 20,
                                         atrPercentile: 40,
                                         session: '13:00-17:00Z',
                                         rsiLong: 55,
                                         rsiShort: 45,
                                         onePerDay: true
                                     };
                                     c.filter.rsiLong = v;
                                 })}/>
                    <NumberInput step={1} label="RSI Short Threshold" hint="< 45 recommended"
                                 value={cfg.filter.rsiShort}
                                 onChangeAction={(v) => update(c => {
                                     c.filter = c.filter ?? {
                                         evMargin: 0.08,
                                         evMarginR: 0.30,
                                         atrWindow: 20,
                                         atrPercentile: 40,
                                         session: '13:00-17:00Z',
                                         rsiLong: 55,
                                         rsiShort: 45,
                                         onePerDay: true
                                     };
                                     c.filter.rsiShort = v;
                                 })}/>
                    <Toggle label="One Trade Per Day" hint="Enforce at most one entry per UTC date"
                            value={!!cfg.filter.onePerDay}
                            onChangeAction={(v) => update(c => {
                                c.filter = c.filter ?? {
                                    evMargin: 0.08,
                                    evMarginR: 0.30,
                                    atrWindow: 20,
                                    atrPercentile: 40,
                                    session: '13:00-17:00Z',
                                    rsiLong: 55,
                                    rsiShort: 45,
                                    onePerDay: true
                                };
                                c.filter.onePerDay = v;
                            })}/>
                </div>
            </details>

            {/* ACTIONS sticky footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-4 px-6 flex justify-between items-center mt-10 z-10">
                <div className="max-w-xs w-full">
                    <NumberInput
                        label="Backtest Years"
                        hint="Number of years for backtest"
                        value={backtestYears}
                        onChangeAction={(v) => setBacktestYears(Math.max(v, 1))}
                        step={1}
                    />
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                    <button
                        type="button"
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={async () => {
                            setTrainingMessage(null);
                            await onTrain();
                            setTrainingMessage('✅ Training complete!');
                        }}
                        disabled={busyObj.training}
                    >
                        {busyObj.training ? 'Training…' : 'Train'}
                    </button>
                    <button
                        key={runId}
                        type="button"
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={onBacktest}
                        disabled={busyObj.backtesting}
                    >
                        {busyObj.backtesting ? 'Backtesting…' : 'Backtest'}
                    </button>
                    {trainingMessage && (
                        <div className="text-green-600 dark:text-green-400 mt-2 ml-2">
                            {trainingMessage}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

// SectionTitle removed, replaced by <details>/<summary>