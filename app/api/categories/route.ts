export const dynamic = "force-dynamic";

// app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export const runtime = "nodejs";

// Helper pour récupérer l'utilisateur courant + company_id
async function getCurrentUserCompany() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        throw new Error("Non authentifié");
    }

    const userCompanyID = session.user.company_id;
    const userEmail = session.user.email;

    const userResult = await pool.query(
        "SELECT id, company_id FROM users WHERE email = $1",
        [userEmail]
    );

    if (userResult.rows.length === 0) {
        throw new Error("Utilisateur non trouvé");
    }

    return userResult.rows[0] as { id: number; company_id: number };
}

/* GET : récupérer toutes les catégories de la company */
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUserCompany();
        const companyId = user.company_id;

        // Récupérer les catégories avec le nombre de produits et le nom du parent
        const result = await pool.query(
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
                COALESCE(pc.product_count, 0) as product_count
            FROM categories c
            LEFT JOIN categories p ON c.parent_id = p.id AND p.company_id = c.company_id
            LEFT JOIN (
                SELECT category_id, COUNT(*) as product_count 
                FROM products 
                WHERE company_id = $1
                GROUP BY category_id
            ) pc ON c.id = pc.category_id
            WHERE c.company_id = $1
            ORDER BY 
                CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
                c.name ASC
            `,
            [companyId]
        );

        console.log(`📦 ${result.rows.length} catégories trouvées pour company_id: ${companyId}`);

        return NextResponse.json(result.rows, { status: 200 });
    } catch (err: any) {
        console.error("Erreur PostgreSQL (GET categories) :", err);

        if (err.message === "Non authentifié") {
            return NextResponse.json({ error: err.message }, { status: 401 });
        }
        if (err.message === "Utilisateur non trouvé") {
            return NextResponse.json({ error: err.message }, { status: 404 });
        }

        return NextResponse.json(
            { error: err?.message ?? "Erreur serveur lors de la récupération des catégories" },
            { status: 500 }
        );
    }
}

/* POST : créer une nouvelle catégorie */
export async function POST(req: NextRequest) {
    const client = await pool.connect();

    try {
        const user = await getCurrentUserCompany();
        const companyId = user.company_id;

        const body = await req.json();
        const {
            name,
            description = '',
            status = 'active',
            parent_id = null
        } = body;

        console.log('🔄 Création catégorie:', { name, companyId });

        // Validation des champs obligatoires
        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: "Le nom de la catégorie est requis" },
                { status: 400 }
            );
        }

        await client.query('BEGIN');

        // Vérifier si le nom existe déjà dans cette company
        const existingCategory = await client.query(
            'SELECT id FROM categories WHERE name = $1 AND company_id = $2',
            [name.trim(), companyId]
        );

        if (existingCategory.rows.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: 'Une catégorie avec ce nom existe déjà dans votre entreprise' },
                { status: 409 }
            );
        }

        // Vérifier si le parent existe (si parent_id est fourni)
        let finalParentId = null;
        if (parent_id) {
            const parentCheck = await client.query(
                'SELECT id FROM categories WHERE id = $1 AND company_id = $2',
                [parent_id, companyId]
            );

            if (parentCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json(
                    { error: "La catégorie parente spécifiée n'existe pas dans votre entreprise" },
                    { status: 400 }
                );
            }
            finalParentId = parent_id;
        }

        // Insérer la nouvelle catégorie
        const insertResult = await client.query(
            `INSERT INTO categories (
                name, 
                description, 
                status, 
                parent_id, 
                company_id,
                created_at, 
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING *`,
            [
                name.trim(),
                description.trim() || null,
                status,
                finalParentId,
                companyId
            ]
        );

        const newCategory = insertResult.rows[0];
        console.log('✅ Catégorie créée avec ID:', newCategory.id);

        await client.query('COMMIT');

        // Récupérer la catégorie complète avec le nom du parent
        const completeResult = await client.query(
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
                0 as product_count
            FROM categories c
            LEFT JOIN categories p ON c.parent_id = p.id
            WHERE c.id = $1 AND c.company_id = $2
            `,
            [newCategory.id, companyId]
        );

        return NextResponse.json(completeResult.rows[0], { status: 201 });

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur PostgreSQL (POST categories) :', err);

        if (err.message === "Non authentifié") {
            return NextResponse.json({ error: err.message }, { status: 401 });
        }
        if (err.message === "Utilisateur non trouvé") {
            return NextResponse.json({ error: err.message }, { status: 404 });
        }

        if (err.code === "23505") {
            return NextResponse.json(
                { error: 'Une catégorie avec ce nom existe déjà' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: err?.message ?? "Erreur serveur lors de la création de la catégorie" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

/* PUT : modifier une catégorie */
export async function PUT(req: NextRequest) {
    const client = await pool.connect();

    try {
        const user = await getCurrentUserCompany();
        const companyId = user.company_id;

        const body = await req.json();
        const {
            id,
            name,
            description,
            status,
            parent_id
        } = body;

        console.log('🔄 Modification catégorie:', { id, name });

        // Validation
        if (!id) {
            return NextResponse.json(
                { error: "L'ID de la catégorie est requis" },
                { status: 400 }
            );
        }

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: "Le nom de la catégorie est requis" },
                { status: 400 }
            );
        }

        await client.query('BEGIN');

        // Vérifier que la catégorie existe et appartient à l'entreprise
        const categoryCheck = await client.query(
            'SELECT id, name FROM categories WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );

        if (categoryCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "Catégorie non trouvée" },
                { status: 404 }
            );
        }

        // Vérifier si le nouveau nom existe déjà pour une autre catégorie
        const nameCheck = await client.query(
            'SELECT id FROM categories WHERE name = $1 AND company_id = $2 AND id != $3',
            [name.trim(), companyId, id]
        );

        if (nameCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: `Une catégorie avec le nom "${name}" existe déjà dans votre entreprise` },
                { status: 409 }
            );
        }

        // Gestion du parent_id
        let finalParentId = null;
        if (parent_id !== undefined) {
            if (parent_id === null) {
                finalParentId = null;
            } else {
                // Empêcher une catégorie d'être son propre parent
                if (parent_id === id) {
                    await client.query('ROLLBACK');
                    return NextResponse.json(
                        { error: "Une catégorie ne peut pas être son propre parent" },
                        { status: 400 }
                    );
                }

                const parentCheck = await client.query(
                    'SELECT id FROM categories WHERE id = $1 AND company_id = $2',
                    [parent_id, companyId]
                );

                if (parentCheck.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return NextResponse.json(
                        { error: "La catégorie parente spécifiée n'existe pas dans votre entreprise" },
                        { status: 400 }
                    );
                }
                finalParentId = parent_id;
            }
        }

        // Construire la requête de mise à jour dynamiquement
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        updates.push(`name = $${paramCount}`);
        values.push(name.trim());
        paramCount++;

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

        updates.push(`updated_at = NOW()`);
        values.push(id, companyId);

        const query = `
            UPDATE categories 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
            RETURNING *
        `;

        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "Catégorie non trouvée" },
                { status: 404 }
            );
        }

        console.log('✅ Catégorie mise à jour:', id);

        await client.query('COMMIT');

        // Récupérer la catégorie mise à jour
        const completeResult = await client.query(
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
                COALESCE(pc.product_count, 0) as product_count
            FROM categories c
            LEFT JOIN categories p ON c.parent_id = p.id
            LEFT JOIN (
                SELECT category_id, COUNT(*) as product_count 
                FROM products 
                WHERE company_id = $2
                GROUP BY category_id
            ) pc ON c.id = pc.category_id
            WHERE c.id = $1 AND c.company_id = $2
            `,
            [id, companyId]
        );

        return NextResponse.json({
            message: 'Catégorie modifiée avec succès',
            category: completeResult.rows[0]
        });

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur PostgreSQL (PUT categories) :', err);

        if (err.message === "Non authentifié") {
            return NextResponse.json({ error: err.message }, { status: 401 });
        }
        if (err.message === "Utilisateur non trouvé") {
            return NextResponse.json({ error: err.message }, { status: 404 });
        }

        return NextResponse.json(
            { error: err?.message ?? "Erreur serveur lors de la modification de la catégorie" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

/* DELETE : supprimer une catégorie */
export async function DELETE(req: NextRequest) {
    const client = await pool.connect();

    try {
        const user = await getCurrentUserCompany();
        const companyId = user.company_id;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        console.log('🗑️ Suppression catégorie:', id);

        if (!id) {
            return NextResponse.json(
                { error: "L'ID de la catégorie est requis" },
                { status: 400 }
            );
        }

        const categoryId = parseInt(id);
        if (isNaN(categoryId)) {
            return NextResponse.json(
                { error: "ID de catégorie invalide" },
                { status: 400 }
            );
        }

        await client.query('BEGIN');

        // Vérifier que la catégorie existe et appartient à l'entreprise
        const categoryCheck = await client.query(
            'SELECT id, name FROM categories WHERE id = $1 AND company_id = $2',
            [categoryId, companyId]
        );

        if (categoryCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "Catégorie non trouvée" },
                { status: 404 }
            );
        }

        const categoryName = categoryCheck.rows[0].name;

        // Vérifier si la catégorie a des sous-catégories
        const childrenCheck = await client.query(
            'SELECT id, name FROM categories WHERE parent_id = $1 AND company_id = $2',
            [categoryId, companyId]
        );

        if (childrenCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            const childrenNames = childrenCheck.rows.map((c: any) => c.name).join(', ');
            return NextResponse.json(
                {
                    error: `Impossible de supprimer cette catégorie car elle a des sous-catégories : ${childrenNames}`
                },
                { status: 400 }
            );
        }

        // Vérifier si la catégorie est utilisée par des produits
        const productsCheck = await client.query(
            'SELECT COUNT(*) as count FROM products WHERE category_id = $1 AND company_id = $2',
            [categoryId, companyId]
        );

        const productCount = parseInt(productsCheck.rows[0].count);
        if (productCount > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                {
                    error: `Impossible de supprimer cette catégorie car ${productCount} produit(s) l'utilisent`
                },
                { status: 400 }
            );
        }

        // Supprimer la catégorie
        const deleteResult = await client.query(
            'DELETE FROM categories WHERE id = $1 AND company_id = $2 RETURNING id, name',
            [categoryId, companyId]
        );

        if (deleteResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "Catégorie non trouvée" },
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

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur PostgreSQL (DELETE categories) :', err);

        if (err.message === "Non authentifié") {
            return NextResponse.json({ error: err.message }, { status: 401 });
        }
        if (err.message === "Utilisateur non trouvé") {
            return NextResponse.json({ error: err.message }, { status: 404 });
        }

        return NextResponse.json(
            { error: err?.message ?? "Erreur serveur lors de la suppression de la catégorie" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}