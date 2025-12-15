"use client";

import { formatCurrency } from "../../lib/formatCurency";

export default function Home() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Exemple de devises africaines</h1>
      <ul className="space-y-2">
        <li>{formatCurrency(1000, "XOF")}</li>
        <li>{formatCurrency(1000, "NGN")}</li>
        <li>{formatCurrency(1000, "MAD")}</li>
        <li>{formatCurrency(1000, "ZAR")}</li>
        <li>{formatCurrency(55000, "TZS")}</li>
      </ul>
    </div>
  );
}
