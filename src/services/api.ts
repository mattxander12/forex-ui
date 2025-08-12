import type { Config } from '@/types/config';

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';
const VERSION = process.env.NEXT_PUBLIC_API_VERSION ?? '';

export async function train(config: Config) {
    const res = await fetch(`${BASE}/${VERSION}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function backtest(config: Config) {
    const res = await fetch(`${BASE}/${VERSION}/backtest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}