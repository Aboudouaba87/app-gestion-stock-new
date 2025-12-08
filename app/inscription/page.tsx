// app/inscription/page.tsx - CORRIGÉ
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FiUser, FiLock, FiBriefcase, FiPhone, FiMail } from "react-icons/fi";
import Image from "next/image";
import Link from "next/link";

export default function Inscription() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null); // ← CORRECTION ICI : setError est maintenant défini
    setSuccess(null);

    // Validation côté client
    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setIsLoading(false);
      return;
    }

    if (formData.companyName.length < 2) {
      setError("Le nom de l'entreprise doit contenir au moins 2 caractères");
      setIsLoading(false);
      return;
    }

    try {
      console.log("🚀 Début de l'inscription...");

      // 1. Inscription via l'API
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          companyName: formData.companyName,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        throw new Error(registerData.message || "Erreur lors de l'inscription");
      }

      console.log("✅ Inscription réussie, attente de 1 seconde...");

      // Attendre que la transaction soit complètement terminée
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("🔐 Tentative de connexion automatique...");

      // 2. Connexion automatique avec NextAuth
      try {
        const signInResult = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        console.log("Résultat de connexion:", signInResult);

        if (signInResult?.error) {
          console.warn("⚠️ Connexion automatique échouée:", signInResult.error);
          // Compte créé mais connexion échouée
          setSuccess("Compte créé avec succès ! Veuillez vous connecter.");
          setError(null);

          // Rediriger vers la page d'accueil après 2 secondes
          setTimeout(() => {
            router.push("/");
          }, 2000);
        } else {
          console.log("🎉 Connexion automatique réussie !");
          // Connexion réussie
          setSuccess(
            "Compte créé avec succès ! Redirection vers votre tableau de bord..."
          );
          setError(null);

          // Rediriger vers le dashboard
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 1500);
        }
      } catch (signInError) {
        console.error(
          "❌ Erreur lors de la connexion automatique:",
          signInError
        );
        // Fallback
        setSuccess("Compte créé ! Veuillez vous connecter manuellement.");
        setError(null);
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    } catch (error: any) {
      console.error("❌ Erreur d'inscription:", error);
      setError(
        error.message ||
          "Une erreur est survenue lors de la création du compte."
      );
      setSuccess(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-700 p-4">
      <div className="bg-slate-900 p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="min-h-[75px] bg-white rounded-md py-2 flex items-center justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Logo StockPro"
            width={75}
            height={75}
            priority
          />
        </div>

        <h2 className="text-3xl font-bold text-center text-green-600 mb-2">
          Créer un compte StockPro
        </h2>

        <p className="text-gray-400 text-center mb-6">
          Gérez votre inventaire en toute simplicité
        </p>

        {success && (
          <div className="mb-4 p-3 text-sm text-green-500 bg-green-50 border border-green-200 rounded-md">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom de l'entreprise */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Nom de votre entreprise *
            </label>
            <div className="relative">
              <FiBriefcase className="absolute top-3 left-3 text-gray-400" />
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full pl-10 p-2 border border-gray-600 rounded-md bg-slate-800 text-white focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ex: Mon Magasin SARL"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Nom complet */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Votre nom complet *
            </label>
            <div className="relative">
              <FiUser className="absolute top-3 left-3 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 p-2 border border-gray-600 rounded-md bg-slate-800 text-white focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="John Doe"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Email *
              </label>
              <div className="relative">
                <FiMail className="absolute top-3 left-3 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 p-2 border border-gray-600 rounded-md bg-slate-800 text-white focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="contact@entreprise.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Téléphone
              </label>
              <div className="relative">
                <FiPhone className="absolute top-3 left-3 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 p-2 border border-gray-600 rounded-md bg-slate-800 text-white focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="+228 12 34 56 78"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Mot de passe *
              </label>
              <div className="relative">
                <FiLock className="absolute top-3 left-3 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 p-2 border border-gray-600 rounded-md bg-slate-800 text-white focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Confirmer *
              </label>
              <div className="relative">
                <FiLock className="absolute top-3 left-3 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 p-2 border border-gray-600 rounded-md bg-slate-800 text-white focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Création en cours...
                </>
              ) : (
                "Créer mon compte StockPro"
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-800 rounded-md">
          <p className="text-sm text-gray-300 text-center">
            <strong className="text-white">Après inscription :</strong>
            <br />
            • Votre entreprise sera créée automatiquement
            <br />
            • Vous serez connecté automatiquement
            <br />• Vous serez redirigé vers votre tableau de bord
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          Déjà un compte ?{" "}
          <Link href="/" className="text-indigo-400 hover:text-indigo-300">
            Se connecter
          </Link>
        </p>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>
            En créant un compte, vous acceptez nos conditions d'utilisation.
          </p>
          <p className="mt-1">* Champs obligatoires</p>
        </div>
      </div>
    </div>
  );
}
