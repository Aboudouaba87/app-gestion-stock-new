"use client";

import { ClientToaster } from "./client-toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <ClientToaster
        position="top-center"
        richColors={false}
        toastOptions={{
          classNames: {
            toast: "!border !border-gray-200 !bg-white !text-black",
            success: "!bg-green-300 !text-green-900 !border !border-green-200",
            error: "!bg-red-300 !text-red-900 !border !border-red-200",
            warning:
              "!bg-yellow-300 !text-yellow-900 !border !border-yellow-200",
            info: "!bg-blue-300 !text-blue-900 !border !border-blue-200",
          },
        }}
      />
    </>
  );
}
