"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname()

  const navigation = [
    { name: "Tableau de bord", href: "/", icon: "🏠", current: pathname === "/" },
    { name: "Produits", href: "/products", icon: "📦", current: pathname === "/products", badge: "1,234" },
    { name: "Stock", href: "/stocks", icon: "📊", current: pathname === "/stocks", badge: "856" },
    { name: "Ventes", href: "/sales", icon: "💰", current: pathname === "/sales" },
    { name: "Fournisseurs", href: "/suppliers", icon: "🏢", current: pathname === "/suppliers", badge: "45" },
    { name: "Utilisateurs", href: "/users", icon: "👥", current: pathname === "/users", badge: "12" },
    { name: "Rapports", href: "/reports", icon: "📈", current: pathname === "/reports" },
    { name: "Paramètres", href: "/settings", icon: "⚙️", current: pathname === "/settings" },
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SP</span>
              </div>
              <span className="text-xl font-bold text-gray-900">StockPro</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="lg:hidden">
              ✕
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  item.current
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm">👤</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
                <p className="text-xs text-gray-500 truncate">admin@stockpro.com</p>
              </div>
              <Button variant="ghost" size="sm">
                ⚙️
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
