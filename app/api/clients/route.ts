// app/api/clients/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

// Helper pour récupérer le company_id depuis la session
async function getCompanyIdFromSession(): Promise<number | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.company_id) {
      console.error("❌ Session utilisateur ou company_id manquant");
      return null;
    }

    return session.user.company_id;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la session:", error);
    return null;
  }
}

// Helper pour récupérer l'ID utilisateur depuis la session
async function getUserIdFromSession(): Promise<number | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      console.error("❌ Session utilisateur ou user_id manquant");
      return null;
    }

    return session.user.id;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la session:", error);
    return null;
  }
}

/* GET : récupérer tous les clients DE L'ENTREPRISE */
export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();

    if (!companyId) {
      return NextResponse.json(
        { error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    console.log(`👥 Récupération clients pour company_id: ${companyId}`);

    // Récupérer les paramètres de recherche
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const type = url.searchParams.get("type") || "";
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = `
      SELECT id, name, email, phone, type, created_at, updated_at, user_id, company_id
      FROM clients 
      WHERE company_id = $1
    `;
    const params: any[] = [companyId];
    let paramCount = 1;

    // Filtre par recherche (nom ou email)
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Filtre par type
    if (type && (type === 'Entreprise' || type === 'Particulier')) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(type);
    }

    query += ` ORDER BY name ASC, created_at DESC`;

    // Pagination
    if (limit > 0) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
    }

    if (offset > 0) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);
    }

    const result = await pool.query(query, params);

    console.log(`👥 ${result.rows.length} clients trouvés pour company ${companyId}`);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("❌ Erreur PostgreSQL (GET clients):", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}

