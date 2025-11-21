// import { NextRequest, NextResponse } from "next/server";
// import pool from "@/lib/db";

// type StatCard = {
//   title: string;
//   value: string;
//   change: string;
//   icon?: string | null;
//   positive: boolean;
// };

// export async function GET(req: NextRequest) {
//   const client = await pool.connect();
//   try {
//     const url = new URL(req.url);
//     const days = Number(url.searchParams.get("days") || 90);
//     const topLimit = Number(url.searchParams.get("limit") || 10);
//     const movLimit = Number(url.searchParams.get("movLimit") || 10);
//     const threshold = Number(url.searchParams.get("threshold") || 5);

//     const fmtCurrency = (n: number) =>
//       new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

//     const fmtNumber = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

//     const getChange = (current: number, previous: number) => {
//       if (previous === 0 && current === 0) return "0% par rapport au mois dernier";
//       if (previous === 0) return "+∞% par rapport au mois dernier";
//       const delta = ((current - previous) / previous) * 100;
//       const rounded = Math.round(delta * 10) / 10;
//       const sign = rounded >= 0 ? "+" : "";
//       return `${sign}${rounded}% par rapport au mois dernier`;
//     };

//     // Exécute requêtes principales en parallèle quand possible
//     const [
//       totalProductsRes,
//       stockCountsRes,
//       totalClientsRes,
//       salesRes,
//       previousSalesRes,
//       previousProductsRes,
//       previousClientsRes,
//       stockValueRes,
//       revenueSeriesRes,
//       topProductsRes,
//       stockAlertsRes,
//       stockMovementsRes
//     ] = await Promise.all([
//       client.query(`SELECT COUNT(*)::int AS total_products FROM products;`),
//       client.query(`
//         SELECT
//           COUNT(*) FILTER (WHERE stock_sum > 0)::int AS in_stock,
//           COUNT(*) FILTER (WHERE stock_sum > 0 AND stock_sum <= 5)::int AS low_stock,
//           COUNT(*) FILTER (WHERE stock_sum = 0)::int AS out_of_stock
//         FROM (
//           SELECT product_id, SUM(stock) AS stock_sum
//           FROM product_warehouses
//           GROUP BY product_id
//         ) s;
//       `),
//       client.query(`SELECT COUNT(*)::int AS total_clients FROM clients;`),
//       client.query(`
//         SELECT
//           COUNT(*) FILTER (WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE))::int AS orders_this_month,
//           COALESCE(SUM(amount) FILTER (WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)),0)::numeric AS sales_value_month
//         FROM sales;
//       `),
//       client.query(`
//         SELECT
//           COUNT(*) FILTER (WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE - interval '1 month'))::int AS orders_last_month,
//           COALESCE(SUM(amount) FILTER (WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE - interval '1 month')),0)::numeric AS sales_value_last_month
//         FROM sales;
//       `),
//       client.query(`
//         SELECT COUNT(*)::int AS products_last_month
//         FROM products
//         WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - interval '1 month');
//       `),
//       client.query(`
//         SELECT COUNT(*)::int AS clients_last_month
//         FROM clients
//         WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - interval '1 month');
//       `),
//       client.query(`
//         SELECT COALESCE(SUM(COALESCE(p.price,0) * COALESCE(pw.stock,0)),0)::numeric AS stock_value
//         FROM products p
//         LEFT JOIN product_warehouses pw ON pw.product_id = p.id;
//       `),
//       client.query(
//         `
//         SELECT date_trunc('month', date)::date AS month, COALESCE(SUM(amount),0)::numeric AS monthly_revenue, COUNT(*)::int AS monthly_orders
//         FROM sales
//         WHERE date >= CURRENT_DATE - ($1::int || ' days')::interval
//         GROUP BY month
//         ORDER BY month;
//       `,
//         [days]
//       ),
//       client.query(
//         `
//         SELECT p.id, p.sku, p.name, COALESCE(SUM(pw.stock),0)::int AS qty,
//                COALESCE(p.price,0)::numeric AS price,
//                (COALESCE(SUM(pw.stock),0) * COALESCE(p.price,0))::numeric AS value
//         FROM products p
//         LEFT JOIN product_warehouses pw ON pw.product_id = p.id
//         GROUP BY p.id
//         ORDER BY value DESC
//         LIMIT $1;
//         `,
//         [topLimit]
//       ),
//       client.query(
//         `
//         SELECT p.id, p.sku, p.name, COALESCE(SUM(pw.stock),0)::int AS qty
//         FROM products p
//         LEFT JOIN product_warehouses pw ON pw.product_id = p.id
//         GROUP BY p.id
//         HAVING COALESCE(SUM(pw.stock),0) <= $1
//         ORDER BY qty ASC
//         LIMIT 100;
//       `,
//         [threshold]
//       ),
//       client.query(
//         `
//         SELECT sm.id, sm.product_id, p.sku, p.name, sm.type, sm.qty,
//                sm.from_warehouse, sm.to_warehouse, sm.reference,
//                u.email AS user_email, sm.created_at
//         FROM stock_movements sm
//         LEFT JOIN products p ON p.id = sm.product_id
//         LEFT JOIN users u ON u.id = sm.user_id
//         ORDER BY sm.created_at DESC
//         LIMIT $1;
//       `,
//         [movLimit]
//       )
//     ]);

