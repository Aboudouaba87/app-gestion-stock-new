// app/api/sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// ---------- Helpers ----------

async function getSaleById(id: number) {
  const result = await pool.query(
    `
    SELECT
      s.id,
      s.order_number AS "orderNumber",
      s.date,
      s.warehouse_id AS "warehouseId",
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

function toNumber(n: any, fallback?: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback ?? NaN;
  return v;
}

// Helper to find warehouse_id for a sale by its order number
async function getWarehouseIdForSaleByOrder(orderNumber: string): Promise<number | string | null> {
  const res = await pool.query(
    `SELECT warehouse_id FROM sales WHERE order_number = $1 LIMIT 1`,
    [orderNumber]
  );
  if (res.rowCount === 0) return null;
  return res.rows[0].warehouse_id;
}

// ---------- GET: list sales ----------

export async function GET(_request: NextRequest) {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.order_number AS "orderNumber",
        s.date,
        s.warehouse_id AS "warehouseId",
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
      ORDER BY s.date DESC, s.id DESC
    `);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("Erreur GET /api/sales:", err?.stack || err);
    return NextResponse.json(
      { error: "Erreur interne lors de la lecture des ventes" },
      { status: 500 }
    );
  }
}

// ---------- POST: create sale with per-warehouse stock update ----------

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      orderNumber: providedOrderNumber,
      date,
      customerEmail,
      amount,
      status,
      paymentStatus,
      items,
      warehouseId,
      products,
    } = body;

    console.log("=== DEBUG PAYLOAD ===");
    console.log("orderNumber:", providedOrderNumber);
    console.log("date:", date, "Type:", typeof date);
    console.log("amount:", amount, "Type:", typeof amount);
    console.log("status:", status);
    console.log("paymentStatus:", paymentStatus);
    console.log("items:", items, "Type:", typeof items);
    console.log("warehouseId:", warehouseId);
    console.log("products:", products);
    console.log("=== FIN DEBUG ===");

    // Validation des champs requis
    if (
      !customerEmail ||
      !warehouseId ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Champs requis manquants: customerEmail, warehouseId ou produits",
        },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // Vérifier ou créer le client
    const clientRes = await client.query(
      `SELECT id, name FROM clients WHERE email = $1`,
      [customerEmail]
    );
    let clientId;
    let clientName;

    if (clientRes.rowCount > 0) {
      clientId = clientRes.rows[0].id;
      clientName = clientRes.rows[0].name;
      console.log("Client existant trouvé:", clientName);
    } else {
      // Créer un nouveau client
      const newClientRes = await client.query(
        `INSERT INTO clients (name, email, type, created_at, updated_at)
         VALUES ($1, $2, 'Particulier', NOW(), NOW()) RETURNING id, name`,
        [customerEmail.split("@")[0], customerEmail]
      );
      clientId = newClientRes.rows[0].id;
      clientName = newClientRes.rows[0].name;
      console.log("Nouveau client créé:", clientName);
    }

    // Générer orderNumber unique
    let orderNumber = providedOrderNumber;
    if (!orderNumber) {
      const nextIdResult = await client.query(
        `SELECT nextval('sales_id_seq') as nextval`
      );
      let nextId = nextIdResult.rows[0].nextval;
      orderNumber = `CMD-${new Date().getFullYear()}-${String(nextId).padStart(
        3,
        "0"
      )}`;
    } else {
      const exists = await client.query(
        `SELECT 1 FROM sales WHERE order_number = $1`,
        [orderNumber]
      );
      if (exists.rowCount > 0) {
        return NextResponse.json(
          { error: `Numéro de commande déjà utilisé: ${orderNumber}` },
          { status: 409 }
        );
      }
    }

    console.log("OrderNumber utilisé:", orderNumber);

    // Calculer le montant total à partir des produits
    let totalAmount = 0;
    let totalItems = 0;

    if (amount) {
      totalAmount = Number(amount);
    } else {
      // Calculer le montant depuis les produits
      totalAmount = products.reduce((sum, product) => {
        return sum + Number(product.price) * Number(product.quantity);
      }, 0);
      // Ajouter la TVA 20%
      totalAmount = totalAmount * 1.2;
    }

    totalItems =
      Number(items) ||
      products.reduce((sum, product) => sum + Number(product.quantity), 0);

    console.log("Montant calculé:", totalAmount);
    console.log("Items calculés:", totalItems);

    // Traiter chaque produit
    for (const p of products) {
      const qty = Number(p.quantity);
      const price = Number(p.price);
      const productName = String(p.name);

      console.log(`Traitement du produit: ${productName}, quantité: ${qty}`);

      // Recherche du produit
      const prodRes = await client.query(
        `SELECT id, name, stock FROM products WHERE name = $1`,
        [productName]
      );

      let productId;
      if (prodRes.rowCount === 0) {
        // Essayer une recherche plus flexible
        const prodResFlex = await client.query(
          `SELECT id, name, stock FROM products WHERE name ILIKE $1`,
          [`%${productName}%`]
        );

        if (prodResFlex.rowCount === 0) {
          throw new Error(`Produit introuvable: ${productName}`);
        }

        console.log(
          "Produit trouvé avec recherche flexible:",
          prodResFlex.rows[0]
        );
        productId = prodResFlex.rows[0].id;
      } else {
        console.log("Produit trouvé:", prodRes.rows[0]);
        productId = prodRes.rows[0].id;
      }

      // Vérification du stock
      const stockRes = await client.query(
        `SELECT stock FROM product_warehouses WHERE product_id = $1 AND warehouse_value = $2`,
        [productId, warehouseId]
      );

      if (stockRes.rowCount === 0) {
        throw new Error(
          `Produit ${productName} non disponible dans l'entrepôt ${warehouseId}`
        );
      }

      const availableStock = stockRes.rows[0].stock;
      if (availableStock < qty) {
        throw new Error(
          `Stock insuffisant pour ${productName} dans ${warehouseId}. Disponible: ${availableStock}, Demandé: ${qty}`
        );
      }

      console.log(`Stock suffisant: ${availableStock} unités disponibles`);

      // 1. Mise à jour du stock dans product_warehouses (spécifique à l'entrepôt)
      await client.query(
        `UPDATE product_warehouses SET stock = stock - $1, last_updated = NOW()
         WHERE product_id = $2 AND warehouse_value = $3`,
        [qty, productId, warehouseId]
      );

      // 2. Mise à jour du stock total dans products
      await client.query(
        `UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2`,
        [qty, productId]
      );

      console.log(`Stock mis à jour: -${qty} unités pour ${productName}`);

      // Enregistrement du mouvement de stock
      await client.query(
        `INSERT INTO stock_movements (
           product_id, type, movement_type, quantity,
           from_warehouse, to_warehouse,
           reference, created_at, metadata
         )
         VALUES ($1, 'out', 'OUT', $2, $3, NULL, $4, NOW(), '{}'::jsonb)`,
        [productId, qty, warehouseId, orderNumber]
      );

      console.log(`Mouvement de stock enregistré pour ${productName}`);
    }

    // Préparer les données pour l'insertion
    const saleDate = date || new Date().toISOString().split("T")[0];
    const finalStatus = status || "pending";
    const finalPaymentStatus = paymentStatus || "pending";

    console.log("Données finales pour insertion sales:", {
      orderNumber,
      date: saleDate,
      clientId,
      warehouseId,
      amount: totalAmount,
      status: finalStatus,
      paymentStatus: finalPaymentStatus,
      items: totalItems,
      customerName: clientName,
      customerEmail,
    });

    // Insertion de la vente
    const saleRes = await client.query(
      `INSERT INTO public.sales (
         order_number, date, client_id, warehouse_id,
         amount, status, payment_status, items,
         customer_name, customer_email,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING id`,
      [
        orderNumber,
        saleDate,
        clientId,
        warehouseId,
        totalAmount,
        finalStatus,
        finalPaymentStatus,
        totalItems,
        clientName,
        customerEmail,
      ]
    );

    const saleId = saleRes.rows[0].id;
    console.log("Vente créée avec ID:", saleId);

    // Insertion des produits vendus
    for (const p of products) {
      const productName = String(p.name);
      await client.query(
        `INSERT INTO sale_products (sale_id, name, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [saleId, productName, Number(p.quantity), Number(p.price)]
      );
    }

    console.log("Produits de vente enregistrés");

    await client.query("COMMIT");

    // Récupérer la vente créée pour la retourner
    const createdSale = await client.query(
      `SELECT 
         s.id,
         s.order_number AS "orderNumber",
         s.date,
         s.warehouse_id AS "warehouseId",
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
       WHERE s.id = $1`,
      [saleId]
    );

    await client.query("COMMIT");

    return NextResponse.json(createdSale.rows[0], { status: 201 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Erreur POST /api/sales:", err.message || err);
    return NextResponse.json(
      {
        error: err.message || "Erreur interne lors de la création de la vente",
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
    const body = await request.json();
    const { id, status, paymentStatus, isCancelling } = body;

    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    await client.query("BEGIN");

    // Récupérer l'ancien statut de la vente
    const oldSaleRes = await client.query(
      `SELECT status, order_number, warehouse_id FROM sales WHERE id = $1`,
      [id]
    );

    if (oldSaleRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
    }

    const oldStatus: string = oldSaleRes.rows[0].status;
    const orderNumber: string = oldSaleRes.rows[0].order_number;
    const warehouseId: string = oldSaleRes.rows[0].warehouse_id;

    // CAS 1: Annulation d'une vente (changement vers "cancelled")
    if (oldStatus !== "cancelled" && status === "cancelled") {
      console.log(`🔄 Annulation de la vente ${orderNumber} - Réinjection du stock`);

      // Lire les produits de la vente
      const linesRes = await client.query(
        `SELECT name, quantity FROM sale_products WHERE sale_id = $1`,
        [id]
      );

      // Réinjecter le stock pour chaque produit
      for (const line of linesRes.rows) {
        const productName = String(line.name);
        const qty = Number(line.quantity);

        // Trouver l'ID du produit
        const prodRes = await client.query(
          `SELECT id FROM products WHERE name = $1`,
          [productName]
        );
        if (prodRes.rowCount === 0) continue;

        const productId = prodRes.rows[0].id;

        // Réaugmenter le stock dans product_warehouses
        await client.query(
          `UPDATE product_warehouses
           SET stock = stock + $1, last_updated = NOW()
           WHERE product_id = $2 AND warehouse_value = $3`,
          [qty, productId, warehouseId]
        );

        // Réaugmenter le stock total dans products
        await client.query(
          `UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2`,
          [qty, productId]
        );

        // Enregistrer le mouvement de stock d'annulation (ENTRÉE de stock)
        await client.query(
          `INSERT INTO stock_movements (
             product_id, type, movement_type, quantity,
             from_warehouse, to_warehouse,
             reference, created_at, metadata
           )
           VALUES ($1, 'in', 'IN', $2, NULL, $3, $4, NOW(), $5)`,
          [productId, qty, warehouseId, `ANNULATION-${orderNumber}`, JSON.stringify({ sale_id: id, action: 'cancellation' })]
        );
      }
    }

    // CAS 2: Réactivation d'une vente (changement depuis "cancelled" vers un statut actif)
    if (oldStatus === "cancelled" && status !== "cancelled") {
      console.log(`🔄 Réactivation de la vente ${orderNumber} - Retrait du stock`);

      // Lire les produits de la vente
      const linesRes = await client.query(
        `SELECT name, quantity FROM sale_products WHERE sale_id = $1`,
        [id]
      );

      // Retirer à nouveau le stock pour chaque produit
      for (const line of linesRes.rows) {
        const productName = String(line.name);
        const qty = Number(line.quantity);

        // Trouver l'ID du produit
        const prodRes = await client.query(
          `SELECT id FROM products WHERE name = $1`,
          [productName]
        );
        if (prodRes.rowCount === 0) continue;

        const productId = prodRes.rows[0].id;

        // Vérifier si le stock est suffisant
        const stockRes = await client.query(
          `SELECT stock FROM product_warehouses WHERE product_id = $1 AND warehouse_value = $2`,
          [productId, warehouseId]
        );

        if (stockRes.rowCount === 0 || stockRes.rows[0].stock < qty) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: `Stock insuffisant pour le produit ${productName} dans l'entrepôt ${warehouseId}` },
            { status: 400 }
          );
        }

        // Retirer le stock dans product_warehouses
        await client.query(
          `UPDATE product_warehouses
           SET stock = stock - $1, last_updated = NOW()
           WHERE product_id = $2 AND warehouse_value = $3`,
          [qty, productId, warehouseId]
        );

        // Retirer le stock total dans products
        await client.query(
          `UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2`,
          [qty, productId]
        );

        // Enregistrer le mouvement de stock de réactivation (SORTIE de stock)
        await client.query(
          `INSERT INTO stock_movements (
             product_id, type, movement_type, quantity,
             from_warehouse, to_warehouse,
             reference, created_at, metadata
           )
           VALUES ($1, 'out', 'OUT', $2, $3, NULL, $4, NOW(), $5)`,
          [productId, qty, warehouseId, `REACTIVATION-${orderNumber}`, JSON.stringify({ sale_id: id, action: 'reactivation', from_status: oldStatus, to_status: status })]
        );
      }
    }

    // CAS 3: Mise à jour normale sans changement de statut d'annulation
    // Mettre à jour le statut de la vente
    await client.query(
      `UPDATE sales
       SET status = $1,
           payment_status = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [status, paymentStatus, id]
    );

    const updatedSale = await getSaleById(id);
    await client.query("COMMIT");

    return NextResponse.json(updatedSale, { status: 200 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Erreur PUT /api/sales:", err?.stack || err);
    return NextResponse.json({ error: "Erreur interne lors de la mise à jour" }, { status: 500 });
  } finally {
    client.release();
  }
}
// ---------- DELETE: cancel sale and re-inject stock to the right warehouse ----------

export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    if (!idParam)
      return NextResponse.json({ error: "id requis" }, { status: 400 });

    const saleId = Number(idParam);
    if (!Number.isFinite(saleId))
      return NextResponse.json({ error: "id invalide" }, { status: 400 });

    await client.query("BEGIN");

    // Read sale and lines
    const saleRes = await client.query(
      `SELECT order_number, warehouse_id FROM sales WHERE id = $1`,
      [saleId]
    );
    if (saleRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
    }
    const orderNumber: string = saleRes.rows[0].order_number;
    let warehouseId: number | string | null = saleRes.rows[0].warehouse_id;

    // Fallback if warehouse_id is null in sales
    if (warehouseId == null) {
      warehouseId = await getWarehouseIdForSaleByOrder(orderNumber);
      if (warehouseId == null) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "warehouse_id introuvable pour annulation" },
          { status: 400 }
        );
      }
    }

    const linesRes = await client.query(
      `SELECT name, quantity FROM sale_products WHERE sale_id = $1`,
      [saleId]
    );

    // Re-inject stock and trace IN movement
    for (const line of linesRes.rows) {
      const name = String(line.name);
      const qty = toNumber(line.quantity);

      const prodRes = await client.query(
        `SELECT id FROM products WHERE name = $1`,
        [name]
      );
      if (prodRes.rowCount === 0) continue;

      const productId = prodRes.rows[0].id;

      await client.query(
        `UPDATE product_warehouses
   SET stock = stock + $1, last_updated = NOW()
   WHERE product_id = $2 AND warehouse_value = $3`,
        [qty, productId, warehouseId]
      );

      await client.query(
        `UPDATE products SET updated_at = NOW() WHERE id = $1`,
        [productId]
      );

      await client.query(
        `INSERT INTO stock_movements (
     product_id, type, movement_type, quantity,
     from_warehouse, to_warehouse,
     reference, created_at, metadata
   )
   VALUES ($1, 'in', 'IN', $2, NULL, $3, $4, NOW(), '{}'::jsonb)`,
        [productId, qty, warehouseId, `ANNULATION-${orderNumber}`]
      );
    }

    // Delete sale and lines
    await client.query(`DELETE FROM sale_products WHERE sale_id = $1`, [
      saleId,
    ]);
    await client.query(`DELETE FROM sales WHERE id = $1`, [saleId]);

    await client.query("COMMIT");

    return NextResponse.json(
      { message: "Vente annulée, stock réinjecté" },
      { status: 200 }
    );
  } catch (err: any) {
    await (async () => {
      try {
        await pool.query("ROLLBACK");
      } catch { }
    })();
    console.error("Erreur DELETE /api/sales:", err?.stack || err);
    return NextResponse.json(
      { error: "Erreur interne lors de l'annulation" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
