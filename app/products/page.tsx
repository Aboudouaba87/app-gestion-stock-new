"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Filter, Edit, Trash2, Package, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"
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
import { Product } from "../types/product"


export default function ProductsPage() {
const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)


  const [formData, setFormData] = useState({
    user_id: 1, // ⚠️ à adapter selon ton système d’authentification
    name: "",
    reference: "",
    category: "",
    stock: "",
    price: "",
    supplier: "",
    description: "",
  })

  // Initialisation des données
useEffect(() => {
    const fetchProducts = async () => {
      const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const res = await fetch("/api/products", { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("Erreur API");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Erreur fetch produits :", err);
    }

    }
    fetchProducts()
  }, [])

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.supplier.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "in_stock" && product.stock > 10) ||
      (statusFilter === "low_stock" && product.stock > 0 && product.stock <= 10) ||
      (statusFilter === "out_of_stock" && product.stock === 0)

    return matchesSearch && matchesCategory && matchesStatus
  })


useEffect(() => {
  if (!showFilters) {
    setCategoryFilter("all")
    setStatusFilter("all")
  }
}, [showFilters])

 const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Erreur lors de la récupération des produits");
      const data = await res.json();
      console.log(data);
      setProducts(data);
    } catch (error) {
      console.error(error);
    }
  };

  const categories = ["Smartphones", "Ordinateurs", "Tablettes", "Accessoires"]
  const suppliers = ["Apple Inc.", "Samsung", "Dell Technologies", "HP", "Lenovo"]

  // const getStatusBadge = (status, stock) => {
  //   if (status === "out_of_stock" || stock === 0) {
  //     return <Badge variant="destructive">Rupture</Badge>
  //   }
  //   if (status === "low_stock" || stock < 10) {
  //     return <Badge className="bg-orange-100 text-orange-800">Stock faible</Badge>
  //   }
  //   return <Badge className="bg-green-100 text-green-800">En stock</Badge>
  // }


  const getStatusBadge = (status: string, stock: number) => {
  if (status === "out_of_stock" || stock === 0) {
    return <Badge variant="destructive">Rupture</Badge>
  }
  if (status === "low_stock" || stock < 10) {
    return <Badge className="bg-orange-100 text-orange-800">Stock faible</Badge>
  }
  return <Badge className="bg-green-100 text-green-800">En stock</Badge>
}

  // const filteredProducts = products.filter((product)  => {
  //   const matchesSearch =
  //     product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     product.supplier.toLowerCase().includes(searchTerm.toLowerCase())

  //   const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
  //   const matchesStatus =
  //     statusFilter === "all" ||
  //     (statusFilter === "in_stock" && product.stock > 10) ||
  //     (statusFilter === "low_stock" && product.stock > 0 && product.stock <= 10) ||
  //     (statusFilter === "out_of_stock" && product.stock === 0)

  //   return matchesSearch && matchesCategory && matchesStatus
  // })

  const resetForm = () => {
    setFormData({
      user_id: 1, // ⚠️ à adapter selon ton système d’authentification
      name: "",
      reference: "",
      category: "",
      stock: "",
      price: "",
      supplier: "",
      description: "",
    })
  }

  // const handleAdd = () => {
  //   const newProduct = {
  //     id: Math.max(...products.map((p) => p.id)) + 1,
  //     ...formData,
  //     stock: Number.parseInt(formData.stock),
  //     price: Number.parseFloat(formData.price),
  //     status:
  //       Number.parseInt(formData.stock) === 0
  //         ? "out_of_stock"
  //         : Number.parseInt(formData.stock) <= 10
  //           ? "low_stock"
  //           : "active",
  //   }
  //   setProducts([...products, newProduct])
  //   setIsAddModalOpen(false)
  //   resetForm()
  // }

  const handleAdd = async () => {
  try {
    const newProduct = {
      ...formData,
      stock: Number.parseInt(formData.stock),
      price: Number.parseFloat(formData.price),
      status:
        Number.parseInt(formData.stock) === 0
          ? "out_of_stock"
          : Number.parseInt(formData.stock) <= 10
          ? "low_stock"
          : "active",
      user_id: 1, // ou l’utilisateur connecté
    };

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Erreur lors de l'ajout du produit");
    }

    const savedProduct = await res.json();

    // PostgreSQL a généré l'id automatiquement
    setProducts([...products, savedProduct]);

    setIsAddModalOpen(false);
    resetForm();
  } catch (error) {
    console.error("Erreur handleAdd :", error);
    alert("Impossible d'ajouter le produit");
  }
};




  // const handleEdit = (product) => {
  //   setSelectedProduct(product)
  //   setFormData({
  //     user_id
  //     name: product.name,
  //     reference: product.reference,
  //     category: product.category,
  //     stock: product.stock.toString(),
  //     price: product.price.toString(),
  //     supplier: product.supplier,
  //     description: product.description,
  //   })
  //   setIsEditModalOpen(true)
  // }

  // ...existing code...
