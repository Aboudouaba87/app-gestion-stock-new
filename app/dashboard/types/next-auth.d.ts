// types/next-auth.d.ts
import "next-auth";
import { number } from "zod";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            warehouse: string;
            company_id: number;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            warehouse_id?: number | null;
        };
    }

    interface User {
        id: string;
        role: string;
        warehouse: string;
        company_id: number;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        warehouse_id?: number | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        warehouse: string;
        company_id: number;
        warehouse_id?: number | null;
    }
}