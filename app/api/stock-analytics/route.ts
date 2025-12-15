// app/api/stock-analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Optimisations finales pour l'API
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const url = new URL(req.url);
        const warehouse = url.searchParams.get('warehouse') || 'all';
        const companyId = user.company_id;

        const client = await pool.connect();

        try {
            // Récupération optimisée en une seule requête
            const stockDataRes = await client.query(
                `WITH product_stats AS (
          SELECT 
            COALESCE(category, 'Non catégorisé') as category,
            COUNT(*) as product_count,
            SUM(stock) as total_stock,
            AVG(stock) as avg_stock,
            AVG(price) as avg_price,
            SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
            SUM(CASE WHEN stock > 0 AND stock <= 3 THEN 1 ELSE 0 END) as critical,
            SUM(CASE WHEN stock > 3 AND stock <= 10 THEN 1 ELSE 0 END) as reorder
          FROM products 
          WHERE company_id = $1
          GROUP BY category
        ),
        sales_stats AS (
          SELECT COALESCE(SUM(sp.quantity), 0) as sold_last_30_days
          FROM sale_products sp
          JOIN sales s ON sp.sale_id = s.id
          WHERE s.company_id = $1 
            AND s.date >= CURRENT_DATE - INTERVAL '30 days'
        )
        SELECT 
          ps.*,
          ss.sold_last_30_days,
          (SELECT COUNT(*) FROM products WHERE company_id = $1) as total_products,
          (SELECT COALESCE(SUM(stock), 0) FROM products WHERE company_id = $1) as grand_total_stock
        FROM product_stats ps
        CROSS JOIN sales_stats ss
        ORDER BY ps.total_stock DESC`,
                [companyId]
            );

            const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

            const categories = stockDataRes.rows.map((row: any, index: number) => {
                const currentStock = Number(row.total_stock || 0);
                const avgPrice = Number(row.avg_price || 0);

                // Calcul du seuil minimum intelligent
                let minimumThreshold;
                if (avgPrice > 500000) {
                    minimumThreshold = Math.max(1, Math.round(currentStock * 0.3));
                } else if (avgPrice > 100000) {
                    minimumThreshold = Math.max(2, Math.round(currentStock * 0.5));
                } else {
                    minimumThreshold = Math.max(5, Math.round(currentStock * 0.7));
                }

                return {
                    name: row.category,
                    currentStock: currentStock,
                    minimumThreshold: minimumThreshold,
                    color: colors[index] || colors[0],
                    productCount: Number(row.product_count || 0),
                    avgPrice: avgPrice
                };
            });

            const grandTotalStock = Number(stockDataRes.rows[0]?.grand_total_stock || 0);
            const totalProducts = Number(stockDataRes.rows[0]?.total_products || 0);
            const soldLast30Days = Number(stockDataRes.rows[0]?.sold_last_30_days || 0);

            // Calculs
            const stockoutCount = stockDataRes.rows.reduce((sum: number, row: any) =>
                sum + Number(row.out_of_stock || 0), 0);
            const criticalAlerts = stockDataRes.rows.reduce((sum: number, row: any) =>
                sum + Number(row.critical || 0), 0);
            const reorderAlerts = stockDataRes.rows.reduce((sum: number, row: any) =>
                sum + Number(row.reorder || 0), 0);

            const stockoutRate = totalProducts > 0
                ? ((stockoutCount / totalProducts) * 100).toFixed(1)
                : '0.0';

            const averageStock = totalProducts > 0
                ? Math.round(grandTotalStock / totalProducts)
                : 0;

            // Taux de rotation amélioré
            let turnoverDays = 90; // Par défaut pour produits chers
            if (soldLast30Days > 0) {
                const dailySales = soldLast30Days / 30;
                turnoverDays = Math.round(grandTotalStock / Math.max(0.1, dailySales));
            }

            const result = {
                totalProducts: totalProducts,
                averageStock: averageStock,
                turnoverDays: turnoverDays,
                stockoutRate: Number(stockoutRate),
                criticalAlerts: criticalAlerts,
                reorderAlerts: reorderAlerts,
                categories: categories,
                lastUpdate: new Date().toLocaleString('fr-FR'),
                metrics: {
                    grandTotalStock: grandTotalStock,
                    soldLast30Days: soldLast30Days,
                    dailySales: soldLast30Days / 30,
                    hasStockData: grandTotalStock > 0
                }
            };

            return NextResponse.json(result, { status: 200 });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Erreur API stock-analytics:', error);
        return NextResponse.json(
            { error: 'Erreur lors de la récupération des données de stock' },
            { status: 500 }
        );
    }
}