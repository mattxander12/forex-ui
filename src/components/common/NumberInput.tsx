'use client';

import React, { useState, useEffect } from 'react';
import InfoTooltip from './InfoTooltip';

export default function NumberInput({label, value, onChangeAction, step = 1, hint}: {
    label: string;
    value: number;
    step?: number;
    hint?: string;
    onChangeAction: (v: number) => void
}) {
    const [inputValue, setInputValue] = useState(value.toString());

    useEffect(() => {
        setInputValue(value.toString());
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
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
                step={step}
                className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={inputValue}
                placeholder={hint}
                onChange={handleChange}
                onBlur={handleBlur}
            />
        </label>
    );
}