export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// Types
interface Category {
    id: number;
    name: string;
    description: string;
    status: string;
    parent_id: number | null;
    parent_name: string | null;
    company_id: number;
    created_at: Date;
    updated_at: Date;
    product_count: number;
}

interface User {
    id: number;
    company_id: number;
    warehouse_id: number | null;
    role: string;
}

interface CategoryInput {
    id?: number;
    name?: string;
    description?: string;
    status?: string;
    parent_id?: number | null;
}

// Constants
const DEFAULT_STATUS = 'active';
const ERROR_MESSAGES = {
    UNAUTHENTICATED: "Non authentifié",
    USER_NOT_FOUND: "Utilisateur non trouvé",
    CATEGORY_NOT_FOUND: "Catégorie non trouvée",
    NAME_REQUIRED: "Le nom de la catégorie est requis",
    ID_REQUIRED: "L'ID de la catégorie est requis",
    INVALID_ID: "ID de catégorie invalide",
    NAME_EXISTS: "Une catégorie avec ce nom existe déjà dans votre entreprise",
    PARENT_NOT_FOUND: "La catégorie parente spécifiée n'existe pas dans votre entreprise",
    SELF_PARENT: "Une catégorie ne peut pas être son propre parent",
    HAS_CHILDREN: "Impossible de supprimer cette catégorie car elle a des sous-catégories",
    HAS_PRODUCTS: "Impossible de supprimer cette catégorie car elle est utilisée par des produits",
} as const;

// Helper functions
async function getCurrentUser(): Promise<User> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        throw new Error(ERROR_MESSAGES.UNAUTHENTICATED);
    }

    const result = await pool.query<User>(
        "SELECT id, company_id, warehouse_id, role FROM users WHERE email = $1",
        [session.user.email]
    );

    if (result.rows.length === 0) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return result.rows[0];
}

function validateCategoryName(name?: string): void {
    if (!name?.trim()) {
        throw new Error(ERROR_MESSAGES.NAME_REQUIRED);
    }
}

function validateCategoryId(id?: string | number): number {
    if (!id) {
        throw new Error(ERROR_MESSAGES.ID_REQUIRED);
    }

    const categoryId = typeof id === 'string' ? parseInt(id, 10) : id;

    if (isNaN(categoryId)) {
        throw new Error(ERROR_MESSAGES.INVALID_ID);
    }

    return categoryId;
}

async function getBaseCategoryQuery(warehouseId?: number | null, role?: string) {
    const isAdmin = role === 'admin';

    if (isAdmin) {
        // Pour les admins : utiliser la colonne product_count stockée
        return `
      SELECT 
        c.id,
        c.name,
        COALESCE(c.description, '') AS description,
        COALESCE(c.status, 'active') AS status,
        c.parent_id,
        p.name AS parent_name,
        c.company_id,
        c.created_at,
        c.updated_at,
        COALESCE(c.product_count, 0) AS product_count
      FROM categories c
      LEFT JOIN categories p 
        ON c.parent_id = p.id AND p.company_id = c.company_id
      WHERE c.company_id = $1
      ORDER BY 
        CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
        c.name ASC
    `;
    } else {
        // Pour les non-admins : calculer le product_count par warehouse
        return `
      SELECT 
        c.id,
        c.name,
        COALESCE(c.description, '') AS description,
        COALESCE(c.status, 'active') AS status,
        c.parent_id,
        p.name AS parent_name,
        c.company_id,
        c.created_at,
        c.updated_at,
        COALESCE(pw_counts.product_count, 0) AS product_count
      FROM categories c
      LEFT JOIN categories p 
        ON c.parent_id = p.id AND p.company_id = c.company_id
      LEFT JOIN (
        SELECT category_id, COUNT(*) AS product_count
        FROM product_warehouses
        WHERE warehouse_id = $1
        GROUP BY category_id
      ) pw_counts ON c.id = pw_counts.category_id
      WHERE c.company_id = $2
      ORDER BY 
        CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
        c.name ASC
    `;
    }
}

// GET: Récupérer toutes les catégories
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        const { company_id, warehouse_id, role } = user;

        const query = await getBaseCategoryQuery(warehouse_id, role);
        const params = role === 'admin'
            ? [company_id]
            : [warehouse_id, company_id];

        const result = await pool.query<Category>(query, params);

        console.log(`📦 ${result.rows.length} catégories trouvées pour company_id: ${company_id}`);

        return NextResponse.json(result.rows, { status: 200 });
    } catch (error: any) {
        console.error("Erreur PostgreSQL (GET categories):", error);

        const statusMap: Record<string, number> = {
            [ERROR_MESSAGES.UNAUTHENTICATED]: 401,
            [ERROR_MESSAGES.USER_NOT_FOUND]: 404,
        };

        const status = statusMap[error.message] || 500;

        return NextResponse.json(
            { error: error?.message || "Erreur serveur lors de la récupération des catégories" },
            { status }
        );
    }
}

