// app/api/warehouses/route.ts
import { NextResponse, NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { number } from "zod";

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

export async function GET() {
    try {
        // Récupérer le company_id depuis la session
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.company_id) {
            console.error("❌ Session utilisateur ou company_id manquant");
            return NextResponse.json(
                { error: "Non autorisé ou company_id manquant" },
                { status: 401 }
            );
        }

        const companyId = session.user.company_id;
        console.log(`📦 Récupération des entrepôts pour company_id: ${companyId}`);

        const result = await pool.query(
            `SELECT id, taux 
            FROM tva WHERE company_id = $1 `,
            [companyId]
        );

        console.log(`📦 ${result.rows.length} entrepôts trouvés pour company ${companyId}:`, result.rows);

        return NextResponse.json(result.rows, { status: 200 });
    } catch (err: any) {
        console.error("❌ Erreur fetch warehouses:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/* PUT : modifier une catégorie */
export async function PUT(req: NextRequest) {
    const client = await pool.connect();

    try {
        const user = await getCurrentUserCompany();
        const companyId = user.company_id;

        const body = await req.json();
        const { tva } = body;
        console.log("La valeure du body est : ", body);

        console.log('🔄 Modification TVA:', tva);
        console.log('le type de tva est : ', typeof (tva));


        // Validation


        // Vérifier que la catégorie existe et appartient à l'entreprise
        const categoryCheck = await client.query(
            'SELECT taux FROM tva WHERE  company_id = $1',
            [companyId]
        );

        if (categoryCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                { error: "TVA non trouvée" },
                { status: 404 }
            );
        }
        let resut = await client.query(
            'UPDATE tva SET taux = $1 WHERE company_id = $2', [tva, companyId]
        )

        return NextResponse.json({
            message: 'TVA modifiée avec succès',
            tva: resut.rows[0]
        });

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur PostgreSQL (PUT TVA) :', err);

        return NextResponse.json(
            { error: err?.message ?? "Erreur serveur lors de la modification de la TVA" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}