// app/unauthorized/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Accès refusé</h1>
        <p className="text-gray-600 mb-6">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>

        {session?.user && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">Connecté en tant que:</p>
            <p className="font-medium">
              {session.user.name || session.user.email}
            </p>
            <p className="text-sm text-gray-500">Rôle: {session.user.role}</p>
          </div>
        )}

        <div className="flex flex-col space-y-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retour au tableau de bord
          </button>

          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Retour à l'accueil
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