/* POST : créer un client POUR L'ENTREPRISE */
export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const companyId = await getCompanyIdFromSession();
    const userId = await getUserIdFromSession();

    if (!companyId) {
      return NextResponse.json(
        { error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, email, phone, type = 'Particulier' } = body ?? {};

    console.log(`➕ Création client pour company ${companyId}:`, { name, email, type });

    // Validations
    if (!name || !email) {
      return NextResponse.json(
        { error: "Champs 'name' et 'email' requis" },
        { status: 400 }
      );
    }

    // Validation du type
    if (type && !['Entreprise', 'Particulier'].includes(type)) {
      return NextResponse.json(
        { error: "Type doit être 'Entreprise' ou 'Particulier'" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // Vérifier que l'email n'existe pas déjà dans cette entreprise
    const existingClient = await client.query(
      `SELECT id FROM clients WHERE email = $1 AND company_id = $2`,
      [email, companyId]
    );

    if (existingClient.rowCount > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Un client avec cet email existe déjà dans votre entreprise" },
        { status: 409 }
      );
    }

    const result = await client.query(
      `INSERT INTO clients (company_id, user_id, name, email, phone, type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, company_id, user_id, name, email, phone, type, created_at, updated_at`,
      [companyId, userId, name, email, phone ?? null, type]
    );

    await client.query("COMMIT");

    console.log(`✅ Client créé avec ID: ${result.rows[0].id} pour company ${companyId}`);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Rollback error:", rollbackErr);
    }

    // Gestion des contraintes d'unicité
    if (err.code === '23505') {
      return NextResponse.json(
        { error: "Un client avec cet email existe déjà" },
        { status: 409 }
      );
    }

    // Gestion de la contrainte CHECK sur le type
    if (err.code === '23514') {
      return NextResponse.json(
        { error: "Type invalide. Doit être 'Entreprise' ou 'Particulier'" },
        { status: 400 }
      );
    }

    console.error("❌ Erreur PostgreSQL (POST clients):", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  } finally {
    client.release();
  }
}

/* PUT : modifier un client DE L'ENTREPRISE */
export async function PUT(req: NextRequest) {
  const clientPool = await pool.connect();

  try {
    const companyId = await getCompanyIdFromSession();

    if (!companyId) {
      return NextResponse.json(
        { error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, name, email, phone, type } = body ?? {};

    if (!id) {
      return NextResponse.json({ error: "Champ 'id' requis" }, { status: 400 });
    }

    const clientId = typeof id === "string" ? parseInt(id, 10) : Number(id);
    if (Number.isNaN(clientId)) {
      return NextResponse.json({ error: "Identifiant 'id' invalide" }, { status: 400 });
    }

    console.log(`✏️ Modification client ${clientId} pour company ${companyId}`);

    await clientPool.query("BEGIN");

    // Vérifier que le client appartient à l'entreprise AVANT modification
    const checkResult = await clientPool.query(
      "SELECT id, email FROM clients WHERE id = $1 AND company_id = $2",
      [clientId, companyId]
    );

    if (checkResult.rowCount === 0) {
      await clientPool.query("ROLLBACK");
      return NextResponse.json({ error: "Client non trouvé dans votre entreprise" }, { status: 404 });
    }

    const oldEmail = checkResult.rows[0].email;

    // Si l'email change, vérifier qu'il n'existe pas déjà dans cette entreprise
    if (email && email !== oldEmail) {
      const emailCheck = await clientPool.query(
        "SELECT id FROM clients WHERE email = $1 AND company_id = $2 AND id != $3",
        [email, companyId, clientId]
      );

      if (emailCheck.rowCount > 0) {
        await clientPool.query("ROLLBACK");
        return NextResponse.json(
          { error: "Un autre client avec cet email existe déjà dans votre entreprise" },
          { status: 409 }
        );
      }
    }

    // Validation du type si fourni
    if (type && !['Entreprise', 'Particulier'].includes(type)) {
      await clientPool.query("ROLLBACK");
      return NextResponse.json(
        { error: "Type doit être 'Entreprise' ou 'Particulier'" },
        { status: 400 }
      );
    }

    const result = await clientPool.query(
      `UPDATE clients
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             phone = COALESCE($3, phone),
             type = COALESCE($4, type),
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND company_id = $6
       RETURNING id, company_id, user_id, name, email, phone, type, created_at, updated_at`,
      [name, email, phone, type, clientId, companyId]
    );

    await clientPool.query("COMMIT");

    console.log(`✅ Client ${clientId} modifié pour company ${companyId}`);

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err: any) {
    try {
      await clientPool.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Rollback error:", rollbackErr);
    }

    if (err.code === '23505') {
      return NextResponse.json(
        { error: "Un client avec cet email existe déjà" },
        { status: 409 }
      );
    }

    if (err.code === '23514') {
      return NextResponse.json(
        { error: "Type invalide. Doit être 'Entreprise' ou 'Particulier'" },
        { status: 400 }
      );
    }

    console.error("❌ Erreur PostgreSQL (PUT clients):", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  } finally {
    clientPool.release();
  }
}

/* DELETE : supprimer un client DE L'ENTREPRISE */
export async function DELETE(req: NextRequest) {
  const clientPool = await pool.connect();

  try {
    const companyId = await getCompanyIdFromSession();

    if (!companyId) {
      return NextResponse.json(
        { error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    // Récupérer l'ID depuis les query params
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Paramètre 'id' requis" }, { status: 400 });
    }

    const clientId = parseInt(id, 10);
    if (Number.isNaN(clientId)) {
      return NextResponse.json({ error: "Identifiant 'id' invalide" }, { status: 400 });
    }

    console.log(`🗑️ Suppression client ${clientId} pour company ${companyId}`);

    await clientPool.query("BEGIN");

    // Vérifier l'appartenance à l'entreprise avant suppression
    const checkResult = await clientPool.query(
      "SELECT id, name, email FROM clients WHERE id = $1 AND company_id = $2",
      [clientId, companyId]
    );

    if (checkResult.rowCount === 0) {
      await clientPool.query("ROLLBACK");
      return NextResponse.json({ error: "Client non trouvé dans votre entreprise" }, { status: 404 });
    }

    // Vérifier si le client est utilisé dans des ventes
    const salesCheck = await clientPool.query(
      "SELECT COUNT(*) as count FROM sales WHERE client_id = $1 AND company_id = $2",
      [clientId, companyId]
    );

    const salesCount = parseInt(salesCheck.rows[0].count);
    if (salesCount > 0) {
      await clientPool.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `Impossible de supprimer ce client car il est associé à ${salesCount} vente(s). 
                  Supprimez d'abord les ventes associées ou marquez le client comme inactif.`
        },
        { status: 400 }
      );
    }

    const result = await clientPool.query(
      `DELETE FROM clients 
       WHERE id = $1 AND company_id = $2 
       RETURNING id, name, email`,
      [clientId, companyId]
    );

    await clientPool.query("COMMIT");

    console.log(`✅ Client ${clientId} supprimé pour company ${companyId}`);

    return NextResponse.json(
      { message: "Client supprimé", client: result.rows[0] },
      { status: 200 }
    );
  } catch (err: any) {
    try {
      await clientPool.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Rollback error:", rollbackErr);
    }

    console.error("❌ Erreur PostgreSQL (DELETE clients):", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  } finally {
    clientPool.release();
  }
}