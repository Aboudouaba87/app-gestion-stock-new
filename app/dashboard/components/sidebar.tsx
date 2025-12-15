"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  BarChart3,
  Truck,
  Users,
  Settings,
  List,
  LogOut,
  Menu,
  X,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

// Définition des types pour les items du menu
interface MenuItem {
  icon: React.ComponentType<any>;
  label: string;
  href: string;
  roles: string[]; // Rôles autorisés à voir cet item
  isLogout?: boolean;
}

// Tous les items du menu avec leurs permissions
const allMenuItems: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Tableau de bord",
    href: "/dashboard",
    roles: ["admin", "manager", "user"],
  },
  {
    icon: Package,
    label: "Produits",
    href: "/dashboard/products",
    roles: ["admin"],
  },
  {
    icon: ShoppingCart,
    label: "Ventes",
    href: "/dashboard/sales",
    roles: ["admin", "manager"],
  },
  {
    icon: Boxes,
    label: "Stocks",
    href: "/dashboard/stocks",
    roles: ["admin", "manager"],
  },
  {
    icon: BarChart3,
    label: "Rapports",
    href: "/dashboard/reports",
    roles: ["admin"],
  },
  {
    icon: List,
    label: "Catégories",
    href: "/dashboard/categories",
    roles: ["admin"],
  },
  {
    icon: Warehouse,
    label: "Entrepôts",
    href: "/dashboard/warehouses",
    roles: ["admin"],
  },
  {
    icon: Truck,
    label: "Fournisseurs",
    href: "/dashboard/suppliers",
    roles: ["admin"],
  },
  {
    icon: Users,
    label: "Utilisateurs",
    href: "/dashboard/users",
    roles: ["admin"],
  },
  {
    icon: Settings,
    label: "Paramètres",
    href: "/dashboard/settings",
    roles: ["admin", "manager"],
  },
  {
    icon: LogOut,
    label: "Déconnexion",
    href: "#",
    roles: ["admin", "manager", "user"],
    isLogout: true,
  },
];

export function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Récupérer le rôle de l'utilisateur
  const userRole = session?.user?.role || "user";

  // Fermer le menu mobile lors du changement de route
  useEffect(() => {
    if (isMobileMenuOpen) {
      handleCloseMobileMenu();
    }
  }, [pathname]);

  // Empêcher le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  // Gestion de la déconnexion
  const handleLogout = async () => {
    try {
      await signOut({
        callbackUrl: "/",
        redirect: true,
      });
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  // Fermer le menu mobile avec animation
  const handleCloseMobileMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsClosing(false);
    }, 300);
  };

  // Filtrer les items du menu selon le rôle de l'utilisateur
  const menuItems = allMenuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  // Si le chargement de session est en cours
  // if (status === "loading") {
  //   return (
  //     <>
  //       {/* Bouton menu mobile avec marge pour ne pas cacher le contenu */}
  //       <button
  //         onClick={() => setIsMobileMenuOpen(true)}
  //         className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-md shadow-lg"
  //         style={{ marginTop: "env(safe-area-inset-top, 0)" }}
  //       >
  //         <Menu className="h-6 w-6" />
  //       </button>

  //       {/* Sidebar de chargement */}
  //       <div className="hidden lg:flex w-64 bg-slate-900 text-white flex-col">
  //         <div className="p-4 border-b border-slate-700">
  //           <div className="flex items-center space-x-2">
  //             <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
  //               <Image
  //                 src="/logo.png"
  //                 alt="Logo StockPro"
  //                 width={75}
  //                 height={75}
  //                 priority
  //               />
  //             </div>
  //             <span className="font-bold text-lg">StockPro</span>
  //           </div>
  //         </div>
  //         <div className="flex-1 p-4 flex items-center justify-center">
  //           <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
  //         </div>
  //       </div>
  //     </>
  //   );
  // }

  // Si aucune session, ne pas afficher la sidebar
  if (!session) {
    return null;
  }

  // Composant du contenu de la sidebar
  const SidebarContent = () => (
    <div className="w-64 h-full bg-slate-900 text-white flex flex-col">
      {/* Header avec info utilisateur */}
      <div className="p-4 border-b border-slate-700">
        <Link href="/dashboard">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
              <Image
                src="/logo.png"
                alt="Logo StockPro"
                width={75}
                height={75}
                priority
              />
            </div>
            <span className="font-bold text-lg">StockPro</span>
          </div>
        </Link>

        {/* Info utilisateur */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="font-bold text-sm">
                {session.user?.name?.[0]?.toUpperCase() ||
                  session.user?.email?.[0]?.toUpperCase() ||
                  "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session.user?.name || session.user?.email}
              </p>
              <p className="text-xs text-slate-400 capitalize">
                {userRole === "admin"
                  ? "Administrateur"
                  : userRole === "manager"
                  ? "Gestionnaire"
                  : "Utilisateur"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 px-2">
          Navigation
        </p>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            if (item.isLogout) {
              return (
                <li key={item.href}>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "flex items-center space-x-3 w-full px-3 py-2 rounded-lg transition-colors",
                      "text-slate-300 hover:bg-red-600 hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer avec info de rôle */}
      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-500 text-center">
          {userRole === "admin" ? (
            <p>Accès complet (Administrateur)</p>
          ) : userRole === "manager" ? (
            <p>Accès gestionnaire</p>
          ) : (
            <p>Accès de base</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Bouton menu mobile - Positionné avec plus de marge */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-md shadow-lg hover:bg-slate-800 transition-colors"
        aria-label="Ouvrir le menu"
        style={{
          marginTop: "env(safe-area-inset-top, 1rem)",
          marginLeft: "env(safe-area-inset-left, 1rem)",
        }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay pour mobile */}
      {isMobileMenuOpen && (
        <div
          className={cn(
            "lg:hidden fixed inset-0 bg-black z-40 transition-opacity duration-300",
            isClosing ? "opacity-0" : "opacity-50"
          )}
          onClick={handleCloseMobileMenu}
        />
      )}

      {/* Sidebar pour mobile */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out",
          isMobileMenuOpen
            ? isClosing
              ? "-translate-x-full"
              : "translate-x-0"
            : "-translate-x-full"
        )}
        style={{
          paddingTop: "env(safe-area-inset-top, 0)",
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}
      >
        <SidebarContent />
        {/* Bouton fermer pour mobile */}
        <button
          onClick={handleCloseMobileMenu}
          className="absolute top-4 right-4 p-2 text-white hover:bg-slate-800 rounded-full z-50"
          aria-label="Fermer le menu"
          style={{ marginTop: "env(safe-area-inset-top, 1rem)" }}
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar pour desktop */}
      <div className="hidden lg:flex">
        <SidebarContent />
      </div>
    </>
  );
}
