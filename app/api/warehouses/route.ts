export const dynamic = "force-dynamic";

// app/api/warehouses/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    // Récupérer le company_id depuis la session
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.company_id) {
      console.error("❌ Session utilisateur ou company_id manquant");
      return NextResponse.json(
        { error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    const companyId = session.user.company_id;
    console.log(`📦 Récupération des entrepôts pour company_id: ${companyId}`);

    const result = await pool.query(
      `SELECT id, value, label, metadata 
       FROM warehouses 
       WHERE company_id = $1 
       ORDER BY value`,
      [companyId]
    );

    console.log(`📦 ${result.rows.length} entrepôts trouvés pour company ${companyId}:`, result.rows);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("❌ Erreur fetch warehouses:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}