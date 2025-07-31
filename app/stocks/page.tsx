"use client"

import { useState } from "react"
import { Plus, Search, Filter, ArrowUpDown, Warehouse, TrendingUp, TrendingDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const stockMovements = [
  {
    id: 1,
    date: "2024-01-15",
    product: "iPhone 15 Pro 256GB",
    type: "entry",
    quantity: 50,
    warehouse: "Entrepôt Principal",
    user: "Jean Dupont",
    reference: "BON-001",
  },
  {
    id: 2,
    date: "2024-01-15",
    product: "Dell XPS 13",
    type: "exit",
    quantity: -5,
    warehouse: "Entrepôt Principal",
    user: "Marie Martin",
    reference: "CMD-123",
  },
  {
    id: 3,
    date: "2024-01-14",
    product: "Samsung Galaxy S23",
    type: "adjustment",
    quantity: -2,
    warehouse: "Entrepôt Sud",
    user: "Pierre Durand",
    reference: "ADJ-045",
  },
]

export default function StocksPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  const filteredMovements = stockMovements.filter(
    (movement) =>
      movement.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.user.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entry":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "exit":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />
    }
  }

  const getMovementType = (type: string) => {
    switch (type) {
      case "entry":
        return <Badge className="bg-green-100 text-green-800">Entrée</Badge>
      case "exit":
        return <Badge className="bg-red-100 text-red-800">Sortie</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-800">Ajustement</Badge>
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Stocks</h1>
              <p className="text-gray-600">Suivez et gérez vos mouvements de stock</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Ajustement
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau mouvement
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Valeur totale</p>
                    <p className="text-2xl font-bold">€2,456,789</p>
                  </div>
                  <Warehouse className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Entrées (mois)</p>
                    <p className="text-2xl font-bold">1,245</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sorties (mois)</p>
                    <p className="text-2xl font-bold">987</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Entrepôts</p>
                    <p className="text-2xl font-bold">5</p>
                  </div>
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-purple-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Rechercher un mouvement..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Entrepôt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les entrepôts</SelectItem>
                    <SelectItem value="main">Entrepôt Principal</SelectItem>
                    <SelectItem value="south">Entrepôt Sud</SelectItem>
                    <SelectItem value="north">Entrepôt Nord</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Plus de filtres
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stock Movements Table */}
          <Card>
            <CardHeader>
              <CardTitle>Mouvements de stock récents</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Entrepôt</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Référence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>{new Date(movement.date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="font-medium">{movement.product}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getMovementIcon(movement.type)}
                          {getMovementType(movement.type)}
                        </div>
                      </TableCell>
                      <TableCell className={movement.quantity > 0 ? "text-green-600" : "text-red-600"}>
                        {movement.quantity > 0 ? "+" : ""}
                        {movement.quantity}
                      </TableCell>
                      <TableCell>{movement.warehouse}</TableCell>
                      <TableCell>{movement.user}</TableCell>
                      <TableCell>{movement.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
