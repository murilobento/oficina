import { Link } from "@tanstack/react-router";
import { CalendarDays, Car, ClipboardList, FileText, Package, PackageX, TriangleAlert, Users } from "lucide-react";
import { useMemo } from "react";

import { FitaStatus } from "@/components/marca/fita-status";
import { MedidorSegmentado } from "@/components/marca/medidor-segmentado";
import { Numeral } from "@/components/marca/numeral";
import { RotuloSecao } from "@/components/marca/rotulo-secao";
import type { Permissao } from "@/features/auth/permissoes";
import { useOrcamentos } from "@/features/orcamentos/api";
import { useProdutos } from "@/features/produtos/api";
import { useVendas } from "@/features/vendas/api";
import { useOrdens } from "@/features/ordens/api";
import { contarPorEtapa, ETAPAS } from "@/features/ordens/tipos";
import { formatarBRL } from "@/lib/numeros";
import { usePermissoes } from "@/navigation/acesso";
import { permissaoDaRota } from "@/navigation/sidebar-items";

import { resumoDoDia } from "./resumo";

const ATALHOS: { to: string; titulo: string; icone: typeof FileText }[] = [
  { to: "/orcamentos", titulo: "Orçamentos", icone: FileText },
  { to: "/clientes", titulo: "Clientes", icone: Users },
  { to: "/veiculos", titulo: "Veículos", icone: Car },
  { to: "/produtos", titulo: "Produtos", icone: Package },
  { to: "/ordens", titulo: "Ordens de serviço", icone: ClipboardList },
  { to: "/agenda", titulo: "Agenda", icone: CalendarDays },
];

/** Cada bloco só consulta a API (e só aparece) se a pessoa tem a permissão de ver aquele dado. */
export function PainelDoDia() {
  const permissoes = usePermissoes();
  const pode = (permissao: Permissao) => permissoes === null || permissoes.includes(permissao);
  const verOrcamentos = pode("orcamentos.ver");
  const verVendas = pode("vendas.ver");
  const verEstoque = pode("estoque.ver");

  const orcamentos = useOrcamentos(verOrcamentos);
  const vendas = useVendas(verVendas);
  const produtos = useProdutos(verEstoque);
  const verOrdens = pode("ordens.ver");
  const ordens = useOrdens(verOrdens);
  const patio = contarPorEtapa(ordens);

  const resumo = useMemo(
    () => resumoDoDia({ orcamentos: orcamentos, vendas: vendas, produtos: produtos }),
    [orcamentos, vendas, produtos],
  );

  return (
    <div className="flex flex-col gap-6">
      {verOrdens && (
        <section className="flex flex-col gap-3">
          <RotuloSecao>No pátio</RotuloSecao>
          <Link to="/ordens" className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-4">
            {ETAPAS.map((e) => (
              <div key={e.status} className="bg-card p-4">
                <Numeral rotulo={e.texto} valor={String(patio[e.status])} tamanho="sm" />
              </div>
            ))}
          </Link>
        </section>
      )}
      {(verOrcamentos || verVendas) && (
        <section aria-label="Resumo do dia" className={`grid gap-px overflow-hidden rounded-md border bg-border ${verOrcamentos && verVendas ? "grid-cols-2" : "grid-cols-1"}`}>
          {verVendas && (
            <div className="bg-card p-4">
              <Numeral rotulo="Vendido hoje" valor={formatarBRL(resumo.totalVendidoHoje)} tamanho="sm" />
              <p className="text-muted-foreground mt-1 font-mono text-xs">{resumo.vendasHoje} venda(s)</p>
            </div>
          )}
          {verOrcamentos && (
            <Link to="/orcamentos" className="bg-card p-4">
              <Numeral rotulo="Orçamentos abertos" valor={String(resumo.orcamentosAbertos)} tamanho="sm" />
              <p className="text-muted-foreground mt-1 text-xs">Ver orçamentos</p>
            </Link>
          )}
        </section>
      )}

      {verEstoque && resumo.abaixoDoMinimo.length > 0 && (
        <section className="flex flex-col gap-3">
          <RotuloSecao>Abaixo do mínimo</RotuloSecao>
          <ul className="bg-card divide-y rounded-md border">
            {resumo.abaixoDoMinimo.slice(0, 5).map((p) => (
              <li key={p.id} className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold uppercase">{p.descricao}</span>
                  <FitaStatus tom={p.saldo <= 0 ? "erro" : "atencao"} icone={p.saldo <= 0 ? PackageX : TriangleAlert}>{p.saldo <= 0 ? "Sem estoque" : "Baixo"}</FitaStatus>
                </div>
                <MedidorSegmentado valor={p.saldo} maximo={p.estoqueMinimo} tom={p.saldo <= 0 ? "erro" : "atencao"} rotulo={`Estoque de ${p.descricao}`} />
                <span className="text-muted-foreground font-mono text-xs">
                  {p.saldo} / mín. {p.estoqueMinimo}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <RotuloSecao>Atalhos</RotuloSecao>
        <nav className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {ATALHOS.filter((a) => { const exigida = permissaoDaRota(a.to); return !exigida || pode(exigida); }).map(({ to, titulo, icone: Icone }) => (
            <Link
              key={to}
              to={to}
              className="bg-card flex min-h-24 flex-col items-start justify-between gap-3 rounded-md border p-4 transition-colors hover:bg-accent active:scale-[0.99]"
            >
              <Icone className="size-6" aria-hidden />
              <span className="font-semibold">{titulo}</span>
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
