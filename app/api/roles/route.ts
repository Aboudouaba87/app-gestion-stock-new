// import { NextRequest, NextResponse } from "next/server";
// import { pool } from "@/lib/db";


// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";
// // Récupérer les rôles avec couleur personnalisée pour un utilisateur
// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const userId = searchParams.get("userId");

//     if (!userId) {
//       return NextResponse.json({ error: "Paramètre userId requis" }, { status: 400 });
//     }

//     const result = await pool.query(
//       `
//       SELECT r.value,
//              r.label,
//              COALESCE(urp.custom_color, r.default_color) AS color
//       FROM roles r
//       LEFT JOIN user_role_preferences urp
//         ON urp.role_value = r.value
//        AND urp.user_id = $1
//       `,
//       [userId] // ✅ paramètre passé ici
//     );

//     return NextResponse.json(result.rows, { status: 200 });
//   } catch (err: any) {
//     console.error("Erreur PostgreSQL (GET) :", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }


// // app/api/roles/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { pool } from "@/lib/db";

// export const runtime = "nodejs";

// /* GET : récupérer tous les rôles avec les préférences utilisateur */
// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const companyId = searchParams.get('company_id');
//     const userId = searchParams.get('userId');

//     // Validation du company_id
//     if (!companyId || isNaN(parseInt(companyId))) {
//       return NextResponse.json(
//         { error: 'Company ID invalide ou manquant' },
//         { status: 400 }
//       );
//     }

//     const validCompanyId = parseInt(companyId);

//     if (userId) {
//       // Récupérer les rôles avec les préférences de l'utilisateur spécifique
//       const validUserId = parseInt(userId);

//       const result = await pool.query(
//         `SELECT 
//             r.id,
//             r.value,
//             r.label,
//             r.default_color,
//             r.metadata,
//             COALESCE(urp.custom_color, r.default_color) as display_color,
//             urp.custom_color as user_custom_color,
//             urp.created_at as preference_created_at,
//             urp.updated_at as preference_updated_at
//          FROM roles r
//          LEFT JOIN user_role_preferences urp ON r.id = urp.role_id AND urp.user_id = $1
//          WHERE r.company_id = $2
//          ORDER BY r.label ASC`,
//         [validUserId, validCompanyId]
//       );

//       return NextResponse.json(result.rows, { status: 200 });
//     } else {
//       // Récupérer tous les rôles sans préférences utilisateur
//       const result = await pool.query(
//         `SELECT 
//             id,
//             value,
//             label,
//             default_color,
//             metadata
//          FROM roles 
//          WHERE company_id = $1
//          ORDER BY label ASC`,
//         [validCompanyId]
//       );

//       return NextResponse.json(result.rows, { status: 200 });
//     }
//   } catch (err: any) {
//     console.error("Erreur PostgreSQL (GET roles) :", err);
//     return NextResponse.json(
//       { error: err?.message ?? "Erreur serveur lors de la récupération des rôles" },
//       { status: 500 }
//     );
//   }
// }

// /* POST : créer un nouveau rôle */
// export async function POST(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const companyId = searchParams.get('company_id');

//     if (!companyId || isNaN(parseInt(companyId))) {
//       return NextResponse.json(
//         { error: 'Company ID invalide ou manquant' },
//         { status: 400 }
//       );
//     }

//     const validCompanyId = parseInt(companyId);
//     const body = await req.json();
//     const { value, label, default_color, metadata } = body ?? {};

//     // Validation des champs obligatoires
//     if (!value || !label || !default_color) {
//       return NextResponse.json(
//         { error: "Les champs 'value', 'label' et 'default_color' sont obligatoires" },
//         { status: 400 }
//       );
//     }

//     // Vérifier si le rôle existe déjà pour cette company
//     const existingRole = await pool.query(
//       'SELECT id FROM roles WHERE value = $1 AND company_id = $2',
//       [value, validCompanyId]
//     );

//     if (existingRole.rows.length > 0) {
//       return NextResponse.json(
//         { error: 'Un rôle avec cette valeur existe déjà' },
//         { status: 409 }
//       );
//     }

//     const result = await pool.query(
//       `INSERT INTO roles (company_id, value, label, default_color, metadata)
//        VALUES ($1, $2, $3, $4, $5)
//        RETURNING *`,
//       [
//         validCompanyId,
//         value.trim(),
//         label.trim(),
//         default_color.trim(),
//         metadata || {}
//       ]
//     );

//     return NextResponse.json(result.rows[0], { status: 201 });
//   } catch (err: any) {
//     console.error("Erreur PostgreSQL (POST roles) :", err);

//     if (err.code === '23505') {
//       return NextResponse.json(
//         { error: 'Un rôle avec cette valeur existe déjà' },
//         { status: 409 }
//       );
//     }

//     return NextResponse.json(
//       { error: err?.message ?? "Erreur serveur lors de la création du rôle" },
//       { status: 500 }
//     );
//   }
// }

// /* PUT : modifier un rôle */
// export async function PUT(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const companyId = searchParams.get('company_id');

//     if (!companyId || isNaN(parseInt(companyId))) {
//       return NextResponse.json(
//         { error: 'Company ID invalide ou manquant' },
//         { status: 400 }
//       );
//     }

//     const validCompanyId = parseInt(companyId);
//     const body = await req.json();
//     const { id, value, label, default_color, metadata } = body ?? {};

//     if (!id) {
//       return NextResponse.json(
//         { error: "Champ 'id' requis" },
//         { status: 400 }
//       );
//     }

//     const roleId = typeof id === "string" ? parseInt(id, 10) : Number(id);
//     if (Number.isNaN(roleId)) {
//       return NextResponse.json(
//         { error: "Identifiant 'id' invalide" },
//         { status: 400 }
//       );
//     }

