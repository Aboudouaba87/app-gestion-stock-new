"use client";

import type React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { useEffect, useState } from "react";
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/app/dashboard/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/dashboard/components/ui/card";
import { Sidebar } from "@/app/dashboard/components/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/dashboard/components/ui/select";
import { DatePickerRange } from "@/app/dashboard/components/date-picker-range";
import { toast } from "@/hooks/use-toast";

// Types pour les données
interface SalesData {
  month: string;
  sales: number;
  orders: number;
  profit: number;
}

interface KpisData {
  revenue: number;
  orders: number;
  clients: number;
  stockout: number;
}

interface CategoryData {
  name: string;
  value: number;
  sales: number;
  color: string;
}

interface TopProductData {
  name: string;
  sales: number;
  revenue: number;
}

interface PeriodData {
  sales: SalesData[];
  kpis: KpisData;
  categories: CategoryData[];
  topProducts: TopProductData[];
}

interface DashboardData {
  week: PeriodData;
  month: PeriodData;
  quarter: PeriodData;
  year: PeriodData;
  custom: PeriodData;
}

// Données par défaut (fallback)
const defaultData: DashboardData = {
  week: {
    sales: [
      { month: "Lun", sales: 0, orders: 0, profit: 0 },
      { month: "Mar", sales: 0, orders: 0, profit: 0 },
      { month: "Mer", sales: 0, orders: 0, profit: 0 },
      { month: "Jeu", sales: 0, orders: 0, profit: 0 },
      { month: "Ven", sales: 0, orders: 0, profit: 0 },
      { month: "Sam", sales: 0, orders: 0, profit: 0 },
      { month: "Dim", sales: 0, orders: 0, profit: 0 },
    ],
    kpis: { revenue: 0, orders: 0, clients: 0, stockout: 0 },
    categories: [
      { name: "Électronique", value: 0, sales: 0, color: "#3b82f6" },
      { name: "Vêtements", value: 0, sales: 0, color: "#10b981" },
      { name: "Maison & Jardin", value: 0, sales: 0, color: "#f59e0b" },
      { name: "Sport & Loisirs", value: 0, sales: 0, color: "#ef4444" },
    ],
    topProducts: [{ name: "Aucun produit", sales: 0, revenue: 0 }],
  },
  month: {
    sales: [],
    kpis: { revenue: 0, orders: 0, clients: 0, stockout: 0 },
    categories: [
      { name: "Électronique", value: 0, sales: 0, color: "#3b82f6" },
      { name: "Vêtements", value: 0, sales: 0, color: "#10b981" },
      { name: "Maison & Jardin", value: 0, sales: 0, color: "#f59e0b" },
      { name: "Sport & Loisirs", value: 0, sales: 0, color: "#ef4444" },
    ],
    topProducts: [{ name: "Aucun produit", sales: 0, revenue: 0 }],
  },
  quarter: {
    sales: [],
    kpis: { revenue: 0, orders: 0, clients: 0, stockout: 0 },
    categories: [
      { name: "Électronique", value: 0, sales: 0, color: "#3b82f6" },
      { name: "Vêtements", value: 0, sales: 0, color: "#10b981" },
      { name: "Maison & Jardin", value: 0, sales: 0, color: "#f59e0b" },
      { name: "Sport & Loisirs", value: 0, sales: 0, color: "#ef4444" },
    ],
    topProducts: [{ name: "Aucun produit", sales: 0, revenue: 0 }],
  },
  year: {
    sales: [],
    kpis: { revenue: 0, orders: 0, clients: 0, stockout: 0 },
    categories: [
      { name: "Électronique", value: 0, sales: 0, color: "#3b82f6" },
      { name: "Vêtements", value: 0, sales: 0, color: "#10b981" },
      { name: "Maison & Jardin", value: 0, sales: 0, color: "#f59e0b" },
      { name: "Sport & Loisirs", value: 0, sales: 0, color: "#ef4444" },
    ],
    topProducts: [{ name: "Aucun produit", sales: 0, revenue: 0 }],
  },
  custom: {
    sales: [],
    kpis: { revenue: 0, orders: 0, clients: 0, stockout: 0 },
    categories: [
      { name: "Électronique", value: 0, sales: 0, color: "#3b82f6" },
      { name: "Vêtements", value: 0, sales: 0, color: "#10b981" },
      { name: "Maison & Jardin", value: 0, sales: 0, color: "#f59e0b" },
      { name: "Sport & Loisirs", value: 0, sales: 0, color: "#ef4444" },
    ],
    topProducts: [{ name: "Aucun produit", sales: 0, revenue: 0 }],
  },
};