// POST: Créer une nouvelle catégorie
export async function POST(req: NextRequest) {
    const client = await pool.connect();

    try {
        const user = await getCurrentUser();
        const { company_id } = user;

        const body: CategoryInput = await req.json();
        const { name, description = '', status = DEFAULT_STATUS, parent_id = null } = body;

        console.log('🔄 Création catégorie:', { name, company_id });

        validateCategoryName(name);

        await client.query('BEGIN');

        // Vérifier l'existence du nom
        const existing = await client.query(
            'SELECT id FROM categories WHERE name = $1 AND company_id = $2',
            [name!.trim(), company_id]
        );

        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: ERROR_MESSAGES.NAME_EXISTS },
                { status: 409 }
            );
        }

        // Valider le parent si fourni
        let finalParentId = null;
        if (parent_id) {
            const parent = await client.query(
                'SELECT id FROM categories WHERE id = $1 AND company_id = $2',
                [parent_id, company_id]
            );

            if (parent.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: ERROR_MESSAGES.PARENT_NOT_FOUND },
                    { status: 400 }
                );
            }
            finalParentId = parent_id;
        }

        // Insérer la catégorie
        const insertResult = await client.query<Category>(
            `INSERT INTO categories (
        name, description, status, parent_id, company_id, created_at, updated_at, product_count
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), 0)
      RETURNING *`,
            [
                name!.trim(),
                description.trim() || null,
                status,
                finalParentId,
                company_id
            ]
        );

        const newCategory = insertResult.rows[0];
        console.log('✅ Catégorie créée avec ID:', newCategory.id);

        await client.query('COMMIT');

        // Récupérer la catégorie complète avec le nom du parent
        const completeResult = await client.query<Category>(
            `
      SELECT 
        c.id,
        c.name,
        COALESCE(c.description, '') as description,
        COALESCE(c.status, 'active') as status,
        c.parent_id,
        p.name as parent_name,
        c.company_id,
        c.created_at,
        c.updated_at,
        COALESCE(c.product_count, 0) as product_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = $1 AND c.company_id = $2
      `,
            [newCategory.id, company_id]
        );

        return NextResponse.json(completeResult.rows[0], { status: 201 });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur PostgreSQL (POST categories):', error);

        const statusMap: Record<string, number> = {
            [ERROR_MESSAGES.UNAUTHENTICATED]: 401,
            [ERROR_MESSAGES.USER_NOT_FOUND]: 404,
            [ERROR_MESSAGES.NAME_REQUIRED]: 400,
        };

        const status = error.code === "23505" ? 409 : statusMap[error.message] || 500;

        return NextResponse.json(
            { error: error?.message || "Erreur serveur lors de la création de la catégorie" },
            { status }
        );
    } finally {
        client.release();
    }
}

