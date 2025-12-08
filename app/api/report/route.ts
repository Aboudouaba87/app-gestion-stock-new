export const dynamic = "force-dynamic";

// app/api/dashboard/overview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Period = "week" | "month" | "quarter" | "year" | "custom";

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const url = new URL(req.url);
    const period = (url.searchParams.get("period") || "week") as Period;

    const dataByPeriod = {
      week: await getWeekData(client, user.company_id),
      month: await getMonthData(client, user.company_id),
      quarter: await getQuarterData(client, user.company_id),
      year: await getYearData(client, user.company_id),
      custom: await getCustomData(client, user.company_id),
    };

    const result = {
      [period]: dataByPeriod[period],
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("GET /api/dashboard/overview error:", err);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        detail: (err as any)?.message ?? String(err),
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// 🔥 CALCUL DU PROFIT - FORMULE CORRECTE
// Profit = (Montant HT) - (Coût total des produits vendus)
// Coût total = SUM(quantité × cost_price)

// SEMAINE
async function getWeekData(client: any, companyId: number) {
  const salesRes = await client.query(
    `
    SELECT 
      s.date,
      TO_CHAR(s.date, 'DD/MM') as date_formatted,
      EXTRACT(DOW FROM s.date) as day_of_week,
      COALESCE(SUM(s.amount), 0)::numeric as sales_ttc,
      COALESCE(SUM(s.amount_ht), 0)::numeric as sales_ht,
      COALESCE(SUM(s.amount_tax), 0)::numeric as sales_tax,
      COUNT(s.id)::int as orders,
      COALESCE(SUM(
        s.amount_ht - (sp.quantity * COALESCE(p.cost_price, 0))
      ), 0)::numeric as profit
    FROM sales s
    LEFT JOIN sale_products sp ON s.id = sp.sale_id
    LEFT JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '6 days'
      AND s.company_id = $1
    GROUP BY s.date
    ORDER BY s.date
    `,
    [companyId]
  );

  const kpisRes = await client.query(
    `
    SELECT 
      COALESCE(SUM(s.amount), 0)::numeric as revenue_ttc,
      COALESCE(SUM(s.amount_ht), 0)::numeric as revenue_ht,
      COALESCE(SUM(s.amount_tax), 0)::numeric as total_tax,
      COALESCE(SUM(
        s.amount_ht - (sp.quantity * COALESCE(p.cost_price, 0))
      ), 0)::numeric as total_profit,
      COUNT(s.id)::int as orders,
      COUNT(DISTINCT s.client_id)::int as clients,
      (
        SELECT COUNT(*)::int 
        FROM product_warehouses pw 
        WHERE pw.stock = 0
          AND pw.company_id = $1
      ) as stockout_count,
      (
        SELECT COUNT(*)::int 
        FROM products p
        WHERE p.company_id = $1
      ) as total_products
    FROM sales s
    LEFT JOIN sale_products sp ON s.id = sp.sale_id
    LEFT JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '7 days'
      AND s.company_id = $1
    `,
    [companyId]
  );

  const categoriesRes = await client.query(
    `
    SELECT 
      p.category as name,
      COUNT(sp.id)::int as count,
      SUM(sp.quantity * sp.price)::numeric as sales_value_ttc,
      SUM(sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18)))::numeric as sales_value_ht,
      SUM(
        (sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18))) 
        - (sp.quantity * COALESCE(p.cost_price, 0))
      )::numeric as profit_value,
      ROUND(
        (COUNT(sp.id) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM sale_products sp2 
           JOIN sales s2 ON sp2.sale_id = s2.id 
           JOIN products p2 ON LOWER(p2.name) = LOWER(sp2.name)
           WHERE s2.date >= CURRENT_DATE - INTERVAL '7 days'
             AND s2.company_id = $1
             AND p2.company_id = $1), 0
        ))
      )::int as percentage
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '7 days'
      AND s.company_id = $1
      AND p.company_id = $1
    GROUP BY p.category
    ORDER BY sales_value_ttc DESC
    LIMIT 4
    `,
    [companyId]
  );

  const topProductsRes = await client.query(
    `
    SELECT 
      sp.name,
      SUM(sp.quantity)::int as sales_count,
      SUM(sp.quantity * sp.price)::numeric as revenue_ttc,
      SUM(sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18)))::numeric as revenue_ht,
      SUM(
        (sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18))) 
        - (sp.quantity * COALESCE(p.cost_price, 0))
      )::numeric as profit
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '7 days'
      AND s.company_id = $1
    GROUP BY sp.name
    ORDER BY revenue_ttc DESC
    LIMIT 7
    `,
    [companyId]
  );

  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const salesData: any[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    const dayOfWeek = date.getDay();

    const dayData = salesRes.rows.find((row: any) => {
      const rowDate = new Date(row.date);
      return rowDate.toDateString() === date.toDateString();
    });

    salesData.push({
      month: dayNames[dayOfWeek],
      sales: dayData ? Math.round(Number(dayData.sales_ttc)) : 0,
      sales_ht: dayData ? Math.round(Number(dayData.sales_ht)) : 0,
      orders: dayData ? Number(dayData.orders) : 0,
      profit: dayData ? Math.round(Number(dayData.profit)) : 0,
    });
  }

  const kpisData = kpisRes.rows[0];
  const stockoutPercentage =
    kpisData.total_products > 0
      ? (kpisData.stockout_count / kpisData.total_products * 100).toFixed(1)
      : 0;

  const kpis = {
    revenue: Math.round(Number(kpisData.revenue_ttc)), // AJOUTEZ CETTE LIGNE
    revenue_ttc: Math.round(Number(kpisData.revenue_ttc)),
    revenue_ht: Math.round(Number(kpisData.revenue_ht)),
    total_tax: Math.round(Number(kpisData.total_tax)),
    profit: Math.round(Number(kpisData.total_profit)),
    orders: Number(kpisData.orders),
    clients: Number(kpisData.clients),
    stockout: Number(stockoutPercentage),
    profitMargin: kpisData.revenue_ht > 0
      ? Math.round((kpisData.total_profit / kpisData.revenue_ht) * 100)
      : 0,
  };

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  const categories = categoriesRes.rows.map((row: any, index: number) => ({
    name: row.name,
    value: row.percentage,
    sales: Math.round(Number(row.sales_value_ttc)),
    sales_ht: Math.round(Number(row.sales_value_ht)),
    profit: Math.round(Number(row.profit_value)),
    color: colors[index] || colors[0],
  }));

  const topProducts = topProductsRes.rows.map((row: any) => ({
    name: row.name,
    sales: Number(row.sales_count),
    revenue: Math.round(Number(row.revenue_ttc)),
    revenue_ht: Math.round(Number(row.revenue_ht)),
    profit: Math.round(Number(row.profit)),
  }));

  return {
    sales: salesData,
    kpis,
    categories,
    topProducts,
  };
}

// MOIS
async function getMonthData(client: any, companyId: number) {
  const salesRes = await client.query(
    `
    SELECT 
      DATE_TRUNC('month', s.date) as month_start,
      TO_CHAR(DATE_TRUNC('month', s.date), 'Mon YYYY') as month_display,
      EXTRACT(MONTH FROM s.date) as month_num,
      EXTRACT(YEAR FROM s.date) as year_num,
      COALESCE(SUM(s.amount), 0)::numeric as sales_ttc,
      COALESCE(SUM(s.amount_ht), 0)::numeric as sales_ht,
      COUNT(s.id)::int as orders,
      COALESCE(SUM(
        s.amount_ht - (sp.quantity * COALESCE(p.cost_price, 0))
      ), 0)::numeric as profit
    FROM sales s
    LEFT JOIN sale_products sp ON s.id = sp.sale_id
    LEFT JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
      AND s.company_id = $1
    GROUP BY DATE_TRUNC('month', s.date), month_num, year_num
    ORDER BY month_start
    `,
    [companyId]
  );

  const kpisRes = await client.query(
    `
    SELECT 
      COALESCE(SUM(s.amount), 0)::numeric as revenue_ttc,
      COALESCE(SUM(s.amount_ht), 0)::numeric as revenue_ht,
      COALESCE(SUM(
        s.amount_ht - (sp.quantity * COALESCE(p.cost_price, 0))
      ), 0)::numeric as total_profit,
      COUNT(s.id)::int as orders,
      COUNT(DISTINCT s.client_id)::int as clients,
      (
        SELECT COUNT(*)::int 
        FROM product_warehouses pw 
        WHERE pw.stock = 0
          AND pw.company_id = $1
      ) as stockout_count,
      (
        SELECT COUNT(*)::int FROM products p
        WHERE p.company_id = $1
      ) as total_products
    FROM sales s
    LEFT JOIN sale_products sp ON s.id = sp.sale_id
    LEFT JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
      AND s.company_id = $1
    `,
    [companyId]
  );

  const categoriesRes = await client.query(
    `
    SELECT 
      p.category as name,
      COUNT(sp.id)::int as count,
      SUM(sp.quantity * sp.price)::numeric as sales_value_ttc,
      SUM(sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18)))::numeric as sales_value_ht,
      SUM(
        (sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18))) 
        - (sp.quantity * COALESCE(p.cost_price, 0))
      )::numeric as profit_value,
      ROUND(
        (COUNT(sp.id) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM sale_products sp2 
           JOIN sales s2 ON sp2.sale_id = s2.id 
           JOIN products p2 ON LOWER(p2.name) = LOWER(sp2.name)
           WHERE s2.date >= CURRENT_DATE - INTERVAL '30 days'
             AND s2.company_id = $1
             AND p2.company_id = $1), 0
        ))
      )::int as percentage
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
      AND s.company_id = $1
      AND p.company_id = $1
    GROUP BY p.category
    ORDER BY sales_value_ttc DESC
    LIMIT 4
    `,
    [companyId]
  );

  const topProductsRes = await client.query(
    `
    SELECT 
      sp.name,
      SUM(sp.quantity)::int as sales_count,
      SUM(sp.quantity * sp.price)::numeric as revenue_ttc,
      SUM(sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18)))::numeric as revenue_ht,
      SUM(
        (sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18))) 
        - (sp.quantity * COALESCE(p.cost_price, 0))
      )::numeric as profit
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
      AND s.company_id = $1
    GROUP BY sp.name
    ORDER BY revenue_ttc DESC
    LIMIT 7
    `,
    [companyId]
  );

  const monthMap: { [key: string]: string } = {
    Jan: "Jan", Feb: "Fév", Mar: "Mar", Apr: "Avr",
    May: "Mai", Jun: "Jun", Jul: "Jul", Aug: "Aoû",
    Sep: "Sep", Oct: "Oct", Nov: "Nov", Dec: "Déc",
  };

  const sales = salesRes.rows.map((row: any) => {
    const monthPart = row.month_display.split(" ")[0];
    return {
      month: monthMap[monthPart] || monthPart,
      sales: Math.round(Number(row.sales_ttc)),
      sales_ht: Math.round(Number(row.sales_ht)),
      orders: Number(row.orders),
      profit: Math.round(Number(row.profit)),
    };
  });

  const kpisData = kpisRes.rows[0];
  const stockoutPercentage =
    kpisData.total_products > 0
      ? (kpisData.stockout_count / kpisData.total_products * 100).toFixed(1)
      : 0;

  const kpis = {
    revenue: Math.round(Number(kpisData.revenue_ttc)), // AJOUTEZ CETTE LIGNE
    revenue_ttc: Math.round(Number(kpisData.revenue_ttc)),
    revenue_ht: Math.round(Number(kpisData.revenue_ht)),
    total_tax: Math.round(Number(kpisData.total_tax)),
    profit: Math.round(Number(kpisData.total_profit)),
    orders: Number(kpisData.orders),
    clients: Number(kpisData.clients),
    stockout: Number(stockoutPercentage),
    profitMargin: kpisData.revenue_ht > 0
      ? Math.round((kpisData.total_profit / kpisData.revenue_ht) * 100)
      : 0,
  };

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  const categories = categoriesRes.rows.map((row: any, index: number) => ({
    name: row.name,
    value: row.percentage,
    sales: Math.round(Number(row.sales_value_ttc)),
    sales_ht: Math.round(Number(row.sales_value_ht)),
    profit: Math.round(Number(row.profit_value)),
    color: colors[index] || colors[0],
  }));

  const topProducts = topProductsRes.rows.map((row: any) => ({
    name: row.name,
    sales: Number(row.sales_count),
    revenue: Math.round(Number(row.revenue_ttc)),
    revenue_ht: Math.round(Number(row.revenue_ht)),
    profit: Math.round(Number(row.profit)),
  }));

  return {
    sales,
    kpis,
    categories,
    topProducts,
  };
}

// TRIMESTRE
async function getQuarterData(client: any, companyId: number) {
  const salesRes = await client.query(
    `
    SELECT 
      EXTRACT(QUARTER FROM s.date) as quarter,
      EXTRACT(YEAR FROM s.date) as year,
      CONCAT('Q', EXTRACT(QUARTER FROM s.date), ' ', EXTRACT(YEAR FROM s.date)) as quarter_display,
      COALESCE(SUM(s.amount), 0)::numeric as sales_ttc,
      COALESCE(SUM(s.amount_ht), 0)::numeric as sales_ht,
      COUNT(s.id)::int as orders,
      COALESCE(SUM(
        s.amount_ht - (sp.quantity * COALESCE(p.cost_price, 0))
      ), 0)::numeric as profit
    FROM sales s
    LEFT JOIN sale_products sp ON s.id = sp.sale_id
    LEFT JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= DATE_TRUNC('quarter', CURRENT_DATE) - INTERVAL '1 year'
      AND s.company_id = $1
    GROUP BY EXTRACT(QUARTER FROM s.date), EXTRACT(YEAR FROM s.date)
    ORDER BY year, quarter
    `,
    [companyId]
  );

  const kpisRes = await client.query(
    `
    SELECT 
      COALESCE(SUM(s.amount), 0)::numeric as revenue_ttc,
      COALESCE(SUM(s.amount_ht), 0)::numeric as revenue_ht,
      COALESCE(SUM(
        s.amount_ht - (sp.quantity * COALESCE(p.cost_price, 0))
      ), 0)::numeric as total_profit,
      COUNT(s.id)::int as orders,
      COUNT(DISTINCT s.client_id)::int as clients,
      (
        SELECT COUNT(*)::int 
        FROM product_warehouses pw 
        WHERE pw.stock = 0
          AND pw.company_id = $1
      ) as stockout_count,
      (
        SELECT COUNT(*)::int FROM products p
        WHERE p.company_id = $1
      ) as total_products
    FROM sales s
    LEFT JOIN sale_products sp ON s.id = sp.sale_id
    LEFT JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= DATE_TRUNC('quarter', CURRENT_DATE)
      AND s.company_id = $1
    `,
    [companyId]
  );

  const categoriesRes = await client.query(
    `
    SELECT 
      p.category as name,
      COUNT(sp.id)::int as count,
      SUM(sp.quantity * sp.price)::numeric as sales_value_ttc,
      SUM(sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18)))::numeric as sales_value_ht,
      SUM(
        (sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18))) 
        - (sp.quantity * COALESCE(p.cost_price, 0))
      )::numeric as profit_value,
      ROUND(
        (COUNT(sp.id) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM sale_products sp2 
           JOIN sales s2 ON sp2.sale_id = s2.id 
           JOIN products p2 ON LOWER(p2.name) = LOWER(sp2.name)
           WHERE s2.date >= DATE_TRUNC('quarter', CURRENT_DATE)
             AND s2.company_id = $1
             AND p2.company_id = $1), 0
        ))
      )::int as percentage
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= DATE_TRUNC('quarter', CURRENT_DATE)
      AND s.company_id = $1
      AND p.company_id = $1
    GROUP BY p.category
    ORDER BY sales_value_ttc DESC
    LIMIT 4
    `,
    [companyId]
  );

  const topProductsRes = await client.query(
    `
    SELECT 
      sp.name,
      SUM(sp.quantity)::int as sales_count,
      SUM(sp.quantity * sp.price)::numeric as revenue_ttc,
      SUM(sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18)))::numeric as revenue_ht,
      SUM(
        (sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18))) 
        - (sp.quantity * COALESCE(p.cost_price, 0))
      )::numeric as profit
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= DATE_TRUNC('quarter', CURRENT_DATE)
      AND s.company_id = $1
    GROUP BY sp.name
    ORDER BY revenue_ttc DESC
    LIMIT 7
    `,
    [companyId]
  );

  const kpisData = kpisRes.rows[0];
  const stockoutPercentage =
    kpisData.total_products > 0
      ? (kpisData.stockout_count / kpisData.total_products * 100).toFixed(1)
      : 0;

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return {
    sales: salesRes.rows.map((row: any) => ({
      month: `Q${row.quarter}`,
      sales: Math.round(Number(row.sales_ttc)),
      sales_ht: Math.round(Number(row.sales_ht)),
      orders: Number(row.orders),
      profit: Math.round(Number(row.profit)),
    })),
    kpis: {
      revenue_ttc: Math.round(Number(kpisData.revenue_ttc)),
      revenue_ht: Math.round(Number(kpisData.revenue_ht)),
      profit: Math.round(Number(kpisData.total_profit)),
      orders: Number(kpisData.orders),
      clients: Number(kpisData.clients),
      stockout: Number(stockoutPercentage),
      profitMargin: kpisData.revenue_ht > 0
        ? Math.round((kpisData.total_profit / kpisData.revenue_ht) * 100)
        : 0,
    },
    categories: categoriesRes.rows.map((row: any, index: number) => ({
      name: row.name,
      value: row.percentage,
      sales: Math.round(Number(row.sales_value_ttc)),
      sales_ht: Math.round(Number(row.sales_value_ht)),
      profit: Math.round(Number(row.profit_value)),
      color: colors[index] || colors[0],
    })),
    topProducts: topProductsRes.rows.map((row: any) => ({
      name: row.name,
      sales: Number(row.sales_count),
      revenue: Math.round(Number(row.revenue_ttc)),
      revenue_ht: Math.round(Number(row.revenue_ht)),
      profit: Math.round(Number(row.profit)),
    })),
  };
}

// ANNEE
async function getYearData(client: any, companyId: number) {
  const salesRes = await client.query(
    `
    SELECT 
      EXTRACT(YEAR FROM s.date) as year,
      COALESCE(SUM(s.amount), 0)::numeric as sales_ttc,
      COALESCE(SUM(s.amount_ht), 0)::numeric as sales_ht,
      COUNT(s.id)::int as orders,
      COALESCE(SUM(
        s.amount_ht - (sp.quantity * COALESCE(p.cost_price, 0))
      ), 0)::numeric as profit
    FROM sales s
    LEFT JOIN sale_products sp ON s.id = sp.sale_id
    LEFT JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '3 years'
      AND s.company_id = $1
    GROUP BY EXTRACT(YEAR FROM s.date)
    ORDER BY year
    `,
    [companyId]
  );

  const kpisRes = await client.query(
    `
    SELECT 
      COALESCE(SUM(s.amount), 0)::numeric as revenue_ttc,
      COALESCE(SUM(s.amount_ht), 0)::numeric as revenue_ht,
      COALESCE(SUM(
        s.amount_ht - (sp.quantity * COALESCE(p.cost_price, 0))
      ), 0)::numeric as total_profit,
      COUNT(s.id)::int as orders,
      COUNT(DISTINCT s.client_id)::int as clients,
      (
        SELECT COUNT(*)::int 
        FROM product_warehouses pw 
        WHERE pw.stock = 0
          AND pw.company_id = $1
      ) as stockout_count,
      (
        SELECT COUNT(*)::int FROM products p
        WHERE p.company_id = $1
      ) as total_products
    FROM sales s
    LEFT JOIN sale_products sp ON s.id = sp.sale_id
    LEFT JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= DATE_TRUNC('year', CURRENT_DATE)
      AND s.company_id = $1
    `,
    [companyId]
  );

  const categoriesRes = await client.query(
    `
    SELECT 
      p.category as name,
      COUNT(sp.id)::int as count,
      SUM(sp.quantity * sp.price)::numeric as sales_value_ttc,
      SUM(sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18)))::numeric as sales_value_ht,
      SUM(
        (sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18))) 
        - (sp.quantity * COALESCE(p.cost_price, 0))
      )::numeric as profit_value,
      ROUND(
        (COUNT(sp.id) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM sale_products sp2 
           JOIN sales s2 ON sp2.sale_id = s2.id 
           JOIN products p2 ON LOWER(p2.name) = LOWER(sp2.name)
           WHERE s2.date >= DATE_TRUNC('year', CURRENT_DATE)
             AND s2.company_id = $1
             AND p2.company_id = $1), 0
        ))
      )::int as percentage
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= DATE_TRUNC('year', CURRENT_DATE)
      AND s.company_id = $1
      AND p.company_id = $1
    GROUP BY p.category
    ORDER BY sales_value_ttc DESC
    LIMIT 4
    `,
    [companyId]
  );

  const topProductsRes = await client.query(
    `
    SELECT 
      sp.name,
      SUM(sp.quantity)::int as sales_count,
      SUM(sp.quantity * sp.price)::numeric as revenue_ttc,
      SUM(sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18)))::numeric as revenue_ht,
      SUM(
        (sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18))) 
        - (sp.quantity * COALESCE(p.cost_price, 0))
      )::numeric as profit
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= DATE_TRUNC('year', CURRENT_DATE)
      AND s.company_id = $1
    GROUP BY sp.name
    ORDER BY revenue_ttc DESC
    LIMIT 7
    `,
    [companyId]
  );

  const kpisData = kpisRes.rows[0];
  const stockoutPercentage =
    kpisData.total_products > 0
      ? (kpisData.stockout_count / kpisData.total_products * 100).toFixed(1)
      : 0;

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return {
    sales: salesRes.rows.map((row: any) => ({
      month: row.year.toString(),
      sales: Math.round(Number(row.sales_ttc)),
      sales_ht: Math.round(Number(row.sales_ht)),
      orders: Number(row.orders),
      profit: Math.round(Number(row.profit)),
    })),
    kpis: {
      revenue_ttc: Math.round(Number(kpisData.revenue_ttc)),
      revenue_ht: Math.round(Number(kpisData.revenue_ht)),
      profit: Math.round(Number(kpisData.total_profit)),
      orders: Number(kpisData.orders),
      clients: Number(kpisData.clients),
      stockout: Number(stockoutPercentage),
      profitMargin: kpisData.revenue_ht > 0
        ? Math.round((kpisData.total_profit / kpisData.revenue_ht) * 100)
        : 0,
    },
    categories: categoriesRes.rows.map((row: any, index: number) => ({
      name: row.name,
      value: row.percentage,
      sales: Math.round(Number(row.sales_value_ttc)),
      sales_ht: Math.round(Number(row.sales_value_ht)),
      profit: Math.round(Number(row.profit_value)),
      color: colors[index] || colors[0],
    })),
    topProducts: topProductsRes.rows.map((row: any) => ({
      name: row.name,
      sales: Number(row.sales_count),
      revenue: Math.round(Number(row.revenue_ttc)),
      revenue_ht: Math.round(Number(row.revenue_ht)),
      profit: Math.round(Number(row.profit)),
    })),
  };
}

// PERSONNALISÉ (30 derniers jours)
async function getCustomData(client: any, companyId: number) {
  const salesRes = await client.query(
    `
    SELECT 
      DATE_TRUNC('day', s.date) as day,
      TO_CHAR(DATE_TRUNC('day', s.date), 'DD/MM') as day_display,
      COALESCE(SUM(s.amount), 0)::numeric as sales_ttc,
      COALESCE(SUM(s.amount_ht), 0)::numeric as sales_ht,
      COUNT(s.id)::int as orders,
      COALESCE(SUM(
        s.amount_ht - (sp.quantity * COALESCE(p.cost_price, 0))
      ), 0)::numeric as profit
    FROM sales s
    LEFT JOIN sale_products sp ON s.id = sp.sale_id
    LEFT JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '29 days'
      AND s.company_id = $1
    GROUP BY DATE_TRUNC('day', s.date)
    ORDER BY day
    LIMIT 30
    `,
    [companyId]
  );

  const kpisRes = await client.query(
    `
    SELECT 
      COALESCE(SUM(s.amount), 0)::numeric as revenue_ttc,
      COALESCE(SUM(s.amount_ht), 0)::numeric as revenue_ht,
      COALESCE(SUM(
        s.amount_ht - (sp.quantity * COALESCE(p.cost_price, 0))
      ), 0)::numeric as total_profit,
      COUNT(s.id)::int as orders,
      COUNT(DISTINCT s.client_id)::int as clients,
      (
        SELECT COUNT(*)::int 
        FROM product_warehouses pw 
        WHERE pw.stock = 0
          AND pw.company_id = $1
      ) as stockout_count,
      (
        SELECT COUNT(*)::int FROM products p
        WHERE p.company_id = $1
      ) as total_products
    FROM sales s
    LEFT JOIN sale_products sp ON s.id = sp.sale_id
    LEFT JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
      AND s.company_id = $1
    `,
    [companyId]
  );

  const categoriesRes = await client.query(
    `
    SELECT 
      p.category as name,
      COUNT(sp.id)::int as count,
      SUM(sp.quantity * sp.price)::numeric as sales_value_ttc,
      SUM(sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18)))::numeric as sales_value_ht,
      SUM(
        (sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18))) 
        - (sp.quantity * COALESCE(p.cost_price, 0))
      )::numeric as profit_value,
      ROUND(
        (COUNT(sp.id) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM sale_products sp2 
           JOIN sales s2 ON sp2.sale_id = s2.id 
           JOIN products p2 ON LOWER(p2.name) = LOWER(sp2.name)
           WHERE s2.date >= CURRENT_DATE - INTERVAL '30 days'
             AND s2.company_id = $1
             AND p2.company_id = $1), 0
        ))
      )::int as percentage
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
      AND s.company_id = $1
      AND p.company_id = $1
    GROUP BY p.category
    ORDER BY sales_value_ttc DESC
    LIMIT 4
    `,
    [companyId]
  );

  const topProductsRes = await client.query(
    `
    SELECT 
      sp.name,
      SUM(sp.quantity)::int as sales_count,
      SUM(sp.quantity * sp.price)::numeric as revenue_ttc,
      SUM(sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18)))::numeric as revenue_ht,
      SUM(
        (sp.quantity * sp.price * COALESCE(s.tax_rate, 18) / (100 + COALESCE(s.tax_rate, 18))) 
        - (sp.quantity * COALESCE(p.cost_price, 0))
      )::numeric as profit
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
      AND s.company_id = $1
    GROUP BY sp.name
    ORDER BY revenue_ttc DESC
    LIMIT 7
    `,
    [companyId]
  );

  const kpisData = kpisRes.rows[0];
  const stockoutPercentage =
    kpisData.total_products > 0
      ? (kpisData.stockout_count / kpisData.total_products * 100).toFixed(1)
      : 0;

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return {
    sales: salesRes.rows.map((row: any, index: number) => ({
      month: `Période ${index + 1}`,
      sales: Math.round(Number(row.sales_ttc)),
      sales_ht: Math.round(Number(row.sales_ht)),
      orders: Number(row.orders),
      profit: Math.round(Number(row.profit)),
    })),
    kpis: {
      revenue_ttc: Math.round(Number(kpisData.revenue_ttc)),
      revenue_ht: Math.round(Number(kpisData.revenue_ht)),
      profit: Math.round(Number(kpisData.total_profit)),
      orders: Number(kpisData.orders),
      clients: Number(kpisData.clients),
      stockout: Number(stockoutPercentage),
      profitMargin: kpisData.revenue_ht > 0
        ? Math.round((kpisData.total_profit / kpisData.revenue_ht) * 100)
        : 0,
    },
    categories: categoriesRes.rows.map((row: any, index: number) => ({
      name: row.name,
      value: row.percentage,
      sales: Math.round(Number(row.sales_value_ttc)),
      sales_ht: Math.round(Number(row.sales_value_ht)),
      profit: Math.round(Number(row.profit_value)),
      color: colors[index] || colors[0],
    })),
    topProducts: topProductsRes.rows.map((row: any) => ({
      name: row.name,
      sales: Number(row.sales_count),
      revenue: Math.round(Number(row.revenue_ttc)),
      revenue_ht: Math.round(Number(row.revenue_ht)),
      profit: Math.round(Number(row.profit)),
    })),
  };
}