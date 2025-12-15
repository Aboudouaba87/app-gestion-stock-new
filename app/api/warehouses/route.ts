// import { metadata } from './../../layout';
// import { Label } from '@/app/dashboard/components/ui/label';
// export const dynamic = "force-dynamic";

// // app/api/warehouses/route.ts
// import { NextResponse, NextRequest } from "next/server";
// import { pool } from "@/lib/db";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// async function getCurrentUserCompany() {
//   const session = await getServerSession(authOptions);

//   if (!session || !session.user) {
//     throw new Error("Non authentifié");
//   }

//   const userEmail = session.user.email;

//   const userResult = await pool.query(
//     "SELECT id, company_id, warehouse_id FROM users WHERE email = $1",
//     [userEmail]
//   );

//   if (userResult.rows.length === 0) {
//     throw new Error("Utilisateur non trouvé");
//   }

//   return userResult.rows[0] as { id: number; company_id: number, warehouse_id: number };
// }

// export async function GET() {
//   try {
//     // Récupérer le company_id depuis la session
//     const session = await getServerSession(authOptions);

//     if (!session || !session.user || !session.user.company_id) {
//       console.error("❌ Session utilisateur ou company_id manquant");
//       return NextResponse.json(
//         { error: "Non autorisé ou company_id manquant" },
//         { status: 401 }
//       );
//     }

//     const companyId = session.user.company_id;
//     console.log(`📦 Récupération des entrepôts pour company_id: ${companyId}`);

//     const result = await pool.query(
//       `SELECT id, value, label, metadata 
//        FROM warehouses 
//        WHERE company_id = $1 
//        ORDER BY value`,
//       [companyId]
//     );

//     console.log(`📦 ${result.rows.length} entrepôts trouvés pour company ${companyId}:`, result.rows);

//     return NextResponse.json(result.rows, { status: 200 });
//   } catch (err: any) {
//     console.error("❌ Erreur fetch warehouses:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }


// export async function POST(request: NextRequest) {
//   try {
//     const { label, value, metadata } = await request.json();

//     if (!label || !value) {
//       return NextResponse.json(
//         { error: "label et value sont obligatoires" },
//         { status: 400 }
//       );
//     }

//     const user = await getCurrentUserCompany();
//     const companyId = user.company_id;

//     const result = await pool.query(
//       `
//       INSERT INTO warehouses (company_id, value, label, metadata)
//       VALUES ($1, $2, $3, COALESCE($4::jsonb, '{}'::jsonb))
//       RETURNING id, value, label, metadata
//       `,
//       [companyId, value, label, metadata ?? {}]
//     );

//     return NextResponse.json(result.rows[0], { status: 201 });
//   } catch (error: any) {
//     console.error("❌ Erreur POST /api/warehouses:", error);
//     return NextResponse.json(
//       { error: error.message ?? "Erreur serveur" },
//       { status: 500 }
//     );
//   }
// }


// export async function PUT(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const id = Number(searchParams.get("id"));

//     if (!id) {
//       return NextResponse.json({ error: "id requis" }, { status: 400 });
//     }

//     const { label, metadata } = await request.json();

//     const result = await pool.query(
//       `
//       UPDATE warehouses
//       SET label = $1, metadata = COALESCE($2::jsonb, '{}'::jsonb)
//       WHERE id = $3
//       RETURNING id, value, label, metadata
//       `,
//       [label, metadata ?? {}, id]
//     );

//     if (result.rowCount === 0) {
//       return NextResponse.json({ error: "Entrepôt introuvable" }, { status: 404 });
//     }

//     return NextResponse.json(result.rows[0], { status: 200 });
//   } catch (error: any) {
//     console.error("❌ Erreur PUT /api/warehouses:", error);
//     return NextResponse.json(
//       { error: error.message ?? "Erreur serveur" },
//       { status: 500 }
//     );
//   }
// }


// export async function DELETE(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const id = Number(searchParams.get("id"));

//     if (!id) {
//       return NextResponse.json({ error: "id requis" }, { status: 400 });
//     }

//     const result = await pool.query(
//       `DELETE FROM warehouses WHERE id = $1`,
//       [id]
//     );

//     if (result.rowCount === 0) {
//       return NextResponse.json({ error: "Entrepôt introuvable" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true }, { status: 200 });
//   } catch (error: any) {
//     console.error("❌ Erreur DELETE /api/warehouses:", error);
//     return NextResponse.json(
//       { error: error.message ?? "Erreur serveur" },
//       { status: 500 }
//     );
//   }
// }


