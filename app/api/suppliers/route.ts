import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// GET - Récupérer tous les fournisseurs OU un fournisseur spécifique
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        // Si un ID est fourni, récupérer un fournisseur spécifique
        if (id) {
            console.log("📦 GET /api/suppliers?id= - Début");

            if (isNaN(parseInt(id))) {
                return NextResponse.json(
                    { error: 'ID invalide' },
                    { status: 400 }
                );
            }

            const supplierId = parseInt(id);
            const result = await pool.query(
                'SELECT * FROM suppliers WHERE id = $1',
                [supplierId]
            );

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { error: 'Fournisseur non trouvé' },
                    { status: 404 }
                );
            }

            console.log(`✅ GET /api/suppliers?id= - Fournisseur trouvé: ${result.rows[0].name}`);
            return NextResponse.json({ supplier: result.rows[0] });
        }

        // Sinon, récupérer tous les fournisseurs
        console.log("📦 GET /api/suppliers - Début");
        const result = await pool.query(
            `SELECT id, name, contact, email, phone, address, products, status, created_at, updated_at 
             FROM suppliers 
             ORDER BY name ASC`
        );

        console.log(`✅ GET /api/suppliers - ${result.rows.length} fournisseur(s) trouvé(s)`);
        return NextResponse.json(result.rows, { status: 200 });

    } catch (err: any) {
        console.error("❌ GET /api/suppliers - Erreur:", err);
        return NextResponse.json(
            { error: "Erreur interne lors de la récupération des fournisseurs" },
            { status: 500 }
        );
    }
}

