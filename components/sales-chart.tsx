"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { name: "Jan", ventes: 4000 },
  { name: "Fév", ventes: 3000 },
  { name: "Mar", ventes: 2000 },
  { name: "Avr", ventes: 2780 },
  { name: "Mai", ventes: 1890 },
  { name: "Jun", ventes: 2390 },
  { name: "Jul", ventes: 3490 },
]

export function SalesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">📈 Évolution des ventes</CardTitle>
        <CardDescription>Ventes mensuelles sur les 7 derniers mois</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="ventes" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
