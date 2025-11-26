"use client";
import { useEffect, useState } from "react";
import {
  Bell,
  Search,
  User,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/app/dashboard/components/ui/input";
import { Button } from "@/app/dashboard/components/ui/button";
import { Badge } from "@/app/dashboard/components/ui/badge";
import { Sidebar } from "@/app/dashboard/components/sidebar";
import { StatsCards } from "@/app/dashboard/components/stats-cards";
import { SalesChart } from "@/app/dashboard/components/sales-chart";
import { TopProductsChart } from "@/app/dashboard/components/top-products-chart";
import { StockAlerts } from "@/app/dashboard/components/stock-alerts";
import { Alert, AlertDescription } from "@/app/dashboard/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/dashboard/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/dashboard/components/ui/card";

// Composant d'erreur
function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Erreur de chargement
      </h3>
      <p className="text-gray-500 mb-4 max-w-md">{message}</p>
      <Button onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Réessayer
      </Button>
    </div>
  );
}

// Composant StockAlerts avec pagination intégrée
function StockAlertsWithPagination({ alerts = [] }: { alerts?: any[] }) {
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Calculs pour la pagination
  const totalPages = Math.ceil(alerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAlerts = alerts.slice(startIndex, startIndex + itemsPerPage);

  // Titre dynamique
  const alertCount = alerts.length;
  const dynamicTitle = `${alertCount} Alerte${
    alertCount > 1 ? "s" : ""
  } stock - Page ${currentPage}/${totalPages}`;

  if (alertCount === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Aucune alerte stock pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Contenu des alertes */}
        <div className=" pb-4">
          <StockAlerts alerts={paginatedAlerts} titre={dynamicTitle} />
        </div>

        {/* Pagination - seulement si plus de 5 alertes */}
        {alertCount > 5 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-gray-600">
              Affichage de {startIndex + 1} à{" "}
              {Math.min(startIndex + itemsPerPage, alertCount)} sur {alertCount}{" "}
              alerte{alertCount > 1 ? "s" : ""}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                      variant={currentPage === pageNum ? "default" : "outline"}
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
              <span className="text-sm text-gray-600">Alertes par page:</span>
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
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function useDashboardData({ days = 90, limit = 5, movLimit = 10 } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null as string | null,
    payload: null as any,
  });

  const fetchData = async () => {
    setState({ loading: true, error: null, payload: null });

    try {
      const params = new URLSearchParams({
        days: String(days),
        limit: String(limit),
        movLimit: String(movLimit),
      });

      const res = await fetch(`/api/dashboard/summary?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Erreur ${res.status}: ${res.statusText}`);
      }

      const payload = await res.json();

      setState({
        loading: false,
        error: null,
        payload,
      });

      console.log("✅ Données dashboard chargées:", payload);
    } catch (err: any) {
      console.error("❌ Erreur chargement dashboard:", err);

      setState({
        loading: false,
        error: err?.message || "Erreur lors du chargement des données",
        payload: null,
      });
    }
  };

  useEffect(() => {
    fetchData();

    // Rafraîchissement automatique toutes les 30 secondes
    const interval = setInterval(fetchData, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [days, limit, movLimit]);

  return { ...state, refetch: fetchData };
}

export default function Dashboard() {
  const { loading, error, payload, refetch } = useDashboardData();

  console.log("📊 Dashboard state:", {
    loading,
    error,
    payload: typeof payload,
  });

  // Affichage du chargement
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Chargement des données du tableau de bord...
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
          <ErrorMessage message={error} onRetry={refetch} />
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
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher un produit, commande..."
                  className="pl-10 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs flex items-center justify-center">
                  3
                </Badge>
              </Button>

              <Button variant="ghost" size="icon" onClick={refetch}>
                <RefreshCw className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Tableau de bord
            </h1>
            <p className="text-gray-600">
              Aperçu de votre activité commerciale
            </p>
          </div>

          {/* Stats Cards */}
          <StatsCards stats={payload?.stats} loading={loading} error={error} />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SalesChart
              data={payload?.sales_chart}
              loading={loading}
              error={error}
            />
            <TopProductsChart data={payload?.top_products} />
          </div>

          {/* Stock Alerts avec pagination et titre dynamique */}
          <StockAlertsWithPagination
            alerts={payload?.alerts ?? payload?.stock_alerts}
          />

          {/* Aucune donnée */}
          {(!payload?.stats ||
            !payload?.sales_chart ||
            !payload?.top_products ||
            (!payload?.alerts && !payload?.stock_alerts)) && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucune donnée disponible pour le moment.
              </AlertDescription>
            </Alert>
          )}
        </main>
      </div>
    </div>
  );
}
