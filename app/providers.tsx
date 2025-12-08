"use client";

import { ClientToaster } from "./client-toaster";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

// Composant pour initialiser le thème
function ThemeInitializer() {
  useEffect(() => {
    const applyTheme = async () => {
      try {
        // Récupérer le thème depuis l'API
        const response = await fetch("/api/settings/company");
        if (response.ok) {
          const data = await response.json();
          const theme = data.theme || "light";
          const html = document.documentElement;

          console.log("Thème chargé depuis API:", theme);

          // Retirer toutes les classes de thème existantes
          html.classList.remove("light", "dark");

          if (theme === "dark") {
            html.classList.add("dark");
            console.log("Dark mode appliqué");
          } else if (theme === "light") {
            html.classList.add("light");
            console.log("Light mode appliqué");
          } else if (theme === "auto") {
            // Utiliser les préférences système
            const prefersDark = window.matchMedia(
              "(prefers-color-scheme: dark)"
            ).matches;
            const systemTheme = prefersDark ? "dark" : "light";
            html.classList.add(systemTheme);
            console.log("Auto mode - Système:", systemTheme);

            // Écouter les changements de préférences système
            const mediaQuery = window.matchMedia(
              "(prefers-color-scheme: dark)"
            );
            const handleChange = (e: MediaQueryListEvent) => {
              html.classList.remove("light", "dark");
              html.classList.add(e.matches ? "dark" : "light");
            };

            mediaQuery.addEventListener("change", handleChange);
            return () => mediaQuery.removeEventListener("change", handleChange);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement du thème:", error);
        // Fallback au light mode
        document.documentElement.classList.add("light");
      }
    };

    applyTheme();
  }, []);

  return null; // Ce composant ne rend rien
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeInitializer />
      {children}
      <ClientToaster
        position="top-center"
        richColors={false}
        toastOptions={{
          classNames: {
            toast:
              "!border !border-gray-200 !bg-white !text-black dark:!bg-gray-800 dark:!text-gray-100 dark:!border-gray-700",
            success:
              "!bg-green-300 !text-green-900 !border !border-green-200 dark:!bg-green-800 dark:!text-green-100 dark:!border-green-700",
            error:
              "!bg-red-300 !text-red-900 !border !border-red-200 dark:!bg-red-800 dark:!text-red-100 dark:!border-red-700",
            warning:
              "!bg-yellow-300 !text-yellow-900 !border !border-yellow-200 dark:!bg-yellow-800 dark:!text-yellow-100 dark:!border-yellow-700",
            info: "!bg-blue-300 !text-blue-900 !border !border-blue-200 dark:!bg-blue-800 dark:!text-blue-100 dark:!border-blue-700",
          },
        }}
      />
    </SessionProvider>
  );
}
