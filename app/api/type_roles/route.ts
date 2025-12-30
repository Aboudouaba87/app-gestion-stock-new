export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";


// Récupérer les rôles avec couleur personnalisée pour un utilisateur dans une entreprise
export async function GET(request: NextRequest) {
    try {
        // On récupère l'utilisateur courant (JWT / session)
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        // Optionnel: permettre de passer un userId ciblé mais le forcer dans la même company
        const { searchParams } = new URL(request.url);
        const targetUserId = searchParams.get("userId") || user.id;

        const result = await pool.query(
            `
      SELECT *
      FROM type_roles
      `,
        );

        return NextResponse.json(result.rows, { status: 200 });
    } catch (err: any) {
        console.error("Erreur PostgreSQL (GET type_roles) :", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}