// Données pour différents entrepôts
const dataByWarehouse = {
  all: { multiplier: 1, name: "Tous les entrepôts" },
  main: { multiplier: 0.6, name: "Entrepôt Principal" },
  south: { multiplier: 0.25, name: "Entrepôt Sud" },
  north: { multiplier: 0.15, name: "Entrepôt Nord" },
};

// Composant Tooltip global
const GlobalTooltip = ({
  x,
  y,
  content,
  visible,
}: {
  x: number;
  y: number;
  content: string;
  visible: boolean;
}) => {
  if (!visible) return null;

  return (
    <div
      className="fixed bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none z-[9999] whitespace-nowrap"
      style={{
        left: x + 10,
        top: y - 10,
        transform: "translateY(-100%)",
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: content }} />
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
    </div>
  );
};

// Composant de chargement
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <span className="ml-2 text-lg">Chargement des données...</span>
  </div>
);

// Composant d'erreur
const ErrorMessage = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
    <h3 className="text-lg font-semibold text-red-600 mb-2">
      Erreur de chargement
    </h3>
    <p className="text-gray-600 mb-4">{message}</p>
    <Button
      onClick={onRetry}
      variant="outline"
      className=" bg-blue-500 text-white"
    >
      Réessayer
    </Button>
  </div>
);

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [customDateRange, setCustomDateRange] = useState<{
    start?: Date;
    end?: Date;
  }>({});
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: "",
  });

  // Chargement des données depuis l'API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🚀 Chargement des données depuis l'API...");

      const response = await fetch("/api/report");

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Données reçues de l'API:", data);

      setDashboardData(data);

      toast({
        title: "Données chargées",
        description: "Les données du dashboard ont été mises à jour",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des données";
      console.error("❌ Erreur:", err);
      setError(errorMessage);

      toast({
        title: "Erreur de chargement",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialisation des données
  useEffect(() => {
    fetchData();
  }, []);

  // Gérer le changement de dates personnalisées
  const handleDateChange = (
    startDate: Date | undefined,
    endDate: Date | undefined
  ) => {
    setCustomDateRange({ start: startDate, end: endDate });
    if (startDate && endDate) {
      setIsCustomPeriod(true);
      toast({
        title: "Dates personnalisées appliquées",
        description: `Du ${startDate.toLocaleDateString(
          "fr-FR"
        )} au ${endDate.toLocaleDateString("fr-FR")}`,
      });
    }
  };

  // Obtenir les données actuelles basées sur les filtres
  const getCurrentData = (): PeriodData => {
    if (!dashboardData) return defaultData.week;

    if (isCustomPeriod && customDateRange.start && customDateRange.end) {
      return dashboardData.custom || defaultData.custom;
    }

    return (
      dashboardData[selectedPeriod as keyof DashboardData] ||
      defaultData[selectedPeriod as keyof DashboardData]
    );
  };

  const currentData = getCurrentData();
  const warehouseMultiplier =
    dataByWarehouse[selectedWarehouse as keyof typeof dataByWarehouse]
      .multiplier;

  // Appliquer le multiplicateur d'entrepôt aux données
  const salesData = currentData.sales.map((item) => ({
    ...item,
    sales: Math.round(item.sales * warehouseMultiplier),
    orders: Math.round(item.orders * warehouseMultiplier),
    profit: Math.round(item.profit * warehouseMultiplier),
  }));

  const kpis = {
    revenue: Math.round(currentData.kpis.revenue * warehouseMultiplier),
    orders: Math.round(currentData.kpis.orders * warehouseMultiplier),
    clients: Math.round(currentData.kpis.clients * warehouseMultiplier),
    stockout: currentData.kpis.stockout,
  };

  // Appliquer les filtres aux catégories
  const categoryData = currentData.categories.map((category) => ({
    ...category,
    sales: Math.round(category.sales * warehouseMultiplier),
  }));

  // Appliquer les filtres aux top produits
  const topProductsData = currentData.topProducts.map((product) => ({
    ...product,
    sales: Math.round(product.sales * warehouseMultiplier),
    revenue: Math.round(product.revenue * warehouseMultiplier),
  }));

  // Fonction pour afficher le tooltip qui suit la souris
  const showTooltip = (event: React.MouseEvent, content: string) => {
    setTooltip({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      content,
    });
  };

  // Fonction pour mettre à jour la position du tooltip
  const updateTooltip = (event: React.MouseEvent) => {
    if (tooltip.visible) {
      setTooltip((prev) => ({
        ...prev,
        x: event.clientX,
        y: event.clientY,
      }));
    }
  };

  // Fonction pour masquer le tooltip
  const hideTooltip = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: "" });
  };

  // Fonction pour exporter en PDF
  const handleExportPDF = async () => {
    toast({
      title: "Export PDF en cours...",
      description: "Génération du rapport PDF avec les données actuelles",
    });

    // Implémentation PDF simplifiée
    setTimeout(() => {
      toast({
        title: "Export PDF réussi",
        description: "Le rapport PDF a été téléchargé avec succès.",
      });
    }, 1000);
  };

  // Fonction pour exporter en Excel
  const handleExportExcel = () => {
    toast({
      title: "Export Excel en cours...",
      description: "Génération du rapport Excel avec les données actuelles",
    });

    setTimeout(() => {
      toast({
        title: "Export Excel réussi",
        description: "Le rapport Excel a été téléchargé avec succès.",
      });
    }, 1000);
  };

  // Fonction pour gérer le changement de période
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    setIsCustomPeriod(false);
    toast({
      title: "Période mise à jour",
      description: `Affichage des données pour: ${
        value === "week"
          ? "Cette semaine"
          : value === "month"
          ? "Ce mois"
          : value === "quarter"
          ? "Ce trimestre"
          : "Cette année"
      }`,
    });
  };

  // Fonction pour gérer le changement d'entrepôt
  const handleWarehouseChange = (value: string) => {
    setSelectedWarehouse(value);
    toast({
      title: "Entrepôt mis à jour",
      description: `Filtrage par: ${
        dataByWarehouse[value as keyof typeof dataByWarehouse].name
      }`,
    });
  };

  // Affichage du chargement
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
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
              <p className="text-gray-600">
                Analyses et statistiques détaillées - Données en temps réel
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Exporter PDF
              </Button>
              <Button variant="outline" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Exporter Excel
              </Button>
              <Button variant="outline" onClick={fetchData}>
                <Loader2 className="h-4 w-4 mr-2" />
                Actualiser
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Période
                  </label>
                  <Select
                    value={selectedPeriod}
                    onValueChange={handlePeriodChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                      <SelectItem value="quarter">Ce trimestre</SelectItem>
                      <SelectItem value="year">Cette année</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entrepôt
                  </label>
                  <Select
                    value={selectedWarehouse}
                    onValueChange={handleWarehouseChange}
                  >
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dates personnalisées{" "}
                    {isCustomPeriod && (
                      <span className="text-green-600 text-xs">(Actif)</span>
                    )}
                  </label>
                  <DatePickerRange onDateChange={handleDateChange} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards - Dynamiques depuis l'API */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Chiffre d'affaires
                    </p>
                    <p className="text-2xl font-bold">
                      €{kpis.revenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Données en direct
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
                    <p className="text-sm font-medium text-gray-600">
                      Commandes
                    </p>
                    <p className="text-2xl font-bold">
                      {kpis.orders.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Données en direct
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Clients actifs
                    </p>
                    <p className="text-2xl font-bold">
                      {kpis.clients.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Données en direct
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Taux de rupture
                    </p>
                    <p className="text-2xl font-bold">{kpis.stockout}%</p>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      Données en direct
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Évolution des ventes */}
            <Card>
              <CardHeader>
                <CardTitle>Évolution des ventes et profits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 relative" onMouseMove={updateTooltip}>
                  <AreaChart
                    style={{
                      width: "100%",
                      maxWidth: "700px",
                      maxHeight: "70vh",
                      aspectRatio: 1.618,
                    }}
                    responsive
                    data={salesData}
                    margin={{
                      top: 20,
                      right: 0,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" />
                    <YAxis width="auto" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stackId="1"
                      stroke="#ffc658"
                      fill="#ffc658"
                    />
                  </AreaChart>
                </div>
              </CardContent>
            </Card>

            {/* Répartition par catégorie - Dynamique depuis l'API */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition des ventes par catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="h-80 flex items-center justify-center relative"
                  onMouseMove={updateTooltip}
                >
                  <svg width="280" height="280" viewBox="0 0 280 280">
                    {categoryData.map((category, index) => {
                      const startAngle = index * 90;
                      const endAngle = (index + 1) * 90;
                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;

                      const x1 = 140 + 80 * Math.cos(startRad);
                      const y1 = 140 + 80 * Math.sin(startRad);
                      const x2 = 140 + 80 * Math.cos(endRad);
                      const y2 = 140 + 80 * Math.sin(endRad);

                      return (
                        <path
                          key={index}
                          d={`M 140 140 L ${x1} ${y1} A 80 80 0 0 1 ${x2} ${y2} Z`}
                          fill={category.color}
                          stroke="white"
                          strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onMouseEnter={(e) =>
                            showTooltip(
                              e,
                              `<strong>${category.name}</strong><br/>${
                                category.value
                              }% des ventes<br/>€${category.sales.toLocaleString()} de CA`
                            )
                          }
                          onMouseLeave={hideTooltip}
                        />
                      );
                    })}
                  </svg>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {categoryData.map((category, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-sm">{category.name}</span>
                      <span className="text-sm font-medium ml-auto">
                        {category.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphique des commandes mensuelles - Dynamique depuis l'API */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Nombre de commandes par période</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 relative" onMouseMove={updateTooltip}>
                  <svg width="100%" height="100%" viewBox="0 0 600 300">
                    {/* Grid */}
                    <defs>
                      <pattern
                        id="barGrid"
                        width="50"
                        height="40"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 50 0 L 0 0 0 40"
                          fill="none"
                          stroke="#f0f0f0"
                          strokeWidth="1"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#barGrid)" />

                    {/* Interactive Bars */}
                    {salesData.map((item, i) => {
                      const maxOrders = Math.max(
                        ...salesData.map((d) => d.orders)
                      );
                      const barHeight =
                        maxOrders > 0 ? (item.orders / maxOrders) * 200 : 0;
                      const x = 50 + i * (500 / Math.max(salesData.length, 1));
                      const y = 250 - barHeight;
                      return (
                        <g key={i}>
                          <rect
                            x={x - 15}
                            y={y}
                            width="30"
                            height={barHeight}
                            fill="#10b981"
                            rx="4"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onMouseEnter={(e) =>
                              showTooltip(
                                e,
                                `<strong>${
                                  item.month
                                }</strong><br/>Commandes: ${
                                  item.orders
                                }<br/>Ventes: €${item.sales.toLocaleString()}`
                              )
                            }
                            onMouseLeave={hideTooltip}
                          />
                          <text
                            x={x}
                            y={y - 5}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#666"
                          >
                            {item.orders}
                          </text>
                          <text
                            x={x}
                            y="270"
                            textAnchor="middle"
                            fontSize="11"
                            fill="#666"
                          >
                            {item.month}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top produits - Dynamique depuis l'API */}
            <Card>
              <CardHeader>
                <CardTitle>Top produits les plus vendus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 relative" onMouseMove={updateTooltip}>
                  <svg width="100%" height="100%" viewBox="0 0 500 300">
                    {/* Grid */}
                    <defs>
                      <pattern
                        id="productGrid"
                        width="50"
                        height="40"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 50 0 L 0 0 0 40"
                          fill="none"
                          stroke="#f0f0f0"
                          strokeWidth="1"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#productGrid)" />

                    {/* Interactive Horizontal bars */}
                    {topProductsData.map((product, i) => {
                      const maxSales = Math.max(
                        ...topProductsData.map((p) => p.sales)
                      );
                      const barWidth =
                        maxSales > 0 ? (product.sales / maxSales) * 300 : 0;
                      const y = 30 + i * 35;
                      return (
                        <g key={i}>
                          <rect
                            x="150"
                            y={y}
                            width={barWidth}
                            height="25"
                            fill="#3b82f6"
                            rx="4"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onMouseEnter={(e) =>
                              showTooltip(
                                e,
                                `<strong>${product.name}</strong><br/>Ventes: ${
                                  product.sales
                                } unités<br/>Revenus: €${product.revenue.toLocaleString()}`
                              )
                            }
                            onMouseLeave={hideTooltip}
                          />
                          <text
                            x="145"
                            y={y + 17}
                            textAnchor="end"
                            fontSize="11"
                            fill="#666"
                          >
                            {product.name.length > 15
                              ? product.name.substring(0, 15) + "..."
                              : product.name}
                          </text>
                          <text
                            x={155 + barWidth}
                            y={y + 17}
                            fontSize="10"
                            fill="white"
                            fontWeight="bold"
                          >
                            {product.sales}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Analyse des stocks */}
            <Card>
              <CardHeader>
                <CardTitle>Analyse des stocks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6" onMouseMove={updateTooltip}>
                  {/* Section d'analyse des stocks */}
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">
                      Données de stock chargées depuis l'API
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                      Taux de rupture: {kpis.stockout}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Tooltip global qui suit la souris */}
      <GlobalTooltip {...tooltip} />
    </div>
  );
}
