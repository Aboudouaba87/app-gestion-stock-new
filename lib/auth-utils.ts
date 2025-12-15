import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getCurrentUser() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return null;
    }

    const companyId = Number(session.user.company_id);

    if (!companyId || Number.isNaN(companyId)) {
        return null;
    }

    return {
        id: Number(session.user.id),
        company_id: companyId,
        role: session.user.role || 'user',
        warehouse: session.user.warehouse || 'main',
        name: session.user.name || '',
        email: session.user.email || '',
        warehouse_id: session.user.warehouse_id || ''
    };
}

export async function getCurrentUserCompany() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return null;
    }

    const companyId = Number(session.user.company_id);
    const warehouseyId = Number(session.user.warehouse_id);

    if (!companyId || Number.isNaN(companyId)) {
        return null;
    }

    return {
        id: Number(session.user.id),
        name: session.user.name || '',
        email: session.user.email || '',
        role: session.user.role || 'user',
        warehouse: session.user.warehouse || 'main',
        company_id: companyId,
        warehouse_id: warehouseyId
    };
}