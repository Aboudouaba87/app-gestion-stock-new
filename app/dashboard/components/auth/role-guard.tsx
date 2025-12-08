// components/auth/role-guard.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export function RoleGuard({
  children,
  allowedRoles = ["admin"],
  redirectTo = "/unauthorized",
}: RoleGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    const userRole = session.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      router.push(redirectTo);
    }
  }, [session, status, router, allowedRoles, redirectTo]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const userRole = session?.user?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return null; // Ou un loader pendant la redirection
  }

  return <>{children}</>;
}
