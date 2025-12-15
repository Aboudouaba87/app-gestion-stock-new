"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Save,
  Bell,
  Shield,
  Database,
  Globe,
  Palette,
  Loader2,
  FileText,
  Calculator,
  Percent,
} from "lucide-react";
import { Button } from "@/app/dashboard/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/dashboard/components/ui/card";
import { Sidebar } from "@/app/dashboard/components/sidebar";
import { Input } from "@/app/dashboard/components/ui/input";
import { Label } from "@/app/dashboard/components/ui/label";
import { Switch } from "@/app/dashboard/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/dashboard/components/ui/select";
import { Textarea } from "@/app/dashboard/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/dashboard/components/ui/tabs";
import { RoleGuard } from "../components/auth/role-guard";
import { toast } from "sonner";
import currencies from "@/lib/currencies.json";

// Types correspondant à la structure de la base de données
interface CompanySettings {
  id?: number;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  currency: string;
  language: string;
  timezone: string;
  theme: string;
  low_stock_threshold: number;
  critical_stock_threshold: number;
  default_tax_rate: number;
  invoice_prefix: string;
  invoice_start_number: number;
}

interface NotificationSettings {
  id?: number;
  email_notifications: boolean;
  sms_notifications: boolean;
  low_stock_alerts: boolean;
  order_notifications: boolean;
  stock_alert_threshold: number;
}

interface BackupSettings {
  id?: number;
  auto_backup: boolean;
  backup_frequency: string;
  backup_time: string;
  retention_days: number;
}

interface SecuritySettings {
  id?: number;
  password_min_length: number;
  two_factor_auth_enabled: boolean;
  session_timeout_minutes: number;
}

// Valeurs par défaut
const defaultCompanySettings: CompanySettings = {
  company_name: "",
  company_email: "",
  company_phone: "",
  company_address: "",
  currency: "XOF",
  language: "fr",
  timezone: "Africa/Lome",
  theme: "light",
  low_stock_threshold: 10,
  critical_stock_threshold: 5,
  default_tax_rate: 20.0,
  invoice_prefix: "INV-",
  invoice_start_number: 1000,
};

const defaultNotificationSettings: NotificationSettings = {
  email_notifications: true,
  sms_notifications: false,
  low_stock_alerts: true,
  order_notifications: true,
  stock_alert_threshold: 10,
};

const defaultBackupSettings: BackupSettings = {
  auto_backup: true,
  backup_frequency: "daily",
  backup_time: "02:00",
  retention_days: 30,
};

