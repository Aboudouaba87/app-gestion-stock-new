"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function StatsCards() {
  const stats = [
    {
      title: "Chiffre d'affaires",
      value: "€125,430",
      change: "+12%",
      changeType: "positive",
      icon: "💰",
    },
    {
      title: "Commandes",
      value: "314",
      change: "+8%",
      changeType: "positive",
      icon: "📦",
    },
    {
      title: "Produits",
      value: "1,234",
      change: "+23",
      changeType: "positive",
      icon: "📋",
    },
    {
      title: "Stock faible",
      value: "23",
      change: "-5",
      changeType: "negative",
      icon: "⚠️",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <span className="text-2xl">{stat.icon}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className={`text-xs ${stat.changeType === "positive" ? "text-green-600" : "text-red-600"}`}>
              {stat.change} par rapport au mois dernier
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
