// lib/auth.ts
import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

// Configuration NextAuth
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Email ou mot de passe manquant");
          return null;
        }

        try {
          console.log("🔍 Tentative de connexion pour:", credentials.email);

          const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [credentials.email]
          );

          if (result.rows.length === 0) {
            console.log("❌ Utilisateur non trouvé:", credentials.email);
            return null;
          }

          const user = result.rows[0];
          console.log("👤 Utilisateur trouvé:", user.email);

          const isValid = await bcrypt.compare(credentials.password, user.password_hash);

          if (!isValid) {
            console.log("❌ Mot de passe incorrect pour:", credentials.email);
            return null;
          }

          console.log("✅ Authentification réussie pour:", user.email);

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role || 'user',
            warehouse: user.warehouse || 'main',
            company_id: user.company_id || 1
          };
        } catch (error) {
          console.error("❌ Erreur d'authentification:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.warehouse = user.warehouse;
        token.company_id = user.company_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          warehouse: token.warehouse as string,
          company_id: token.company_id as number,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Fonctions utilitaires
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    console.log("❌ Aucune session ou utilisateur trouvé");
    return null;
  }

  console.log("👤 Session user:", session.user);

  const companyId = Number(session.user.company_id);

  if (!companyId || Number.isNaN(companyId)) {
    console.error("❌ company_id manquant ou invalide dans la session", session.user);
    return null;
  }

  return {
    id: Number(session.user.id),
    company_id: companyId,
    role: session.user.role || 'user',
    warehouse: session.user.warehouse || 'main',
    name: session.user.name || '',
    email: session.user.email || '',
  };
}

export async function getCurrentUserCompany() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    console.log("❌ Aucune session pour getCurrentUserCompany");
    return null;
  }

  const companyId = Number(session.user.company_id);

  if (!companyId || Number.isNaN(companyId)) {
    console.error("❌ company_id invalide dans getCurrentUserCompany", session.user);
    return null;
  }

  return {
    id: Number(session.user.id),
    name: session.user.name || '',
    email: session.user.email || '',
    role: session.user.role || 'user',
    warehouse: session.user.warehouse || 'main',
    company_id: companyId,
  };
}