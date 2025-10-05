'use client';

import React, {useState, useEffect, useRef} from 'react';
import ConfigForm from '@/components/forms/ConfigForm';
import {Config, DEFAULTS, FullConfig} from '@/types/config';
import { mergeConfig } from '@/lib/configUtils';
import { applyConfig as applyConfigApi } from '@/services/api';

export default function Page() {
    const [value, setValue] = useState<Config>(DEFAULTS);
    const [loaded, setLoaded] = useState(false);

    // Load initial config from localStorage if present, then mark hydrated
    useEffect(() => {
        try {
            const raw = localStorage.getItem('app.config');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    setValue(parsed as Config);
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


    const onApplyConfig = async () => {
        try {
            await applyConfigApi(value);
            // Optionally provide lightweight feedback
            console.log('Config applied');
        } catch (e) {
            console.error(e);
            alert('Failed to apply config: ' + (e as Error).message);
        }
    };




    return (
        <>
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