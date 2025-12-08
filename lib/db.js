// import { Pool } from "pg";

// const pool = new Pool({
//   // En local
//   user: "postgres",
//   host: "localhost",
//   database: "gestion_stock",
//   password: "admin",
//   port: 5432,
// });

// export { pool };

import { Pool } from "pg";

const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL non définie en production");
}

export const pool = isProd
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: "postgres",
      host: "localhost",
      database: "gestion_stock",
      password: "admin",
      port: 5432,
    });
