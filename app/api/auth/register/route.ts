export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    const client = await pool.connect();

    try {
        const body = await request.json();

        const {
            name,
            email,
            phone,
            companyName,
            password,
            confirmPassword
        } = body;

        // Validations
        if (password !== confirmPassword) {
            return NextResponse.json(
                { success: false, message: 'Les mots de passe ne correspondent pas.' },
                { status: 400 }
            );
        }

        await client.query('BEGIN');

        // Vérifier si l'email existe déjà
        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            client.release();
            return NextResponse.json(
                { success: false, message: 'Un utilisateur avec cet email existe déjà.' },
                { status: 400 }
            );
        }

        // Vérifier si l'entreprise existe déjà
        const existingCompany = await client.query(
            'SELECT id FROM companies WHERE name = $1',
            [companyName]
        );

        if (existingCompany.rows.length > 0) {
            await client.query('ROLLBACK');
            client.release();
            return NextResponse.json(
                { success: false, message: 'Une entreprise avec ce nom existe déjà.' },
                { status: 400 }
            );
        }

        // 1. Créer l'entreprise
        const companyResult = await client.query(
            `INSERT INTO companies (name, email, phone, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW()) 
       RETURNING id, name, email, status`,
            [companyName, email, phone || null, 'active']
        );

        const company = companyResult.rows[0];

        // 2. Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 12);

        // 3. Créer l'utilisateur
        const userResult = await client.query(
            `INSERT INTO users (
        name, email, phone, role, warehouse, status, 
        password_hash, email_verified, auth_provider, company_id,
        created_at, updated_at,lastlogin
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(),NOW()) 
      RETURNING id, name, email, role, warehouse, status, company_id`,
            [
                name,
                email,
                phone || null,
                'admin',
                'main',
                'active',
                hashedPassword,
                false,
                'credentials',
                company.id
            ]
        );

        const newUser = userResult.rows[0];

        // 4. Créer l'entrepôt principal
        await client.query(
            `INSERT INTO warehouses (company_id, value, label, metadata)
       VALUES ($1, $2, $3, $4)`,
            [
                company.id,
                'main',
                'Entrepôt Principal',
                JSON.stringify({ is_default: true })
            ]
        );

        await client.query('COMMIT');
        client.release();

        return NextResponse.json({
            success: true,
            message: 'Compte créé avec succès!',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                warehouse: newUser.warehouse,
                company_id: newUser.company_id
            },
            company: {
                id: company.id,
                name: company.name
            }
        }, { status: 201 });

    } catch (error: any) {
        console.error('Erreur inscription:', error);

        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Erreur lors du rollback:', rollbackError);
            }
            client.release();
        }

        return NextResponse.json(
            {
                success: false,
                message: error.message || "Erreur interne lors de l'inscription.",
            },
            { status: 500 }
        );
    }
}