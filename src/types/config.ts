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
        enabled: boolean;
        mode: 'ATR' | 'PIPS';
        atrPeriod: number;
        pips: number;
        rr: number;
        risk: number;
        maxOpenPerInstrument: number;
        leverage: number;
        stopAtrMult: number;
    };
    /** Optional account settings */
    account?: {
        /** Starting cash balance used for P&amp;L simulation */
        startingBalance: number;
    };
    /** Optional fine‑tuning knobs (safe defaults used if undefined) */
    training?: {
        /** Years of history to use when training from the UI */
        years: number;
        /** Portion of data used for validation (0.2 = 20%) */
        valSplit: number;
        /** Model to train server‑side */
        model: 'SGD' | 'Tree' | 'RF';
        /** Label horizon H (bars) used for outcome labeling */
        labelH: number;
    };
    marketData?: {
        /** Extra candles used to compute indicators (beyond warmup) */
        lookback: number;
        /** ATR stop multiplier when mode=ATR */
        atrMult: number;
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
        /** Session window in UTC, e.g. "13:00-17:00Z" */
        session: string;
        /** RSI threshold for longs (e.g., 55) */
        rsiLong: number;
        /** RSI threshold for shorts (e.g., 45) */
        rsiShort: number;
        /** Enforce at most one trade per UTC day */
        onePerDay?: boolean;
    };
};

export type FullConfig = Required<Config>;

export const DEFAULTS: FullConfig = {
    trading: {
        instrument: 'USD_JPY',
        granularity: 'M5',
        fastSma: 12,         // was 10
        slowSma: 48,         // was 30
        warmup: 15,          // was 50
        maxSpreadPips: 1.2,
        maType: 'EMA',       // was 'SMA'
    },
    paper: {
        enabled: true,
        mode: 'ATR',
        atrPeriod: 14,
        pips: 10,
        rr: 2.0,             // was 1.4
        risk: 1.0,
        maxOpenPerInstrument: 1,
        leverage: 50,
        stopAtrMult: 10,
    },
    account: {
        startingBalance: 10000,
    },
    training: {
        years: 1,
        valSplit: 0.2,
        model: 'SGD',
        labelH: 10,
    },
    marketData: {
        lookback: 0,
        atrMult: 2.0,        // keep
    },
    execution: {
        signalThreshold: 0.55, // keep
        slippagePips: 0.2,
        commissionPips: 0.0,
    },
    risk: {
        maxDailyLossR: 3,
        maxConsecLosses: 5,
    },
    filter: {
        evMargin: 0.12,
        evMarginR: 0.30,
        atrWindow: 20,
        atrPercentile: 30,
        session: '08:00-18:00Z',
        rsiLong: 60,
        rsiShort: 40,
        onePerDay: true,
    },
};