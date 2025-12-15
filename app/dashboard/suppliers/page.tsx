"use client";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  X,
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
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { RoleGuard } from "../components/auth/role-guard";

interface Supplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  products: number;
  status: "active" | "inactive";
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
    address: "",
    products: 0, // ← Ajoutez cette ligne
    status: "active" as "active" | "inactive",
  });

  const { toast } = useToast();

  // Charger les fournisseurs
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/suppliers");

      if (!res.ok) {
        throw new Error(
          `Erreur ${res.status}: Impossible de charger les fournisseurs`
        );
      }

      const data = await res.json();
      setSuppliers(data);
    } catch (error: any) {
      console.error("Erreur fetch suppliers:", error);
      setError(
        error.message ||
          "Une erreur est survenue lors du chargement des fournisseurs"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Créer un nouveau fournisseur
  const handleCreateSupplier = async () => {
    if (!newSupplier.name || !newSupplier.contact || !newSupplier.email) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSupplier),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erreur lors de la création");
      }

      // Recharger la liste
      await fetchSuppliers();

      // Reset form
      // Dans handleCreateSupplier, après la création réussie
      setNewSupplier({
        name: "",
        contact: "",
        email: "",
        phone: "",
        address: "",
        products: 0, // ← Reset à 0
        status: "active",
      });
      setIsCreateModalOpen(false);

      toast({
        title: "Succès",
        description: "Fournisseur créé avec succès",
      });
    } catch (error: any) {
      console.error("Erreur création fournisseur:", error);
      toast({
        title: "Erreur",
        description:
          error.message || "Erreur lors de la création du fournisseur",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Modifier un fournisseur
  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier({ ...supplier });
    setIsEditModalOpen(true);
  };

  // Supprimer un fournisseur
  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;

    if (
      !editingSupplier.name ||
      !editingSupplier.contact ||
      !editingSupplier.email
    ) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      // CORRECTION: Ajouter l'ID dans l'URL
      const res = await fetch(`/api/suppliers?id=${editingSupplier.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingSupplier),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erreur lors de la modification");
      }

      // Recharger la liste
      await fetchSuppliers();

      setIsEditModalOpen(false);
      setEditingSupplier(null);

      toast({
        title: "Succès",
        description: "Fournisseur modifié avec succès",
      });
    } catch (error: any) {
      console.error("Erreur modification fournisseur:", error);
      toast({
        title: "Erreur",
        description:
          error.message || "Erreur lors de la modification du fournisseur",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Supprimer un fournisseur - DÉJÀ CORRECT
  const handleDeleteSupplier = async (id: number) => {
    setActionLoading(true);
    try {
      // CORRECT: L'ID est déjà dans l'URL
      const res = await fetch(`/api/suppliers?id=${id}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erreur lors de la suppression");
      }

      // Recharger la liste
      await fetchSuppliers();

      toast({
        title: "Succès",
        description: "Fournisseur supprimé avec succès",
      });
    } catch (error: any) {
      console.error("Erreur suppression fournisseur:", error);
      toast({
        title: "Erreur",
        description:
          error.message || "Erreur lors de la suppression du fournisseur",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrage des fournisseurs
  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || supplier.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-800">Actif</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 dark:text-gray-400">
        Inactif
      </Badge>
    );
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setShowFilters(false);
  };

  // Gestion du loading
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Chargement des fournisseurs...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Gestion des erreurs
  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-white">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-auto">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4 dark:bg-gray-900 dark:text-white">
            <div className="flex-1 md:flex items-center justify-between">
              <div className="ml-10 lg:ml-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-300">
                  Fournisseurs
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Gérez vos partenaires commerciaux
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
                      Nouveau fournisseur
                    </Button>
                  </DialogTrigger>
                </div>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nouveau fournisseur</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {/* ... autres champs existants ... */}

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Nom *
                      </Label>
                      <Input
                        id="name"
                        value={newSupplier.name}
                        onChange={(e) =>
                          setNewSupplier({
                            ...newSupplier,
                            name: e.target.value,
                          })
                        }
                        className="col-span-3"
                        placeholder="Nom de l'entreprise"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="contact" className="text-right">
                        Contact *
                      </Label>
                      <Input
                        id="contact"
                        value={newSupplier.contact}
                        onChange={(e) =>
                          setNewSupplier({
                            ...newSupplier,
                            contact: e.target.value,
                          })
                        }
                        className="col-span-3"
                        placeholder="Nom du contact"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={newSupplier.email}
                        onChange={(e) =>
                          setNewSupplier({
                            ...newSupplier,
                            email: e.target.value,
                          })
                        }
                        className="col-span-3"
                        placeholder="email@exemple.com"
                      />
                    </div>

                    {/* AJOUT: Champ Nombre de produits */}
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="products" className="text-right">
                        Produits
                      </Label>
                      <Input
                        id="products"
                        type="number"
                        min="0"
                        value={newSupplier.products}
                        onChange={(e) =>
                          setNewSupplier({
                            ...newSupplier,
                            products: parseInt(e.target.value) || 0,
                          })
                        }
                        className="col-span-3"
                        placeholder="Nombre de produits fournis"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone" className="text-right">
                        Téléphone
                      </Label>
                      <Input
                        id="phone"
                        value={newSupplier.phone}
                        onChange={(e) =>
                          setNewSupplier({
                            ...newSupplier,
                            phone: e.target.value,
                          })
                        }
                        className="col-span-3"
                        placeholder="+33 1 23 45 67 89"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="address" className="text-right">
                        Adresse
                      </Label>
                      <Textarea
                        id="address"
                        value={newSupplier.address}
                        onChange={(e) =>
                          setNewSupplier({
                            ...newSupplier,
                            address: e.target.value,
                          })
                        }
                        className="col-span-3"
                        placeholder="Adresse complète"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="status" className="text-right">
                        Statut
                      </Label>
                      <Select
                        value={newSupplier.status}
                        onValueChange={(value: "active" | "inactive") =>
                          setNewSupplier({ ...newSupplier, status: value })
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Actif</SelectItem>
                          <SelectItem value="inactive">Inactif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                      disabled={actionLoading}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleCreateSupplier}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Création..." : "Créer"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Total fournisseurs
                      </p>
                      <p className="text-2xl font-bold">{suppliers.length}</p>
                    </div>
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <div className="h-4 w-4 bg-blue-600 rounded-full"></div>
                    </div>
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
                      <p className="text-2xl font-bold">
                        {suppliers.filter((s) => s.status === "active").length}
                      </p>
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
                        Inactifs
                      </p>
                      <p className="text-2xl font-bold">
                        {
                          suppliers.filter((s) => s.status === "inactive")
                            .length
                        }
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <div className="h-4 w-4 bg-gray-600 rounded-full"></div>
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
                        {suppliers.reduce((sum, s) => sum + s.products, 0)}
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
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 dark:text-gray-200" />
                      <Input
                        placeholder="Rechercher un fournisseur..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={showFilters ? "bg-blue-50 border-blue-200" : ""}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtres
                    {(statusFilter !== "all" || searchTerm) && (
                      <Badge variant="secondary" className="ml-2">
                        {[
                          statusFilter !== "all" ? 1 : 0,
                          searchTerm ? 1 : 0,
                        ].reduce((a, b) => a + b, 0)}
                      </Badge>
                    )}
                  </Button>
                  {(statusFilter !== "all" || searchTerm) && (
                    <Button variant="ghost" onClick={resetFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Réinitialiser
                    </Button>
                  )}
                </div>

                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="status-filter">Statut</Label>
                        <Select
                          value={statusFilter}
                          onValueChange={setStatusFilter}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              Tous les statuts
                            </SelectItem>
                            <SelectItem value="active">Actif</SelectItem>
                            <SelectItem value="inactive">Inactif</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suppliers Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Liste des fournisseurs
                  <Badge variant="secondary" className="ml-2">
                    {filteredSuppliers.length} résultat
                    {filteredSuppliers.length > 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Adresse</TableHead>
                      <TableHead>Produits</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">
                          {supplier.name}
                        </TableCell>
                        <TableCell>{supplier.contact}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400 dark:text-gray-200" />
                            <span>{supplier.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-400 dark:text-gray-200" />
                            <span>{supplier.phone || "Non renseigné"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="truncate max-w-[150px]">
                              {supplier.address || "Non renseignée"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{supplier.products}</TableCell>
                        <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSupplier(supplier)}
                              disabled={actionLoading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={actionLoading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Supprimer le fournisseur
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer{" "}
                                    {supplier.name} ? Cette action est
                                    irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={actionLoading}>
                                    Annuler
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteSupplier(supplier.id)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={actionLoading}
                                  >
                                    {actionLoading
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

                {filteredSuppliers.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-300">
                    <p>Aucun fournisseur trouvé</p>
                    <p className="text-sm">
                      Essayez de modifier vos critères de recherche
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifier le fournisseur</DialogTitle>
            </DialogHeader>
            {editingSupplier && (
              <div className="grid gap-4 py-4">
                {/* ... autres champs existants ... */}

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Nom *
                  </Label>
                  <Input
                    id="edit-name"
                    value={editingSupplier.name}
                    onChange={(e) =>
                      setEditingSupplier({
                        ...editingSupplier,
                        name: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-contact" className="text-right">
                    Contact *
                  </Label>
                  <Input
                    id="edit-contact"
                    value={editingSupplier.contact}
                    onChange={(e) =>
                      setEditingSupplier({
                        ...editingSupplier,
                        contact: e.target.value,
                      })
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
                    type="email"
                    value={editingSupplier.email}
                    onChange={(e) =>
                      setEditingSupplier({
                        ...editingSupplier,
                        email: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>

                {/* AJOUT: Champ Nombre de produits dans l'édition */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-products" className="text-right">
                    Produits
                  </Label>
                  <Input
                    id="edit-products"
                    type="number"
                    min="0"
                    value={editingSupplier.products}
                    onChange={(e) =>
                      setEditingSupplier({
                        ...editingSupplier,
                        products: parseInt(e.target.value) || 0,
                      })
                    }
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-phone" className="text-right">
                    Téléphone
                  </Label>
                  <Input
                    id="edit-phone"
                    value={editingSupplier.phone}
                    onChange={(e) =>
                      setEditingSupplier({
                        ...editingSupplier,
                        phone: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-address" className="text-right">
                    Adresse
                  </Label>
                  <Textarea
                    id="edit-address"
                    value={editingSupplier.address}
                    onChange={(e) =>
                      setEditingSupplier({
                        ...editingSupplier,
                        address: e.target.value,
                      })
                    }
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-status" className="text-right">
                    Statut
                  </Label>
                  <Select
                    value={editingSupplier.status}
                    onValueChange={(value: "active" | "inactive") =>
                      setEditingSupplier({ ...editingSupplier, status: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={actionLoading}
              >
                Annuler
              </Button>
              <Button onClick={handleUpdateSupplier} disabled={actionLoading}>
                {actionLoading ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