export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        error: "Non authentifié"
      }, { status: 401 });
    }

    console.log(`📦 Récupération des entrepôts pour utilisateur: ${user.email}, company: ${user.company_id}`);

    const result = await client.query(
      `
      SELECT 
        id, 
        company_id, 
        value, 
        label, 
        metadata
      FROM warehouses 
      WHERE company_id = $1 
      ORDER BY 
        CASE 
          WHEN value = 'main' THEN 1
          WHEN label ILIKE '%principal%' THEN 2
          ELSE 3
        END,
        label ASC
      `,
      [user.company_id]
    );

    const warehouses = result.rows.map((row: any) => ({
      id: row.id,
      company_id: row.company_id,
      value: row.value,
      label: row.label,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata || {},
    }));

    console.log(`✅ ${warehouses.length} entrepôts trouvés pour company ${user.company_id}`);

    return NextResponse.json(warehouses, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (err: any) {
    console.error("❌ Erreur GET /api/warehouses:", err);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        detail: process.env.NODE_ENV === "development" ? err.message : undefined
      },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        error: "Non authentifié"
      }, { status: 401 });
    }

    const body = await request.json();
    const { value, label, metadata } = body;

    if (!value || !label) {
      return NextResponse.json({
        error: "Les champs 'value' et 'label' sont requis"
      }, { status: 400 });
    }

    if (value.length > 50) {
      return NextResponse.json({
        error: "La valeur ne doit pas dépasser 50 caractères"
      }, { status: 400 });
    }

    if (label.length > 100) {
      return NextResponse.json({
        error: "Le label ne doit pas dépasser 100 caractères"
      }, { status: 400 });
    }

    const existing = await client.query(
      `SELECT id FROM warehouses WHERE value = $1 AND company_id = $2`,
      [value.trim().toLowerCase(), user.company_id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({
        error: "Un entrepôt avec cette valeur existe déjà"
      }, { status: 409 });
    }

    const result = await client.query(
      `
      INSERT INTO warehouses (
        company_id, 
        value, 
        label, 
        metadata
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, company_id, value, label, metadata
      `,
      [
        user.company_id,
        value.trim(),
        label.trim(),
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    const newWarehouse = {
      ...result.rows[0],
      metadata: typeof result.rows[0].metadata === 'string'
        ? JSON.parse(result.rows[0].metadata)
        : result.rows[0].metadata
    };

    console.log(`✅ Entrepôt créé: ${newWarehouse.label} (${newWarehouse.value})`);

    return NextResponse.json({
      success: true,
      warehouse: newWarehouse,
      message: "Entrepôt créé avec succès"
    }, { status: 201 });

  } catch (err: any) {
    console.error("❌ Erreur POST /api/warehouses:", err);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        detail: process.env.NODE_ENV === "development" ? err.message : undefined
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
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        error: "Non authentifié"
      }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));
    const body = await request.json();
    const { label, metadata } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json({
        error: "ID d'entrepôt invalide"
      }, { status: 400 });
    }

    if (!label) {
      return NextResponse.json({
        error: "Le champ 'label' est requis"
      }, { status: 400 });
    }

    if (label.length > 100) {
      return NextResponse.json({
        error: "Le label ne doit pas dépasser 100 caractères"
      }, { status: 400 });
    }

    const existing = await client.query(
      `SELECT id, company_id FROM warehouses WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({
        error: "Entrepôt non trouvé"
      }, { status: 404 });
    }

    if (existing.rows[0].company_id !== user.company_id) {
      return NextResponse.json({
        error: "Non autorisé à modifier cet entrepôt"
      }, { status: 403 });
    }

    const result = await client.query(
      `
      UPDATE warehouses
      SET 
        label = $1, 
        metadata = $2
      WHERE id = $3 AND company_id = $4
      RETURNING id, company_id, value, label, metadata
      `,
      [
        label.trim(),
        metadata ? JSON.stringify(metadata) : null,
        id,
        user.company_id
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        error: "Entrepôt non trouvé ou non autorisé"
      }, { status: 404 });
    }

    const updatedWarehouse = {
      ...result.rows[0],
      metadata: typeof result.rows[0].metadata === 'string'
        ? JSON.parse(result.rows[0].metadata)
        : result.rows[0].metadata
    };

    console.log(`✅ Entrepôt mis à jour: ${updatedWarehouse.label}`);

    return NextResponse.json({
      success: true,
      warehouse: updatedWarehouse,
      message: "Entrepôt mis à jour avec succès"
    }, { status: 200 });

  } catch (err: any) {
    console.error("❌ Erreur PUT /api/warehouses:", err);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        detail: process.env.NODE_ENV === "development" ? err.message : undefined
      },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const client = await pool.connect();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        error: "Non authentifié"
      }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));

    if (!id || isNaN(id)) {
      return NextResponse.json({
        error: "ID d'entrepôt invalide"
      }, { status: 400 });
    }

    const existing = await client.query(
      `SELECT id, company_id, value FROM warehouses WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({
        error: "Entrepôt non trouvé"
      }, { status: 404 });
    }


    if (Number(existing.rows[0].company_id) !== Number(user.company_id)) {
      return NextResponse.json({
        error: "Non autorisé à supprimer cet entrepôt"
      }, { status: 403 });
    }

    if (existing.rows[0].value === "main") {
      return NextResponse.json({
        error: "Impossible de supprimer l'entrepôt principal"
      }, { status: 400 });
    }

    const hasProducts = await client.query(
      `SELECT COUNT(*) as count FROM product_warehouses WHERE warehouse_id = $1`,
      [id]
    );

    if (hasProducts.rows[0].count > 0) {
      return NextResponse.json({
        error: "Impossible de supprimer un entrepôt contenant des produits"
      }, { status: 400 });
    }

    const result = await client.query(
      `DELETE FROM warehouses WHERE id = $1 AND company_id = $2 RETURNING id, value, label`,
      [id, user.company_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        error: "Entrepôt non trouvé ou non autorisé"
      }, { status: 404 });
    }

    console.log(`🗑️ Entrepôt supprimé: ${result.rows[0].label} (${result.rows[0].value})`);

    return NextResponse.json({
      success: true,
      message: "Entrepôt supprimé avec succès",
      deleted: result.rows[0]
    }, { status: 200 });

  } catch (err: any) {
    console.error("❌ Erreur DELETE /api/warehouses:", err);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        detail: process.env.NODE_ENV === "development" ? err.message : undefined
      },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}