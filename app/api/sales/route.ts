// app/api/sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { number } from "zod";

// ---------- Types ----------

interface SaleProduct {
  name: string;
  quantity: number;
  price: number;
}

interface Sale {
  id: number;
  orderNumber: string;
  date: string;
  warehouseId: number | string;
  customer: string;
  customerEmail: string;
  amount: number;
  status: string;
  paymentStatus: string;
  items: number;
  company_id: number;
  products?: SaleProduct[];
}

// ---------- Helpers ----------

// Récupère le company_id depuis la session
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


// Récupère l'id depuis la session
async function getIdFromSession(): Promise<number | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.company_id) {
      console.error("❌ Session utilisateur ou id manquant");
      return null;
    }
    return Number(session.user.id);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la session:", error);
    return null;
  }
}

// Récupère une vente par ID pour une entreprise spécifique
async function getSaleById(id: number, companyId: number): Promise<Sale> {
  const result = await pool.query(
    `
    SELECT
      s.id,
      s.order_number AS "orderNumber",
      s.date,
      s.warehouse_id AS "warehouseId",
      s.customer_name AS "customer",
      s.customer_email AS "customerEmail",
      s.amount::float AS "amount",
      s.status,
      s.payment_status AS "paymentStatus",
      s.items,
      s.company_id,
      s.tax_rate,
      (
        SELECT json_agg(json_build_object(
          'name', sp.name,
          'quantity', sp.quantity::int,
          'price', sp.price::float
        ))
        FROM sale_products sp
        WHERE sp.sale_id = s.id
      ) AS products
    FROM sales s
    WHERE s.id = $1 AND s.company_id = $2
    `,
    [id, companyId]
  );

  const sale = result.rows[0];
  if (!sale) {
    throw new Error(`Vente introuvable pour id ${id}`);
  }

  // Formater la réponse
  return {
    ...sale,
    warehouseId: Number(sale.warehouseId),
    date: sale.date ? new Date(sale.date).toISOString().split("T")[0] : "",
    amount: Number(sale.amount) || 0,
    items: Number(sale.items) || 0,
    customer: sale.customer || "Client inconnu",
    customerEmail: sale.customerEmail || "",
    products: (sale.products || []).map((p: any) => ({
      ...p,
      quantity: Number(p.quantity) || 0,
      price: Number(p.price) || 0,
    })),
  };
}

// ---------- GET: list sales ----------

