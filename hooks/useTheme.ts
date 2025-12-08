"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export function useTheme() {
    const { data: session, status } = useSession();
    const [theme, setTheme] = useState<string>('light');

    useEffect(() => {
        const loadTheme = async () => {
            try {
                if (status === 'authenticated') {
                    const res = await fetch('/api/settings/company');
                    if (res.ok) {
                        const data = await res.json();
                        const savedTheme = data.theme || 'light';
                        setTheme(savedTheme);
                        applyTheme(savedTheme);
                    }
                }
            } catch (error) {
                console.error('Erreur chargement thème:', error);
            }
        };

        loadTheme();
    }, [status]);

    const applyTheme = (theme: string) => {
        const html = document.documentElement;

        // Retirer toutes les classes de thème
        html.classList.remove('light', 'dark');

        if (theme === 'dark') {
            html.classList.add('dark');
        } else if (theme === 'light') {
            html.classList.add('light');
        } else if (theme === 'auto') {
            // Utiliser les préférences système
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                html.classList.add('dark');
            } else {
                html.classList.add('light');
            }
        }
    };

    return { theme, applyTheme };
}