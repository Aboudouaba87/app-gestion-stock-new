"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { name: "Dell XPS 13", value: 45 },
  { name: "iPhone 14 Pro", value: 38 },
  { name: "Galaxy S23", value: 32 },
  { name: "iPad Air M1", value: 28 },
]

export function TopProductsChart() {
  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top produits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex flex-col justify-center space-y-6">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-24 text-sm text-gray-600 text-right">{item.name}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                <div
                  className="bg-blue-500 h-8 rounded-full flex items-center justify-end pr-3"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                >
                  <span className="text-white text-sm font-medium">{item.value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
