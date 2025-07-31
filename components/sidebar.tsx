"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, Warehouse, ShoppingCart, BarChart3, Truck, Users, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const menuItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/" },
  { icon: Package, label: "Produits", href: "/products" },
  { icon: Warehouse, label: "Stocks", href: "/stocks" },
  { icon: ShoppingCart, label: "Ventes", href: "/sales" },
  { icon: BarChart3, label: "Rapports", href: "/reports" },
  { icon: Truck, label: "Fournisseurs", href: "/suppliers" },
  { icon: Users, label: "Utilisateurs", href: "/users" },
  { icon: Settings, label: "Paramètres", href: "/settings" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg">StockPro</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white",
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
