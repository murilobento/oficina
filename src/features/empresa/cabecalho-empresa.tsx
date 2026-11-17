import { mascararCNPJ } from "@/features/pessoas/documento";

import { contatosEmLista, type Empresa, enderecoEmLinha } from "./tipos";

/**
 * Cabeçalho dos documentos impressos (orçamento, e depois OS, recibos e relatórios): logo à
 * esquerda e, ao lado, nome, CNPJ, endereço e contatos da oficina. `children` entra à direita
 * (título e número do documento).
 */
export function CabecalhoEmpresa({ empresa, children }: { empresa: Empresa; children?: React.ReactNode }) {
  const razaoDiferente = empresa.razaoSocial && empresa.razaoSocial !== empresa.nomeFantasia;
  const fiscal = [
    empresa.cnpj && `CNPJ ${mascararCNPJ(empresa.cnpj)}`,
    empresa.inscricaoEstadual && `IE ${empresa.inscricaoEstadual}`,
    empresa.inscricaoMunicipal && `IM ${empresa.inscricaoMunicipal}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const endereco = enderecoEmLinha(empresa);
  const contatos = contatosEmLista(empresa).join(" · ");

  return (
    <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-3">
      <div className="flex min-w-0 items-start gap-3">
        {empresa.logo && (
          <img src={empresa.logo} alt="" className="max-h-20 w-auto max-w-32 shrink-0 object-contain" />
        )}
        <div className="min-w-0 text-xs leading-snug">
          <p className="text-xl leading-tight font-bold">{empresa.nomeFantasia}</p>
          {razaoDiferente && <p>{empresa.razaoSocial}</p>}
          {fiscal && <p>{fiscal}</p>}
          {endereco && <p>{endereco}</p>}
          {contatos && <p>{contatos}</p>}
          {empresa.horario && <p>{empresa.horario}</p>}
        </div>
      </div>
      {children && <div className="shrink-0 text-right">{children}</div>}
    </header>
  );
}

/** Linha no fim dos documentos (agradecimento, PIX...). Não mostra nada se estiver em branco. */
export function RodapeEmpresa({ empresa }: { empresa: Empresa }) {
  if (!empresa.rodape) return null;
  return <p className="mt-8 border-t border-neutral-300 pt-2 text-center text-xs whitespace-pre-wrap">{empresa.rodape}</p>;
}
