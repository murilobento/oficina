import { useEffect } from "react";

import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Registra o service worker (app instalável) e, quando sai uma versão nova, avisa com o botão
 * "Atualizar". Não atualiza sozinho: quem está no meio de um orçamento escolhe a hora.
 */
export function AtualizacaoApp() {
  const {
    needRefresh: [novaVersao],
    updateServiceWorker,
  } = useRegisterSW({
    // Registra já: o componente monta depois do evento "load" da página, que o registro padrão espera.
    immediate: true,
    onRegisterError(erro) {
      console.error("Não foi possível ativar o app instalável:", erro);
    },
    onRegisteredSW(_url, registro) {
      // Confere se há versão nova a cada hora, para quem deixa o app aberto o dia todo.
      if (registro) setInterval(() => void registro.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (!novaVersao) return;
    toast("Nova versão do sistema disponível.", {
      id: "nova-versao",
      description: "Salve o que estiver fazendo e toque em Atualizar.",
      duration: Number.POSITIVE_INFINITY,
      action: { label: "Atualizar", onClick: () => void updateServiceWorker(true) },
    });
  }, [novaVersao, updateServiceWorker]);

  return null;
}
