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

import { useState } from "react";
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerRange } from "@/components/date-picker-range";
import { toast } from "@/hooks/use-toast";

// Données pour différentes périodes
const dataByPeriod = {
  week: {
    sales: [
      { month: "Lun", sales: 12000, orders: 34, profit: 3200 },
      { month: "Mar", sales: 15000, orders: 42, profit: 4500 },
      { month: "Mer", sales: 18000, orders: 51, profit: 5400 },
      { month: "Jeu", sales: 14000, orders: 39, profit: 4200 },
      { month: "Ven", sales: 22000, orders: 62, profit: 6600 },
      { month: "Sam", sales: 25000, orders: 71, profit: 7500 },
      { month: "Dim", sales: 16000, orders: 45, profit: 4800 },
    ],
    kpis: { revenue: 122000, orders: 344, clients: 89, stockout: 1.2 },
    categories: [
      { name: "Électronique", value: 40, sales: 48800, color: "#3b82f6" },
      { name: "Vêtements", value: 25, sales: 30500, color: "#10b981" },
      { name: "Maison & Jardin", value: 20, sales: 24400, color: "#f59e0b" },
      { name: "Sport & Loisirs", value: 15, sales: 18300, color: "#ef4444" },
    ],
    topProducts: [
      { name: "iPhone 15 Pro", sales: 45, revenue: 53550 },
      { name: "MacBook Air M2", sales: 32, revenue: 48000 },
      { name: "Dell XPS 13", sales: 28, revenue: 36400 },
      { name: "Samsung Galaxy S23", sales: 23, revenue: 20700 },
      { name: "iPad Air", sales: 19, revenue: 15200 },
      { name: "AirPods Pro", sales: 16, revenue: 4800 },
      { name: "Surface Pro 9", sales: 14, revenue: 16800 },
    ],
  },
  month: {
    sales: [
      { month: "Jan", sales: 45000, orders: 124, profit: 12000 },
      { month: "Fév", sales: 52000, orders: 145, profit: 15600 },
      { month: "Mar", sales: 48000, orders: 132, profit: 14400 },
      { month: "Avr", sales: 61000, orders: 167, profit: 18300 },
      { month: "Mai", sales: 55000, orders: 151, profit: 16500 },
      { month: "Jun", sales: 67000, orders: 189, profit: 20100 },
      { month: "Jul", sales: 72000, orders: 203, profit: 21600 },
      { month: "Aoû", sales: 69000, orders: 195, profit: 20700 },
      { month: "Sep", sales: 58000, orders: 164, profit: 17400 },
      { month: "Oct", sales: 63000, orders: 178, profit: 18900 },
      { month: "Nov", sales: 71000, orders: 201, profit: 21300 },
      { month: "Déc", sales: 78000, orders: 220, profit: 23400 },
    ],
    kpis: { revenue: 720000, orders: 2069, clients: 1234, stockout: 2.8 },
    categories: [
      { name: "Électronique", value: 35, sales: 245000, color: "#3b82f6" },
      { name: "Vêtements", value: 28, sales: 196000, color: "#10b981" },
      { name: "Maison & Jardin", value: 22, sales: 154000, color: "#f59e0b" },
      { name: "Sport & Loisirs", value: 15, sales: 105000, color: "#ef4444" },
    ],
    topProducts: [
      { name: "iPhone 15 Pro", sales: 1250, revenue: 1487500 },
      { name: "MacBook Air M2", sales: 890, revenue: 1334400 },
      { name: "Dell XPS 13", sales: 756, revenue: 982800 },
      { name: "Samsung Galaxy S23", sales: 634, revenue: 570600 },
      { name: "iPad Air", sales: 523, revenue: 418400 },
      { name: "AirPods Pro", sales: 445, revenue: 133500 },
      { name: "Surface Pro 9", sales: 387, revenue: 464400 },
    ],
  },
  quarter: {
    sales: [
      { month: "Q1", sales: 145000, orders: 401, profit: 42000 },
      { month: "Q2", sales: 183000, orders: 507, profit: 54900 },
      { month: "Q3", sales: 199000, orders: 562, profit: 59700 },
      { month: "Q4", sales: 212000, orders: 599, profit: 63600 },
    ],
    kpis: { revenue: 739000, orders: 2069, clients: 1456, stockout: 2.1 },
    categories: [
      { name: "Électronique", value: 38, sales: 280620, color: "#3b82f6" },
      { name: "Vêtements", value: 26, sales: 192140, color: "#10b981" },
      { name: "Maison & Jardin", value: 21, sales: 155190, color: "#f59e0b" },
      { name: "Sport & Loisirs", value: 15, sales: 110850, color: "#ef4444" },
    ],
    topProducts: [
      { name: "iPhone 15 Pro", sales: 3200, revenue: 3808000 },
      { name: "MacBook Air M2", sales: 2340, revenue: 3510000 },
      { name: "Dell XPS 13", sales: 1980, revenue: 2574000 },
      { name: "Samsung Galaxy S23", sales: 1650, revenue: 1485000 },
      { name: "iPad Air", sales: 1380, revenue: 1104000 },
      { name: "AirPods Pro", sales: 1150, revenue: 345000 },
      { name: "Surface Pro 9", sales: 980, revenue: 1176000 },
    ],
  },
  year: {
    sales: [
      { month: "2020", sales: 580000, orders: 1650, profit: 174000 },
      { month: "2021", sales: 620000, orders: 1780, profit: 186000 },
      { month: "2022", sales: 680000, orders: 1920, profit: 204000 },
      { month: "2023", sales: 720000, orders: 2069, profit: 220200 },
    ],
    kpis: { revenue: 720000, orders: 2069, clients: 1234, stockout: 2.8 },
    categories: [
      { name: "Électronique", value: 33, sales: 237600, color: "#3b82f6" },
      { name: "Vêtements", value: 29, sales: 208800, color: "#10b981" },
      { name: "Maison & Jardin", value: 23, sales: 165600, color: "#f59e0b" },
      { name: "Sport & Loisirs", value: 15, sales: 108000, color: "#ef4444" },
    ],
    topProducts: [
      { name: "iPhone 15 Pro", sales: 4800, revenue: 5712000 },
      { name: "MacBook Air M2", sales: 3560, revenue: 5340000 },
      { name: "Dell XPS 13", sales: 2890, revenue: 3757000 },
      { name: "Samsung Galaxy S23", sales: 2450, revenue: 2205000 },
      { name: "iPad Air", sales: 2100, revenue: 1680000 },
      { name: "AirPods Pro", sales: 1780, revenue: 534000 },
      { name: "Surface Pro 9", sales: 1520, revenue: 1824000 },
    ],
  },
  custom: {
    sales: [
      { month: "Période 1", sales: 35000, orders: 98, profit: 9800 },
      { month: "Période 2", sales: 42000, orders: 118, profit: 12600 },
      { month: "Période 3", sales: 38000, orders: 107, profit: 11400 },
      { month: "Période 4", sales: 51000, orders: 143, profit: 15300 },
      { month: "Période 5", sales: 47000, orders: 132, profit: 14100 },
    ],
    kpis: { revenue: 213000, orders: 598, clients: 387, stockout: 3.2 },
    categories: [
      { name: "Électronique", value: 32, sales: 68160, color: "#3b82f6" },
      { name: "Vêtements", value: 30, sales: 63900, color: "#10b981" },
      { name: "Maison & Jardin", value: 25, sales: 53250, color: "#f59e0b" },
      { name: "Sport & Loisirs", value: 13, sales: 27690, color: "#ef4444" },
    ],
    topProducts: [
      { name: "iPhone 15 Pro", sales: 380, revenue: 452400 },
      { name: "MacBook Air M2", sales: 270, revenue: 405000 },
      { name: "Dell XPS 13", sales: 230, revenue: 299000 },
      { name: "Samsung Galaxy S23", sales: 195, revenue: 175500 },
      { name: "iPad Air", sales: 160, revenue: 128000 },
      { name: "AirPods Pro", sales: 135, revenue: 40500 },
      { name: "Surface Pro 9", sales: 118, revenue: 141600 },
    ],
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

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [customDateRange, setCustomDateRange] = useState<{
    start?: Date;
    end?: Date;
  }>({});
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: "",
  });

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
  const getCurrentData = () => {
    if (isCustomPeriod && customDateRange.start && customDateRange.end) {
      return dataByPeriod.custom;
    }
    return dataByPeriod[selectedPeriod as keyof typeof dataByPeriod];
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

  // Appliquer les filtres aux catégories (CORRIGÉ)
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

  // Fonction pour exporter en PDF (CORRIGÉ - Vrai PDF)
  const handleExportPDF = async () => {
    toast({
      title: "Export PDF en cours...",
      description: "Génération du rapport PDF avec les données actuelles",
    });

    try {
      // Import dynamique de jsPDF
      const { jsPDF } = await import("jspdf");

      // Créer une nouvelle instance PDF
      const doc = new jsPDF();

      // Configuration
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Titre principal
      doc.setFontSize(20);
      doc.setFont(undefined, "bold");
      doc.text("RAPPORT STOCKPRO", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 15;

      // Informations générales
      doc.setFontSize(12);
      doc.setFont(undefined, "normal");
      const periodText = isCustomPeriod
        ? `Du ${customDateRange.start?.toLocaleDateString(
            "fr-FR"
          )} au ${customDateRange.end?.toLocaleDateString("fr-FR")}`
        : selectedPeriod;

      doc.text(
        `Généré le: ${new Date().toLocaleDateString("fr-FR")}`,
        20,
        yPosition
      );
      yPosition += 8;
      doc.text(`Période: ${periodText}`, 20, yPosition);
      yPosition += 8;
      doc.text(
        `Entrepôt: ${
          dataByWarehouse[selectedWarehouse as keyof typeof dataByWarehouse]
            .name
        }`,
        20,
        yPosition
      );
      yPosition += 20;

      // Section KPIs
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("INDICATEURS CLÉS", 20, yPosition);
      yPosition += 15;

      doc.setFontSize(11);
      doc.setFont(undefined, "normal");

      // KPIs en colonnes
      const kpiData = [
        ["Chiffre d'affaires", `€${kpis.revenue.toLocaleString()}`],
        ["Commandes", kpis.orders.toLocaleString()],
        ["Clients actifs", kpis.clients.toLocaleString()],
        ["Taux de rupture", `${kpis.stockout}%`],
      ];

      kpiData.forEach(([label, value], index) => {
        const x = 20 + (index % 2) * 90;
        const y = yPosition + Math.floor(index / 2) * 15;
        doc.text(`${label}:`, x, y);
        doc.setFont(undefined, "bold");
        doc.text(value, x + 60, y);
        doc.setFont(undefined, "normal");
      });
      yPosition += 40;

      // Section Données de ventes
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("DONNÉES DE VENTES", 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text("Période", 20, yPosition);
      doc.text("Ventes", 60, yPosition);
      doc.text("Commandes", 100, yPosition);
      doc.text("Profit", 140, yPosition);
      yPosition += 8;

      // Ligne de séparation
      doc.line(20, yPosition, 180, yPosition);
      yPosition += 5;

      doc.setFont(undefined, "normal");
      salesData.forEach((item) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(item.month, 20, yPosition);
        doc.text(`€${item.sales.toLocaleString()}`, 60, yPosition);
        doc.text(item.orders.toString(), 100, yPosition);
        doc.text(`€${item.profit.toLocaleString()}`, 140, yPosition);
        yPosition += 8;
      });
      yPosition += 15;

      // Section Top Produits
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("TOP PRODUITS", 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text("Produit", 20, yPosition);
      doc.text("Ventes", 120, yPosition);
      doc.text("Revenus", 150, yPosition);
      yPosition += 8;

      doc.line(20, yPosition, 180, yPosition);
      yPosition += 5;

      doc.setFont(undefined, "normal");
      topProductsData.slice(0, 7).forEach((product) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
        const productName =
          product.name.length > 25
            ? product.name.substring(0, 25) + "..."
            : product.name;
        doc.text(productName, 20, yPosition);
        doc.text(product.sales.toString(), 120, yPosition);
        doc.text(`€${product.revenue.toLocaleString()}`, 150, yPosition);
        yPosition += 8;
      });
      yPosition += 15;

      // Section Catégories
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("RÉPARTITION PAR CATÉGORIE", 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text("Catégorie", 20, yPosition);
      doc.text("Pourcentage", 100, yPosition);
      doc.text("Ventes", 140, yPosition);
      yPosition += 8;

      doc.line(20, yPosition, 180, yPosition);
      yPosition += 5;

      doc.setFont(undefined, "normal");
      categoryData.forEach((category) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(category.name, 20, yPosition);
        doc.text(`${category.value}%`, 100, yPosition);
        doc.text(`€${category.sales.toLocaleString()}`, 140, yPosition);
        yPosition += 8;
      });

      // Pied de page sur toutes les pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        doc.text(
          `Page ${i} sur ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
        doc.text(
          "StockPro - Rapport généré automatiquement",
          pageWidth / 2,
          pageHeight - 5,
          { align: "center" }
        );
      }

      // Sauvegarder le PDF
      const fileName = `rapport-stockpro-${selectedPeriod}-${selectedWarehouse}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);

      toast({
        title: "Export PDF réussi",
        description: "Le rapport PDF a été téléchargé avec succès.",
      });
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast({
        title: "Erreur d'export",
        description:
          "Une erreur est survenue lors de la génération du PDF. Vérifiez que jsPDF est disponible.",
        variant: "destructive",
      });
    }
  };

  // Fonction pour exporter en Excel
  const handleExportExcel = () => {
    toast({
      title: "Export Excel en cours...",
      description: "Génération du rapport Excel avec les données actuelles",
    });

    setTimeout(() => {
      const periodText = isCustomPeriod
        ? `Du ${customDateRange.start?.toLocaleDateString(
            "fr-FR"
          )} au ${customDateRange.end?.toLocaleDateString("fr-FR")}`
        : selectedPeriod;

      let csvContent = "Rapport StockPro\n";
      csvContent += `Généré le,${new Date().toLocaleDateString("fr-FR")}\n`;
      csvContent += `Période,${periodText}\n`;
      csvContent += `Entrepôt,${
        dataByWarehouse[selectedWarehouse as keyof typeof dataByWarehouse].name
      }\n\n`;

      csvContent += "INDICATEURS CLÉS\n";
      csvContent += `Chiffre d'affaires,€${kpis.revenue.toLocaleString()}\n`;
      csvContent += `Commandes,${kpis.orders.toLocaleString()}\n`;
      csvContent += `Clients actifs,${kpis.clients.toLocaleString()}\n`;
      csvContent += `Taux de rupture,${kpis.stockout}%\n\n`;

      csvContent += "DONNÉES DE VENTES\n";
      csvContent += "Période,Ventes,Commandes,Profit\n";
      salesData.forEach((item) => {
        csvContent += `${item.month},${item.sales},${item.orders},${item.profit}\n`;
      });

      csvContent += "\nTOP PRODUITS\n";
      csvContent += "Produit,Ventes,Revenus\n";
      topProductsData.forEach((product) => {
        csvContent += `${product.name},${product.sales},${product.revenue}\n`;
      });

      csvContent += "\nCATÉGORIES\n";
      csvContent += "Catégorie,Pourcentage,Ventes\n";
      categoryData.forEach((category) => {
        csvContent += `${category.name},${category.value}%,${category.sales}\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `donnees-stockpro-${selectedPeriod}-${selectedWarehouse}-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Excel réussi",
        description: "Le rapport Excel a été téléchargé avec succès.",
      });
    }, 2000);
  };

  // Fonction pour gérer le changement de période
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    setIsCustomPeriod(false); // Désactiver les dates personnalisées
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

  const data = [
    {
      name: "Page A",
      uv: 4000,
      pv: 2400,
      amt: 2400,
    },
    {
      name: "Page B",
      uv: 3000,
      pv: 1398,
      amt: 2210,
    },
    {
      name: "Page C",
      uv: 2000,
      pv: 9800,
      amt: 2290,
    },
    {
      name: "Page D",
      uv: 2780,
      pv: 3908,
      amt: 2000,
    },
    {
      name: "Page E",
      uv: 1890,
      pv: 4800,
      amt: 2181,
    },
    {
      name: "Page F",
      uv: 2390,
      pv: 3800,
      amt: 2500,
    },
    {
      name: "Page G",
      uv: 3490,
      pv: 4300,
      amt: 2100,
    },
  ];

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
                Analyses et statistiques détaillées
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

          {/* KPI Cards - Maintenant dynamiques */}
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
                      +12.5% vs période précédente
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
                      +8.3% vs période précédente
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
                      +15.2% vs période précédente
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
                      -0.5% vs période précédente
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

            {/* Répartition par catégorie - Maintenant dynamique avec entrepôt */}
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
                    {/* Électronique */}
                    <path
                      d="M 140 140 L 140 60 A 80 80 0 0 1 209.28 100.72 Z"
                      fill={categoryData[0].color}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onMouseEnter={(e) =>
                        showTooltip(
                          e,
                          `<strong>${categoryData[0].name}</strong><br/>${
                            categoryData[0].value
                          }% des ventes<br/>€${categoryData[0].sales.toLocaleString()} de CA<br/>Entrepôt: ${
                            dataByWarehouse[
                              selectedWarehouse as keyof typeof dataByWarehouse
                            ].name
                          }`
                        )
                      }
                      onMouseLeave={hideTooltip}
                    />
                    {/* Vêtements */}
                    <path
                      d="M 140 140 L 209.28 100.72 A 80 80 0 0 1 209.28 179.28 Z"
                      fill={categoryData[1].color}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onMouseEnter={(e) =>
                        showTooltip(
                          e,
                          `<strong>${categoryData[1].name}</strong><br/>${
                            categoryData[1].value
                          }% des ventes<br/>€${categoryData[1].sales.toLocaleString()} de CA<br/>Entrepôt: ${
                            dataByWarehouse[
                              selectedWarehouse as keyof typeof dataByWarehouse
                            ].name
                          }`
                        )
                      }
                      onMouseLeave={hideTooltip}
                    />
                    {/* Maison & Jardin */}
                    <path
                      d="M 140 140 L 209.28 179.28 A 80 80 0 0 1 100.72 209.28 Z"
                      fill={categoryData[2].color}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onMouseEnter={(e) =>
                        showTooltip(
                          e,
                          `<strong>${categoryData[2].name}</strong><br/>${
                            categoryData[2].value
                          }% des ventes<br/>€${categoryData[2].sales.toLocaleString()} de CA<br/>Entrepôt: ${
                            dataByWarehouse[
                              selectedWarehouse as keyof typeof dataByWarehouse
                            ].name
                          }`
                        )
                      }
                      onMouseLeave={hideTooltip}
                    />
                    {/* Sport & Loisirs */}
                    <path
                      d="M 140 140 L 100.72 209.28 A 80 80 0 0 1 140 60 Z"
                      fill={categoryData[3].color}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onMouseEnter={(e) =>
                        showTooltip(
                          e,
                          `<strong>${categoryData[3].name}</strong><br/>${
                            categoryData[3].value
                          }% des ventes<br/>€${categoryData[3].sales.toLocaleString()} de CA<br/>Entrepôt: ${
                            dataByWarehouse[
                              selectedWarehouse as keyof typeof dataByWarehouse
                            ].name
                          }`
                        )
                      }
                      onMouseLeave={hideTooltip}
                    />

                    {/* Labels dynamiques */}
                    <text
                      x="170"
                      y="85"
                      fontSize="12"
                      fill="white"
                      fontWeight="bold"
                    >
                      {categoryData[0].value}%
                    </text>
                    <text
                      x="190"
                      y="140"
                      fontSize="12"
                      fill="white"
                      fontWeight="bold"
                    >
                      {categoryData[1].value}%
                    </text>
                    <text
                      x="140"
                      y="195"
                      fontSize="12"
                      fill="white"
                      fontWeight="bold"
                    >
                      {categoryData[2].value}%
                    </text>
                    <text
                      x="110"
                      y="140"
                      fontSize="12"
                      fill="white"
                      fontWeight="bold"
                    >
                      {categoryData[3].value}%
                    </text>
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

          {/* Graphique des commandes mensuelles - Maintenant dynamique */}
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
                      const barHeight = (item.orders / maxOrders) * 200;
                      const x = 50 + i * (500 / salesData.length);
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
                                }<br/>Ventes: €${item.sales.toLocaleString()}<br/>Panier moyen: €${Math.round(
                                  item.sales / item.orders
                                )}`
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

                    {/* Y-axis labels */}
                    {[0, 50, 100, 150, 200, 250].map((value, i) => (
                      <text
                        key={i}
                        x="30"
                        y={250 - i * 40}
                        textAnchor="end"
                        fontSize="10"
                        fill="#666"
                      >
                        {value}
                      </text>
                    ))}
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top produits - Maintenant dynamique */}
            <Card>
              <CardHeader>
                <CardTitle>Top 7 des produits les plus vendus</CardTitle>
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
                      const barWidth = (product.sales / maxSales) * 300;
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
                                } unités<br/>Revenus: €${product.revenue.toLocaleString()}<br/>Prix moyen: €${Math.round(
                                  product.revenue / product.sales
                                )}`
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

            {/* Analyse des stocks - Maintenant dynamique */}
            <Card>
              <CardHeader>
                <CardTitle>Analyse des stocks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6" onMouseMove={updateTooltip}>
                  <div
                    className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                    onMouseEnter={(e) =>
                      showTooltip(
                        e,
                        `<strong>Stock Optimal</strong><br/>${Math.round(
                          1156 * warehouseMultiplier
                        )} produits en stock<br/>Valeur: €${Math.round(
                          2340000 * warehouseMultiplier
                        ).toLocaleString()}<br/>Rotation: 4.2x par an`
                      )
                    }
                    onMouseLeave={hideTooltip}
                  >
                    <div>
                      <p className="font-medium text-green-800">
                        Stock optimal
                      </p>
                      <p className="text-sm text-green-600">
                        {Math.round(1156 * warehouseMultiplier)} produits
                      </p>
                    </div>
                    <div className="text-3xl font-bold text-green-600">78%</div>
                  </div>
                  <div
                    className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors"
                    onMouseEnter={(e) =>
                      showTooltip(
                        e,
                        `<strong>Stock Faible</strong><br/>${Math.round(
                          45 * warehouseMultiplier
                        )} produits en stock faible<br/>Valeur: €${Math.round(
                          89000 * warehouseMultiplier
                        ).toLocaleString()}<br/>Réapprovisionnement nécessaire`
                      )
                    }
                    onMouseLeave={hideTooltip}
                  >
                    <div>
                      <p className="font-medium text-orange-800">
                        Stock faible
                      </p>
                      <p className="text-sm text-orange-600">
                        {Math.round(45 * warehouseMultiplier)} produits
                      </p>
                    </div>
                    <div className="text-3xl font-bold text-orange-600">
                      15%
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                    onMouseEnter={(e) =>
                      showTooltip(
                        e,
                        `<strong>Rupture de Stock</strong><br/>${Math.round(
                          33 * warehouseMultiplier
                        )} produits en rupture<br/>Perte estimée: €${Math.round(
                          45000 * warehouseMultiplier
                        ).toLocaleString()}<br/>Action urgente requise`
                      )
                    }
                    onMouseLeave={hideTooltip}
                  >
                    <div>
                      <p className="font-medium text-red-800">
                        Rupture de stock
                      </p>
                      <p className="text-sm text-red-600">
                        {Math.round(33 * warehouseMultiplier)} produits
                      </p>
                    </div>
                    <div className="text-3xl font-bold text-red-600">7%</div>
                  </div>

                  {/* Graphique en barres pour les stocks */}
                  <div className="mt-6 relative">
                    <h4 className="font-medium mb-3">Répartition visuelle</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-20 text-sm">Optimal</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2 cursor-pointer hover:bg-green-600 transition-colors"
                            style={{ width: "78%" }}
                            onMouseEnter={(e) =>
                              showTooltip(
                                e,
                                `<strong>Stock Optimal</strong><br/>78% des produits<br/>${Math.round(
                                  1156 * warehouseMultiplier
                                )} références<br/>Valeur totale: €${Math.round(
                                  2340000 * warehouseMultiplier
                                ).toLocaleString()}`
                              )
                            }
                            onMouseLeave={hideTooltip}
                          >
                            <span className="text-white text-xs font-medium">
                              78%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 text-sm">Faible</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-orange-500 h-6 rounded-full flex items-center justify-end pr-2 cursor-pointer hover:bg-orange-600 transition-colors"
                            style={{ width: "15%" }}
                            onMouseEnter={(e) =>
                              showTooltip(
                                e,
                                `<strong>Stock Faible</strong><br/>15% des produits<br/>${Math.round(
                                  45 * warehouseMultiplier
                                )} références<br/>Réapprovisionnement requis`
                              )
                            }
                            onMouseLeave={hideTooltip}
                          >
                            <span className="text-white text-xs font-medium">
                              15%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 text-sm">Rupture</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-red-500 h-6 rounded-full flex items-center justify-end pr-2 cursor-pointer hover:bg-red-600 transition-colors"
                            style={{ width: "7%" }}
                            onMouseEnter={(e) =>
                              showTooltip(
                                e,
                                `<strong>Rupture de Stock</strong><br/>7% des produits<br/>${Math.round(
                                  33 * warehouseMultiplier
                                )} références<br/>Action urgente nécessaire`
                              )
                            }
                            onMouseLeave={hideTooltip}
                          >
                            <span className="text-white text-xs font-medium">
                              7%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
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
