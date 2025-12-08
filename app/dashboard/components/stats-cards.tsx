import { Card, CardContent } from "@/app/dashboard/components/ui/card";
import {
  Euro,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
} from "lucide-react";

interface StatsCardsProps {
  stats?: {
    totalProducts: number;
    totalSales: number;
    totalClients: number;
    lowStockProducts: number;
    userRole?: string;
    userWarehouse?: string;
  };
  loading?: boolean;
  error?: any;
}

export function StatsCards({ stats, loading, error }: StatsCardsProps) {
  // Si loading ou error, afficher l'état correspondant
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
          <Card
            key={index}
            className="bg-white dark:bg-gray-900 dark:text-gray-300 animate-pulse"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200 mb-8">
        <CardContent className="p-6">
          <p className="text-red-600">
            Erreur: {error.message || "Impossible de charger les statistiques"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
          <Card
            key={index}
            className="bg-white dark:bg-gray-900 dark:text-gray-300"
          >
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">Aucune donnée</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Convertir l'objet stats en tableau pour garder votre structure existante
  const statsArray = [
    {
      title: "Produits",
      value: stats.totalProducts || 0,
      change: "Total produits",
      positive: true,
      icon: Package,
    },
    {
      title: "Ventes",
      value: stats.totalSales || 0,
      change: "Total ventes",
      positive: true,
      icon: ShoppingCart,
    },
    {
      title: "Clients",
      value: stats.totalClients || 0,
      change: "Total clients",
      positive: true,
      icon: Users,
    },
    {
      title: "Alertes Stock",
      value: stats.lowStockProducts || 0,
      change: "Produits en alerte",
      positive: false,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsArray.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className="bg-white dark:bg-gray-900 dark:text-gray-300 hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {stat.title}
                </div>
                <Icon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {stat.value}
              </div>
              <div
                className={`text-sm ${
                  stat.positive ? "text-green-600" : "text-red-600"
                }`}
              >
                {stat.change}
              </div>

              {/* Afficher le rôle et l'entrepôt sur la première carte */}
              {index === 0 && stats.userRole && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {stats.userRole}
                    </span>
                    {stats.userWarehouse && (
                      <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        {stats.userWarehouse}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
