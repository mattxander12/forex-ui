


/**
 * Forex/backtest formatting utilities
 */

/**
 * Format a number as currency (default: USD)
 * @param value
 * @param currency
 */
export function formatCurrency(value: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

/**
 * Format a number as a percentage string
 * @param value
 * @param digits
 */
export function formatPercent(value: number | undefined, digits: number = 2): string {
    if (value === undefined || value === null) return "–";
    if (!Number.isFinite(value)) return "–";
    // Auto-scale fractional inputs (e.g., 0.54 -> 54%) while preserving already-percentage inputs (e.g., 54)
    const scaled = Math.abs(value) <= 1 ? value * 100 : value;
    return `${scaled.toFixed(digits)}%`;
}

/**
 * Format a date/time in human-readable form
 * @param value
 */
export function formatDate(value: string | Date): string {
    const date = typeof value === "string" ? new Date(value) : value;
    // e.g. 2024-06-01 15:23:45
    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).replace(",", "");
}

/**
 * Format a number as pips (1 decimal)
 * @param value
 */
export function formatPips(value: number): string {
    return `${value.toFixed(1)} pips`;
}

/**
 * Format a number as lots (2 decimals)
 * @param value
 */
export function formatLots(value: number): string {
    return `${value.toFixed(2)} lots`;
}