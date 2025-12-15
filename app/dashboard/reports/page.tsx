"use client";

import type React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
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
  BarChart as BarChartIcon,
  Eye,
  RefreshCw,
  Plus,
} from "lucide-react";

// import { BarChartIcon } from "lucide-react"; // ou utilisez BarChart depuis lucide-react
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
import * as XLSX from "xlsx";
import { RoleGuard } from "../components/auth/role-guard";
import { useDetermineSympole } from "@/lib/useDetermineSympole";
import { formatCurrency } from "@/lib/formatCurency";

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

interface Warehouse {
  id: number;
  value: string;
  label: string;
  company_id: number;
  metadata?: any;
}

interface StockCategory {
  name: string;
  currentStock: number;
  minimumThreshold: number;
  color?: string;
}

interface StockData {
  totalProducts: number;
  averageStock: number;
  turnoverDays: number;
  stockoutRate: number;
  criticalAlerts: number;
  reorderAlerts: number;
  categories: StockCategory[];
  lastUpdate: string;
}

type Period = "week" | "month" | "quarter" | "year" | "custom";

const defaultData: DashboardData = {
  week: {
    sales: Array.from({ length: 7 }, (_, i) => {
      const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      return {
        month: days[i],
        sales: 0,
        orders: 0,
        profit: 0,
      };
    }),
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
    categories: [],
    topProducts: [],
  },
  quarter: {
    sales: [],
    kpis: { revenue: 0, orders: 0, clients: 0, stockout: 0 },
    categories: [],
    topProducts: [],
  },
  year: {
    sales: [],
    kpis: { revenue: 0, orders: 0, clients: 0, stockout: 0 },
    categories: [],
    topProducts: [],
  },
  custom: {
    sales: [],
    kpis: { revenue: 0, orders: 0, clients: 0, stockout: 0 },
    categories: [],
    topProducts: [],
  },
};

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

