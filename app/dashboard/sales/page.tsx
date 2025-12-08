"use client";

type Warehouse = {
  value: string;
  label: string;
  metadata: any;
};

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Eye,
  FileText,
  Euro,
  Trash2,
  X,
  ShoppingCart,
  Printer,
  Edit,
  RefreshCw,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/dashboard/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/dashboard/components/ui/select";
import { Textarea } from "@/app/dashboard/components/ui/textarea";
import { Label } from "@/app/dashboard/components/ui/label";
import { Product } from "../types/product";
import { Client } from "../types/user";
import { Sale } from "../types/sale";
import { toast } from "sonner";
import { RoleGuard } from "../components/auth/role-guard";

// Type pour le stock par entrepôt
type ProductStock = {
  productId: number;
  warehouseId: string;
  quantity: number;
};

export default function SalesPage() {
  // === ÉTATS PRINCIPAUX ===
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productsStock, setProductsStock] = useState<ProductStock[]>([]);

  // === ÉTATS UI ===
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // === ÉTATS MODALES ===
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isEditSaleOpen, setIsEditSaleOpen] = useState(false);
  const [isDeleteSaleOpen, setIsDeleteSaleOpen] = useState(false);
  const [isViewSaleOpen, setIsViewSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // === ÉTATS FORMULAIRE ===
  const [newSale, setNewSale] = useState({
    customer: "",
    customerEmail: "",
    customerPhone: "",
    warehouseId: "",
    products: [],
    paymentMethod: "",
    notes: "",
    paymentStatus: "",
    status: "",
  });

  // === ÉTATS PANIER ===
  const [cart, setCart] = useState<(Product & { quantity: number })[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // === ÉTATS MODIFICATION ===
  const [editStatus, setEditStatus] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("");

  // === ÉTATS PAGINATION ===
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // === ÉTAT FORÇAGE MISE À JOUR ===
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [tva, setTva] = useState<{ id: number; taux: number }[]>([]);
  const [taxRate, setTaxRate] = useState<number>(18);

  // === FONCTION EXTRACTION ERREUR ===
  function extractErrorMessage(str: any) {
    try {
      const json = JSON.parse(str.match(/\{.*\}/)[0]);
      return json.error;
    } catch {
      return str;
    }
  }

  // Recupération de TVA
  useEffect(() => {
    const fetchTva = async () => {
      try {
        const res = await fetch("/api/tva", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Erreur API rôles");
        const data = await res.json();
        setTva(data[0].taux);
        setTaxRate(data[0].taux);
      } catch (err) {
        console.error("Erreur fetch categories :", err);
      } finally {
        // setLoadingCategories(false);
      }
    };
    fetchTva();
  }, []);
  console.log("Le tva de entreprise est : ", tva);

  // === USE EFFECTS ===
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔄 Début du chargement des données...");

        const [salesRes, productsRes, clientsRes, warehousesRes, stockRes] =
          await Promise.all([
            fetch("/api/sales", {
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache",
              },
            }).then((res) => {
              if (!res.ok)
                throw new Error(
                  `Erreur ${res.status} lors du chargement des ventes`
                );
              return res.json();
            }),
            fetch("/api/products").then((res) => {
              if (!res.ok) throw new Error("Erreur chargement produits");
              return res.json();
            }),
            fetch("/api/clients").then((res) => {
              if (!res.ok) throw new Error("Erreur chargement clients");
              return res.json();
            }),
            fetch("/api/warehouses").then((res) => {
              if (!res.ok) throw new Error("Erreur chargement entrepôts");
              return res.json();
            }),
            fetch("/api/product-warehouses").then((res) => {
              if (!res.ok) throw new Error("Erreur chargement stocks");
              return res.json();
            }),
          ]);

        console.log("📦 Données sales reçues:", salesRes);
        console.log("📦 Nombre de ventes:", salesRes?.length);
        console.log("📦 Première vente:", salesRes?.[0]);

        if (Array.isArray(salesRes)) {
          setSales(salesRes);
        } else {
          console.warn("⚠️ salesRes n'est pas un tableau:", salesRes);
          setSales([]);
        }

        setProducts(Array.isArray(productsRes) ? productsRes : []);
        setClients(Array.isArray(clientsRes) ? clientsRes : []);
        setWarehouses(Array.isArray(warehousesRes) ? warehousesRes : []);
        setProductsStock(Array.isArray(stockRes) ? stockRes : []);

        console.log("📦 Produits:", productsRes?.length);
        console.log("📦 Stocks par entrepôt:", stockRes?.length);
      } catch (err: any) {
        console.error("❌ Erreur lors du chargement des données:", err);
        setError(
          err.message ||
            "Une erreur est survenue lors du chargement des données"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [refreshTrigger]); // ✅ Déclenché à chaque refreshTrigger

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // === FONCTION DE RECHARGEMENT FORCÉ ===
  const forceRefresh = async () => {
    try {
      console.log("🔄 Forçage du rafraîchissement...");
      const response = await fetch("/api/sales", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) throw new Error("Erreur rechargement");

      const freshSales = await response.json();
      console.log("📦 Nouvelles données rechargées:", freshSales);

      setSales(freshSales ?? []);
      setCurrentPage(1);

      return freshSales;
    } catch (error) {
      console.error("❌ Erreur rechargement:", error);
      toast.error("Erreur lors du rafraîchissement des données");
    }
  };

  // === FONCTIONS UTILITAIRES ===
  const getProductStockInWarehouse = (
    productId: number,
    warehouseId: string
  ) => {
    if (!warehouseId || !Array.isArray(productsStock)) return 0;
    const stock = productsStock.find(
      (stock: ProductStock) =>
        stock.productId === productId && stock.warehouseId === warehouseId
    );
    return stock ? stock.quantity : 0;
  };

  const getStatusBadge = (status: string) => {
    console.log("La valeur de status est : ", status);
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Terminée</Badge>;
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
        );
      case "shipped":
        return <Badge className="bg-blue-100 text-blue-800">Expédiée</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Annulée</Badge>;
      default:
        return <Badge variant="secondary">Inconnue</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    console.log("La valeur de paymentStatus est : ", status);

    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Payé</Badge>;
      case "pending":
        return (
          <Badge className="bg-orange-100 text-orange-800">En attente</Badge>
        );
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800">Partiel</Badge>;
      case "refunded":
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:text-gray-400">
            Remboursé
          </Badge>
        );
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  // === FILTRES ET PAGINATION ===
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      (product as any).ref
        ?.toLowerCase()
        .includes(productSearch.toLowerCase()) ||
      product.category?.toLowerCase().includes(productSearch.toLowerCase());

    if (newSale.warehouseId) {
      const stockInWarehouse = getProductStockInWarehouse(
        product.id,
        newSale.warehouseId
      );
      return matchesSearch && stockInWarehouse > 0;
    }

    return matchesSearch;
  });

  const filteredSales = sales.filter((sale) => {
    const orderNumber = sale.orderNumber || "";
    const customer = sale.customer || "";
    const customerEmail = sale.customerEmail || "";
    const searchTermLower = searchTerm.toLowerCase();

    const matchesSearch =
      orderNumber.toLowerCase().includes(searchTermLower) ||
      customer.toLowerCase().includes(searchTermLower) ||
      customerEmail.toLowerCase().includes(searchTermLower);

    const matchesStatus =
      statusFilter === "all" || sale.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredSales.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // === GESTION PANIER ===
  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateCartQuantity = (productId: number, quantity: number | string) => {
    if (Number(quantity) <= 0) {
      removeFromCart(productId);
    } else {
      setCart(
        cart.map((item) =>
          item.id === productId
            ? { ...item, quantity: Number.parseInt(quantity as string) }
            : item
        )
      );
    }
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * (taxRate / 100);
    console.log("Le sous total est : ", subtotal, " et le tax est : ", taxRate);

    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: (subtotal + tax).toFixed(2),
    };
  };

  // === GESTION CLIENTS ===
  const q = String(clientSearch ?? "")
    .trim()
    .toLowerCase();
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
    }
  } catch (err) {
    console.error("Erreur lors du filtrage des clients:", err);
    filteredClients = [];
  }

  const selectClient = (client: Client) => {
    setNewSale({
      ...newSale,
      customer: client.name,
      customerEmail: client.email,
      customerPhone: client.phone ?? "",
    });
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  // === CRÉATION DE VENTE - VERSION CORRIGÉE ===
  const handleCreateSale = async () => {
    // Validation de base
    if (cart.length === 0 || !newSale.customer || !newSale.paymentMethod) {
      toast.warning(
        "Veuillez remplir tous les champs obligatoires et ajouter des produits au panier"
      );
      return;
    }

    if (!newSale.warehouseId) {
      toast.warning("Veuillez sélectionner un entrepôt");
      return;
    }

    setActionLoading(true);

    try {
      // Vérifier si c'est un nouveau client
      const existingClient = clients.find((c) => c.name === newSale.customer);
      let clientId = existingClient?.id;

      // Si c'est un nouveau client, créer le client d'abord
      if (!existingClient) {
        if (!newSale.customerEmail) {
          toast.warning("Veuillez fournir un email pour le nouveau client");
          setActionLoading(false);
          return;
        }

        console.log("🔄 Création du nouveau client...");

        // Vérifier d'abord si l'email n'existe pas déjà
        const emailExists = clients.some(
          (c) => c.email === newSale.customerEmail
        );
        if (emailExists) {
          toast.error("❌ Cet email est déjà utilisé par un autre client");
          setActionLoading(false);
          return;
        }

        const clientResponse = await fetch("/api/clients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newSale.customer,
            email: newSale.customerEmail,
            phone: newSale.customerPhone || "",
            paymentMethod: newSale.paymentStatus,
            type: "Particulier",
          }),
        });

        if (!clientResponse.ok) {
          const errorText = await clientResponse.text();
          console.error("❌ Erreur création client:", errorText);

          if (clientResponse.status === 409) {
            toast.error(
              "❌ Cet email est déjà utilisé. Veuillez en choisir un autre."
            );
          } else {
            throw new Error(`Échec de la création du client: ${errorText}`);
          }
          return;
        }

        const newClient = await clientResponse.json();
        console.log("✅ Client créé:", newClient);

        // Mettre à jour la liste des clients localement
        setClients((prev) => [...prev, newClient]);
        clientId = newClient.id;

        toast.success("👤 Client créé avec succès");
      }

      // 🔥 CALCULS COTÉ FRONTEND
      console.log("🧮 Calculs côté frontend...");

      console.log(`Taux TVA utilisé: ${taxRate}%`);

      // Calculer les montants
      let totalHT = 0;
      let totalTax = 0;
      let totalTTC = 0;

      // Préparer les produits avec leurs prix TTC calculés
      const productsWithCalculatedPrices = cart.map((item) => {
        // Le prix dans le panier est HT (depuis la table products)
        const priceHT = item.price;

        // Calculer le prix TTC avec le taux de TVA
        const priceTTC = priceHT * (1 + taxRate / 100);

        // Ajouter au total
        const itemHT = priceHT * item.quantity;
        const itemTax = itemHT * (taxRate / 100);
        const itemTTC = priceTTC * item.quantity;

        totalHT += itemHT;
        totalTax += itemTax;
        totalTTC += itemTTC;

        console.log(
          `📦 ${item.name}: HT=${priceHT} → TTC=${priceTTC.toFixed(2)} (x${
            item.quantity
          })`
        );

        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: priceTTC, // 🔥 Envoyer le prix TTC calculé
        };
      });

      console.log("💰 Totaux calculés:", {
        totalHT: totalHT.toFixed(2),
        totalTax: totalTax.toFixed(2),
        totalTTC: totalTTC.toFixed(2),
        taxRate: `${taxRate}%`,
      });

      // Préparer le payload COMPLET pour le backend
      const payload = {
        orderNumber: `CMD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: new Date().toISOString().split("T")[0],
        customer: newSale.customer,
        customerEmail: newSale.customerEmail,
        customerPhone: newSale.customerPhone || "",
        // 🔥 ENVOYER LES MONTANTS CALCULÉS
        amount: totalTTC, // TTC calculé
        amount_ht: totalHT, // HT calculé
        tax_rate: taxRate, // Taux de TVA utilisé
        status: newSale.status,
        paymentStatus: newSale.paymentStatus,
        items: cart.reduce((sum, item) => sum + item.quantity, 0),
        warehouseId: newSale.warehouseId,
        paymentMethod: newSale.paymentMethod,
        notes: newSale.notes || "",
        clientId: clientId,
        // 🔥 Envoyer les produits AVEC leurs prix TTC calculés
        products: productsWithCalculatedPrices,
      };

      console.log("La méthode de payement est : ", newSale.paymentMethod);

      console.log("🔄 Envoi de la vente au backend avec calculs:", {
        ...payload,
        products: payload.products.map((p) => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          price: p.price,
        })),
      });

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erreur API vente:", errorText);

        if (errorText.includes("non disponible")) {
          toast.error(`❌ Erreur de stock: ${errorText}`);
        } else if (errorText.includes("insuffisant")) {
          toast.error(`❌ Stock insuffisant: ${errorText}`);
        } else if (errorText.includes("TVA") || errorText.includes("tax")) {
          // Erreur liée aux calculs de TVA
          toast.error(`❌ Erreur de calcul: ${errorText}`);
        } else {
          throw new Error(`Erreur ${response.status}: ${errorText}`);
        }
        return;
      }

      const result = await response.json();
      console.log("✅ Vente créée par le backend:", {
        id: result.id,
        orderNumber: result.order_number || result.orderNumber,
        amount: result.amount, // Devrait correspondre à notre totalTTC
        amount_ht: result.amount_ht, // Devrait correspondre à notre totalHT
        tax_amount: result.amount_tax, // Devrait correspondre à notre totalTax
        tax_rate: result.tax_rate, // Devrait correspondre à notre taxRate
      });

      // Vérifier la cohérence des calculs
      const tolerance = 0.01; // Tolérance de 1 centime
      if (Math.abs(result.amount - totalTTC) > tolerance) {
        console.warn(
          `⚠️ Incohérence TTC: Frontend=${totalTTC}, Backend=${result.amount}`
        );
      }
      if (Math.abs(result.amount_ht - totalHT) > tolerance) {
        console.warn(
          `⚠️ Incohérence HT: Frontend=${totalHT}, Backend=${result.amount_ht}`
        );
      }

      // Mise à jour du state des ventes avec la réponse du backend
      const newSaleFromBackend: Sale = {
        id: result.id || result.sale?.id,
        orderNumber:
          result.order_number || result.orderNumber || payload.orderNumber,
        date: result.date || payload.date,
        customer: result.customer_name || payload.customer,
        customerEmail: result.customer_email || payload.customerEmail,
        amount: result.amount,
        amount_ht: result.amount_ht,
        amount_tax: result.amount_tax,
        tax_rate: result.tax_rate,
        status: result.status || payload.status,
        paymentStatus: result.paymentStatus || payload.paymentStatus,
        items: result.items || payload.items,
        products: result.products || payload.products,
        clientId: result.client_id || clientId,
      };

      setSales((prev) => [newSaleFromBackend, ...prev]);
      console.log("✅ Vente ajoutée au state:", newSaleFromBackend);

      // Réinitialiser le formulaire
      setNewSale({
        customer: "",
        customerEmail: "",
        customerPhone: "",
        warehouseId: "",
        products: [],
        paymentMethod: "",
        notes: "",
        paymentStatus: "",
        status: "",
      });
      setCart([]);
      setClientSearch("");
      setProductSearch("");
      setShowClientDropdown(false);
      setShowProductDropdown(false);
      setIsNewSaleOpen(false);

      // Afficher un message avec les détails calculés
      toast.success(
        `✅ Vente créée avec succès !\n` +
          `HT: ${result.amount_ht?.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}€\n` +
          `TVA (${result.tax_rate}%): ${result.amount_tax?.toLocaleString(
            "fr-FR",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          )}€\n` +
          `TTC: ${result.amount?.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}€`
      );
    } catch (err: any) {
      console.error("❌ Erreur création vente:", err);

      let errorMessage = err.message;
      try {
        if (err.message.match(/\{.*\}/)) {
          const json = JSON.parse(err.message.match(/\{.*\}/)[0]);
          errorMessage = json.error || err.message;
        }
      } catch (parseError) {
        // Utiliser le message d'erreur original
      }

      toast.error(`❌ ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };
  // === MODIFICATION DE VENTE ===
  const handleUpdateSale = async () => {
    if (!selectedSale) return;

    setActionLoading(true);

    try {
      const payload = {
        id: selectedSale.id,
        status: editStatus || selectedSale.status,
        paymentStatus: editPaymentStatus || selectedSale.paymentStatus,
      };

      console.log("🔄 Mise à jour vente:", payload);

      // Mise à jour optimiste IMMÉDIATE
      setSales((prev) =>
        prev.map((sale) =>
          sale.id === selectedSale.id
            ? {
                ...sale,
                status: editStatus || sale.status,
                paymentStatus: editPaymentStatus || sale.paymentStatus,
              }
            : sale
        )
      );

      const response = await fetch("/api/sales", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      // ✅ FORCER le rechargement des données après mise à jour
      console.log("🔄 Forçage du rechargement après mise à jour...");
      await forceRefresh();

      setSelectedSale(null);
      setIsEditSaleOpen(false);

      toast.success("✅ Vente modifiée avec succès !");
    } catch (err: any) {
      console.error("❌ Erreur modification:", err);

      // Rollback en cas d'erreur
      forceRefresh();

      toast.error(`❌ Erreur: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // === SUPPRESSION DE VENTE ===
  const handleDeleteSale = async () => {
    if (!selectedSale) return;

    setActionLoading(true);

    try {
      console.log("🔄 Suppression vente ID:", selectedSale.id);

      const response = await fetch(`/api/sales?id=${selectedSale.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      console.log("✅ Vente supprimée");

      // ✅ Mise à jour IMMÉDIATE du state
      setSales((prev) => prev.filter((sale) => sale.id !== selectedSale.id));

      setIsDeleteSaleOpen(false);
      setSelectedSale(null);

      toast.success("✅ Vente supprimée avec succès !");
    } catch (err: any) {
      console.error("❌ Erreur suppression:", err);
      toast.error(`❌ Erreur: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  console.log("La tva à le fin est ", taxRate);

  // === IMPRESSION FACTURE ===
  const handlePrintReceipt = (sale: Sale) => {
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
            <strong>Date:</strong> ${new Date(sale.date).toLocaleDateString(
              "fr-FR"
            )}
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
            `
                )
                .join("") || ""
            }
            <tr class="total-row">
              <td colspan="3"><strong>Total HT</strong></td>
              <td><strong>€${(sale.amount / 1.2).toFixed(2)}</strong></td>
            </tr>
            <tr class="total-row">
              <td colspan="3"><strong>TVA (${sale.tax_rate}%)</strong></td>
              <td><strong>€${(sale.amount - sale.amount / 1.2).toFixed(
                2
              )}</strong></td>
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
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // === RÉINITIALISATION FILTRES ===
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  // === CALCUL STATISTIQUES ===
  const stats = {
    totalRevenue: sales.reduce(
      (sum, sale) => sum + (Number(sale.amount) || 0),
      0
    ),
    totalOrders: sales.length,
    averageOrder:
      sales.length > 0
        ? sales.reduce((sum, sale) => sum + (Number(sale.amount) || 0), 0) /
          sales.length
        : 0,
    pendingOrders: sales.filter((sale) => sale.status === "pending").length,
  };

  // === CONDITIONS DE CHARGEMENT ===
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Chargement des ventes...
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
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // === RENDU PRINCIPAL ===
  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4 dark:bg-gray-900 dark:text-white">
            <div className="flex items-center justify-between">
              <div className="ml-10 lg:ml-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-300">
                  Ventes
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gérez vos commandes et factures
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={forceRefresh}
                  disabled={actionLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
                <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 dark:text-white">
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
                          <Label htmlFor="clientSearch">
                            Rechercher un client *
                          </Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 dark:text-gray-200" />
                            <Input
                              id="clientSearch"
                              placeholder="Nom, email ou téléphone..."
                              className="pl-10"
                              value={clientSearch}
                              onChange={(e) => {
                                setClientSearch(e.target.value);
                                setShowClientDropdown(true);
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
                                          <p className="font-medium">
                                            {client.name}
                                          </p>
                                          <p className="text-sm text-gray-500 dark:text-gray-300">
                                            {client.email}
                                          </p>
                                          <p className="text-sm text-gray-500 dark:text-gray-300 ">
                                            {client.phone}
                                          </p>
                                        </div>
                                        <Badge
                                          variant={
                                            client.type === "Entreprise"
                                              ? "default"
                                              : "secondary"
                                          }
                                        >
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
                                        });
                                        setShowClientDropdown(false);
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
                                    });
                                    setShowClientDropdown(false);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Créer nouveau client "{clientSearch}"
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Informations client sélectionné ou nouveau */}
                        {newSale.customer && (
                          <div className="space-y-3">
                            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-blue-900">
                                    {newSale.customer}
                                  </p>
                                  {newSale.customerEmail && (
                                    <p className="text-sm text-blue-700">
                                      {newSale.customerEmail}
                                    </p>
                                  )}
                                  {newSale.customerPhone && (
                                    <p className="text-sm text-blue-700">
                                      {newSale.customerPhone}
                                    </p>
                                  )}
                                </div>
                                {clients.find(
                                  (c) => c.name === newSale.customer
                                ) ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    Client existant
                                  </Badge>
                                ) : (
                                  <Badge className="bg-orange-100 text-orange-800">
                                    Nouveau client
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Champs pour nouveau client */}
                            {!clients.find(
                              (c) => c.name === newSale.customer
                            ) && (
                              <div className="space-y-3 p-4 border-2 border-orange-200 rounded-md bg-orange-50/50">
                                <div className="flex items-center gap-2 mb-3">
                                  <Plus className="h-4 w-4 text-orange-600" />
                                  <p className="text-sm font-medium text-orange-800">
                                    Informations du nouveau client à créer :
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor="newClientEmail">
                                    Email * (obligatoire)
                                  </Label>
                                  <Input
                                    id="newClientEmail"
                                    type="email"
                                    placeholder="email@exemple.com"
                                    value={newSale.customerEmail}
                                    onChange={(e) =>
                                      setNewSale({
                                        ...newSale,
                                        customerEmail: e.target.value,
                                      })
                                    }
                                    className="border-orange-300 focus:border-orange-500"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="newClientPhone">
                                    Téléphone (optionnel)
                                  </Label>
                                  <Input
                                    id="newClientPhone"
                                    placeholder="06 12 34 56 78"
                                    value={newSale.customerPhone}
                                    onChange={(e) =>
                                      setNewSale({
                                        ...newSale,
                                        customerPhone: e.target.value,
                                      })
                                    }
                                    className="border-orange-300 focus:border-orange-500"
                                  />
                                </div>
                                <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
                                  💡 Ce client sera automatiquement ajouté à
                                  votre base de données après la création de la
                                  vente.
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <Label htmlFor="paymentMethod">
                            Mode de paiement *
                          </Label>
                          <Select
                            value={newSale.paymentMethod}
                            onValueChange={(value) =>
                              setNewSale({ ...newSale, paymentMethod: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Espèces</SelectItem>
                              <SelectItem value="card">
                                Carte bancaire
                              </SelectItem>
                              <SelectItem value="transfer">Virement</SelectItem>
                              <SelectItem value="check">Chèque</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="warehouse">Magasin *</Label>
                          <Select
                            value={newSale.warehouseId}
                            onValueChange={(value) => {
                              setNewSale({ ...newSale, warehouseId: value });
                              setProductSearch("");
                              setShowProductDropdown(false);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un magasin" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses.map((warehouse) => (
                                <SelectItem
                                  key={warehouse.value}
                                  value={warehouse.value}
                                >
                                  {warehouse.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!newSale.warehouseId && (
                            <p className="text-sm text-red-600">
                              Veuillez sélectionner un entrepôt
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={newSale.notes}
                            onChange={(e) =>
                              setNewSale({ ...newSale, notes: e.target.value })
                            }
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
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 dark:text-gray-200" />
                            <Input
                              placeholder="Nom, référence ou catégorie..."
                              className="pl-10"
                              value={productSearch}
                              onChange={(e) => {
                                setProductSearch(e.target.value);
                                setShowProductDropdown(true);
                              }}
                              onFocus={() => {
                                if (newSale.warehouseId) {
                                  setShowProductDropdown(true);
                                }
                              }}
                              disabled={!newSale.warehouseId}
                            />
                          </div>

                          {!newSale.warehouseId && (
                            <p className="text-sm text-yellow-600 mt-1">
                              ⚠️ Veuillez d'abord sélectionner un magasin pour
                              rechercher des produits
                            </p>
                          )}

                          {/* Dropdown des produits */}
                          {showProductDropdown &&
                            productSearch &&
                            newSale.warehouseId && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {filteredProducts.length > 0 ? (
                                  filteredProducts.map((product) => {
                                    const stockInWarehouse =
                                      getProductStockInWarehouse(
                                        product.id,
                                        newSale.warehouseId
                                      );
                                    return (
                                      <div
                                        key={product.id}
                                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                        onClick={() => addToCart(product)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <p className="font-medium">
                                              {product.name}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-300">
                                              {(product as any).ref} •{" "}
                                              {product.category}
                                            </p>
                                            <p className="text-sm font-medium text-green-600">
                                              €{product.price} • Stock:{" "}
                                              {stockInWarehouse}
                                            </p>
                                          </div>
                                          <Button size="sm" className="ml-2">
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="p-3 text-gray-500 text-center dark:text-gray-300">
                                    Aucun produit trouvé dans ce magasin
                                  </div>
                                )}
                              </div>
                            )}
                        </div>

                        {/* Panier */}
                        <div>
                          <Label>Panier ({cart.length} articles)</Label>
                          <div className="border rounded p-2 max-h-60 overflow-y-auto">
                            {cart.length === 0 ? (
                              <p className="text-gray-500 text-center py-4 dark:text-gray-300">
                                Aucun produit sélectionné
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {cart.map((item) => {
                                  const availableStock = newSale.warehouseId
                                    ? getProductStockInWarehouse(
                                        item.id,
                                        newSale.warehouseId
                                      )
                                    : item.stock;

                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                    >
                                      <div className="flex-1">
                                        <p className="font-medium">
                                          {item.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-300">
                                          {(item as any).ref} • €{item.price}
                                        </p>
                                        {newSale.warehouseId && (
                                          <p className="text-xs text-blue-600">
                                            Stock disponible: {availableStock}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          min="1"
                                          max={availableStock}
                                          value={item.quantity}
                                          onChange={(e) =>
                                            updateCartQuantity(
                                              item.id,
                                              e.target.value
                                            )
                                          }
                                          className="w-16 h-8"
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            removeFromCart(item.id)
                                          }
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Total */}
                                <div className="border-t pt-2 mt-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Sous-total:</span>
                                    <span>€{calculateTotal().subtotal}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>TVA ({taxRate}%):</span>
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
                          setIsNewSaleOpen(false);
                          setClientSearch("");
                          setProductSearch("");
                          setShowClientDropdown(false);
                          setShowProductDropdown(false);
                        }}
                        disabled={actionLoading}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleCreateSale}
                        disabled={
                          actionLoading ||
                          cart.length === 0 ||
                          !newSale.customer ||
                          !newSale.paymentMethod ||
                          (!clients.find((c) => c.name === newSale.customer) &&
                            !newSale.customerEmail)
                        }
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Création...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Créer la vente
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        CA du mois
                      </p>
                      <p className="text-2xl font-bold">
                        €
                        {Number(stats.totalRevenue).toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <Euro className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Commandes
                      </p>
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
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Panier moyen
                      </p>
                      <p className="text-2xl font-bold">
                        €
                        {isNaN(stats.averageOrder)
                          ? "0,00"
                          : Number(stats.averageOrder).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
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
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        En attente
                      </p>
                      <p className="text-2xl font-bold">
                        {stats.pendingOrders}
                      </p>
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
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 dark:text-gray-200" />
                      <Input
                        placeholder="Rechercher une commande, client..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                  >
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
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
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
                  Commandes récentes ({filteredSales.length} résultat
                  {filteredSales.length > 1 ? "s" : ""})
                  {totalPages > 1 && ` - Page ${currentPage}/${totalPages}`}
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
                    {paginatedSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {sale.orderNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(sale.date).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sale.customer}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-300">
                              {sale.customerEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          €
                          {(sale.amount || 0).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>{sale.items}</TableCell>
                        <TableCell>{getStatusBadge(sale.status)}</TableCell>
                        <TableCell>
                          {getPaymentBadge(sale.paymentStatus)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {/* Voir détails */}
                            <Dialog
                              open={isViewSaleOpen}
                              onOpenChange={setIsViewSaleOpen}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedSale(sale)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    Détails de la commande{" "}
                                    {selectedSale?.orderNumber}
                                  </DialogTitle>
                                </DialogHeader>
                                {selectedSale && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Client</Label>
                                        <p className="font-medium">
                                          {selectedSale.customer}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-300">
                                          {selectedSale.customerEmail}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Date</Label>
                                        <p>
                                          {new Date(
                                            selectedSale.date
                                          ).toLocaleDateString("fr-FR")}
                                        </p>
                                      </div>
                                    </div>

                                    <div>
                                      <Label>Produits commandés</Label>
                                      <div className="border rounded p-3 space-y-2">
                                        {selectedSale.products?.map(
                                          (product, index) => (
                                            <div
                                              key={index}
                                              className="flex justify-between"
                                            >
                                              <span>
                                                {product.name} x
                                                {product.quantity}
                                              </span>
                                              <span>
                                                €
                                                {(
                                                  product.price *
                                                  product.quantity
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                          )
                                        )}
                                        <div className="border-t pt-2 space-y-1">
                                          <div className="flex justify-between text-sm">
                                            <span>Sous-total HT:</span>
                                            <span>
                                              €
                                              {Number(
                                                selectedSale.amount / 1.2
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span>TVA ({tva[0]?.taux}%):</span>
                                            <span>
                                              €
                                              {Number(
                                                selectedSale.amount -
                                                  selectedSale.amount / 1.2
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                          <div className="border-t pt-1 font-bold flex justify-between">
                                            <span>Total TTC:</span>
                                            <span>
                                              €
                                              {Number(
                                                selectedSale.amount
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Statut commande</Label>
                                        <div className="mt-1">
                                          {getStatusBadge(selectedSale.status)}
                                        </div>
                                      </div>
                                      <div>
                                        <Label>Statut paiement</Label>
                                        <div className="mt-1">
                                          {getPaymentBadge(
                                            selectedSale.paymentStatus
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            {/* Modifier statuts */}
                            <Dialog
                              open={isEditSaleOpen}
                              onOpenChange={setIsEditSaleOpen}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSale(sale);
                                    setEditStatus(sale.status);
                                    setEditPaymentStatus(sale.paymentStatus);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Modifier la commande{" "}
                                    {selectedSale?.orderNumber}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Statut de la commande</Label>
                                    <Select
                                      value={editStatus}
                                      onValueChange={setEditStatus}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">
                                          En attente
                                        </SelectItem>
                                        <SelectItem value="completed">
                                          Terminée
                                        </SelectItem>
                                        <SelectItem value="shipped">
                                          Expédiée
                                        </SelectItem>
                                        <SelectItem value="cancelled">
                                          Annulée
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Statut du paiement</Label>
                                    <Select
                                      value={editPaymentStatus}
                                      onValueChange={setEditPaymentStatus}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">
                                          En attente
                                        </SelectItem>
                                        <SelectItem value="paid">
                                          Payé
                                        </SelectItem>
                                        <SelectItem value="partial">
                                          Partiel
                                        </SelectItem>
                                        <SelectItem value="refunded">
                                          Remboursé
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                  <Button
                                    variant="outline"
                                    onClick={() => setIsEditSaleOpen(false)}
                                    disabled={actionLoading}
                                  >
                                    Annuler
                                  </Button>
                                  <Button
                                    onClick={handleUpdateSale}
                                    className="bg-blue-600 hover:bg-blue-700"
                                    disabled={actionLoading}
                                  >
                                    {actionLoading ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Sauvegarde...
                                      </>
                                    ) : (
                                      <>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Enregistrer les modifications
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* Imprimer */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrintReceipt(sale)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>

                            {/* Supprimer */}
                            <Dialog
                              open={isDeleteSaleOpen}
                              onOpenChange={setIsDeleteSaleOpen}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedSale(sale)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Supprimer la commande
                                  </DialogTitle>
                                </DialogHeader>
                                <p>
                                  Êtes-vous sûr de vouloir supprimer la commande{" "}
                                  <strong>{selectedSale?.orderNumber}</strong>{" "}
                                  de <strong>{selectedSale?.customer}</strong> ?
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-300">
                                  Cette action est irréversible.
                                </p>
                                <div className="flex justify-end gap-2 pt-4">
                                  <Button
                                    variant="outline"
                                    onClick={() => setIsDeleteSaleOpen(false)}
                                    disabled={actionLoading}
                                  >
                                    Annuler
                                  </Button>
                                  <Button
                                    onClick={handleDeleteSale}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={actionLoading}
                                  >
                                    {actionLoading ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Suppression...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Confirmer la suppression
                                      </>
                                    )}
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

                {filteredSales.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-300">
                    <p>Aucune vente trouvée</p>
                    <p className="text-sm">
                      Essayez de modifier vos critères de recherche
                    </p>
                  </div>
                )}
              </CardContent>

              {/* Pagination */}
              {filteredSales.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Affichage de {startIndex + 1} à{" "}
                    {Math.min(startIndex + itemsPerPage, filteredSales.length)}{" "}
                    sur {filteredSales.length} ventes
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
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
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
                        }
                      )}
                      {totalPages > 5 && (
                        <span className="px-2 text-sm text-gray-500 dark:text-gray-300">
                          ...
                        </span>
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
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Ventes par page:
                    </span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
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
              )}
            </Card>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
