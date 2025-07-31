import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Smartphone, Laptop } from "lucide-react"

const alerts = [
  {
    id: 1,
    product: "iPhone 15 Pro 256GB",
    category: "Smartphones",
    stock: 2,
    icon: Smartphone,
    status: "low",
  },
  {
    id: 2,
    product: "Laptop Lenovo ThinkPad",
    category: "Ordinateurs",
    stock: 0,
    icon: Laptop,
    status: "out",
  },
]

export function StockAlerts() {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
          Alertes stock
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => {
            const Icon = alert.icon
            return (
              <div
                key={alert.id}
                className="flex items-center justify-between p-4 border-l-4 border-orange-500 bg-orange-50 rounded-r-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Icon className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{alert.product}</div>
                    <div className="text-sm text-gray-600">{alert.category}</div>
                  </div>
                </div>
                <Badge
                  variant={alert.status === "out" ? "destructive" : "secondary"}
                  className={alert.status === "out" ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"}
                >
                  {alert.stock === 0 ? "0 unités" : `${alert.stock} unités`}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
