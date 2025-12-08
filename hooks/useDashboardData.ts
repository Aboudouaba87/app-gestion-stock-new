// hooks/useDashboardData.ts
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useDashboardData({ days = 90, limit = 5, movLimit = 10 } = {}) {
    const [state, setState] = useState({
        loading: true,
        error: null as string | null,
        payload: null as any,
    });

    const { data: session } = useSession();

    const fetchData = async () => {
        if (!session) return;

        setState({ loading: true, error: null, payload: null });

        try {
            const params = new URLSearchParams({
                days: String(days),
                limit: String(limit),
                movLimit: String(movLimit),
            });

            const res = await fetch(`/api/dashboard/summary?${params.toString()}`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Cache-Control": "no-cache",
                },
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || `Erreur ${res.status}: ${res.statusText}`);
            }

            const payload = await res.json();

            setState({
                loading: false,
                error: null,
                payload,
            });

            console.log("✅ Données dashboard chargées pour:", session.user?.email, payload);
        } catch (err: any) {
            console.error("❌ Erreur chargement dashboard:", err);

            setState({
                loading: false,
                error: err?.message || "Erreur lors du chargement des données",
                payload: null,
            });
        }
    };

    useEffect(() => {
        if (session) {
            fetchData();
        }

        // Rafraîchissement automatique toutes les 30 secondes
        const interval = setInterval(() => {
            if (session) fetchData();
        }, 30000);

        return () => {
            clearInterval(interval);
        };
    }, [session, days, limit, movLimit]);

    return { ...state, refetch: fetchData };
}