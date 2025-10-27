export interface Trade {
    openedAt: string;
    side: string;
    equityUSD: number;
    equityR: number;
    pnlUSD: number;
    index: number;
    type: string;
    takeProfit: number;
    entry: number;
    exit: number;
    r: number;
    stop: number;
    time: string;
    status: string;
    closeReason?: string;
    closedAt?: string;
    closed_at?: string;
    closeTime?: string;
    close_at?: string;
    closeTs?: number;
    exitTime?: string;
    exit_at?: string;
    exitTs?: number;
    regime?: string | { name?: string; type?: string };
    regimeTag?: string;
    regimeLabel?: string;
}

export type TradeLike = Partial<Trade> & Record<string, unknown>;

export interface BacktestChartPoint {
    xTs: number;
    equityR: number;
    balance?: number;
    pnl?: number;
}

export interface RegimeBreakdown {
    regime: string;
    trades: number;
    wins: number;
    totalR: number;
    winRate?: number;
}

export interface BacktestDerivedStats {
    avgDurationMs?: number;
    maxDurationMs?: number;
    maxDurationTrade?: TradeLike;
    maxDurationOpenTs?: number;
    maxDurationCloseTs?: number;
    tradesPerDay?: number;
    tradesPerWeek?: number;
    regimeStats: RegimeBreakdown[];
}

export interface BacktestResult {
    trades?: number | TradeLike[];
    equityCurve?: number[];
    equityCurveUSD?: number[];
    wins?: number;
    losses?: number;
    winRate?: number;
    totalR?: number;
    avgR?: number;
    profitFactor?: number;
    maxDrawdownR?: number;
    startBalance?: number;
    endBalance?: number;
    done?: boolean;
    progress?: Record<string, unknown>;
}
