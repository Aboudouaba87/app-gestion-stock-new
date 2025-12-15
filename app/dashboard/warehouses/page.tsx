"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Warehouse as WarehouseIcon,
  Search,
} from "lucide-react";
import { Sidebar } from "@/app/dashboard/components/sidebar";
import { RoleGuard } from "@/app/dashboard/components/auth/role-guard";
import { Button } from "@/app/dashboard/components/ui/button";
import { Input } from "@/app/dashboard/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/app/dashboard/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/app/dashboard/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/dashboard/components/ui/dialog";
import { Label } from "@/app/dashboard/components/ui/label";
import { Textarea } from "@/app/dashboard/components/ui/textarea";
import { toast } from "sonner";
import { nanoid } from "nanoid";

type Warehouse = {
  id: number;
  label: string;
  value: string;
  metadata?: { description?: string } | null;
};

function slugify(str: string) {
  return (
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "entrepot"
  );
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [formData, setFormData] = useState({
    label: "",
    description: "",
  });

  const [searchTerm, setSearchTerm] = useState("");

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/warehouses", { cache: "no-store" });
      if (!res.ok) throw new Error(`Erreur API entrepôts ${res.status}`);
      const data = await res.json();
      setWarehouses(data);
    } catch (err: any) {
      console.error("Erreur fetch warehouses:", err);
      setError(err.message || "Erreur lors du chargement des entrepôts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormData({
      label: "",
      description: "",
    });
    setIsModalOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setFormData({
      label: w.label,
      description: w.metadata?.description ?? "",
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (w: Warehouse) => {
    setDeleteTarget(w);
    setIsDeleteOpen(true);
  };

  const handleSave = async () => {
    try {
      const label = formData.label.trim();
      if (!label) {
        toast.error("Le nom de l'entrepôt est obligatoire");
        return;
      }

      const tempId = nanoid(10);
      const body: any = {
        label,
        value: slugify(tempId),
      };

      const description = formData.description.trim();
      if (description) {
        body.metadata = { description };
      }

      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `/api/warehouses?id=${editing.id}`
        : "/api/warehouses";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Erreur ${method} entrepôt`);
      }

      toast.success(
        editing ? "Entrepôt mis à jour" : "Entrepôt créé avec succès"
      );
      setIsModalOpen(false);
      await loadWarehouses();
    } catch (err: any) {
      console.error("Erreur sauvegarde entrepôt:", err);
      toast.error(err.message || "Erreur lors de l'enregistrement");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/warehouses?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erreur suppression entrepôt");
      }
      toast.success("Entrepôt supprimé");
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      await loadWarehouses();
    } catch (err: any) {
      console.error("Erreur suppression entrepôt:", err);
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const filteredWarehouses = warehouses.filter((w) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const name = w.label.toLowerCase();
    const desc = (w.metadata?.description ?? "").toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  if (loading) {
    return (
      <RoleGuard allowedRoles={["admin", "manager"]}>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            Chargement des entrepôts...
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <WarehouseIcon className="h-5 w-5" />
                <CardTitle>Entrepôts / Magasins</CardTitle>
              </div>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvel entrepôt
              </Button>
            </CardHeader>

            {/* Barre de recherche large, bien délimitée */}
            <div className="px-6 pb-4">
              <div className="relative w-full rounded-lg border border-gray-200 bg-white shadow-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Rechercher un entrepôt (nom ou description)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 pr-4 py-3 w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <CardContent>
              {error && (
                <div className="mb-4 text-sm text-red-600">{error}</div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de l'entrepôt</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarehouses.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-gray-800 font-medium">
                        {w.label}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {w.metadata?.description || "—"}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openEdit(w)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openDeleteModal(w)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredWarehouses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        Aucun entrepôt ne correspond à la recherche.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Modal création / édition */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Modifier l'entrepôt" : "Nouvel entrepôt"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Nom de l'entrepôt</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, label: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Description (optionnelle)</Label>
                  <Textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Ex: Entrepôt principal, Magasin Nord..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave}>
                  {editing ? "Enregistrer" : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de confirmation de suppression */}
          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer l'entrepôt</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-700">
                Voulez-vous vraiment supprimer l'entrepôt{" "}
                <span className="font-semibold">{deleteTarget?.label}</span> ?
                Cette action est irréversible.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteOpen(false);
                    setDeleteTarget(null);
                  }}
                >
                  Annuler
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </RoleGuard>
  );
}
