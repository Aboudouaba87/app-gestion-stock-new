"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  User,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  LogOut,
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
import { signOut } from "next-auth/react";
import { LogoutButton } from "./components/logoutButton";
import { RoleGuard } from "./components/auth/role-guard";

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
      <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-gray-300">
        Erreur de chargement
      </h3>
      <p className="text-gray-500 mb-4 max-w-md dark:text-gray-300">
        {message}
      </p>
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
          <p className="text-gray-500 text-center py-4 dark:text-gray-300">
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
            <div className="text-sm text-gray-600 dark:text-gray-300">
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
                Alertes par page:
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const { loading, error, payload, refetch } = useDashboardData();

  // Redirection si non authentifié
  useEffect(() => {
    if (status === "loading") return; // Encore en chargement

    if (!session) {
      router.push("/login");
    }
  }, [session, status, router]);

  // Affichage du chargement de l'authentification
  if (status === "loading") {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Vérification de l'authentification...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si non authentifié, ne rien afficher (la redirection s'occupe du reste)
  if (!session) {
    return null;
  }

  // Affichage du chargement des données
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Chargement des données du tableau de bord...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Affichage des erreurs des données
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
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-white">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          {/* Header avec informations utilisateur */}
          <header className="bg-white border-b border-gray-200 px-6 py-4 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative hidden">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 dark:text-gray-200" />
                  <Input
                    placeholder="Rechercher un produit, commande..."
                    className="pl-10 bg-gray-50 border-gray-200 dark:bg-gray-900 dark:text-gray-300"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Informations utilisateur */}
                <div className="flex items-center ml-8 lg:ml-0 space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <User className="h-4 w-4" />
                  <span>{session.user?.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {session.user?.role}
                  </Badge>
                </div>

                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs flex items-center justify-center">
                    3
                  </Badge>
                </Button>

                <Button variant="ghost" size="icon" onClick={refetch}>
                  <RefreshCw className="h-5 w-5" />
                </Button>

                <LogoutButton />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 dark:text-gray-300">
                Tableau de bord
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Bienvenue, {session.user?.name} ! Aperçu de votre activité
                commerciale
              </p>
            </div>
            {/* Stats Cards */}
            <StatsCards
              stats={payload?.stats}
              loading={loading}
              error={error}
            />
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <SalesChart
                data={payload?.sales_chart}
                loading={loading}
                error={error}
              />
              <TopProductsChart data={payload?.top_products} />
            </div>
            {console.log(
              "Le props de SalesChart est : ",
              payload?.sales_chart,
              "et celui de TopProductsChart est :",
              payload?.top_products
            )}
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
    </RoleGuard>
  );
}