// PUT: Modifier une catégorie
export async function PUT(req: NextRequest) {
    const client = await pool.connect();

    try {
        const user = await getCurrentUser();
        const { company_id } = user;

        const body: CategoryInput = await req.json();
        const { id, name, description, status, parent_id } = body;

        console.log('🔄 Modification catégorie:', { id, name });

        if (!id) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.ID_REQUIRED },
                { status: 400 }
            );
        }

        validateCategoryName(name);

        await client.query('BEGIN');

        // Vérifier l'existence de la catégorie
        const category = await client.query(
            'SELECT id FROM categories WHERE id = $1 AND company_id = $2',
            [id, company_id]
        );

        if (category.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: ERROR_MESSAGES.CATEGORY_NOT_FOUND },
                { status: 404 }
            );
        }

        // Vérifier l'unicité du nom
        if (name) {
            const nameCheck = await client.query(
                'SELECT id FROM categories WHERE name = $1 AND company_id = $2 AND id != $3',
                [name.trim(), company_id, id]
            );

            if (nameCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: ERROR_MESSAGES.NAME_EXISTS },
                    { status: 409 }
                );
            }
        }

        // Valider le parent
        let finalParentId = parent_id;
        if (parent_id !== undefined) {
            if (parent_id === id) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: ERROR_MESSAGES.SELF_PARENT },
                    { status: 400 }
                );
            }

            if (parent_id !== null) {
                const parent = await client.query(
                    'SELECT id FROM categories WHERE id = $1 AND company_id = $2',
                    [parent_id, company_id]
                );

                if (parent.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return NextResponse.json(
                        { error: ERROR_MESSAGES.PARENT_NOT_FOUND },
                        { status: 400 }
                    );
                }
            }
        }

        // Construire la mise à jour dynamique
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount}`);
            values.push(name.trim());
            paramCount++;
        }

        if (description !== undefined) {
            updates.push(`description = $${paramCount}`);
            values.push(description.trim() || null);
            paramCount++;
        }

        if (status !== undefined) {
            updates.push(`status = $${paramCount}`);
            values.push(status);
            paramCount++;
        }

        if (parent_id !== undefined) {
            updates.push(`parent_id = $${paramCount}`);
            values.push(finalParentId);
            paramCount++;
        }

        if (updates.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "Aucune donnée à mettre à jour" },
                { status: 400 }
            );
        }

        updates.push(`updated_at = NOW()`);
        values.push(id, company_id);

        const query = `
      UPDATE categories 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
      RETURNING *
    `;

        const result = await client.query<Category>(query, values);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: ERROR_MESSAGES.CATEGORY_NOT_FOUND },
                { status: 404 }
            );
        }

        console.log('✅ Catégorie mise à jour:', id);
        await client.query('COMMIT');

        // Récupérer la catégorie mise à jour complète
        const completeResult = await client.query<Category>(
            `
      SELECT 
        c.id,
        c.name,
        COALESCE(c.description, '') as description,
        COALESCE(c.status, 'active') as status,
        c.parent_id,
        p.name as parent_name,
        c.company_id,
        c.created_at,
        c.updated_at,
        COALESCE(c.product_count, 0) as product_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = $1 AND c.company_id = $2
      `,
            [id, company_id]
        );

        return NextResponse.json({
            message: 'Catégorie modifiée avec succès',
            category: completeResult.rows[0]
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur PostgreSQL (PUT categories):', error);

        const statusMap: Record<string, number> = {
            [ERROR_MESSAGES.UNAUTHENTICATED]: 401,
            [ERROR_MESSAGES.USER_NOT_FOUND]: 404,
            [ERROR_MESSAGES.NAME_REQUIRED]: 400,
            [ERROR_MESSAGES.ID_REQUIRED]: 400,
        };

        const status = statusMap[error.message] || 500;

        return NextResponse.json(
            { error: error?.message || "Erreur serveur lors de la modification de la catégorie" },
            { status }
        );
    } finally {
        client.release();
    }
}

// DELETE: Supprimer une catégorie
export async function DELETE(req: NextRequest) {
    const client = await pool.connect();

    try {
        const user = await getCurrentUser();
        const { company_id } = user;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const categoryId = validateCategoryId(id);

        console.log('🗑️ Suppression catégorie:', categoryId);

        await client.query('BEGIN');

        // Vérifier l'existence
        const category = await client.query<{ id: number; name: string; product_count: number }>(
            'SELECT id, name, product_count FROM categories WHERE id = $1 AND company_id = $2',
            [categoryId, company_id]
        );

        if (category.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: ERROR_MESSAGES.CATEGORY_NOT_FOUND },
                { status: 404 }
            );
        }

        const categoryName = category.rows[0].name;
        const productCount = category.rows[0].product_count;

        // Vérifier s'il y a des produits dans cette catégorie
        if (productCount > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: `${ERROR_MESSAGES.HAS_PRODUCTS} (${productCount} produit(s))` },
                { status: 400 }
            );
        }

        // Vérifier les sous-catégories
        const children = await client.query(
            'SELECT name FROM categories WHERE parent_id = $1 AND company_id = $2',
            [categoryId, company_id]
        );

        if (children.rows.length > 0) {
            await client.query('ROLLBACK');
            const childrenNames = children.rows.map(c => c.name).join(', ');
            return NextResponse.json(
                { error: `${ERROR_MESSAGES.HAS_CHILDREN} : ${childrenNames}` },
                { status: 400 }
            );
        }

        // Supprimer
        const deleteResult = await client.query(
            'DELETE FROM categories WHERE id = $1 AND company_id = $2 RETURNING id, name',
            [categoryId, company_id]
        );

        if (deleteResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: ERROR_MESSAGES.CATEGORY_NOT_FOUND },
                { status: 404 }
            );
        }

        await client.query('COMMIT');
        console.log('✅ Catégorie supprimée:', categoryId);

        return NextResponse.json(
            {
                message: `Catégorie "${categoryName}" supprimée avec succès`,
                deleted_category: deleteResult.rows[0]
            },
            { status: 200 }
        );

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur PostgreSQL (DELETE categories):', error);

        const statusMap: Record<string, number> = {
            [ERROR_MESSAGES.UNAUTHENTICATED]: 401,
            [ERROR_MESSAGES.USER_NOT_FOUND]: 404,
            [ERROR_MESSAGES.ID_REQUIRED]: 400,
            [ERROR_MESSAGES.INVALID_ID]: 400,
        };

        const status = statusMap[error.message] || 500;

        return NextResponse.json(
            { error: error?.message || "Erreur serveur lors de la suppression de la catégorie" },
            { status }
        );
    } finally {
        client.release();
    }
}