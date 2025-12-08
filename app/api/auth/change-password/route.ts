export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getToken } from 'next-auth/jwt';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const { currentPassword, newPassword, confirmPassword } = await request.json();
        const userId = session.user.id;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json({
                error: 'Tous les champs sont requis'
            }, { status: 400 });
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json({
                error: 'Les nouveaux mots de passe ne correspondent pas'
            }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({
                error: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
            }, { status: 400 });
        }

        // Récupérer le mot de passe actuel
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
        }

        const storedHash = userResult.rows[0].password_hash;

        // Vérifier le mot de passe actuel
        const isValidPassword = await bcrypt.compare(currentPassword, storedHash);

        if (!isValidPassword) {
            return NextResponse.json({
                error: 'Mot de passe actuel incorrect'
            }, { status: 400 });
        }

        // Vérifier que le nouveau mot de passe est différent de l'ancien
        const isSamePassword = await bcrypt.compare(newPassword, storedHash);
        if (isSamePassword) {
            return NextResponse.json({
                error: 'Le nouveau mot de passe doit être différent de l\'ancien'
            }, { status: 400 });
        }

        // Hacher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Mettre à jour le mot de passe
        await pool.query(
            `UPDATE users 
       SET password_hash = $1, 
           password_reset_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
            [hashedPassword, userId]
        );

        // IMPORTANT: Répondre avec un flag pour indiquer qu'il faut se reconnecter
        return NextResponse.json({
            message: 'Mot de passe changé avec succès. Vous allez être déconnecté pour vous reconnecter avec votre nouveau mot de passe.',
            success: true,
            requiresReLogin: true, // Flag important
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Erreur changement mot de passe:', error.message);
        return NextResponse.json({
            error: 'Erreur serveur lors du changement de mot de passe',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}