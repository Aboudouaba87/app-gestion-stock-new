export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Helper commun
function toNumberSafe(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const companyId = Number(user.company_id);
    if (!companyId || Number.isNaN(companyId)) {
      console.error("❌ company_id invalide dans la session:", user.company_id);
      return NextResponse.json(
        { error: "company_id invalide pour l'utilisateur connecté" },
        { status: 500 }
      );
    }

    const result = await pool.query(
      `SELECT p.id, p.user_id, p.name, p.reference, p.category,
              p.stock, p.price, p.supplier, p.status, p.description,
              p.created_at, p.updated_at
       FROM products p
       WHERE p.company_id = $1
       ORDER BY p.id ASC`,
      [companyId]
    );

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (GET) :", err);
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}




// Fonction POST - Créer un nouveau produit pour la company de l'utilisateur connecté
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    console.log("📨 POST /api/products - Body reçu:", body);

    const {
      name,
      reference,
      category,
      stock,
      price,
      cost_price = null, // 🔥 AJOUT
      supplier,
      status,
      description,
      warehouse_id,
    } = body ?? {};

    if (!name || !reference) {
      return NextResponse.json(
        { error: "Champs 'name' et 'reference' requis" },
        { status: 400 }
      );
    }

    const initialStock = toNumberSafe(stock, 0);

    const finalWarehouseId =
      warehouse_id &&
        warehouse_id !== "none" &&
        warehouse_id !== 0 &&
        String(warehouse_id).toLowerCase() !== "none"
        ? String(warehouse_id)
        : null;

    await client.query("BEGIN");

    // Unicité de la référence dans la même company
    const existingProduct = await client.query(
      `SELECT id FROM products
       WHERE reference = $1 AND company_id = $2`,
      [reference, user.company_id]
    );

    if (existingProduct.rowCount > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `La référence "${reference}" existe déjà pour cette entreprise.`,
        },
        { status: 409 }
      );
    }

    const insertProduct = await client.query(
      `INSERT INTO products (
        user_id, name, reference, category, stock, price,
        cost_price, supplier, description, status, company_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        user.id,
        name,
        reference,
        category,
        stock,
        price,
        cost_price, // 🔥 SAUVEGARDE
        supplier,
        description,
        status,
        user.company_id,
      ]
    );

    const newProduct = insertProduct.rows[0];

    // Vérification warehouse dans la même company
    if (finalWarehouseId) {
      const warehouseCheck = await client.query(
        `SELECT id, value
         FROM warehouses
         WHERE value = $1 AND company_id = $2`,
        [finalWarehouseId, user.company_id]
      );

      if (warehouseCheck.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: `L'entrepôt "${finalWarehouseId}" n'existe pas pour cette entreprise.`,
          },
          { status: 400 }
        );
      }

      const warehouseRow = warehouseCheck.rows[0];

      // product_warehouses: stock par entrepôt
      await client.query(
        `INSERT INTO product_warehouses (
           product_id, warehouse_value, company_id,
           stock, reserved, last_updated
         )
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (product_id, warehouse_value, company_id) DO UPDATE
         SET stock = EXCLUDED.stock,
             reserved = EXCLUDED.reserved,
             last_updated = NOW()`,
        [newProduct.id, warehouseRow.value, user.company_id, initialStock, 0]
      );

      // stock_movements: mouvement d'entrée initial
      if (initialStock > 0) {
        console.log("📝 Création mouvement initial:", {
          productId: newProduct.id,
          company_id: user.company_id,
          user_id: user.id,
          quantity: initialStock,
          warehouse_id: warehouseRow.id,
        });

        await client.query(
          `INSERT INTO stock_movements (
             product_id, company_id, user_id,
             type, movement_type, quantity,
             from_warehouse_id, to_warehouse_id,
             reference, created_at, metadata
           )
           VALUES (
             $1, $2, $3,
             $4, $5, $6,
             $7, $8,
             $9, NOW(), $10
           )`,
          [
            newProduct.id,
            user.company_id,
            user.id,
            "in",           // type (direction logique)
            "IN",           // movement_type (IN/OUT)
            initialStock,
            null,           // from_warehouse_id (entrée)
            warehouseRow.id, // to_warehouse_id
            `CREATION-${reference}`,
            JSON.stringify({
              product_name: name,
              action: "creation",
              initial_stock: initialStock,
              warehouse_value: warehouseRow.value,
              warehouse_id: warehouseRow.id,
            }),
          ]
        );
      }
    }

    // Recalcule le stock global depuis product_warehouses
    await client.query(
      `UPDATE products
       SET stock = COALESCE(
         (SELECT SUM(stock)::int
          FROM product_warehouses
          WHERE product_id = $1
            AND company_id = $2),
         $3
       ),
       updated_at = NOW()
       WHERE id = $1`,
      [newProduct.id, user.company_id, initialStock]
    );

    await client.query("COMMIT");

    const fresh = await client.query(
      `SELECT * FROM products WHERE id = $1 AND company_id = $2`,
      [newProduct.id, user.company_id]
    );

    return NextResponse.json(fresh.rows[0], { status: 201 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur PostgreSQL (POST) :", err);

    if (err.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Cette référence existe déjà dans la base pour cette entreprise.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}


// PUT pour modifier un produit et DELETE pour supprimer un produit peuvent être ajoutés ici de manière similaire,

export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    console.log("✅ PUT /api/products called");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    console.log("📦 PUT Request body:", body);

    const {
      id,
      product_id,
      name,
      reference,
      category,
      stock: newStockRaw,
      price,
      supplier,
      status,
      description,
      warehouse_id,
    } = body;

    const productId = id || product_id;
    if (!productId) {
      return NextResponse.json(
        { error: "ID du produit requis" },
        { status: 400 }
      );
    }

    const newStock = toNumberSafe(newStockRaw, 0);

    const finalWarehouseId =
      warehouse_id &&
        warehouse_id !== "none" &&
        warehouse_id !== 0 &&
        String(warehouse_id).toLowerCase() !== "none"
        ? String(warehouse_id)
        : null;

    await client.query("BEGIN");

    // Produit de cette company ?
    const oldProductRes = await client.query(
      `SELECT id, name, reference, stock
       FROM products
       WHERE id = $1 AND company_id = $2`,
      [productId, user.company_id]
    );

    if (oldProductRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Produit non trouvé pour cette entreprise" },
        { status: 404 }
      );
    }

    const oldProduct = oldProductRes.rows[0];
    const oldStock = oldProduct.stock;
    const stockDifference = newStock - oldStock;

    console.log("📊 Analyse stock:", {
      ancien: oldStock,
      nouveau: newStock,
      difference: stockDifference,
      warehouse: finalWarehouseId,
    });

    // Mise à jour du produit
    const updateRes = await client.query(
      `UPDATE products SET
         user_id = $1,
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
         AND company_id = $11
       RETURNING *`,
      [
        user.id,
        String(name || oldProduct.name),
        String(reference || oldProduct.reference),
        category ?? null,
        newStock,
        toNumberSafe(price, 0),
        supplier ?? null,
        status ??
        (newStock === 0
          ? "out_of_stock"
          : newStock <= 10
            ? "low_stock"
            : "active"),
        description ?? null,
        productId,
        user.company_id,
      ]
    );

    if (updateRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Produit non trouvé ou non autorisé" },
        { status: 404 }
      );
    }

    // Gestion des entrepôts + mouvements
    let warehouseRow: { id: number; value: string } | null = null;

    if (finalWarehouseId) {
      const warehouseCheck = await client.query(
        `SELECT id, value
         FROM warehouses
         WHERE value = $1 AND company_id = $2`,
        [finalWarehouseId, user.company_id]
      );

      if (warehouseCheck.rowCount === 0) {
        await client.query("ROLLBACK");
        const availableWarehouses = await client.query(
          `SELECT value FROM warehouses WHERE company_id = $1`,
          [user.company_id]
        );

        return NextResponse.json(
          {
            error: `L'entrepôt "${finalWarehouseId}" n'existe pas pour cette entreprise. Entrepôts disponibles: ${availableWarehouses.rows
              .map((w) => w.value)
              .join(", ")}`,
          },
          { status: 400 }
        );
      }

      warehouseRow = warehouseCheck.rows[0];

      // Ancien stock dans cet entrepôt
      const oldWarehouseRes = await client.query(
        `SELECT stock
         FROM product_warehouses
         WHERE product_id = $1
           AND warehouse_value = $2
           AND company_id = $3`,
        [productId, warehouseRow.value, user.company_id]
      );

      const oldWarehouseStock =
        oldWarehouseRes.rowCount > 0 ? oldWarehouseRes.rows[0].stock : 0;

      // Upsert product_warehouses
      await client.query(
        `INSERT INTO product_warehouses (
           product_id, warehouse_value, company_id,
           stock, reserved, last_updated
         )
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (product_id, warehouse_value, company_id) DO UPDATE
         SET stock = EXCLUDED.stock,
             reserved = EXCLUDED.reserved,
             last_updated = NOW()`,
        [productId, warehouseRow.value, user.company_id, newStock, 0]
      );

      if (stockDifference !== 0) {
        const movementType = stockDifference > 0 ? "IN" : "OUT";
        const movementDirection = stockDifference > 0 ? "in" : "out";

        console.log("📝 Insertion stock_movements avec:", {
          productId,
          company_id: user.company_id,
          user_id: user.id,
          direction: movementDirection,
          type: movementType,
          quantity: Math.abs(stockDifference),
          from_warehouse_id: stockDifference > 0 ? null : warehouseRow.id,
          to_warehouse_id: stockDifference > 0 ? warehouseRow.id : null,
        });

        await client.query(
          `INSERT INTO stock_movements (
             product_id, company_id, user_id,
             type, movement_type, quantity,
             from_warehouse_id, to_warehouse_id,
             reference, created_at, metadata
           )
           VALUES (
             $1, $2, $3,
             $4, $5, $6,
             $7, $8,
             $9, NOW(), $10
           )`,
          [
            productId,
            user.company_id,
            user.id,
            movementDirection,
            movementType,
            Math.abs(stockDifference),
            stockDifference > 0 ? null : warehouseRow.id,
            stockDifference > 0 ? warehouseRow.id : null,
            `MODIF-${oldProduct.reference}`,
            JSON.stringify({
              product_name: oldProduct.name,
              action: "stock_update",
              old_stock: oldStock,
              new_stock: newStock,
              difference: stockDifference,
              warehouse_value: warehouseRow.value,
              warehouse_id: warehouseRow.id,
              old_warehouse_stock: oldWarehouseStock,
              new_warehouse_stock: newStock,
            }),
          ]
        );
      }
    } else {
      // pas d'entrepôt: on nettoie les lignes d'entrepôt
      await client.query(
        `DELETE FROM product_warehouses
         WHERE product_id = $1
           AND company_id = $2`,
        [productId, user.company_id]
      );
    }

    // Recalcule le stock global depuis product_warehouses
    await client.query(
      `UPDATE products
       SET stock = COALESCE(
         (SELECT SUM(stock)::int
          FROM product_warehouses
          WHERE product_id = $1
            AND company_id = $2),
         $3
       ),
       updated_at = NOW()
       WHERE id = $1
         AND company_id = $2`,
      [productId, user.company_id, newStock]
    );

    await client.query("COMMIT");

    const freshProduct = await client.query(
      `SELECT *
       FROM products
       WHERE id = $1 AND company_id = $2`,
      [productId, user.company_id]
    );

    console.log("✅ Product updated successfully");
    return NextResponse.json(freshProduct.rows[0], { status: 200 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("❌ PUT Error:", err);
    return NextResponse.json(
      {
        error: err?.message ?? "Erreur lors de la modification du produit",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}



// DELETE - Supprimer un produit de la company de l'utilisateur connecté
export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    console.log("🔍 DELETE /api/products called");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json(
        { error: "Paramètre 'id' requis" },
        { status: 400 }
      );
    }

    const productId = Number(idParam);
    if (!productId || Number.isNaN(productId)) {
      return NextResponse.json(
        { error: "Paramètre 'id' requis et valide" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // Produit + vérif company
    const productInfo = await client.query(
      `SELECT id, name, reference, stock
       FROM products
       WHERE id = $1 AND company_id = $2`,
      [productId, user.company_id]
    );

    if (productInfo.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Produit non trouvé pour cette entreprise" },
        { status: 404 }
      );
    }

    const { name, reference, stock } = productInfo.rows[0];

    // Stocks par entrepôt pour cette company avec l'ID de l'entrepôt
    const warehouseStocks = await client.query(
      `SELECT pw.warehouse_value, pw.stock, w.id as warehouse_id
       FROM product_warehouses pw
       LEFT JOIN warehouses w ON w.value = pw.warehouse_value AND w.company_id = pw.company_id
       WHERE pw.product_id = $1
         AND pw.company_id = $2`,
      [productId, user.company_id]
    );

    console.log("📦 Stocks par entrepôt:", warehouseStocks.rows);

    // Mouvement de sortie pour chaque entrepôt
    for (const warehouse of warehouseStocks.rows) {
      if (warehouse.stock > 0) {
        // Utiliser warehouse.id (bigint) au lieu de warehouse_value (string)
        await client.query(
          `INSERT INTO stock_movements (
             product_id, company_id, user_id,
             type, movement_type, quantity,
             from_warehouse_id, to_warehouse_id,
             reference, created_at, metadata
           )
           VALUES (
             $1, $2, $3,
             'out', 'ADJUST', $4,
             $5, NULL,
             $6, NOW(), $7
           )`,
          [
            productId,
            user.company_id,
            user.id,
            warehouse.stock,
            warehouse.warehouse_id, // <-- CORRECTION: Utiliser l'ID (bigint) au lieu de la valeur (string)
            `SUPPR-${reference}`,
            JSON.stringify({
              product_name: name,
              action: "delete",
              warehouse_value: warehouse.warehouse_value, // Conserver la valeur dans metadata
              warehouse_id: warehouse.warehouse_id,
              stock_removed: warehouse.stock,
            }),
          ]
        );
      }
    }

    // Supprimer les lignes d'entrepôt pour cette company
    await client.query(
      `DELETE FROM product_warehouses
       WHERE product_id = $1
         AND company_id = $2`,
      [productId, user.company_id]
    );

    // Supprimer le produit (scopé par company_id)
    const del = await client.query(
      `DELETE FROM products
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [productId, user.company_id]
    );

    if (del.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Produit non trouvé ou non autorisé" },
        { status: 404 }
      );
    }

    await client.query("COMMIT");

    console.log("✅ Product deleted successfully:", productId);
    return NextResponse.json(
      {
        message: "Produit supprimé avec succès",
        deleted_product: del.rows[0],
      },
      { status: 200 }
    );
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Rollback error:", rollbackErr);
    }

    console.error("❌ DELETE Error:", err);
    return NextResponse.json(
      {
        error: err?.message ?? "Erreur serveur lors de la suppression",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
