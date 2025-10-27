'use client';

import React, {useState, useEffect, useRef} from 'react';
import clsx from 'clsx';
import ConfigForm from '@/components/forms/ConfigForm';
import {ConfigInput, DEFAULTS, FullConfig} from '@/types/config';
import { mergeConfig } from '@/lib/configUtils';
import { applyConfig as applyConfigApi } from '@/services/api';

export default function Page() {
    const [value, setValue] = useState<FullConfig>(DEFAULTS);
    const [loaded, setLoaded] = useState(false);

    // Load initial config from localStorage if present, then mark hydrated
    useEffect(() => {
        try {
            const raw = localStorage.getItem('app.config');
            if (raw) {
                const parsed = JSON.parse(raw) as unknown;
                if (parsed && typeof parsed === 'object') {
                    setValue(mergeConfig(parsed as ConfigInput));
                }
            }
        } catch {}
        finally {
            setLoaded(true);
        }
    }, []);

    // Persist to localStorage on value change
    useEffect(() => {
        if (!loaded) return;
        try {
            localStorage.setItem('app.config', JSON.stringify(value));
        } catch {}
    }, [value, loaded]);


    const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    const showToast = (message: string, durationMs = 2200) => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ id: Date.now(), message });
        toastTimerRef.current = setTimeout(() => {
            setToast(null);
            toastTimerRef.current = null;
        }, durationMs);
    };

    const onApplyConfig = async () => {
        try {
            await applyConfigApi(value);
            showToast('Config applied!');
        } catch (e) {
            console.error(e);
            alert('Failed to apply config: ' + (e as Error).message);
        }
    };




    return (
        <>
            {toast && (
                <div className="fixed top-6 right-6 z-30">
                    <div className={clsx(
                        'rounded-lg px-4 py-3 shadow-lg text-sm font-medium transition-opacity',
                        'bg-slate-900 text-white'
                    )}>
                        {toast.message}
                    </div>
                </div>
            )}
            <div className="max-w-5xl mx-auto mt-6 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={() => {
                        const ok = window.confirm('Reset all configuration values to defaults?');
                        if (!ok) return;
                        try { localStorage.removeItem('app.config'); } catch {}
                        setValue(DEFAULTS);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                    Reset
                </button>
                <button type="button" onClick={onApplyConfig} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium">
                    Apply Config
                </button>
            </div>
            <ConfigForm
                value={value}
                onChangeAction={setValue}
            />
        </>
    );
}
