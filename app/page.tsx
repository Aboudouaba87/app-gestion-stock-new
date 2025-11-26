"use client"; // ← AJOUTEZ CETTE LIGNE

import Head from "next/head";
import { useState } from "react";
import { FiUser, FiLock } from "react-icons/fi";
import Image from "next/image";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Appeler l'API de connexion ici
      console.log("Connexion réussie !");
    } catch (err) {
      setError("Identifiants incorrects");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-700">
      <Head>
        <title>Connexion - StockPro</title>
      </Head>

      <div className=" bg-slate-900 p-8 rounded-lg shadow-md w-96">
        <div className=" min-h-[75px] bg-white rounded-md py-2 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Logo StockPro"
            width={75}
            height={75}
            priority // Pour les images importantes (LCP)
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
                placeholder="Votre email"
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
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Link href={"/dashboard"}> Se connecter</Link>
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Pas encore de compte ?{" "}
          <a href="#" className="text-indigo-600 hover:text-indigo-800">
            S'inscrire
          </a>
        </p>
      </div>
    </div>
  );
}
