"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/sidebar"
import { StatsCards } from "@/components/stats-cards"
import { SalesChart } from "@/components/sales-chart"
import { TopProductsChart } from "@/components/top-products-chart"
import { StockAlerts } from "@/components/stock-alerts"

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const recentActivities = [
    { id: 1, action: "Nouvelle vente", product: "iPhone 14", amount: "999€", time: "Il y a 5 min", type: "sale" },
    {
      id: 2,
      action: "Stock faible",
      product: "Samsung Galaxy S23",
      amount: "5 unités",
      time: "Il y a 15 min",
      type: "warning",
    },
    { id: 3, action: "Nouveau produit", product: "MacBook Pro M2", amount: "Ajouté", time: "Il y a 1h", type: "info" },
    { id: 4, action: "Commande livrée", product: "iPad Air", amount: "10 unités", time: "Il y a 2h", type: "success" },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "sale":
        return "💰"
      case "warning":
        return "⚠️"
      case "info":
        return "ℹ️"
      case "success":
        return "✅"
      default:
        return "📋"
    }
  }

  const getActivityBadge = (type: string) => {
    switch (type) {
      case "sale":
        return "default"
      case "warning":
        return "destructive"
      case "info":
        return "secondary"
      case "success":
        return "default"
      default:
        return "secondary"
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
                ☰
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
                <p className="text-sm text-gray-500">Vue d'ensemble de votre inventaire</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                📊 Rapport
              </Button>
              <Button size="sm">➕ Nouveau produit</Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Cards */}
            <StatsCards />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesChart />
              <TopProductsChart />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">🕒 Activités récentes</CardTitle>
                  <CardDescription>Dernières actions sur votre inventaire</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getActivityIcon(activity.type)}</span>
                          <div>
                            <p className="font-medium text-sm">{activity.action}</p>
                            <p className="text-xs text-gray-500">{activity.product}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={getActivityBadge(activity.type) as any} className="text-xs">
                            {activity.amount}
                          </Badge>
                          <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Stock Alerts */}
              <StockAlerts />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