const defaultSecuritySettings: SecuritySettings = {
  password_min_length: 8,
  two_factor_auth_enabled: false,
  session_timeout_minutes: 60,
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // États séparés pour chaque type de paramètre
  const [companySettings, setCompanySettings] = useState<CompanySettings>(
    defaultCompanySettings
  );
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(defaultNotificationSettings);
  const [backupSettings, setBackupSettings] = useState<BackupSettings>(
    defaultBackupSettings
  );
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(
    defaultSecuritySettings
  );
  const [tva, setTva] = useState(18);
  // États pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  console.log("Le currency est : ", currencies);

  // Récupérer le rôle de l'utilisateur
  const userRole = session?.user?.role || "user";
  console.log("L'utilisateur est : ", userRole);

  // Initialisation TVA
  useEffect(() => {
    const fetchTva = async () => {
      try {
        const res = await fetch("/api/tva", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Erreur API rôles");
        const data = await res.json();
        setTva(data[0].taux);
      } catch (err) {
        console.error("Erreur fetch categories :", err);
      } finally {
        // setLoadingCategories(false);
      }
    };
    fetchTva();
  }, []);
  // Charger les paramètres au montage
  useEffect(() => {
    if (status === "authenticated") {
      loadAllSettings();
    }
  }, [status]);

  // Ajoutez ce useEffect pour appliquer le thème
  useEffect(() => {
    // Appliquer le thème au document
    const html = document.documentElement;

    if (companySettings.theme === "dark") {
      html.classList.add("dark");
    } else if (companySettings.theme === "light") {
      html.classList.remove("dark");
    } else if (companySettings.theme === "auto") {
      // Thème automatique basé sur les préférences système
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (prefersDark) {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }

    console.log("Thème appliqué :", companySettings.theme);
  }, [companySettings.theme]); // Dépendance : s'exécute quand le thème change

  const loadAllSettings = async () => {
    try {
      setLoading(true);

      // Charger les paramètres de l'entreprise
      const companyRes = await fetch("/api/settings/company");
      if (companyRes.ok) {
        const data = await companyRes.json();
        setCompanySettings(data);
      } else {
        console.error(
          "Erreur chargement paramètres entreprise:",
          await companyRes.text()
        );
      }

      // Charger les paramètres de notifications
      const notificationsRes = await fetch("/api/settings/notifications");
      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        setNotificationSettings(data);
      }

      // Charger les paramètres de sauvegarde
      const backupRes = await fetch("/api/settings/backup");
      if (backupRes.ok) {
        const data = await backupRes.json();
        setBackupSettings(data);
      }

      // Charger les paramètres de sécurité
      const securityRes = await fetch("/api/settings/security");
      if (securityRes.ok) {
        const data = await securityRes.json();
        setSecuritySettings(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const saveCompanySettings = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companySettings),
      });

      if (res.ok) {
        toast.success("Paramètres de l'entreprise sauvegardés");
        return true;
      } else {
        const error = await res.text();
        throw new Error(error || "Erreur lors de la sauvegarde");
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleTva = async () => {
    // alert(`La valeure de la TVA est : ${tva}`);
    try {
      const payload = {
        tva: Number(tva),
      };
      const res = await fetch("/api/tva", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("TVA est modifier avec succès");
        return true;
      } else {
        throw new Error("Erreur lors de la modification");
      }
    } catch (error) {}
  };

  const saveNotificationSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationSettings),
      });

      if (res.ok) {
        toast.success("Paramètres de notifications sauvegardés");
        return true;
      } else {
        throw new Error("Erreur lors de la sauvegarde");
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveBackupSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupSettings),
      });

      if (res.ok) {
        toast.success("Paramètres de sauvegarde sauvegardés");
        return true;
      } else {
        throw new Error("Erreur lors de la sauvegarde");
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSecuritySettings = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(securitySettings),
      });

      if (res.ok) {
        toast.success("Paramètres de sécurité sauvegardés");
        return true;
      } else {
        throw new Error("Erreur lors de la sauvegarde");
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.requiresReLogin) {
          // Afficher un message et forcer la déconnexion
          toast.success(data.message || "Mot de passe changé avec succès", {
            duration: 5000,
            action: {
              label: "Se reconnecter",
              onClick: () => {
                signOut({ callbackUrl: "/login" });
              },
            },
          });

          // Réinitialiser le formulaire
          setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });

          // Option 1: Déconnexion automatique après 3 secondes
          setTimeout(() => {
            signOut({ callbackUrl: "/login" });
          }, 3000);

          // Option 2: Demander à l'utilisateur de se reconnecter manuellement
          // Laisser l'utilisateur cliquer sur le bouton dans le toast
        } else {
          toast.success("Mot de passe changé avec succès");
          setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        }
      } else {
        throw new Error(
          data.error || "Erreur lors du changement de mot de passe"
        );
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors du changement de mot de passe");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const results = await Promise.all([
      saveCompanySettings(),
      saveNotificationSettings(),
      saveBackupSettings(),
      saveSecuritySettings(),
    ]);

    if (results.every((result) => result)) {
      toast.success("Tous les paramètres ont été sauvegardés");
    }
  };

  const handleManualBackup = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings/backup", {
        // Utiliser POST sur la même route
        method: "POST",
      });

      if (res.ok) {
        toast.success("Sauvegarde manuelle lancée");
      } else {
        throw new Error("Erreur lors de la sauvegarde manuelle");
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Fuseaux horaires africains
  const africanTimezones = [
    "Africa/Abidjan",
    "Africa/Accra",
    "Africa/Addis_Ababa",
    "Africa/Algiers",
    "Africa/Asmara",
    "Africa/Bamako",
    "Africa/Bangui",
    "Africa/Banjul",
    "Africa/Bissau",
    "Africa/Blantyre",
    "Africa/Brazzaville",
    "Africa/Bujumbura",
    "Africa/Cairo",
    "Africa/Casablanca",
    "Africa/Ceuta",
    "Africa/Conakry",
    "Africa/Dakar",
    "Africa/Dar_es_Salaam",
    "Africa/Djibouti",
    "Africa/Douala",
    "Africa/El_Aaiun",
    "Africa/Freetown",
    "Africa/Gaborone",
    "Africa/Harare",
    "Africa/Johannesburg",
    "Africa/Juba",
    "Africa/Kampala",
    "Africa/Khartoum",
    "Africa/Kigali",
    "Africa/Kinshasa",
    "Africa/Lagos",
    "Africa/Libreville",
    "Africa/Lome",
    "Africa/Luanda",
    "Africa/Lubumbashi",
    "Africa/Lusaka",
    "Africa/Malabo",
    "Africa/Maputo",
    "Africa/Maseru",
    "Africa/Mbabane",
    "Africa/Mogadishu",
    "Africa/Monrovia",
    "Africa/Nairobi",
    "Africa/Ndjamena",
    "Africa/Niamey",
    "Africa/Nouakchott",
    "Africa/Ouagadougou",
    "Africa/Porto-Novo",
    "Africa/Sao_Tome",
    "Africa/Tripoli",
    "Africa/Tunis",
    "Africa/Windhoek",
  ];

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Chargement des paramètres...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-auto">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4 dark:bg-gray-900">
            <div className="flex-1 md:flex items-center justify-between">
              <div className="ml-10 lg:ml-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-300">
                  Paramètres
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Configurez votre application
                </p>
              </div>
              <div className="px-4">
                <Button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 min-w-full"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? "Sauvegarde..." : "Sauvegarder tout"}
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <Tabs
              defaultValue={userRole === "admin" ? "general" : "notifications"}
              className="space-y-6"
            >
              <TabsList className="grid w-full  grid-cols-3 lg:grid-cols-6">
                {userRole === "admin" && (
                  <TabsTrigger value="general">Général</TabsTrigger>
                )}
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="security">Sécurité</TabsTrigger>
                {userRole === "admin" && (
                  <TabsTrigger value="backup">Sauvegarde</TabsTrigger>
                )}
                <TabsTrigger value="appearance">Apparence</TabsTrigger>
                {userRole === "admin" && (
                  <TabsTrigger value="taxe">Taxe</TabsTrigger>
                )}
              </TabsList>

              {userRole === "admin" && (
                <TabsContent value="general" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Globe className="h-5 w-5 mr-2" />
                        Informations de l'entreprise
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="companyName">
                            Nom de l'entreprise
                          </Label>
                          <Input
                            id="companyName"
                            value={companySettings.company_name}
                            onChange={(e) =>
                              setCompanySettings({
                                ...companySettings,
                                company_name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="companyEmail">Email</Label>
                          <Input
                            id="companyEmail"
                            type="email"
                            value={companySettings.company_email}
                            onChange={(e) =>
                              setCompanySettings({
                                ...companySettings,
                                company_email: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="companyPhone">Téléphone</Label>
                          <Input
                            id="companyPhone"
                            value={companySettings.company_phone}
                            onChange={(e) =>
                              setCompanySettings({
                                ...companySettings,
                                company_phone: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="currency">Devise</Label>
                          <Select
                            value={companySettings.currency}
                            onValueChange={(value) =>
                              setCompanySettings({
                                ...companySettings,
                                currency: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 overflow-auto">
                              {currencies.map((currency) => (
                                <SelectItem
                                  key={currency.code}
                                  value={currency.code}
                                >
                                  {`${currency.currency} ${currency.country} (${currency.symbol})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="companyAddress">Adresse</Label>
                        <Textarea
                          id="companyAddress"
                          value={companySettings.company_address}
                          onChange={(e) =>
                            setCompanySettings({
                              ...companySettings,
                              company_address: e.target.value,
                            })
                          }
                          rows={3}
                        />
                      </div>
                      <div className="pt-2">
                        <Button
                          onClick={saveCompanySettings}
                          disabled={saving}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Sauvegarder les informations
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Localisation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="language">Langue</Label>
                          <Select
                            value={companySettings.language}
                            onValueChange={(value) =>
                              setCompanySettings({
                                ...companySettings,
                                language: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fr">Français</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="es">Español</SelectItem>
                              <SelectItem value="pt">Português</SelectItem>
                              <SelectItem value="ar">العربية</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="timezone">Fuseau horaire</Label>
                          <Select
                            value={companySettings.timezone}
                            onValueChange={(value) =>
                              setCompanySettings({
                                ...companySettings,
                                timezone: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              {africanTimezones.map((tz) => (
                                <SelectItem key={tz} value={tz}>
                                  {tz.replace("Africa/", "")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bell className="h-5 w-5 mr-2" />
                      Préférences de notification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notifications par email</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Recevoir les notifications importantes par email
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.email_notifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email_notifications: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notifications SMS</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Recevoir les alertes urgentes par SMS
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.sms_notifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            sms_notifications: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Alertes de stock faible</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Être notifié quand un produit atteint le seuil
                          critique
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.low_stock_alerts}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            low_stock_alerts: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notifications de commandes</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Recevoir les notifications pour les nouvelles
                          commandes
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.order_notifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            order_notifications: checked,
                          })
                        }
                      />
                    </div>
                    <div className="pt-4">
                      <Button
                        onClick={saveNotificationSettings}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Sauvegarder les préférences
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Sécurité
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="currentPassword">
                          Mot de passe actuel
                        </Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              currentPassword: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="newPassword">
                          Nouveau mot de passe
                        </Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">
                          Confirmer le mot de passe
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value,
                            })
                          }
                        />
                      </div>
                      <Button onClick={changePassword} disabled={saving}>
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Changer le mot de passe
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Authentification à deux facteurs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Activer 2FA</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Ajouter une couche de sécurité supplémentaire
                        </p>
                      </div>
                      <Switch
                        checked={securitySettings.two_factor_auth_enabled}
                        onCheckedChange={(checked) =>
                          setSecuritySettings({
                            ...securitySettings,
                            two_factor_auth_enabled: checked,
                          })
                        }
                      />
                    </div>
                    <div className="pt-4 ">
                      <Button
                        onClick={saveSecuritySettings}
                        disabled={saving}
                        // variant="outline"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Sauvegarder les paramètres de sécurité
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {userRole === "admin" && (
                <TabsContent value="backup" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Database className="h-5 w-5 mr-2" />
                        Sauvegarde automatique
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Sauvegarde automatique</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Sauvegarder automatiquement vos données
                          </p>
                        </div>
                        <Switch
                          checked={backupSettings.auto_backup}
                          onCheckedChange={(checked) =>
                            setBackupSettings({
                              ...backupSettings,
                              auto_backup: checked,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="backupFrequency">
                          Fréquence de sauvegarde
                        </Label>
                        <Select
                          value={backupSettings.backup_frequency}
                          onValueChange={(value) =>
                            setBackupSettings({
                              ...backupSettings,
                              backup_frequency: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">
                              Toutes les heures
                            </SelectItem>
                            <SelectItem value="daily">Quotidienne</SelectItem>
                            <SelectItem value="weekly">Hebdomadaire</SelectItem>
                            <SelectItem value="monthly">Mensuelle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="pt-4 flex gap-4">
                        <Button
                          onClick={saveBackupSettings}
                          disabled={saving}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Sauvegarder les paramètres
                        </Button>
                        <Button
                          onClick={handleManualBackup}
                          disabled={saving}
                          variant="outline"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Créer une sauvegarde maintenant
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
              <TabsContent value="appearance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Palette className="h-5 w-5 mr-2" />
                      Thème et apparence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="theme">Thème</Label>
                      <Select
                        value={companySettings.theme}
                        onValueChange={(value) =>
                          setCompanySettings({
                            ...companySettings,
                            theme: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Clair</SelectItem>
                          <SelectItem value="dark">Sombre</SelectItem>
                          <SelectItem value="auto">Automatique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-2">
                      <Button
                        onClick={saveCompanySettings}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Sauvegarder les préférences d'apparence
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {userRole === "admin" && (
                <TabsContent value="taxe" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Percent className="h-5 w-5 mr-2" />
                        Taux et taxes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="tva">TVA</Label>
                        <Input
                          id="tva"
                          type="number"
                          value={tva}
                          onChange={(e) => setTva(Number(e.target.value))}
                        />
                      </div>
                      <div className="pt-2">
                        <Button
                          onClick={handleTva}
                          disabled={saving}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Sauvegarder la TVA
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
