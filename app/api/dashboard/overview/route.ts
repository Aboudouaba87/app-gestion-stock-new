export const dynamic = "force-dynamic";

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
        const warehouse = url.searchParams.get("warehouse") || "all";
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");

        console.log(
            `📊 Dashboard: ${period}, entrepôt: ${warehouse}, date début: ${startDate}, date fin: ${endDate}`
        );

        // Obtenir les données pour toutes les périodes
        const responseData = {
            week: await getDashboardData(
                client,
                user.company_id,
                warehouse,
                "week",
                startDate,
                endDate
            ),
            month: await getDashboardData(
                client,
                user.company_id,
                warehouse,
                "month",
                startDate,
                endDate
            ),
            quarter: await getDashboardData(
                client,
                user.company_id,
                warehouse,
                "quarter",
                startDate,
                endDate
            ),
            year: await getDashboardData(
                client,
                user.company_id,
                warehouse,
                "year",
                startDate,
                endDate
            ),
            custom: await getDashboardData(
                client,
                user.company_id,
                warehouse,
                "custom",
                startDate,
                endDate
            ),
        };

        console.log(`✅ API complète exécutée pour ${warehouse}`);

        return NextResponse.json(responseData, { status: 200 });
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

async function getDashboardData(
    client: any,
    companyId: number,
    warehouse: string,
    period: Period,
    startDate?: string | null,
    endDate?: string | null
) {
    console.log(`📅 Calcul données: ${period}, entrepôt: ${warehouse}`);

    if (warehouse === "all") {
        return await getAllWarehouseData(client, companyId, period, startDate, endDate);
    }

    return await getSpecificWarehouseData(client, companyId, warehouse, period, startDate, endDate);
}
async function getAllWarehouseData(
    client: any,
    companyId: number,
    period: Period,
    startDate?: string | null,
    endDate?: string | null
) {
    try {
        console.log(`📊 getAllWarehouseData - Période: ${period}, Début: ${startDate}, Fin: ${endDate}`);

        // Construire la clause WHERE en fonction de la période
        let dateCondition = "";
        let dateRangeCondition = "";

        if (period === "custom" && startDate && endDate) {
            // Période personnalisée - FORMAT CORRECT pour PostgreSQL
            const startDateFormatted = startDate.split('T')[0];
            const endDateFormatted = endDate.split('T')[0];

            dateCondition = `AND s.date >= '${startDateFormatted}'::date AND s.date <= '${endDateFormatted}'::date`;
            dateRangeCondition = `AND s.date >= '${startDateFormatted}'::date AND s.date <= '${endDateFormatted}'::date`;
        } else {
            // Périodes prédéfinies
            const daysMap = { week: 7, month: 30, quarter: 90, year: 365, custom: 7 };
            const days = daysMap[period];
            dateCondition = `AND s.date >= CURRENT_DATE - INTERVAL '${days} days'`;
            dateRangeCondition = `AND s.date >= CURRENT_DATE - INTERVAL '${days} days'`;
        }

        // 1. Ventes totales
        const totalRes = await client.query(
            `
            SELECT 
                COALESCE(SUM(s.amount), 0)::numeric as revenue_ttc,
                COALESCE(SUM(s.amount_ht), 0)::numeric as revenue_ht,
                COUNT(DISTINCT s.id) as orders,
                COUNT(DISTINCT s.client_id) as clients
            FROM sales s
            WHERE s.company_id = $1
                ${dateCondition}
            `,
            [companyId]
        );

        const total = totalRes.rows[0] || {
            revenue_ttc: 0,
            revenue_ht: 0,
            orders: 0,
            clients: 0,
        };

        console.log(`📈 Ventes totales: €${total.revenue_ttc}, Commandes: ${total.orders}`);

        // 2. Ventes par jour
        let dailyRes;
        if (period === "custom" && startDate && endDate) {
            const startDateFormatted = startDate.split('T')[0];
            const endDateFormatted = endDate.split('T')[0];
            const dailyCondition = `AND s.date >= '${startDateFormatted}'::date AND s.date <= '${endDateFormatted}'::date`;

            dailyRes = await client.query(
                `
                SELECT 
                    s.date,
                    TO_CHAR(s.date, 'DD/MM') as date_formatted,
                    EXTRACT(DOW FROM s.date) as day_of_week,
                    COALESCE(SUM(s.amount), 0)::numeric as sales_ttc,
                    COALESCE(SUM(s.amount_ht), 0)::numeric as sales_ht,
                    COUNT(DISTINCT s.id) as orders
                FROM sales s
                WHERE s.company_id = $1
                    ${dailyCondition}
                GROUP BY s.date
                ORDER BY s.date
                `,
                [companyId]
            );
        } else {
            // Pour les périodes prédéfinies
            const daysMap = { week: 7, month: 30, quarter: 90, year: 365, custom: 7 };
            const days = daysMap[period];
            const chartDays = period === "week" ? 7 :
                period === "month" ? 30 :
                    period === "quarter" ? 90 : 365;

            const dailyCondition = `AND s.date >= CURRENT_DATE - INTERVAL '${chartDays - 1} days'`;

            dailyRes = await client.query(
                `
                SELECT 
                    s.date,
                    TO_CHAR(s.date, 'DD/MM') as date_formatted,
                    EXTRACT(DOW FROM s.date) as day_of_week,
                    COALESCE(SUM(s.amount), 0)::numeric as sales_ttc,
                    COALESCE(SUM(s.amount_ht), 0)::numeric as sales_ht,
                    COUNT(DISTINCT s.id) as orders
                FROM sales s
                WHERE s.company_id = $1
                    ${dailyCondition}
                GROUP BY s.date
                ORDER BY s.date
                `,
                [companyId]
            );
        }

        console.log(`📅 Données quotidiennes trouvées: ${dailyRes.rows.length} jours`);

        // 3. Top produits
        const productsRes = await client.query(
            `
            SELECT 
                sp.name,
                SUM(sp.quantity) as total_quantity,
                SUM(sp.quantity * sp.price) as total_revenue
            FROM sale_products sp
            JOIN sales s ON sp.sale_id = s.id
            WHERE s.company_id = $1
                ${dateRangeCondition}
            GROUP BY sp.name
            ORDER BY total_revenue DESC
            LIMIT 5
            `,
            [companyId]
        );

        // 4. Catégories
        const categoriesRes = await client.query(
            `
            SELECT 
                COALESCE(p.category, 'Non catégorisé') as category,
                SUM(sp.quantity * sp.price) as revenue
            FROM sale_products sp
            JOIN sales s ON sp.sale_id = s.id
            LEFT JOIN products p ON p.name = sp.name AND p.company_id = $1
            WHERE s.company_id = $1
                ${dateRangeCondition}
            GROUP BY p.category
            ORDER BY revenue DESC
            LIMIT 4
            `,
            [companyId]
        );

        // 5. Générer les données de vente
        let salesData;
        if (period === "custom" && startDate && endDate) {
            salesData = generateCustomChartData(dailyRes.rows, startDate, endDate);
        } else {
            salesData = generateChartData(dailyRes.rows, period);
        }

        console.log(`✅ Données générées: ${salesData.length} points de données`);

        return {
            sales: salesData,
            kpis: {
                revenue: Math.round(Number(total.revenue_ttc)),
                revenue_ttc: Math.round(Number(total.revenue_ttc)),
                revenue_ht: Math.round(Number(total.revenue_ht)),
                profit: Math.round(Number(total.revenue_ht) * 0.25),
                orders: Number(total.orders),
                clients: Number(total.clients),
                stockout: 0,
            },
            categories: formatCategories(
                categoriesRes.rows,
                Number(total.revenue_ttc)
            ),
            topProducts: formatTopProducts(productsRes.rows),
        };

    } catch (error) {
        console.error("❌ Erreur getAllWarehouseData:", error);
        return createEmptyData(period);
    }
}

