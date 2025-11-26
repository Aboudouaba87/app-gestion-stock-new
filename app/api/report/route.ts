// app/api/dashboard/overview/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const url = new URL(req.url);
    const period = (url.searchParams.get("period") || "week") as Period;

    const dataByPeriod = {
      week: await getWeekData(client),
      month: await getMonthData(client),
      quarter: await getQuarterData(client),
      year: await getYearData(client),
      custom: await getCustomData(client)
    };

    const result = {
      [period]: dataByPeriod[period]
    };

    return NextResponse.json(result, { status: 200 });

  } catch (err) {
    console.error("GET /api/dashboard/overview error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", detail: (err as any)?.message ?? String(err) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

async function getWeekData(client: any) {
  // Ventes des 7 derniers jours dans l'ordre chronologique
  const salesRes = await client.query(`
    SELECT 
      s.date,
      TO_CHAR(s.date, 'DD/MM') as date_formatted,
      EXTRACT(DOW FROM s.date) as day_of_week,
      COALESCE(SUM(s.amount), 0)::numeric as sales,
      COUNT(s.id)::int as orders,
      COALESCE(SUM(s.amount) * 0.3, 0)::numeric as profit
    FROM sales s
    WHERE s.date >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY s.date
    ORDER BY s.date
  `);

  // KPIs de la semaine
  const kpisRes = await client.query(`
    SELECT 
      COALESCE(SUM(s.amount), 0)::numeric as revenue,
      COUNT(s.id)::int as orders,
      COUNT(DISTINCT s.client_id)::int as clients,
      (
        SELECT COUNT(*)::int 
        FROM product_warehouses pw 
        WHERE pw.stock = 0
      ) as stockout_count,
      (
        SELECT COUNT(*)::int FROM products
      ) as total_products
    FROM sales s
    WHERE s.date >= CURRENT_DATE - INTERVAL '7 days'
  `);

  // Catégories de la semaine
  const categoriesRes = await client.query(`
    SELECT 
      p.category as name,
      COUNT(sp.id)::int as count,
      SUM(sp.quantity * sp.price)::numeric as sales_value,
      ROUND(
        (COUNT(sp.id) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM sale_products sp2 
           JOIN sales s2 ON sp2.sale_id = s2.id 
           WHERE s2.date >= CURRENT_DATE - INTERVAL '7 days'), 0
        ))
      )::int as percentage
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY p.category
    ORDER BY sales_value DESC
    LIMIT 4
  `);

  // Top produits de la semaine
  const topProductsRes = await client.query(`
    SELECT 
      sp.name,
      SUM(sp.quantity)::int as sales_count,
      SUM(sp.quantity * sp.price)::numeric as revenue
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    WHERE s.date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY sp.name
    ORDER BY revenue DESC
    LIMIT 7
  `);

  // Formater les données pour la semaine avec les bons jours
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  // Créer un tableau pour les 7 derniers jours
  const salesData = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    const dayOfWeek = date.getDay(); // 0=dimanche, 1=lundi, etc.

    // Trouver les données correspondantes
    const dayData = salesRes.rows.find((row: any) => {
      const rowDate = new Date(row.date);
      return rowDate.toDateString() === date.toDateString();
    });

    salesData.push({
      month: dayNames[dayOfWeek],
      sales: dayData ? Math.round(Number(dayData.sales)) : 0,
      orders: dayData ? Number(dayData.orders) : 0,
      profit: dayData ? Math.round(Number(dayData.profit)) : 0
    });
  }

  const kpisData = kpisRes.rows[0];
  const stockoutPercentage = kpisData.total_products > 0
    ? (kpisData.stockout_count / kpisData.total_products * 100).toFixed(1)
    : 0;

  const kpis = {
    revenue: Math.round(Number(kpisData.revenue)),
    orders: Number(kpisData.orders),
    clients: Number(kpisData.clients),
    stockout: Number(stockoutPercentage)
  };

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
  const categories = categoriesRes.rows.map((row: any, index: number) => ({
    name: row.name,
    value: row.percentage,
    sales: Math.round(Number(row.sales_value)),
    color: colors[index] || colors[0]
  }));

  const topProducts = topProductsRes.rows.map((row: any) => ({
    name: row.name,
    sales: Number(row.sales_count),
    revenue: Math.round(Number(row.revenue))
  }));

  return {
    sales: salesData,
    kpis,
    categories,
    topProducts
  };
}

async function getMonthData(client: any) {
  // Ventes des 12 derniers mois
  const salesRes = await client.query(`
    SELECT 
      DATE_TRUNC('month', s.date) as month_start,
      TO_CHAR(DATE_TRUNC('month', s.date), 'Mon YYYY') as month_display,
      EXTRACT(MONTH FROM s.date) as month_num,
      EXTRACT(YEAR FROM s.date) as year_num,
      COALESCE(SUM(s.amount), 0)::numeric as sales,
      COUNT(s.id)::int as orders,
      COALESCE(SUM(s.amount) * 0.3, 0)::numeric as profit
    FROM sales s
    WHERE s.date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
    GROUP BY DATE_TRUNC('month', s.date), month_num, year_num
    ORDER BY month_start
  `);

  // KPIs des 30 derniers jours
  const kpisRes = await client.query(`
    SELECT 
      COALESCE(SUM(s.amount), 0)::numeric as revenue,
      COUNT(s.id)::int as orders,
      COUNT(DISTINCT s.client_id)::int as clients,
      (
        SELECT COUNT(*)::int 
        FROM product_warehouses pw 
        WHERE pw.stock = 0
      ) as stockout_count,
      (
        SELECT COUNT(*)::int FROM products
      ) as total_products
    FROM sales s
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
  `);

  // Catégories des 30 derniers jours
  const categoriesRes = await client.query(`
    SELECT 
      p.category as name,
      COUNT(sp.id)::int as count,
      SUM(sp.quantity * sp.price)::numeric as sales_value,
      ROUND(
        (COUNT(sp.id) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM sale_products sp2 
           JOIN sales s2 ON sp2.sale_id = s2.id 
           WHERE s2.date >= CURRENT_DATE - INTERVAL '30 days'), 0
        ))
      )::int as percentage
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY p.category
    ORDER BY sales_value DESC
    LIMIT 4
  `);

  // Top produits des 30 derniers jours
  const topProductsRes = await client.query(`
    SELECT 
      sp.name,
      SUM(sp.quantity)::int as sales_count,
      SUM(sp.quantity * sp.price)::numeric as revenue
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY sp.name
    ORDER BY revenue DESC
    LIMIT 7
  `);

  // Formater les données pour le mois
  const monthMap: { [key: string]: string } = {
    'Jan': 'Jan', 'Feb': 'Fév', 'Mar': 'Mar', 'Apr': 'Avr',
    'May': 'Mai', 'Jun': 'Jun', 'Jul': 'Jul', 'Aug': 'Aoû',
    'Sep': 'Sep', 'Oct': 'Oct', 'Nov': 'Nov', 'Dec': 'Déc'
  };

  const sales = salesRes.rows.map((row: any) => {
    const monthPart = row.month_display.split(' ')[0];
    return {
      month: monthMap[monthPart] || monthPart,
      sales: Math.round(Number(row.sales)),
      orders: Number(row.orders),
      profit: Math.round(Number(row.profit))
    };
  });

  const kpisData = kpisRes.rows[0];
  const stockoutPercentage = kpisData.total_products > 0
    ? (kpisData.stockout_count / kpisData.total_products * 100).toFixed(1)
    : 0;

  const kpis = {
    revenue: Math.round(Number(kpisData.revenue)),
    orders: Number(kpisData.orders),
    clients: Number(kpisData.clients),
    stockout: Number(stockoutPercentage)
  };

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
  const categories = categoriesRes.rows.map((row: any, index: number) => ({
    name: row.name,
    value: row.percentage,
    sales: Math.round(Number(row.sales_value)),
    color: colors[index] || colors[0]
  }));

  const topProducts = topProductsRes.rows.map((row: any) => ({
    name: row.name,
    sales: Number(row.sales_count),
    revenue: Math.round(Number(row.revenue))
  }));

  return {
    sales,
    kpis,
    categories,
    topProducts
  };
}

async function getQuarterData(client: any) {
  // Ventes des 4 derniers trimestres
  const salesRes = await client.query(`
    SELECT 
      EXTRACT(QUARTER FROM s.date) as quarter,
      EXTRACT(YEAR FROM s.date) as year,
      CONCAT('Q', EXTRACT(QUARTER FROM s.date), ' ', EXTRACT(YEAR FROM s.date)) as quarter_display,
      COALESCE(SUM(s.amount), 0)::numeric as sales,
      COUNT(s.id)::int as orders,
      COALESCE(SUM(s.amount) * 0.3, 0)::numeric as profit
    FROM sales s
    WHERE s.date >= DATE_TRUNC('quarter', CURRENT_DATE) - INTERVAL '1 year'
    GROUP BY EXTRACT(QUARTER FROM s.date), EXTRACT(YEAR FROM s.date)
    ORDER BY year, quarter
  `);

  // KPIs du trimestre en cours
  const kpisRes = await client.query(`
    SELECT 
      COALESCE(SUM(s.amount), 0)::numeric as revenue,
      COUNT(s.id)::int as orders,
      COUNT(DISTINCT s.client_id)::int as clients,
      (
        SELECT COUNT(*)::int 
        FROM product_warehouses pw 
        WHERE pw.stock = 0
      ) as stockout_count,
      (
        SELECT COUNT(*)::int FROM products
      ) as total_products
    FROM sales s
    WHERE s.date >= DATE_TRUNC('quarter', CURRENT_DATE)
  `);

  // Catégories du trimestre en cours
  const categoriesRes = await client.query(`
    SELECT 
      p.category as name,
      COUNT(sp.id)::int as count,
      SUM(sp.quantity * sp.price)::numeric as sales_value,
      ROUND(
        (COUNT(sp.id) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM sale_products sp2 
           JOIN sales s2 ON sp2.sale_id = s2.id 
           WHERE s2.date >= DATE_TRUNC('quarter', CURRENT_DATE)), 0
        ))
      )::int as percentage
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= DATE_TRUNC('quarter', CURRENT_DATE)
    GROUP BY p.category
    ORDER BY sales_value DESC
    LIMIT 4
  `);

  // Top produits du trimestre en cours
  const topProductsRes = await client.query(`
    SELECT 
      sp.name,
      SUM(sp.quantity)::int as sales_count,
      SUM(sp.quantity * sp.price)::numeric as revenue
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    WHERE s.date >= DATE_TRUNC('quarter', CURRENT_DATE)
    GROUP BY sp.name
    ORDER BY revenue DESC
    LIMIT 7
  `);

  const kpisData = kpisRes.rows[0];
  const stockoutPercentage = kpisData.total_products > 0
    ? (kpisData.stockout_count / kpisData.total_products * 100).toFixed(1)
    : 0;

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return {
    sales: salesRes.rows.map((row: any) => ({
      month: `Q${row.quarter}`,
      sales: Math.round(Number(row.sales)),
      orders: Number(row.orders),
      profit: Math.round(Number(row.profit))
    })),
    kpis: {
      revenue: Math.round(Number(kpisData.revenue)),
      orders: Number(kpisData.orders),
      clients: Number(kpisData.clients),
      stockout: Number(stockoutPercentage)
    },
    categories: categoriesRes.rows.map((row: any, index: number) => ({
      name: row.name,
      value: row.percentage,
      sales: Math.round(Number(row.sales_value)),
      color: colors[index] || colors[0]
    })),
    topProducts: topProductsRes.rows.map((row: any) => ({
      name: row.name,
      sales: Number(row.sales_count),
      revenue: Math.round(Number(row.revenue))
    }))
  };
}

async function getYearData(client: any) {
  // Ventes des 4 dernières années
  const salesRes = await client.query(`
    SELECT 
      EXTRACT(YEAR FROM s.date) as year,
      COALESCE(SUM(s.amount), 0)::numeric as sales,
      COUNT(s.id)::int as orders,
      COALESCE(SUM(s.amount) * 0.3, 0)::numeric as profit
    FROM sales s
    WHERE s.date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '3 years'
    GROUP BY EXTRACT(YEAR FROM s.date)
    ORDER BY year
  `);

  // KPIs de l'année en cours
  const kpisRes = await client.query(`
    SELECT 
      COALESCE(SUM(s.amount), 0)::numeric as revenue,
      COUNT(s.id)::int as orders,
      COUNT(DISTINCT s.client_id)::int as clients,
      (
        SELECT COUNT(*)::int 
        FROM product_warehouses pw 
        WHERE pw.stock = 0
      ) as stockout_count,
      (
        SELECT COUNT(*)::int FROM products
      ) as total_products
    FROM sales s
    WHERE s.date >= DATE_TRUNC('year', CURRENT_DATE)
  `);

  // Catégories de l'année en cours
  const categoriesRes = await client.query(`
    SELECT 
      p.category as name,
      COUNT(sp.id)::int as count,
      SUM(sp.quantity * sp.price)::numeric as sales_value,
      ROUND(
        (COUNT(sp.id) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM sale_products sp2 
           JOIN sales s2 ON sp2.sale_id = s2.id 
           WHERE s2.date >= DATE_TRUNC('year', CURRENT_DATE)), 0
        ))
      )::int as percentage
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= DATE_TRUNC('year', CURRENT_DATE)
    GROUP BY p.category
    ORDER BY sales_value DESC
    LIMIT 4
  `);

  // Top produits de l'année en cours
  const topProductsRes = await client.query(`
    SELECT 
      sp.name,
      SUM(sp.quantity)::int as sales_count,
      SUM(sp.quantity * sp.price)::numeric as revenue
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    WHERE s.date >= DATE_TRUNC('year', CURRENT_DATE)
    GROUP BY sp.name
    ORDER BY revenue DESC
    LIMIT 7
  `);

  const kpisData = kpisRes.rows[0];
  const stockoutPercentage = kpisData.total_products > 0
    ? (kpisData.stockout_count / kpisData.total_products * 100).toFixed(1)
    : 0;

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return {
    sales: salesRes.rows.map((row: any) => ({
      month: row.year.toString(),
      sales: Math.round(Number(row.sales)),
      orders: Number(row.orders),
      profit: Math.round(Number(row.profit))
    })),
    kpis: {
      revenue: Math.round(Number(kpisData.revenue)),
      orders: Number(kpisData.orders),
      clients: Number(kpisData.clients),
      stockout: Number(stockoutPercentage)
    },
    categories: categoriesRes.rows.map((row: any, index: number) => ({
      name: row.name,
      value: row.percentage,
      sales: Math.round(Number(row.sales_value)),
      color: colors[index] || colors[0]
    })),
    topProducts: topProductsRes.rows.map((row: any) => ({
      name: row.name,
      sales: Number(row.sales_count),
      revenue: Math.round(Number(row.revenue))
    }))
  };
}

async function getCustomData(client: any) {
  // Par défaut, données des 30 derniers jours
  const salesRes = await client.query(`
    SELECT 
      DATE_TRUNC('day', s.date) as day,
      TO_CHAR(DATE_TRUNC('day', s.date), 'DD/MM') as day_display,
      COALESCE(SUM(s.amount), 0)::numeric as sales,
      COUNT(s.id)::int as orders,
      COALESCE(SUM(s.amount) * 0.3, 0)::numeric as profit
    FROM sales s
    WHERE s.date >= CURRENT_DATE - INTERVAL '29 days'
    GROUP BY DATE_TRUNC('day', s.date)
    ORDER BY day
    LIMIT 30
  `);

  // KPIs des 30 derniers jours
  const kpisRes = await client.query(`
    SELECT 
      COALESCE(SUM(s.amount), 0)::numeric as revenue,
      COUNT(s.id)::int as orders,
      COUNT(DISTINCT s.client_id)::int as clients,
      (
        SELECT COUNT(*)::int 
        FROM product_warehouses pw 
        WHERE pw.stock = 0
      ) as stockout_count,
      (
        SELECT COUNT(*)::int FROM products
      ) as total_products
    FROM sales s
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
  `);

  // Catégories des 30 derniers jours
  const categoriesRes = await client.query(`
    SELECT 
      p.category as name,
      COUNT(sp.id)::int as count,
      SUM(sp.quantity * sp.price)::numeric as sales_value,
      ROUND(
        (COUNT(sp.id) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM sale_products sp2 
           JOIN sales s2 ON sp2.sale_id = s2.id 
           WHERE s2.date >= CURRENT_DATE - INTERVAL '30 days'), 0
        ))
      )::int as percentage
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    JOIN products p ON LOWER(p.name) = LOWER(sp.name)
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY p.category
    ORDER BY sales_value DESC
    LIMIT 4
  `);

  // Top produits des 30 derniers jours
  const topProductsRes = await client.query(`
    SELECT 
      sp.name,
      SUM(sp.quantity)::int as sales_count,
      SUM(sp.quantity * sp.price)::numeric as revenue
    FROM sale_products sp
    JOIN sales s ON sp.sale_id = s.id
    WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY sp.name
    ORDER BY revenue DESC
    LIMIT 7
  `);

  const kpisData = kpisRes.rows[0];
  const stockoutPercentage = kpisData.total_products > 0
    ? (kpisData.stockout_count / kpisData.total_products * 100).toFixed(1)
    : 0;

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return {
    sales: salesRes.rows.map((row: any, index: number) => ({
      month: `Période ${index + 1}`,
      sales: Math.round(Number(row.sales)),
      orders: Number(row.orders),
      profit: Math.round(Number(row.profit))
    })),
    kpis: {
      revenue: Math.round(Number(kpisData.revenue)),
      orders: Number(kpisData.orders),
      clients: Number(kpisData.clients),
      stockout: Number(stockoutPercentage)
    },
    categories: categoriesRes.rows.map((row: any, index: number) => ({
      name: row.name,
      value: row.percentage,
      sales: Math.round(Number(row.sales_value)),
      color: colors[index] || colors[0]
    })),
    topProducts: topProductsRes.rows.map((row: any) => ({
      name: row.name,
      sales: Number(row.sales_count),
      revenue: Math.round(Number(row.revenue))
    }))
  };
}