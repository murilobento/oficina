import { WifiOff } from "lucide-react";

import { useSemConexao } from "@/lib/pwa";

/** Faixa no rodapé (não cobre menu nem cabeçalho) enquanto o aparelho está sem internet: o app abre, mas os dados vêm do servidor. */
export function AvisoSemConexao() {
  const semConexao = useSemConexao();
  if (!semConexao) return null;
  return (
    <div role="status" className="bg-destructive fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-2 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-sm font-medium text-white">
      <WifiOff className="size-4 shrink-0" />
      Sem conexão com a internet. Para ver e salvar dados, aguarde a conexão voltar.
    </div>
  );
}
