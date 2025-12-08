export const dynamic = "force-dynamic";

// app/api/product-warehouses/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";


export async function GET() {
    try {
        const result = await pool.query(
            `
      SELECT 
        product_id      AS "productId",
        warehouse_value AS "warehouseId",
        stock           AS "quantity"
      FROM product_warehouses
      `
        );

        return NextResponse.json(result.rows, { status: 200 });
    } catch (err: any) {
        console.error("Erreur GET /api/product-warehouses:", err);
        return NextResponse.json(
            { error: "Erreur lors du chargement des stocks" },
            { status: 500 }
        );
    }
}
