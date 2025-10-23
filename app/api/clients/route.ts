// route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db"; // adapte le chemin si besoin

export const runtime = "nodejs"; // nécessaire si tu utilises 'pg'

/* GET : récupérer tous les utilisateurs */
export async function GET() {
  try {
    const result = await pool.query("SELECT * FROM clients");
    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (GET) :", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}

/* POST : créer un utilisateur */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, role, warehouse, status } = body ?? {};

    // validations minimales
    if (!name || !email) {
      return NextResponse.json({ error: "Champs 'name' et 'email' requis" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, phone, role, warehouse, status, lastlogin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        email,
        phone ?? null,
        role ?? null,
        warehouse ?? null,
        typeof status === "boolean" ? (status ? "active" : "inactive") : (status ?? "inactive"),
        null, // lastlogin (ou new Date() si tu veux la date actuelle)
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (POST) :", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}

/* PUT : modifier un utilisateur (entièrement) */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, phone, role, warehouse, status } = body ?? {};

    if (id === undefined || id === null) {
      return NextResponse.json({ error: "Champ 'id' requis" }, { status: 400 });
    }

    const userId = typeof id === "string" ? parseInt(id, 10) : Number(id);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Identifiant 'id' invalide" }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE users
         SET name = $1,
             email = $2,
             phone = $3,
             role = $4,
             warehouse = $5,
             status = $6
       WHERE id = $7
       RETURNING *`,
      [name ?? null, email ?? null, phone ?? null, role ?? null, warehouse ?? null, status ?? null, userId]
    );

    if (!result || result.rowCount === 0) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (PUT) :", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}



// Supprimé un utilisateur (DELETE)
export async function DELETE(req: NextRequest) {
  try {
    // Option 1 : id dans le body JSON
    const body = await req.json();
    let { id } = body ?? {};

    // Option 2 : si l'id est envoyé en query string (ex: DELETE /api/users?id=1)
    if (!id) {
      const q = req.nextUrl.searchParams.get("id");
      if (q) id = q;
    }

    if (id === undefined || id === null) {
      return NextResponse.json({ error: "Champ 'id' requis" }, { status: 400 });
    }

    const userId = typeof id === "string" ? parseInt(id, 10) : Number(id);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Identifiant 'id' invalide" }, { status: 400 });
    }

    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING *`,
      [userId]
    );

    if (!result || result.rowCount === 0) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (DELETE) :", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
