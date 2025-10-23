import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// Récupérer tous les produits
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, user_id, name, reference, category, stock, price, supplier, status, description, created_at, updated_at
       FROM products
       ORDER BY id ASC`
    );
    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (GET) :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Enregistrer un nouveau produit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, name, reference, category, stock, price, supplier, status, description } = body ?? {};

    if (!user_id || !name || !reference) {
      return NextResponse.json(
        { error: "Champs 'user_id', 'name' et 'reference' requis" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO products 
        (user_id, name, reference, category, stock, price, supplier, status, description, created_at, updated_at)
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        user_id,
        name,
        reference,
        category ?? null,
        stock ?? 0,
        price ?? 0.0,
        supplier ?? null,
        status ?? "active",
        description ?? null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (POST) :", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}

// Mettre à jour un produit
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, user_id, name, reference, category, stock, price, supplier, status, description } = body ?? {};

    if (id === undefined || id === null) {
      return NextResponse.json({ error: "Champ 'id' requis" }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE products
       SET user_id = $1,
           name = $2,
           reference = $3,
           category = $4,
           stock = $5,
           price = $6,
           supplier = $7,
           status = $8,
           description = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [user_id, name, reference, category ?? null, stock ?? 0, price ?? 0.0, supplier ?? null, status ?? "active", description ?? null, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (PUT) :", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}

// Supprimer un produit
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ error: "Paramètre 'id' requis" }, { status: 400 });
    }

    const productId = parseInt(idParam, 10);
    if (Number.isNaN(productId)) {
      return NextResponse.json({ error: "Identifiant 'id' invalide" }, { status: 400 });
    }

    const result = await pool.query(
      `DELETE FROM products WHERE id = $1 RETURNING *`,
      [productId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    // Renvoie le produit supprimé
    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (DELETE) :", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
