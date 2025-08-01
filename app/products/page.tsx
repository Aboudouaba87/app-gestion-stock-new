"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Sidebar } from "@/components/sidebar"
import { toast } from "sonner"

interface Product {
  id: number
  name: string
  category: string
  price: number
  stock: number
  status: "active" | "inactive" | "low_stock"
  supplier: string
  sku: string
  description: string
}

export default function ProductsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    supplier: "",
    sku: "",
    description: "",
  })

  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      name: "iPhone 14 Pro",
      category: "Smartphones",
      price: 1199,
      stock: 25,
      status: "active",
      supplier: "Apple Inc.",
      sku: "IPH14P-128",
      description: "Smartphone haut de gamme avec puce A16 Bionic",
    },
    {
      id: 2,
      name: "Samsung Galaxy S23",
      category: "Smartphones",
      price: 899,
      stock: 8,
      status: "low_stock",
      supplier: "Samsung Electronics",
      sku: "SGS23-256",
      description: "Smartphone Android avec appareil photo 50MP",
    },
    {
      id: 3,
      name: "MacBook Pro M2",
      category: "Ordinateurs",
      price: 2499,
      stock: 15,
      status: "active",
      supplier: "Apple Inc.",
      sku: "MBP-M2-14",
      description: "Ordinateur portable professionnel avec puce M2",
    },
    {
      id: 4,
      name: "Dell XPS 13",
      category: "Ordinateurs",
      price: 1299,
      stock: 0,
      status: "inactive",
      supplier: "Dell Technologies",
      sku: "XPS13-I7",
      description: "Ultrabook compact et performant",
    },
    {
      id: 5,
      name: "iPad Air",
      category: "Tablettes",
      price: 649,
      stock: 32,
      status: "active",
      supplier: "Apple Inc.",
      sku: "IPAD-AIR-64",
      description: "Tablette polyvalente pour le travail et les loisirs",
    },
  ])

  const categories = ["all", "Smartphones", "Ordinateurs", "Tablettes", "Accessoires"]
  const statuses = ["all", "active", "inactive", "low_stock"]
  const suppliers = ["Apple Inc.", "Samsung Electronics", "Dell Technologies", "HP Inc.", "Lenovo"]

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
    const matchesStatus = statusFilter === "all" || product.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return { variant: "default" as const, label: "Actif", icon: "✅" }
      case "inactive":
        return { variant: "secondary" as const, label: "Inactif", icon: "❌" }
      case "low_stock":
        return { variant: "destructive" as const, label: "Stock faible", icon: "⚠️" }
      default:
        return { variant: "secondary" as const, label: "Inconnu", icon: "❓" }
    }
  }

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.category || !newProduct.price || !newProduct.stock) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    const product: Product = {
      id: Math.max(...products.map((p) => p.id)) + 1,
      name: newProduct.name,
      category: newProduct.category,
      price: Number.parseFloat(newProduct.price),
      stock: Number.parseInt(newProduct.stock),
      status: Number.parseInt(newProduct.stock) > 10 ? "active" : "low_stock",
      supplier: newProduct.supplier,
      sku: newProduct.sku,
      description: newProduct.description,
    }

    setProducts([...products, product])
    setNewProduct({ name: "", category: "", price: "", stock: "", supplier: "", sku: "", description: "" })
    setIsAddDialogOpen(false)
    toast.success("Produit ajouté avec succès")
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setNewProduct({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString(),
      supplier: product.supplier,
      sku: product.sku,
      description: product.description,
    })
  }

  const handleUpdateProduct = () => {
    if (!editingProduct || !newProduct.name || !newProduct.category || !newProduct.price || !newProduct.stock) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    const updatedProduct: Product = {
      ...editingProduct,
      name: newProduct.name,
      category: newProduct.category,
      price: Number.parseFloat(newProduct.price),
      stock: Number.parseInt(newProduct.stock),
      status:
        Number.parseInt(newProduct.stock) > 10
          ? "active"
          : Number.parseInt(newProduct.stock) === 0
            ? "inactive"
            : "low_stock",
      supplier: newProduct.supplier,
      sku: newProduct.sku,
      description: newProduct.description,
    }

    setProducts(products.map((p) => (p.id === editingProduct.id ? updatedProduct : p)))
    setEditingProduct(null)
    setNewProduct({ name: "", category: "", price: "", stock: "", supplier: "", sku: "", description: "" })
    toast.success("Produit modifié avec succès")
  }

  const handleDeleteProduct = (id: number) => {
    setProducts(products.filter((p) => p.id !== id))
    toast.success("Produit supprimé avec succès")
  }

  const exportToExcel = () => {
    const csvContent = [
      ["Nom", "Catégorie", "Prix", "Stock", "Statut", "Fournisseur", "SKU", "Description"],
      ...filteredProducts.map((product) => [
        product.name,
        product.category,
        product.price.toString(),
        product.stock.toString(),
        product.status,
        product.supplier,
        product.sku,
        product.description,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "produits.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Export Excel généré avec succès")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
                ☰
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des produits</h1>
                <p className="text-sm text-gray-500">Gérez votre catalogue de produits</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                📊 Exporter Excel
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">➕ Nouveau produit</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Ajouter un nouveau produit</DialogTitle>
                    <DialogDescription>Remplissez les informations du produit ci-dessous.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom du produit *</Label>
                      <Input
                        id="name"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        placeholder="Ex: iPhone 14 Pro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Catégorie *</Label>
                      <Select
                        value={newProduct.category}
                        onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((cat) => cat !== "all")
                            .map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Prix (€) *</Label>
                      <Input
                        id="price"
                        type="number"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock initial *</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Fournisseur</Label>
                      <Select
                        value={newProduct.supplier}
                        onValueChange={(value) => setNewProduct({ ...newProduct, supplier: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un fournisseur" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier} value={supplier}>
                              {supplier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={newProduct.sku}
                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                        placeholder="Ex: IPH14P-128"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        placeholder="Description du produit..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleAddProduct}>Ajouter le produit</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">📦 Catalogue des produits</CardTitle>
                <CardDescription>{filteredProducts.length} produit(s) trouvé(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="🔍 Rechercher par nom ou SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {categories
                        .filter((cat) => cat !== "all")
                        .map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="low_stock">Stock faible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const statusInfo = getStatusBadge(product.status)
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-500">{product.sku}</div>
                              </div>
                            </TableCell>
                            <TableCell>{product.category}</TableCell>
                            <TableCell>{product.price.toFixed(2)} €</TableCell>
                            <TableCell>{product.stock}</TableCell>
                            <TableCell>
                              <Badge variant={statusInfo.variant}>
                                {statusInfo.icon} {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{product.supplier}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)}>
                                      ✏️ Modifier
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Modifier le produit</DialogTitle>
                                      <DialogDescription>
                                        Modifiez les informations du produit ci-dessous.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid grid-cols-2 gap-4 py-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-name">Nom du produit *</Label>
                                        <Input
                                          id="edit-name"
                                          value={newProduct.name}
                                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-category">Catégorie *</Label>
                                        <Select
                                          value={newProduct.category}
                                          onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {categories
                                              .filter((cat) => cat !== "all")
                                              .map((category) => (
                                                <SelectItem key={category} value={category}>
                                                  {category}
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-price">Prix (€) *</Label>
                                        <Input
                                          id="edit-price"
                                          type="number"
                                          value={newProduct.price}
                                          onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-stock">Stock *</Label>
                                        <Input
                                          id="edit-stock"
                                          type="number"
                                          value={newProduct.stock}
                                          onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-supplier">Fournisseur</Label>
                                        <Select
                                          value={newProduct.supplier}
                                          onValueChange={(value) => setNewProduct({ ...newProduct, supplier: value })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {suppliers.map((supplier) => (
                                              <SelectItem key={supplier} value={supplier}>
                                                {supplier}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-sku">SKU</Label>
                                        <Input
                                          id="edit-sku"
                                          value={newProduct.sku}
                                          onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                                        />
                                      </div>
                                      <div className="col-span-2 space-y-2">
                                        <Label htmlFor="edit-description">Description</Label>
                                        <Textarea
                                          id="edit-description"
                                          value={newProduct.description}
                                          onChange={(e) =>
                                            setNewProduct({ ...newProduct, description: e.target.value })
                                          }
                                          rows={3}
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setEditingProduct(null)}>
                                        Annuler
                                      </Button>
                                      <Button onClick={handleUpdateProduct}>Sauvegarder</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      🗑️ Supprimer
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir supprimer le produit "{product.name}" ? Cette action
                                        est irréversible.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
