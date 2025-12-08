"use client";

import { useEffect, useState } from 'react';

export function useSystemTheme() {
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            setSystemTheme(e.matches ? 'dark' : 'light');
        };

        // Définir la valeur initiale
        setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

        // Écouter les changements
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    return systemTheme;
}