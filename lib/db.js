import { Pool } from "pg";

const pool = new Pool({
  // En local
  // user: "postgres",
  // host: "localhost",
  // database: "gestion_stock",
  // password: "admin",
  // port: 5432,

  // En production
  user: "gestion_stock_uf6h_user",
  host: "dpg-d3ti8dodl3ps73ef95ug-a",
  database: "gestion_stock_uf6h",
  password: "u4vX0WIWGmctviRQV43NumITOdgTAkbC",
  port: 5432,
});

export default pool;