//     // Vérifier si le rôle existe pour cette company
//     const existingRole = await pool.query(
//       'SELECT id, value FROM roles WHERE id = $1 AND company_id = $2',
//       [roleId, validCompanyId]
//     );

//     if (existingRole.rows.length === 0) {
//       return NextResponse.json(
//         { error: "Rôle non trouvé" },
//         { status: 404 }
//       );
//     }

//     // Si la valeur est modifiée, vérifier qu'elle n'existe pas déjà
//     if (value && value !== existingRole.rows[0].value) {
//       const duplicateValue = await pool.query(
//         'SELECT id FROM roles WHERE value = $1 AND company_id = $2 AND id != $3',
//         [value, validCompanyId, roleId]
//       );

//       if (duplicateValue.rows.length > 0) {
//         return NextResponse.json(
//           { error: 'Un autre rôle avec cette valeur existe déjà' },
//           { status: 409 }
//         );
//       }
//     }

//     const result = await pool.query(
//       `UPDATE roles
//          SET value = COALESCE($1, value),
//              label = COALESCE($2, label),
//              default_color = COALESCE($3, default_color),
//              metadata = COALESCE($4, metadata)
//        WHERE id = $5 AND company_id = $6
//        RETURNING *`,
//       [
//         value?.trim() || null,
//         label?.trim() || null,
//         default_color?.trim() || null,
//         metadata || null,
//         roleId,
//         validCompanyId
//       ]
//     );

//     if (!result || result.rowCount === 0) {
//       return NextResponse.json(
//         { error: "Rôle non trouvé" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(result.rows[0], { status: 200 });
//   } catch (err: any) {
//     console.error("Erreur PostgreSQL (PUT roles) :", err);

//     if (err.code === '23505') {
//       return NextResponse.json(
//         { error: 'Un autre rôle avec cette valeur existe déjà' },
//         { status: 409 }
//       );
//     }

//     return NextResponse.json(
//       { error: err?.message ?? "Erreur serveur lors de la modification du rôle" },
//       { status: 500 }
//     );
//   }
// }

// /* DELETE : supprimer un rôle */
// export async function DELETE(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const companyId = searchParams.get('company_id');

//     if (!companyId || isNaN(parseInt(companyId))) {
//       return NextResponse.json(
//         { error: 'Company ID invalide ou manquant' },
//         { status: 400 }
//       );
//     }

//     const validCompanyId = parseInt(companyId);

//     // Récupérer l'ID depuis le body ou les query params
//     const body = await req.json();
//     let { id } = body ?? {};

//     if (!id) {
//       const q = req.nextUrl.searchParams.get("id");
//       if (q) id = q;
//     }

//     if (!id) {
//       return NextResponse.json(
//         { error: "Champ 'id' requis" },
//         { status: 400 }
//       );
//     }

//     const roleId = typeof id === "string" ? parseInt(id, 10) : Number(id);
//     if (Number.isNaN(roleId)) {
//       return NextResponse.json(
//         { error: "Identifiant 'id' invalide" },
//         { status: 400 }
//       );
//     }

//     // Vérifier si le rôle existe pour cette company
//     const existingRole = await pool.query(
//       'SELECT id FROM roles WHERE id = $1 AND company_id = $2',
//       [roleId, validCompanyId]
//     );

//     if (existingRole.rows.length === 0) {
//       return NextResponse.json(
//         { error: "Rôle non trouvé" },
//         { status: 404 }
//       );
//     }

//     // Vérifier si des utilisateurs ont des préférences pour ce rôle
//     const preferencesCheck = await pool.query(
//       'SELECT user_id FROM user_role_preferences WHERE role_id = $1 LIMIT 1',
//       [roleId]
//     );

//     if (preferencesCheck.rows.length > 0) {
//       return NextResponse.json(
//         {
//           error: "Impossible de supprimer ce rôle",
//           details: "Des utilisateurs ont des préférences associées à ce rôle"
//         },
//         { status: 400 }
//       );
//     }

//     const result = await pool.query(
//       `DELETE FROM roles WHERE id = $1 AND company_id = $2 RETURNING *`,
//       [roleId, validCompanyId]
//     );

//     if (!result || result.rowCount === 0) {
//       return NextResponse.json(
//         { error: "Rôle non trouvé" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(
//       {
//         message: "Rôle supprimé avec succès",
//         deletedRole: result.rows[0]
//       },
//       { status: 200 }
//     );
//   } catch (err: any) {
//     console.error("Erreur PostgreSQL (DELETE roles) :", err);

//     if (err.code === '23503') {
//       return NextResponse.json(
//         { error: "Impossible de supprimer : le rôle est référencé dans d'autres tables" },
//         { status: 400 }
//       );
//     }

//     return NextResponse.json(
//       { error: err?.message ?? "Erreur serveur lors de la suppression du rôle" },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Récupérer les rôles avec couleur personnalisée pour un utilisateur dans une entreprise
export async function GET(request: NextRequest) {
  try {
    // On récupère l'utilisateur courant (JWT / session)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Optionnel: permettre de passer un userId ciblé mais le forcer dans la même company
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId") || user.id;

    const result = await pool.query(
      `
      SELECT *
      FROM roles
      `,
    );

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("Erreur PostgreSQL (GET roles) :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


// SELECT
//         r.value,
//         r.label,
//         COALESCE(urp.custom_color, r.default_color) AS color
//       FROM roles r
//       LEFT JOIN user_role_preferences urp
//         ON urp.custom_color = r.value
//        AND urp.user_id = $1
//        AND urp.company_id = $2
//       WHERE r.company_id = $2