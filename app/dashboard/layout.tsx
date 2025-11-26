import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StockPro - Gestion de Stock Universelle",
  description:
    "Application de gestion de stock pour tous les types d'entreprises.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="dashboard-layout">{children}</div>;
}
