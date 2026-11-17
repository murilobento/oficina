import { createPortal } from "react-dom";

import { CabecalhoEmpresa, RodapeEmpresa } from "@/features/empresa/cabecalho-empresa";
import { useEmpresa } from "@/features/empresa/store";
import { mascararDocumento, mascararTelefone } from "@/features/pessoas/documento";
import type { Pessoa } from "@/features/pessoas/tipos";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { subtotalItem, validoAte } from "./calculo";
import { type Veiculo, mascararPlaca } from "@/features/veiculos/tipos";

import { type Orcamento, totaisDoOrcamento } from "./tipos";

function dataCurta(data: Date | string): string {
  return new Date(data).toLocaleDateString("pt-BR");
}

/**
 * Folha do orçamento para entregar ao cliente (ou salvar em PDF pelo diálogo de impressão).
 * Fica escondida na tela e só aparece ao imprimir: o CSS de globals.css esconde o resto da página.
 */
export function OrcamentoDocumento({
  orcamento,
  cliente,
  veiculo,
}: {
  orcamento: Orcamento;
  cliente: Pessoa | null;
  veiculo: Veiculo | null;
}) {
  const empresa = useEmpresa();
  const totais = totaisDoOrcamento(orcamento);
  const telefone = cliente ? mascararTelefone(cliente.celular || cliente.telefone) : "";

  return createPortal(
    <div data-impressao className="font-sans text-[11pt] leading-snug">
      <CabecalhoEmpresa empresa={empresa}>
        <p className="text-lg font-bold">Orçamento {orcamento.numero}</p>
        <p className="text-sm">Emitido em {dataCurta(orcamento.criadoEm)}</p>
        <p className="text-sm">Válido até {dataCurta(validoAte(orcamento.criadoEm, orcamento.validadeDias))}</p>
      </CabecalhoEmpresa>

      <section className="mt-4 grid grid-cols-2 gap-6 text-sm">
        <div>
          <h2 className="mb-1 text-xs font-bold tracking-wide uppercase">Cliente</h2>
          <p className="font-medium">{cliente?.nome ?? "Cliente removido"}</p>
          {cliente?.documento && <p>{mascararDocumento(cliente.tipo, cliente.documento)}</p>}
          {telefone && <p>{telefone}</p>}
        </div>
        <div>
          <h2 className="mb-1 text-xs font-bold tracking-wide uppercase">Veículo</h2>
          <p className="font-medium">{veiculo?.modelo ?? "Veículo removido"}</p>
          <p>
            {[
              veiculo?.placa && `Placa ${mascararPlaca(veiculo.placa)}`,
              veiculo?.ano,
              veiculo?.cor,
              orcamento.km > 0 && `${formatarQuantidade(orcamento.km)} km`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </section>

      {orcamento.problema && (
        <section className="mt-4 text-sm">
          <h2 className="mb-1 text-xs font-bold tracking-wide uppercase">Problema relatado</h2>
          <p className="whitespace-pre-wrap">{orcamento.problema}</p>
        </section>
      )}

      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1.5 pr-2 font-bold">Descrição</th>
            <th className="px-2 py-1.5 text-right font-bold">Qtd</th>
            <th className="px-2 py-1.5 text-right font-bold">Unitário</th>
            <th className="py-1.5 pl-2 text-right font-bold">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {orcamento.itens.map((item) => (
            <tr key={item.id} className="border-b border-neutral-300 align-top break-inside-avoid">
              <td className="py-1.5 pr-2">
                {item.descricao}
                <span className="ml-1.5 text-xs text-neutral-600">({item.tipo === "servico" ? "serviço" : "peça"})</span>
              </td>
              <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                {formatarQuantidade(item.quantidade)} {item.unidade}
              </td>
              <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">{formatarBRL(item.valor)}</td>
              <td className="py-1.5 pl-2 text-right whitespace-nowrap tabular-nums">{formatarBRL(subtotalItem(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-4 ml-auto flex w-64 flex-col gap-1 text-sm break-inside-avoid">
        <div className="flex justify-between">
          <dt>Peças</dt>
          <dd className="tabular-nums">{formatarBRL(totais.pecas)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Mão de obra</dt>
          <dd className="tabular-nums">{formatarBRL(totais.maoDeObra)}</dd>
        </div>
        {totais.desconto > 0 && (
          <div className="flex justify-between">
            <dt>Desconto</dt>
            <dd className="tabular-nums">− {formatarBRL(totais.desconto)}</dd>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t-2 border-black pt-1.5 text-base font-bold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatarBRL(totais.total)}</dd>
        </div>
      </dl>

      {orcamento.observacoes && (
        <section className="mt-5 text-sm break-inside-avoid">
          <h2 className="mb-1 text-xs font-bold tracking-wide uppercase">Observações</h2>
          <p className="whitespace-pre-wrap">{orcamento.observacoes}</p>
        </section>
      )}

      <footer className="mt-12 grid grid-cols-2 gap-10 text-center text-xs break-inside-avoid">
        <p className="border-t border-black pt-1">{empresa.nomeFantasia}</p>
        <p className="border-t border-black pt-1">Aprovação do cliente</p>
      </footer>

      <RodapeEmpresa empresa={empresa} />
    </div>,
    document.body,
  );
}
