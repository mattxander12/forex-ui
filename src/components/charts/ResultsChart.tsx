'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Label,
    Legend,
} from 'recharts';


function formatCompact(n: number): string {
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1) + 'B';
    if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1) + 'M';
    if (abs >= 1_000) return sign + (abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1) + 'K';
    return sign + (abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(2));
}

export default function ResultsChart({
    data,
    xLabel = 'Month/Year',
    yLeftLabel = 'Equity (R)',
    yRightLabel = 'Balance / P/L',
}: {
    data: { xTs: number; equityR: number; balance?: number; pnl?: number }[];
    xLabel?: string;
    yLeftLabel?: string;
    yRightLabel?: string;
}) {
    // Detect whether balance / pnl are present & numeric
    const hasBalance = Array.isArray(data) && data.some(d => typeof d.balance === 'number' && !Number.isNaN(d.balance));
    const hasPnL = Array.isArray(data) && data.some(d => typeof d.pnl === 'number' && !Number.isNaN(d.pnl));

    // Build monthly ticks from data range
    const times = data
        .map(d => d.xTs)
        .filter((n): n is number => Number.isFinite(n) && n > 0);
    const defaultNow = Date.now();
    const minTs = times.length ? Math.min(...times) : defaultNow;
    const maxTs = times.length ? Math.max(...times) : minTs + 30 * 24 * 60 * 60 * 1000;
    // start at first day of month UTC
    const start = new Date(minTs);
    const startMonth = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
    const end = new Date(maxTs);
    // include last month boundary; add one month to ensure final month tick shows even if data is mid-month
    const endBoundary = Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1);
    const ticks: number[] = [];
    for (let t = startMonth; t <= endBoundary; ) {
        ticks.push(t);
        const d = new Date(t);
        const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
        if (next === t) break; // safety
        t = next;
    }

    const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);
    const xDomain: [number, number] = [
        uniqueTicks.length ? uniqueTicks[0] : startMonth,
        uniqueTicks.length ? uniqueTicks[uniqueTicks.length - 1] : Math.max(endBoundary, startMonth),
    ];

    return (
        <div style={{ width: '100%', height: 440 }}>
            {/* Increase height slightly to make room for legend without overlap */}
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 2" vertical />

                    <XAxis
                        dataKey="xTs"
                        type="number"
                        scale="time"
                        domain={xDomain}
                        ticks={uniqueTicks}
                        interval={0}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(ts: number) => {
                            const d = new Date(ts);
                            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                            const yy = String(d.getUTCFullYear()).slice(-2);
                            return `${mm}/${yy}`;
                        }}
                    >
                        <Label value={xLabel} position="insideBottom" offset={-5} />
                    </XAxis>

                    {/* Left axis for Equity (R) */}
                    <YAxis yAxisId="left" width={60} tick={{ fontSize: 12 }}>
                        <Label value={yLeftLabel} angle={-90} position="insideLeft" offset={10} />
                    </YAxis>

                    {/* Right axis for Balance / PnL, only if present */}
                    {(hasBalance || hasPnL) && (
                        <YAxis yAxisId="right" orientation="right" width={70} tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCompact(v)}>
                            <Label value={yRightLabel} angle={-90} position="insideRight" offset={10} />
                        </YAxis>
                    )}

                    <Tooltip
                        formatter={(value: number | string, name: string): [React.ReactNode, string] => {
                            const formatNumber = (val: number | string) => {
                                if (typeof val === 'number') {
                                    return Number.isFinite(val) ? val.toFixed(2) : val.toString();
                                }
                                return val;
                            };
                            if (name === 'equityR') return [formatNumber(value), 'Equity (R-multiples)'];
                            if (name === 'balance') return [typeof value === 'number' ? formatCompact(value) : String(value), 'Balance'];
                            if (name === 'pnl') return [typeof value === 'number' ? formatCompact(value) : String(value), 'P/L'];
                            return [formatNumber(value), name];
                        }}
                        labelFormatter={(label) => {
                            const ts = typeof label === 'number' ? label : Number(label);
                            if (!Number.isFinite(ts)) return String(label);
                            const d = new Date(ts);
                            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                            const yy = String(d.getUTCFullYear()).slice(-2);
                            return `${mm}/${yy}`;
                        }}
                        labelStyle={{ color: '#000000' }}
                        itemStyle={{ fontWeight: 600 }}
                    />
                    <Legend verticalAlign="bottom" align="left" wrapperStyle={{ paddingTop: 8 }} iconType="circle" iconSize={10} formatter={(value: string) => {
                        if (value === 'equityR') return 'Equity (R)';
                        if (value === 'balance') return 'Balance';
                        if (value === 'pnl') return 'P/L';
                        return value;
                    }} />

                    {/* Equity line (always plotted) */}
                    <Line
                        type="monotone"
                        dataKey="equityR"
                        name="Equity (R)"
                        yAxisId="left"
                        dot={false}
                        connectNulls
                        strokeWidth={2}
                        stroke="#3b82f6"
                    />

                    {/* Balance and PnL lines on right axis if present */}
                    {hasBalance && (
                        <Line
                            type="monotone"
                            dataKey="balance"
                            name="Balance"
                            yAxisId="right"
                            dot={false}
                            connectNulls
                            strokeWidth={2}
                            stroke="#f59e0b"
                        />
                    )}
                    {hasPnL && (
                        <Line
                            type="monotone"
                            dataKey="pnl"
                            name="P/L"
                            yAxisId="right"
                            dot={false}
                            connectNulls
                            strokeWidth={2}
                            stroke="#10b981"
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>

            {/* Gentle hint if lines are missing due to absent data */}
            {!(hasBalance || hasPnL) && (
                <div style={{ fontSize: 12, opacity: 0.7, paddingTop: 6 }}>
                    Balance/PnL not shown — supply numeric <code>balance</code> and/or <code>pnl</code> in the chart data.
                </div>
            )}
        </div>
    );
}
