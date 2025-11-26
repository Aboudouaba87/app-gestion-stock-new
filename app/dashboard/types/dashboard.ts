export type RevenuePoint = {
  day: string;            // ISO date string e.g. "2025-10-01"
  daily_revenue: number;  // montant converti en number
};

export type TopProduct = {
  id: number;
  sku?: string | null;
  name?: string | null;
  qty: number;
  price: number;
  value: number;
};

export type StockAlert = {
  id: number;
  sku?: string | null;
  name?: string | null;
  qty: number;
};

export type StockMovement = {
  id: number;
  product_id?: number | null;
  sku?: string | null;
  name?: string | null;
  type?: string | null;
  qty?: number | null;
  from_warehouse?: string | null;
  to_warehouse?: string | null;
  reference?: string | null;
  user_email?: string | null;
  created_at?: string | null; // ISO datetime
};

export type DashboardPayload = {
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_suppliers: number;
  fallback_suppliers_from_clients?: boolean; // présent si clients utilisé en fallback
  orders_this_month: number;
  sales_value_month: number;
  stock_value: number;
  revenue_series: RevenuePoint[];            // série temporelle pour chart
  top_products: TopProduct[];               // top N produits par valeur
  stock_alerts: StockAlert[];               // produits sous le threshold
  recent_stock_movements: StockMovement[];  // derniers mouvements
  missing_tables?: string[];                // tables absent détectées côté API
  // champs additionnels d'erreur/debug (optionnel)
  error?: string;
  detail?: string;
};
