'use client';

import React, { useState, useEffect } from 'react';
import InfoTooltip from './InfoTooltip';

export default function NumberInput({label, value, onChangeAction, step = 1, hint, integerOnly = false}: {
    label: string;
    value: number;
    step?: number;
    hint?: string;
    integerOnly?: boolean;
    onChangeAction: (v: number) => void
}) {
    const [inputValue, setInputValue] = useState(value.toString());

    useEffect(() => {
        setInputValue(value.toString());
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (integerOnly) {
            // Strip non-digits
            val = val.replace(/[^0-9]/g, '');
            setInputValue(val);
            if (val !== '') {
                const n = parseInt(val, 10);
                if (Number.isFinite(n)) onChangeAction(n);
            }
            return;
        }
        setInputValue(val);
        if (val !== '' && !isNaN(Number(val))) {
            onChangeAction(Number(val));
        }
    };

    const handleBlur = () => {
        if (inputValue === '') {
            setInputValue('0');
            onChangeAction(0);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!integerOnly) return;
        // Block decimal/exponent and sign characters for integer-only fields
        if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') {
            e.preventDefault();
        }
    };

    return (
        <label className="text-sm grid gap-1">
            <span className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="font-medium flex items-center">
                    {label}
                    <InfoTooltip hint={hint}/>
                </span>
            </span>
            <input
                type="number"
                step={integerOnly ? 1 : step}
                inputMode={integerOnly ? 'numeric' : 'decimal'}
                pattern={integerOnly ? '[0-9]*' : undefined}
                className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={inputValue}
                placeholder={hint}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        </label>
    );
}