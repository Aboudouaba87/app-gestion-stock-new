"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FiUser, FiLock } from "react-icons/fi";
import Image from "next/image";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log("🔐 Tentative de connexion...");

      // Essayer de se connecter
      const result = await signIn("credentials", {
        email: email,
        password: password,
        redirect: false, // IMPORTANT : ne pas rediriger automatiquement
      });

      console.log("Résultat de connexion:", result);

      if (result?.error) {
        console.error("❌ Erreur de connexion:", result.error);
        setError("Email ou mot de passe incorrect");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        console.log("✅ Connexion réussie, redirection vers /dashboard");
        // Rediriger manuellement vers le dashboard
        router.push("/dashboard");
        router.refresh(); // Rafraîchir pour mettre à jour la session
      }
    } catch (err) {
      console.error("❌ Erreur lors de la connexion:", err);
      setError("Une erreur est survenue lors de la connexion");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-700">
      <div className="bg-slate-900 p-8 rounded-lg shadow-md w-96">
        <div className="min-h-[75px] bg-white rounded-md py-2 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Logo StockPro"
            width={75}
            height={75}
            priority
          />
        </div>
        <h2 className="text-4xl font-bold text-center text-green-600 mt-5 h-full flex items-center justify-center">
          StockPro
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-white mb-1">
              Email
            </label>
            <div className="relative">
              <FiUser className="absolute top-3 left-3 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="admin@example.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <FiLock className="absolute top-3 left-3 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {/* Informations de test */}
        <div className="mt-6 p-4 bg-gray-800 rounded-md">
          <p className="text-sm text-gray-300 text-center">
            <strong className="text-white">Identifiants de test :</strong>
            <br />
            Email: admin@example.com
            <br />
            Mot de passe: password
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="text-indigo-400 hover:text-indigo-300"
          >
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
