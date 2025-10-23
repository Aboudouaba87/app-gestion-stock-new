"use client"
import { useEffect, useState } from "react"
import { Plus, Search, Filter, Eye, FileText, Euro, Trash2, X, ShoppingCart, Printer, Edit } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Product } from "../types/product"
import { Client } from "../types/user"
import { Sale } from "../types/sale"
import { log } from "console"



export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false)
  const [isEditSaleOpen, setIsEditSaleOpen] = useState(false)
  const [isDeleteSaleOpen, setIsDeleteSaleOpen] = useState(false)
  const [isViewSaleOpen, setIsViewSaleOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  


 // Initialisation des données
  //   useEffect(() => {
  //   const fetchProducts = async () => {
  //     const controller = new AbortController();
  //   const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  //   // Recuperation des produits
  //   try {
  //     const res = await fetch("/api/products", { signal: controller.signal });
  //     clearTimeout(timeout);
  //     if (!res.ok) throw new Error("Erreur API");
  //     const data = await res.json();
  //     setProducts(data);
  //   } catch (err) {
  //     console.error("Erreur fetch produits :", err);
  //   }

  //   // Recupération des clients
  //   try {
  //     const res = await fetch("/api/clients", { signal: controller.signal });
  //     clearTimeout(timeout);
  //     if (!res.ok) throw new Error("Erreur API");
  //     const data = await res.json();
  //     setClients(data);
  //   } catch (err) {
  //     console.error("Erreur fetch produits :", err);
  //   }

  //   }
  //   fetchProducts()
  // }, [])

  useEffect(() => {
  const fetchProducts = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/products", { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("Erreur API produits");
      const data = await res.json();
      setProducts(data ?? []);
    } catch (err) {
      console.error("Erreur fetch produits :", err);
      setProducts([]); // fallback
    }
  };

  const fetchClients = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/clients", { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("Erreur API clients");
      const data = await res.json();
      setClients(data ?? []);
    } catch (err) {
      console.error("Erreur fetch clients :", err);
      setClients([]); // fallback
    }
  };

  fetchProducts();
  fetchClients();
}, []);



  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await fetch("/api/sales");
        if (!res.ok) throw new Error("Erreur API");
        const data = await res.json();
        setSales(data);
      } catch (err) {
        console.error("Erreur fetch sales :", err);
      }
    };

    fetchSales();
  }, []);



  // Formulaire nouvelle vente
  const [newSale, setNewSale] = useState({
    customer: "",
    customerEmail: "",
    customerPhone: "",
    products: [],
    paymentMethod: "",
    notes: "",
  })

  // Panier pour nouvelle vente
  const [cart, setCart] = useState<(Product & { quantity: number })[]>([])

  // États pour modification
  const [editStatus, setEditStatus] = useState("")
  const [editPaymentStatus, setEditPaymentStatus] = useState("")

  // États pour les recherches
  const [clientSearch, setClientSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Terminée</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
      case "shipped":
        return <Badge className="bg-blue-100 text-blue-800">Expédiée</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Annulée</Badge>
      default:
        return <Badge variant="secondary">Inconnue</Badge>
    }
  }

  const getPaymentBadge = (status : string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Payé</Badge>
      case "pending":
        return <Badge className="bg-orange-100 text-orange-800">En attente</Badge>
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800">Partiel</Badge>
      case "refunded":
        return <Badge className="bg-gray-100 text-gray-800">Remboursé</Badge>
      default:
        return <Badge variant="secondary">Inconnu</Badge>
    }
  }

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || sale.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item: Product & { quantity: number }) => item.id === product.id)
    if (existingItem) {
      setCart(cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
    setProductSearch("")
    setShowProductDropdown(false)
  }

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.id !== productId))
  }

  const updateCartQuantity = (productId: number, quantity: number | string) => {
    if (Number(quantity) <= 0) {
      removeFromCart(productId)
    } else {
      setCart(cart.map((item) => (item.id === productId ? { ...item, quantity: Number.parseInt(quantity as string) } : item)))
    }
  }

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const tax = subtotal * 0.2 // TVA 20%
    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: (subtotal + tax).toFixed(2),
    }
  }


