"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Theme = "light" | "dark" | "auto";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [theme, setThemeState] = useState<Theme>("light");

  // Charger le thème au démarrage
  useEffect(() => {
    const loadTheme = async () => {
      if (status === "authenticated" || status === "unauthenticated") {
        try {
          const res = await fetch("/api/settings/company");
          if (res.ok) {
            const data = await res.json();
            const savedTheme = data.theme || "light";
            setThemeState(savedTheme);
            applyTheme(savedTheme);
          } else {
            // Fallback si erreur API
            applyTheme("light");
          }
        } catch (error) {
          console.error("Erreur chargement thème:", error);
          applyTheme("light"); // Fallback
        }
      }
    };

    if (status !== "loading") {
      loadTheme();
    }
  }, [status]);

  // Fonction pour appliquer le thème au DOM
  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement;

    // Retirer anciennes classes
    html.classList.remove("light", "dark");

    let actualTheme = newTheme;

    if (newTheme === "dark") {
      html.classList.add("dark");
    } else if (newTheme === "light") {
      html.classList.add("light");
    } else if (newTheme === "auto") {
      // Détecter les préférences système
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      actualTheme = prefersDark ? "dark" : "light";
      html.classList.add(actualTheme);

      // Écouter les changements de préférences système
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        if (theme === "auto") {
          html.classList.remove("light", "dark");
          html.classList.add(e.matches ? "dark" : "light");
        }
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    console.log(`Thème appliqué: ${actualTheme} (sélection: ${newTheme})`);
  };

  // Fonction pour changer le thème
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    // Sauvegarder dans l'API (si l'utilisateur est connecté)
    if (status === "authenticated") {
      try {
        await fetch("/api/settings/company", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: newTheme }),
        });
        console.log("Thème sauvegardé:", newTheme);
      } catch (error) {
        console.error("Erreur sauvegarde thème:", error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
