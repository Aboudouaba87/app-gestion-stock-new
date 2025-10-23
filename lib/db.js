import { Pool } from "pg";

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "gestion_stock",
  password: "admin",
  port: 5432,
});

export default pool;
