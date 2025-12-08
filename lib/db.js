import { Pool } from "pg";

const pool = new Pool({
  // En local
  // user: "postgres",
  // host: "localhost",
  // database: "gestion_stock",
  // password: "admin",
  // port: 5432,

  // En production
  user: "gestion_stock",
  host: "dpg-d4rh16qli9vc73a2526g-a", // juste le host
  database: "gestion_stock_wh2f",
  password: "Vbc1NfVn4cUpligbF25RAS3Mm6tT57Nd",
  port: 5432,
});

export { pool };
