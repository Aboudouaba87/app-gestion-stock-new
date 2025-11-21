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

// POST : créer une vente avec client auto et numéro unique
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Reçu dans POST /api/sales :", body);

    const { date, customerEmail, amount, status, paymentStatus, items, products } = body;

    if (
      typeof customerEmail !== "string" ||
      typeof amount !== "number" ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return NextResponse.json({ error: "Champs requis invalides ou manquants" }, { status: 400 });
    }

    // Vérifier ou créer le client
    let clientRes = await pool.query(`SELECT id FROM clients WHERE email = $1`, [customerEmail]);
    let clientId: number;

    if (clientRes.rowCount === 0) {
      const newClient = await pool.query(
        `INSERT INTO clients (name, email, type, created_at, updated_at)
         VALUES ($1, $1, 'Particulier', NOW(), NOW()) RETURNING id`,
        [customerEmail]
      );
      clientId = newClient.rows[0].id;
    } else {
      clientId = clientRes.rows[0].id;
    }

    // Générer un numéro de commande unique
    const nextIdRes = await pool.query(`SELECT nextval('sales_id_seq')`);
    const nextId = nextIdRes.rows[0].nextval;
    const orderNumber = `CMD-${new Date().getFullYear()}-${String(nextId).padStart(3, "0")}`;

    // Vérifier et mettre à jour le stock
    for (const p of products) {
      const stockRes = await pool.query(
        `SELECT stock FROM products WHERE name = $1`,
        [p.name]
      );

      if (stockRes.rowCount === 0) {
        return NextResponse.json({ error: `Produit introuvable : ${p.name}` }, { status: 404 });
      }

      const currentStock = stockRes.rows[0].stock;
      if (currentStock < p.quantity) {
        return NextResponse.json({ error: `Stock insuffisant pour ${p.name}` }, { status: 400 });
      }

      await pool.query(
        `UPDATE products SET stock = stock - $1 WHERE name = $2`,
        [p.quantity, p.name]
      );
    }

    // Insérer la vente
    const saleRes = await pool.query(
      `INSERT INTO sales (order_number, date, client_id, amount, status, payment_status, items, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING id`,
      [orderNumber, date, clientId, amount, status, paymentStatus, items]
    );
    const saleId = saleRes.rows[0].id;

    // Insérer les produits vendus
    for (const p of products) {
      await pool.query(
        `INSERT INTO sale_products (sale_id, name, quantity, price) VALUES ($1,$2,$3,$4)`,
        [saleId, p.name, p.quantity, p.price]
      );
    }

    const newSale = await getSaleById(saleId);
    return NextResponse.json(newSale, { status: 201 });
  } catch (err: any) {
    console.error("Erreur POST /api/sales :", err);
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