export default function ReportsPage() {
  // Déplacer TOUS les hooks ICI, à l'intérieur du composant
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("week");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{
    start?: Date;
    end?: Date;
  }>({});
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: "",
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Ajouter les hooks pour les données de stock
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);
  const [monnaie, setMonnaie] = useState("XOF");

  // Récupération de la monnaie
  useDetermineSympole(setMonnaie);

  // Composant Tooltip personnalisé pour les bar charts
  const CustomBarTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as SalesData;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Commandes:</span>
              <span className="font-medium">{item.orders}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ventes:</span>
              <span className="font-medium">
                {formatCurrency(item.sales, monnaie)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Profit:</span>
              <span className="font-medium">
                {formatCurrency(item.profit, monnaie)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Composant Tooltip personnalisé pour les produits
  const CustomProductTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const product = payload[0].payload as TopProductData;
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg min-w-[200px]">
          <p className="font-bold text-gray-800 mb-2">{product.name}</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Unités vendues:</span>
              <span className="font-semibold">
                {product.sales.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Revenus:</span>
              <span className="font-semibold">
                {formatCurrency(product.revenue, monnaie)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valeur moyenne:</span>
                <span className="font-semibold">
                  {product.revenue > 0 && product.sales > 0
                    ? formatCurrency(product.revenue / product.sales, monnaie)
                    : "0"}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const loadWarehouses = async () => {
    try {
      setWarehousesLoading(true);
      setError(null);

      console.log("🔄 Chargement des entrepôts...");
      const res = await fetch("/api/warehouses", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error(
          `Erreur ${res.status}: Impossible de charger les entrepôts`
        );
      }

      const data = await res.json();
      console.log("✅ Entrepos chargés:", data);

      if (!Array.isArray(data)) {
        throw new Error("Format de données invalide pour les entrepôts");
      }

      setWarehouses(data);

      if (data.length === 0) {
        console.warn("⚠️ Aucun entrepôt trouvé");
        toast({
          title: "Aucun entrepôt",
          description: "Aucun entrepôt n'a été trouvé pour votre entreprise",
          variant: "default",
        });
      }
    } catch (err: any) {
      console.error("❌ Erreur chargement entrepôts:", err);
      setError(err.message);
      toast({
        title: "Erreur",
        description: "Impossible de charger les entrepôts",
        variant: "destructive",
      });
    } finally {
      setWarehousesLoading(false);
    }
  };

  const fetchReportData = async () => {
    if (warehousesLoading && warehouses.length === 0) {
      console.log("⏳ Attente du chargement des entrepôts...");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        period: selectedPeriod,
        warehouse: selectedWarehouse,
      });

      if (isCustomPeriod && customDateRange.start && customDateRange.end) {
        params.append("startDate", customDateRange.start.toISOString());
        params.append("endDate", customDateRange.end.toISOString());
      }

      console.log("📤 Requête API avec params:", params.toString());

      const response = await fetch(
        `/api/dashboard/overview?${params.toString()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Erreur ${response.status}: Impossible de charger les données`
        );
      }

      const data = await response.json();
      console.log("📊 Données reçues:", data);

      setDashboardData(data);

      const warehouseName =
        selectedWarehouse === "all"
          ? "tous les entrepôts"
          : warehouses.find((w) => w.value === selectedWarehouse)?.label ||
            selectedWarehouse;

      toast({
        title: "Données chargées",
        description: `Données pour ${warehouseName}`,
      });
    } catch (err: any) {
      console.error("❌ Erreur chargement rapport:", err);
      setError(err.message);
      toast({
        title: "Erreur de chargement",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Modifiez la fonction fetchStockData dans votre page
  const fetchStockData = async () => {
    try {
      setStockLoading(true);
      setStockError(null);

      // Utiliser la vraie API de stock
      const response = await fetch(
        `/api/stock-analytics?warehouse=${selectedWarehouse}`
      );

      if (!response.ok) {
        throw new Error(
          `Erreur ${response.status}: Impossible de charger les données de stock`
        );
      }

      const stockData: StockData = await response.json();
      setStockData(stockData);
    } catch (err: any) {
      console.error("❌ Erreur chargement données stock:", err);
      setStockError(err.message);

      // Optionnel: données de secours minimales
      setStockData({
        totalProducts: 0,
        averageStock: 0,
        turnoverDays: 0,
        stockoutRate: 0,
        criticalAlerts: 0,
        reorderAlerts: 0,
        categories: [],
        lastUpdate: "N/A",
      });
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (!warehousesLoading && warehouses.length >= 0) {
      fetchReportData();
    }
  }, [
    selectedPeriod,
    selectedWarehouse,
    isCustomPeriod,
    customDateRange,
    warehousesLoading,
  ]);

  useEffect(() => {
    if (selectedWarehouse && !warehousesLoading) {
      fetchStockData();
    }
  }, [selectedWarehouse, warehousesLoading]);

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
  const handleExportPDF = async () => {
    if (!dashboardData) {
      toast({
        title: "Erreur d'export",
        description: "Aucune donnée disponible",
        variant: "destructive",
      });
      return;
    }

    const currentData = getCurrentData();
    const kpis = currentData.kpis;
    const salesData = currentData.sales;
    const categoryData = currentData.categories;
    const topProductsData = currentData.topProducts;
    const selectedWarehouseObj = warehouses.find(
      (w) => w.value === selectedWarehouse
    );

    // Récupérer le symbole de la monnaie
    const currencySymbol = formatCurrency(0, monnaie);

    // Fonction SIMPLIFIÉE pour formater les nombres
    const formatAmount = (amount: number): string => {
      if (amount === 0) {
        return currencySymbol; // Retourner juste le symbole pour 0
      }

      const fixed = Math.abs(amount).toFixed(2);
      const [integer, decimal] = fixed.split(".");

      // Formater manuellement sans espace insécable
      let result = "";
      let count = 0;

      for (let i = integer.length - 1; i >= 0; i--) {
        result = integer[i] + result;
        count++;
        if (count === 3 && i > 0) {
          result = " " + result; // ESPACE NORMAL
          count = 0;
        }
      }

      const sign = amount < 0 ? "-" : "";
      return `${sign}${result},${decimal} ${currencySymbol}`;
    };

    toast({
      title: "Export PDF en cours...",
      description: "Génération du rapport PDF",
    });

    try {
      const { jsPDF } = await import("jspdf");

      // Initialiser avec moins d'options
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Titre principal
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT STOCKPRO", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      // Informations de base
      const periodText = isCustomPeriod
        ? `Du ${customDateRange.start?.toLocaleDateString(
            "fr-FR"
          )} au ${customDateRange.end?.toLocaleDateString("fr-FR")}`
        : selectedPeriod === "week"
        ? "Cette semaine"
        : selectedPeriod === "month"
        ? "Ce mois"
        : selectedPeriod === "quarter"
        ? "Ce trimestre"
        : "Cette année";

      const warehouseText =
        selectedWarehouse === "all"
          ? "Tous les entrepôts"
          : selectedWarehouseObj?.label || selectedWarehouse;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Généré le: ${new Date().toLocaleDateString("fr-FR")}`,
        20,
        yPosition
      );
      yPosition += 6;
      doc.text(`Période: ${periodText}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Entrepôt: ${warehouseText}`, 20, yPosition);
      yPosition += 15;

      // Indicateurs clés
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("INDICATEURS CLÉS", 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      // Format KPI plus simple
      const kpiLines = [
        ["Chiffre d'affaires:", formatAmount(kpis.revenue)],
        ["Commandes:", kpis.orders.toString()],
        ["Clients actifs:", kpis.clients.toString()],
        ["Taux de rupture:", `${kpis.stockout}%`],
      ];

      kpiLines.forEach(([label, value], index) => {
        const x = index < 2 ? 20 : 120;
        const y = yPosition + (index % 2) * 8;
        doc.text(label, x, y);
        doc.setFont("helvetica", "bold");
        doc.text(value, x + (index < 2 ? 50 : 40), y);
        doc.setFont("helvetica", "normal");
      });

      yPosition += 25;

      // Données de ventes - FORMAT TABLEAU SIMPLE
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DONNÉES DE VENTES", 20, yPosition);
      yPosition += 10;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");

      // En-têtes avec devise
      doc.text("Période", 20, yPosition);
      doc.text(`Ventes (${currencySymbol})`, 60, yPosition);
      doc.text("Commandes", 110, yPosition);
      doc.text(`Profit (${currencySymbol})`, 150, yPosition);

      yPosition += 6;
      doc.line(20, yPosition, 180, yPosition);
      yPosition += 8;

      // Données
      doc.setFont("helvetica", "normal");

      // Jours dans l'ordre
      const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

      jours.forEach((jour) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }

        // Chercher les données
        const dataForDay = salesData.find((item) =>
          (item.day || item.month || "")
            .toLowerCase()
            .includes(jour.toLowerCase())
        );

        doc.text(jour, 20, yPosition);

        if (dataForDay && dataForDay.sales > 0) {
          doc.text(formatAmount(dataForDay.sales), 60, yPosition);
          doc.text(dataForDay.orders.toString(), 110, yPosition);
          doc.text(formatAmount(dataForDay.profit), 150, yPosition);
        } else {
          // Pour 0, utiliser juste le symbole
          doc.text(currencySymbol, 60, yPosition);
          doc.text("0", 110, yPosition);
          doc.text(currencySymbol, 150, yPosition);
        }

        yPosition += 7;
      });

      yPosition += 10;

      // Pied de page page 1
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Page 1 sur 2`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      });
      doc.text(
        "StockPro - Rapport généré automatiquement",
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      );

      // PAGE 2
      doc.addPage();
      yPosition = 20;

      // Top produits
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("# TOP PRODUITS", 20, yPosition);
      yPosition += 15;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Produit", 20, yPosition);
      doc.text("Ventes", 90, yPosition);
      doc.text(`Revenus (${currencySymbol})`, 130, yPosition);

      yPosition += 6;
      doc.line(20, yPosition, 180, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "normal");
      topProductsData.slice(0, 7).forEach((product) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }

        const name =
          product.name.length > 25
            ? product.name.substring(0, 25) + "..."
            : product.name;
        doc.text(name, 20, yPosition);
        doc.text(product.sales.toString(), 90, yPosition);
        doc.text(formatAmount(product.revenue), 130, yPosition);

        yPosition += 7;
      });

      yPosition += 10;

      // Catégories
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("# REPARTITION PAR CATÉGORIE", 20, yPosition);
      yPosition += 10;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Catégorie", 20, yPosition);
      doc.text("Pourcentage", 90, yPosition);
      doc.text(`Ventes (${currencySymbol})`, 130, yPosition);

      yPosition += 6;
      doc.line(20, yPosition, 180, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "normal");
      categoryData.forEach((category) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(category.name, 20, yPosition);
        doc.text(`${category.value}%`, 90, yPosition);
        doc.text(formatAmount(category.sales), 130, yPosition);

        yPosition += 7;
      });

      // Pied de page page 2
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Page 2 sur 2`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      });
      doc.text(
        "StockPro - Rapport généré automatiquement",
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      );

      // Sauvegarder
      const periodLabel =
        selectedPeriod === "week"
          ? "week"
          : selectedPeriod === "month"
          ? "month"
          : selectedPeriod === "quarter"
          ? "quarter"
          : "year";

      const warehouseLabel =
        selectedWarehouse === "all" ? "all" : selectedWarehouse;

      const fileName = `rapport-stockpro-${periodLabel}-${warehouseLabel}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);

      toast({
        title: "Export PDF réussi",
        description: "Le rapport PDF a été téléchargé",
      });
    } catch (error) {
      console.error("Erreur PDF:", error);
      toast({
        title: "Erreur d'export",
        description: "Erreur lors de la génération du PDF",
        variant: "destructive",
      });
    }
  };
  const handleExportExcel = async () => {
    if (!dashboardData) {
      toast({
        title: "Erreur d'export",
        description: "Aucune donnée disponible",
        variant: "destructive",
      });
      return;
    }

    const currentData = getCurrentData();
    const kpis = currentData.kpis;
    const salesData = currentData.sales;
    const categoryData = currentData.categories;
    const topProductsData = currentData.topProducts;
    const selectedWarehouseObj = warehouses.find(
      (w) => w.value === selectedWarehouse
    );

    toast({
      title: "Export Excel en cours...",
      description: "Génération du rapport Excel",
    });

    try {
      const wb = XLSX.utils.book_new();

      const warehouseText =
        selectedWarehouse === "all"
          ? "Tous les entrepôts"
          : selectedWarehouseObj?.label || selectedWarehouse;

      const kpiSheetData = [
        ["RAPPORT STOCKPRO - DONNÉES DASHBOARD"],
        [],
        ["Généré le", new Date().toLocaleDateString("fr-FR")],
        [
          "Période",
          isCustomPeriod
            ? `Du ${customDateRange.start?.toLocaleDateString(
                "fr-FR"
              )} au ${customDateRange.end?.toLocaleDateString("fr-FR")}`
            : selectedPeriod === "week"
            ? "Cette semaine"
            : selectedPeriod === "month"
            ? "Ce mois"
            : selectedPeriod === "quarter"
            ? "Ce trimestre"
            : "Cette année",
        ],
        ["Entrepôt", warehouseText],
        [],
        ["INDICATEURS CLÉS"],
        [`Chiffre d'affaires (${formatCurrency(0, monnaie)})`, kpis.revenue],
        ["Commandes", kpis.orders],
        ["Clients actifs", kpis.clients],
        ["Taux de rupture (%)", kpis.stockout],
      ];

      const kpiSheet = XLSX.utils.aoa_to_sheet(kpiSheetData);
      XLSX.utils.book_append_sheet(wb, kpiSheet, "Indicateurs");

      const salesSheetData = [
        [
          "Période",
          `Ventes (${formatCurrency(0, monnaie)})`,
          "Commandes",
          `Profit (${formatCurrency(0, monnaie)})`,
        ],
        ...salesData.map((item) => [
          item.month,
          item.sales,
          item.orders,
          item.profit,
        ]),
      ];

      const salesSheet = XLSX.utils.aoa_to_sheet(salesSheetData);
      XLSX.utils.book_append_sheet(wb, salesSheet, "Ventes");

      const productsSheetData = [
        [
          "Produit",
          "Unités vendues",
          `Revenus (${formatCurrency(0, monnaie)})`,
        ],
        ...topProductsData.map((product) => [
          product.name,
          product.sales,
          product.revenue,
        ]),
      ];

      const productsSheet = XLSX.utils.aoa_to_sheet(productsSheetData);
      XLSX.utils.book_append_sheet(wb, productsSheet, "Top Produits");

      const categoriesSheetData = [
        [
          "Catégorie",
          "Pourcentage (%)",
          `Ventes (${formatCurrency(0, monnaie)})`,
        ],
        ...categoryData.map((category) => [
          category.name,
          category.value,
          category.sales,
        ]),
      ];

      const categoriesSheet = XLSX.utils.aoa_to_sheet(categoriesSheetData);
      XLSX.utils.book_append_sheet(wb, categoriesSheet, "Catégories");

      const summarySheetData = [
        ["SYNTHÈSE DU RAPPORT"],
        [],
        [
          "Période analysée",
          isCustomPeriod
            ? `Du ${customDateRange.start?.toLocaleDateString(
                "fr-FR"
              )} au ${customDateRange.end?.toLocaleDateString("fr-FR")}`
            : selectedPeriod === "week"
            ? "Cette semaine"
            : selectedPeriod === "month"
            ? "Ce mois"
            : selectedPeriod === "quarter"
            ? "Ce trimestre"
            : "Cette année",
        ],
        [
          "Total des ventes",
          salesData.reduce((sum, item) => sum + item.sales, 0),
        ],
        [
          "Total des commandes",
          salesData.reduce((sum, item) => sum + item.orders, 0),
        ],
        [
          "Total des profits",
          salesData.reduce((sum, item) => sum + item.profit, 0),
        ],
        [
          "Catégorie la plus vendue",
          categoryData.length > 0 ? categoryData[0].name : "N/A",
        ],
        [
          "Produit le plus vendu",
          topProductsData.length > 0 ? topProductsData[0].name : "N/A",
        ],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Synthèse");

      const fileName = `rapport-stockpro-${selectedPeriod}-${selectedWarehouse}-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Export Excel réussi",
        description: "Le rapport XLSX a été téléchargé",
      });
    } catch (error) {
      console.error("Erreur Excel:", error);
      toast({
        title: "Erreur d'export",
        description: "Erreur lors de la génération du fichier Excel",
        variant: "destructive",
      });
    }
  };

  const handlePeriodChange = (value: Period) => {
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

  const handleWarehouseChange = (value: string) => {
    setSelectedWarehouse(value);
    const warehouseName =
      value === "all"
        ? "Tous les entrepôts"
        : warehouses.find((w) => w.value === value)?.label || value;
    toast({
      title: "Entrepôt mis à jour",
      description: `Filtrage par: ${warehouseName}`,
    });
  };

  const reloadWarehouses = async () => {
    setIsCustomPeriod(false);
    await loadWarehouses();
    toast({
      title: "Entrepôts rechargés",
      description: `Liste des entrepôts mise à jour (${warehouses.length} trouvés)`,
    });
  };

  const getCurrentData = (): PeriodData => {
    if (!dashboardData) return defaultData.week;

    if (isCustomPeriod && customDateRange.start && customDateRange.end) {
      // Si sales est vide pour custom, utiliser week à la place
      const customData = dashboardData.custom || defaultData.custom;
      if (customData.sales.length === 0) {
        return {
          ...customData,
          sales: dashboardData.week?.sales || defaultData.week.sales,
        };
      }
      return customData;
    }

    return dashboardData[selectedPeriod] || defaultData[selectedPeriod];
  };

  const currentData = getCurrentData();
  const selectedWarehouseObj = warehouses.find(
    (w) => w.value === selectedWarehouse
  );

  const salesData = currentData.sales;
  const kpis = currentData.kpis;
  const categoryData = currentData.categories;
  const topProductsData = currentData.topProducts;

  const showTooltip = (event: React.MouseEvent, content: string) => {
    setTooltip({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      content,
    });
  };

  const updateTooltip = (event: React.MouseEvent) => {
    if (tooltip.visible) {
      setTooltip((prev) => ({
        ...prev,
        x: event.clientX,
        y: event.clientY,
      }));
    }
  };

  const hideTooltip = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: "" });
  };

  if (warehousesLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Chargement des entrepôts...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && warehouses.length === 0) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-gray-600 mb-4 dark:text-gray-300">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                loadWarehouses();
              }}
              variant="outline"
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-white overflow-auto">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-auto">
          <header className="bg-white border-b border-gray-200 px-6 py-4 dark:bg-gray-900">
            <div className="flex-1 md:flex items-center justify-between w-full">
              <div className="ml-10 lg:ml-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-300">
                  Rapports
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Analyses et statistiques détaillées - Données en temps réel
                </p>
              </div>
              <div className="flex  mt-1 md:mt-1 space-x-2">
                <div className="hidden md:block">
                  <Button
                    variant="outline"
                    onClick={handleExportPDF}
                    disabled={!dashboardData || loading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exporter PDF
                  </Button>
                </div>
                <div className="hidden md:block">
                  <Button
                    variant="outline"
                    onClick={handleExportExcel}
                    disabled={!dashboardData || loading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exporter Excel
                  </Button>
                </div>
                <div className="flex justify-between w-full md:hidden">
                  <div className="md:hidden">
                    <Button
                      variant="outline"
                      onClick={handleExportPDF}
                      disabled={!dashboardData || loading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  <div className="md:hidden">
                    <Button
                      variant="outline"
                      onClick={handleExportExcel}
                      disabled={!dashboardData || loading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <Button
                    variant="outline"
                    onClick={reloadWarehouses}
                    disabled={loading}
                  >
                    <Loader2
                      className={`h-4 w-4 mr-2 ${
                        loading ? "animate-spin" : ""
                      }`}
                    />
                    {loading ? "Chargement..." : "Actualiser"}
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                      Période
                    </label>
                    <Select
                      value={selectedPeriod}
                      onValueChange={handlePeriodChange}
                      disabled={loading}
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                        Entrepôt
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={reloadWarehouses}
                        className="h-6 px-2 text-xs"
                        disabled={warehousesLoading}
                      >
                        <Loader2
                          className={`h-3 w-3 mr-1 ${
                            warehousesLoading ? "animate-spin" : ""
                          }`}
                        />
                        Actualiser
                      </Button>
                    </div>
                    <Select
                      value={selectedWarehouse}
                      onValueChange={handleWarehouseChange}
                      disabled={loading || warehousesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un entrepôt">
                          {selectedWarehouse === "all"
                            ? "Tous les entrepôts"
                            : warehouses.find(
                                (w) => w.value === selectedWarehouse
                              )?.label || "Sélectionner"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les entrepôts</SelectItem>
                        {warehouses.map((warehouse) => (
                          <SelectItem
                            key={warehouse.id}
                            value={warehouse.value}
                          >
                            {warehouse.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {warehouses.length} entrepôt(s) disponible(s)
                    </p>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-400">
                      Dates personnalisées{" "}
                      {isCustomPeriod && (
                        <span className="text-green-600 text-xs">(Actif)</span>
                      )}
                    </label>
                    <div className="overflow-auto">
                      <DatePickerRange
                        onDateChange={handleDateChange}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                  <p className="mt-4 text-gray-600 dark:text-gray-300">
                    Chargement des données pour{" "}
                    {selectedWarehouse === "all"
                      ? "tous les entrepôts"
                      : warehouses.find((w) => w.value === selectedWarehouse)
                          ?.label || selectedWarehouse}
                    ...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            Chiffre d'affaires
                          </p>
                          <p className="text-2xl font-bold">
                            {kpis.revenue
                              ? formatCurrency(kpis.revenue, monnaie)
                              : "0"}
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
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
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
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
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
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
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

                <div className="space-y-8">
                  {/* Première rangée : KPI Principaux */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Évolution des ventes et profits</CardTitle>
                          <div className="text-sm text-gray-500">
                            Période:{" "}
                            {selectedPeriod === "week"
                              ? "7 jours"
                              : selectedPeriod === "month"
                              ? "30 jours"
                              : selectedPeriod === "quarter"
                              ? "Trimestre"
                              : "Année"}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72">
                          <ResponsiveContainer>
                            <AreaChart
                              width={800}
                              height={300}
                              data={salesData}
                              margin={{
                                top: 10,
                                right: 30,
                                left: 40,
                                bottom: 0,
                              }}
                            >
                              <defs>
                                <linearGradient
                                  id="colorSales"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor="#8884d8"
                                    stopOpacity={0.8}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor="#8884d8"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="colorProfit"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor="#ffc658"
                                    stopOpacity={0.8}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor="#ffc658"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f0f0f0"
                              />
                              <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12 }}
                                padding={{ left: 10, right: 10 }}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value: number) =>
                                  `${formatCurrency(value, monnaie)}`
                                }
                                width={45}
                              />
                              <RechartsTooltip
                                formatter={(
                                  value: any,
                                  name: any,
                                  props: any
                                ) => {
                                  let displayName = "Ventes";

                                  if (props && props.dataKey === "profit") {
                                    displayName = "Profit";
                                  } else if (
                                    props &&
                                    props.dataKey === "sales"
                                  ) {
                                    displayName = "Ventes";
                                  }

                                  return [
                                    `${formatCurrency(Number(value), monnaie)}`,
                                    displayName,
                                  ];
                                }}
                                labelFormatter={(label: string) =>
                                  `Période: ${label}`
                                }
                                contentStyle={{
                                  backgroundColor: "white",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "8px",
                                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="sales"
                                stroke="#8884d8"
                                fillOpacity={1}
                                fill="url(#colorSales)"
                                name="Ventes"
                                strokeWidth={2}
                              />
                              <Area
                                type="monotone"
                                dataKey="profit"
                                stroke="#ffc658"
                                fillOpacity={1}
                                fill="url(#colorProfit)"
                                name="Profit"
                                strokeWidth={2}
                              />
                              <Legend
                                verticalAlign="top"
                                height={36}
                                formatter={(value: string) => (
                                  <span className="text-sm text-gray-600">
                                    {value}
                                  </span>
                                )}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Répartition par catégorie</CardTitle>
                      </CardHeader>
                      <CardContent className="h-72 flex flex-col">
                        {categoryData.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                              <Package className="h-12 w-12 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">
                              Aucune donnée
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              Aucune vente catégorisée
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 flex items-center justify-center">
                              <PieChart width={250} height={200}>
                                <Pie
                                  data={categoryData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={80}
                                  paddingAngle={1}
                                  dataKey="value"
                                  nameKey="name"
                                >
                                  {categoryData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={entry.color}
                                      stroke="#fff"
                                      strokeWidth={1}
                                      className="hover:opacity-90 transition-opacity cursor-pointer"
                                    />
                                  ))}
                                </Pie>
                                <RechartsTooltip
                                  formatter={(
                                    value: number,
                                    name: string,
                                    props: any
                                  ) => [`${value}%`, props.payload.name]}
                                  contentStyle={{
                                    backgroundColor: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "8px",
                                  }}
                                />
                              </PieChart>
                            </div>
                            <div className="mt-4 space-y-3">
                              {categoryData
                                .slice(0, 4)
                                .map((category, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                          backgroundColor: category.color,
                                        }}
                                      />
                                      <span className="text-sm text-gray-700 truncate max-w-[100px]">
                                        {category.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <span className="text-sm font-semibold">
                                        {category.value}%
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatCurrency(
                                          category.sales,
                                          monnaie
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Deuxième rangée : Commandes et Top Produits */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Commandes par période</CardTitle>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-[#10b981] mr-1"></div>
                              <span className="text-xs text-gray-600">
                                Commandes
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={salesData}
                              margin={{
                                top: 20,
                                right: 20,
                                left: 0,
                                bottom: 5,
                              }}
                              barSize={20}
                              barCategoryGap="40%"
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f0f0f0"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11 }}
                                padding={{ left: 10, right: 10 }}
                                interval={0}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11 }}
                              />
                              <RechartsTooltip content={<CustomBarTooltip />} />
                              <Bar
                                dataKey="orders"
                                fill="#10b981"
                                radius={[2, 2, 0, 0]}
                                name="Commandes"
                                className="cursor-pointer hover:opacity-90 transition-opacity"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Top 5 produits</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer>
                            <BarChart
                              width={600}
                              height={250}
                              data={topProductsData}
                              layout="vertical"
                              margin={{
                                top: 20,
                                right: 30,
                                left: 100,
                                bottom: 5,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f0f0f0"
                                horizontal={true}
                                vertical={false}
                              />
                              <XAxis
                                type="number"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11 }}
                              />
                              <YAxis
                                type="category"
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11 }}
                                width={90}
                                tickFormatter={(value: string) => {
                                  if (value.length > 15) {
                                    return value.substring(0, 15) + "...";
                                  }
                                  return value;
                                }}
                              />
                              <RechartsTooltip
                                content={<CustomProductTooltip />}
                              />
                              <Bar
                                dataKey="sales"
                                fill="#3b82f6"
                                radius={[0, 2, 2, 0]}
                                name="Unités vendues"
                                barSize={20}
                                className="cursor-pointer hover:opacity-90 transition-opacity"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Troisième rangée : Analyse des stocks */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Analyse des stocks</CardTitle>
                        <div className="text-sm text-gray-500">
                          Entrepôt:{" "}
                          <span className="font-medium">
                            {selectedWarehouse === "all"
                              ? "Tous les entrepôts"
                              : warehouses.find(
                                  (w) => w.value === selectedWarehouse
                                )?.label || selectedWarehouse}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Loading state */}
                      {stockLoading ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
                              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                              <div className="h-8 bg-gray-200 rounded w-1/4 mb-3"></div>
                              <div className="space-y-2">
                                <div className="h-3 bg-gray-200 rounded"></div>
                                <div className="h-3 bg-gray-200 rounded"></div>
                                <div className="h-3 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          </div>
                          <div className="lg:col-span-2">
                            <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
                          </div>
                        </div>
                      ) : stockError ? (
                        <div className="text-center py-8">
                          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                          <p className="text-red-600 font-medium mb-2">
                            Erreur de chargement des données
                          </p>
                          <p className="text-sm text-gray-500 mb-4">
                            {stockError}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchStockData()}
                            className="gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Réessayer
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Section des indicateurs */}
                          <div className="space-y-4">
                            {/* Performance Stock */}
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-blue-800">
                                  Performance Stock
                                </h3>
                                <Package className="h-5 w-5 text-blue-600" />
                              </div>

                              {/* Taux de rotation */}
                              <div className="mb-4">
                                <div className="flex items-end justify-between">
                                  <div>
                                    <p className="text-sm text-blue-700 mb-1">
                                      Rotation moyenne
                                    </p>
                                    <p className="text-2xl font-bold text-blue-800">
                                      {stockData?.turnoverDays || 0} jours
                                    </p>
                                  </div>
                                  <div
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      (stockData?.turnoverDays || 0) > 120
                                        ? "bg-red-100 text-red-800"
                                        : (stockData?.turnoverDays || 0) > 90
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {(stockData?.turnoverDays || 0) > 120
                                      ? "Lent"
                                      : (stockData?.turnoverDays || 0) > 90
                                      ? "Moyen"
                                      : "Rapide"}
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-blue-600">
                                  {stockData?.metrics?.soldLast30Days || 0}{" "}
                                  ventes sur 30 jours (
                                  {stockData?.metrics?.dailySales?.toFixed(1) ||
                                    0}
                                  /jour)
                                </div>
                              </div>

                              {/* Autres indicateurs */}
                              <div className="space-y-3 pt-3 border-t border-blue-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-blue-700">
                                    Stock total
                                  </span>
                                  <span className="font-semibold text-blue-800">
                                    {stockData?.metrics?.grandTotalStock?.toLocaleString() ||
                                      "0"}{" "}
                                    unités
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-blue-700">
                                    Prix moyen
                                  </span>
                                  <span className="font-semibold text-blue-800">
                                    {stockData?.categories?.[0]?.avgPrice
                                      ? `${formatCurrency(
                                          stockData.categories[0].avgPrice,
                                          monnaie
                                        )}`
                                      : "N/A"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-blue-700">
                                    Produits actifs
                                  </span>
                                  <span className="font-semibold text-blue-800">
                                    {stockData?.totalProducts || "0"} modèles
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Ventes récentes */}
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <h4 className="font-medium text-gray-700 mb-3">
                                Ventes récentes
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                                  <span className="text-sm text-green-700">
                                    30 derniers jours
                                  </span>
                                  <span className="font-semibold text-green-800">
                                    {stockData?.metrics?.soldLast30Days || 0}{" "}
                                    unités
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                                  <span className="text-sm text-blue-700">
                                    Taux journalier
                                  </span>
                                  <span className="font-semibold text-blue-800">
                                    {stockData?.metrics?.dailySales?.toFixed(
                                      2
                                    ) || "0"}{" "}
                                    unités/jour
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                  Rotation optimale:{" "}
                                  {stockData?.turnoverDays || 0} jours
                                </div>
                              </div>
                            </div>

                            {/* Santé du stock */}
                            <div className="p-4 bg-white rounded-lg border border-gray-200">
                              <h4 className="font-medium text-gray-700 mb-3">
                                Santé du stock
                              </h4>
                              <div className="space-y-3">
                                {/* Taux de rupture */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600">
                                      Taux de rupture
                                    </span>
                                    <span
                                      className={`text-sm font-medium ${
                                        (stockData?.stockoutRate || 0) > 10
                                          ? "text-red-600"
                                          : (stockData?.stockoutRate || 0) > 5
                                          ? "text-yellow-600"
                                          : "text-green-600"
                                      }`}
                                    >
                                      {stockData?.stockoutRate?.toFixed(1) || 0}
                                      %
                                    </span>
                                  </div>
                                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        (stockData?.stockoutRate || 0) > 10
                                          ? "bg-red-500"
                                          : (stockData?.stockoutRate || 0) > 5
                                          ? "bg-yellow-500"
                                          : "bg-green-500"
                                      }`}
                                      style={{
                                        width: `${Math.min(
                                          stockData?.stockoutRate || 0,
                                          100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Alertes */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                                    <span className="text-sm text-red-700">
                                      Stock critique
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 h-5">
                                      {stockData?.criticalAlerts || 0}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                                    <span className="text-sm text-yellow-700">
                                      À réapprovisionner
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 h-5">
                                      {stockData?.reorderAlerts || 0}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Section du graphique */}
                          <div className="lg:col-span-2">
                            {stockData?.categories?.length > 0 ? (
                              <>
                                <div className="h-64">
                                  <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                  >
                                    <BarChart
                                      data={stockData.categories.map((cat) => ({
                                        category: cat.name,
                                        stock: cat.currentStock,
                                        seuil: cat.minimumThreshold,
                                        color: cat.color || "#8b5cf6",
                                      }))}
                                      margin={{
                                        top: 20,
                                        right: 30,
                                        left: 20,
                                        bottom: 20,
                                      }}
                                    >
                                      <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#f0f0f0"
                                        vertical={false}
                                      />
                                      <XAxis
                                        dataKey="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12 }}
                                        interval={0}
                                      />
                                      <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12 }}
                                      />
                                      <Tooltip
                                        formatter={(value, name) => {
                                          const label =
                                            name === "stock"
                                              ? "Stock actuel"
                                              : "Seuil minimum";
                                          return [`${value} unités`, label];
                                        }}
                                        labelFormatter={(label) =>
                                          `Catégorie: ${label}`
                                        }
                                        contentStyle={{
                                          backgroundColor: "white",
                                          border: "1px solid #e5e7eb",
                                          borderRadius: "8px",
                                          boxShadow:
                                            "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                        }}
                                      />
                                      <Legend
                                        verticalAlign="top"
                                        height={36}
                                        formatter={(value) => (
                                          <span className="text-sm text-gray-600">
                                            {value === "stock"
                                              ? "Stock actuel"
                                              : "Seuil minimum"}
                                          </span>
                                        )}
                                      />
                                      <Bar
                                        dataKey="seuil"
                                        fill="#fbbf24"
                                        name="Seuil"
                                        radius={[4, 4, 0, 0]}
                                        opacity={0.8}
                                      />
                                      <Bar
                                        dataKey="stock"
                                        fill="#8b5cf6"
                                        name="Stock"
                                        radius={[4, 4, 0, 0]}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>

                                {/* Résumé sous le graphique */}
                                <div className="mt-6 pt-4 border-t border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium text-gray-700 mb-2">
                                        Résumé par catégorie
                                      </h4>
                                      <div className="space-y-2">
                                        {stockData.categories.map((cat) => (
                                          <div
                                            key={cat.name}
                                            className="flex items-center justify-between"
                                          >
                                            <div className="flex items-center gap-2">
                                              <div
                                                className="w-3 h-3 rounded-full"
                                                style={{
                                                  backgroundColor: cat.color,
                                                }}
                                              />
                                              <span className="text-sm text-gray-600">
                                                {cat.name}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                              <span className="text-sm font-medium">
                                                {cat.currentStock} unités
                                              </span>
                                              <span
                                                className={`text-xs px-2 py-1 rounded ${
                                                  cat.currentStock <
                                                  cat.minimumThreshold
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-green-100 text-green-800"
                                                }`}
                                              >
                                                Seuil: {cat.minimumThreshold}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <div>
                                        <p className="text-sm text-gray-600 mb-1">
                                          <span className="font-medium">
                                            {
                                              stockData.categories.filter(
                                                (cat) =>
                                                  cat.currentStock <
                                                  cat.minimumThreshold
                                              ).length
                                            }{" "}
                                            catégorie(s)
                                          </span>{" "}
                                          sous le seuil
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          Dernière mise à jour:{" "}
                                          {stockData.lastUpdate || "N/A"}
                                        </p>
                                      </div>

                                      <div className="flex items-center justify-between pt-2 border-t">
                                        <div>
                                          <p className="text-sm font-medium text-gray-700">
                                            Recommandations
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {stockData.turnoverDays > 90
                                              ? "Considérer des promotions pour accélérer la rotation"
                                              : stockData.turnoverDays < 60
                                              ? "Vérifier l'approvisionnement pour éviter les ruptures"
                                              : "Rotation optimale - maintenir le niveau de stock"}
                                          </p>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="gap-2"
                                        >
                                          <Eye className="h-4 w-4" />
                                          Détails
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="h-64 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
                                <BarChartIcon className="h-12 w-12 text-gray-400 mb-3" />
                                <p className="text-gray-500 font-medium">
                                  Données de stock en cours d'analyse
                                </p>
                                <p className="text-sm text-gray-400 mt-1 text-center max-w-md">
                                  Les données détaillées par catégorie seront
                                  disponibles une fois que vous aurez diversifié
                                  votre gamme de produits
                                </p>
                                <div className="mt-4 flex gap-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchStockData()}
                                    className="gap-2"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Actualiser
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-2"
                                    asChild
                                  >
                                    <a href="/products">
                                      <Plus className="h-4 w-4" />
                                      Ajouter produits
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </main>
        </div>

        <GlobalTooltip {...tooltip} />
      </div>
    </RoleGuard>
  );
}