const handleEdit = (product: Product) => {
  setSelectedProduct(product)
  setFormData({
    user_id: product.user_id,
    name: product.name,
    reference: product.reference,
    category: product.category,
    stock: product.stock.toString(),
    price: product.price.toString(),
    supplier: product.supplier,
    description: product.description,
  })
  setIsEditModalOpen(true)
}

  // const handleUpdate = () => {
  //   const updatedProducts = products.map((p) =>
  //     p.id === selectedProduct.id
  //       ? {
  //           ...p,
  //           ...formData,
  //           stock: Number.parseInt(formData.stock),
  //           price: Number.parseFloat(formData.price),
  //           status:
  //             Number.parseInt(formData.stock) === 0
  //               ? "out_of_stock"
  //               : Number.parseInt(formData.stock) <= 10
  //                 ? "low_stock"
  //                 : "active",
  //         }
  //       : p,
  //   )
  //   setProducts(updatedProducts)
  //   setIsEditModalOpen(false)
  //   resetForm()
  //   setSelectedProduct(null)
  // }


  const handleUpdate = async () => {
  if (!selectedProduct) return; // sécurité

  try {
    // Construire l'objet à envoyer
    const updatedProduct = {
      ...selectedProduct,
      ...formData,
      stock: Number.parseInt(formData.stock),
      price: Number.parseFloat(formData.price),
      status:
        Number.parseInt(formData.stock) === 0
          ? "out_of_stock"
          : Number.parseInt(formData.stock) <= 10
          ? "low_stock"
          : "active",
    };

    // Appel API PUT
    const res = await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProduct),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Erreur lors de la mise à jour");
    }

    const savedProduct = await res.json();

    // Mettre à jour le state local avec la réponse du backend
    const updatedProducts = products.map((p) =>
      p.id === savedProduct.id ? savedProduct : p
    );

    setProducts(updatedProducts);
    setIsEditModalOpen(false);
    resetForm();

    console.log("Produit mis à jour :", savedProduct);
  } catch (error) {
    console.error("Erreur handleUpdate :", error);
    alert("Impossible de mettre à jour le produit");
  }
};


  // const handleDelete = (product) => {
  //   setSelectedProduct(product)
  //   setIsDeleteModalOpen(true)
  // }

  const handleDelete = (product: Product) => {
  setSelectedProduct(product)
  setIsDeleteModalOpen(true)
}

  // const confirmDelete = () => {
  //   setProducts(products.filter((p) => p.id !== selectedProduct.id))
  //   setIsDeleteModalOpen(false)
  //   setSelectedProduct(null)
  // }

  const confirmDelete = async () => {
  if (!selectedProduct) return; // sécurité

  try {
    const res = await fetch(`/api/products?id=${selectedProduct.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Erreur lors de la suppression");
    }

    // Si tu veux récupérer le produit supprimé :
    // const deletedProduct = await res.json();

    // Mettre à jour le state local
    setProducts(products.filter((p) => p.id !== selectedProduct.id));

    // Fermer la modal et reset
    setIsDeleteModalOpen(false);
    setSelectedProduct(null);

    console.log("Produit supprimé avec succès");
  } catch (error) {
    console.error("Erreur confirmDelete :", error);
    alert("Impossible de supprimer le produit");
  }
};


  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
              <p className="text-gray-600">Gérez votre catalogue de produits</p>
            </div>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau produit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Ajouter un produit</DialogTitle>
                  <DialogDescription>Créez un nouveau produit dans votre catalogue.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nom du produit</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: iPhone 15 Pro"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reference">Référence</Label>
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="Ex: IPH15P"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="stock">Stock</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="price">Prix (€)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="supplier">Fournisseur</Label>
                    <Select
                      value={formData.supplier}
                      onValueChange={(value) => setFormData({ ...formData, supplier: value })}
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
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description du produit..."
                    />
                  </div>
                </div>
                <DialogFooter className="flex gap-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddModalOpen(false)
                      resetForm()
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleAdd}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1 font-semibold"
                    disabled={!formData.name || !formData.reference || !formData.category}
                  >
                    ✓ Enregistrer le produit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                    <p className="text-sm font-medium text-gray-600">Total produits</p>
                    <p className="text-2xl font-bold">{products.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">En stock</p>
                    <p className="text-2xl font-bold">{products.filter((p) => p.stock > 10).length}</p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-green-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Stock faible</p>
                    <p className="text-2xl font-bold">{products.filter((p) => p.stock > 0 && p.stock <= 10).length}</p>
                  </div>
                  <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-orange-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rupture</p>
                    <p className="text-2xl font-bold">{products.filter((p) => p.stock === 0).length}</p>
                  </div>
                  <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-red-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Rechercher un produit..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                    <Filter className="h-4 w-4 mr-2" />
                    {!showFilters ? "Filtres" : "Initialiser"}
                    {showFilters && <X className="h-4 w-4 ml-2" />}
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label htmlFor="category-filter">Catégorie</Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les catégories</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status-filter">Statut</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="in_stock">En stock</SelectItem>
                          <SelectItem value="low_stock">Stock faible</SelectItem>
                          <SelectItem value="out_of_stock">Rupture</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des produits ({filteredProducts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.reference}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>€{product.price}</TableCell>
                      <TableCell>{product.supplier}</TableCell>
                      <TableCell>{getStatusBadge(product.status, product.stock)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(product)}>
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

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
            <DialogDescription>Modifiez les informations du produit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nom du produit</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-reference">Référence</Label>
              <Input
                id="edit-reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-stock">Stock</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Prix (€)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-supplier">Fournisseur</Label>
              <Select
                value={formData.supplier}
                onValueChange={(value) => setFormData({ ...formData, supplier: value })}
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
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false)
                resetForm()
                setSelectedProduct(null)
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpdate}
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1 font-semibold"
              disabled={!formData.name || !formData.reference || !formData.category}
            >
              ✓ Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le produit</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer "{selectedProduct?.name}" ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="flex-1 font-semibold">
              🗑️ Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
