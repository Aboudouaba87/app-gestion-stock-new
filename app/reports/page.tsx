"use client"

import { useState } from "react"
import { toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const ReportsPage = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState("monthly")
  const [selectedWarehouse, setSelectedWarehouse] = useState("Warehouse A")
  const [warehouseMultiplier, setWarehouseMultiplier] = useState(1)
  const [currentData, setCurrentData] = useState({
    revenue: 100000,
    orders: 500,
    customers: 200,
    outOfStock: 10,
    salesData: [
      { mois: "Janvier", ventes: 12000 },
      { mois: "Février", ventes: 15000 },
      { mois: "Mars", ventes: 13000 },
    ],
    topProducts: [
      { nom: "Produit X", ventes: 200, revenus: 30000 },
      { nom: "Produit Y", ventes: 150, revenus: 25000 },
      { nom: "Produit Z", ventes: 100, revenus: 20000 },
    ],
    categoryData: [
      { name: "Catégorie 1", value: 40000, percentage: 40 },
      { name: "Catégorie 2", value: 30000, percentage: 30 },
      { name: "Catégorie 3", value: 30000, percentage: 30 },
    ],
  })

  const handleExportPDF = async () => {
    try {
      setIsExporting(true)
      toast({
        title: "Export PDF en cours...",
        description: "Génération du rapport PDF",
      })

      // Import dynamique de jsPDF
      const { jsPDF } = await import("jspdf")
      const doc = new jsPDF()

      // Configuration
      const pageWidth = doc.internal.pageSize.width
      const margin = 20
      let yPosition = margin

      // En-tête
      doc.setFontSize(20)
      doc.setFont(undefined, "bold")
      doc.text("Rapport de Gestion - StockPro", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 15

      doc.setFontSize(12)
      doc.setFont(undefined, "normal")
      doc.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, pageWidth / 2, yPosition, { align: "center" })
      yPosition += 8
      doc.text(`Période: ${selectedPeriod === "custom" ? "Personnalisée" : selectedPeriod}`, pageWidth / 2, yPosition, {
        align: "center",
      })
      yPosition += 8
      doc.text(`Entrepôt: ${selectedWarehouse}`, pageWidth / 2, yPosition, { align: "center" })
      yPosition += 20

      // KPIs
      doc.setFontSize(16)
      doc.setFont(undefined, "bold")
      doc.text("Indicateurs Clés", margin, yPosition)
      yPosition += 15

      doc.setFontSize(10)
      doc.setFont(undefined, "normal")
      const kpis = [
        ["Chiffre d'affaires", `€${Math.round(currentData.revenue * warehouseMultiplier).toLocaleString()}`],
        ["Commandes", `${Math.round(currentData.orders * warehouseMultiplier)}`],
        ["Nouveaux clients", `${Math.round(currentData.customers * warehouseMultiplier)}`],
        ["Produits en rupture", `${Math.round(currentData.outOfStock * warehouseMultiplier)}`],
      ]

      kpis.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, margin, yPosition)
        yPosition += 8
      })
      yPosition += 10

      // Ventes par période
      doc.setFontSize(16)
      doc.setFont(undefined, "bold")
      doc.text("Évolution des Ventes", margin, yPosition)
      yPosition += 15

      doc.setFontSize(10)
      doc.setFont(undefined, "normal")
      currentData.salesData.forEach((item) => {
        const adjustedValue = Math.round(item.ventes * warehouseMultiplier)
        doc.text(`${item.mois}: €${adjustedValue.toLocaleString()}`, margin, yPosition)
        yPosition += 8
      })
      yPosition += 10

      // Top produits
      doc.setFontSize(16)
      doc.setFont(undefined, "bold")
      doc.text("Top Produits", margin, yPosition)
      yPosition += 15

      doc.setFontSize(10)
      doc.setFont(undefined, "normal")
      currentData.topProducts.forEach((product) => {
        const adjustedSales = Math.round(product.ventes * warehouseMultiplier)
        const adjustedRevenue = Math.round(product.revenus * warehouseMultiplier)
        doc.text(`${product.nom}: ${adjustedSales} ventes - €${adjustedRevenue.toLocaleString()}`, margin, yPosition)
        yPosition += 8
      })
      yPosition += 10

      // Catégories
      doc.setFontSize(16)
      doc.setFont(undefined, "bold")
      doc.text("Répartition par Catégorie", margin, yPosition)
      yPosition += 15

      doc.setFontSize(10)
      doc.setFont(undefined, "normal")
      currentData.categoryData.forEach((category) => {
        const adjustedValue = Math.round(category.value * warehouseMultiplier)
        doc.text(`${category.name}: ${category.percentage}% - €${adjustedValue.toLocaleString()}`, margin, yPosition)
        yPosition += 8
      })

      // Pied de page
      doc.setFontSize(8)
      doc.text(
        `Généré le ${new Date().toLocaleString("fr-FR")} - StockPro Dashboard`,
        margin,
        doc.internal.pageSize.height - 10,
      )

      // Téléchargement
      const fileName = `rapport-${selectedPeriod}-${selectedWarehouse}-${new Date().toISOString().split("T")[0]}.pdf`
      doc.save(fileName)

      toast({
        title: "Export réussi !",
        description: "Le rapport PDF a été téléchargé",
      })
    } catch (error) {
      console.error("Erreur export PDF:", error)
      toast({
        title: "Erreur d'export",
        description: "Impossible de générer le PDF",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
      <h1>Rapports</h1>
      <button onClick={handleExportPDF} disabled={isExporting}>
        {isExporting ? "Export en cours..." : "Exporter en PDF"}
      </button>
      {/* Rest of the code here */}
    </div>
  )
}

export default ReportsPage
