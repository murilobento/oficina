import { useSyncExternalStore } from "react";

/** Evento que o Chrome/Edge (Android e computador) dispara quando o app pode ser instalado. */
type EventoInstalacao = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** iPhone/iPad não têm botão de instalar: a pessoa usa Compartilhar → Adicionar à Tela de Início. */
export function ehIOS(agente = navigator.userAgent, pontosDeToque = navigator.maxTouchPoints): boolean {
  if (/iphone|ipad|ipod/i.test(agente)) return true;
  // iPad no "modo computador" se apresenta como Mac, mas tem tela de toque.
  return /macintosh/i.test(agente) && pontosDeToque > 1;
}

/** Aberto como aplicativo instalado (sem a barra do navegador). */
export function estaInstalado(
  sinais = {
    standalone: window.matchMedia("(display-mode: standalone)").matches,
    iosStandalone: (navigator as Navigator & { standalone?: boolean }).standalone,
  },
): boolean {
  return sinais.standalone || sinais.iosStandalone === true;
}

// O evento chega cedo (antes de a tela montar): guardamos aqui desde o carregamento do app.
let eventoGuardado: EventoInstalacao | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

/** Chamar uma vez no início (main.tsx). */
export function escutarInstalacao() {
  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault(); // nós mostramos o botão no menu, em vez do aviso automático do navegador
    eventoGuardado = evento as EventoInstalacao;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    eventoGuardado = null;
    avisar();
  });
}

const assinar = (ouvinte: () => void) => {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
};

/**
 * Como oferecer a instalação: "botao" (o navegador instala com um toque), "ios" (mostrar o passo a passo)
 * ou null (já instalado, ou o navegador não permite instalar).
 */
export function useInstalacao(): { modo: "botao" | "ios" | null; instalar: () => Promise<void> } {
  const evento = useSyncExternalStore(assinar, () => eventoGuardado);
  const modo = estaInstalado() ? null : evento ? "botao" : ehIOS() ? "ios" : null;
  return {
    modo,
    instalar: async () => {
      if (!eventoGuardado) return;
      await eventoGuardado.prompt();
      await eventoGuardado.userChoice;
      eventoGuardado = null; // o evento só pode ser usado uma vez
      avisar();
    },
  };
}

/** Está sem internet? Atualiza quando a conexão cai ou volta. */
export function useSemConexao(): boolean {
  return useSyncExternalStore(
    (ouvinte) => {
      window.addEventListener("online", ouvinte);
      window.addEventListener("offline", ouvinte);
      return () => {
        window.removeEventListener("online", ouvinte);
        window.removeEventListener("offline", ouvinte);
      };
    },
    () => !navigator.onLine,
  );
}
