"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface User {
  id: number
  name: string
  email: string
  phone: string
  role: string
  warehouse: string
  status: "active" | "inactive"
  lastLogin: string
}

const users: User[] = [
  {
    id: 1,
    name: "Jean Dupont",
    email: "jean.dupont@stockpro.com",
    phone: "+33 1 23 45 67 89",
    role: "admin",
    warehouse: "Entrepôt Principal",
    status: "active",
    lastLogin: "2024-01-15 14:30",
  },
  {
    id: 2,
    name: "Marie Martin",
    email: "marie.martin@stockpro.com",
    phone: "+33 1 23 45 67 90",
    role: "manager",
    warehouse: "Entrepôt Sud",
    status: "active",
    lastLogin: "2024-01-15 09:15",
  },
  {
    id: 3,
    name: "Pierre Durand",
    email: "pierre.durand@stockpro.com",
    phone: "+33 1 23 45 67 91",
    role: "employee",
    warehouse: "Entrepôt Nord",
    status: "inactive",
    lastLogin: "2024-01-10 16:45",
  },
]

const roles = [
  { value: "admin", label: "Administrateur", color: "bg-red-100 text-red-800" },
  { value: "manager", label: "Gestionnaire", color: "bg-blue-100 text-blue-800" },
  { value: "employee", label: "Employé", color: "bg-green-100 text-green-800" },
  { value: "viewer", label: "Lecteur", color: "bg-gray-100 text-gray-800" },
]

export default function UsersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    warehouse: "",
    status: "active" as "active" | "inactive",
  })

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role: string) => {
    const roleInfo = roles.find((r) => r.value === role)
    return <Badge className={roleInfo?.color}>{roleInfo?.label}</Badge>
  }

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-800">✅ Actif</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">❌ Inactif</Badge>
    )
  }

  const handleCreateUser = () => {
    if (!newUser.name || !newUser.email || !newUser.role || !newUser.warehouse) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    toast.success("Utilisateur créé avec succès")
    setIsCreateModalOpen(false)
    setNewUser({ name: "", email: "", phone: "", role: "", warehouse: "", status: "active" })
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
                ☰
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
                <p className="text-sm text-gray-500">Gérez les accès et permissions</p>
              </div>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>➕ Nouvel utilisateur</Button>
              </DialogTrigger>
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
                      className="col-span-3"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      className="col-span-3"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">
                      Téléphone
                    </Label>
                    <Input
                      id="phone"
                      className="col-span-3"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Rôle *
                    </Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
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
                      value={newUser.warehouse}
                      onValueChange={(value) => setNewUser({ ...newUser, warehouse: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Sélectionner un entrepôt" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Entrepôt Principal</SelectItem>
                        <SelectItem value="south">Entrepôt Sud</SelectItem>
                        <SelectItem value="north">Entrepôt Nord</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="active" className="text-right">
                      Actif
                    </Label>
                    <Switch
                      id="active"
                      className="col-span-3"
                      checked={newUser.status === "active"}
                      onCheckedChange={(checked) => setNewUser({ ...newUser, status: checked ? "active" : "inactive" })}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateUser}>Créer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total utilisateurs</p>
                      <p className="text-2xl font-bold">24</p>
                    </div>
                    <span className="text-2xl">👥</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Actifs</p>
                      <p className="text-2xl font-bold">21</p>
                    </div>
                    <span className="text-2xl">✅</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Administrateurs</p>
                      <p className="text-2xl font-bold">3</p>
                    </div>
                    <span className="text-2xl">🛡️</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Connectés aujourd'hui</p>
                      <p className="text-2xl font-bold">18</p>
                    </div>
                    <span className="text-2xl">🟢</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="🔍 Rechercher un utilisateur..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrer par rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les rôles</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">👥 Liste des utilisateurs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Entrepôt</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Dernière connexion</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm">👤</span>
                            </div>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">📧</span>
                            <span>{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">📞</span>
                            <span>{user.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{user.warehouse}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-sm text-gray-600">{user.lastLogin}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              ✏️
                            </Button>
                            <Button variant="ghost" size="sm">
                              🗑️
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
