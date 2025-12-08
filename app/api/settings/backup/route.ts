export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { pool } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const companyId = session.user.company_id;

        const result = await pool.query(
            'SELECT * FROM backup_settings WHERE company_id = $1',
            [companyId]
        );

        if (result.rows.length === 0) {
            // Créer des paramètres par défaut
            const defaultSettings = {
                company_id: companyId,
                auto_backup: true,
                backup_frequency: 'daily',
                backup_time: '02:00',
                retention_days: 30,
                backup_location: 'local'
            };

            await pool.query(
                `INSERT INTO backup_settings 
        (company_id, auto_backup, backup_frequency, backup_time, retention_days, backup_location)
        VALUES ($1, $2, $3, $4, $5, $6)`,
                Object.values(defaultSettings)
            );

            const newResult = await pool.query(
                'SELECT * FROM backup_settings WHERE company_id = $1',
                [companyId]
            );

            return NextResponse.json(newResult.rows[0]);
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur GET backup settings:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}

// export async function PUT(request: Request) {
//     try {
//         const session = await getServerSession(authOptions);
//         if (!session) {
//             return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
//         }

//         const companyId = session.user.company_id;
//         const data = await request.json();

//         // Champs autorisés
//         const allowedFields = [
//             'auto_backup', 'backup_frequency', 'backup_time',
//             'retention_days', 'backup_location'
//         ];

//         // Filtrer les données
//         const filteredData: any = {};
//         allowedFields.forEach(field => {
//             if (data[field] !== undefined) {
//                 filteredData[field] = data[field];
//             }
//         });

//         const fields = Object.keys(filteredData);
//         if (fields.length === 0) {
//             return NextResponse.json({ error: 'Aucune donnée valide fournie' }, { status: 400 });
//         }

//         const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
//         const values = [companyId, ...fields.map(field => filteredData[field])];

//         const result = await pool.query(
//             `INSERT INTO backup_settings (company_id, ${fields.join(', ')})
//        VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(', ')})
//        ON CONFLICT (company_id) DO UPDATE
//        SET ${setClause}
//        RETURNING *`,
//             values
//         );

//         return NextResponse.json(result.rows[0]);
//     } catch (error) {
//         console.error('Erreur PUT backup settings:', error);
//         return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
//     }
// }


export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

        const companyId = session.user.company_id;
        const data = await request.json();

        // Supprimer les champs système
        delete data.id;
        delete data.company_id;
        delete data.created_at;
        delete data.updated_at;
        delete data.last_backup_at;
        delete data.last_backup_status;

        // Liste des champs autorisés
        const allowedFields = [
            'auto_backup', 'backup_frequency', 'backup_time',
            'retention_days', 'backup_location'
        ];

        // Filtrer les données
        const updates: Record<string, any> = {};
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updates[field] = data[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Aucune donnée valide fournie' }, { status: 400 });
        }

        // Construire la requête
        const fields = Object.keys(updates);
        const placeholders = fields.map((_, i) => `$${i + 2}`);
        const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
        const values = [companyId, ...fields.map(field => updates[field])];

        // Vérifier si l'enregistrement existe
        const checkResult = await pool.query(
            'SELECT id FROM backup_settings WHERE company_id = $1',
            [companyId]
        );

        let result;
        if (checkResult.rows.length === 0) {
            // INSERT
            result = await pool.query(
                `INSERT INTO backup_settings (company_id, ${fields.join(', ')})
         VALUES ($1, ${placeholders.join(', ')})
         RETURNING *`,
                values
            );
        } else {
            // UPDATE
            result = await pool.query(
                `UPDATE backup_settings 
         SET ${setClause}
         WHERE company_id = $1
         RETURNING *`,
                values
            );
        }

        return NextResponse.json(result.rows[0]);

    } catch (error: any) {
        console.error('Erreur PUT backup settings:', error.message);
        return NextResponse.json({
            error: 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        // Ici vous pouvez implémenter la logique de sauvegarde manuelle
        // Par exemple, lancer un job de sauvegarde

        return NextResponse.json({
            message: 'Sauvegarde manuelle lancée',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erreur POST backup:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}