export async function GET(_request: NextRequest) {
  try {
    // Récupérer le company_id depuis la session
    const companyId = await getCompanyIdFromSession();
    //  Récupérer l'id depuis la session
    const user_id = await getIdFromSession();

    if (!companyId) {
      return NextResponse.json(
        { error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    console.log('🔍 Récupération des ventes pour company_id:', companyId);

    const result = await pool.query(`
      SELECT
        s.id,
        s.order_number AS "orderNumber",
        s.date,
        s.warehouse_id AS "warehouseId",
        s.customer_name AS "customer",
        s.customer_email AS "customerEmail",
        s.amount::float AS "amount",
        s.status,
        s.payment_status AS "paymentStatus",
        s.items,
        s.company_id,
        s.tax_rate,
        (
          SELECT json_agg(json_build_object(
            'name', sp.name,
            'quantity', sp.quantity::int,
            'price', sp.price::float
          ))
          FROM sale_products sp
          WHERE sp.sale_id = s.id
        ) AS products
      FROM sales s
      WHERE s.company_id = $1 AND user_id = $2
      ORDER BY s.date DESC, s.id DESC
    `, [companyId, user_id]);

    console.log(`📦 ${result.rows.length} ventes trouvées pour company ${companyId}`);

    // Formater les ventes avec typage explicite
    const sales: Sale[] = result.rows.map((sale: any) => ({
      ...sale,
      warehouseId: Number(sale.warehouseId),
      date: sale.date ? new Date(sale.date).toISOString().split("T")[0] : "",
      amount: Number(sale.amount) || 0,
      items: Number(sale.items) || 0,
      customer: sale.customer || "Client inconnu",
      customerEmail: sale.customerEmail || "",
      products: (sale.products || []).map((p: any) => ({
        ...p,
        quantity: Number(p.quantity) || 0,
        price: Number(p.price) || 0,
      })),
    }));

    return NextResponse.json(sales, { status: 200 });
  } catch (err: any) {
    console.error("❌ Erreur GET /api/sales:", err?.stack || err);
    return NextResponse.json(
      { error: "Erreur interne lors de la lecture des ventes" },
      { status: 500 }
    );
  }
}



export async function POST(request: NextRequest) {
  const client = await pool.connect();
  let saleId: number;

  try {
    // Récupérer le company_id depuis la session
    const companyId = await getCompanyIdFromSession();
    //  Récupérer l'id depuis la session
    const user_id = await getIdFromSession();

    if (!companyId) {
      return NextResponse.json(
        { error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    const body = await request.json();


    const {
      orderNumber: providedOrderNumber,
      date,
      customer,
      customerEmail,
      amount, // Montant TTC fourni (optionnel)
      amount_ht, // Montant HT fourni (optionnel)
      tax_rate = 18.00, // Taux de TVA par défaut (18%) 
      items,
      warehouseId: warehouseValue, // Renommer pour clarifier que c'est la valeur ('main')
      products = []
    } = body;

    const status = body.paymentMethod == "cash" ? "completed" : 'pending';
    const paymentStatus = body.paymentMethod == "cash" ? "paid" : 'pending';


    console.log("=== 🚀 DÉBUT CRÉATION VENTE ===");
    console.log("📦 Données reçues:", {
      orderNumber: providedOrderNumber,
      customer,
      warehouseValue,
      nbProduits: products.length,
      companyId,
      tax_rate,
      status,
      paymentStatus
    });

    // Validation des champs requis
    if (!customer || !warehouseValue) {
      return NextResponse.json(
        { error: "Les champs 'customer' et 'warehouseId' sont obligatoires" },
        { status: 400 }
      );
    }

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "Au moins un produit est requis" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // 1. TROUVER L'ID DE L'ENTREPÔT À PARTIR DE SA VALEUR
    console.log(`🔍 Recherche de l'ID de l'entrepôt avec valeur: "${warehouseValue}" pour company ${companyId}`);
    const warehouseRes = await client.query(
      `SELECT id FROM warehouses WHERE value = $1 AND company_id = $2`,
      [warehouseValue, companyId]
    );

    if (warehouseRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Entrepôt "${warehouseValue}" non trouvé dans votre entreprise` },
        { status: 400 }
      );
    }

    const warehouseId = warehouseRes.rows[0].id;
    console.log(`✅ ID de l'entrepôt trouvé: ${warehouseId} (valeur: "${warehouseValue}")`);

    // 2. GÉNÉRER LE NUMÉRO DE COMMANDE
    let orderNumber = providedOrderNumber;
    if (!orderNumber) {
      orderNumber = `CMD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    // Vérifier si le numéro de commande existe déjà
    const existingSale = await client.query(
      `SELECT id FROM sales WHERE order_number = $1 AND company_id = $2`,
      [orderNumber, companyId]
    );

    if (existingSale.rowCount > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Numéro de commande déjà utilisé: ${orderNumber}` },
        { status: 409 }
      );
    }

    console.log(`✅ Numéro de commande: ${orderNumber}`);

    // 3. CALCUL DES MONTANTS HT, TAXE ET TTC
    console.log("💰 Calcul des montants avec TVA...");

    // Calculer le total HT à partir des produits
    const totalHTFromProducts = products.reduce((sum: number, product: any) => {
      return sum + (Number(product.price) * Number(product.quantity));
    }, 0);

    let totalHT, totalTax, totalTTC;

    // Si amount_ht est fourni, l'utiliser
    if (amount_ht !== undefined && amount_ht !== null) {
      totalHT = Number(amount_ht);
      totalTax = totalHT * (tax_rate / 100);
      totalTTC = totalHT + totalTax;
    }
    // Si amount (TTC) est fourni, calculer le HT
    else if (amount !== undefined && amount !== null) {
      totalTTC = Number(amount);
      totalHT = totalTTC / (1 + (tax_rate / 100));
      totalTax = totalTTC - totalHT;
    }
    // Sinon, calculer à partir des produits
    else {
      totalHT = totalHTFromProducts;
      totalTax = totalHT * (tax_rate / 100);
      totalTTC = totalHT + totalTax;
    }

    // Vérifier la cohérence (le HT calculé doit être proche du HT des produits)
    const tolerance = 0.01; // Tolérance de 1 centime
    if (Math.abs(totalHT - totalHTFromProducts) > tolerance) {
      console.warn(`⚠️ Attention: HT calculé (${totalHT}) diffère du HT produits (${totalHTFromProducts})`);
    }

    console.log(`💰 Montants calculés:`);
    console.log(`   - HT: ${totalHT.toFixed(2)}€`);
    console.log(`   - TVA (${tax_rate}%): ${totalTax.toFixed(2)}€`);
    console.log(`   - TTC: ${totalTTC.toFixed(2)}€`);

    // 4. CALCUL DU NOMBRE D'ARTICLES
    const totalItems = Number(items) || products.reduce((sum: number, product: any) =>
      sum + Number(product.quantity), 0
    );

    console.log(`📦 Articles: ${totalItems}`);

    // 5. TRAITEMENT DES PRODUITS
    console.log("🔄 Début traitement des produits...");

    for (const [index, p] of products.entries()) {
      const productName = String(p.name).trim();
      const qty = Number(p.quantity);
      const price = Number(p.price); // Ce prix est le prix TTC unitaire
      const productId = Number(p.id);

      console.log(`\n📦 Produit ${index + 1}/${products.length}: ${productName}`);
      console.log(`   Quantité: ${qty}, Prix TTC: ${price}, ID: ${productId}`);

      let finalProductId = productId;

      // Si pas d'ID, chercher le produit par nom
      if (!finalProductId || isNaN(finalProductId)) {
        console.log(`🔍 Recherche produit par nom: "${productName}" dans company ${companyId}`);
        const productRes = await client.query(
          `SELECT id, name, stock FROM products 
           WHERE (name = $1 OR name ILIKE $2) AND company_id = $3`,
          [productName, `%${productName}%`, companyId]
        );

        if (productRes.rowCount === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: `Produit non trouvé: "${productName}" dans votre entreprise` },
            { status: 400 }
          );
        }

        finalProductId = productRes.rows[0].id;
        console.log(`✅ Produit trouvé: ID ${finalProductId}`);
      }

      // VÉRIFICATION DU STOCK
      console.log(`📊 Vérification stock produit ${finalProductId} dans entrepôt "${warehouseValue}"`);

      const stockRes = await client.query(
        `SELECT stock FROM product_warehouses 
         WHERE product_id = $1 AND warehouse_value = $2 AND company_id = $3`,
        [finalProductId, warehouseValue, companyId]
      );

      if (stockRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: `Produit "${productName}" non disponible dans l'entrepôt ${warehouseValue}` },
          { status: 400 }
        );
      }

      const availableStock = Number(stockRes.rows[0].stock);
      console.log(`📦 Stock disponible: ${availableStock}`);

      if (availableStock < qty) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: `Stock insuffisant pour "${productName}". Disponible: ${availableStock}, Demandé: ${qty}` },
          { status: 400 }
        );
      }

      // MISE À JOUR DU STOCK
      console.log(`🔄 Mise à jour stock: -${qty} unités`);

      // Mise à jour dans product_warehouses
      await client.query(
        `UPDATE product_warehouses 
         SET stock = stock - $1, last_updated = NOW()
         WHERE product_id = $2 AND warehouse_value = $3 AND company_id = $4`,
        [qty, finalProductId, warehouseValue, companyId]
      );

      // Mise à jour dans products
      await client.query(
        `UPDATE products 
         SET stock = stock - $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [qty, finalProductId, companyId]
      );

      // ENREGISTREMENT DU MOUVEMENT DE STOCK
      console.log(`📝 Enregistrement mouvement de stock`);

      await client.query(
        `INSERT INTO stock_movements (
          product_id, 
          type, 
          movement_type, 
          quantity,
          from_warehouse_id, 
          to_warehouse_id, 
          reference,
          created_at,
           metadata, 
           company_id, 
           user_id
        ) VALUES ($1, $2, $3, $4, $5, NULL, $6, NOW(), $7, $8, $9)`,
        [
          finalProductId,
          'out',
          'OUT',
          qty,
          warehouseId,
          orderNumber,
          JSON.stringify({
            sale_order: orderNumber,
            product_name: productName,
            price_ttc: price,
            price_ht: price / (1 + (tax_rate / 100)), // Calcul du prix HT
            tax_rate: tax_rate,
            customer: customer,
            action: 'sale_creation',
            warehouse_value: warehouseValue
          }),
          companyId,
          user_id
        ]
      );

      console.log(`✅ Produit "${productName}" traité avec succès`);
    }

    console.log("🎯 Tous les produits traités, création de la vente...");

    // 6. CRÉATION DE LA VENTE
    const saleDate = date || new Date().toISOString().split("T")[0];

    console.log(`💾 Création de la vente avec TVA:`);
    console.log(`   - HT: ${totalHT}`);
    console.log(`   - Taxe: ${totalTax}`);
    console.log(`   - TTC: ${totalTTC}`);
    console.log(`   - Taux TVA: ${tax_rate}%`);
    console.log(`   - Status: ${status}`);
    console.log(`   - Methode de payement ${paymentStatus}`);
    console.log('Le status est : ', status);


    const saleRes = await client.query(
      `INSERT INTO sales (
        order_number,
         date, 
         company_id, 
         warehouse_id,
        amount, 
        status, 
        payment_status, 
        items,
        customer_name, 
        customer_email,
        amount_ht, 
        amount_tax, 
        tax_rate,  -- Champs TVA
        created_at, 
        updated_at,
        user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), $14)
      RETURNING id`,
      [
        orderNumber,
        saleDate,
        companyId,
        warehouseId,
        totalTTC,        // amount = TTC
        status,
        paymentStatus,
        totalItems,
        customer,
        customerEmail || null,
        totalHT,         // amount_ht = HT
        totalTax,        // amount_tax = montant de la taxe
        tax_rate,        // tax_rate (20.00 par défaut)
        user_id
      ]
    );

    saleId = saleRes.rows[0].id;
    console.log(`✅ Vente créée avec ID: ${saleId} dans company ${companyId}`);

    // 7. ENREGISTREMENT DES PRODUITS DE LA VENTE
    console.log("💾 Enregistrement des produits de la vente...");

    for (const p of products) {
      const priceTTC = Number(p.price);
      const priceHT = priceTTC / (1 + (tax_rate / 100));

      await client.query(
        `INSERT INTO sale_products (sale_id, name, quantity, price, company_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [saleId, p.name, Number(p.quantity), priceTTC, companyId]
      );

      console.log(`   Produit: ${p.name}, Prix TTC: ${priceTTC}, Prix HT: ${priceHT.toFixed(2)}`);
    }

    console.log("✅ Produits de vente enregistrés");

    await client.query("COMMIT");
    console.log("🎉 Transaction commitée avec succès");

    // 8. RÉCUPÉRATION DE LA VENTE CRÉÉE
    const createdSale = await getSaleById(saleId, companyId);

    console.log("=== ✅ FIN CRÉATION VENTE ===");

    return NextResponse.json(createdSale, { status: 201 });

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur POST /api/sales:", err.message || err);

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
// ---------- PUT: update sale status with stock management ----------

