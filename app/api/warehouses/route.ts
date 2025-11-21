// import { NextRequest, NextResponse } from "next/server";
// import pool from "@/lib/db";

// export async function GET() {
//   try {
//     // cast id to text to normalise (works si id est serial ou texte)
//     const res = await pool.query(`
//       SELECT id::text AS id, name
//       FROM warehouses
//       ORDER BY id ASC
//     `);
//     return NextResponse.json(res.rows, { status: 200 });
//   } catch (err: any) {
//     // log complet côté serveur pour diagnostic
//     console.error("GET /api/warehouses error:", err);
//     return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
//   }
// }


// import { NextRequest, NextResponse } from "next/server";

// export async function GET() {
//   try {
//     const rows = [
//       { id: "main", name: "Entrepôt Principal" },
//       { id: "south", name: "Entrepôt Sud" },
//       { id: "north", name: "Entrepôt Nord" },
//     ];
//     return NextResponse.json(rows, { status: 200 });
//   } catch (err: any) {
//     console.error("GET /api/warehouses (mock) error:", err);
//     return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
//   }
// }


import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    // On expose value AS id et label AS name pour conserver l'interface client existante
    const res = await pool.query(`
      SELECT value::text AS id, label AS name
      FROM warehouses
      ORDER BY label ASC
    `);

    console.log('GET /api/warehouses rowCount=', res.rowCount);
    return NextResponse.json(res.rows, { status: 200 });
  } catch (err: any) {
    console.error('GET /api/warehouses error (full):', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
