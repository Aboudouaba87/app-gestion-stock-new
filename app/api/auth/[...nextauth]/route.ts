import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    const result = await pool.query(
                        'SELECT * FROM users WHERE email = $1',
                        [credentials.email]
                    );

                    if (result.rows.length === 0) {
                        return null;
                    }

                    const user = result.rows[0];
                    const isValid = await bcrypt.compare(credentials.password, user.password_hash);

                    if (!isValid) {
                        return null;
                    }

                    await pool.query(`UPDATE users SET lastlogin = NOW() WHERE id = $1`, [user.id])
                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.name,
                        role: user.role || 'user',
                        warehouse: user.warehouse || 'main',
                        company_id: user.company_id || 1
                    };
                } catch (error) {
                    console.error("Erreur d'authentification:", error);
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export { authOptions };