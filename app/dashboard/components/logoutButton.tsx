// components/LogoutButton.tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/app/dashboard/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const handleLogout = async () => {
    try {
      // 1. Supprimer tous les cookies NextAuth
      const cookies = document.cookie.split(";");

      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name =
          eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

        if (name.includes("next-auth") || name.includes("auth")) {
          document.cookie =
            name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        }
      }

      // 2. Nettoyer le storage
      localStorage.clear();
      sessionStorage.clear();

      // 3. Déconnexion NextAuth
      await signOut({
        callbackUrl: "/",
        redirect: false,
      });

      // 4. Redirection forcée
      window.location.href = "/";
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      window.location.href = "/";
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      title="Déconnexion"
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );
}
