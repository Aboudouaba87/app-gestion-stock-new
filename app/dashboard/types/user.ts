export interface AppUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  warehouse: string;
  status: "active" | "inactive";
  lastlogin: string | null;
}

export type NewUser = {
  name: string;
  email: string;
  phone: string;
  role: string;
  warehouse: string;
  status: boolean;
  lastlogin: string | null;
};


export type EditUser = Omit<NewUser, "lastlogin">;

export type Client = {
  id: number;                // clé primaire auto-incrémentée
  name: string;              // nom de l’entreprise ou du particulier
  email: string;             // email unique
  phone?: string | null;     // téléphone (optionnel)
  type: "Entreprise" | "Particulier"; // contrainte de type
  created_at: string;        // timestamp ISO (PostgreSQL -> string en JSON)
  updated_at: string;        // idem
};