export async function PUT(request: NextRequest) {
  const client = await pool.connect();

  try {
    // Récupérer le company_id depuis la session
    const companyId = await getCompanyIdFromSession();
    const user_id = await getIdFromSession();


    if (!companyId) {
      return NextResponse.json(
        { error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, status, paymentStatus } = body;

    console.log("=== 🔄 DÉBUT MISE À JOUR VENTE ===");
    console.log("📋 Données mise à jour:", { id, status, paymentStatus, companyId });

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await client.query("BEGIN");

    // Récupérer l'ancien statut de la vente dans cette entreprise
    const oldSaleRes = await client.query(
      `SELECT status, order_number, warehouse_id FROM sales 
       WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (oldSaleRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Vente introuvable dans votre entreprise" }, { status: 404 });
    }

    const oldStatus: string = oldSaleRes.rows[0].status;
    const orderNumber: string = oldSaleRes.rows[0].order_number;
    const warehouseId: string = oldSaleRes.rows[0].warehouse_id;

    console.log(`📊 Ancien statut: ${oldStatus}, Nouveau statut: ${status}`);

    // CAS 1: Annulation d'une vente (changement vers "cancelled")
    if (oldStatus !== "cancelled" && status === "cancelled") {
      console.log(`🔄 Annulation de la vente ${orderNumber} - Réinjection du stock`);

      const productsRes = await client.query(
        `SELECT name, quantity FROM sale_products WHERE sale_id = $1`,
        [id]
      );

      for (const product of productsRes.rows) {
        const productName = String(product.name);
        const qty = Number(product.quantity);

        console.log(`📦 Réinjection stock: ${productName} x${qty}`);

        // Trouver l'ID du produit dans cette entreprise
        const prodRes = await client.query(
          `SELECT id FROM products WHERE name = $1 AND company_id = $2`,
          [productName, companyId]
        );

        if (prodRes.rowCount === 0) {
          console.warn(`⚠️ Produit non trouvé pour réinjection: ${productName} dans company ${companyId}`);
          continue;
        }

        const productId = prodRes.rows[0].id;

        // Réinjecter le stock dans cette entreprise
        await client.query(
          `UPDATE product_warehouses 
           SET stock = stock + $1, last_updated = NOW()
           WHERE product_id = $2 AND warehouse_value = $3 AND company_id = $4`,
          [qty, productId, warehouseId, companyId]
        );

        await client.query(
          `UPDATE products 
           SET stock = stock + $1, updated_at = NOW()
           WHERE id = $2 AND company_id = $3`,
          [qty, productId, companyId]
        );

        // Enregistrer le mouvement de stock d'annulation dans cette entreprise
        await client.query(
          `INSERT INTO stock_movements (
            product_id, 
            type, 
            movement_type, 
            quantity,
            from_warehouse_id, 
            to_warehouse_id, 
            reference,
            created_at, 
            metadata, 
            company_id, 
            user_id
          ) VALUES ($1, 'in', 'CANCELLATION', $2, NULL, $3, $4, NOW(), $5, $6, $7)`,
          [
            productId,
            qty,
            warehouseId,
            `CANCEL-${orderNumber}`,
            JSON.stringify({
              sale_id: id,
              action: 'cancellation',
              original_order: orderNumber
            }),
            companyId,
            user_id
          ]
        );

        console.log(`✅ Stock réinjecté pour ${productName} dans company ${companyId}`);
      }
    }

    // CAS 2: Réactivation d'une vente annulée
    if (oldStatus === "cancelled" && status !== "cancelled") {
      console.log(`🔄 Réactivation de la vente ${orderNumber} - Retrait du stock`);

      const productsRes = await client.query(
        `SELECT name, quantity FROM sale_products WHERE sale_id = $1`,
        [id]
      );

      for (const product of productsRes.rows) {
        const productName = String(product.name);
        const qty = Number(product.quantity);

        console.log(`📦 Retrait stock: ${productName} x${qty}`);

        // Trouver l'ID du produit dans cette entreprise
        const prodRes = await client.query(
          `SELECT id FROM products WHERE name = $1 AND company_id = $2`,
          [productName, companyId]
        );

        if (prodRes.rowCount === 0) continue;

        const productId = prodRes.rows[0].id;

        // Vérifier le stock disponible dans cette entreprise
        const stockRes = await client.query(
          `SELECT stock FROM product_warehouses 
           WHERE product_id = $1 AND warehouse_value = $2 AND company_id = $3`,
          [productId, warehouseId, companyId]
        );

        if (stockRes.rowCount === 0 || stockRes.rows[0].stock < qty) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: `Stock insuffisant pour réactiver la vente. Produit: ${productName}` },
            { status: 400 }
          );
        }

        // Retirer le stock dans cette entreprise
        await client.query(
          `UPDATE product_warehouses 
           SET stock = stock - $1, last_updated = NOW()
           WHERE product_id = $2 AND warehouse_value = $3 AND company_id = $4`,
          [qty, productId, warehouseId, companyId]
        );

        await client.query(
          `UPDATE products 
           SET stock = stock - $1, updated_at = NOW()
           WHERE id = $2 AND company_id = $3`,
          [qty, productId, companyId]
        );

        // Enregistrer le mouvement de stock de réactivation dans cette entreprise
        await client.query(
          `INSERT INTO stock_movements (
            product_id, 
            type, 
            movement_type, 
            quantity,
            from_warehouse_id, 
            to_warehouse_id, 
            reference,
            created_at, 
            metadata, 
            company_id, 
            user_id
          ) VALUES ($1, 'out', 'REACTIVATION', $2, $3, NULL, $4, NOW(), $5, $6, $7)`,
          [
            productId,
            qty,
            warehouseId,
            `REACTIVATE-${orderNumber}`,
            JSON.stringify({
              sale_id: id,
              action: 'reactivation',
              original_order: orderNumber
            }),
            companyId,
            user_id
          ]
        );

        console.log(`✅ Stock retiré pour ${productName} dans company ${companyId}`);
      }
    }

    // Mise à jour du statut de la vente dans cette entreprise
    console.log(`📝 Mise à jour statut vente ${id}`);

    await client.query(
      `UPDATE sales 
       SET status = $1, payment_status = $2, updated_at = NOW()
       WHERE id = $3 AND company_id = $4`,
      [status, paymentStatus, id, companyId]
    );

    const updatedSale = await getSaleById(id, companyId);
    await client.query("COMMIT");

    console.log("=== ✅ FIN MISE À JOUR VENTE ===");

    return NextResponse.json(updatedSale, { status: 200 });

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur PUT /api/sales:", err?.stack || err);

    return NextResponse.json(
      { error: "Erreur interne lors de la mise à jour" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// ---------- DELETE: delete sale and re-inject stock ----------

export async function DELETE(request: NextRequest) {
  const client = await pool.connect();

  try {
    // Récupérer le company_id depuis la session
    const companyId = await getCompanyIdFromSession();
    const user_id = await getIdFromSession();


    if (!companyId) {
      return NextResponse.json(
        { error: "Non autorisé ou company_id manquant" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const saleId = Number(idParam);
    if (isNaN(saleId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    console.log("=== 🗑️ DÉBUT SUPPRESSION VENTE ===");
    console.log(`📋 Suppression vente ID: ${saleId} dans company ${companyId}`);

    await client.query("BEGIN");

    // Récupérer les informations de la vente dans cette entreprise
    const saleRes = await client.query(
      `SELECT order_number, warehouse_id FROM sales 
       WHERE id = $1 AND company_id = $2`,
      [saleId, companyId]
    );

    if (saleRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Vente introuvable dans votre entreprise" }, { status: 404 });
    }

    const orderNumber: string = saleRes.rows[0].order_number;
    const warehouseId: string = saleRes.rows[0].warehouse_id;

    console.log(`📦 Vente trouvée: ${orderNumber}, Entrepôt: ${warehouseId}`);

    // Récupérer les produits de la vente
    const productsRes = await client.query(
      `SELECT name, quantity FROM sale_products WHERE sale_id = $1`,
      [saleId]
    );

    console.log(`📊 ${productsRes.rows.length} produits à traiter`);

    // Réinjecter le stock pour chaque produit dans cette entreprise
    for (const product of productsRes.rows) {
      const productName = String(product.name);
      const qty = Number(product.quantity);

      console.log(`🔄 Réinjection: ${productName} x${qty}`);

      // Trouver le produit dans cette entreprise
      const prodRes = await client.query(
        `SELECT id FROM products WHERE name = $1 AND company_id = $2`,
        [productName, companyId]
      );

      if (prodRes.rowCount === 0) {
        console.warn(`⚠️ Produit non trouvé dans company ${companyId}: ${productName}`);
        continue;
      }

      const productId = prodRes.rows[0].id;

      // Réinjecter le stock dans cette entreprise
      await client.query(
        `UPDATE product_warehouses 
         SET stock = stock + $1, last_updated = NOW()
         WHERE product_id = $2 AND warehouse_value = $3 AND company_id = $4`,
        [qty, productId, warehouseId, companyId]
      );

      await client.query(
        `UPDATE products 
         SET stock = stock + $1, updated_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [qty, productId, companyId]
      );

      // 🔥 CORRECTION ICI : Utiliser 'IN' au lieu de 'DELETE_SALE'
      await client.query(
        `INSERT INTO stock_movements (
          product_id, type, movement_type, quantity,
          from_warehouse_id, to_warehouse_id, reference,
          created_at, metadata, company_id, user_id
        ) VALUES ($1, 'in', 'IN', $2, NULL, $3, $4, NOW(), $5, $6, $7)`,  // 'IN' est autorisé par la contrainte CHECK
        [
          productId,
          qty,
          warehouseId,
          `DELETE-${orderNumber}`,
          JSON.stringify({
            sale_id: saleId,
            action: 'sale_deletion',
            original_order: orderNumber,
            reason: 'sale_cancellation'  // Détail dans metadata
          }),
          companyId,
          user_id
        ]
      );

      console.log(`✅ Stock réinjecté pour ${productName} dans company ${companyId}`);
    }

    // Supprimer les produits de la vente
    await client.query(`DELETE FROM sale_products WHERE sale_id = $1`, [saleId]);

    // Supprimer la vente de cette entreprise
    await client.query(
      `DELETE FROM sales WHERE id = $1 AND company_id = $2`,
      [saleId, companyId]
    );

    await client.query("COMMIT");

    console.log("=== ✅ FIN SUPPRESSION VENTE ===");

    return NextResponse.json(
      { message: "Vente supprimée et stock réinjecté avec succès" },
      { status: 200 }
    );

  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("❌ Erreur DELETE /api/sales:", err?.stack || err);

    return NextResponse.json(
      { error: "Erreur interne lors de la suppression" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}