//     // Préparer stats dynamiques
//     const salesCurrent = Number(salesRes.rows[0]?.sales_value_month ?? 0);
//     const salesPrevious = Number(previousSalesRes.rows[0]?.sales_value_last_month ?? 0);
//     const ordersCurrent = Number(salesRes.rows[0]?.orders_this_month ?? 0);
//     const ordersPrevious = Number(previousSalesRes.rows[0]?.orders_last_month ?? 0);
//     const productsCurrent = Number(totalProductsRes.rows[0]?.total_products ?? 0);
//     const productsPrevious = Number(previousProductsRes.rows[0]?.products_last_month ?? 0);
//     const clientsCurrent = Number(totalClientsRes.rows[0]?.total_clients ?? 0);
//     const clientsPrevious = Number(previousClientsRes.rows[0]?.clients_last_month ?? 0);

//     const stats: StatCard[] = [
//       {
//         title: "Chiffre d'affaires",
//         value: fmtCurrency(salesCurrent),
//         change: getChange(salesCurrent, salesPrevious),
//         icon: "Euro",
//         positive: salesCurrent - salesPrevious >= 0
//       },
//       {
//         title: "Commandes",
//         value: fmtNumber(ordersCurrent),
//         change: getChange(ordersCurrent, ordersPrevious),
//         icon: "ShoppingCart",
//         positive: ordersCurrent - ordersPrevious >= 0
//       },
//       {
//         title: "Produits",
//         value: fmtNumber(productsCurrent),
//         change: getChange(productsCurrent, productsPrevious),
//         icon: "Package",
//         positive: productsCurrent - productsPrevious >= 0
//       },
//       {
//         title: "Clients actifs",
//         value: fmtNumber(clientsCurrent),
//         change: getChange(clientsCurrent, clientsPrevious),
//         icon: "Users",
//         positive: clientsCurrent - clientsPrevious >= 0
//       }
//     ];

//     // Construire alerts (format proche de ton fichier)
//     const stockAlertsRows = stockAlertsRes.rows;
//     const alerts = stockAlertsRows.map((r: any, i: number) => ({
//       id: r.id ?? i + 1,
//       product: r.name ?? r.sku ?? `product_${r.id ?? i + 1}`,
//       category: r.category ?? "Non défini",
//       stock: Number(r.qty ?? 0),
//       icon: null,
//       status: Number(r.qty ?? 0) === 0 ? "out" : "low"
//     }));

//     // Construire sales_chart mensuel (format month short + sales + orders)
//     const salesChart = revenueSeriesRes.rows.map((r: any) => {
//       const m = new Date(r.month);
//       const monthLabel = m.toLocaleString("fr-FR", { month: "short" });
//       return {
//         month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
//         sales: Math.round(Number(r.monthly_revenue)),
//         orders: Number(r.monthly_orders ?? 0)
//       };
//     });

//     // top_products : laisser tel quel (déjà au bon format)
//     const top_products = topProductsRes.rows.map((r: any) => ({
//       id: r.id,
//       sku: r.sku,
//       name: r.name,
//       qty: Number(r.qty),
//       price: Number(r.price),
//       value: Number(r.value)
//     }));

//     // stock_alerts détaillé (retourner aussi si besoin)
//     const stock_alerts = stockAlertsRows.map((r: any) => ({
//       id: r.id,
//       sku: r.sku,
//       name: r.name,
//       qty: Number(r.qty)
//     }));

