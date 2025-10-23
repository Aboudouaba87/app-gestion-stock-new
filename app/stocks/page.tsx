"use client"

import { useState } from "react"
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Warehouse,
  TrendingUp,
  TrendingDown,
  Package,
  Trash2,
  X,
  ArrowRightLeft,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const stockMovements = [
  {
    id: 1,
    date: "2024-01-15",
    product: "iPhone 15 Pro 256GB",
    type: "entry",
    quantity: 50,
    warehouse: "Entrepôt Principal",
    warehouseFrom: null,
    warehouseTo: null,
    user: "Jean Dupont",
    reference: "BON-001",
    reason: "Réception fournisseur",
  },
  {
    id: 2,
    date: "2024-01-15",
    product: "Dell XPS 13",
    type: "exit",
    quantity: -5,
    warehouse: "Entrepôt Principal",
    warehouseFrom: null,
    warehouseTo: null,
    user: "Marie Martin",
    reference: "CMD-123",
    reason: "Vente client",
  },
  {
    id: 3,
    date: "2024-01-14",
    product: "Samsung Galaxy S23",
    type: "transfer",
    quantity: 10,
    warehouse: "Entrepôt Principal → Entrepôt Sud",
    warehouseFrom: "Entrepôt Principal",
    warehouseTo: "Entrepôt Sud",
    user: "Pierre Durand",
    reference: "TRF-045",
    reason: "Réapprovisionnement entrepôt Sud",
  },
  {
    id: 4,
    date: "2024-01-13",
    product: "MacBook Air M2",
    type: "adjustment",
    quantity: -2,
    warehouse: "Entrepôt Nord",
    warehouseFrom: null,
    warehouseTo: null,
    user: "Sophie Martin",
    reference: "ADJ-012",
    reason: "Ajustement inventaire",
  },
]

const products = [
  { id: 1, name: "iPhone 15 Pro 256GB", stock: 45 },
  { id: 2, name: "Dell XPS 13", stock: 23 },
  { id: 3, name: "Samsung Galaxy S23", stock: 67 },
  { id: 4, name: "MacBook Air M2", stock: 12 },
]

const warehouses = [
  { id: 1, name: "Entrepôt Principal" },
  { id: 2, name: "Entrepôt Sud" },
  { id: 3, name: "Entrepôt Nord" },
]

