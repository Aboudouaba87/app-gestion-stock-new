"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/dashboard/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/dashboard/components/ui/dialog";
import { Label } from "@/app/dashboard/components/ui/label";
import { Textarea } from "@/app/dashboard/components/ui/textarea";

// Types pour les données
interface StockMovement {
  id: number;
  date: string;
  product: string;
  type: string;
  quantity: number;
  warehouse: string;
  warehouseFrom: string | null;
  warehouseTo: string | null;
  user: string;
  reference: string;
  reason: string;
}

interface Product {
  id: number;
  name: string;
  stock: number;
  reference?: string;
  category?: string;
  totalWarehouseStock?: number;
}

interface Warehouse {
  id: string;
  name: string;
  description?: string;
}

interface StockData {
  movements: StockMovement[];
  products: Product[];
  warehouses: Warehouse[];
  stats: {
    totalMovements: number;
    uniqueProducts: number;
    totalEntries: number;
    totalExits: number;
    totalTransfers: number;
  };
}

export default function StocksPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour les modales
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [deletingMovement, setDeletingMovement] =
    useState<StockMovement | null>(null);

  // AJOUT: États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // États pour les formulaires
  const [newMovement, setNewMovement] = useState({
    product: "",
    type: "entry",
    quantity: "",
    warehouse: "",
    reason: "",
    reference: "",
  });

  const [transfer, setTransfer] = useState({
    product: "",
    quantity: "",
    warehouseFrom: "",
    warehouseTo: "",
    reason: "",
    reference: "",
  });

  const [adjustment, setAdjustment] = useState({
    product: "",
    warehouse: "",
    currentStock: "",
    realStock: "",
    reason: "",
  });

  // Chargement des données depuis l'API
  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/stock?days=30&limit=50`);
        if (!response.ok) throw new Error("Erreur API stock");
        const data: StockData = await response.json();

        setMovements(data.movements);
        setProducts(data.products);
        setWarehouses(data.warehouses);
      } catch (err) {
        console.error("Erreur fetch stock:", err);
        setError("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, []);

  // Reset de la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedWarehouse, selectedType]);

  // Reset aussi quand showFilters change
  useEffect(() => {
    if (!showFilters) {
      setCurrentPage(1);
    }
  }, [showFilters]);

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch =
      movement.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reference.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesWarehouse =
      selectedWarehouse === "all" ||
      movement.warehouse.includes(selectedWarehouse) ||
      movement.warehouseFrom === selectedWarehouse ||
      movement.warehouseTo === selectedWarehouse;

    const matchesType =
      selectedType === "all" || movement.type === selectedType;

    return matchesSearch && matchesWarehouse && matchesType;
  });

  // AJOUT: Calculs pour la pagination
  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMovements = filteredMovements.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleAddMovement = async () => {
    if (!newMovement.product || !newMovement.quantity || !newMovement.warehouse)
      return;

    try {
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: newMovement.type, // 'entry' ou 'exit'
          productId: Number.parseInt(newMovement.product),
          quantity: Number.parseInt(newMovement.quantity),
          warehouseId: newMovement.warehouse,
          reference: newMovement.reference || `MOV-${Date.now()}`,
          reason: newMovement.reason,
          userId: 1, // À remplacer par l'ID de l'utilisateur connecté
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création du mouvement");
      }

      const result = await response.json();

      if (result.success) {
        // Recharger les données
        const stockResponse = await fetch("/api/stock?days=30&limit=50");
        const stockData = await stockResponse.json();

        setMovements(stockData.movements);
        setProducts(stockData.products);

        setNewMovement({
          product: "",
          type: "entry",
          quantity: "",
          warehouse: "",
          reason: "",
          reference: "",
        });
        setIsNewMovementOpen(false);

        alert("Mouvement créé avec succès !");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Erreur mouvement:", error);
      alert(
        "Erreur lors de la création: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  const handleTransfer = async () => {
    if (
      !transfer.product ||
      !transfer.quantity ||
      !transfer.warehouseFrom ||
      !transfer.warehouseTo
    )
      return;

    if (transfer.warehouseFrom === transfer.warehouseTo) {
      alert("L'entrepôt source et destination doivent être différents");
      return;
    }

    try {
      // Appel à l'API pour créer le transfert en base de données
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "transfer",
          productId: Number.parseInt(transfer.product),
          quantity: Number.parseInt(transfer.quantity),
          fromWarehouseId: transfer.warehouseFrom,
          toWarehouseId: transfer.warehouseTo,
          reference: transfer.reference || `TRF-${Date.now()}`,
          reason: transfer.reason || "Transfert entre entrepôts",
          userId: 1, // À remplacer par l'ID de l'utilisateur connecté
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création du transfert");
      }

      const result = await response.json();

      if (result.success) {
        // Recharger les données depuis l'API
        const stockResponse = await fetch("/api/stock?days=30&limit=50");
        const stockData = await stockResponse.json();

        setMovements(stockData.movements);
        setProducts(stockData.products);

        // Réinitialiser le formulaire
        setTransfer({
          product: "",
          quantity: "",
          warehouseFrom: "",
          warehouseTo: "",
          reason: "",
          reference: "",
        });
        setIsTransferOpen(false);

        alert("Transfert effectué avec succès !");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Erreur transfert:", error);
      alert(
        "Erreur lors du transfert: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  const handleAdjustment = async () => {
    if (!adjustment.product || !adjustment.warehouse || !adjustment.realStock)
      return;

    try {
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "adjustment",
          productId: Number.parseInt(adjustment.product),
          quantity: Number.parseInt(adjustment.realStock), // Stock réel
          warehouseId: adjustment.warehouse,
          reference: `ADJ-${Date.now()}`,
          reason: adjustment.reason || "Ajustement d'inventaire",
          userId: 1, // À remplacer par l'ID de l'utilisateur connecté
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'ajustement");
      }

      const result = await response.json();

      if (result.success) {
        // Recharger les données
        const stockResponse = await fetch("/api/stock?days=30&limit=50");
        const stockData = await stockResponse.json();

        setMovements(stockData.movements);
        setProducts(stockData.products);

        setAdjustment({
          product: "",
          warehouse: "",
          currentStock: "",
          realStock: "",
          reason: "",
        });
        setIsAdjustmentOpen(false);

        alert("Ajustement effectué avec succès !");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Erreur ajustement:", error);
      alert(
        "Erreur lors de l'ajustement: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  const handleDeleteMovement = async () => {
    if (!deletingMovement) return;

    try {
      const response = await fetch(`/api/stock?id=${deletingMovement.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      const result = await response.json();

      if (result.success) {
        // Recharger les données
        const stockResponse = await fetch("/api/stock?days=30&limit=50");
        const stockData = await stockResponse.json();

        setMovements(stockData.movements);
        setProducts(stockData.products);
        setDeletingMovement(null);

        alert("Mouvement supprimé avec succès !");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert(
        "Erreur lors de la suppression: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entry":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "exit":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "transfer":
        return <ArrowRightLeft className="h-4 w-4 text-purple-600" />;
      default:
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />;
    }
  };

  const getMovementType = (type: string) => {
    switch (type) {
      case "entry":
        return <Badge className="bg-green-100 text-green-800">Entrée</Badge>;
      case "exit":
        return <Badge className="bg-red-100 text-red-800">Sortie</Badge>;
      case "transfer":
        return (
          <Badge className="bg-purple-100 text-purple-800">Transfert</Badge>
        );
      default:
        return <Badge className="bg-blue-100 text-blue-800">Ajustement</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Chargement des données stock...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gestion des Stocks
              </h1>
              <p className="text-gray-600">
                Suivez et gérez vos mouvements de stock
              </p>
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
                        onValueChange={(value) =>
                          setTransfer({ ...transfer, product: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id.toString()}
                            >
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="trf-quantity">
                        Quantité à transférer
                      </Label>
                      <Input
                        id="trf-quantity"
                        type="number"
                        value={transfer.quantity}
                        onChange={(e) =>
                          setTransfer({ ...transfer, quantity: e.target.value })
                        }
                        placeholder="Quantité"
                      />
                    </div>

                    <div>
                      <Label htmlFor="trf-from">Entrepôt source</Label>
                      <Select
                        value={transfer.warehouseFrom}
                        onValueChange={(value) =>
                          setTransfer({ ...transfer, warehouseFrom: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Depuis quel entrepôt ?" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
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
                        onValueChange={(value) =>
                          setTransfer({ ...transfer, warehouseTo: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Vers quel entrepôt ?" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses
                            .filter((w) => w.id !== transfer.warehouseFrom)
                            .map((warehouse) => (
                              <SelectItem
                                key={warehouse.id}
                                value={warehouse.id}
                              >
                                {warehouse.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="trf-reference">
                        Référence (optionnel)
                      </Label>
                      <Input
                        id="trf-reference"
                        value={transfer.reference}
                        onChange={(e) =>
                          setTransfer({
                            ...transfer,
                            reference: e.target.value,
                          })
                        }
                        placeholder="TRF-001..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="trf-reason">Motif du transfert</Label>
                      <Textarea
                        id="trf-reason"
                        value={transfer.reason}
                        onChange={(e) =>
                          setTransfer({ ...transfer, reason: e.target.value })
                        }
                        placeholder="Réapprovisionnement, réorganisation..."
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setIsTransferOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleTransfer}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={
                          !transfer.product ||
                          !transfer.quantity ||
                          !transfer.warehouseFrom ||
                          !transfer.warehouseTo
                        }
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Effectuer le transfert
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog
                open={isAdjustmentOpen}
                onOpenChange={setIsAdjustmentOpen}
              >
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
                          const product = products.find(
                            (p) => p.id === Number.parseInt(value)
                          );
                          setAdjustment({
                            ...adjustment,
                            product: value,
                            currentStock: product
                              ? product.stock.toString()
                              : "",
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id.toString()}
                            >
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
                        onValueChange={(value) =>
                          setAdjustment({ ...adjustment, warehouse: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un entrepôt" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
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
                          onChange={(e) =>
                            setAdjustment({
                              ...adjustment,
                              realStock: e.target.value,
                            })
                          }
                          placeholder="Stock compté"
                        />
                      </div>
                    </div>

                    {adjustment.currentStock && adjustment.realStock && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Différence :</strong>{" "}
                          {Number.parseInt(adjustment.realStock) -
                            Number.parseInt(adjustment.currentStock) >
                          0
                            ? "+"
                            : ""}
                          {Number.parseInt(adjustment.realStock) -
                            Number.parseInt(adjustment.currentStock)}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="adj-reason">Motif</Label>
                      <Textarea
                        id="adj-reason"
                        value={adjustment.reason}
                        onChange={(e) =>
                          setAdjustment({
                            ...adjustment,
                            reason: e.target.value,
                          })
                        }
                        placeholder="Motif de l'ajustement..."
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setIsAdjustmentOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleAdjustment}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={
                          !adjustment.product ||
                          !adjustment.warehouse ||
                          !adjustment.realStock
                        }
                      >
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        Effectuer l'ajustement
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog
                open={isNewMovementOpen}
                onOpenChange={setIsNewMovementOpen}
              >
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
                        onValueChange={(value) =>
                          setNewMovement({ ...newMovement, product: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id.toString()}
                            >
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
                        onValueChange={(value) =>
                          setNewMovement({ ...newMovement, type: value })
                        }
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
                        onChange={(e) =>
                          setNewMovement({
                            ...newMovement,
                            quantity: e.target.value,
                          })
                        }
                        placeholder="Quantité"
                      />
                    </div>

                    <div>
                      <Label htmlFor="mov-warehouse">Entrepôt</Label>
                      <Select
                        value={newMovement.warehouse}
                        onValueChange={(value) =>
                          setNewMovement({ ...newMovement, warehouse: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un entrepôt" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="mov-reference">
                        Référence (optionnel)
                      </Label>
                      <Input
                        id="mov-reference"
                        value={newMovement.reference}
                        onChange={(e) =>
                          setNewMovement({
                            ...newMovement,
                            reference: e.target.value,
                          })
                        }
                        placeholder="BON-001, CMD-123..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="mov-reason">Motif</Label>
                      <Textarea
                        id="mov-reason"
                        value={newMovement.reason}
                        onChange={(e) =>
                          setNewMovement({
                            ...newMovement,
                            reason: e.target.value,
                          })
                        }
                        placeholder="Motif du mouvement..."
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setIsNewMovementOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleAddMovement}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={
                          !newMovement.product ||
                          !newMovement.quantity ||
                          !newMovement.warehouse
                        }
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
                    <p className="text-sm font-medium text-gray-600">
                      Total produits
                    </p>
                    <p className="text-2xl font-bold">{products.length}</p>
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
                    <p className="text-2xl font-bold">
                      {movements.filter((m) => m.type === "entry").length}
                    </p>
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
                    <p className="text-2xl font-bold">
                      {movements.filter((m) => m.type === "exit").length}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Transferts
                    </p>
                    <p className="text-2xl font-bold">
                      {movements.filter((m) => m.type === "transfer").length}
                    </p>
                  </div>
                  <ArrowRightLeft className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Ajustements
                    </p>
                    <p className="text-2xl font-bold">
                      {movements.filter((m) => m.type === "adjustment").length}
                    </p>
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
                <Select
                  value={selectedWarehouse}
                  onValueChange={setSelectedWarehouse}
                >
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
                      setSelectedWarehouse("all");
                      setSelectedType("all");
                      setSearchTerm("");
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
                Mouvements de stock ({filteredMovements.length})
                {totalPages > 1 && ` - Page ${currentPage}/${totalPages}`}
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
                  {paginatedMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {new Date(movement.date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.product}
                      </TableCell>
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
                        {movement.type === "transfer"
                          ? ""
                          : movement.quantity > 0
                          ? "+"
                          : ""}
                        {movement.quantity}
                      </TableCell>
                      <TableCell>
                        {movement.type === "transfer" ? (
                          <div className="text-sm">
                            <div className="text-red-600">
                              ← {movement.warehouseFrom}
                            </div>
                            <div className="text-green-600">
                              → {movement.warehouseTo}
                            </div>
                          </div>
                        ) : (
                          movement.warehouse
                        )}
                      </TableCell>
                      <TableCell>{movement.user}</TableCell>
                      <TableCell>{movement.reference}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingMovement(movement)}
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
                {Math.min(startIndex + itemsPerPage, filteredMovements.length)}{" "}
                sur {filteredMovements.length} mouvements
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
                  Mouvements par page:
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

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!deletingMovement}
        onOpenChange={() => setDeletingMovement(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer ce mouvement ?
            </p>
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
            <Button variant="outline" onClick={() => setDeletingMovement(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleDeleteMovement}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Confirmer la suppression
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