async function getSpecificWarehouseData(
    client: any,
    companyId: number,
    warehouseValue: string,
    period: Period,
    startDate?: string | null,
    endDate?: string | null
) {
    try {
        console.log(
            `🏭 Calcul pour entrepôt spécifique: ${warehouseValue}, période: ${period}`
        );

        // 1. Récupérer l'ID de l'entrepôt
        const warehouseRes = await client.query(
            `SELECT id, value FROM warehouses WHERE value = $1 AND company_id = $2`,
            [warehouseValue, companyId]
        );

        if (warehouseRes.rows.length === 0) {
            console.log(`⚠️ Entrepôt ${warehouseValue} non trouvé`);
            return createEmptyData(period);
        }

        const warehouseId = warehouseRes.rows[0].id;
        const warehouseName = warehouseRes.rows[0].value;

        // Construire la clause WHERE en fonction de la période
        let dateCondition = "";
        let dateRangeCondition = "";

        if (period === "custom" && startDate && endDate) {
            // Période personnalisée
            dateCondition = `AND s.date >= '${startDate.split("T")[0]
                }' AND s.date <= '${endDate.split("T")[0]}'::date + INTERVAL '1 day'`;
            dateRangeCondition = `AND s.date >= '${startDate.split("T")[0]
                }' AND s.date <= '${endDate.split("T")[0]}'::date + INTERVAL '1 day'`;
        } else {
            // Périodes prédéfinies
            const daysMap = { week: 7, month: 30, quarter: 90, year: 365, custom: 7 };
            const days = daysMap[period];
            dateCondition = `AND s.date >= CURRENT_DATE - INTERVAL '${days} days'`;
            dateRangeCondition = `AND s.date >= CURRENT_DATE - INTERVAL '${days} days'`;
        }

        // 2. Ventes pour cet entrepôt
        const totalRes = await client.query(
            `
            SELECT 
                COALESCE(SUM(s.amount), 0)::numeric as revenue_ttc,
                COALESCE(SUM(s.amount_ht), 0)::numeric as revenue_ht,
                COUNT(DISTINCT s.id) as orders,
                COUNT(DISTINCT s.client_id) as clients
            FROM sales s
            WHERE s.company_id = $1
                AND s.warehouse_id = $2
                ${dateCondition}
        `,
            [companyId, warehouseId]
        );

        const total = totalRes.rows[0] || {
            revenue_ttc: 0,
            revenue_ht: 0,
            orders: 0,
            clients: 0,
        };

        // 3. Ventes par jour
        let dailyCondition = "";
        if (period === "custom" && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffDays = Math.ceil(
                (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            );
            const intervalDays = Math.min(diffDays, 30);

            dailyCondition = `AND s.date >= '${startDate.split("T")[0]
                }' AND s.date <= '${endDate.split("T")[0]}'::date + INTERVAL '1 day'`;

            const dailyRes = await client.query(
                `
                SELECT 
                    s.date,
                    TO_CHAR(s.date, 'DD/MM') as date_formatted,
                    EXTRACT(DOW FROM s.date) as day_of_week,
                    COALESCE(SUM(s.amount), 0)::numeric as sales_ttc,
                    COALESCE(SUM(s.amount_ht), 0)::numeric as sales_ht,
                    COUNT(DISTINCT s.id) as orders
                FROM sales s
                WHERE s.company_id = $1
                    AND s.warehouse_id = $2
                    ${dailyCondition}
                GROUP BY s.date
                ORDER BY s.date
            `,
                [companyId, warehouseId]
            );

            // 4. Top produits pour cet entrepôt
            const productsRes = await client.query(
                `
                SELECT 
                    sp.name,
                    SUM(sp.quantity) as total_quantity,
                    SUM(sp.quantity * sp.price) as total_revenue
                FROM sale_products sp
                JOIN sales s ON sp.sale_id = s.id
                WHERE s.company_id = $1
                    AND s.warehouse_id = $2
                    ${dateRangeCondition}
                GROUP BY sp.name
                ORDER BY total_revenue DESC
                LIMIT 5
            `,
                [companyId, warehouseId]
            );

            // 5. Catégories pour cet entrepôt
            const categoriesRes = await client.query(
                `
                SELECT 
                    COALESCE(p.category, 'Non catégorisé') as category,
                    SUM(sp.quantity * sp.price) as revenue
                FROM sale_products sp
                JOIN sales s ON sp.sale_id = s.id
                LEFT JOIN products p ON p.name = sp.name AND p.company_id = $1
                WHERE s.company_id = $1
                    AND s.warehouse_id = $2
                    ${dateRangeCondition}
                GROUP BY p.category
                ORDER BY revenue DESC
                LIMIT 4
            `,
                [companyId, warehouseId]
            );

            // 6. Ruptures de stock
            const stockoutRes = await client.query(
                `
                SELECT COUNT(*) as count
                FROM product_warehouses pw
                WHERE pw.stock = 0 
                    AND pw.company_id = $1
                    AND pw.warehouse_id = $2
            `,
                [companyId, warehouseId]
            );

            console.log(
                `✅ ${warehouseName}: €${total.revenue_ttc || 0}, ${total.orders || 0
                } commandes`
            );

            return {
                sales: generateCustomChartData(dailyRes.rows, startDate, endDate),
                kpis: {
                    revenue: Math.round(Number(total.revenue_ttc)),
                    revenue_ttc: Math.round(Number(total.revenue_ttc)),
                    revenue_ht: Math.round(Number(total.revenue_ht)),
                    profit: Math.round(Number(total.revenue_ht) * 0.25),
                    orders: Number(total.orders),
                    clients: Number(total.clients),
                    stockout: Number(stockoutRes.rows[0]?.count || 0),
                },
                categories: formatCategories(
                    categoriesRes.rows,
                    Number(total.revenue_ttc)
                ),
                topProducts: formatTopProducts(productsRes.rows),
            };
        } else {
            // Pour les périodes prédéfinies
            const daysMap = { week: 7, month: 30, quarter: 90, year: 365, custom: 7 };
            const days = daysMap[period];
            const chartDays =
                period === "week"
                    ? 7
                    : period === "month"
                        ? 30
                        : period === "quarter"
                            ? 90
                            : 365;

            dailyCondition = `AND s.date >= CURRENT_DATE - INTERVAL '${chartDays - 1
                } days'`;

            const dailyRes = await client.query(
                `
                SELECT 
                    s.date,
                    TO_CHAR(s.date, 'DD/MM') as date_formatted,
                    EXTRACT(DOW FROM s.date) as day_of_week,
                    COALESCE(SUM(s.amount), 0)::numeric as sales_ttc,
                    COALESCE(SUM(s.amount_ht), 0)::numeric as sales_ht,
                    COUNT(DISTINCT s.id) as orders
                FROM sales s
                WHERE s.company_id = $1
                    AND s.warehouse_id = $2
                    ${dailyCondition}
                GROUP BY s.date
                ORDER BY s.date
            `,
                [companyId, warehouseId]
            );

            // 4. Top produits pour cet entrepôt
            const productsRes = await client.query(
                `
                SELECT 
                    sp.name,
                    SUM(sp.quantity) as total_quantity,
                    SUM(sp.quantity * sp.price) as total_revenue
                FROM sale_products sp
                JOIN sales s ON sp.sale_id = s.id
                WHERE s.company_id = $1
                    AND s.warehouse_id = $2
                    ${dateRangeCondition}
                GROUP BY sp.name
                ORDER BY total_revenue DESC
                LIMIT 5
            `,
                [companyId, warehouseId]
            );

            // 5. Catégories pour cet entrepôt
            const categoriesRes = await client.query(
                `
                SELECT 
                    COALESCE(p.category, 'Non catégorisé') as category,
                    SUM(sp.quantity * sp.price) as revenue
                FROM sale_products sp
                JOIN sales s ON sp.sale_id = s.id
                LEFT JOIN products p ON p.name = sp.name AND p.company_id = $1
                WHERE s.company_id = $1
                    AND s.warehouse_id = $2
                    ${dateRangeCondition}
                GROUP BY p.category
                ORDER BY revenue DESC
                LIMIT 4
            `,
                [companyId, warehouseId]
            );

            // 6. Ruptures de stock
            const stockoutRes = await client.query(
                `
                SELECT COUNT(*) as count
                FROM product_warehouses pw
                WHERE pw.stock = 0 
                    AND pw.company_id = $1
                    AND pw.warehouse_id = $2
            `,
                [companyId, warehouseId]
            );

            console.log(
                `✅ ${warehouseName}: €${total.revenue_ttc || 0}, ${total.orders || 0
                } commandes`
            );

            return {
                sales: generateChartData(dailyRes.rows, period),
                kpis: {
                    revenue: Math.round(Number(total.revenue_ttc)),
                    revenue_ttc: Math.round(Number(total.revenue_ttc)),
                    revenue_ht: Math.round(Number(total.revenue_ht)),
                    profit: Math.round(Number(total.revenue_ht) * 0.25),
                    orders: Number(total.orders),
                    clients: Number(total.clients),
                    stockout: Number(stockoutRes.rows[0]?.count || 0),
                },
                categories: formatCategories(
                    categoriesRes.rows,
                    Number(total.revenue_ttc)
                ),
                topProducts: formatTopProducts(productsRes.rows),
            };
        }
    } catch (error) {
        console.error("❌ Erreur getSpecificWarehouseData:", error);
        return createEmptyData(period);
    }
}

// Fonctions utilitaires
function generateChartData(rows: any[], period: Period) {
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const chartData: any[] = [];

    console.log(`📊 Génération chart data pour ${period}: ${rows.length} lignes`);

    if (period === "week") {
        // Générer les 7 derniers jours
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - 6 + i);
            date.setHours(0, 0, 0, 0);
            const dayOfWeek = date.getDay();

            const dayData = rows.find((row: any) => {
                if (!row.date) return false;
                const rowDate = new Date(row.date);
                rowDate.setHours(0, 0, 0, 0);
                return rowDate.getTime() === date.getTime();
            });

            const sales = dayData ? Math.round(Number(dayData.sales_ttc || 0)) : 0;
            const salesHt = dayData ? Math.round(Number(dayData.sales_ht || 0)) : Math.round(sales * 0.8);

            chartData.push({
                month: dayNames[dayOfWeek],
                sales: sales,
                sales_ht: salesHt,
                orders: dayData ? Number(dayData.orders || 0) : 0,
                profit: Math.round(salesHt * 0.25),
            });
        }
    } else if (period === "month") {
        // Générer les 30 derniers jours
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - 29 + i);
            date.setHours(0, 0, 0, 0);

            const dayData = rows.find((row: any) => {
                if (!row.date) return false;
                const rowDate = new Date(row.date);
                rowDate.setHours(0, 0, 0, 0);
                return rowDate.getTime() === date.getTime();
            });

            const sales = dayData ? Math.round(Number(dayData.sales_ttc || 0)) : 0;
            const salesHt = dayData ? Math.round(Number(dayData.sales_ht || 0)) : Math.round(sales * 0.8);

            chartData.push({
                month: `${date.getDate()}/${date.getMonth() + 1}`,
                sales: sales,
                sales_ht: salesHt,
                orders: dayData ? Number(dayData.orders || 0) : 0,
                profit: Math.round(salesHt * 0.25),
            });
        }
    } else if (period === "quarter") {
        // Générer les 3 derniers mois
        for (let i = 0; i < 3; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - 2 + i);

            const monthSales = rows
                .filter((row: any) => {
                    if (!row.date) return false;
                    const rowDate = new Date(row.date);
                    return rowDate.getMonth() === date.getMonth() && rowDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum: number, row: any) => sum + Number(row.sales_ttc || 0), 0);

            const monthOrders = rows
                .filter((row: any) => {
                    if (!row.date) return false;
                    const rowDate = new Date(row.date);
                    return rowDate.getMonth() === date.getMonth() && rowDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum: number, row: any) => sum + Number(row.orders || 0), 0);

            chartData.push({
                month: monthNames[date.getMonth()],
                sales: Math.round(monthSales),
                sales_ht: Math.round(monthSales * 0.8),
                orders: monthOrders,
                profit: Math.round(monthSales * 0.8 * 0.25),
            });
        }
    } else if (period === "year") {
        // Générer les 12 derniers mois
        for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - 11 + i);

            const monthSales = rows
                .filter((row: any) => {
                    if (!row.date) return false;
                    const rowDate = new Date(row.date);
                    return rowDate.getMonth() === date.getMonth() && rowDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum: number, row: any) => sum + Number(row.sales_ttc || 0), 0);

            const monthOrders = rows
                .filter((row: any) => {
                    if (!row.date) return false;
                    const rowDate = new Date(row.date);
                    return rowDate.getMonth() === date.getMonth() && rowDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum: number, row: any) => sum + Number(row.orders || 0), 0);

            chartData.push({
                month: monthNames[date.getMonth()],
                sales: Math.round(monthSales),
                sales_ht: Math.round(monthSales * 0.8),
                orders: monthOrders,
                profit: Math.round(monthSales * 0.8 * 0.25),
            });
        }
    }

    // GARANTIR qu'on a toujours des données
    if (chartData.length === 0) {
        console.log("⚠️ Aucune donnée générée, création de données par défaut");
        // Créer des données par défaut selon la période
        if (period === "week") {
            for (let i = 0; i < 7; i++) {
                chartData.push({
                    month: dayNames[i],
                    sales: 0,
                    sales_ht: 0,
                    orders: 0,
                    profit: 0,
                });
            }
        } else if (period === "month") {
            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - 29 + i);
                chartData.push({
                    month: `${date.getDate()}/${date.getMonth() + 1}`,
                    sales: 0,
                    sales_ht: 0,
                    orders: 0,
                    profit: 0,
                });
            }
        } else if (period === "quarter") {
            for (let i = 0; i < 3; i++) {
                chartData.push({
                    month: monthNames[i],
                    sales: 0,
                    sales_ht: 0,
                    orders: 0,
                    profit: 0,
                });
            }
        } else if (period === "year") {
            for (let i = 0; i < 12; i++) {
                chartData.push({
                    month: monthNames[i],
                    sales: 0,
                    sales_ht: 0,
                    orders: 0,
                    profit: 0,
                });
            }
        }
    }

    console.log(`✅ Chart data générée: ${chartData.length} points`);
    return chartData;
}

