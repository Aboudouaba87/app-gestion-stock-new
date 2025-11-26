import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

console.log("✅ API Products route loaded");

function toNumberSafe(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

// GET - Récupérer tous les produits
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

// POST - Créer un nouveau produit
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    console.log("📨 POST /api/products - Body reçu:", body);

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
      return NextResponse.json(
        { error: "Champs 'user_id', 'name' et 'reference' requis" },
        { status: 400 }
      );
    }

    const initialStock = toNumberSafe(stock, 0);

    // CORRECTION : Les warehouses utilisent des textes (main, south, north)
    const finalWarehouseId =
      warehouse_id &&
        warehouse_id !== "none" &&
        warehouse_id !== 0 &&
        String(warehouse_id).toLowerCase() !== "none"
        ? String(warehouse_id)
        : null;

    console.log("🏪 Warehouse_id final:", finalWarehouseId);
    console.log("📊 Stock initial:", initialStock);
    console.log("🔖 Référence:", reference);

    await client.query("BEGIN");

    // Vérifier si la référence existe déjà
    const existingProduct = await client.query(
      `SELECT id FROM products WHERE reference = $1`,
      [reference]
    );

    if (existingProduct.rowCount > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `La référence "${reference}" existe déjà. Veuillez utiliser une référence unique.`,
        },
        { status: 409 }
      );
    }

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
        status ??
        (initialStock === 0
          ? "out_of_stock"
          : initialStock <= 10
            ? "low_stock"
            : "active"),
        description ?? null,
      ]
    );

    const newProduct = insertProduct.rows[0];
    console.log("✅ Produit créé avec ID:", newProduct.id);

    // CORRECTION : Gestion des entrepôts avec valeurs textuelles
    if (finalWarehouseId) {
      console.log("🏪 Insertion dans product_warehouses avec warehouse:", finalWarehouseId);

      // Vérifier que le warehouse existe
      const warehouseCheck = await client.query(
        `SELECT value FROM warehouses WHERE value = $1`,
        [finalWarehouseId]
      );

      if (warehouseCheck.rowCount === 0) {
        await client.query("ROLLBACK");
        console.log("❌ Warehouse non trouvé:", finalWarehouseId);
        return NextResponse.json(
          { error: `L'entrepôt "${finalWarehouseId}" n'existe pas` },
          { status: 400 }
        );
      }

      await client.query(
        `INSERT INTO product_warehouses (product_id, warehouse_value, stock, reserved, last_updated)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, warehouse_value) DO UPDATE
         SET stock = EXCLUDED.stock, reserved = EXCLUDED.reserved, last_updated = NOW()`,
        [newProduct.id, finalWarehouseId, initialStock, 0]
      );

      // Enregistrement du mouvement de stock pour l'ajout
      if (initialStock > 0) {
        console.log("📝 Création du mouvement de stock pour l'ajout");

        const movementResult = await client.query(
          `INSERT INTO stock_movements (
             product_id, type, movement_type, quantity,
             from_warehouse, to_warehouse,
             reference, created_at, metadata
           )
           VALUES ($1, 'in', 'IN', $2, NULL, $3, $4, NOW(), $5)
           RETURNING id`,
          [
            newProduct.id,
            initialStock,
            finalWarehouseId,
            `AJOUT-${reference}`,
            JSON.stringify({
              product_name: name,
              action: "creation",
              initial_stock: initialStock,
              warehouse: finalWarehouseId
            }),
          ]
        );

        console.log(
          "✅ Mouvement de stock créé avec ID:",
          movementResult.rows[0]?.id
        );
      } else {
        console.log("ℹ️ Stock initial à 0, pas de mouvement créé");
      }
    } else {
      console.log("❌ Aucun warehouse_id spécifié, pas de mouvement de stock");
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

    const fresh = await client.query(`SELECT * FROM products WHERE id = $1`, [
      newProduct.id,
    ]);
    return NextResponse.json(fresh.rows[0], { status: 201 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur PostgreSQL (POST) :", err);

    // Gestion spécifique des erreurs de contrainte unique
    if (err.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Cette référence existe déjà dans la base de données. Veuillez utiliser une référence unique.",
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

// PUT - Modifier un produit
export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    console.log("✅ PUT /api/products called");

    const body = await request.json();
    console.log("📦 PUT Request body:", body);

    const {
      id,
      product_id,
      user_id,
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

    // Utiliser id ou product_id
    const productId = id || product_id;
    if (!productId) {
      return NextResponse.json(
        { error: "ID du produit requis" },
        { status: 400 }
      );
    }

    const newStock = toNumberSafe(newStockRaw, 0);

    // CORRECTION : Les warehouses utilisent des textes (main, south, north)
    const finalWarehouseId =
      warehouse_id &&
        warehouse_id !== "none" &&
        warehouse_id !== 0 &&
        String(warehouse_id).toLowerCase() !== "none"
        ? String(warehouse_id)
        : null;

    console.log("🏪 Warehouse_id final:", finalWarehouseId);
    console.log("📊 Nouveau stock:", newStock);

    await client.query("BEGIN");

    // CORRECTION : Vérifier si le warehouse existe (avec texte)
    if (finalWarehouseId) {
      const warehouseCheck = await client.query(
        `SELECT value FROM warehouses WHERE value = $1`,
        [finalWarehouseId]
      );

      if (warehouseCheck.rowCount === 0) {
        await client.query("ROLLBACK");
        console.log("❌ Warehouse non trouvé:", finalWarehouseId);

        // Afficher les warehouses disponibles pour debug
        const availableWarehouses = await client.query(
          `SELECT value, label FROM warehouses`
        );
        console.log("🏪 Warehouses disponibles:", availableWarehouses.rows);

        return NextResponse.json(
          { error: `L'entrepôt "${finalWarehouseId}" n'existe pas. Entrepôts disponibles: ${availableWarehouses.rows.map(w => w.value).join(', ')}` },
          { status: 400 }
        );
      }
      console.log("✅ Warehouse trouvé:", finalWarehouseId);
    }

    // Récupérer l'ancien produit
    const oldProductRes = await client.query(
      `SELECT name, reference, stock FROM products WHERE id = $1`,
      [productId]
    );

    if (oldProductRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Produit non trouvé" },
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
    });

    // Mettre à jour le produit
    const updateRes = await client.query(
      `UPDATE products SET
         user_id = $1, name = $2, reference = $3, category = $4, stock = $5, price = $6,
         supplier = $7, status = $8, description = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        toNumberSafe(user_id, 1),
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
      ]
    );

    console.log("✅ Produit mis à jour");

    // CORRECTION : Gestion des entrepôts avec finalWarehouseId (texte)
    if (finalWarehouseId) {
      console.log("🏪 Traitement de l'entrepôt:", finalWarehouseId);

      // Récupérer l'ancien stock de l'entrepôt
      const oldWarehouseRes = await client.query(
        `SELECT stock FROM product_warehouses WHERE product_id = $1 AND warehouse_value = $2`,
        [productId, finalWarehouseId]
      );

      const oldWarehouseStock =
        oldWarehouseRes.rowCount > 0 ? oldWarehouseRes.rows[0].stock : 0;

      console.log("🏪 Ancien stock entrepôt:", oldWarehouseStock);

      // Mettre à jour ou insérer dans product_warehouses
      await client.query(
        `INSERT INTO product_warehouses (product_id, warehouse_value, stock, reserved, last_updated)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, warehouse_value) DO UPDATE
         SET stock = $3, last_updated = NOW()`,
        [productId, finalWarehouseId, newStock, 0]
      );

      console.log("✅ Product_warehouses mis à jour");

      // Enregistrer le mouvement de stock si différence
      if (stockDifference !== 0) {
        const movementType = stockDifference > 0 ? "IN" : "OUT";
        const movementDirection = stockDifference > 0 ? "in" : "out";

        console.log("📝 Création mouvement de stock:", {
          type: movementType,
          quantité: Math.abs(stockDifference),
        });

        const movementResult = await client.query(
          `INSERT INTO stock_movements (
             product_id, type, movement_type, quantity,
             from_warehouse, to_warehouse,
             reference, created_at, metadata
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
           RETURNING id`,
          [
            productId,
            movementDirection,
            movementType,
            Math.abs(stockDifference),
            stockDifference > 0 ? null : finalWarehouseId,
            stockDifference > 0 ? finalWarehouseId : null,
            `MODIF-${oldProduct.reference}`,
            JSON.stringify({
              product_name: oldProduct.name,
              action: "stock_update",
              old_stock: oldStock,
              new_stock: newStock,
              difference: stockDifference,
              warehouse: finalWarehouseId,
              old_warehouse_stock: oldWarehouseStock,
              new_warehouse_stock: newStock,
            }),
          ]
        );

        console.log(
          "✅ Mouvement de stock créé avec ID:",
          movementResult.rows[0]?.id
        );
      } else {
        console.log("ℹ️ Pas de différence de stock, pas de mouvement créé");
      }
    } else {
      // Si pas d'entrepôt spécifié, supprimer les entrées d'entrepôt
      console.log("❌ Aucun warehouse_id spécifié, suppression des entrepôts");
      await client.query(`DELETE FROM product_warehouses WHERE product_id = $1`, [
        productId,
      ]);
    }

    await client.query("COMMIT");

    // Récupérer le produit mis à jour
    const freshProduct = await client.query(
      `SELECT * FROM products WHERE id = $1`,
      [productId]
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

// DELETE - Supprimer un produit
export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    console.log("🔍 DELETE API called");

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    console.log("📦 Raw idParam from URL:", idParam);

    if (!idParam) {
      return NextResponse.json({
        error: "Paramètre 'id' requis"
      }, { status: 400 });
    }

    const productId = Number(idParam);
    console.log("🔢 Parsed productId:", productId);

    if (!productId || Number.isNaN(productId)) {
      return NextResponse.json({
        error: "Paramètre 'id' requis et valide"
      }, { status: 400 });
    }

    await client.query("BEGIN");

    // Récupérer les informations du produit avant suppression
    const productInfo = await client.query(
      `SELECT name, reference, stock FROM products WHERE id = $1`,
      [productId]
    );

    if (productInfo.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    const productName = productInfo.rows[0].name;
    const productReference = productInfo.rows[0].reference;
    const productStock = productInfo.rows[0].stock;

    // Récupérer les stocks par entrepôt avant suppression
    const warehouseStocks = await client.query(
      `SELECT warehouse_value, stock FROM product_warehouses WHERE product_id = $1`,
      [productId]
    );

    // Enregistrement des mouvements de stock pour la suppression
    for (const warehouse of warehouseStocks.rows) {
      if (warehouse.stock > 0) {
        await client.query(
          `INSERT INTO stock_movements (
             product_id, type, movement_type, quantity,
             from_warehouse, to_warehouse,
             reference, created_at, metadata
           )
           VALUES ($1, 'out', 'ADJUST', $2, $3, NULL, $4, NOW(), $5)`,
          [
            productId,
            warehouse.stock,
            warehouse.warehouse_value,
            `SUPPR-${productReference}`,
            JSON.stringify({
              product_name: productName,
              action: 'delete',
              warehouse: warehouse.warehouse_value,
              stock_removed: warehouse.stock
            })
          ]
        );
      }
    }

    // Supprimer les données associées
    await client.query(`DELETE FROM product_warehouses WHERE product_id = $1`, [productId]);
    const del = await client.query(`DELETE FROM products WHERE id = $1 RETURNING *`, [productId]);

    if (del.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    await client.query("COMMIT");

    console.log("✅ Product deleted successfully:", productId);
    return NextResponse.json({
      message: "Produit supprimé avec succès",
      deleted_product: del.rows[0]
    }, { status: 200 });

  } catch (err: any) {
    // Rollback sécurisé
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Rollback error:", rollbackErr);
    }

    console.error("❌ DELETE Error:", err);
    return NextResponse.json({
      error: err?.message ?? "Erreur serveur lors de la suppression"
    }, { status: 500 });
  } finally {
    client.release();
  }
}