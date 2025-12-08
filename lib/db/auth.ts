// lib/db/auth.ts
import pool from '@/lib/db';

export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
    warehouse?: string;
    status: 'active' | 'inactive';
    password_hash: string;
    email_verified: boolean;
    login_attempts: number;
    locked_until: Date | null;
    lastlogin: Date | null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
    try {
        const result = await pool.query(
            `SELECT id, name, email, phone, role, warehouse, status, 
              password_hash, email_verified, login_attempts, 
              locked_until, lastlogin
       FROM users 
       WHERE email = $1`,
            [email]
        );

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

export async function incrementLoginAttempts(email: string): Promise<void> {
    try {
        await pool.query('SELECT increment_login_attempts($1)', [email]);
    } catch (error) {
        console.error('Error incrementing login attempts:', error);
    }
}

export async function resetLoginAttempts(email: string): Promise<void> {
    try {
        await pool.query('SELECT reset_login_attempts($1)', [email]);
    } catch (error) {
        console.error('Error resetting login attempts:', error);
    }
}

export async function updateLastLogin(email: string): Promise<void> {
    try {
        await pool.query(
            'UPDATE users SET lastlogin = NOW(), updated_at = NOW() WHERE email = $1',
            [email]
        );
    } catch (error) {
        console.error('Error updating last login:', error);
    }
}