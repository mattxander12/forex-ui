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


export default function ResultsChart({
    data,
    xLabel = 'Trade Number',
    yLeftLabel = 'Equity (R)',
    yRightLabel = 'Balance / P/L',
}: {
    data: { i: number | string; equityR: number; balance?: number; pnl?: number }[];
    xLabel?: string;
    yLeftLabel?: string;
    yRightLabel?: string;
}) {
    // Detect whether balance / pnl are present & numeric
    const hasBalance = Array.isArray(data) && data.some(d => typeof d.balance === 'number' && !Number.isNaN(d.balance));
    const hasPnL = Array.isArray(data) && data.some(d => typeof d.pnl === 'number' && !Number.isNaN(d.pnl));

    return (
        <div style={{ width: '100%', height: 420 }}>
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="i" tick={{ fontSize: 12 }}>
                        <Label value={xLabel} position="insideBottom" offset={-5} />
                    </XAxis>

                    {/* Left axis for Equity (R) */}
                    <YAxis yAxisId="left" width={60} tick={{ fontSize: 12 }}>
                        <Label value={yLeftLabel} angle={-90} position="insideLeft" offset={10} />
                    </YAxis>

                    {/* Right axis for Balance / PnL, only if present */}
                    {(hasBalance || hasPnL) && (
                        <YAxis yAxisId="right" orientation="right" width={70} tick={{ fontSize: 12 }}>
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
                            if (name === 'balance') return [formatNumber(value), 'Balance'];
                            if (name === 'pnl') return [formatNumber(value), 'P/L'];
                            return [formatNumber(value), name];
                        }}
                        labelFormatter={(label) => `Trade ${label}`}
                        labelStyle={{ color: '#000000' }}
                        itemStyle={{ fontWeight: 600 }}
                    />
                    <Legend />

                    {/* Equity line (always plotted) */}
                    <Line
                        type="monotone"
                        dataKey="equityR"
                        name="Equity (R-multiples)"
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