export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

// Helper pour récupérer l'utilisateur courant + company_id
async function getCurrentUserCompany() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error("Non authentifié");
  }

  const userEmail = session.user.email;

  const userResult = await pool.query(
    "SELECT id, company_id, warehouse_id FROM users WHERE email = $1",
    [userEmail]
  );

  if (userResult.rows.length === 0) {
    throw new Error("Utilisateur non trouvé");
  }

  return userResult.rows[0] as { id: number; company_id: number, warehouse_id: number };
}

/* GET : récupérer tous les utilisateurs de la company */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserCompany();
    const companyId = user.company_id;

    const result = await pool.query(
      "SELECT * FROM users WHERE company_id = $1 ORDER BY id",
      [companyId]
    );

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (GET users) :", err);

    if (
      err.message === "Non authentifié" ||
      err.message === "Utilisateur non trouvé"
    ) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}

/* POST : créer un utilisateur dans la company courante */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserCompany();
    const companyId = user.company_id;

    const body = await req.json();
    const { name, email, phone, role, warehouse, status, password, warehouse_id } = body ?? {};



    if (!name || !email) {
      return NextResponse.json(
        { error: "Champs 'name' et 'email' requis" },
        { status: 400 }
      );
    }

    // Unicité de l'email dans la company
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND company_id = $2",
      [email, companyId]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 }
      );
    }

    // Hash du mot de passe
    let passwordHash: string | null = null;
    if (typeof password === "string" && password.trim() !== "") {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `INSERT INTO users (
         name,
         email,
         password_hash,
         phone,
         role,
         warehouse,
         status,
         lastlogin,
         company_id,
         warehouse_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name,
        email,
        passwordHash,
        phone ?? null,
        role ?? null,
        warehouse ?? null,
        typeof status === "boolean"
          ? status
            ? "active"
            : "inactive"
          : status ?? "inactive",
        null,
        companyId,
        warehouse_id
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (POST users) :", err);

    if (
      err.message === "Non authentifié" ||
      err.message === "Utilisateur non trouvé"
    ) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    if (err.code === "23505") {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}

/* PUT : modifier un utilisateur de la company */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUserCompany();
    const companyId = user.company_id;

    const body = await req.json();
    const { id, name, email, password, phone, role, warehouse, status, warehouse_id } =
      body ?? {};

    if (id === undefined || id === null) {
      return NextResponse.json(
        { error: "Champ 'id' requis" },
        { status: 400 }
      );
    }

    const userId =
      typeof id === "string" ? parseInt(id, 10) : Number(id);
    if (Number.isNaN(userId)) {
      return NextResponse.json(
        { error: "Identifiant 'id' invalide" },
        { status: 400 }
      );
    }

    const existingUser = await pool.query(
      "SELECT id, email FROM users WHERE id = $1 AND company_id = $2",
      [userId, companyId]
    );

    if (existingUser.rows.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier l'unicité de l'email si modifié
    if (email && email !== existingUser.rows[0].email) {
      const duplicateEmail = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND company_id = $2 AND id != $3",
        [email, companyId, userId]
      );

      if (duplicateEmail.rows.length > 0) {
        return NextResponse.json(
          { error: "Un autre utilisateur avec cet email existe déjà" },
          { status: 409 }
        );
      }
    }

    // Nouveau hash éventuel
    let passwordHash: string | null | undefined = undefined;
    if (typeof password === "string" && password.trim() !== "") {
      passwordHash = await bcrypt.hash(password, 10);
    }

    let result;
    if (passwordHash !== undefined) {
      result = await pool.query(
        `UPDATE users
           SET name = $1,
               email = $2,
               phone = $3,
               role = $4,
               warehouse = $5,
               status = $6,
               password_hash = $7,
               updated_at = CURRENT_TIMESTAMP
               warehouse_id = $8
         WHERE id = $9 AND company_id = $10
         RETURNING *`,
        [
          name ?? null,
          email ?? null,
          phone ?? null,
          role ?? null,
          warehouse ?? null,
          status ?? null,
          passwordHash,
          warehouse_id,
          userId,
          companyId,
        ]
      );
    } else {
      result = await pool.query(
        `UPDATE users
           SET name = $1,
               email = $2,
               phone = $3,
               role = $4,
               warehouse = $5,
               status = $6,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND company_id = $8
         RETURNING *`,
        [
          name ?? null,
          email ?? null,
          phone ?? null,
          role ?? null,
          warehouse ?? null,
          status ?? null,
          userId,
          companyId,
        ]
      );
    }

    if (!result || result.rowCount === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (PUT users) :", err);

    if (
      err.message === "Non authentifié" ||
      err.message === "Utilisateur non trouvé"
    ) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    if (err.code === "23505") {
      return NextResponse.json(
        { error: "Un autre utilisateur avec cet email existe déjà" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}

/* DELETE : supprimer un utilisateur de la company */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUserCompany();
    const companyId = user.company_id;

    const body = await req.json().catch(() => ({}));
    let { id } = body ?? {};

    if (!id) {
      const q = req.nextUrl.searchParams.get("id");
      if (q) id = q;
    }

    if (id === undefined || id === null) {
      return NextResponse.json(
        { error: "Champ 'id' requis" },
        { status: 400 }
      );
    }

    const userId =
      typeof id === "string" ? parseInt(id, 10) : Number(id);
    if (Number.isNaN(userId)) {
      return NextResponse.json(
        { error: "Identifiant 'id' invalide" },
        { status: 400 }
      );
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND company_id = $2",
      [userId, companyId]
    );

    if (existingUser.rows.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Empêcher la suppression de soi-même
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Impossible de supprimer votre propre compte" },
        { status: 400 }
      );
    }

    // Vérifier les références
    const clientsCheck = await pool.query(
      "SELECT id FROM clients WHERE user_id = $1 AND company_id = $2 LIMIT 1",
      [userId, companyId]
    );

    const productsCheck = await pool.query(
      "SELECT id FROM products WHERE user_id = $1 AND company_id = $2 LIMIT 1",
      [userId, companyId]
    );

    if (clientsCheck.rows.length > 0 || productsCheck.rows.length > 0) {
      return NextResponse.json(
        {
          error: "Impossible de supprimer cet utilisateur",
          details:
            "L'utilisateur est référencé dans d'autres tables (clients ou produits)",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 AND company_id = $2 RETURNING *",
      [userId, companyId]
    );

    if (!result || result.rowCount === 0) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (DELETE users) :", err);

    if (
      err.message === "Non authentifié" ||
      err.message === "Utilisateur non trouvé"
    ) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    if (err.code === "23503") {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer : l'utilisateur est référencé dans d'autres tables",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}
