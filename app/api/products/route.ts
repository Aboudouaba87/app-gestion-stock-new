import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

function toNumberSafe(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT products.id, user_id, name, reference, category, stock, price, supplier, status, description, products.created_at, products.updated_at
       FROM products
       ORDER BY products.id ASC`
    );
    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (GET) :", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      user_id,
      name,
      reference,
      category,
      stock,
      price,
      supplier,
      status,
      description,
      warehouse_id,
    } = body ?? {};

    if (!user_id || !name || !reference) {
      return NextResponse.json({ error: "Champs 'user_id', 'name' et 'reference' requis" }, { status: 400 });
    }

    const initialStock = toNumberSafe(stock, 0);

    await client.query("BEGIN");

    const insertProduct = await client.query(
      `INSERT INTO products
        (user_id, name, reference, category, stock, price, supplier, status, description, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
       RETURNING *`,
      [
        Number(user_id),
        String(name),
        String(reference),
        category ?? null,
        initialStock,
        toNumberSafe(price, 0),
        supplier ?? null,
        status ?? (initialStock === 0 ? "out_of_stock" : initialStock <= 10 ? "low_stock" : "active"),
        description ?? null,
      ]
    );

    const newProduct = insertProduct.rows[0];

    if (warehouse_id && String(warehouse_id).toLowerCase() !== "none") {
      await client.query(
        `INSERT INTO product_warehouses (product_id, warehouse_value, stock, reserved, last_updated)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, warehouse_value) DO UPDATE
         SET stock = EXCLUDED.stock, reserved = EXCLUDED.reserved, last_updated = NOW()`,
        [newProduct.id, String(warehouse_id), initialStock, 0]
      );
    }

    await client.query(
      `UPDATE products
       SET stock = COALESCE((
         SELECT SUM(stock)::int FROM product_warehouses WHERE product_id = $1
       ), $2),
       updated_at = NOW()
       WHERE id = $1`,
      [newProduct.id, initialStock]
    );

    await client.query("COMMIT");

    const fresh = await client.query(`SELECT * FROM products WHERE id = $1`, [newProduct.id]);
    return NextResponse.json(fresh.rows[0], { status: 201 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Erreur PostgreSQL (POST) :", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    const url = new URL(request.url);
    const queryId = url.searchParams.get("id");

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const idRaw = body?.id ?? body?.productId ?? body?.product_id ?? queryId;
    const id = Number(idRaw);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Champ 'id' requis et numérique" }, { status: 400 });
    }

    const user_id = toNumberSafe(body.user_id ?? body.userId, 1);
    const name = String(body.name ?? "");
    const reference = String(body.reference ?? "");
    const category = body.category ?? null;
    const stock = toNumberSafe(body.stock ?? body.qty, 0);
    const price = toNumberSafe(body.price, 0);
    const supplier = body.supplier ?? null;
    const status = body.status ?? (stock === 0 ? "out_of_stock" : stock <= 10 ? "low_stock" : "active");
    const description = body.description ?? null;
    const warehouse_id = String(body.warehouse_id ?? body.warehouseId ?? body.store ?? "none");

    await client.query("BEGIN");

    const updateRes = await client.query(
      `UPDATE products SET
         user_id = $1, name = $2, reference = $3, category = $4, stock = $5, price = $6,
         supplier = $7, status = $8, description = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [user_id, name, reference, category, stock, price, supplier, status, description, id]
    );

    if (updateRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    await client.query(`DELETE FROM product_warehouses WHERE product_id = $1`, [id]);

    if (warehouse_id && warehouse_id !== "none") {
      await client.query(
        `INSERT INTO product_warehouses (product_id, warehouse_value, stock, reserved, last_updated)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, warehouse_value) DO UPDATE
         SET stock = EXCLUDED.stock, reserved = EXCLUDED.reserved, last_updated = NOW()`,
        [id, warehouse_id, stock, 0]
      );
    }

    await client.query(
      `UPDATE products
       SET stock = COALESCE((
         SELECT SUM(stock)::int FROM product_warehouses WHERE product_id = $1
       ), $2),
       updated_at = NOW()
       WHERE id = $1`,
      [id, stock]
    );

    await client.query("COMMIT");

    const fresh = await client.query(`SELECT * FROM products WHERE id = $1`, [id]);
    return NextResponse.json(fresh.rows[0], { status: 200 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Erreur PostgreSQL (PUT) :", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const productId = Number(idParam);
    if (!productId || Number.isNaN(productId)) {
      return NextResponse.json({ error: "Paramètre 'id' requis et valide" }, { status: 400 });
    }

    await client.query("BEGIN");
    await client.query(`DELETE FROM product_warehouses WHERE product_id = $1`, [productId]);
    const del = await client.query(`DELETE FROM products WHERE id = $1 RETURNING *`, [productId]);
    if (del.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }
    await client.query("COMMIT");
    return NextResponse.json(del.rows[0], { status: 200 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Erreur PostgreSQL (DELETE) :", err);
    return NextResponse.json({ error: err?.message ?? "Erreur serveur" }, { status: 500 });
  } finally {
    client.release();
  }
}
