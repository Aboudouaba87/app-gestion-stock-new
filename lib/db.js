import { Pool } from "pg";

const pool = new Pool({
  // En local
  // user: "postgres",
  // host: "localhost",
  // database: "gestion_stock",
  // password: "admin",
  // port: 5432,

  // En production
  user: "gestion_stock_wh2f",
  host: "postgresql://gestion_stock:Vbc1NfVn4cUpligbF25RAS3Mm6tT57Nd@dpg-d4rh16qli9vc73a2526g-a/gestion_stock_wh2f",
  database: "gestion_stock",
  password: "Vbc1NfVn4cUpligbF25RAS3Mm6tT57Nd",
  port: 5432,
});

export { pool };