const handleCreateSale = async () => {
  if (cart.length === 0 || !newSale.customer || !newSale.paymentMethod) return;
  if (!clients.find((c) => c.name === newSale.customer) && !newSale.customerEmail) return;

  const totals = calculateTotal();
  const payload = {
    orderNumber: `CMD-2024-${String(sales.length + 1).padStart(3, "0")}`,
    date: new Date().toISOString().split("T")[0],
    customerEmail: newSale.customerEmail, // nécessaire côté API
    amount: Number.parseFloat(totals.total),
    status: "pending",
    paymentStatus: "pending",
    items: cart.length,
    products: cart.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
  };

  try {
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Erreur API lors de la création");

    const created = await res.json();

    // Ajoute la vente créée au state sans attendre un refresh
    setSales((prev) => [created, ...prev]);

    // Reset UI
    setNewSale({ customer: "", customerEmail: "", customerPhone: "", products: [], paymentMethod: "", notes: "" });
    setCart([]);
    setClientSearch("");
    setProductSearch("");
    setIsNewSaleOpen(false);
  } catch (err) {
    console.error("Erreur création vente :", err);
  }
};


const handleUpdateSale = async () => {
    console.log("Response status:", selectedSale);
  if (!selectedSale) return;

  const payload = {
    id: selectedSale.id,
    status: editStatus || selectedSale.status,
    paymentStatus: editPaymentStatus || selectedSale.paymentStatus,
  };

  // Optimistic update (évite la latence visuelle)
  setSales((prev) =>
    prev.map((s) =>
      s.id === selectedSale.id ? { ...s, status: payload.status, paymentStatus: payload.paymentStatus } : s
    )
  );

  try {
    const res = await fetch("/api/sales", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    
    if (!res.ok) throw new Error("Erreur API lors de la mise à jour");
    const updated = await res.json();

    // Remplace par la version exacte renvoyée par l’API
    setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

    setSelectedSale(null);
    setIsEditSaleOpen(false);
  } catch (err) {
    console.error("Erreur handleUpdateSale :", err);
    // rollback si nécessaire
  }
};


const handleDeleteSale = async () => {
  if (!selectedSale) return;
  try {
    const res = await fetch(`/api/sales?id=${selectedSale.id}`, { method: "DELETE", cache: "no-store" });
    if (!res.ok) throw new Error("Erreur API lors de la suppression");

    setSales((prev) => prev.filter((s) => s.id !== selectedSale.id));
    setIsDeleteSaleOpen(false);
    setSelectedSale(null);
  } catch (err) {
    console.error("Erreur suppression vente :", err);
  }
};


  const handlePrintReceipt = (sale: Sale) => {
    // Créer le contenu HTML de la facture
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture ${sale.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .company { font-size: 24px; font-weight: bold; color: #333; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .customer-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">StockPro</div>
          <div>Système de gestion des stocks</div>
        </div>
        
        <div class="invoice-info">
          <div>
            <strong>Facture N°:</strong> ${sale.orderNumber}<br>
            <strong>Date:</strong> ${new Date(sale.date).toLocaleDateString("fr-FR")}
          </div>
          <div>
            <strong>Statut:</strong> ${sale.status}<br>
            <strong>Paiement:</strong> ${sale.paymentStatus}
          </div>
        </div>
        
        <div class="customer-info">
          <strong>Client:</strong><br>
          ${sale.customer}<br>
          ${sale.customerEmail}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Quantité</th>
              <th>Prix unitaire</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              sale.products
                ?.map(
                  (product) => `
              <tr>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>€${product.price.toFixed(2)}</td>
                <td>€${(product.price * product.quantity).toFixed(2)}</td>
              </tr>
            `,
                )
                .join("") || ""
            }
            <tr class="total-row">
              <td colspan="3"><strong>Total HT</strong></td>
              <td><strong>€${(sale.amount / 1.2).toFixed(2)}</strong></td>
            </tr>
            <tr class="total-row">
              <td colspan="3"><strong>TVA (20%)</strong></td>
              <td><strong>€${(sale.amount - sale.amount / 1.2).toFixed(2)}</strong></td>
            </tr>
            <tr class="total-row">
              <td colspan="3"><strong>Total TTC</strong></td>
              <td><strong>€${sale.amount.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          Merci pour votre confiance !<br>
          StockPro - Gestion des stocks simplifiée
        </div>
      </body>
      </html>
    `

    // Ouvrir une nouvelle fenêtre et imprimer
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(receiptContent)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }
  }

  const resetFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
  }

  // Filtrer les clients selon la recherche
  // const filteredClients = clients.filter(
  //   (client) =>
  //     client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
  //     client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
  //     (client.phone ?? "").includes(clientSearch),
  // )

  const q = String(clientSearch ?? "").trim().toLowerCase();
console.log("Les clients sont  =", clients);
let filteredClients: Client[] = [];
try {
  if (q.length > 0) {
    filteredClients = clients.filter((client) => {
      const name = String(client?.name ?? "").toLowerCase();
      const email = String(client?.email ?? "").toLowerCase();
      const phone = String(client?.phone ?? "").replace(/\s+/g, "");
      const qPhone = q.replace(/\s+/g, "");
      return name.includes(q) || email.includes(q) || phone.includes(qPhone);
    });
  } else {
    filteredClients = [];
  }
} catch (err) {
  console.error("Erreur lors du filtrage des clients:", err);
  filteredClients = [];
}



  const filteredProducts = products.filter(
    (product) =>
      product.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      (product as any).ref?.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.category?.toLowerCase().includes(productSearch.toLowerCase())
  )


  const selectClient = (client: Client) => {
    setNewSale({
      ...newSale,
      customer: client.name,
      customerEmail: client.email,
      customerPhone: client.phone ?? "",
    })
    setClientSearch(client.name)
    setShowClientDropdown(false)
  }


  // ...dans le calcul des stats :
const stats = {
  totalRevenue: sales.reduce((sum, sale) => sum + (Number(sale.amount) || 0), 0),
  totalOrders: sales.length,
  averageOrder:
    sales.length > 0
      ? sales.reduce((sum, sale) => sum + (Number(sale.amount) || 0), 0) / sales.length
      : 0,
  pendingOrders: sales.filter((sale) => sale.status === "pending").length,
}



  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ventes</h1>
              <p className="text-gray-600">Gérez vos commandes et factures</p>
            </div>
            <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle vente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle vente</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Informations client */}
                  <div className="space-y-4">
                    <div className="relative">
                      <Label htmlFor="clientSearch">Rechercher un client *</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="clientSearch"
                          placeholder="Nom, email ou téléphone..."
                          className="pl-10"
                          value={clientSearch}
                          onChange={(e) => {
                            setClientSearch(e.target.value)
                            setShowClientDropdown(true)
                          }}
                          onFocus={() => setShowClientDropdown(true)}
                        />
                      </div>

                      {/* Dropdown des clients */}
                      {showClientDropdown && clientSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredClients.length > 0 ? (
                            <>
                              {filteredClients.map((client) => (
                                <div
                                  key={client.id}
                                  className="p-3 hover:bg-gray-50 cursor-pointer border-b"
                                  onClick={() => selectClient(client)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">{client.name}</p>
                                      <p className="text-sm text-gray-500">{client.email}</p>
                                      <p className="text-sm text-gray-500">{client.phone}</p>
                                    </div>
                                    <Badge variant={client.type === "Entreprise" ? "default" : "secondary"}>
                                      {client.type}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                              <div className="border-t">
                                <div
                                  className="p-3 hover:bg-blue-50 cursor-pointer text-blue-600 font-medium flex items-center"
                                  onClick={() => {
                                    setNewSale({
                                      ...newSale,
                                      customer: clientSearch,
                                      customerEmail: "",
                                      customerPhone: "",
                                    })
                                    setShowClientDropdown(false)
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Créer nouveau client "{clientSearch}"
                                </div>
                              </div>
                            </>
                          ) : (
                            <div
                              className="p-3 hover:bg-blue-50 cursor-pointer text-blue-600 font-medium flex items-center"
                              onClick={() => {
                                setNewSale({
                                  ...newSale,
                                  customer: clientSearch,
                                  customerEmail: "",
                                  customerPhone: "",
                                })
                                setShowClientDropdown(false)
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Créer nouveau client "{clientSearch}"
                            </div>
                          )}
                        </div>
                      )
                      
                      
                      }
                    </div>

                    {/* Informations client sélectionné ou nouveau */}
                    {newSale.customer && (
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-blue-900">{newSale.customer}</p>
                              {newSale.customerEmail && (
                                <p className="text-sm text-blue-700">{newSale.customerEmail}</p>
                              )}
                              {newSale.customerPhone && (
                                <p className="text-sm text-blue-700">{newSale.customerPhone}</p>
                              )}
                            </div>
                            {clients.find((c) => c.name === newSale.customer) ? (
                              <Badge className="bg-green-100 text-green-800">Client existant</Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800">Nouveau client</Badge>
                            )}
                          </div>
                        </div>

                        {/* Champs pour nouveau client */}
                        {!clients.find((c) => c.name === newSale.customer) && (
                          <div className="space-y-3 p-4 border-2 border-orange-200 rounded-md bg-orange-50/50">
                            <div className="flex items-center gap-2 mb-3">
                              <Plus className="h-4 w-4 text-orange-600" />
                              <p className="text-sm font-medium text-orange-800">
                                Informations du nouveau client à créer :
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="newClientEmail">Email * (obligatoire)</Label>
                              <Input
                                id="newClientEmail"
                                type="email"
                                placeholder="email@exemple.com"
                                value={newSale.customerEmail}
                                onChange={(e) => setNewSale({ ...newSale, customerEmail: e.target.value })}
                                className="border-orange-300 focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <Label htmlFor="newClientPhone">Téléphone (optionnel)</Label>
                              <Input
                                id="newClientPhone"
                                placeholder="06 12 34 56 78"
                                value={newSale.customerPhone}
                                onChange={(e) => setNewSale({ ...newSale, customerPhone: e.target.value })}
                                className="border-orange-300 focus:border-orange-500"
                              />
                            </div>
                            <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
                              💡 Ce client sera automatiquement ajouté à votre base de données après la création de la
                              vente.
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="paymentMethod">Mode de paiement *</Label>
                      <Select
                        value={newSale.paymentMethod}
                        onValueChange={(value) => setNewSale({ ...newSale, paymentMethod: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Espèces</SelectItem>
                          <SelectItem value="card">Carte bancaire</SelectItem>
                          <SelectItem value="transfer">Virement</SelectItem>
                          <SelectItem value="check">Chèque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newSale.notes}
                        onChange={(e) => setNewSale({ ...newSale, notes: e.target.value })}
                        placeholder="Notes sur la commande..."
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Sélection produits */}
                  <div className="space-y-4">
                    <div className="relative">
                      <Label>Rechercher des produits</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Nom, référence ou catégorie..."
                          className="pl-10"
                          value={productSearch}
                          onChange={(e) => {
                            setProductSearch(e.target.value)
                            setShowProductDropdown(true)
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                        />
                      </div>

                      {/* Dropdown des produits */}
                      {showProductDropdown && productSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                              <div
                                key={product.id}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                onClick={() => addToCart(product)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(product as any).ref}• {product.category}
                                    </p>
                                    <p className="text-sm font-medium text-green-600">
                                      €{product.price} • Stock: {product.stock}
                                    </p>
                                  </div>
                                  <Button size="sm" disabled={product.stock === 0} className="ml-2">
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-gray-500 text-center">Aucun produit trouvé</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Panier */}
                    <div>
                      <Label>Panier ({cart.length} articles)</Label>
                      <div className="border rounded p-2 max-h-60 overflow-y-auto">
                        {cart.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">Aucun produit sélectionné</p>
                        ) : (
                          <div className="space-y-2">
                            {cart.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex-1">
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {(item as any) .ref} • €{item.price}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    max={item.stock}
                                    value={item.quantity}
                                    onChange={(e) => updateCartQuantity(item.id, e.target.value)}
                                    className="w-16 h-8"
                                  />
                                  <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.id)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}

                            {/* Total */}
                            <div className="border-t pt-2 mt-2">
                              <div className="flex justify-between text-sm">
                                <span>Sous-total:</span>
                                <span>€{calculateTotal().subtotal}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>TVA (20%):</span>
                                <span>€{calculateTotal().tax}</span>
                              </div>
                              <div className="flex justify-between font-bold">
                                <span>Total:</span>
                                <span>€{calculateTotal().total}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsNewSaleOpen(false)
                      setClientSearch("")
                      setProductSearch("")
                      setShowClientDropdown(false)
                      setShowProductDropdown(false)
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateSale}
                    disabled={
                      cart.length === 0 ||
                      !newSale.customer ||
                      !newSale.paymentMethod ||
                      (!clients.find((c) => c.name === newSale.customer) && !newSale.customerEmail)
                    }
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Créer la vente
                  </Button>
                </div>
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
                    <p className="text-sm font-medium text-gray-600">CA du mois</p>
                    <p className="text-2xl font-bold">
  €{Number(stats.totalRevenue).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
</p>
                    {/* <p className="text-2xl font-bold">€{stats.totalRevenue.toLocaleString()}</p> */}
                  </div>
                  <Euro className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Commandes</p>
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Panier moyen</p>
                    {/* <p className="text-2xl font-bold">€{stats.averageOrder.toFixed(0)}</p> */}
                    <p className="text-2xl font-bold">
                    €
                    {isNaN(stats.averageOrder)
                      ? "0,00"
                      : Number(stats.averageOrder).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  </div>
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-purple-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">En attente</p>
                    <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                  </div>
                  <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <div className="h-4 w-4 bg-orange-600 rounded-full"></div>
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
                      placeholder="Rechercher une commande, client..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filtres
                </Button>
                {(searchTerm || statusFilter !== "all") && (
                  <Button variant="outline" onClick={resetFilters}>
                    Réinitialiser
                  </Button>
                )}
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <Label>Statut de la commande</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="completed">Terminées</SelectItem>
                        <SelectItem value="shipped">Expédiées</SelectItem>
                        <SelectItem value="cancelled">Annulées</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Commandes récentes ({filteredSales.length} résultat{filteredSales.length > 1 ? "s" : ""})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Commande</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Articles</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.orderNumber}</TableCell>
                      <TableCell>{new Date(sale.date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.customer}</p>
                          <p className="text-sm text-gray-500">{sale.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">€{sale.amount.toLocaleString()}</TableCell>
                      <TableCell>{sale.items}</TableCell>
                      <TableCell>{getStatusBadge(sale.status)}</TableCell>
                      <TableCell>{getPaymentBadge(sale.paymentStatus)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {/* Voir détails */}
                          <Dialog open={isViewSaleOpen} onOpenChange={setIsViewSaleOpen}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedSale(sale)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Détails de la commande {selectedSale?.orderNumber}</DialogTitle>
                              </DialogHeader>
                              {selectedSale && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Client</Label>
                                      <p className="font-medium">{selectedSale.customer}</p>
                                      <p className="text-sm text-gray-500">{selectedSale.customerEmail}</p>
                                    </div>
                                    <div>
                                      <Label>Date</Label>
                                      <p>{new Date(selectedSale.date).toLocaleDateString("fr-FR")}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <Label>Produits commandés</Label>
                                    <div className="border rounded p-3 space-y-2">
                                      {selectedSale.products?.map((product, index) => (
                                        <div key={index} className="flex justify-between">
                                          <span>
                                            {product.name} x{product.quantity}
                                          </span>
                                          <span>€{(product.price * product.quantity).toFixed(2)}</span>
                                        </div>
                                      ))}
                                      <div className="border-t pt-2 space-y-1">
                                        <div className="flex justify-between text-sm">
                                          <span>Sous-total HT:</span>
                                          <span>€{Number(selectedSale.amount / 1.2).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span>TVA (20%):</span>
                                          <span>€{Number(selectedSale.amount - selectedSale.amount / 1.2).toFixed(2)}</span>
                                        </div>
                                        <div className="border-t pt-1 font-bold flex justify-between">
                                          <span>Total TTC:</span>
                                          {/* <span>€{selectedSale.amount.toFixed(2)}</span> */}
                                          <span>€{Number(selectedSale.amount).toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Statut commande</Label>
                                      <p className="mt-1">{getStatusBadge(selectedSale.status)}</p>
                                    </div>
                                    <div>
                                      <Label>Statut paiement</Label>
                                      <p className="mt-1">{getPaymentBadge(selectedSale.paymentStatus)}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          {/* Modifier statuts */}
                          <Dialog open={isEditSaleOpen} onOpenChange={setIsEditSaleOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedSale(sale)
                                  setEditStatus(sale.status)
                                  setEditPaymentStatus(sale.paymentStatus)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier la commande {selectedSale?.orderNumber}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Statut de la commande</Label>
                                  <Select value={editStatus} onValueChange={setEditStatus}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">En attente</SelectItem>
                                      <SelectItem value="completed">Terminée</SelectItem>
                                      <SelectItem value="shipped">Expédiée</SelectItem>
                                      <SelectItem value="cancelled">Annulée</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Statut du paiement</Label>
                                  <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">En attente</SelectItem>
                                      <SelectItem value="paid">Payé</SelectItem>
                                      <SelectItem value="partial">Partiel</SelectItem>
                                      <SelectItem value="refunded">Remboursé</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="outline" onClick={() => setIsEditSaleOpen(false)}>
                                  Annuler
                                </Button>
                                <Button onClick={handleUpdateSale} className="bg-blue-600 hover:bg-blue-700">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Enregistrer les modifications
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Imprimer */}
                          <Button variant="ghost" size="sm" onClick={() => handlePrintReceipt(sale)}>
                            <Printer className="h-4 w-4" />
                          </Button>

                          {/* Supprimer */}
                          <Dialog open={isDeleteSaleOpen} onOpenChange={setIsDeleteSaleOpen}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedSale(sale)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Supprimer la commande</DialogTitle>
                              </DialogHeader>
                              <p>
                                Êtes-vous sûr de vouloir supprimer la commande{" "}
                                <strong>{selectedSale?.orderNumber}</strong> de{" "}
                                <strong>{selectedSale?.customer}</strong> ?
                              </p>
                              <p className="text-sm text-gray-500">Cette action est irréversible.</p>
                              <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setIsDeleteSaleOpen(false)}>
                                  Annuler
                                </Button>
                                <Button onClick={handleDeleteSale} className="bg-red-600 hover:bg-red-700">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Confirmer la suppression
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
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
    </div>
  )
}
