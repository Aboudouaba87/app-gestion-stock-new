// "use client";
// import { Bell, Search, User } from "lucide-react";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Sidebar } from "@/components/sidebar";
// import { StatsCards } from "@/components/stats-cards";
// import { SalesChart } from "@/components/sales-chart";
// import { TopProductsChart } from "@/components/top-products-chart";
// import { StockAlerts } from "@/components/stock-alerts";

// export default function Dashboard() {
//   return (
//     <div className="flex min-h-screen bg-gray-50">
//       <Sidebar />

//       <div className="flex-1 flex flex-col">
//         {/* Header */}
//         <header className="bg-white border-b border-gray-200 px-6 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex-1 max-w-md">
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//                 <Input
//                   placeholder="Rechercher un produit, commande..."
//                   className="pl-10 bg-gray-50 border-gray-200"
//                 />
//               </div>
//             </div>

//             <div className="flex items-center space-x-4">
//               <Button variant="ghost" size="icon" className="relative">
//                 <Bell className="h-5 w-5" />
//                 <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs flex items-center justify-center">
//                   3
//                 </Badge>
//               </Button>
//               <Button variant="ghost" size="icon">
//                 <User className="h-5 w-5" />
//               </Button>
//             </div>
//           </div>
//         </header>

//         {/* Main Content */}
//         <main className="flex-1 p-6">
//           <div className="mb-8">
//             <h1 className="text-2xl font-bold text-gray-900 mb-2">
//               Tableau de bord
//             </h1>
//             <p className="text-gray-600">
//               Aperçu de votre activité commerciale
//             </p>
//           </div>

//           {/* Stats Cards */}
//           <StatsCards />

//           {/* Charts Section */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//             <SalesChart />
//             <TopProductsChart />
//           </div>

//           {/* Stock Alerts */}
//           <StockAlerts />
//         </main>
//       </div>
//     </div>
//   );
// }

"use client";
import { useEffect, useState } from "react";
import { Bell, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { StatsCards } from "@/components/stats-cards";
import { SalesChart } from "@/components/sales-chart";
import { TopProductsChart } from "@/components/top-products-chart";
import { StockAlerts } from "@/components/stock-alerts";

function useDashboardData({ days = 90, limit = 5, movLimit = 10 } = {}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    payload: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    let mounted = true;

    async function fetchDashboard() {
      setState({ loading: true, error: null, payload: null });
      try {
        const params = new URLSearchParams({
          days: String(days),
          limit: String(limit),
          movLimit: String(movLimit),
        });
        const res = await fetch(`/api/dashboard/summary?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal,
          credentials: "same-origin",
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        const payload = await res.json();
        if (!mounted) return;
        setState({ loading: false, error: null, payload });
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (!mounted) return;
        setState({
          loading: false,
          error: err?.message || String(err),
          payload: null,
        });
      }
    }

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30_000);

    return () => {
      mounted = false;
      clearInterval(interval);
      controller.abort();
    };
  }, [days, limit, movLimit]);

  return state;
}

export default function Dashboard() {
  const { loading, error, payload } = useDashboardData();

  console.log("Le payload est ", typeof payload, payload);

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

          {/* Loading / Error */}
          {loading && (
            <div className="mb-6">
              <p className="text-gray-500">Chargement des données...</p>
            </div>
          )}
          {error && (
            <div className="mb-6">
              <p className="text-red-600">
                Erreur lors du chargement : {error}
              </p>
            </div>
          )}

          {/* Stats Cards */}
          <StatsCards stats={payload?.stats} loading={loading} error={error} />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SalesChart data={payload?.sales_chart} loading={loading} />
            <TopProductsChart data={payload?.top_products} loading={loading} />
          </div>

          {/* Stock Alerts */}
          <StockAlerts
            alerts={payload?.alerts ?? payload?.stock_alerts}
            loading={loading}
          />
        </main>
      </div>
    </div>
  );
}
