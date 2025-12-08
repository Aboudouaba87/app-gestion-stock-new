"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/dashboard/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export function SalesChart({
  data = [],
  loading = false,
  error = null,
}: {
  data: any[];
  loading: boolean;
  error: any;
}) {
  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-900 dark:text-gray-300">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Évolution des ventes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white dark:bg-gray-900 dark:text-gray-300">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Évolution des ventes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-red-500">Erreur de chargement</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si pas de données, afficher un message
  if (!data || data.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-900 dark:text-gray-300">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Évolution des ventes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-gray-500">Aucune donnée de vente disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grouper les données par mois (6 derniers mois maximum)
  const monthlyData: {
    [key: string]: { month: string; pv: number; uv: number };
  } = {};

  // Obtenir la date d'il y a 6 mois
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  data.forEach((item) => {
    const date = new Date(item.date);

    // Filtrer pour garder seulement les 6 derniers mois
    if (date >= sixMonthsAgo) {
      const monthYear = date.toLocaleString("fr-FR", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          month: monthYear,
          pv: 0,
          uv: 0,
        };
      }

      monthlyData[monthYear].pv += parseFloat(item.total_amount) || 0;
      monthlyData[monthYear].uv += parseInt(item.sales_count) || 0;
    }
  });

  // Convertir en tableau et trier par mois
  const formattedData = Object.values(monthlyData)
    .sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    })
    .map((item) => ({
      ...item,
      name: item.month,
      amt: item.pv,
    }));

  // Si après regroupement on n'a pas de données
  if (formattedData.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-900 dark:text-gray-300">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Évolution des ventes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-gray-500">Aucune donnée des 6 derniers mois</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Limiter à 6 mois maximum
  const displayData = formattedData.slice(-6);

  return (
    <Card className="bg-white dark:bg-gray-900 dark:text-gray-300">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Évolution des ventes (6 derniers mois)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <LineChart
            style={{
              width: "100%",
              maxWidth: "700px",
              height: "100%",
              maxHeight: "70vh",
              aspectRatio: 1.618,
            }}
            responsive
            data={displayData}
            margin={{
              top: 5,
              right: 0,
              left: 0,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 12 }}
            />
            <YAxis width="auto" />
            <Tooltip
              formatter={(value, name) => {
                if (name === "pv")
                  return [`${Number(value).toFixed(2)} €`, "Montant total"];
                if (name === "uv") return [value, "Nombre de ventes"];
                return [value, name];
              }}
              labelFormatter={(label) => `Mois: ${label}`}
            />
            <Legend
              formatter={(value) => {
                if (value === "pv") return "Montant (€)";
                if (value === "uv") return "Nombre de ventes";
                return value;
              }}
            />
            <Line
              type="monotone"
              dataKey="pv"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="uv"
              stroke="#82ca9d"
              activeDot={{ r: 6 }}
              strokeWidth={2}
            />
          </LineChart>
        </div>
      </CardContent>
    </Card>
  );
}
