import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// Fonction utilitaire pour formatter une vente
async function getSaleById(id: number) {
  const result = await pool.query(
    `
    SELECT
      s.id,
      s.order_number AS "orderNumber",
      s.date,
      c.name AS "customer",
      c.email AS "customerEmail",
      s.amount::float AS "amount",
      s.status,
      s.payment_status AS "paymentStatus",
      s.items,
      (
        SELECT json_agg(json_build_object(
          'name', sp.name,
          'quantity', sp.quantity,
          'price', sp.price::float
        ))
        FROM sale_products sp
        WHERE sp.sale_id = s.id
      ) AS products
    FROM sales s
    JOIN clients c ON s.client_id = c.id
    WHERE s.id = $1
    `,
    [id]
  );
  return result.rows[0];
}

// GET : récupérer toutes les ventes (ajoute Cache-Control: no-store)
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.order_number AS "orderNumber",
        s.date,
        c.name AS "customer",
        c.email AS "customerEmail",
        s.amount::float AS "amount",
        s.status,
        s.payment_status AS "paymentStatus",
        s.items,
        (
          SELECT json_agg(json_build_object(
            'name', sp.name,
            'quantity', sp.quantity,
            'price', sp.price::float
          ))
          FROM sale_products sp
          WHERE sp.sale_id = s.id
        ) AS products
      FROM sales s
      JOIN clients c ON s.client_id = c.id
      ORDER BY s.date DESC
    `);

    return NextResponse.json(result.rows, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


// POST : créer une vente + produits
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNumber, date, customerEmail, amount, status, paymentStatus, items, products } = body;

    // Vérifier le client
    const clientRes = await pool.query(`SELECT id FROM clients WHERE email = $1`, [customerEmail]);
    if (clientRes.rowCount === 0) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }
    const clientId = clientRes.rows[0].id;

    // Insérer la vente
    const saleRes = await pool.query(
      `INSERT INTO sales (order_number, date, client_id, amount, status, payment_status, items, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING id`,
      [orderNumber, date, clientId, amount, status, paymentStatus, items]
    );
    const saleId = saleRes.rows[0].id;

    // Insérer les produits
    for (const p of products) {
      await pool.query(
        `INSERT INTO sale_products (sale_id, name, quantity, price) VALUES ($1,$2,$3,$4)`,
        [saleId, p.name, p.quantity, p.price]
      );
    }

    // Retourner la vente complète formatée
    const newSale = await getSaleById(saleId);
    return NextResponse.json(newSale, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT : mettre à jour une vente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, paymentStatus } = body;

    if (!id) {
      return NextResponse.json({ error: "Champ 'id' requis" }, { status: 400 });
    }

    await pool.query(
      `UPDATE sales
       SET status = $1,
           payment_status = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [status, paymentStatus, id]
    );

    // Retourner la vente complète formatée
    const updatedSale = await getSaleById(id);
    return NextResponse.json(updatedSale, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE : supprimer une vente
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    await pool.query(`DELETE FROM sales WHERE id = $1`, [id]);
    return NextResponse.json({ message: "Vente supprimée" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
