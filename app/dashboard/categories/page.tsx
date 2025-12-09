"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Tag,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Input } from "@/app/dashboard/components/ui/input";
import { Button } from "@/app/dashboard/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/dashboard/components/ui/card";
import { Badge } from "@/app/dashboard/components/ui/badge";
import { Sidebar } from "@/app/dashboard/components/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/dashboard/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/dashboard/components/ui/dialog";
import { Label } from "@/app/dashboard/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/dashboard/components/ui/select";
import { Textarea } from "@/app/dashboard/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/dashboard/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/dashboard/components/ui/alert-dialog";
import { RoleGuard } from "../components/auth/role-guard";

// Types pour les catégories
type Category = {
  id: number;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  parent_id: number | null;
  parent_name: string | null;
  product_count: number;
  created_at: string;
  updated_at: string;
};

type NewCategory = {
  name: string;
  description: string;
  status: "active" | "inactive";
  parent_id: number | null;
};

type EditCategory = {
  name: string;
  description: string;
  status: "active" | "inactive";
  parent_id: number | null;
};

// Hook pour le debounce
function useDebounce<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function CategoriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [parentFilter, setParentFilter] = useState("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState<NewCategory>({
    name: "",
    description: "",
    status: "active",
    parent_id: null,
  });

  const [editCategory, setEditCategory] = useState<EditCategory>({
    name: "",
    description: "",
    status: "active",
    parent_id: null,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  const [openFilters, setOpenFilters] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
    new Set()
  );

  const { toast } = useToast();

  // Fonction pour charger les catégories
  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Erreur au chargement des catégories");
      const data: Category[] = await res.json();
      setCategories(data);
    } catch (err: any) {
      console.error("Fetch categories error:", err);
      setFetchError(err.message ?? "Erreur serveur");
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des catégories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Charger les catégories au montage
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /* ---------- Catégories filtrées ---------- */
  const debouncedSearch = useDebounce(searchTerm, 250);

  const filteredCategories = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesSearch =
        !q ||
        category.name.toLowerCase().includes(q) ||
        (category.description &&
          category.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" || category.status === statusFilter;

      const matchesParent =
        parentFilter === "all" ||
        (parentFilter === "parent" && category.parent_id === null) ||
        (parentFilter === "child" && category.parent_id !== null) ||
        (parentFilter !== "all" &&
          parentFilter !== "parent" &&
          parentFilter !== "child" &&
          category.parent_id?.toString() === parentFilter);

      return matchesSearch && matchesStatus && matchesParent;
    });
  }, [categories, debouncedSearch, statusFilter, parentFilter]);

  /* ---------- Statistiques ---------- */
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.status === "active").length;
    const parentCategories = categories.filter(
      (c) => c.parent_id === null
    ).length;

    // CORRECTION ICI :
    const totalProducts = categories.reduce(
      (sum, cat) => sum + Number(cat.product_count || 0),
      0
    );

    return { total, active, parentCategories, totalProducts };
  }, [categories]);

  /* ---------- Catégories parentes pour les selects ---------- */
  const parentCategories = useMemo(() => {
    return categories.filter(
      (cat) => cat.parent_id === null && cat.status === "active"
    );
  }, [categories]);

  /* ---------- Gestion des filtres ---------- */
  const activeFiltersCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      (statusFilter !== "all" ? 1 : 0) +
      (parentFilter !== "all" ? 1 : 0)
    );
  }, [searchTerm, statusFilter, parentFilter]);

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setParentFilter("all");
    setOpenFilters(false);
    toast({
      title: "Filtres réinitialisés",
      description: "Tous les filtres ont été effacés",
    });
  }, [toast]);

  /* ---------- Badges ---------- */
  const getStatusBadge = useCallback((status: string) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-800 border-0">Actif</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 border-0 dark:text-gray-400">
        Inactif
      </Badge>
    );
  }, []);

  const getTypeBadge = useCallback((parentId: number | null) => {
    return parentId === null ? (
      <Badge className="bg-blue-100 text-blue-800 border-0">Parent</Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-800 border-0">Enfant</Badge>
    );
  }, []);

  /* ---------- Toggle expansion ---------- */
  const toggleCategoryExpansion = useCallback((categoryId: number) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  /* ---------- Validation formulaire ---------- */
  const isCreateFormValid = useMemo(() => {
    return newCategory.name.trim() !== "";
  }, [newCategory]);

  const isEditFormValid = useMemo(() => {
    return editCategory.name.trim() !== "";
  }, [editCategory]);

  /* ---------- Créer une catégorie ---------- */
  const handleCreateCategory = useCallback(async () => {
    if (!isCreateFormValid) {
      toast({
        title: "Erreur de validation",
        description: "Le nom de la catégorie est requis",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur" }));
        throw new Error(err.error || "Échec de la création");
      }

      // Recharger les catégories
      await loadCategories();

      setNewCategory({
        name: "",
        description: "",
        status: "active",
        parent_id: null,
      });
      setIsCreateModalOpen(false);

      toast({
        title: "Catégorie créée",
        description: `${newCategory.name} a été ajoutée`,
      });
    } catch (err: any) {
      console.error("Create category error:", err);
      toast({
        title: "Erreur",
        description: err.message ?? "Impossible de créer la catégorie",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }, [isCreateFormValid, newCategory, toast, loadCategories]);

  /* ---------- Éditer une catégorie ---------- */
  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category);
    setEditCategory({
      name: category.name,
      description: category.description || "",
      status: category.status,
      parent_id: category.parent_id,
    });
    setIsEditModalOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingCategory) return;

    if (!isEditFormValid) {
      toast({
        title: "Erreur de validation",
        description: "Le nom de la catégorie est requis",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: editingCategory.id,
        ...editCategory,
      };

      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur" }));
        throw new Error(err.error || "Échec de la mise à jour");
      }

      // Recharger les catégories
      await loadCategories();

      setIsEditModalOpen(false);
      setEditingCategory(null);

      toast({
        title: "Catégorie modifiée",
        description: `${editCategory.name} a été mise à jour`,
      });
    } catch (err: any) {
      console.error("Save edit error:", err);
      toast({
        title: "Erreur",
        description: err.message ?? "Impossible de modifier la catégorie",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editingCategory, editCategory, toast, isEditFormValid, loadCategories]);

  /* ---------- Supprimer une catégorie ---------- */
  const handleDeleteCategory = useCallback(
    async (id: number) => {
      const toRemove = categories.find((c) => c.id === id);
      if (!toRemove) return;

      // Vérifier si la catégorie a des produits
      if (toRemove.product_count > 0) {
        toast({
          title: "Impossible de supprimer",
          description:
            "Cette catégorie contient des produits. Déplacez-les d'abord.",
          variant: "destructive",
        });
        return;
      }

      // Vérifier si c'est une catégorie parente avec des sous-catégories
      const hasChildren = categories.some((c) => c.parent_id === id);
      if (hasChildren) {
        toast({
          title: "Impossible de supprimer",
          description:
            "Cette catégorie a des sous-catégories. Supprimez-les d'abord.",
          variant: "destructive",
        });
        return;
      }

      // Optimistic update
      const previous = categories;
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setIsDeletingId(id);

      try {
        const res = await fetch(`/api/categories?id=${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erreur" }));
          throw new Error(err.error || "Échec de la suppression");
        }

        // Recharger pour s'assurer que tout est à jour
        await loadCategories();

        toast({
          title: "Supprimée",
          description: `${toRemove.name} a été supprimée`,
        });
      } catch (err: any) {
        console.error("Delete error:", err);
        // Rollback
        setCategories(previous);
        toast({
          title: "Erreur",
          description: err.message ?? "Impossible de supprimer la catégorie",
          variant: "destructive",
        });
      } finally {
        setIsDeletingId(null);
      }
    },
    [categories, toast, loadCategories]
  );

  /* ---------- Récupérer toutes les catégories à afficher ---------- */
  const categoriesToDisplay = useMemo(() => {
    const result: (Category & { level: number })[] = [];

    const addCategory = (category: Category, level = 0) => {
      result.push({ ...category, level });

      if (expandedCategories.has(category.id)) {
        const children = filteredCategories.filter(
          (cat) => cat.parent_id === category.id
        );
        children.forEach((child) => addCategory(child, level + 1));
      }
    };

    const parentCats = filteredCategories.filter(
      (cat) => cat.parent_id === null
    );
    parentCats.forEach((cat) => addCategory(cat, 0));

    return result;
  }, [filteredCategories, expandedCategories]);

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-white">
        <Sidebar />

        <div className="flex-1 md:flex flex-col overflow-auto">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4 dark:bg-gray-900 dark:text-white">
            <div className="flex-1 md:flex items-center md:justify-between">
              <div className="ml-10 lg:ml-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-300 dark:bg-gray-900">
                  Catégories
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Gérez vos catégories de produits
                </p>
              </div>

              <Dialog
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
              >
                <div className="flex lg:flex-1 justify-center justify-items-end mt-1 lg:mt-0 mx-4 md:mx-0">
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 dark:text-white min-w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle catégorie
                    </Button>
                  </DialogTrigger>
                </div>

                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Créer une nouvelle catégorie</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom *</Label>
                      <Input
                        id="name"
                        value={newCategory.name}
                        onChange={(e) =>
                          setNewCategory((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Nom de la catégorie"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newCategory.description}
                        onChange={(e) =>
                          setNewCategory((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Description de la catégorie"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parent">Catégorie parente</Label>
                        <Select
                          value={newCategory.parent_id?.toString() || "none"}
                          onValueChange={(value) =>
                            setNewCategory((p) => ({
                              ...p,
                              parent_id:
                                value === "none" ? null : parseInt(value),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Aucune (catégorie parente)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              Aucune (catégorie parente)
                            </SelectItem>
                            {parentCategories.map((cat) => (
                              <SelectItem
                                key={cat.id}
                                value={cat.id.toString()}
                              >
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Statut</Label>
                        <Select
                          value={newCategory.status}
                          onValueChange={(value: "active" | "inactive") =>
                            setNewCategory((p) => ({ ...p, status: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Actif</SelectItem>
                            <SelectItem value="inactive">Inactif</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateModalOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleCreateCategory}
                        disabled={isCreating || !isCreateFormValid}
                        className={
                          !isCreateFormValid
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Création...
                          </>
                        ) : (
                          "Créer"
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Total catégories
                      </p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <Tag className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Actives
                      </p>
                      <p className="text-2xl font-bold">{stats.active}</p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <div className="h-4 w-4 bg-green-600 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Catégories parentes
                      </p>
                      <p className="text-2xl font-bold">
                        {stats.parentCategories}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <div className="h-4 w-4 bg-purple-600 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Produits total
                      </p>
                      <p className="text-2xl font-bold">
                        {stats.totalProducts}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <div className="h-4 w-4 bg-orange-600 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 dark:text-gray-200" />
                        <Input
                          placeholder="Rechercher par nom ou description"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Collapsible
                      open={openFilters}
                      onOpenChange={setOpenFilters}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="relative bg-transparent"
                        >
                          <Filter className="h-4 w-4 mr-2" />
                          Filtres
                          {activeFiltersCount > 0 && (
                            <Badge className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5">
                              {activeFiltersCount}
                            </Badge>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 rounded">
                          <div className="flex-1">
                            <Label>Statut</Label>
                            <Select
                              value={statusFilter}
                              onValueChange={(v) => setStatusFilter(v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="active">Actif</SelectItem>
                                <SelectItem value="inactive">
                                  Inactif
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex-1">
                            <Label>Type</Label>
                            <Select
                              value={parentFilter}
                              onValueChange={(v) => setParentFilter(v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="parent">
                                  Catégories parentes
                                </SelectItem>
                                <SelectItem value="child">
                                  Sous-catégories
                                </SelectItem>
                                {parentCategories.map((cat) => (
                                  <SelectItem
                                    key={cat.id}
                                    value={cat.id.toString()}
                                  >
                                    Enfants de: {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-end">
                            <Button
                              variant="outline"
                              onClick={() => {
                                resetFilters();
                                setOpenFilters(false);
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Réinitialiser
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {filteredCategories.length} catégorie
                    {filteredCategories.length > 1 ? "s" : ""} trouvée
                    {filteredCategories.length > 1 ? "s" : ""}
                    {activeFiltersCount > 0 &&
                      ` (${activeFiltersCount} filtre${
                        activeFiltersCount > 1 ? "s" : ""
                      } actif${activeFiltersCount > 1 ? "s" : ""})`}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categories Table */}
            <Card>
              <CardHeader>
                <CardTitle>Liste des catégories</CardTitle>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-300">
                      Chargement des catégories...
                    </p>
                  </div>
                ) : fetchError ? (
                  <div className="text-center py-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-red-600 font-medium mb-2">Erreur</p>
                      <p className="text-red-500 text-sm mb-4">{fetchError}</p>
                      <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="bg-transparent"
                      >
                        Réessayer
                      </Button>
                    </div>
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div className="text-center py-12">
                    <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2 dark:text-gray-300">
                      Aucune catégorie trouvée
                    </p>
                    {activeFiltersCount > 0 ? (
                      <Button
                        variant="outline"
                        onClick={resetFilters}
                        className="mt-2 bg-transparent"
                      >
                        Réinitialiser les filtres
                      </Button>
                    ) : categories.length === 0 ? (
                      <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Créer votre première catégorie
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Parent</TableHead>
                          <TableHead>Produits</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoriesToDisplay.map((category) => {
                          const hasChildren = filteredCategories.some(
                            (cat) => cat.parent_id === category.id
                          );
                          const isExpanded = expandedCategories.has(
                            category.id
                          );

                          return (
                            <TableRow key={category.id}>
                              <TableCell>
                                <div
                                  className="flex items-center gap-2"
                                  style={{
                                    marginLeft: `${
                                      (category.level || 0) * 24
                                    }px`,
                                  }}
                                >
                                  {hasChildren && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        toggleCategoryExpansion(category.id)
                                      }
                                      className="h-6 w-6 p-0"
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="h-3 w-3" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                                  {!hasChildren && <div className="w-6" />}
                                  <div className="flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium">
                                      {category.name}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="max-w-xs truncate">
                                  {category.description || "—"}
                                </div>
                              </TableCell>

                              <TableCell>
                                {getTypeBadge(category.parent_id)}
                              </TableCell>

                              <TableCell>
                                {category.parent_name || "—"}
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="min-w-[60px] justify-center"
                                >
                                  {category.product_count}
                                </Badge>
                              </TableCell>

                              <TableCell>
                                {getStatusBadge(category.status)}
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditCategory(category)}
                                    aria-label={`Modifier ${category.name}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Supprimer ${category.name}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Supprimer la catégorie
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Êtes-vous sûr de vouloir supprimer la
                                          catégorie{" "}
                                          <strong>"{category.name}"</strong> ?
                                          {category.product_count > 0 && (
                                            <div className="mt-2 text-red-600 font-medium">
                                              ⚠️ Attention : Cette catégorie
                                              contient {category.product_count}{" "}
                                              produit(s)
                                            </div>
                                          )}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Annuler
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteCategory(category.id)
                                          }
                                          className="bg-red-600 hover:bg-red-700"
                                          disabled={
                                            isDeletingId === category.id
                                          }
                                        >
                                          {isDeletingId === category.id
                                            ? "Suppression..."
                                            : "Supprimer"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifier la catégorie</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nom *</Label>
                <Input
                  id="edit-name"
                  value={editCategory.name}
                  onChange={(e) =>
                    setEditCategory((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Nom de la catégorie"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editCategory.description}
                  onChange={(e) =>
                    setEditCategory((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Description de la catégorie"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-parent">Catégorie parente</Label>
                  <Select
                    value={editCategory.parent_id?.toString() || "none"}
                    onValueChange={(value) =>
                      setEditCategory((p) => ({
                        ...p,
                        parent_id: value === "none" ? null : parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucune (catégorie parente)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        Aucune (catégorie parente)
                      </SelectItem>
                      {parentCategories
                        .filter(
                          (cat) =>
                            !editingCategory || cat.id !== editingCategory.id
                        )
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Statut</Label>
                  <Select
                    value={editCategory.status}
                    onValueChange={(value: "active" | "inactive") =>
                      setEditCategory((p) => ({ ...p, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !isEditFormValid}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    "Sauvegarder"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
