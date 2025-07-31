import { Card, CardContent } from "@/components/ui/card"
import { Euro, ShoppingCart, Package, Users } from "lucide-react"

const stats = [
  {
    title: "Chiffre d'affaires",
    value: "€45,231",
    change: "+20.1% par rapport au mois dernier",
    icon: Euro,
    positive: true,
  },
  {
    title: "Commandes",
    value: "2,350",
    change: "+180.1% par rapport au mois dernier",
    icon: ShoppingCart,
    positive: true,
  },
  {
    title: "Produits",
    value: "1,234",
    change: "+19% par rapport au mois dernier",
    icon: Package,
    positive: true,
  },
  {
    title: "Clients actifs",
    value: "573",
    change: "+201 par rapport au mois dernier",
    icon: Users,
    positive: true,
  },
]

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-gray-600">{stat.title}</div>
                <Icon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">{stat.value}</div>
              <div className={`text-sm ${stat.positive ? "text-green-600" : "text-red-600"}`}>{stat.change}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