function generateCustomChartData(rows: any[], startDate?: string | null, endDate?: string | null) {
    if (!startDate || !endDate) {
        return generateChartData(rows, "week");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const chartData: any[] = [];

    // Si la période est de 30 jours ou moins, afficher par jour
    if (diffDays <= 30) {
        for (let i = 0; i <= diffDays; i++) {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            date.setHours(0, 0, 0, 0);

            const dayData = rows.find((row: any) => {
                if (!row.date) return false;
                const rowDate = new Date(row.date);
                rowDate.setHours(0, 0, 0, 0);
                return rowDate.getTime() === date.getTime();
            });

            const sales = dayData ? Math.round(Number(dayData.sales_ttc || 0)) : 0;
            const salesHt = dayData ? Math.round(Number(dayData.sales_ht || 0)) : Math.round(sales * 0.8);

            chartData.push({
                month: `${date.getDate()}/${date.getMonth() + 1}`,
                sales: sales,
                sales_ht: salesHt,
                orders: dayData ? Number(dayData.orders || 0) : 0,
                profit: Math.round(salesHt * 0.25),
            });
        }
    } else {
        // Si plus de 30 jours, regrouper par semaine
        const weeks = Math.ceil(diffDays / 7);
        for (let i = 0; i < weeks; i++) {
            const weekStart = new Date(start);
            weekStart.setDate(weekStart.getDate() + i * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const weekSales = rows
                .filter((row: any) => {
                    if (!row.date) return false;
                    const rowDate = new Date(row.date);
                    return rowDate >= weekStart && rowDate <= weekEnd;
                })
                .reduce((sum: number, row: any) => sum + Number(row.sales_ttc || 0), 0);

            const weekOrders = rows
                .filter((row: any) => {
                    if (!row.date) return false;
                    const rowDate = new Date(row.date);
                    return rowDate >= weekStart && rowDate <= weekEnd;
                })
                .reduce((sum: number, row: any) => sum + Number(row.orders || 0), 0);

            chartData.push({
                month: `S${i + 1}`,
                sales: Math.round(weekSales),
                sales_ht: Math.round(weekSales * 0.8),
                orders: weekOrders,
                profit: Math.round(weekSales * 0.8 * 0.25),
            });
        }
    }

    // SI chartData est vide, créer des données par défaut
    if (chartData.length === 0) {
        // Créer des données pour 7 jours par défaut
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - 6 + i);
            chartData.push({
                month: `${date.getDate()}/${date.getMonth() + 1}`,
                sales: 0,
                sales_ht: 0,
                orders: 0,
                profit: 0,
            });
        }
    }

    return chartData;
}

