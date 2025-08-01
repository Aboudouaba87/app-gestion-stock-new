"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { month: "Jan", sales: 4000, orders: 2400 },
  { month: "Fév", sales: 3000, orders: 1398 },
  { month: "Mar", sales: 2000, orders: 9800 },
  { month: "Avr", sales: 2780, orders: 3908 },
  { month: "Mai", sales: 1890, orders: 4800 },
  { month: "Jun", sales: 2390, orders: 3800 },
]

export function SalesChart() {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Évolution des ventes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <svg width="100%" height="100%" viewBox="0 0 600 300">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="60" height="50" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 50" fill="none" stroke="#f0f0f0" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Sales line (green) */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              points="50,150 110,200 170,250 230,180 290,220 350,190"
            />

            {/* Orders line (blue) */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              points="50,200 110,230 170,50 230,120 290,80 350,100"
            />

            {/* Data points */}
            {[50, 110, 170, 230, 290, 350].map((x, i) => (
              <g key={i}>
                <circle cx={x} cy={[150, 200, 250, 180, 220, 190][i]} r="4" fill="#10b981" />
                <circle cx={x} cy={[200, 230, 50, 120, 80, 100][i]} r="4" fill="#3b82f6" />
              </g>
            ))}

            {/* X-axis labels */}
            {data.map((item, i) => (
              <text key={i} x={50 + i * 60} y="290" textAnchor="middle" fontSize="12" fill="#666">
                {item.month}
              </text>
            ))}

            {/* Y-axis values */}
            {[0, 2500, 5000, 7500, 10000].map((value, i) => (
              <text key={i} x="20" y={270 - i * 50} textAnchor="end" fontSize="12" fill="#666">
                {value}
              </text>
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}
