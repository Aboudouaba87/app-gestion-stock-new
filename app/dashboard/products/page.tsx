//Page produit
"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Filter, Edit, Trash2, Package, X } from "lucide-react";
import { Input } from "@/app/dashboard/components/ui/input";
import { Button } from "@/app/dashboard/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/dashboard/components/ui/card";
import { Badge } from "@/app/dashboard/components/ui/badge";
import { Sidebar } from "@/app/dashboard/components/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/dashboard/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/dashboard/components/ui/dialog";
import { Label } from "@/app/dashboard/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/dashboard/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/app/dashboard/components/ui/textarea";

type Product = {
  id: number;
  user_id: number;
  name: string;
  reference: string;
  category: string;
  stock: number;
  price: number;
  supplier: string | null;
  status: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
};

type Warehouse = {
  id: number;
  name: string;
};

// Composant pour afficher les erreurs
function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-center">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
        <div className="text-red-600 font-semibold mb-2">Erreur</div>
        <p className="text-red-700 mb-4">{message}</p>
        <Button
          onClick={onRetry}
          variant="outline"
          className="border-red-300 text-red-700"
        >
          Réessayer
        </Button>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // États pour le loading et les erreurs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    user_id: 1,
    name: "",
    reference: "",
    category: "",
    stock: "0",
    price: "0.00",
    supplier: "aucun",
    description: "",
    warehouse_id: "none",
  });

  const categories = [
    "Smartphones",
    "Ordinateurs",
    "Tablettes",
    "Accessoires",
    "Audio",
  ];
  const suppliers = [
    "Apple Inc.",
    "Samsung",
    "Dell Technologies",
    "HP",
    "Lenovo",
  ];

  // Load products and warehouses on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchProducts(), fetchWarehouses()]);
    } catch (err) {
      setError("Erreur lors du chargement des données");
      console.error("Erreur fetch données:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Erreur API produits");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Erreur fetch produits :", err);
      throw err;
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error(`Warehouses API status ${res.status}`);
      const data = await res.json();
      console.log("GET /api/warehouses response:", data);

      // CORRECTION : Les warehouses utilisent des valeurs textuelles
      const normalized = Array.isArray(data)
        ? data.map((w: any) => {
            // Utiliser directement la valeur textuelle (main, south, north)
            const value = w.value || w.id || "unknown";
            const name = w.label || w.name || `Entrepôt ${value}`;

            return {
              id: value, // Utiliser la valeur textuelle comme ID
              name: name,
            };
          })
        : [];

      setWarehouses(normalized);

      console.log("🏪 Warehouses disponibles:", normalized);

      if (normalized.length > 0) {
        // CORRECTION : Ne pas forcer la sélection d'un warehouse par défaut
        // Laisser l'utilisateur choisir "Aucun" s'il le souhaite
        console.log(
          "🏪 Warehouses chargés, valeur actuelle:",
          formData.warehouse_id
        );
      } else {
        console.log("Aucun magasin trouvé");
      }
    } catch (err) {
      console.error("Erreur fetch warehouses :", err);
      throw err;
    }
  };

  const filteredProducts = products.filter((product) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      product.name.toLowerCase().includes(q) ||
      product.reference.toLowerCase().includes(q) ||
      (product.category ?? "").toLowerCase().includes(q) ||
      (product.supplier ?? "").toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "in_stock" && product.stock > 10) ||
      (statusFilter === "low_stock" &&
        product.stock > 0 &&
        product.stock <= 10) ||
      (statusFilter === "out_of_stock" && product.stock === 0);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // AJOUT: Calculs pour la pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  useEffect(() => {
    if (!showFilters) {
      setCategoryFilter("all");
      setStatusFilter("all");
    }
  }, [showFilters]);

  const resetForm = () => {
    setFormData({
      user_id: 1,
      name: "",
      reference: "",
      category: "",
      stock: "0",
      price: "0.00",
      supplier: "aucun",
      description: "",
      warehouse_id: "none",
    });
  };

  // Reset de la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  // Reset aussi quand showFilters change
  useEffect(() => {
    if (!showFilters) {
      setCurrentPage(1);
    }
  }, [showFilters]);

  // Add product: send warehouse_id (number or null) and stock
  // Dans handleAdd et handleUpdate, ajoutez cette validation :
  const handleAdd = async () => {
    try {
      const stockValue = Number.parseInt(formData.stock || "0", 10);

      // Validation du stock
      if (stockValue < 0) {
        toast.warning("Le stock ne peut pas être négatif");
        return;
      }

      const payload = {
        user_id: Number(formData.user_id),
        name: formData.name,
        reference: formData.reference,
        category: formData.category || null,
        stock: stockValue,
        price: Number.parseFloat(formData.price || "0"),
        supplier: formData.supplier === "aucun" ? null : formData.supplier,
        description: formData.description || null,
        status:
          stockValue === 0
            ? "out_of_stock"
            : stockValue <= 10
            ? "low_stock"
            : "active",
        // CORRECTION : Envoyer comme string, pas comme number
        warehouse_id:
          formData.warehouse_id === "none" ? null : formData.warehouse_id, // Garder comme string
      };

      console.log("📦 Payload ajout:", payload);

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Erreur création produit");
      }

      const saved = await res.json();
      setProducts((prev) => [...prev, saved]);
      setIsAddModalOpen(false);
      resetForm();
      toast.success("Produit ajouté avec succès");
    } catch (err) {
      console.error("handleAdd error:", err);
      toast.error("Impossible d'ajouter le produit");
    }
  };

  const handleUpdate = async () => {
    if (!selectedProduct) return;
    try {
      const stockValue = Number.parseInt(formData.stock || "0", 10);

      // Validation du stock
      if (stockValue < 0) {
        toast.warning("Le stock ne peut pas être négatif");
        return;
      }

      // DEBUG: Vérifier la valeur du warehouse_id avant envoi
      console.log(
        "🔍 Warehouse_id avant envoi:",
        formData.warehouse_id,
        "Type:",
        typeof formData.warehouse_id
      );

      const payload = {
        user_id: Number(formData.user_id),
        name: formData.name,
        reference: formData.reference,
        category: formData.category || null,
        stock: stockValue,
        price: Number.parseFloat(formData.price || "0"),
        supplier: formData.supplier === "aucun" ? null : formData.supplier,
        description: formData.description || null,
        status:
          stockValue === 0
            ? "out_of_stock"
            : stockValue <= 10
            ? "low_stock"
            : "active",
        // CORRECTION : Bien gérer la valeur "none" vs les valeurs textuelles
        warehouse_id:
          formData.warehouse_id === "none" ? null : formData.warehouse_id,
        id: selectedProduct?.id,
        product_id: selectedProduct?.id,
      };

      console.log("📦 Payload modification:", payload);

      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Erreur update produit");
      }

      const saved = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      setIsEditModalOpen(false);
      resetForm();
      setSelectedProduct(null);
      toast.success("Produit mis à jour avec succès");
    } catch (err) {
      console.error("handleUpdate error:", err);
      toast.error("Impossible de mettre à jour le produit");
    }
  };
  // Dans handleEdit :
  const handleEdit = (product: Product) => {
    setSelectedProduct(product);

    // CORRECTION : Pour l'édition, on devrait récupérer le warehouse actuel du produit
    // Pour l'instant, on initialise à "none" et l'utilisateur devra re-sélectionner
    setFormData({
      user_id: product.user_id,
      name: product.name,
      reference: product.reference,
      category: product.category || "",
      stock: String(product.stock ?? 0),
      price: String(product.price ?? 0),
      supplier: product.supplier || "aucun",
      description: product.description || "",
      warehouse_id: "none", // L'utilisateur devra re-sélectionner l'entrepôt
    });

    console.log(
      "✏️ Édition du produit:",
      product.name,
      "Warehouse initialisé à: none"
    );
    setIsEditModalOpen(true);
  };

  const handleDelete = (product: Product) => {
    console.log("🔍 handleDelete called with product:", product);
    console.log("🆔 Product ID:", product.id);
    console.log(
      "📡 URL that will be called:",
      `/api/products?id=${product.id}`
    );

    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;

    console.log(
      "🚀 confirmDelete called with selectedProduct:",
      selectedProduct
    );
    console.log("🆔 Selected Product ID:", selectedProduct.id);
    console.log(
      "📡 Making DELETE request to:",
      `/api/products?id=${selectedProduct.id}`
    );

    try {
      const res = await fetch(`/api/products?id=${selectedProduct.id}`, {
        method: "DELETE",
      });

      console.log("📨 DELETE Response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ DELETE Error response:", errorData);
        throw new Error(errorData?.error || "Erreur suppression");
      }

      setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
      toast.success("✅ Produit supprimé avec succès");
    } catch (err) {
      console.error("❌ confirmDelete error:", err);
      toast.error(
        "Impossible de supprimer le produit: " + (err as Error).message
      );
    }
  };

  const getStatusBadge = (status: string, stock: number) => {
    if (status === "out_of_stock" || stock === 0)
      return <Badge variant="destructive">Rupture</Badge>;
    if (status === "low_stock" || stock <= 10)
      return (
        <Badge className="bg-orange-100 text-orange-800">Stock faible</Badge>
      );
    return <Badge className="bg-green-100 text-green-800">En stock</Badge>;
  };

  // Affichage du chargement
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des produits...</p>
          </div>
        </div>
      </div>
    );
  }

  // Affichage des erreurs
  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <ErrorMessage message={error} onRetry={fetchData} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
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

              <DialogContent className="max-w-md w-full max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ajouter un produit</DialogTitle>
                  <DialogDescription>
                    Créez un nouveau produit dans votre catalogue.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nom du produit</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Référence</Label>
                    <Input
                      value={formData.reference}
                      onChange={(e) =>
                        setFormData({ ...formData, reference: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Catégorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) =>
                        setFormData({ ...formData, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Stock initial</Label>
                      <Input
                        type="number"
                        value={formData.stock}
                        onChange={(e) =>
                          setFormData({ ...formData, stock: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Prix (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  // Dans vos modals, ajoutez un debug temporaire
                  <div>
                    <Label>Magasin (optionnel)</Label>
                    <Select
                      value={formData.warehouse_id}
                      onValueChange={(v) => {
                        console.log(
                          "🔄 Warehouse sélectionné:",
                          v,
                          "Type:",
                          typeof v
                        );
                        setFormData({ ...formData, warehouse_id: v });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un magasin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {" "}
                            {/* w.id est maintenant "main", "north", etc. */}
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Debug temporaire */}
                    <p className="text-xs text-gray-500 mt-1">
                      Valeur sélectionnée: {formData.warehouse_id}
                    </p>
                  </div>
                  <div>
                    <Label>Fournisseur</Label>
                    <Select
                      value={formData.supplier}
                      onValueChange={(v) =>
                        setFormData({ ...formData, supplier: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aucun">Aucun</SelectItem>{" "}
                        {/* CORRECTION : "aucun" au lieu de "" */}
                        {suppliers.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <DialogFooter className="flex gap-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleAdd}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1 font-semibold"
                    disabled={
                      !formData.name ||
                      !formData.reference ||
                      !formData.category
                    }
                  >
                    ✓ Enregistrer le produit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total produits</p>
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
                    <p className="text-sm text-gray-600">En stock</p>
                    <p className="text-2xl font-bold">
                      {products.filter((p) => p.stock > 10).length}
                    </p>
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
                    <p className="text-sm text-gray-600">Stock faible</p>
                    <p className="text-2xl font-bold">
                      {
                        products.filter((p) => p.stock > 0 && p.stock <= 10)
                          .length
                      }
                    </p>
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
                    <p className="text-sm text-gray-600">Rupture</p>
                    <p className="text-2xl font-bold">
                      {products.filter((p) => p.stock === 0).length}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-red-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {!showFilters ? "Filtres" : "Initialiser"}
                    {showFilters && <X className="h-4 w-4 ml-2" />}
                  </Button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <Label>Catégorie</Label>
                      <Select
                        value={categoryFilter}
                        onValueChange={setCategoryFilter}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Toutes les catégories
                          </SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Statut</Label>
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="in_stock">En stock</SelectItem>
                          <SelectItem value="low_stock">
                            Stock faible
                          </SelectItem>
                          <SelectItem value="out_of_stock">Rupture</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Liste des produits ({filteredProducts.length})
                {totalPages > 1 && ` - Page ${currentPage}/${totalPages}`}
              </CardTitle>
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
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>{product.reference}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>€{product.price}</TableCell>
                      <TableCell>{product.supplier}</TableCell>
                      <TableCell>
                        {getStatusBadge(product.status, product.stock)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            {/* AJOUT: Composant de pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-600">
                Affichage de {startIndex + 1} à{" "}
                {Math.min(startIndex + itemsPerPage, filteredProducts.length)}{" "}
                sur {filteredProducts.length} produits
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <span className="px-2 text-sm text-gray-500">...</span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Produits par page:
                </span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1); // Reset à la première page
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </main>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
            <DialogDescription>
              Modifiez les informations du produit.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nom du produit</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Référence</Label>
              <Input
                value={formData.reference}
                onChange={(e) =>
                  setFormData({ ...formData, reference: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Prix (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Magasin (optionnel)</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, warehouse_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un magasin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fournisseur</Label>
              <Select
                value={formData.supplier}
                onValueChange={(v) => setFormData({ ...formData, supplier: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Aucun</SelectItem>{" "}
                  {/* CORRECTION : "aucun" au lieu de "" */}
                  {suppliers.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
                setSelectedProduct(null);
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpdate}
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1 font-semibold"
              disabled={
                !formData.name || !formData.reference || !formData.category
              }
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
              Êtes-vous sûr de vouloir supprimer "{selectedProduct?.name}" ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="flex-1 font-semibold"
            >
              🗑️ Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