function formatCategories(rows: any[], totalRevenue: number) {
    if (rows.length === 0) {
        return [];
    }

    // Calculer le total réel des catégories
    const categoryTotal = rows.reduce(
        (sum, row) => sum + Number(row.revenue || 0),
        0
    );

    // Si aucune catégorie n'a de revenus, retourner tableau vide
    if (categoryTotal === 0) {
        return [];
    }

    return rows.map((row: any, index: number) => {
        const revenue = Number(row.revenue || 0);
        const percentage =
            categoryTotal > 0 ? Math.round((revenue / categoryTotal) * 100) : 0;

        return {
            name: row.category || "Non catégorisé",
            value: percentage,
            sales: Math.round(revenue),
            color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][index] || "#6b7280",
        };
    });
}

function formatTopProducts(rows: any[]) {
    if (rows.length === 0) {
        return [{ name: "Aucun produit vendu", sales: 0, revenue: 0 }];
    }

    return rows.map((row: any) => ({
        name: row.name,
        sales: Math.round(Number(row.total_quantity || 0)),
        revenue: Math.round(Number(row.total_revenue || 0)),
    }));
}

function createEmptyData(period: Period = "week") {
    let salesData = [];

    if (period === "week") {
        const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        salesData = dayNames.map((day) => ({
            month: day,
            sales: 0,
            sales_ht: 0,
            orders: 0,
            profit: 0,
        }));
    } else if (period === "month") {
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - 29 + i);
            salesData.push({
                month: `${date.getDate()}/${date.getMonth() + 1}`,
                sales: 0,
                sales_ht: 0,
                orders: 0,
                profit: 0,
            });
        }
    } else if (period === "quarter") {
        const monthNames = ["Jan", "Fév", "Mar"];
        salesData = monthNames.map((month) => ({
            month: month,
            sales: 0,
            sales_ht: 0,
            orders: 0,
            profit: 0,
        }));
    } else if (period === "year") {
        const monthNames = [
            "Jan",
            "Fév",
            "Mar",
            "Avr",
            "Mai",
            "Juin",
            "Juil",
            "Août",
            "Sep",
            "Oct",
            "Nov",
            "Déc",
        ];
        salesData = monthNames.map((month) => ({
            month: month,
            sales: 0,
            sales_ht: 0,
            orders: 0,
            profit: 0,
        }));
    } else {
        // custom
        salesData = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - 6 + i);
            return {
                month: `${date.getDate()}/${date.getMonth() + 1}`,
                sales: 0,
                sales_ht: 0,
                orders: 0,
                profit: 0,
            };
        });
    }

    return {
        sales: salesData,
        kpis: {
            revenue: 0,
            revenue_ttc: 0,
            revenue_ht: 0,
            profit: 0,
            orders: 0,
            clients: 0,
            stockout: 0,
        },
        categories: [],
        topProducts: [{ name: "Aucune vente", sales: 0, revenue: 0 }],
    };
}
