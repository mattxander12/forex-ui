# Forex Trader UI 

This is the frontend UI for the Forex Trader project. It provides configuration forms, backtest execution, real-time streaming results, charts, and historical run tracking. Built with Next.js, React, TailwindCSS, and TypeScript.

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn
# or
pnpm install
# or
bun install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Make sure the backend is running at [http://localhost:8080](http://localhost:8080) to enable full functionality.

## Features

- Configuration form for backtests.
- Results chart (equity, balance, PnL).
- Summary pane (trades, win rate, profit factor, drawdown, ending balance).
- History tab with accordion to inspect past configs/results.

The backend is available at [Forex Trader Backend](https://github.com/mattxander12/forex-trader). Make sure it is running and accessible (default: http://localhost:8080) when using the UI.
