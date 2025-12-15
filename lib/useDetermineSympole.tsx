"use client";

import { useEffect } from "react";

export function useDetermineSympole(setMonnaie: (value: string) => void) {
    useEffect(() => {
        const fetchMonnaie = async () => {
            try {
                const res = await fetch("/api/money", {
                    cache: "no-store",
                });
                if (!res.ok) throw new Error("Erreur API rôles");
                const data = await res.json();
                setMonnaie(data[0].currency);
            } catch (err) {
                console.error("Erreur fetch categories :", err);
            } finally {
                // setLoadingCategories(false);
            }
        };
        fetchMonnaie();
    }, [setMonnaie]);
}