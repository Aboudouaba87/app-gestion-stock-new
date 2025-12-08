"use client";

import { useTheme } from "@/app/theme-provider";

export function ThemeDebug() {
  const { theme } = useTheme();

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg z-50">
      <div className="text-sm">
        <div>
          Thème actuel: <strong>{theme}</strong>
        </div>
        <div>
          Classe HTML: <strong>{document.documentElement.className}</strong>
        </div>
        <div className="mt-2">
          <button
            onClick={() => document.documentElement.classList.toggle("dark")}
            className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-xs"
          >
            Toggle Dark
          </button>
        </div>
      </div>
    </div>
  );
}
