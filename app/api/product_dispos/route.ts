// app/api/stock/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { pool } from "@/lib/db";

// export async function GET(request: NextRequest) {
//     try {
//         const { searchParams } = new URL(request.url);
//         const warehouseId = searchParams.get("warehouseId");

//         let query = `
//       SELECT 
//         pw.product_id as "productId",
//         pw.warehouse_value as "warehouseId", 
//         pw.stock as quantity,
//         p.name as "productName"
//       FROM product_warehouses pw
//       JOIN products p ON pw.product_id = p.id
//     `;

//         const params = [];

//         if (warehouseId) {
//             query += ` WHERE pw.warehouse_value = $1`;
//             params.push(warehouseId);
//         }

//         query += ` ORDER BY p.name`;

//         const result = await pool.query(query, params);

//         return NextResponse.json(result.rows, { status: 200 });
//     } catch (err: any) {
//         console.error("Erreur GET /api/stock:", err?.stack || err);
//         return NextResponse.json(
//             { error: "Erreur interne lors de la lecture des stocks" },
//             { status: 500 }
//         );
//     }
// }


import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Helper pour extraire company_id (à adapter selon votre auth)
function getCompanyId(req: NextRequest): number {
    const companyHeader = req.headers.get('x-company-id');
    if (companyHeader) return parseInt(companyHeader, 10);
    return 1; // À ADAPTER selon votre auth
}

export async function GET(request: NextRequest) {
    try {
        const companyId = getCompanyId(request);
        const { searchParams } = new URL(request.url);
        const warehouseId = searchParams.get("warehouseId");

        let query = `
      SELECT 
        pw.product_id as "productId",
        pw.warehouse_id as "warehouseId", 
        pw.stock as quantity,
        p.name as "productName",
        p.sku as "productSku",
        w.value as "warehouseCode",
        w.label as "warehouseName"
      FROM product_warehouses pw
      INNER JOIN products p ON pw.product_id = p.id AND p.company_id = $1
      INNER JOIN warehouses w ON pw.warehouse_id = w.id AND w.company_id = $1
      WHERE p.company_id = $1 AND w.company_id = $1
    `;

        const params = [companyId];

        if (warehouseId) {
            query += ` AND pw.warehouse_id = $2`;
            params.push(parseInt(warehouseId, 10));
        }

        query += ` ORDER BY w.label, p.name`;

        const result = await pool.query(query, params);

        return NextResponse.json(result.rows, { status: 200 });
    } catch (err: any) {
        console.error("Erreur GET /api/stock:", err?.stack || err);
        return NextResponse.json(
            { error: "Erreur interne lors de la lecture des stocks" },
            { status: 500 }
        );
    }
}