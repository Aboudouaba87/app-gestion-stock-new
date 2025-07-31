"use client"

import { useState } from "react"
import { Download, TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerRange } from "@/components/date-picker-range"

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedWarehouse, setSelectedWarehouse] = useState("all")

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
              <p className="text-gray-600">Analyses et statistiques détaillées</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter PDF
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter Excel
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                      <SelectItem value="quarter">Ce trimestre</SelectItem>
                      <SelectItem value="year">Cette année</SelectItem>
                      <SelectItem value="custom">Période personnalisée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Entrepôt</label>
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un entrepôt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les entrepôts</SelectItem>
                      <SelectItem value="main">Entrepôt Principal</SelectItem>
                      <SelectItem value="south">Entrepôt Sud</SelectItem>
                      <SelectItem value="north">Entrepôt Nord</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dates personnalisées</label>
                  <DatePickerRange />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
                    <p className="text-2xl font-bold">€156,789</p>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +12.5% vs mois dernier
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Marge brute</p>
                    <p className="text-2xl font-bold">€67,234</p>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +8.3% vs mois dernier
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rotation stock</p>
                    <p className="text-2xl font-bold">4.2x</p>
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      -2.1% vs mois dernier
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Taux de rupture</p>
                    <p className="text-2xl font-bold">2.8%</p>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      -0.5% vs mois dernier
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-orange-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Évolution du chiffre d'affaires</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <svg width="100%" height="100%" viewBox="0 0 600 300">
                    <defs>
                      <linearGradient id="salesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Grid */}
                    <defs>
                      <pattern id="grid" width="60" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 60 0 L 0 0 0 50" fill="none" stroke="#f0f0f0" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Area chart */}
                    <path
                      d="M50,200 L110,150 L170,100 L230,120 L290,80 L350,90 L350,280 L50,280 Z"
                      fill="url(#salesGradient)"
                    />

                    {/* Line */}
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      points="50,200 110,150 170,100 230,120 290,80 350,90"
                    />

                    {/* Data points */}
                    {[50, 110, 170, 230, 290, 350].map((x, i) => (
                      <circle key={i} cx={x} cy={[200, 150, 100, 120, 80, 90][i]} r="5" fill="#3b82f6" />
                    ))}

                    {/* Labels */}
                    {["Jan", "Fév", "Mar", "Avr", "Mai", "Jun"].map((month, i) => (
                      <text key={i} x={50 + i * 60} y="295" textAnchor="middle" fontSize="12" fill="#666">
                        {month}
                      </text>
                    ))}
                  </svg>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <svg width="250" height="250" viewBox="0 0 250 250">
                    {/* Pie chart segments */}
                    <circle
                      cx="125"
                      cy="125"
                      r="80"
                      fill="#3b82f6"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray="125.6 376.8"
                      strokeDashoffset="0"
                      transform="rotate(-90 125 125)"
                    />
                    <circle
                      cx="125"
                      cy="125"
                      r="80"
                      fill="#10b981"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray="94.2 408.2"
                      strokeDashoffset="-125.6"
                      transform="rotate(-90 125 125)"
                    />
                    <circle
                      cx="125"
                      cy="125"
                      r="80"
                      fill="#f59e0b"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray="62.8 439.6"
                      strokeDashoffset="-219.8"
                      transform="rotate(-90 125 125)"
                    />
                    <circle
                      cx="125"
                      cy="125"
                      r="80"
                      fill="#ef4444"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray="94.2 408.2"
                      strokeDashoffset="-282.6"
                      transform="rotate(-90 125 125)"
                    />
                  </svg>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Électronique</span>
                    </div>
                    <span className="text-sm font-medium">35%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Vêtements</span>
                    </div>
                    <span className="text-sm font-medium">25%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Maison</span>
                    </div>
                    <span className="text-sm font-medium">20%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Autres</span>
                    </div>
                    <span className="text-sm font-medium">20%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 des produits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "iPhone 15 Pro", sales: 1250, revenue: "€1,487,500" },
                    { name: "MacBook Air M2", sales: 890, revenue: "€1,334,400" },
                    { name: "Dell XPS 13", sales: 756, revenue: "€982,800" },
                    { name: "Samsung Galaxy S23", sales: 634, revenue: "€570,600" },
                    { name: "iPad Air", sales: 523, revenue: "€418,400" },
                  ].map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.sales} ventes</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{product.revenue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analyse des stocks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-800">Stock optimal</p>
                      <p className="text-sm text-green-600">1,156 produits</p>
                    </div>
                    <div className="text-2xl font-bold text-green-600">78%</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-orange-800">Stock faible</p>
                      <p className="text-sm text-orange-600">45 produits</p>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">15%</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-800">Rupture de stock</p>
                      <p className="text-sm text-red-600">33 produits</p>
                    </div>
                    <div className="text-2xl font-bold text-red-600">7%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
