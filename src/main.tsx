import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/geist-mono";

import { AtualizacaoApp } from "@/components/layout/atualizacao-app";
import { AvisoSemConexao } from "@/components/layout/aviso-sem-conexao";
import { Toaster } from "@/components/ui/sonner";
import { escutarInstalacao } from "@/lib/pwa";
import { LOGIN_ATIVO, useSessao } from "@/features/auth/sessao";
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

// App instalável: guarda o pedido de instalação do navegador para o item "Instalar app" do menu.
escutarInstalacao();

// Aplica tema e layout salvos antes da primeira renderização (evita "piscar").
const preferenciasIniciais = bootPreferences();

const router = createRouter({ routeTree, defaultPreload: "intent" });

// Registra o roteador para que <Link to="..."> seja checado pelo TypeScript
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Quando a internet volta, confere a sessão de novo: se expirou enquanto estava sem rede, volta ao login.
window.addEventListener("online", async () => {
  if (!LOGIN_ATIVO) return;
  const eu = await useSessao.getState().carregar();
  if (eu === null && router.state.location.pathname !== "/login") await router.navigate({ to: "/login" });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PreferencesStoreProvider initialValues={preferenciasIniciais}>
          <AvisoSemConexao />
          <RouterProvider router={router} />
          <Toaster />
          <AtualizacaoApp />
        </PreferencesStoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
