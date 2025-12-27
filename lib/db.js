import { Pool } from "pg";

const isProd = process.env.NODE_ENV === "production";

export const pool =
  isProd && process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // <--- très important pour Supabase
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })
    : !isProd
    ? new Pool({
        user: "postgres",
        host: "localhost",
        database: "gestion_stock",
        password: "admin",
        port: 5432,
      })
    : null;

if (isProd && !process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL non définie en production, connexion DB désactivée"
  );
}