//     const payload = {
//       stats, // tableau de 4 cartes formatées
//       alerts, // tableau d'alerts formatées comme dans ton fichier
//       sales_chart: salesChart, // tableau mensuel pour chart (month,sales,orders)
//       top_products, // inchangé à partir de ta DB
//       stock_alerts // tableau détaillé (id,sku,name,qty)
//     };

//     return NextResponse.json(payload, { status: 200 });
//   } catch (err) {
//     console.error("GET /api/dashboard/summary error:", err);
//     return NextResponse.json({ error: "Internal Server Error", detail: (err as any)?.message ?? String(err) }, { status: 500 });
//   } finally {
//     client.release();
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") || 365); // window for sales_chart
    const topLimit = Number(url.searchParams.get("limit") || 10);
    const movLimit = Number(url.searchParams.get("movLimit") || 10);
    const threshold = Number(url.searchParams.get("threshold") || 10); // <= 10 for alerts

    const fmtCurrency = (n: number) =>
      new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
    const fmtNumber = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

    const getChange = (current: number, previous: number) => {
      if (previous === 0 && current === 0) return "0% par rapport au mois dernier";
      if (previous === 0) return "+∞% par rapport au mois dernier";
      const delta = ((current - previous) / previous) * 100;
      const rounded = Math.round(delta * 10) / 10;
      const sign = rounded >= 0 ? "+" : "";
      return `${sign}${rounded}% par rapport au mois dernier`;
    };

    // Parallel queries
    const [
      totalProductsRes,
      stockCountsRes,
      totalClientsRes,
      salesRes,
      previousSalesRes,
      previousProductsRes,
      previousClientsRes,
      stockValueRes,
      revenueSeriesRes,
      topProductsRes,
      stockAlertsRes,
      stockMovementsRes
    ] = await Promise.all([
      client.query(`SELECT COUNT(*)::int AS total_products FROM products;`),
      client.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE stock_sum > 0)::int AS in_stock,
          COUNT(*) FILTER (WHERE stock_sum > 0 AND stock_sum <= 5)::int AS low_stock,
          COUNT(*) FILTER (WHERE stock_sum = 0)::int AS out_of_stock
        FROM (
          SELECT product_id, SUM(stock) AS stock_sum
          FROM product_warehouses
          GROUP BY product_id
        ) s;
      `
      ),
      client.query(`SELECT COUNT(*)::int AS total_clients FROM clients;`),
      client.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE))::int AS orders_this_month,
          COALESCE(SUM(amount) FILTER (WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)),0)::numeric AS sales_value_month
        FROM sales;
      `
      ),
      client.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE - interval '1 month'))::int AS orders_last_month,
          COALESCE(SUM(amount) FILTER (WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE - interval '1 month')),0)::numeric AS sales_value_last_month
        FROM sales;
      `
      ),
      client.query(
        `
        SELECT COUNT(*)::int AS products_last_month
        FROM products
        WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - interval '1 month');
      `
      ),
      client.query(
        `
        SELECT COUNT(*)::int AS clients_last_month
        FROM clients
        WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - interval '1 month');
      `
      ),
      client.query(
        `
        SELECT COALESCE(SUM(COALESCE(p.price,0) * COALESCE(pw.stock,0)),0)::numeric AS stock_value
        FROM products p
        LEFT JOIN product_warehouses pw ON pw.product_id = p.id;
      `
      ),
      client.query(
        `
        SELECT date_trunc('month', date)::date AS month,
               COALESCE(SUM(amount),0)::numeric AS monthly_revenue,
               COUNT(*)::int AS monthly_orders
        FROM sales
        WHERE date >= CURRENT_DATE - ($1::int || ' days')::interval
        GROUP BY month
        ORDER BY month;
      `,
        [days]
      ),
      client.query(
        `
        SELECT p.id, p.sku, p.name, COALESCE(SUM(pw.stock),0)::int AS qty,
               COALESCE(p.price,0)::numeric AS price,
               (COALESCE(SUM(pw.stock),0) * COALESCE(p.price,0))::numeric AS value
        FROM products p
        LEFT JOIN product_warehouses pw ON pw.product_id = p.id
        GROUP BY p.id
        ORDER BY value DESC
        LIMIT $1;
      `,
        [topLimit]
      ),
      // stock alerts: products with total stock <= threshold
      client.query(
        `
        SELECT p.id, p.sku, p.name, p.category, COALESCE(SUM(pw.stock),0)::int AS stock_total
        FROM products p
        LEFT JOIN product_warehouses pw ON pw.product_id = p.id
        GROUP BY p.id, p.sku, p.name, p.category
        HAVING COALESCE(SUM(pw.stock),0) <= $1
        ORDER BY stock_total ASC
        LIMIT 500;
      `,
        [threshold]
      ),
      client.query(
        `
        SELECT sm.id, sm.product_id, p.sku, p.name, sm.type, sm.qty,
               sm.from_warehouse, sm.to_warehouse, sm.reference,
               u.email AS user_email, sm.created_at
        FROM stock_movements sm
        LEFT JOIN products p ON p.id = sm.product_id
        LEFT JOIN users u ON u.id = sm.user_id
        ORDER BY sm.created_at DESC
        LIMIT $1;
      `,
        [movLimit]
      )
    ]);

    // Current / previous numeric values
    const salesCurrent = Number(salesRes.rows[0]?.sales_value_month ?? 0);
    const salesPrevious = Number(previousSalesRes.rows[0]?.sales_value_last_month ?? 0);
    const ordersCurrent = Number(salesRes.rows[0]?.orders_this_month ?? 0);
    const ordersPrevious = Number(previousSalesRes.rows[0]?.orders_last_month ?? 0);
    const productsCurrent = Number(totalProductsRes.rows[0]?.total_products ?? 0);
    const productsPrevious = Number(previousProductsRes.rows[0]?.products_last_month ?? 0);
    const clientsCurrent = Number(totalClientsRes.rows[0]?.total_clients ?? 0);
    const clientsPrevious = Number(previousClientsRes.rows[0]?.clients_last_month ?? 0);

    // Build stats (4 cards)
    const stats = [
      {
        title: "Chiffre d'affaires",
        value: fmtCurrency(salesCurrent),
        change: getChange(salesCurrent, salesPrevious),
        icon: "Euro", // string key to map to actual icon on client
        positive: salesCurrent - salesPrevious >= 0
      },
      {
        title: "Commandes",
        value: fmtNumber(ordersCurrent),
        change: getChange(ordersCurrent, ordersPrevious),
        icon: "ShoppingCart",
        positive: ordersCurrent - ordersPrevious >= 0
      },
      {
        title: "Produits",
        value: fmtNumber(productsCurrent),
        change: getChange(productsCurrent, productsPrevious),
        icon: "Package",
        positive: productsCurrent - productsPrevious >= 0
      },
      {
        title: "Clients actifs",
        value: fmtNumber(clientsCurrent),
        change: getChange(clientsCurrent, clientsPrevious),
        icon: "Users",
        positive: clientsCurrent - clientsPrevious >= 0
      }
    ];

    // Build alerts from stockAlertsRes (stock_total <= threshold)
    const stockAlertsRows = stockAlertsRes.rows;
    const alerts = stockAlertsRows.map((r: any, i: number) => {
      const stock = Number(r.stock_total ?? 0);
      return {
        id: r.id ?? i + 1,
        product: r.name ?? r.sku ?? `product_${r.id ?? i + 1}`,
        category: r.category ?? "Non défini",
        stock,
        // send icon name as string; client maps to component
        icon: stock === 0 ? "Laptop" : "Smartphone",
        status: stock === 0 ? "out" : "low"
      };
    });

    // sales_chart (monthly series) => transform month date to short FR label
    const salesChart = revenueSeriesRes.rows.map((r: any) => {
      const d = new Date(r.month);
      const monthLabel = d.toLocaleString("fr-FR", { month: "short" });
      const normalizedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
      return {
        month: normalizedLabel,
        sales: Math.round(Number(r.monthly_revenue ?? 0)),
        orders: Number(r.monthly_orders ?? 0)
      };
    });

    // top_products (leave as-is from DB, convert types)
    const top_products = topProductsRes.rows.map((r: any) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      qty: Number(r.qty),
      price: Number(r.price),
      value: Number(r.value)
    }));

    // stock_alerts detailed list (id,sku,name,qty)
    const stock_alerts = stockAlertsRows.map((r: any) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      qty: Number(r.stock_total ?? 0)
    }));

    const payload = {
      stats, // 4 stat cards (title, value, change, icon string, positive)
      alerts, // alerts for StockAlerts component (icon as string, status present)
      sales_chart: salesChart, // monthly chart data {month,sales,orders}
      top_products, // unchanged semantically
      stock_alerts // detailed numeric alerts
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("GET /api/dashboard/summary error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", detail: (err as any)?.message ?? String(err) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
