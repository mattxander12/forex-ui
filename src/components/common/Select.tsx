'use client';

import React from 'react';
import InfoTooltip from './InfoTooltip';

export default function Select({label, value, options, onChangeAction, hint}: {
    label: string;
    value: string;
    options: string[];
    hint?: string;
    onChangeAction: (v: string) => void
}) {
    return (
        <label className="text-sm grid gap-1">
            <span className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="font-medium flex items-center">
                    {label}
                    <InfoTooltip hint={hint}/>
                </span>
            </span>
            <select
                className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={value}
                onChange={e => onChangeAction(e.target.value)}
            >
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </label>
    );
}