// POST - Créer un nouveau fournisseur
export async function POST(request: NextRequest) {
    try {
        console.log("📦 POST /api/suppliers - Début");

        const body = await request.json();

        // Validation des champs obligatoires
        if (!body.name || !body.contact) {
            return NextResponse.json(
                { error: 'Les champs "name" et "contact" sont obligatoires' },
                { status: 400 }
            );
        }

        // Vérifier si le nom existe déjà
        const existingSupplier = await pool.query(
            'SELECT id FROM suppliers WHERE name = $1',
            [body.name]
        );

        if (existingSupplier.rows.length > 0) {
            return NextResponse.json(
                { error: 'Un fournisseur avec ce nom existe déjà' },
                { status: 409 }
            );
        }

        // Insérer le nouveau fournisseur
        const result = await pool.query(
            `INSERT INTO suppliers (name, contact, email, phone, address, status, products) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [
                body.name.trim(),
                body.contact.trim(),
                body.email?.trim() || null,
                body.phone?.trim() || null,
                body.address?.trim() || null,
                body.status || 'active',
                body.products || 0
            ]
        );

        console.log(`✅ POST /api/suppliers - Fournisseur créé: ${body.name}`);

        return NextResponse.json({
            message: 'Fournisseur créé avec succès',
            supplier: result.rows[0]
        }, { status: 201 });

    } catch (error: any) {
        console.error('❌ POST /api/suppliers - Erreur:', error);

        if (error.code === '23505') {
            return NextResponse.json(
                { error: 'Un fournisseur avec ce nom existe déjà' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Erreur interne du serveur' },
            { status: 500 }
        );
    }
}

// PUT - Modifier un fournisseur
export async function PUT(request: NextRequest) {
    try {
        console.log("📦 PUT /api/suppliers - Début");

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        console.log('🔍 PUT - ID from URL:', id);

        if (!id || isNaN(parseInt(id))) {
            return NextResponse.json(
                { error: 'ID invalide ou manquant' },
                { status: 400 }
            );
        }

        const supplierId = parseInt(id);
        const body = await request.json();

        console.log('🔍 PUT - Body received:', body);

        // Valider qu'il y a au moins un champ à modifier
        const fieldsToUpdate = Object.keys(body).filter(key =>
            key !== 'id' && body[key] !== undefined && body[key] !== null
        );

        if (fieldsToUpdate.length === 0) {
            return NextResponse.json(
                { error: 'Aucune donnée à modifier' },
                { status: 400 }
            );
        }

        // Vérifier si le fournisseur existe
        const existingSupplier = await pool.query(
            'SELECT id, name FROM suppliers WHERE id = $1',
            [supplierId]
        );

        if (existingSupplier.rows.length === 0) {
            return NextResponse.json(
                { error: 'Fournisseur non trouvé' },
                { status: 404 }
            );
        }

        // Construire la requête UPDATE dynamiquement
        const updateFields: string[] = [];
        const queryParams: any[] = [];
        let paramCount = 1;

        if (body.name !== undefined) {
            // Vérifier si le nom existe déjà pour un autre fournisseur
            if (body.name !== existingSupplier.rows[0].name) {
                const duplicateName = await pool.query(
                    'SELECT id FROM suppliers WHERE name = $1 AND id != $2',
                    [body.name, supplierId]
                );

                if (duplicateName.rows.length > 0) {
                    return NextResponse.json(
                        { error: 'Un autre fournisseur avec ce nom existe déjà' },
                        { status: 409 }
                    );
                }
            }

            updateFields.push(`name = $${paramCount}`);
            queryParams.push(String(body.name).trim());
            paramCount++;
        }

        if (body.contact !== undefined) {
            updateFields.push(`contact = $${paramCount}`);
            queryParams.push(String(body.contact).trim());
            paramCount++;
        }

        if (body.email !== undefined) {
            updateFields.push(`email = $${paramCount}`);
            queryParams.push(body.email ? String(body.email).trim() : null);
            paramCount++;
        }

        if (body.phone !== undefined) {
            updateFields.push(`phone = $${paramCount}`);
            queryParams.push(body.phone ? String(body.phone).trim() : null);
            paramCount++;
        }

        if (body.address !== undefined) {
            updateFields.push(`address = $${paramCount}`);
            queryParams.push(body.address ? String(body.address).trim() : null);
            paramCount++;
        }

        if (body.status !== undefined) {
            if (!['active', 'inactive'].includes(body.status)) {
                return NextResponse.json(
                    { error: 'Le statut doit être "active" ou "inactive"' },
                    { status: 400 }
                );
            }
            updateFields.push(`status = $${paramCount}`);
            queryParams.push(body.status);
            paramCount++;
        }

        if (body.products !== undefined) {
            const products = Number(body.products);
            if (isNaN(products) || products < 0) {
                return NextResponse.json(
                    { error: 'Le nombre de produits doit être un nombre positif' },
                    { status: 400 }
                );
            }
            updateFields.push(`products = $${paramCount}`);
            queryParams.push(products);
            paramCount++;
        }

        // Ajouter updated_at et WHERE clause
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        queryParams.push(supplierId);

        const query = `
            UPDATE suppliers 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        console.log('🔍 PUT - Requête SQL:', query);

        // Mettre à jour le fournisseur
        const result = await pool.query(query, queryParams);

        console.log(`✅ PUT /api/suppliers - Fournisseur modifié: ${result.rows[0].name}`);

        return NextResponse.json({
            message: 'Fournisseur modifié avec succès',
            supplier: result.rows[0]
        });

    } catch (error: any) {
        console.error('❌ PUT /api/suppliers - Erreur:', error);

        if (error.code === '23505') {
            return NextResponse.json(
                { error: 'Un autre fournisseur avec ce nom existe déjà' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Erreur interne du serveur' },
            { status: 500 }
        );
    }
}

// DELETE - Supprimer un fournisseur
export async function DELETE(request: NextRequest) {
    try {
        console.log("📦 DELETE /api/suppliers - Début");

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id || isNaN(parseInt(id))) {
            return NextResponse.json(
                { error: 'ID invalide ou manquant' },
                { status: 400 }
            );
        }

        const supplierId = parseInt(id);

        // Vérifier si le fournisseur existe
        const existingSupplier = await pool.query(
            'SELECT id, name FROM suppliers WHERE id = $1',
            [supplierId]
        );

        if (existingSupplier.rows.length === 0) {
            return NextResponse.json(
                { error: 'Fournisseur non trouvé' },
                { status: 404 }
            );
        }

        // Vérifier s'il y a des produits associés
        const productsCheck = await pool.query(
            'SELECT id, name FROM products WHERE supplier = $1',
            [supplierId]
        );

        if (productsCheck.rows.length > 0) {
            return NextResponse.json(
                {
                    error: 'Impossible de supprimer ce fournisseur',
                    details: `${productsCheck.rows.length} produit(s) sont associés à ce fournisseur`
                },
                { status: 400 }
            );
        }

        // Supprimer le fournisseur
        const result = await pool.query(
            'DELETE FROM suppliers WHERE id = $1 RETURNING id, name',
            [supplierId]
        );

        console.log(`✅ DELETE /api/suppliers - Fournisseur supprimé: ${result.rows[0].name}`);

        return NextResponse.json({
            message: 'Fournisseur supprimé avec succès',
            deletedSupplier: result.rows[0]
        });

    } catch (error: any) {
        console.error('❌ DELETE /api/suppliers - Erreur:', error);

        if (error.code === '23503') {
            return NextResponse.json(
                { error: 'Impossible de supprimer : des produits sont associés à ce fournisseur' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Erreur interne du serveur' },
            { status: 500 }
        );
    }
}