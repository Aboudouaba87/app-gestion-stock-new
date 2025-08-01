"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { name: "iPhone 14", ventes: 145 },
  { name: "Samsung S23", ventes: 132 },
  { name: "MacBook Pro", ventes: 98 },
  { name: "iPad Air", ventes: 87 },
  { name: "AirPods Pro", ventes: 76 },
]

export function TopProductsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">🏆 Top produits</CardTitle>
        <CardDescription>Produits les plus vendus ce mois</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="ventes" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
