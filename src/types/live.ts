export type LiveSignal = { label: 'UP' | 'DOWN'; pUp: number; pDown: number };
export type LiveOrder = { side: 'BUY' | 'SELL'; units: number };
export type LiveTrade = { side: 'BUY' | 'SELL'; entry: number; exit: number; r: number; pnlUSD: number; status: 'WON' | 'LOST' };
export type LiveEquity = { time: string; equityUSD: number; realizedUSD: number; realizedR: number; openCount: number };

export type LiveState = {
  signal?: LiveSignal;
  lastOrder?: LiveOrder;
  equity?: LiveEquity;
  trades: LiveTrade[];
};
