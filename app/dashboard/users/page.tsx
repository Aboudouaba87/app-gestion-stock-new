"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Shield,
  User,
  Mail,
  Phone,
  X,
  Warehouse,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/dashboard/components/ui/alert-dialog";
import { Label } from "@/app/dashboard/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/dashboard/components/ui/select";
import { Switch } from "@/app/dashboard/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/dashboard/components/ui/collapsible";

import { AppUser, NewUser, EditUser } from "../types/user";
import { RoleGuard } from "../components/auth/role-guard";

// Types locaux (ajuste si tu as déjà Role ailleurs)
type Role = {
  value: string;
  label: string;
  color?: string; // classe CSS éventuelle
};

type Warehouse = {
  id: number;
  label: string;
  value?: string; // optionnel si ton API le renvoie
};

/* ---------- small helpers/hooks ---------- */
function useDebounce<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/* ---------- main component ---------- */
export default function UsersPage() {
  const { toast } = useToast();

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);

  // Data state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Dialog state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form state
  const [newUser, setNewUser] = useState<NewUser>({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "",
    warehouse: "", // ✅ pas null
    warehouse_id: 0, // ✅ pas null
    status: true,
    lastlogin: null,
  });

  const [editUser, setEditUser] = useState<EditUser>({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "",
    warehouse: "",
    status: true,
    warehouse_id: 0,
  });

  // Flags
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  /* ---------- fetch roles ---------- */
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch("/api/roles", { cache: "no-store" });
        if (!res.ok) throw new Error("Erreur API rôles");
        const data: Role[] = await res.json();
        setRoles(data);
      } catch (err) {
        console.error("Erreur fetch roles :", err);
        toast({
          title: "Erreur",
          description: "Impossible de charger les rôles",
          variant: "destructive",
        });
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, [toast]);

  /* ---------- fetch warehouses ---------- */
  const loadWarehouses = useCallback(async () => {
    try {
      const res = await fetch("/api/warehouses", { cache: "no-store" });
      if (!res.ok) throw new Error(`Erreur API entrepôts ${res.status}`);
      const data: Warehouse[] = await res.json();
      setWarehouses(data);
    } catch (err: any) {
      console.error("Erreur fetch warehouses:", err);
      toast({
        title: "Erreur",
        description: err.message || "Erreur lors du chargement des entrepôts",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  /* ---------- load users (with AbortController) ---------- */
  useEffect(() => {
    const ac = new AbortController();
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const res = await fetch("/api/users", { signal: ac.signal });
        if (!res.ok) throw new Error("Erreur au chargement des utilisateurs");
        const data: AppUser[] = await res.json();
        if (!mounted) return;
        setUsers(data);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Fetch users error:", err);
        setFetchError(err.message ?? "Erreur serveur");
        toast({
          title: "Erreur",
          description: "Impossible de charger la liste",
          variant: "destructive",
        });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
      ac.abort();
    };
  }, [toast]);

  /* ---------- memoized filtered users & stats ---------- */
  const debouncedSearch = useDebounce(searchTerm, 250);

  const filteredUsers = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.phone.includes(q);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, debouncedSearch, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const admins = users.filter((u) => u.role === "admin").length;
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const todayConnected = users.filter(
      (u) => u.lastlogin && u.lastlogin.startsWith(today)
    ).length;
    return { total, active, admins, todayConnected };
  }, [users]);

  const activeFiltersCount =
    (searchTerm ? 1 : 0) +
    (roleFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
    toast({
      title: "Filtres réinitialisés",
      description: "Tous les filtres ont été effacés",
    });
  }, [toast]);

  /* ---------- helpers ---------- */
  const getRoleBadge = useCallback(
    (role: string) => {
      const roleInfo = roles.find((r) => r.value === role);
      return (
        <Badge className={roleInfo?.color}>{roleInfo?.label ?? role}</Badge>
      );
    },
    [roles]
  );

  const getStatusBadge = useCallback((status: string) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-800">Actif</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Inactif</Badge>
    );
  }, []);

  const formatDate = (targetDate1?: string | null): string | null => {
    if (!targetDate1) return null;
    const targetDate = new Date(targetDate1);
    const today = new Date();
    const daysOnly = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays =
      (daysOnly(targetDate) - daysOnly(today)) / (1000 * 60 * 60 * 24);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === -1) return "Hier";
    if (diffDays >= -6 && diffDays <= -2) {
      return targetDate.toLocaleDateString("fr-FR", { weekday: "long" });
    }
    return targetDate.toLocaleDateString("fr-FR");
  };

  /* ---------- create user ---------- */
  const isCreateFormValid = useMemo(() => {
    return (
      newUser.name.trim() !== "" &&
      newUser.email.trim() !== "" &&
      isValidEmail(newUser.email) &&
      newUser.phone.trim() !== "" &&
      newUser.role !== "" &&
      newUser.warehouse_id !== 0 // ✅ vérifie bien l’ID
    );
  }, [newUser]);

  const handleCreateUser = useCallback(async () => {
    if (!isCreateFormValid) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir correctement le formulaire",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      phone: newUser.phone,
      role: newUser.role,
      warehouse: newUser.warehouse,
      warehouse_id: newUser.warehouse_id,
      status: newUser.status ? "active" : "inactive",
    };

    setIsCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur" }));
        throw new Error(err.error || "Échec de la création");
      }
      const created: AppUser = await res.json();

      // Reload to reflect server state
      try {
        const resUsers = await fetch("/api/users");
        if (!resUsers.ok)
          throw new Error("Erreur au rechargement des utilisateurs");
        const data: AppUser[] = await resUsers.json();
        setUsers(data);
      } catch (err) {
        console.error("Reload users error:", err);
      }

      // Reset form
      setNewUser({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "",
        warehouse: "",
        status: true,
        lastlogin: null,
        warehouse_id: 0,
      });
      setIsCreateModalOpen(false);

      toast({
        title: "Utilisateur créé",
        description: `${created.name} ajouté`,
      });
    } catch (err: any) {
      console.error("Create user error:", err);
      toast({
        title: "Erreur",
        description: err.message ?? "Impossible de créer",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }, [isCreateFormValid, newUser, toast]);

  /* ---------- edit user ---------- */
  const handleEditUser = useCallback(
    (user: AppUser) => {
      setEditingUser(user);

      // Trouver l'entrepôt correspondant pour initialiser warehouse_id et label
      const wMatch = warehouses.find((w) => w.label === user.warehouse);
      console.log();

      setEditUser({
        name: user.name ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        role: user.role ?? "",
        warehouse: wMatch?.label ?? user.warehouse ?? "",
        status: user.status === "active",
        password: "",
        warehouse_id: wMatch?.id ?? 0,
      });
      setIsEditModalOpen(true);
    },
    [warehouses]
  );

  const isEditFormValid = useMemo(() => {
    const name = editUser.name ?? "";
    const email = editUser.email ?? "";
    const phone = editUser.phone ?? "";
    const role = editUser.role ?? "";
    const warehouse = editUser.warehouse ?? "";
    const warehouse_id = editUser.warehouse_id ?? 0;

    return (
      name.trim() !== "" &&
      email.trim() !== "" &&
      phone.trim() !== "" &&
      role !== "" &&
      warehouse !== "" &&
      warehouse_id !== 0 &&
      isValidEmail(email)
    );
  }, [editUser]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingUser) return;

    if (!isEditFormValid) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir correctement le formulaire",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: editingUser.id,
        name: editUser.name,
        email: editUser.email,
        password: editUser.password,
        phone: editUser.phone,
        role: editUser.role,
        warehouse: editUser.warehouse,
        warehouse_id: editUser.warehouse_id,
        status: editUser.status ? "active" : "inactive",
      };

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur" }));
        throw new Error(err.error || "Échec de la mise à jour");
      }

      const updated: AppUser = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setIsEditModalOpen(false);
      setEditingUser(null);

      toast({
        title: "Utilisateur modifié",
        description: `${updated.name} mis à jour`,
      });
    } catch (err: any) {
      console.error("Save edit error:", err);
      toast({
        title: "Erreur",
        description: err.message ?? "Impossible de modifier",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editingUser, editUser, toast, isEditFormValid]);

  /* ---------- delete user (optimistic) ---------- */
  const handleDeleteUser = useCallback(
    async (id: number) => {
      const toRemove = users.find((u) => u.id === id);
      if (!toRemove) return;

      const previous = users;
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setIsDeletingId(id);

      try {
        const res = await fetch("/api/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erreur" }));
          throw new Error(err.error || "Échec suppression");
        }
        const deleted: AppUser = await res.json();
        toast({ title: "Supprimé", description: `${deleted.name} supprimé` });
      } catch (err: any) {
        console.error("Delete error:", err);
        setUsers(previous); // rollback
        toast({
          title: "Erreur",
          description: err.message ?? "Impossible de supprimer",
          variant: "destructive",
        });
      } finally {
        setIsDeletingId(null);
      }
    },
    [users, toast]
  );

  console.log("warehouse est : ", newUser.warehouse);
  console.log("warehouse id est : ", newUser.warehouse_id);
  console.log("les warehouses sont : ", warehouses);

  /* ---------- JSX ---------- */
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4 dark:bg-gray-900 ">
            <div className="flex-1 md:flex items-center justify-between">
              <div className="ml-10 lg:ml-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-300">
                  Utilisateurs
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Gérez les accès et permissions
                </p>
              </div>

              <Dialog
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
              >
                <div className="flex  justify-center justify-items-end mt-1 lg:mt-0">
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvel utilisateur
                    </Button>
                  </DialogTrigger>
                </div>

                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Nom *
                      </Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) =>
                          setNewUser((p) => ({ ...p, name: e.target.value }))
                        }
                        className="col-span-3"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser((p) => ({ ...p, email: e.target.value }))
                        }
                        className="col-span-3"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="password" className="text-right">
                        Mot de passe *
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser((p) => ({
                            ...p,
                            password: e.target.value,
                          }))
                        }
                        className="col-span-3"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone" className="text-right">
                        Téléphone *
                      </Label>
                      <Input
                        id="phone"
                        value={newUser.phone}
                        onChange={(e) =>
                          setNewUser((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="col-span-3"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role" className="text-right">
                        Rôle *
                      </Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value) =>
                          setNewUser((p) => ({ ...p, role: value }))
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="warehouse" className="text-right">
                        Entrepôt *
                      </Label>
                      <Select
                        value={
                          newUser.warehouse_id
                            ? JSON.stringify({
                                id: newUser.warehouse_id, // ✅ même clé que dans SelectItem
                                name: newUser.warehouse, // ✅ même clé que dans SelectItem
                              })
                            : ""
                        }
                        onValueChange={(v) => {
                          const parsed = JSON.parse(v);
                          setNewUser((f) => ({
                            ...f,
                            warehouse: parsed.name,
                            warehouse_id: parsed.id,
                          }));
                        }}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Sélectionner un entrepôt" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((w) => (
                            <SelectContent>
                              {warehouses.map((c) => (
                                <SelectItem
                                  key={c.id}
                                  value={JSON.stringify({
                                    id: c.id,
                                    name: c.label,
                                  })}
                                >
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="active" className="text-right">
                        Actif
                      </Label>
                      <Switch
                        id="active"
                        checked={newUser.status}
                        onCheckedChange={(checked) =>
                          setNewUser((p) => ({
                            ...p,
                            status: Boolean(checked),
                          }))
                        }
                        className="col-span-3"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateModalOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleCreateUser}
                        disabled={isCreating || !isCreateFormValid}
                        className={
                          !isCreateFormValid
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }
                      >
                        {isCreating ? "Création..." : "Créer"}
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
                        Total utilisateurs
                      </p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Actifs
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
                        Administrateurs
                      </p>
                      <p className="text-2xl font-bold">{stats.admins}</p>
                    </div>
                    <Shield className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Connectés aujourd'hui
                      </p>
                      <p className="text-2xl font-bold">
                        {stats.todayConnected}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <div className="h-4 w-4 bg-purple-600 rounded-full"></div>
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
                          placeholder="Rechercher par nom, email ou téléphone."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Collapsible open={open} onOpenChange={setOpen}>
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
                            <Label>Rôle</Label>
                            <Select
                              value={roleFilter}
                              onValueChange={(v) => setRoleFilter(v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tous</SelectItem>
                                {roles.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

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

                          <div className="flex items-end">
                            <Button
                              variant="outline"
                              onClick={() => {
                                resetFilters();
                                setOpen(false);
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
                    {filteredUsers.length} utilisateur
                    {filteredUsers.length > 1 ? "s" : ""} trouvé
                    {activeFiltersCount > 0 &&
                      ` (${activeFiltersCount} filtre${
                        activeFiltersCount > 1 ? "s" : ""
                      } actif${activeFiltersCount > 1 ? "s" : ""})`}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Liste des utilisateurs</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Chargement...</div>
                ) : fetchError ? (
                  <div className="text-center py-8 text-red-600">
                    Erreur: {fetchError}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4 dark:text-gray-200" />
                    <p className="text-gray-500 dark:text-gray-300">
                      Aucun utilisateur trouvé
                    </p>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="outline"
                        onClick={resetFilters}
                        className="mt-2 bg-transparent"
                      >
                        Réinitialiser les filtres
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <Table className="min-w-[900px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Utilisateur</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="table-cell">
                              Téléphone
                            </TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead className="table-cell">
                              Entrepôt
                            </TableHead>
                            <TableHead className="table-cell">Statut</TableHead>
                            <TableHead className="table-cell">
                              Dernière connexion
                            </TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <span className="font-medium">
                                    {user.name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-gray-400 dark:text-gray-200" />
                                  <span className="truncate max-w-[220px] block">
                                    {user.email}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="table-cell">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-gray-400 dark:text-gray-200" />
                                  <span>{user.phone}</span>
                                </div>
                              </TableCell>
                              <TableCell>{getRoleBadge(user.role)}</TableCell>
                              <TableCell className="table-cell">
                                {user.warehouse}
                              </TableCell>
                              <TableCell className="table-cell">
                                {getStatusBadge(user.status)}
                              </TableCell>
                              <TableCell className="table-cell text-sm text-gray-600 dark:text-gray-300">
                                {formatDate(user.lastlogin) ?? "Jamais"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditUser(user)}
                                    aria-label={`Modifier ${user.name}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Supprimer ${user.name}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Supprimer l'utilisateur
                                        </AlertDialogTitle>
                                        <div className="text-sm">
                                          Êtes-vous sûr de vouloir supprimer{" "}
                                          <strong>{user.name}</strong> ?
                                        </div>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Annuler
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteUser(user.id)
                                          }
                                          className="bg-red-600 hover:bg-red-700"
                                          disabled={isDeletingId === user.id}
                                        >
                                          {isDeletingId === user.id
                                            ? "Suppression..."
                                            : "Supprimer"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </main>
        </div>

        {/* Edit dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Nom *
                </Label>
                <Input
                  id="edit-name"
                  value={editUser.name}
                  onChange={(e) =>
                    setEditUser((p) => ({ ...p, name: e.target.value }))
                  }
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email *
                </Label>
                <Input
                  id="edit-email"
                  value={editUser.email}
                  onChange={(e) =>
                    setEditUser((p) => ({ ...p, email: e.target.value }))
                  }
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">
                  Téléphone *
                </Label>
                <Input
                  id="edit-phone"
                  value={editUser.phone}
                  onChange={(e) =>
                    setEditUser((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Rôle *</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(v) => setEditUser((p) => ({ ...p, role: v }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Entrepôt *</Label>
                <Select
                  value={
                    editUser.warehouse_id ? String(editUser.warehouse_id) : ""
                  }
                  onValueChange={(value) => {
                    const id = Number(value);
                    const w = warehouses.find((wh) => wh.id === id);
                    setEditUser((p) => ({
                      ...p,
                      warehouse_id: id,
                      warehouse: w?.label ?? "",
                    }));
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Sélectionner un entrepôt" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Actif</Label>
                <Switch
                  checked={editUser.status}
                  onCheckedChange={(c) =>
                    setEditUser((p) => ({ ...p, status: Boolean(c) }))
                  }
                  className="col-span-3"
                />
              </div>

              <div className="flex justify-end space-x-2">
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
                  {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
