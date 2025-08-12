'use client';

import React from 'react';
import InfoTooltip from './InfoTooltip';

export default function Toggle({label, value, onChangeAction, hint}: {
    label: string;
    value: boolean;
    hint?: string;
    onChangeAction: (v: boolean) => void
}) {
    return (
        <label className="text-sm grid gap-1">
            <span className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="font-medium flex items-center">
                    {label}
                    <InfoTooltip hint={hint}/>
                </span>
            </span>
            <div className="flex items-center gap-3">
                <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={value}
                       onChange={e => onChangeAction(e.target.checked)}/>
                <span className="text-xs text-slate-500 dark:text-slate-400">{value ? 'Enabled' : 'Disabled'}</span>
            </div>
        </label>
    );
}