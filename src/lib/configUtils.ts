import { Config, FullConfig, DEFAULTS } from '@/types/config';

export function mergeConfig(value: Config): FullConfig {
    return {
        ...DEFAULTS,
        ...value,
        trading: { ...DEFAULTS.trading, ...value.trading },
        paper: { ...DEFAULTS.paper, ...value.paper },
        account: { ...DEFAULTS.account, ...(value.account ?? {}) },
        training: { ...DEFAULTS.training, ...(value.training ?? {}) },
        marketData: { ...DEFAULTS.marketData, ...(value.marketData ?? {}) },
        execution: { ...DEFAULTS.execution, ...(value.execution ?? {}) },
        risk: { ...DEFAULTS.risk, ...(value.risk ?? {}) },
        filter: { ...DEFAULTS.filter, ...(value.filter ?? {}) },
    };
}