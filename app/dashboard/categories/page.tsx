"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
  Package,
  Grid3X3,
  BarChart3,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/dashboard/components/ui/tooltip";
import { Skeleton } from "@/app/dashboard/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/dashboard/components/ui/pagination";

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

// Hook pour le debounce optimisé
function useDebounce<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debounced;
}

// Hook personnalisé pour les catégories
function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Erreur au chargement des catégories");
      const data: Category[] = await res.json();
      setCategories(data);
    } catch (err: any) {
      console.error("Fetch categories error:", err);
      setError(err.message ?? "Erreur serveur");
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des catégories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { categories, isLoading, error, loadCategories, setCategories };
}

export default function CategoriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [parentFilter, setParentFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { categories, isLoading, error, loadCategories, setCategories } =
    useCategories();
  const { toast } = useToast();

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

  // Charger les catégories au montage
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /* ---------- Filtrage et recherche ---------- */
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

  /* ---------- Pagination ---------- */
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  /* ---------- Statistiques ---------- */
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.status === "active").length;
    const parentCategories = categories.filter(
      (c) => c.parent_id === null
    ).length;
    const totalProducts = categories.reduce(
      (sum, cat) => sum + (cat.product_count || 0),
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
    setCurrentPage(1);
    toast({
      title: "Filtres réinitialisés",
      description: "Tous les filtres ont été effacés",
    });
  }, [toast]);

  /* ---------- Badges ---------- */
  const getStatusBadge = useCallback((status: string) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-800 border-0 hover:bg-green-200">
        Actif
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 border-0 hover:bg-gray-200">
        Inactif
      </Badge>
    );
  }, []);

  const getTypeBadge = useCallback((parentId: number | null) => {
    return parentId === null ? (
      <Badge className="bg-blue-100 text-blue-800 border-0 hover:bg-blue-200">
        Parent
      </Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-800 border-0 hover:bg-purple-200">
        Enfant
      </Badge>
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

      const createdCategory = await res.json();

      // Optimistic update
      setCategories((prev) => [...prev, createdCategory]);

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
  }, [isCreateFormValid, newCategory, toast, setCategories]);

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

      const updatedData = await res.json();

      // Optimistic update
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === editingCategory.id ? updatedData.category : cat
        )
      );

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
  }, [editingCategory, editCategory, toast, isEditFormValid, setCategories]);

  /* ---------- Supprimer une catégorie ---------- */
  const handleDeleteCategory = useCallback(
    async (id: number) => {
      const toRemove = categories.find((c) => c.id === id);
      if (!toRemove) return;

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
    [categories, toast, setCategories]
  );

  /* ---------- Rendu des lignes de catégories ---------- */
  const renderCategoryRows = useCallback(() => {
    const addCategory = (
      category: Category,
      level = 0,
      result: (Category & { level: number })[] = []
    ) => {
      result.push({ ...category, level });

      if (expandedCategories.has(category.id)) {
        const children = paginatedCategories.filter(
          (cat) => cat.parent_id === category.id
        );
        children.forEach((child) => addCategory(child, level + 1, result));
      }

      return result;
    };

    const parentCats = paginatedCategories.filter(
      (cat) => cat.parent_id === null
    );

    const allCategories: (Category & { level: number })[] = [];
    parentCats.forEach((cat) => addCategory(cat, 0, allCategories));

    return allCategories.map((category) => {
      const hasChildren = paginatedCategories.some(
        (cat) => cat.parent_id === category.id
      );
      const isExpanded = expandedCategories.has(category.id);

      return (
        <TableRow key={category.id}>
          <TableCell>
            <div
              className="flex items-center gap-2 min-h-[44px]"
              style={{
                marginLeft: `${(category.level || 0) * 24}px`,
              }}
            >
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleCategoryExpansion(category.id)}
                  className="h-8 w-8 p-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!hasChildren && <div className="w-8" />}
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-400" />
                <span className="font-medium truncate max-w-[200px]">
                  {category.name}
                </span>
              </div>
            </div>
          </TableCell>

          <TableCell>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="max-w-[200px] truncate cursor-help">
                    {category.description || "—"}
                  </div>
                </TooltipTrigger>
                {category.description && (
                  <TooltipContent>
                    <p className="max-w-xs">{category.description}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </TableCell>

          <TableCell>{getTypeBadge(category.parent_id)}</TableCell>

          <TableCell>
            <span className="truncate max-w-[150px] block">
              {category.parent_name || "—"}
            </span>
          </TableCell>

          <TableCell>
            <Badge
              variant="outline"
              className="min-w-[60px] justify-center bg-gray-50"
            >
              {category.product_count}
            </Badge>
          </TableCell>

          <TableCell>{getStatusBadge(category.status)}</TableCell>

          <TableCell>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCategory(category)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Modifier</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:text-red-600"
                    disabled={category.product_count > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer la catégorie</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir supprimer la catégorie{" "}
                      <strong className="font-semibold">
                        "{category.name}"
                      </strong>{" "}
                      ?
                      {category.product_count > 0 && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-red-700 font-medium">
                            ⚠️ Impossible de supprimer : Cette catégorie
                            contient {category.product_count} produit(s)
                          </p>
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteCategory(category.id)}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={
                        isDeletingId === category.id ||
                        category.product_count > 0
                      }
                    >
                      {isDeletingId === category.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Suppression...
                        </>
                      ) : (
                        "Supprimer"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  }, [
    paginatedCategories,
    expandedCategories,
    toggleCategoryExpansion,
    getTypeBadge,
    handleEditCategory,
    handleDeleteCategory,
    isDeletingId,
  ]);

  // Skeleton pour le chargement
  const renderSkeleton = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-[200px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[150px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[100px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-12" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-16" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <TooltipProvider>
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
          <Sidebar />

          <div className="flex-1 md:flex flex-col overflow-auto">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
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
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle catégorie
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Créer une nouvelle catégorie</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">
                          Nom <span className="text-red-500">*</span>
                        </Label>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          className="bg-blue-600 hover:bg-blue-700"
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
            <main className="flex-1 p-4 md:p-6">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="dark:bg-gray-800">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          Total catégories
                        </p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                      </div>
                      <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Tag className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          Actives
                        </p>
                        <p className="text-2xl font-bold">{stats.active}</p>
                      </div>
                      <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          Catégories parentes
                        </p>
                        <p className="text-2xl font-bold">
                          {stats.parentCategories}
                        </p>
                      </div>
                      <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                        <Grid3X3 className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          Produits total
                        </p>
                        <p className="text-2xl font-bold">
                          {stats.totalProducts}
                        </p>
                      </div>
                      <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card className="mb-6 dark:bg-gray-800">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Rechercher par nom ou description"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 dark:bg-gray-700"
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
                            className="relative dark:bg-gray-700"
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
                          <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex-1">
                              <Label>Statut</Label>
                              <Select
                                value={statusFilter}
                                onValueChange={(v) => {
                                  setStatusFilter(v);
                                  setCurrentPage(1);
                                }}
                              >
                                <SelectTrigger className="dark:bg-gray-600">
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
                                onValueChange={(v) => {
                                  setParentFilter(v);
                                  setCurrentPage(1);
                                }}
                              >
                                <SelectTrigger className="dark:bg-gray-600">
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
                                onClick={resetFilters}
                                className="dark:bg-gray-600"
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
                      {filteredCategories.length !== 1 ? "s" : ""} trouvée
                      {filteredCategories.length !== 1 ? "s" : ""}
                      {activeFiltersCount > 0 &&
                        ` (${activeFiltersCount} filtre${
                          activeFiltersCount !== 1 ? "s" : ""
                        } actif${activeFiltersCount !== 1 ? "s" : ""})`}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Categories Table */}
              <Card className="dark:bg-gray-800">
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
                  ) : error ? (
                    <div className="text-center py-8">
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto">
                        <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                          Erreur
                        </p>
                        <p className="text-red-500 dark:text-red-300 text-sm mb-4">
                          {error}
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => loadCategories()}
                          className="dark:bg-gray-700"
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
                          className="mt-2 dark:bg-gray-700"
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
                    <>
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow className="dark:border-gray-700">
                              <TableHead>Nom</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Parent</TableHead>
                              <TableHead>Produits</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead className="w-[100px]">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>{renderCategoryRows()}</TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="mt-6">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() =>
                                    setCurrentPage((prev) =>
                                      Math.max(1, prev - 1)
                                    )
                                  }
                                  className={
                                    currentPage === 1
                                      ? "pointer-events-none opacity-50"
                                      : ""
                                  }
                                />
                              </PaginationItem>

                              {Array.from(
                                { length: Math.min(5, totalPages) },
                                (_, i) => {
                                  const pageNum = i + 1;
                                  return (
                                    <PaginationItem key={pageNum}>
                                      <PaginationLink
                                        isActive={currentPage === pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                      >
                                        {pageNum}
                                      </PaginationLink>
                                    </PaginationItem>
                                  );
                                }
                              )}

                              <PaginationItem>
                                <PaginationNext
                                  onClick={() =>
                                    setCurrentPage((prev) =>
                                      Math.min(totalPages, prev + 1)
                                    )
                                  }
                                  className={
                                    currentPage === totalPages
                                      ? "pointer-events-none opacity-50"
                                      : ""
                                  }
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Page {currentPage} sur {totalPages}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </main>
          </div>

          {/* Edit Dialog */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[500px] dark:bg-gray-800">
              <DialogHeader>
                <DialogTitle>Modifier la catégorie</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">
                    Nom <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    value={editCategory.name}
                    onChange={(e) =>
                      setEditCategory((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Nom de la catégorie"
                    className="dark:bg-gray-700"
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
                    className="dark:bg-gray-700"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <SelectTrigger className="dark:bg-gray-700">
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
                      <SelectTrigger className="dark:bg-gray-700">
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
                    className="dark:bg-gray-700"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={isSaving || !isEditFormValid}
                    className="bg-blue-600 hover:bg-blue-700"
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
      </TooltipProvider>
    </RoleGuard>
  );
}
