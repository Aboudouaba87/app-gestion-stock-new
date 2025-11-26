"use client";

import { useEffect, useState } from "react";
import { Toaster } from "./dashboard/components/ui/sonner"; // ton chemin exact

export function ClientToaster(props: any) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // empêche tout rendu côté serveur
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  return <Toaster {...props} />;
}
