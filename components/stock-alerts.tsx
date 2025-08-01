"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function StockAlerts() {
  const alerts = [
    { id: 1, product: "Samsung Galaxy S23", stock: 5, threshold: 10, status: "low" },
    { id: 2, product: "MacBook Air M2", stock: 0, threshold: 5, status: "out" },
    { id: 3, product: "AirPods Pro", stock: 8, threshold: 15, status: "low" },
    { id: 4, product: "iPad Mini", stock: 2, threshold: 10, status: "critical" },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "out":
        return <Badge variant="destructive">❌ Rupture</Badge>
      case "critical":
        return <Badge className="bg-red-100 text-red-800">🚨 Critique</Badge>
      case "low":
        return <Badge className="bg-orange-100 text-orange-800">⚠️ Faible</Badge>
      default:
        return <Badge variant="secondary">ℹ️ Normal</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">🚨 Alertes de stock</CardTitle>
        <CardDescription>Produits nécessitant une attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm">{alert.product}</p>
                <p className="text-xs text-gray-500">
                  Stock: {alert.stock} / Seuil: {alert.threshold}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(alert.status)}
                <Button size="sm" variant="outline">
                  📦 Réapprovisionner
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
