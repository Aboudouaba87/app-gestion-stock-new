// lib/db.js

import { Pool } from "pg";

const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL non définie en production");
}

export const pool = isProd
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10, // connexions max
      idleTimeoutMillis: 30000, // 30s
      connectionTimeoutMillis: 2000,
    })
  : new Pool({
      user: "postgres",
      host: "localhost",
      database: "gestion_stock",
      password: "admin",
      port: 5432,
    });
