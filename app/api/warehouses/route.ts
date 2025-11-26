import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT value, label, metadata FROM warehouses ORDER BY value`
    );

    console.log("📦 Warehouses from DB:", result.rows);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("Erreur fetch warehouses:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
