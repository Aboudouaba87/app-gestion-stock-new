export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

        const companyId = session.user.company_id;

        const result = await pool.query(
            'SELECT * FROM company_settings WHERE company_id = $1',
            [companyId]
        );

        if (result.rows.length === 0) {
            // Créer des paramètres par défaut
            const defaultSettings = {
                company_id: companyId,
                company_name: '',
                company_email: '',
                company_phone: '',
                company_address: '',
                currency: 'XOF',
                language: 'fr',
                timezone: 'Africa/Lome',
                theme: 'light',
                low_stock_threshold: 10,
                critical_stock_threshold: 5,
                default_tax_rate: 20.0,
                invoice_prefix: 'INV-',
                invoice_start_number: 1000
            };

            await pool.query(
                `INSERT INTO company_settings 
        (company_id, company_name, company_email, company_phone, company_address,
         currency, language, timezone, theme, low_stock_threshold, critical_stock_threshold,
         default_tax_rate, invoice_prefix, invoice_start_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                Object.values(defaultSettings)
            );

            const newResult = await pool.query(
                'SELECT * FROM company_settings WHERE company_id = $1',
                [companyId]
            );

            return NextResponse.json(newResult.rows[0]);
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur GET company settings:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}



export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

        const companyId = session.user.company_id;
        const data = await request.json();

        // Liste des champs autorisés dans la table (hors champs système)
        const tableFields = [
            'company_name', 'company_email', 'company_phone', 'company_address',
            'currency', 'language', 'timezone', 'theme', 'low_stock_threshold',
            'critical_stock_threshold', 'default_tax_rate', 'invoice_prefix',
            'invoice_start_number'
        ];

        // Filtrer les données pour ne garder que les champs valides
        const updates: Record<string, any> = {};
        tableFields.forEach(field => {
            if (data[field] !== undefined) {
                updates[field] = data[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Aucune donnée valide fournie' }, { status: 400 });
        }

        // Construire la requête
        const fields = Object.keys(updates);
        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const values = [companyId, ...fields.map(field => updates[field])];

        const result = await pool.query(
            `UPDATE company_settings 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE company_id = $1
       RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            // Si aucun enregistrement n'existe, faire un INSERT
            const insertFields = ['company_id', ...fields];
            const insertValues = ['$1', ...fields.map((_, i) => `$${i + 2}`)];

            const insertResult = await pool.query(
                `INSERT INTO company_settings (${insertFields.join(', ')}, updated_at)
         VALUES (${insertValues.join(', ')}, CURRENT_TIMESTAMP)
         RETURNING *`,
                values
            );

            return NextResponse.json(insertResult.rows[0]);
        }

        return NextResponse.json(result.rows[0]);

    } catch (error: any) {
        console.error('Erreur PUT company settings:', error.message);
        return NextResponse.json({
            error: 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}