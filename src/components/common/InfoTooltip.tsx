'use client';

import React from 'react';

export default function InfoTooltip({hint}: { hint?: string }) {
    if (!hint) return null;
    return (
        <span
            className="ml-2 inline-flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs w-4 h-4 cursor-help"
            tabIndex={0}
            title={hint}
            aria-label={hint}
            role="img"
        >
            ?
        </span>
    );
}