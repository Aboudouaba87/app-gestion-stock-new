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




// Fonction POST - Créer un nouveau produit (version corrigée)
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    // 1. Vérification de l'authentification
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();

    // Validation minimale avant transaction
    if (!body.name?.trim() || !body.reference?.trim()) {
      return NextResponse.json(
        { error: "Champs 'name' et 'reference' requis" },
        { status: 400 }
      );
    }

    const {
      name,
      reference,
      category,
      category_id,
      stock = 0,
      price,
      cost_price = null,
      supplier,
      status = 'active',
      description,
      warehouse_id,
    } = body;

    // 2. Vérification d'unicité de la référence AVANT transaction
    const existingProduct = await client.query(
      `SELECT 1 FROM products 
       WHERE reference = $1 AND company_id = $2 
       LIMIT 1`,
      [reference, user.company_id]
    );

    if (existingProduct.rowCount > 0) {
      return NextResponse.json(
        { error: `La référence "${reference}" existe déjà pour cette entreprise.` },
        { status: 409 }
      );
    }

    // 3. Utilisation de la fonction toNumberSafe qui existe DÉJÀ en haut du fichier
    const initialStock = Math.max(0, toNumberSafe(stock, 0));

    // 4. Validation de l'ID d'entrepôt
    const validateWarehouseId = (warehouseId: any): string | null => {
      if (!warehouseId) return null;

      const idStr = String(warehouseId).toLowerCase().trim();

      if (idStr === "none" || idStr === "0" || idStr === "") {
        return null;
      }

      return String(warehouseId);
    };

    const finalWarehouseId = validateWarehouseId(warehouse_id);

    // 5. Début de la transaction
    await client.query("BEGIN");

    try {
      // 6. Insertion du produit principal
      const insertProduct = await client.query(
        `INSERT INTO products (
          user_id, name, reference, category, stock, price,
          cost_price, supplier, description, status, 
          company_id, category_id,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *`,
        [
          user.id,
          name,
          reference,
          category,
          initialStock, // Stock initial dans la table products
          price,
          cost_price,
          supplier,
          description,
          status,
          user.company_id,
          category_id
        ]
      );

      const newProduct = insertProduct.rows[0];

      // 7. Gestion de l'entrepôt si spécifié
      if (finalWarehouseId) {
        // Vérification optimisée de l'entrepôt
        const warehouseCheck = await client.query(
          `SELECT id, value 
           FROM warehouses 
           WHERE id = $1 AND company_id = $2`,
          [finalWarehouseId, user.company_id]
        );

        if (warehouseCheck.rowCount === 0) {
          throw new Error(`L'entrepôt "${finalWarehouseId}" n'existe pas pour cette entreprise.`);
        }

        const warehouseRow = warehouseCheck.rows[0];

        // 8. Mise à jour product_warehouses avec ON CONFLICT DO UPDATE optimisé
        await client.query(
          `INSERT INTO product_warehouses (
            product_id, warehouse_value, company_id,
            stock, reserved, last_updated, warehouse_id
          ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
          ON CONFLICT (product_id, warehouse_value, company_id) 
          DO UPDATE SET 
            stock = EXCLUDED.stock,
            reserved = EXCLUDED.reserved,
            last_updated = NOW()`,
          [newProduct.id, warehouseRow.value, user.company_id, initialStock, 0, warehouseRow.id]
        );

        // 9. Création du mouvement de stock seulement si stock > 0
        if (initialStock > 0) {
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
              "in",
              "IN",
              initialStock,
              null,
              warehouseRow.id,
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

      // 10. Recalcul du stock global (optimisé)
      const totalStockResult = await client.query(
        `SELECT COALESCE(SUM(stock), 0) as total_stock
         FROM product_warehouses 
         WHERE product_id = $1 AND company_id = $2`,
        [newProduct.id, user.company_id]
      );

      const totalStock = totalStockResult.rows[0]?.total_stock || initialStock;

      await client.query(
        `UPDATE products 
         SET stock = $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [totalStock, newProduct.id, user.company_id]
      );

      // 11. Commit de la transaction
      await client.query("COMMIT");

      // 12. Récupération du produit fraîchement créé avec jointures
      const freshProduct = await client.query(
        `SELECT p.*, 
                COALESCE(pw.stock, 0) as warehouse_stock,
                pw.warehouse_value,
                w.label as warehouse_name
         FROM products p
         LEFT JOIN product_warehouses pw ON p.id = pw.product_id AND pw.company_id = p.company_id
         LEFT JOIN warehouses w ON pw.warehouse_value = w.value AND w.company_id = p.company_id
         WHERE p.id = $1 AND p.company_id = $2`,
        [newProduct.id, user.company_id]
      );

      console.log("✅ Produit créé avec succès:", newProduct.id);
      return NextResponse.json(freshProduct.rows[0], { status: 201 });

    } catch (error) {
      // Rollback en cas d'erreur dans la transaction
      await client.query("ROLLBACK");
      throw error;
    }

  } catch (err: any) {
    console.error("❌ Erreur création produit:", err);

    // Gestion des erreurs spécifiques
    if (err.message?.includes("existe déjà") || err.code === "23505") {
      return NextResponse.json(
        { error: "Cette référence existe déjà dans la base pour cette entreprise." },
        { status: 409 }
      );
    }

    if (err.message?.includes("entrepôt")) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la création du produit",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}


// PUT pour modifier un produit et DELETE pour supprimer un produit peuvent être ajoutés ici de manière similaire,

// PUT pour modifier un produit (version corrigée avec gestion de null)
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
      cost_price,
      supplier,
      status,
      description,
      warehouse_id,
      category_id,
    } = body;

    // Validation de l'ID
    const productId = id || product_id;
    if (!productId) {
      return NextResponse.json(
        { error: "ID du produit requis" },
        { status: 400 }
      );
    }

    // Utilisation de la fonction existante toNumberSafe
    const newStock = Math.max(0, toNumberSafe(newStockRaw, 0));
    const newPrice = Math.max(0, toNumberSafe(price, 0));
    const newCostPrice = cost_price !== undefined ? Math.max(0, toNumberSafe(cost_price, null)) : null;

    // Fonction utilitaire locale pour valider l'entrepôt
    const validateWarehouseId = (warehouseId: any): string | null => {
      if (!warehouseId) return null;

      const idStr = String(warehouseId).toLowerCase().trim();

      if (idStr === "none" || idStr === "0" || idStr === "") {
        return null;
      }

      return String(warehouseId);
    };

    const finalWarehouseId = validateWarehouseId(warehouse_id);

    await client.query("BEGIN");

    try {
      // Vérification du produit et récupération des anciennes valeurs
      const oldProductRes = await client.query(
        `SELECT id, name, reference, stock, price, cost_price,
                category, supplier, status, description,
                category_id
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

      console.log("📊 Analyse des modifications:", {
        ancien_stock: oldStock,
        nouveau_stock: newStock,
        difference: stockDifference,
        warehouse: finalWarehouseId,
      });

      // Déterminer le nouveau statut basé sur le stock
      const determineStatus = () => {
        if (status !== undefined) return status; // Priorité au statut explicite
        if (newStock === 0) return "out_of_stock";
        if (newStock <= 10) return "low_stock";
        return "active";
      };

      const newStatus = determineStatus();

      // Mise à jour du produit avec gestion des NULL
      const updateRes = await client.query(
        `UPDATE products SET
           user_id = $1,
           name = COALESCE($2, name),
           reference = COALESCE($3, reference),
           category = COALESCE($4, category),
           stock = $5,
           price = $6,
           cost_price = $7,
           supplier = COALESCE($8, supplier),
           status = $9,
           description = COALESCE($10, description),
           category_id = COALESCE($11, category_id),
           updated_at = NOW()
         WHERE id = $12
           AND company_id = $13
         RETURNING *`,
        [
          user.id,
          name || null,
          reference || null,
          category || null,
          newStock,
          newPrice,
          newCostPrice,
          supplier || null,
          newStatus,
          description || null,
          category_id || null,
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

      const updatedProduct = updateRes.rows[0];

      // Gestion des entrepôts + mouvements
      if (finalWarehouseId) {
        // Vérification de l'entrepôt
        const warehouseCheck = await client.query(
          `SELECT id, value
           FROM warehouses
           WHERE (id = $1 OR value = $1) AND company_id = $2`,
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

        const warehouseRow = warehouseCheck.rows[0];

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
        const warehouseStockDifference = newStock - oldWarehouseStock;

        // Upsert product_warehouses
        await client.query(
          `INSERT INTO product_warehouses (
             product_id, warehouse_value, company_id,
             stock, reserved, last_updated, warehouse_id
           )
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)
           ON CONFLICT (product_id, warehouse_value, company_id) 
           DO UPDATE SET 
             stock = EXCLUDED.stock,
             reserved = EXCLUDED.reserved,
             last_updated = NOW()`,
          [productId, warehouseRow.value, user.company_id, newStock, 0, warehouseRow.id]
        );

        // Création d'un mouvement de stock si nécessaire
        if (warehouseStockDifference !== 0) {
          const movementType = warehouseStockDifference > 0 ? "IN" : "OUT";
          const movementDirection = warehouseStockDifference > 0 ? "in" : "out";

          console.log("📝 Insertion stock_movements:", {
            productId,
            direction: movementDirection,
            type: movementType,
            quantity: Math.abs(warehouseStockDifference),
          });

          await client.query(
            `INSERT INTO stock_movements (
               product_id, company_id, user_id,
               type, movement_type, quantity,
               from_warehouse, to_warehouse,
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
              Math.abs(warehouseStockDifference),
              warehouseStockDifference > 0 ? null : warehouseRow.value,
              warehouseStockDifference > 0 ? warehouseRow.value : null,
              `MODIF-${oldProduct.reference}`,
              JSON.stringify({
                product_name: updatedProduct.name,
                action: "stock_update",
                old_global_stock: oldStock,
                new_global_stock: newStock,
                global_difference: stockDifference,
                old_warehouse_stock: oldWarehouseStock,
                new_warehouse_stock: newStock,
                warehouse_difference: warehouseStockDifference,
                warehouse_name: warehouseRow.value,
                price_change: newPrice !== oldProduct.price,
                old_price: oldProduct.price,
                new_price: newPrice,
              }),
            ]
          );
        }
      } else {
        // Pas d'entrepôt spécifié: on nettoie les lignes d'entrepôt
        await client.query(
          `DELETE FROM product_warehouses
           WHERE product_id = $1
             AND company_id = $2`,
          [productId, user.company_id]
        );
      }

      // Recalcul du stock global depuis product_warehouses
      const totalStockResult = await client.query(
        `SELECT COALESCE(SUM(stock), 0) as total_stock
         FROM product_warehouses 
         WHERE product_id = $1 AND company_id = $2`,
        [productId, user.company_id]
      );

      const totalStock = totalStockResult.rows[0]?.total_stock || newStock;

      // Mise à jour du stock global si nécessaire
      if (totalStock !== newStock) {
        await client.query(
          `UPDATE products 
           SET stock = $1, updated_at = NOW()
           WHERE id = $2 AND company_id = $3`,
          [totalStock, productId, user.company_id]
        );
      }

      await client.query("COMMIT");

      // Récupération du produit mis à jour avec jointures
      const freshProduct = await client.query(
        `SELECT p.*, 
                COALESCE(pw.stock, 0) as warehouse_stock,
                pw.warehouse_value,
                w.label as warehouse_name
         FROM products p
         LEFT JOIN product_warehouses pw ON p.id = pw.product_id AND pw.company_id = p.company_id
         LEFT JOIN warehouses w ON pw.warehouse_value = w.value AND w.company_id = p.company_id
         WHERE p.id = $1 AND p.company_id = $2`,
        [productId, user.company_id]
      );

      console.log("✅ Product updated successfully");
      return NextResponse.json(freshProduct.rows[0], { status: 200 });

    } catch (error) {
      // Rollback en cas d'erreur dans la transaction
      await client.query("ROLLBACK");
      throw error;
    }

  } catch (err: any) {
    console.error("❌ PUT Error:", err);

    // Gestion des erreurs spécifiques
    if (err.code === "23505") {
      return NextResponse.json(
        { error: "Cette référence existe déjà dans la base pour cette entreprise." },
        { status: 409 }
      );
    }

    if (err.message?.includes("entrepôt")) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la modification du produit",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
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
