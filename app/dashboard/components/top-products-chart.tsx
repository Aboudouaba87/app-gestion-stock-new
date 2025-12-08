"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/dashboard/components/ui/card";
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export function TopProductsChart({
  data = [],
  loading = false,
  error = null,
}: {
  data: any[];
  loading?: boolean;
  error?: any;
}) {
  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-900 dark:text-gray-300">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Top 5 produits
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
            Top 5 produits
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
            Top 5 produits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-gray-500">Aucun produit vendu récemment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Formater les données selon votre structure
  // Trier par quantité vendue (total_quantity) descendant
  const formattedData = data
    .map((item) => ({
      name: item.name || "Produit sans nom",
      // Utiliser total_quantity pour pv (quantité vendue)
      pv: parseInt(item.total_quantity) || 0,
      // Utiliser total_revenue pour uv (revenu généré)
      uv: parseFloat(item.total_revenue) || 0,
      amt: parseFloat(item.total_revenue) || 0,
    }))
    .sort((a, b) => b.pv - a.pv); // Trier du plus vendu au moins vendu

  // Limiter à 5 produits maximum
  const displayData = formattedData.slice(0, 5);

  return (
    <Card className="bg-white dark:bg-gray-900 dark:text-gray-300">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Top 5 produits (30 derniers jours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex flex-col justify-center space-y-6">
          <BarChart
            style={{
              width: "100%",
              maxWidth: "700px",
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
                  return [`${value} unités`, "Quantité vendue"];
                if (name === "uv")
                  return [`${Number(value).toFixed(2)} €`, "Revenu généré"];
                return [value, name];
              }}
              labelFormatter={(label) => `Produit: ${label}`}
            />
            <Legend
              formatter={(value) => {
                if (value === "pv") return "Quantité vendue";
                if (value === "uv") return "Revenu (€)";
                return value;
              }}
            />
            <Bar
              dataKey="pv"
              fill="#8884d8"
              activeBar={<Rectangle fill="green" stroke="blue" />}
              barSize={40} // Un peu plus large pour 5 produits
            />
          </BarChart>
        </div>
      </CardContent>
    </Card>
  );
}
