export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        error: "Non authentifié"
      }, { status: 401 });
    }

    console.log(`📦 Récupération des entrepôts pour utilisateur: ${user.email}, company: ${user.company_id}`);

    const result = await client.query(
      `
      SELECT 
        id, 
        company_id, 
        value, 
        label, 
        metadata
      FROM warehouses 
      WHERE company_id = $1 
      ORDER BY 
        CASE 
          WHEN value = 'main' THEN 1
          WHEN label ILIKE '%principal%' THEN 2
          ELSE 3
        END,
        label ASC
      `,
      [user.company_id]
    );

    const warehouses = result.rows.map((row: any) => ({
      id: row.id,
      company_id: row.company_id,
      value: row.value,
      label: row.label,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata || {},
    }));

    console.log(`✅ ${warehouses.length} entrepôts trouvés pour company ${user.company_id}`);

    return NextResponse.json(warehouses, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (err: any) {
    console.error("❌ Erreur GET /api/warehouses:", err);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        detail: process.env.NODE_ENV === "development" ? err.message : undefined
      },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        error: "Non authentifié"
      }, { status: 401 });
    }

    const body = await request.json();
    const { value, label, metadata } = body;

    if (!value || !label) {
      return NextResponse.json({
        error: "Les champs 'value' et 'label' sont requis"
      }, { status: 400 });
    }

    if (value.length > 50) {
      return NextResponse.json({
        error: "La valeur ne doit pas dépasser 50 caractères"
      }, { status: 400 });
    }

    if (label.length > 100) {
      return NextResponse.json({
        error: "Le label ne doit pas dépasser 100 caractères"
      }, { status: 400 });
    }

    const existing = await client.query(
      `SELECT id FROM warehouses WHERE value = $1 AND company_id = $2`,
      [value.trim().toLowerCase(), user.company_id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({
        error: "Un entrepôt avec cette valeur existe déjà"
      }, { status: 409 });
    }

    const result = await client.query(
      `
      INSERT INTO warehouses (
        company_id, 
        value, 
        label, 
        metadata
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, company_id, value, label, metadata
      `,
      [
        user.company_id,
        value.trim(),
        label.trim(),
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    const newWarehouse = {
      ...result.rows[0],
      metadata: typeof result.rows[0].metadata === 'string'
        ? JSON.parse(result.rows[0].metadata)
        : result.rows[0].metadata
    };

    console.log(`✅ Entrepôt créé: ${newWarehouse.label} (${newWarehouse.value})`);

    return NextResponse.json({
      success: true,
      warehouse: newWarehouse,
      message: "Entrepôt créé avec succès"
    }, { status: 201 });

  } catch (err: any) {
    console.error("❌ Erreur POST /api/warehouses:", err);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        detail: process.env.NODE_ENV === "development" ? err.message : undefined
      },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest) {
  const client = await pool.connect();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        error: "Non authentifié"
      }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    const body = await request.json();
    const { label, metadata } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json({
        error: "ID d'entrepôt invalide"
      }, { status: 400 });
    }

    if (!label) {
      return NextResponse.json({
        error: "Le champ 'label' est requis"
      }, { status: 400 });
    }

    if (label.length > 100) {
      return NextResponse.json({
        error: "Le label ne doit pas dépasser 100 caractères"
      }, { status: 400 });
    }

    const existing = await client.query(
      `SELECT id, company_id FROM warehouses WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({
        error: "Entrepôt non trouvé"
      }, { status: 404 });
    }

    if (existing.rows[0].company_id != user.company_id) {
      return NextResponse.json({
        error: "Non autorisé à modifier cet entrepôt"
      }, { status: 403 });
    }

    const result = await client.query(
      `
      UPDATE warehouses
      SET 
        label = $1, 
        metadata = $2
      WHERE id = $3 AND company_id = $4
      RETURNING id, company_id, value, label, metadata
      `,
      [
        label.trim(),
        metadata ? JSON.stringify(metadata) : null,
        id,
        user.company_id
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        error: "Entrepôt non trouvé ou non autorisé"
      }, { status: 404 });
    }

    const updatedWarehouse = {
      ...result.rows[0],
      metadata: typeof result.rows[0].metadata === 'string'
        ? JSON.parse(result.rows[0].metadata)
        : result.rows[0].metadata
    };

    console.log(`✅ Entrepôt mis à jour: ${updatedWarehouse.label}`);

    return NextResponse.json({
      success: true,
      warehouse: updatedWarehouse,
      message: "Entrepôt mis à jour avec succès"
    }, { status: 200 });

  } catch (err: any) {
    console.error("❌ Erreur PUT /api/warehouses:", err);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        detail: process.env.NODE_ENV === "development" ? err.message : undefined
      },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const client = await pool.connect();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        error: "Non authentifié"
      }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));

    if (!id || isNaN(id)) {
      return NextResponse.json({
        error: "ID d'entrepôt invalide"
      }, { status: 400 });
    }

    const existing = await client.query(
      `SELECT id, company_id, value FROM warehouses WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({
        error: "Entrepôt non trouvé"
      }, { status: 404 });
    }


    if (Number(existing.rows[0].company_id) !== Number(user.company_id)) {
      return NextResponse.json({
        error: "Non autorisé à supprimer cet entrepôt"
      }, { status: 403 });
    }

    if (existing.rows[0].value === "main") {
      return NextResponse.json({
        error: "Impossible de supprimer l'entrepôt principal"
      }, { status: 400 });
    }

    const hasProducts = await client.query(
      `SELECT COUNT(*) as count FROM product_warehouses WHERE warehouse_id = $1`,
      [id]
    );

    if (hasProducts.rows[0].count > 0) {
      return NextResponse.json({
        error: "Impossible de supprimer un entrepôt contenant des produits"
      }, { status: 400 });
    }

    const result = await client.query(
      `DELETE FROM warehouses WHERE id = $1 AND company_id = $2 RETURNING id, value, label`,
      [id, user.company_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        error: "Entrepôt non trouvé ou non autorisé"
      }, { status: 404 });
    }

    console.log(`🗑️ Entrepôt supprimé: ${result.rows[0].label} (${result.rows[0].value})`);

    return NextResponse.json({
      success: true,
      message: "Entrepôt supprimé avec succès",
      deleted: result.rows[0]
    }, { status: 200 });

  } catch (err: any) {
    console.error("❌ Erreur DELETE /api/warehouses:", err);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        detail: process.env.NODE_ENV === "development" ? err.message : undefined
      },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}