export default function StocksPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [movements, setMovements] = useState(stockMovements)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedType, setSelectedType] = useState("all")

  // États pour les modales
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [editingMovement, setEditingMovement] = useState(null)
  const [deletingMovement, setDeleteingMovement] = useState(null)

  // États pour les formulaires
  const [newMovement, setNewMovement] = useState({
    product: "",
    type: "entry",
    quantity: "",
    warehouse: "",
    reason: "",
    reference: "",
  })

  const [transfer, setTransfer] = useState({
    product: "",
    quantity: "",
    warehouseFrom: "",
    warehouseTo: "",
    reason: "",
    reference: "",
  })

  const [adjustment, setAdjustment] = useState({
    product: "",
    warehouse: "",
    currentStock: "",
    realStock: "",
    reason: "",
  })

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch =
      movement.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reference.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesWarehouse =
      selectedWarehouse === "all" ||
      movement.warehouse.includes(selectedWarehouse) ||
      movement.warehouseFrom === selectedWarehouse ||
      movement.warehouseTo === selectedWarehouse

    const matchesType = selectedType === "all" || movement.type === selectedType

    return matchesSearch && matchesWarehouse && matchesType
  })

  const handleAddMovement = () => {
    if (!newMovement.product || !newMovement.quantity || !newMovement.warehouse) return

    const movement = {
      id: movements.length + 1,
      date: new Date().toISOString().split("T")[0],
      product: products.find((p) => p.id === Number.parseInt(newMovement.product))?.name || "",
      type: newMovement.type,
      quantity:
        newMovement.type === "exit" ? -Number.parseInt(newMovement.quantity) : Number.parseInt(newMovement.quantity),
      warehouse: warehouses.find((w) => w.id === Number.parseInt(newMovement.warehouse))?.name || "",
      warehouseFrom: null,
      warehouseTo: null,
      user: "Utilisateur actuel",
      reference: newMovement.reference || `MOV-${Date.now()}`,
      reason: newMovement.reason,
    }

    setMovements([movement, ...movements])
    setNewMovement({
      product: "",
      type: "entry",
      quantity: "",
      warehouse: "",
      reason: "",
      reference: "",
    })
    setIsNewMovementOpen(false)
  }

  const handleTransfer = () => {
    if (!transfer.product || !transfer.quantity || !transfer.warehouseFrom || !transfer.warehouseTo) return

    if (transfer.warehouseFrom === transfer.warehouseTo) {
      alert("L'entrepôt source et destination doivent être différents")
      return
    }

    const warehouseFromName = warehouses.find((w) => w.id === Number.parseInt(transfer.warehouseFrom))?.name || ""
    const warehouseToName = warehouses.find((w) => w.id === Number.parseInt(transfer.warehouseTo))?.name || ""

    const movement = {
      id: movements.length + 1,
      date: new Date().toISOString().split("T")[0],
      product: products.find((p) => p.id === Number.parseInt(transfer.product))?.name || "",
      type: "transfer",
      quantity: Number.parseInt(transfer.quantity),
      warehouse: `${warehouseFromName} → ${warehouseToName}`,
      warehouseFrom: warehouseFromName,
      warehouseTo: warehouseToName,
      user: "Utilisateur actuel",
      reference: transfer.reference || `TRF-${Date.now()}`,
      reason: transfer.reason || "Transfert entre entrepôts",
    }

    setMovements([movement, ...movements])
    setTransfer({
      product: "",
      quantity: "",
      warehouseFrom: "",
      warehouseTo: "",
      reason: "",
      reference: "",
    })
    setIsTransferOpen(false)
  }

  const handleAdjustment = () => {
    if (!adjustment.product || !adjustment.warehouse || !adjustment.realStock) return

    const currentStock = Number.parseInt(adjustment.currentStock)
    const realStock = Number.parseInt(adjustment.realStock)
    const difference = realStock - currentStock

    if (difference === 0) return

    const movement = {
      id: movements.length + 1,
      date: new Date().toISOString().split("T")[0],
      product: products.find((p) => p.id === Number.parseInt(adjustment.product))?.name || "",
      type: "adjustment",
      quantity: difference,
      warehouse: warehouses.find((w) => w.id === Number.parseInt(adjustment.warehouse))?.name || "",
      warehouseFrom: null,
      warehouseTo: null,
      user: "Utilisateur actuel",
      reference: `ADJ-${Date.now()}`,
      reason: adjustment.reason || "Ajustement d'inventaire",
    }

    setMovements([movement, ...movements])
    setAdjustment({
      product: "",
      warehouse: "",
      currentStock: "",
      realStock: "",
      reason: "",
    })
    setIsAdjustmentOpen(false)
  }

  const handleDeleteMovement = () => {
    if (!deletingMovement) return
    setMovements(movements.filter((m) => m.id !== deletingMovement.id))
    setDeleteingMovement(null)
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entry":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "exit":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case "transfer":
        return <ArrowRightLeft className="h-4 w-4 text-purple-600" />
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
      case "transfer":
        return <Badge className="bg-purple-100 text-purple-800">Transfert</Badge>
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
              <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Transfert
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Transfert entre entrepôts</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="trf-product">Produit</Label>
                      <Select
                        value={transfer.product}
                        onValueChange={(value) => setTransfer({ ...transfer, product: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="trf-quantity">Quantité à transférer</Label>
                      <Input
                        id="trf-quantity"
                        type="number"
                        value={transfer.quantity}
                        onChange={(e) => setTransfer({ ...transfer, quantity: e.target.value })}
                        placeholder="Quantité"
                      />
                    </div>

                    <div>
                      <Label htmlFor="trf-from">Entrepôt source</Label>
                      <Select
                        value={transfer.warehouseFrom}
                        onValueChange={(value) => setTransfer({ ...transfer, warehouseFrom: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Depuis quel entrepôt ?" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="trf-to">Entrepôt destination</Label>
                      <Select
                        value={transfer.warehouseTo}
                        onValueChange={(value) => setTransfer({ ...transfer, warehouseTo: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Vers quel entrepôt ?" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses
                            .filter((w) => w.id.toString() !== transfer.warehouseFrom)
                            .map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                {warehouse.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="trf-reference">Référence (optionnel)</Label>
                      <Input
                        id="trf-reference"
                        value={transfer.reference}
                        onChange={(e) => setTransfer({ ...transfer, reference: e.target.value })}
                        placeholder="TRF-001..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="trf-reason">Motif du transfert</Label>
                      <Textarea
                        id="trf-reason"
                        value={transfer.reason}
                        onChange={(e) => setTransfer({ ...transfer, reason: e.target.value })}
                        placeholder="Réapprovisionnement, réorganisation..."
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setIsTransferOpen(false)}>
                        Annuler
                      </Button>
                      <Button
                        onClick={handleTransfer}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={
                          !transfer.product || !transfer.quantity || !transfer.warehouseFrom || !transfer.warehouseTo
                        }
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Effectuer le transfert
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Ajustement
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Ajustement de stock</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="adj-product">Produit</Label>
                      <Select
                        value={adjustment.product}
                        onValueChange={(value) => {
                          const product = products.find((p) => p.id === Number.parseInt(value))
                          setAdjustment({
                            ...adjustment,
                            product: value,
                            currentStock: product ? product.stock.toString() : "",
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} (Stock: {product.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="adj-warehouse">Entrepôt</Label>
                      <Select
                        value={adjustment.warehouse}
                        onValueChange={(value) => setAdjustment({ ...adjustment, warehouse: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un entrepôt" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="current-stock">Stock théorique</Label>
                        <Input
                          id="current-stock"
                          type="number"
                          value={adjustment.currentStock}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="real-stock">Stock réel</Label>
                        <Input
                          id="real-stock"
                          type="number"
                          value={adjustment.realStock}
                          onChange={(e) => setAdjustment({ ...adjustment, realStock: e.target.value })}
                          placeholder="Stock compté"
                        />
                      </div>
                    </div>

                    {adjustment.currentStock && adjustment.realStock && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Différence :</strong>{" "}
                          {Number.parseInt(adjustment.realStock) - Number.parseInt(adjustment.currentStock) > 0
                            ? "+"
                            : ""}
                          {Number.parseInt(adjustment.realStock) - Number.parseInt(adjustment.currentStock)}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="adj-reason">Motif</Label>
                      <Textarea
                        id="adj-reason"
                        value={adjustment.reason}
                        onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
                        placeholder="Motif de l'ajustement..."
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setIsAdjustmentOpen(false)}>
                        Annuler
                      </Button>
                      <Button
                        onClick={handleAdjustment}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!adjustment.product || !adjustment.warehouse || !adjustment.realStock}
                      >
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        Effectuer l'ajustement
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isNewMovementOpen} onOpenChange={setIsNewMovementOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau mouvement
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nouveau mouvement de stock</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="mov-product">Produit</Label>
                      <Select
                        value={newMovement.product}
                        onValueChange={(value) => setNewMovement({ ...newMovement, product: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="mov-type">Type de mouvement</Label>
                      <Select
                        value={newMovement.type}
                        onValueChange={(value) => setNewMovement({ ...newMovement, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Entrée</SelectItem>
                          <SelectItem value="exit">Sortie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="mov-quantity">Quantité</Label>
                      <Input
                        id="mov-quantity"
                        type="number"
                        value={newMovement.quantity}
                        onChange={(e) => setNewMovement({ ...newMovement, quantity: e.target.value })}
                        placeholder="Quantité"
                      />
                    </div>

                    <div>
                      <Label htmlFor="mov-warehouse">Entrepôt</Label>
                      <Select
                        value={newMovement.warehouse}
                        onValueChange={(value) => setNewMovement({ ...newMovement, warehouse: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un entrepôt" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="mov-reference">Référence (optionnel)</Label>
                      <Input
                        id="mov-reference"
                        value={newMovement.reference}
                        onChange={(e) => setNewMovement({ ...newMovement, reference: e.target.value })}
                        placeholder="BON-001, CMD-123..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="mov-reason">Motif</Label>
                      <Textarea
                        id="mov-reason"
                        value={newMovement.reason}
                        onChange={(e) => setNewMovement({ ...newMovement, reason: e.target.value })}
                        placeholder="Motif du mouvement..."
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setIsNewMovementOpen(false)}>
                        Annuler
                      </Button>
                      <Button
                        onClick={handleAddMovement}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={!newMovement.product || !newMovement.quantity || !newMovement.warehouse}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Enregistrer le mouvement
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
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
                    <p className="text-sm font-medium text-gray-600">Entrées</p>
                    <p className="text-2xl font-bold">{movements.filter((m) => m.type === "entry").length}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sorties</p>
                    <p className="text-2xl font-bold">{movements.filter((m) => m.type === "exit").length}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transferts</p>
                    <p className="text-2xl font-bold">{movements.filter((m) => m.type === "transfer").length}</p>
                  </div>
                  <ArrowRightLeft className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ajustements</p>
                    <p className="text-2xl font-bold">{movements.filter((m) => m.type === "adjustment").length}</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-blue-600 rounded-full"></div>
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
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.name}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? "bg-blue-50 border-blue-200" : ""}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtres
                </Button>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t flex gap-4">
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Type de mouvement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="entry">Entrées</SelectItem>
                      <SelectItem value="exit">Sorties</SelectItem>
                      <SelectItem value="transfer">Transferts</SelectItem>
                      <SelectItem value="adjustment">Ajustements</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedWarehouse("all")
                      setSelectedType("all")
                      setSearchTerm("")
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Réinitialiser
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Movements Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Mouvements de stock récents ({filteredMovements.length} résultat
                {filteredMovements.length > 1 ? "s" : ""})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Entrepôt(s)</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Actions</TableHead>
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
                      <TableCell
                        className={
                          movement.type === "transfer"
                            ? "text-purple-600"
                            : movement.quantity > 0
                              ? "text-green-600"
                              : "text-red-600"
                        }
                      >
                        {movement.type === "transfer" ? "" : movement.quantity > 0 ? "+" : ""}
                        {movement.quantity}
                      </TableCell>
                      <TableCell>
                        {movement.type === "transfer" ? (
                          <div className="text-sm">
                            <div className="text-red-600">← {movement.warehouseFrom}</div>
                            <div className="text-green-600">→ {movement.warehouseTo}</div>
                          </div>
                        ) : (
                          movement.warehouse
                        )}
                      </TableCell>
                      <TableCell>{movement.user}</TableCell>
                      <TableCell>{movement.reference}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setDeleteingMovement(movement)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingMovement} onOpenChange={() => setDeleteingMovement(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">Êtes-vous sûr de vouloir supprimer ce mouvement ?</p>
            {deletingMovement && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p>
                  <strong>Produit :</strong> {deletingMovement.product}
                </p>
                <p>
                  <strong>Type :</strong>{" "}
                  {deletingMovement.type === "entry"
                    ? "Entrée"
                    : deletingMovement.type === "exit"
                      ? "Sortie"
                      : deletingMovement.type === "transfer"
                        ? "Transfert"
                        : "Ajustement"}
                </p>
                <p>
                  <strong>Quantité :</strong> {deletingMovement.quantity}
                </p>
                <p>
                  <strong>Référence :</strong> {deletingMovement.reference}
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDeleteingMovement(null)}>
              Annuler
            </Button>
            <Button onClick={handleDeleteMovement} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Confirmer la suppression
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
