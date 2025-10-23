import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Récupérer les rôles avec couleur personnalisée pour un utilisateur
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Paramètre userId requis" }, { status: 400 });
    }

    const result = await pool.query(
      `
      SELECT r.value,
             r.label,
             COALESCE(urp.custom_color, r.default_color) AS color
      FROM roles r
      LEFT JOIN user_role_preferences urp
        ON urp.role_value = r.value
       AND urp.user_id = $1
      `,
      [userId] // ✅ paramètre passé ici
    );

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (GET) :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
