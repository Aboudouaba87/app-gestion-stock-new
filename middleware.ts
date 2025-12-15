// // middleware.ts
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
// import { getToken } from 'next-auth/jwt';

// export async function middleware(request: NextRequest) {
//     const token = await getToken({ req: request });
//     const { pathname } = request.nextUrl;

//     console.log(`🛡️ Middleware - Route: ${pathname}, Token: ${token ? 'Oui' : 'Non'}`);

//     // Routes publiques (accessibles sans connexion)
//     const publicPaths = [
//         '/',
//         '/inscription',
//         '/api/auth',
//         '/_next',
//         '/favicon.ico',
//         '/logo.png',
//         '/api/auth/register' // Important : permettre l'inscription
//     ];

//     // Vérifier si la route actuelle est publique
//     const isPublicPath = publicPaths.some(path =>
//         pathname === path || pathname.startsWith(path + '/')
//     );

//     // Si c'est une route publique, autoriser l'accès
//     if (isPublicPath) {
//         return NextResponse.next();
//     }

//     // Si l'utilisateur n'est pas connecté et essaie d'accéder à une route protégée
//     if (!token) {
//         console.log('🔒 Accès refusé, redirection vers la page de connexion');

//         // Créer l'URL de connexion SANS paramètre callbackUrl pour éviter les boucles
//         const loginUrl = new URL('/', request.url);
//         return NextResponse.redirect(loginUrl);
//     }

//     // Si l'utilisateur est connecté et essaie d'accéder à la page de connexion/inscription
//     if (token && (pathname === '/' || pathname === '/inscription')) {
//         console.log('✅ Déjà connecté, redirection vers /dashboard');
//         return NextResponse.redirect(new URL('/dashboard', request.url));
//     }

//     return NextResponse.next();
// }

// export const config = {
//     matcher: [
//         /*
//          * Match all request paths except:
//          * - _next/static (static files)
//          * - _next/image (image optimization files)
//          * - favicon.ico (favicon file)
//          * - public folder files
//          */
//         '/((?!_next/static|_next/image|favicon.ico|public/).*)',
//     ],
// };


// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    });
    const { pathname } = request.nextUrl;

    console.log(`🛡️ Middleware - Route: ${pathname}, Token: ${token ? 'Oui' : 'Non'}, Rôle: ${token?.role}`);

    // Routes publiques (accessibles sans connexion)
    const publicPaths = [
        '/',
        '/inscription',
        '/api/auth',
        '/_next',
        '/favicon.ico',
        '/logo.png',
        '/api/auth/register',
        '/unauthorized'
    ];

    // Vérifier si la route actuelle est publique
    const isPublicPath = publicPaths.some(path =>
        pathname === path || pathname.startsWith(path + '/')
    );

    // Si c'est une route publique, autoriser l'accès
    if (isPublicPath) {
        return NextResponse.next();
    }

    // Si l'utilisateur n'est pas connecté et essaie d'accéder à une route protégée
    if (!token) {
        console.log('🔒 Accès refusé, redirection vers la page de connexion');
        const loginUrl = new URL('/', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Si l'utilisateur est connecté et essaie d'accéder à la page de connexion/inscription
    if (token && (pathname === '/' || pathname === '/inscription')) {
        console.log('✅ Déjà connecté, redirection vers /dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // GESTION DES RÔLES
    const userRole = token.role as string;

    // Définir les permissions par rôle avec un type explicite
    interface RolePermissions {
        [key: string]: string[];
    }

    const rolePermissions: RolePermissions = {
        admin: [
            '/dashboard',
            '/dashboard/products',
            '/dashboard/stocks',
            '/dashboard/sales',
            '/dashboard/reports',
            '/dashboard/categories',
            '/dashboard/suppliers',
            '/dashboard/users',
            '/dashboard/settings'
        ],
        manager: [
            '/dashboard',
            '/dashboard/sales',
            '/dashboard/stocks',
            '/dashboard/settings'
        ],
        user: [
            '/dashboard'
        ]
    };

    // Vérifier si l'utilisateur a accès à la route
    const allowedRoutes = rolePermissions[userRole] || [];
    const hasAccess = allowedRoutes.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    );

    // Si l'utilisateur n'a pas accès, rediriger vers unauthorized
    if (!hasAccess && pathname.startsWith('/dashboard')) {
        console.log(`🚫 Accès refusé pour le rôle "${userRole}" à ${pathname}`);
        return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Vérifier l'accès aux API dashboard
    if (pathname.startsWith('/api/dashboard')) {
        const apiRoute = pathname.replace('/api/dashboard', '/dashboard');
        const hasApiAccess = allowedRoutes.some(route =>
            apiRoute === route || apiRoute.startsWith(route + '/')
        );

        if (!hasApiAccess) {
            console.log(`🚫 Accès API refusé pour le rôle "${userRole}" à ${pathname}`);
            return NextResponse.json(
                { error: 'Accès non autorisé' },
                { status: 403 }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    ],
};