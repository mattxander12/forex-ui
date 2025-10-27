export type Config = {
    trading: {
        instrument: string;
        granularity: string;
        fastSma: number;
        slowSma: number;
        warmup: number;
        maxSpreadPips: number;
        maType: 'SMA' | 'EMA' | 'HYBRID';
    };
    paper: {
        mode: 'ATR' | 'PIPS';
        atrPeriod: number;
        pips: number;
        rr: number;
        risk: number;
        maxOpenPerInstrument: number;
        leverage: number;
        stopAtrMulti: number;
        startBalance: number;
        maxSizingEquityUSD: number;
    };
    /** Optional fine‑tuning knobs (safe defaults used if undefined) */
    training?: {
        /** Years of history to use when training from the UI */
        years: number;
        /** Optional: additional months of history; combined with years (totalMonths = years*12 + months) */
        months?: number;
        /** Portion of data used for validation (0.2 = 20%) */
        valSplit: number;
        /** Model to train server‑side */
        model: 'XGBOOST' | 'Tree' | 'RF';
        /** Label horizon H (bars) used for outcome labeling */
        labelH: number;
    };
    execution?: {
        /** Only take trades if model confidence ≥ threshold (0..1) */
        signalThreshold: number;
        /** Simulated slippage in pips */
        slippagePips: number;
        /** Per‑side commission in pips */
        commissionPips: number;
    };
    risk?: {
        /** Toggle risk throttling on or off */
        enabled: boolean;
        /** Max daily drawdown in R before stopping */
        maxDailyLossR: number;
        /** Max consecutive losses before pausing */
        maxConsecLosses: number;
    };
    filter?: {
        /** Extra EV probability margin added to 1/(1+RR) */
        evMargin: number;
        /** EV margin in R-units: require EV_R >= evMarginR */
        evMarginR: number;
        /** Rolling window size for ATR percentile */
        atrWindow: number;
        /** ATR percentile threshold (0..100) */
        atrPercentile: number;
        /** RSI threshold for longs (e.g., 55) */
        rsiLong: number;
        /** RSI threshold for shorts (e.g., 45) */
        rsiShort: number;
    };
};

export type FullConfig = Required<Config>;

export type ConfigInput = Partial<Config>;

export const DEFAULTS: FullConfig = {
    trading: {
        instrument: 'USD_JPY',
        granularity: 'M5',
        fastSma: 20,
        slowSma: 50,
        warmup: 40,
        maxSpreadPips: 1.7,
        maType: 'EMA',
    },
    paper: {
        mode: 'ATR',
        atrPeriod: 14,
        pips: 10,
        rr: 2.0,
        risk: 0.65,
        maxOpenPerInstrument: 1,
        leverage: 50,
        stopAtrMulti: 1,
        startBalance: 10000,
        maxSizingEquityUSD: 180000,
    },
    training: {
        years: 1,
        months: 0,
        valSplit: 0.2,
        model: 'XGBOOST',
        labelH: 20,
    },
    execution: {
        signalThreshold: 0.63,
        slippagePips: 0.4,
        commissionPips: 0,
    },
    risk: {
        enabled: true,
        maxDailyLossR: 4,
        maxConsecLosses: 3,
    },
    filter: {
        evMargin: 0.12,
        evMarginR: 0.30,
        atrWindow: 20,
        atrPercentile: 30,
        rsiLong: 60,
        rsiShort: 40
    },
};
