export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const userCompanyId = session.user.company_id;

    console.log("📊 Dashboard API - User:", {
      id: userId,
      role: userRole,
      company_id: userCompanyId,
    });

    const url = new URL(request.url);
    const days = Number(url.searchParams.get("days") || 30);

    // ========== 1. STATISTIQUES ==========
    const statsPromises: Promise<any>[] = [];

    // 1) Total produits
    statsPromises.push(
      pool.query(
        "SELECT COUNT(*) AS count FROM products WHERE company_id = $1",
        [userCompanyId]
      )
    );

    // 2) Total ventes (admin = tout, sinon par user)
    if (userRole === "admin") {
      statsPromises.push(
        pool.query(
          "SELECT COUNT(*) AS count FROM sales WHERE company_id = $1",
          [userCompanyId]
        )
      );
    } else {
      statsPromises.push(
        pool.query(
          "SELECT COUNT(*) AS count FROM sales WHERE company_id = $1 AND user_id = $2",
          [userCompanyId, userId]
        )
      );
    }

    // 3) Total clients
    statsPromises.push(
      pool.query(
        "SELECT COUNT(*) AS count FROM clients WHERE company_id = $1",
        [userCompanyId]
      )
    );

    // 4) Nombre de produits en rupture (compteur global)
    statsPromises.push(
      pool.query(
        `
        SELECT COUNT(*) AS count
        FROM products p
        WHERE p.company_id = $1
          AND p.id IN (
            SELECT pw.product_id
            FROM product_warehouses pw
            WHERE pw.company_id = $1
              AND pw.stock <= 10
          )
      `,
        [userCompanyId]
      )
    );

    // 5) Chiffre d'affaires total
    if (userRole === "admin") {
      statsPromises.push(
        pool.query(
          "SELECT COALESCE(SUM(amount), 0) AS revenue FROM sales WHERE company_id = $1",
          [userCompanyId]
        )
      );
    } else {
      statsPromises.push(
        pool.query(
          "SELECT COALESCE(SUM(amount), 0) AS revenue FROM sales WHERE company_id = $1 AND user_id = $2",
          [userCompanyId, userId]
        )
      );
    }

    const [
      productsResult,
      salesResult,
      clientsResult,
      stockAlertsCountResult,
      revenueResult,
    ] = await Promise.all(statsPromises);

    const stats = {
      totalProducts: Number(productsResult.rows[0]?.count) || 0,
      totalSales: Number(salesResult.rows[0]?.count) || 0,
      totalClients: Number(clientsResult.rows[0]?.count) || 0,
      lowStockProducts: Number(stockAlertsCountResult.rows[0]?.count) || 0,
      totalRevenue: Number(revenueResult.rows[0]?.revenue) || 0,
      userRole,
      userCompanyId,
    };

    console.log("✅ Statistiques calculées:", stats);

    // ========== 2. DONNÉES SUPPLÉMENTAIRES ==========

    let recentSales: any[] = [];
    let salesChart: any[] = [];
    let topProducts: any[] = [];
    let stockAlerts: any[] = [];

    try {
      // --- Ventes récentes (10 dernières) ---
      if (userRole === "admin") {
        const recentSalesResult = await pool.query(
          `
          SELECT
            s.id,
            s.date,
            s.amount,
            s.status,
            c.name AS client_name
          FROM sales s
          LEFT JOIN clients c ON s.client_id = c.id
          WHERE s.company_id = $1
          ORDER BY s.date DESC
          LIMIT 10
        `,
          [userCompanyId]
        );
        recentSales = recentSalesResult.rows;
      } else {
        const recentSalesResult = await pool.query(
          `
          SELECT
            s.id,
            s.date,
            s.amount,
            s.status,
            c.name AS client_name
          FROM sales s
          LEFT JOIN clients c ON s.client_id = c.id
          WHERE s.company_id = $1
            AND s.user_id = $2
          ORDER BY s.date DESC
          LIMIT 10
        `,
          [userCompanyId, userId]
        );
        recentSales = recentSalesResult.rows;
      }

      // --- Graphique des ventes (X derniers jours) ---
      if (userRole === "admin") {
        const salesChartResult = await pool.query(
          `
          SELECT
            DATE_TRUNC('day', s.date) AS date,
            COUNT(*) AS sales_count,
            SUM(s.amount) AS total_amount
          FROM sales s
          WHERE s.company_id = $1
            AND s.date >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE_TRUNC('day', s.date)
          ORDER BY date
        `,
          [userCompanyId]
        );
        salesChart = salesChartResult.rows;
      } else {
        const salesChartResult = await pool.query(
          `
          SELECT
            DATE_TRUNC('day', s.date) AS date,
            COUNT(*) AS sales_count,
            SUM(s.amount) AS total_amount
          FROM sales s
          WHERE s.company_id = $1
            AND s.user_id = $2
            AND s.date >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY DATE_TRUNC('day', s.date)
          ORDER BY date
        `,
          [userCompanyId, userId]
        );
        salesChart = salesChartResult.rows;
      }

      // --- Top produits (30 derniers jours) ---
      if (userRole === "admin") {
        const topProductsResult = await pool.query(
          `
          SELECT
            sp.name,
            SUM(sp.quantity) AS total_quantity,
            SUM(sp.quantity * sp.price) AS total_revenue
          FROM sale_products sp
          JOIN sales s ON sp.sale_id = s.id
          WHERE s.company_id = $1
            AND s.date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY sp.name
          ORDER BY total_quantity DESC
          LIMIT 5
        `,
          [userCompanyId]
        );
        topProducts = topProductsResult.rows;
      } else {
        const topProductsResult = await pool.query(
          `
          SELECT
            sp.name,
            SUM(sp.quantity) AS total_quantity,
            SUM(sp.quantity * sp.price) AS total_revenue
          FROM sale_products sp
          JOIN sales s ON sp.sale_id = s.id
          WHERE s.company_id = $1
            AND s.user_id = $2
            AND s.date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY sp.name
          ORDER BY total_quantity DESC
          LIMIT 5
        `,
          [userCompanyId, userId]
        );
        topProducts = topProductsResult.rows;
      }

      // --- Alertes de stock détaillées (format pour ta carte) ---
      const lowStockResult = await pool.query(
        `
        SELECT
          p.id,
          p.name,
          p.category,
          pw.stock
        FROM product_warehouses pw
        JOIN products p ON p.id = pw.product_id
        WHERE pw.company_id = $1
          AND pw.stock <= 10        -- seuil d'alerte (0 = rupture, 1-5 = bas stock)
        ORDER BY pw.stock ASC, p.name ASC
      `,
        [userCompanyId]
      );

      stockAlerts = lowStockResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        stock: Number(row.stock),
      }));

      console.log("📈 Données supplémentaires chargées:", {
        recentSales: recentSales.length,
        salesChart: salesChart.length,
        topProducts: topProducts.length,
        stockAlerts: stockAlerts.length,
      });
    } catch (supplementaryError: any) {
      console.log(
        "⚠️ Erreur sur données supplémentaires (non bloquante):",
        supplementaryError.message
      );
    }

    // ========== 3. PAYLOAD FINAL ==========

    const payload = {
      stats,
      recent_sales: recentSales,
      sales_chart: salesChart,
      top_products: topProducts,
      stock_alerts: stockAlerts, // utilisé par StockAlertsWithPagination
      user_info: {
        name: session.user.name,
        email: session.user.email,
        role: userRole,
        company_id: userCompanyId,
      },
    };

    console.log("✅ Réponse API prête");
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("❌ Erreur API dashboard:", error.message);
    console.error("Stack:", error.stack);

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const fallbackPayload = {
      stats: {
        totalProducts: 0,
        totalSales: 0,
        totalClients: 0,
        lowStockProducts: 0,
        totalRevenue: 0,
        userRole: session.user.role,
        userCompanyId: session.user.company_id,
      },
      recent_sales: [],
      sales_chart: [],
      top_products: [],
      stock_alerts: [],
      user_info: {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        company_id: session.user.company_id,
      },
    };

    return NextResponse.json(fallbackPayload, { status: 200 });
  }
}
