// app/api/stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const warehouseId = searchParams.get("warehouseId");

        let query = `
      SELECT 
        pw.product_id as "productId",
        pw.warehouse_value as "warehouseId", 
        pw.stock as quantity,
        p.name as "productName"
      FROM product_warehouses pw
      JOIN products p ON pw.product_id = p.id
    `;

        const params = [];

        if (warehouseId) {
            query += ` WHERE pw.warehouse_value = $1`;
            params.push(warehouseId);
        }

        query += ` ORDER BY p.name`;

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