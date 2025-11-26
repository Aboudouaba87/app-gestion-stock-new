import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days") || "30";
    const limit = searchParams.get("limit") || "50";

    console.log("🎯 API Stock called with days:", days, "limit:", limit);

    // Récupérer les mouvements de stock
    console.log("🔍 Fetching movements data...");
    const movementsQuery = `
      SELECT 
        sm.id,
        sm.created_at as date,
        p.name as product,
        sm.type,
        sm.quantity,
        sm.from_warehouse,
        sm.to_warehouse,
        w_from.label as warehouse_from_name,
        w_to.label as warehouse_to_name,
        COALESCE(u.name, 'Système') as user_name,
        sm.reference,
        COALESCE(sm.metadata->>'reason',
          CASE 
            WHEN sm.type = 'in' THEN 'Réception fournisseur'
            WHEN sm.type = 'out' THEN 'Vente client'
            WHEN sm.type = 'transfer' THEN 'Transfert entre entrepôts'
            ELSE 'Ajustement de stock'
          END
        ) as reason
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN warehouses w_from ON sm.from_warehouse = w_from.value
      LEFT JOIN warehouses w_to ON sm.to_warehouse = w_to.value
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE sm.created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY sm.created_at DESC
      LIMIT $1
    `;

    interface MovementRow {
      id: number;
      date: string;
      product: string;
      type: string;
      quantity: number;
      from_warehouse: string | null;
      to_warehouse: string | null;
      warehouse_from_name: string | null;
      warehouse_to_name: string | null;
      user_name: string | null;
      reference: string | null;
      reason: string | null;
    }

    const movementsResult = await pool.query<MovementRow>(movementsQuery, [limit]);
    console.log("✅ Movements found:", movementsResult.rows.length);

    const movements = movementsResult.rows.map((movement: MovementRow) => {
      const isTransfer = movement.warehouse_from_name && movement.warehouse_to_name;

      let frontendType = movement.type;
      if (movement.type === 'in') frontendType = 'entry';
      if (movement.type === 'out') frontendType = 'exit';

      return {
        id: movement.id,
        date: movement.date,
        product: movement.product,
        type: frontendType,
        quantity: movement.type === 'out' ? -movement.quantity : movement.quantity,
        warehouse: isTransfer
          ? `${movement.warehouse_from_name} → ${movement.warehouse_to_name}`
          : movement.warehouse_to_name || movement.warehouse_from_name || 'N/A',
        warehouseFrom: movement.warehouse_from_name,
        warehouseTo: movement.warehouse_to_name,
        user: movement.user_name,
        reference: movement.reference,
        reason: movement.reason
      };
    });

    // Récupérer les produits avec stock global
    console.log("🔍 Fetching products data...");
    const productsQuery = `
      SELECT 
        id,
        name,
        stock,
        reference,
        category
      FROM products 
      ORDER BY name
      LIMIT 100
    `;

    interface ProductRow {
      id: number;
      name: string;
      stock: number | string | null;
      reference: string | null;
      category: string | null;
    }

    const productsResult = await pool.query<ProductRow>(productsQuery);
    console.log("✅ Products found:", productsResult.rows.length);

    const products = productsResult.rows.map((product: ProductRow) => ({
      id: product.id,
      name: product.name,
      stock: Number(product.stock || 0),
      reference: product.reference,
      category: product.category
    }));

    // Récupérer les entrepôts
    console.log("🔍 Fetching warehouses data...");
    const warehousesQuery = `
      SELECT 
        value as id,
        label as name,
        COALESCE(metadata->>'description', '') as description
      FROM warehouses 
      ORDER BY label
    `;

    interface WarehouseRow {
      id: string;
      name: string;
      description: string;
    }

    const warehousesResult = await pool.query<WarehouseRow>(warehousesQuery);
    console.log("✅ Warehouses found:", warehousesResult.rows.length);

    const warehouses = warehousesResult.rows.map((warehouse: WarehouseRow) => ({
      id: warehouse.id,
      name: warehouse.name,
      description: warehouse.description
    }));

    // Statistiques
    const statsQuery = `
      SELECT 
        COUNT(*) as total_movements,
        COUNT(DISTINCT product_id) as unique_products,
        SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as total_entries,
        SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as total_exits,
        COUNT(CASE WHEN from_warehouse IS NOT NULL AND to_warehouse IS NOT NULL THEN 1 END) as total_transfers,
        COUNT(CASE WHEN type = 'adjustment' THEN 1 END) as total_adjustments
      FROM stock_movements 
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    const responseData = {
      movements,
      products,
      warehouses,
      stats: {
        totalMovements: Number(stats?.total_movements || 0),
        uniqueProducts: Number(stats?.unique_products || 0),
        totalEntries: Number(stats?.total_entries || 0),
        totalExits: Number(stats?.total_exits || 0),
        totalTransfers: Number(stats?.total_transfers || 0),
        totalAdjustments: Number(stats?.total_adjustments || 0)
      },
      summary: {
        period: `${days} jours`,
        limit: Number(limit),
        source: "DATABASE"
      }
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (err: any) {
    console.error("❌ DATABASE ERROR:", err);

    const emptyResponse = {
      movements: [],
      products: [],
      warehouses: [],
      stats: {
        totalMovements: 0,
        uniqueProducts: 0,
        totalEntries: 0,
        totalExits: 0,
        totalTransfers: 0,
        totalAdjustments: 0
      },
      summary: {
        period: "30 jours",
        limit: 50,
        source: "ERROR_NO_DATA"
      }
    };

    return NextResponse.json(emptyResponse, { status: 200 });
  }
}

// POST pour créer de nouveaux mouvements
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, productId, quantity, warehouseId, fromWarehouseId, toWarehouseId, reference, reason, userId } = body;

    console.log("🎯 Creating new stock movement:", { type, productId, quantity });

    // Validation des données
    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({
        success: false,
        error: "Données invalides: productId et quantity > 0 requis"
      }, { status: 400 });
    }

    if ((type === 'entry' || type === 'exit' || type === 'adjustment') && !warehouseId) {
      return NextResponse.json({
        success: false,
        error: "Entrepôt requis pour ce type de mouvement"
      }, { status: 400 });
    }

    if (type === 'transfer' && (!fromWarehouseId || !toWarehouseId)) {
      return NextResponse.json({
        success: false,
        error: "Entrepôt source et destination requis pour un transfert"
      }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let movementType = type;
      if (type === 'entry') movementType = 'in';
      if (type === 'exit') movementType = 'out';

      // 1. Insertion dans stock_movements
      const movementQuery = `
        INSERT INTO stock_movements (
          product_id, type, quantity, from_warehouse, to_warehouse, 
          reference, user_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const metadata = reason ? { reason } : {};

      let fromWarehouse = null;
      let toWarehouse = null;

      if (type === 'entry') {
        toWarehouse = warehouseId;
      } else if (type === 'exit') {
        fromWarehouse = warehouseId;
      } else if (type === 'transfer') {
        fromWarehouse = fromWarehouseId;
        toWarehouse = toWarehouseId;
      } else if (type === 'adjustment') {
        toWarehouse = warehouseId;
      }

      const movementResult = await client.query(movementQuery, [
        productId, movementType, Math.abs(quantity), fromWarehouse, toWarehouse,
        reference, userId, metadata
      ]);

      // 2. Mise à jour des stocks selon le type
      if (type === 'entry' || type === 'exit') {
        // Pour les entrées/sorties, on vérifie d'abord si la ligne existe
        const checkWarehouseQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_value = $2
        `;
        const warehouseResult = await client.query(checkWarehouseQuery, [productId, warehouseId]);
        const currentWarehouseStock = warehouseResult.rows[0]?.stock || 0;

        const newWarehouseStock = type === 'entry'
          ? currentWarehouseStock + quantity
          : currentWarehouseStock - quantity;

        // Vérifier que le stock ne devient pas négatif
        if (newWarehouseStock < 0) {
          throw new Error(`Stock insuffisant dans l'entrepôt. Disponible: ${currentWarehouseStock}, Demandé: ${quantity}`);
        }

        // Mise à jour product_warehouses
        const warehouseStockQuery = `
          INSERT INTO product_warehouses (product_id, warehouse_value, stock)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, warehouse_value) 
          DO UPDATE SET stock = $3
        `;
        await client.query(warehouseStockQuery, [productId, warehouseId, newWarehouseStock]);

        // Mise à jour products (stock global)
        const globalStockQuery = `
          UPDATE products 
          SET stock = stock + $1
          WHERE id = $2
        `;
        const globalQuantity = type === 'entry' ? quantity : -quantity;
        await client.query(globalStockQuery, [globalQuantity, productId]);

      } else if (type === 'transfer') {
        // Vérifier le stock disponible dans l'entrepôt source
        const checkSourceQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_value = $2
        `;
        const sourceResult = await client.query(checkSourceQuery, [productId, fromWarehouseId]);
        const currentSourceStock = sourceResult.rows[0]?.stock || 0;

        if (currentSourceStock < quantity) {
          throw new Error(`Stock insuffisant dans l'entrepôt source. Disponible: ${currentSourceStock}, Demandé: ${quantity}`);
        }

        // Calculer les nouveaux stocks
        const newSourceStock = currentSourceStock - quantity;
        const newDestStockQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_value = $2
        `;
        const destResult = await client.query(newDestStockQuery, [productId, toWarehouseId]);
        const currentDestStock = destResult.rows[0]?.stock || 0;
        const newDestStock = currentDestStock + quantity;

        // Mettre à jour l'entrepôt source
        const updateSourceQuery = `
          INSERT INTO product_warehouses (product_id, warehouse_value, stock)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, warehouse_value) 
          DO UPDATE SET stock = $3
        `;
        await client.query(updateSourceQuery, [productId, fromWarehouseId, newSourceStock]);

        // Mettre à jour l'entrepôt destination
        const updateDestQuery = `
          INSERT INTO product_warehouses (product_id, warehouse_value, stock)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, warehouse_value) 
          DO UPDATE SET stock = $3
        `;
        await client.query(updateDestQuery, [productId, toWarehouseId, newDestStock]);

      } else if (type === 'adjustment') {
        // Récupérer le stock actuel dans product_warehouses
        const currentStockQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_value = $2
        `;
        const currentStockResult = await client.query(currentStockQuery, [productId, warehouseId]);
        const currentWarehouseStock = currentStockResult.rows[0]?.stock || 0;

        // Calculer la différence
        const difference = quantity - currentWarehouseStock;

        // Vérifier que le nouvel ajustement ne rend pas le stock négatif
        if (quantity < 0) {
          throw new Error("Le stock ne peut pas être négatif après ajustement");
        }

        // Mettre à jour product_warehouses avec le stock réel
        const adjustWarehouseQuery = `
          INSERT INTO product_warehouses (product_id, warehouse_value, stock)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, warehouse_value) 
          DO UPDATE SET stock = $3
        `;
        await client.query(adjustWarehouseQuery, [productId, warehouseId, quantity]);

        // Mettre à jour le stock global dans products
        const adjustGlobalQuery = `
          UPDATE products 
          SET stock = stock + $1
          WHERE id = $2
        `;
        await client.query(adjustGlobalQuery, [difference, productId]);
      }

      await client.query('COMMIT');

      console.log("✅ Stock movement created successfully");
      return NextResponse.json({
        success: true,
        movement: movementResult.rows[0],
        message: "Mouvement de stock créé avec succès"
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error("❌ Transaction error:", error);
      throw error;
    } finally {
      client.release();
    }

  } catch (err: any) {
    console.error("❌ ERROR creating stock movement:", err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}

// DELETE pour supprimer un mouvement (et annuler ses effets)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const movementId = searchParams.get("id");

    if (!movementId) {
      return NextResponse.json({
        success: false,
        error: "ID du mouvement requis"
      }, { status: 400 });
    }

    console.log("🗑️ Deleting stock movement:", movementId);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Récupérer les détails du mouvement avant suppression
      const movementQuery = `
        SELECT * FROM stock_movements WHERE id = $1
      `;
      const movementResult = await client.query(movementQuery, [movementId]);

      if (movementResult.rows.length === 0) {
        throw new Error("Mouvement non trouvé");
      }

      const movement = movementResult.rows[0];
      let movementType = movement.type;
      if (movement.type === 'in') movementType = 'entry';
      if (movement.type === 'out') movementType = 'exit';

      // 2. Annuler les effets du mouvement sur les stocks
      if (movementType === 'entry' || movementType === 'exit') {
        const warehouseId = movementType === 'entry' ? movement.to_warehouse : movement.from_warehouse;

        // Récupérer le stock actuel
        const currentStockQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_value = $2
        `;
        const currentStockResult = await client.query(currentStockQuery, [movement.product_id, warehouseId]);
        const currentStock = currentStockResult.rows[0]?.stock || 0;

        // Calculer le nouveau stock après annulation
        const newStock = movementType === 'entry'
          ? currentStock - movement.quantity
          : currentStock + movement.quantity;

        // Vérifier que le stock ne devient pas négatif
        if (newStock < 0) {
          throw new Error("Impossible d'annuler ce mouvement: le stock deviendrait négatif");
        }

        // Mettre à jour product_warehouses
        const cancelWarehouseQuery = `
          UPDATE product_warehouses 
          SET stock = $1
          WHERE product_id = $2 AND warehouse_value = $3
        `;
        await client.query(cancelWarehouseQuery, [newStock, movement.product_id, warehouseId]);

        // Annuler dans products (stock global)
        const cancelGlobalQuery = `
          UPDATE products 
          SET stock = stock - $1
          WHERE id = $2
        `;
        const globalQuantity = movementType === 'entry' ? movement.quantity : -movement.quantity;
        await client.query(cancelGlobalQuery, [globalQuantity, movement.product_id]);

      } else if (movementType === 'transfer') {
        // Récupérer les stocks actuels
        const sourceStockQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_value = $2
        `;
        const sourceResult = await client.query(sourceStockQuery, [movement.product_id, movement.from_warehouse]);
        const currentSourceStock = sourceResult.rows[0]?.stock || 0;

        const destStockQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_value = $2
        `;
        const destResult = await client.query(destStockQuery, [movement.product_id, movement.to_warehouse]);
        const currentDestStock = destResult.rows[0]?.stock || 0;

        // Calculer les nouveaux stocks après annulation
        const newSourceStock = currentSourceStock + movement.quantity;
        const newDestStock = currentDestStock - movement.quantity;

        // Vérifier que le stock de destination ne devient pas négatif
        if (newDestStock < 0) {
          throw new Error("Impossible d'annuler ce transfert: le stock de destination deviendrait négatif");
        }

        // Annuler le transfert
        const cancelSourceQuery = `
          UPDATE product_warehouses 
          SET stock = $1
          WHERE product_id = $2 AND warehouse_value = $3
        `;
        await client.query(cancelSourceQuery, [newSourceStock, movement.product_id, movement.from_warehouse]);

        const cancelDestQuery = `
          UPDATE product_warehouses 
          SET stock = $1
          WHERE product_id = $2 AND warehouse_value = $3
        `;
        await client.query(cancelDestQuery, [newDestStock, movement.product_id, movement.to_warehouse]);

      } else if (movementType === 'adjustment') {
        throw new Error("La suppression des ajustements n'est pas supportée");
      }

      // 3. Supprimer le mouvement
      const deleteQuery = `
        DELETE FROM stock_movements WHERE id = $1
      `;
      await client.query(deleteQuery, [movementId]);

      await client.query('COMMIT');

      console.log("✅ Stock movement deleted successfully");
      return NextResponse.json({
        success: true,
        message: "Mouvement supprimé avec succès"
      }, { status: 200 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (err: any) {
    console.error("❌ ERROR deleting stock movement:", err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}