import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/inter";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { bootPreferences } from "@/lib/preferences/boot";
import { queryClient } from "@/lib/query-client";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

// Gerado automaticamente pelo plugin do TanStack Router a partir de src/routes
import { routeTree } from "./routeTree.gen";
import "./styles/globals.css";

// Os cadastros agora ficam no banco: apaga as cópias antigas guardadas neste navegador (protótipo).
for (const chave of ["empresa", "clientes", "fornecedores", "produtos", "servicos", "veiculos", "orcamentos", "vendas", "compras", "movimentos", "acertos"]) {
  try {
    localStorage.removeItem(`oficina.${chave}`);
  } catch {
    // Armazenamento indisponível (navegação privada): não há nada a limpar.
  }
}

// Aplica tema e layout salvos antes da primeira renderização (evita "piscar").
const preferenciasIniciais = bootPreferences();

const router = createRouter({ routeTree, defaultPreload: "intent" });

// Registra o roteador para que <Link to="..."> seja checado pelo TypeScript
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PreferencesStoreProvider initialValues={preferenciasIniciais}>
          <RouterProvider router={router} />
          <Toaster />
        </PreferencesStoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
