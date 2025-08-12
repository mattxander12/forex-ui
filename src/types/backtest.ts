export interface Trade {
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
}

export interface BacktestResult {
    trades?: number | Trade[];
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
}