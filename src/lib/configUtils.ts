import { ConfigInput, FullConfig, DEFAULTS } from '@/types/config';

export function mergeConfig(value?: ConfigInput): FullConfig {
    const cfg: ConfigInput = value ?? {};
    return {
        ...DEFAULTS,
        ...cfg,
        trading: { ...DEFAULTS.trading, ...(cfg.trading ?? {}) },
        paper: { ...DEFAULTS.paper, ...(cfg.paper ?? {}) },
        training: { ...DEFAULTS.training, ...(cfg.training ?? {}) },
        execution: { ...DEFAULTS.execution, ...(cfg.execution ?? {}) },
        risk: { ...DEFAULTS.risk, ...(cfg.risk ?? {}) },
        filter: { ...DEFAULTS.filter, ...(cfg.filter ?? {}) },
    };
}
