import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db"; // adapte le chemin si nécessaire

export async function GET(req: NextRequest) {
  try {
    const client = await pool.connect();

    try {
      // Total produits
      const totalProductsRes = await client.query(`
        SELECT COUNT(*)::int AS total_products FROM products;
      `);

      // Produits en stock / faible / rupture (par produit agrégé)
      const stockCountsRes = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE stock_sum > 0) AS in_stock,
          COUNT(*) FILTER (WHERE stock_sum > 0 AND stock_sum <= 5) AS low_stock,
          COUNT(*) FILTER (WHERE stock_sum = 0) AS out_of_stock
        FROM (
          SELECT product_id, SUM(stock) AS stock_sum
          FROM product_warehouses
          GROUP BY product_id
        ) s;
      `);

      // Total fournisseurs
      const totalSuppliersRes = await client.query(`
        SELECT COUNT(*)::int AS total_suppliers FROM suppliers;
      `);

      // Commandes et CA du mois courant
      const ordersThisMonthRes = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE))::int AS orders_this_month,
          COALESCE(SUM(amount) FILTER (WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)),0)::numeric AS sales_value_month
        FROM sales;
      `);

      // Valeur totale du stock
      const stockValueRes = await client.query(`
        SELECT COALESCE(SUM(p.price * pw.stock),0)::numeric AS stock_value
        FROM products p
        JOIN product_warehouses pw ON pw.product_id = p.id;
      `);

      // CA quotidien 90 jours (pour chart) — limité à 90 jours par défaut
      const url = new URL(req.url);
      const days = Number(url.searchParams.get("days") || 90);
      const revenueSeriesRes = await client.query(
        `
        SELECT (date::date) AS day, COALESCE(SUM(amount),0)::numeric AS daily_revenue
        FROM sales
        WHERE date >= CURRENT_DATE - ($1::int || ' days')::interval
        GROUP BY day
        ORDER BY day;
      `,
        [days]
      );

      // Top products par valeur de stock (limit param)
      const limit = Number(url.searchParams.get("limit") || 10);
      const topProductsRes = await client.query(
        `
        SELECT p.sku, p.name, SUM(pw.stock)::int AS qty, p.price::numeric, (SUM(pw.stock)*p.price)::numeric AS value
        FROM products p
        JOIN product_warehouses pw ON pw.product_id = p.id
        GROUP BY p.id
        ORDER BY value DESC
        LIMIT $1;
      `,
        [limit]
      );

      // Derniers mouvements de stock (limit param)
      const movLimit = Number(url.searchParams.get("movLimit") || 10);
      const stockMovementsRes = await client.query(
        `
        SELECT sm.id, sm.product_id, p.sku, p.name, sm.type, sm.qty, sm.from_warehouse, sm.to_warehouse, sm.reference, u.email AS user_email, sm.created_at
        FROM stock_movements sm
        LEFT JOIN products p ON p.id = sm.product_id
        LEFT JOIN users u ON u.id = sm.user_id
        ORDER BY sm.created_at DESC
        LIMIT $1;
      `,
        [movLimit]
      );

      // Construire la réponse agrégée
      const payload = {
        total_products: totalProductsRes.rows[0].total_products,
        in_stock: Number(stockCountsRes.rows[0].in_stock || 0),
        low_stock: Number(stockCountsRes.rows[0].low_stock || 0),
        out_of_stock: Number(stockCountsRes.rows[0].out_of_stock || 0),
        total_suppliers: totalSuppliersRes.rows[0].total_suppliers,
        orders_this_month: ordersThisMonthRes.rows[0].orders_this_month,
        sales_value_month: ordersThisMonthRes.rows[0].sales_value_month,
        stock_value: stockValueRes.rows[0].stock_value,
        revenue_series: revenueSeriesRes.rows, // [{ day: '2025-10-01', daily_revenue: '...' }, ...]
        top_products: topProductsRes.rows,
        recent_stock_movements: stockMovementsRes.rows,
      };

      return NextResponse.json(payload, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("API /api/dashboard/summary error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
