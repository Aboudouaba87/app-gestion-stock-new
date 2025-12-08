// app/api/stock-movements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { number } from "zod";

// Récupère le company_id depuis la session utilisateur
async function getCompanyIdFromSession(): Promise<number | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.company_id) {
      console.error("❌ Session utilisateur ou company_id manquant");
      return null;
    }

    return session.user.company_id;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la session:", error);
    return null;
  }
}
async function getUserIdFromSession(): Promise<number | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      console.error("❌ Session utilisateur ou id manquant");
      return null;
    }

    return Number(session.user.id);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la session:", error);
    return null;
  }
}


async function getRoleFromSession(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.role) {
      console.error("❌ Session utilisateur ou role manquant");
      return null;
    }

    return session.user.role;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la session:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer le company_id depuis la session
    const companyId = await getCompanyIdFromSession();
    // Récupérer l'id depuis la session
    const user_id = await getUserIdFromSession();
    // Récupérer le company_id depuis la session
    const user_role = await getRoleFromSession();


    if (!companyId) {
      return NextResponse.json(
        { error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days") || "30";
    const limit = searchParams.get("limit") || "50";

    console.log("🎯 API Stock pour company:", companyId, "days:", days, "limit:", limit);

    // 1. Récupérer les mouvements de stock
    // a. Tous les mouvements de sotock
    const movementsQuery = `
      SELECT 
        sm.id,
        sm.created_at as date,
        p.name as product,
        sm.type,
        sm.quantity,
        sm.from_warehouse_id,
        sm.to_warehouse_id,
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
      INNER JOIN products p ON sm.product_id = p.id AND p.company_id = $1
      LEFT JOIN warehouses w_from ON sm.from_warehouse_id = w_from.id AND w_from.company_id = $1
      LEFT JOIN warehouses w_to ON sm.to_warehouse_id = w_to.id AND w_to.company_id = $1
      LEFT JOIN users u ON sm.user_id = u.id AND u.company_id = $1
      WHERE sm.created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY sm.created_at DESC
      LIMIT $2
    `;

    // b- Mouvements par utilisateur : 
    const movementsQueryForUser = `
      SELECT 
        sm.id,
        sm.created_at as date,
        p.name as product,
        sm.type,
        sm.quantity,
        sm.from_warehouse_id,
        sm.to_warehouse_id,
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
      INNER JOIN products p ON sm.product_id = p.id AND p.company_id = $1
      LEFT JOIN warehouses w_from ON sm.from_warehouse_id = w_from.id AND w_from.company_id = $1
      LEFT JOIN warehouses w_to ON sm.to_warehouse_id = w_to.id AND w_to.company_id = $1
      LEFT JOIN users u ON sm.user_id = u.id AND u.company_id = $1
      WHERE sm.created_at >= NOW() - INTERVAL '${days} days' AND sm.user_id = $2
      ORDER BY sm.created_at DESC
      LIMIT $3
    `;



    interface MovementRow {
      id: number;
      date: string;
      product: string;
      type: string;
      quantity: number;
      from_warehouse_id: string | null;
      to_warehouse_id: string | null;
      warehouse_from_name: string | null;
      warehouse_to_name: string | null;
      user_name: string | null;
      reference: string | null;
      reason: string | null;
    }
    let movementsResult
    console.log('Condition utilisateur est : ', user_role === 'admin');

    if (user_role === 'admin') {
      movementsResult = await pool.query<MovementRow>(movementsQuery, [companyId, limit]);
      console.log("✅ Movements found:", movementsResult.rows.length);
    } else {
      movementsResult = await pool.query<MovementRow>(movementsQueryForUser, [companyId, user_id, limit]);
      console.log("✅ Movements found:", movementsResult.rows.length);
    }

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

    // 2. Récupérer les produits
    const productsQuery = `
      SELECT 
        id,
        name,
        stock,
        reference,
        category
      FROM products 
      WHERE company_id = $1
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

    const productsResult = await pool.query<ProductRow>(productsQuery, [companyId]);
    console.log("✅ Products found:", productsResult.rows.length);

    const products = productsResult.rows.map((product: ProductRow) => ({
      id: product.id,
      name: product.name,
      stock: Number(product.stock || 0),
      reference: product.reference,
      category: product.category
    }));

    // 3. Récupérer les entrepôts
    const warehousesQuery = `
      SELECT 
        id,
        value as code,
        label as name,
        COALESCE(metadata->>'description', '') as description
      FROM warehouses 
      WHERE company_id = $1
      ORDER BY label
    `;

    interface WarehouseRow {
      id: string;
      code: string;
      name: string;
      description: string;
    }

    const warehousesResult = await pool.query<WarehouseRow>(warehousesQuery, [companyId]);
    console.log("✅ Warehouses found:", warehousesResult.rows.length);

    const warehouses = warehousesResult.rows.map((warehouse: WarehouseRow) => ({
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      description: warehouse.description
    }));

    // 4. Récupérer les statistiques
    // a. Toutes les statistiques
    const statsQuery = `
      SELECT 
        COUNT(*) as total_movements,
        COUNT(DISTINCT sm.product_id) as unique_products,
        SUM(CASE WHEN sm.type = 'in' THEN sm.quantity ELSE 0 END) as total_entries,
        SUM(CASE WHEN sm.type = 'out' THEN sm.quantity ELSE 0 END) as total_exits,
        COUNT(CASE WHEN sm.from_warehouse_id IS NOT NULL AND sm.to_warehouse_id IS NOT NULL THEN 1 END) as total_transfers,
        COUNT(CASE WHEN sm.type = 'adjustment' THEN 1 END) as total_adjustments
      FROM stock_movements sm
      INNER JOIN products p ON sm.product_id = p.id AND p.company_id = $1
      WHERE sm.created_at >= NOW() - INTERVAL '${days} days'
    `;
    const statsUserQuery = `
      SELECT 
        COUNT(*) as total_movements,
        COUNT(DISTINCT sm.product_id) as unique_products,
        SUM(CASE WHEN sm.type = 'in' THEN sm.quantity ELSE 0 END) as total_entries,
        SUM(CASE WHEN sm.type = 'out' THEN sm.quantity ELSE 0 END) as total_exits,
        COUNT(CASE WHEN sm.from_warehouse_id IS NOT NULL AND sm.to_warehouse_id IS NOT NULL THEN 1 END) as total_transfers,
        COUNT(CASE WHEN sm.type = 'adjustment' THEN 1 END) as total_adjustments
      FROM stock_movements sm
      INNER JOIN products p ON sm.product_id = p.id AND p.company_id = $1
      WHERE sm.created_at >= NOW() - INTERVAL '${days} days' AND sm.user_id = $2
    `;

    let statsResult;
    let stats;
    if (user_role === 'admin') {

      statsResult = await pool.query(statsUserQuery, [companyId, user_id]);
      stats = statsResult.rows[0];
    } else {
      statsResult = await pool.query(statsQuery, [companyId]);
      stats = statsResult.rows[0];
    }

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
        companyId,
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
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  try {
    // Récupérer le company_id depuis la session
    const companyId = await getCompanyIdFromSession();
    // Récupérer l'utilisateur depuis la session

    console.log("La session de l'utilisateur est : ", session);

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, productId, quantity, warehouseId, fromWarehouseId, toWarehouseId, reference, reason } = body;

    console.log("🎯 Création mouvement pour company:", companyId, "type:", type, "produit:", productId, "quantité:", quantity);

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

      // VÉRIFICATIONS D'APPARTENANCE À L'ENTREPRISE

      // 1. Vérifier que le produit appartient à l'entreprise
      const productCheck = await client.query(
        `SELECT id, name FROM products WHERE id = $1 AND company_id = $2`,
        [productId, companyId]
      );

      if (productCheck.rows.length === 0) {
        throw new Error("Produit non trouvé dans votre entreprise");
      }

      // 2. Vérifier les entrepôts si nécessaire
      if (warehouseId) {
        const warehouseCheck = await client.query(
          `SELECT id, label FROM warehouses WHERE id = $1 AND company_id = $2`,
          [warehouseId, companyId]
        );
        if (warehouseCheck.rows.length === 0) {
          throw new Error("Entrepôt non trouvé dans votre entreprise");
        }
      }

      if (fromWarehouseId) {
        const fromWarehouseCheck = await client.query(
          `SELECT id, label FROM warehouses WHERE id = $1 AND company_id = $2`,
          [fromWarehouseId, companyId]
        );
        if (fromWarehouseCheck.rows.length === 0) {
          throw new Error("Entrepôt source non trouvé dans votre entreprise");
        }
      }

      if (toWarehouseId) {
        const toWarehouseCheck = await client.query(
          `SELECT id, label FROM warehouses WHERE id = $1 AND company_id = $2`,
          [toWarehouseId, companyId]
        );
        if (toWarehouseCheck.rows.length === 0) {
          throw new Error("Entrepôt destination non trouvé dans votre entreprise");
        }
      }

      let movementType = type;
      if (type === 'entry') movementType = 'in';
      if (type === 'exit') movementType = 'out';

      // 1. Insertion dans stock_movements
      const movementQuery = `
        INSERT INTO stock_movements (
          product_id, type, quantity, from_warehouse_id, to_warehouse_id, 
          reference, user_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const metadata = reason ? { reason } : {};

      let fromWarehouseIdFinal = null;
      let toWarehouseIdFinal = null;

      if (type === 'entry') {
        toWarehouseIdFinal = warehouseId;
      } else if (type === 'exit') {
        fromWarehouseIdFinal = warehouseId;
      } else if (type === 'transfer') {
        fromWarehouseIdFinal = fromWarehouseId;
        toWarehouseIdFinal = toWarehouseId;
      } else if (type === 'adjustment') {
        toWarehouseIdFinal = warehouseId;
      }
      console.log("La valeur de user id est : ", userId);

      const movementResult = await client.query(movementQuery, [
        productId, movementType, Math.abs(quantity), fromWarehouseIdFinal, toWarehouseIdFinal,
        reference, Number(userId), metadata
      ]);

      // 2. Mise à jour des stocks selon le type
      if (type === 'entry' || type === 'exit') {
        // Pour les entrées/sorties, on vérifie d'abord si la ligne existe
        const checkWarehouseQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_id = $2
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
          INSERT INTO product_warehouses (product_id, warehouse_id, stock)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, warehouse_id) 
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
          WHERE product_id = $1 AND warehouse_id = $2
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
          WHERE product_id = $1 AND warehouse_id = $2
        `;
        const destResult = await client.query(newDestStockQuery, [productId, toWarehouseId]);
        const currentDestStock = destResult.rows[0]?.stock || 0;
        const newDestStock = currentDestStock + quantity;

        // Mettre à jour l'entrepôt source
        const updateSourceQuery = `
          INSERT INTO product_warehouses (product_id, warehouse_id, stock)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, warehouse_id) 
          DO UPDATE SET stock = $3
        `;
        await client.query(updateSourceQuery, [productId, fromWarehouseId, newSourceStock]);

        // Mettre à jour l'entrepôt destination
        const updateDestQuery = `
          INSERT INTO product_warehouses (product_id, warehouse_id, stock)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, warehouse_id) 
          DO UPDATE SET stock = $3
        `;
        await client.query(updateDestQuery, [productId, toWarehouseId, newDestStock]);

      } else if (type === 'adjustment') {
        // Récupérer le stock actuel dans product_warehouses
        const currentStockQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_id = $2
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
          INSERT INTO product_warehouses (product_id, warehouse_id, stock)
          VALUES ($1, $2, $3)
          ON CONFLICT (product_id, warehouse_id) 
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
    // Récupérer le company_id depuis la session
    const companyId = await getCompanyIdFromSession();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const movementId = searchParams.get("id");

    if (!movementId) {
      return NextResponse.json({
        success: false,
        error: "ID du mouvement requis"
      }, { status: 400 });
    }

    console.log("🗑️ Deleting stock movement:", movementId, "pour company:", companyId);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Récupérer les détails du mouvement avant suppression
      // On vérifie l'appartenance via une jointure avec products
      const movementQuery = `
        SELECT sm.* 
        FROM stock_movements sm
        INNER JOIN products p ON sm.product_id = p.id AND p.company_id = $1
        WHERE sm.id = $2
      `;
      const movementResult = await client.query(movementQuery, [companyId, movementId]);

      if (movementResult.rows.length === 0) {
        throw new Error("Mouvement non trouvé dans votre entreprise");
      }

      const movement = movementResult.rows[0];
      let movementType = movement.type;
      if (movement.type === 'in') movementType = 'entry';
      if (movement.type === 'out') movementType = 'exit';

      // 2. Annuler les effets du mouvement sur les stocks
      if (movementType === 'entry' || movementType === 'exit') {
        const warehouseId = movementType === 'entry' ? movement.to_warehouse_id : movement.from_warehouse_id;

        // Vérifier que l'entrepôt appartient à l'entreprise
        if (warehouseId) {
          const warehouseCheck = await client.query(
            `SELECT id FROM warehouses WHERE id = $1 AND company_id = $2`,
            [warehouseId, companyId]
          );
          if (warehouseCheck.rows.length === 0) {
            throw new Error("Entrepôt non trouvé dans votre entreprise");
          }
        }

        // Récupérer le stock actuel
        const currentStockQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_id = $2
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
          WHERE product_id = $2 AND warehouse_id = $3
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
        // Vérifier que les entrepôts appartiennent à l'entreprise
        if (movement.from_warehouse_id) {
          const fromWarehouseCheck = await client.query(
            `SELECT id FROM warehouses WHERE id = $1 AND company_id = $2`,
            [movement.from_warehouse_id, companyId]
          );
          if (fromWarehouseCheck.rows.length === 0) {
            throw new Error("Entrepôt source non trouvé dans votre entreprise");
          }
        }

        if (movement.to_warehouse_id) {
          const toWarehouseCheck = await client.query(
            `SELECT id FROM warehouses WHERE id = $1 AND company_id = $2`,
            [movement.to_warehouse_id, companyId]
          );
          if (toWarehouseCheck.rows.length === 0) {
            throw new Error("Entrepôt destination non trouvé dans votre entreprise");
          }
        }

        // Récupérer les stocks actuels
        const sourceStockQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_id = $2
        `;
        const sourceResult = await client.query(sourceStockQuery, [movement.product_id, movement.from_warehouse_id]);
        const currentSourceStock = sourceResult.rows[0]?.stock || 0;

        const destStockQuery = `
          SELECT stock FROM product_warehouses 
          WHERE product_id = $1 AND warehouse_id = $2
        `;
        const destResult = await client.query(destStockQuery, [movement.product_id, movement.to_warehouse_id]);
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
          WHERE product_id = $2 AND warehouse_id = $3
        `;
        await client.query(cancelSourceQuery, [newSourceStock, movement.product_id, movement.from_warehouse_id]);

        const cancelDestQuery = `
          UPDATE product_warehouses 
          SET stock = $1
          WHERE product_id = $2 AND warehouse_id = $3
        `;
        await client.query(cancelDestQuery, [newDestStock, movement.product_id, movement.to_warehouse_id]);

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
      console.error("❌ Transaction error:", error);
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