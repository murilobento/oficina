import { Link } from "@tanstack/react-router";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { Dado, SecaoDados } from "@/components/layout/registro-partes";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { alvoExcluido, CATEGORIAS, ehSensivel, type RegistroAuditoria, TELA_DO_ALVO } from "./tipos";

// Extras simples que valem mostrar, com o rótulo de cada um. Valores em centavos viram R$.
const EXTRAS: Record<string, { rotulo: string; moeda?: boolean }> = {
  valor: { rotulo: "Valor", moeda: true },
  total: { rotulo: "Total", moeda: true },
  forma: { rotulo: "Forma de pagamento" },
  recebidoPor: { rotulo: "Recebido por" },
  fornecedor: { rotulo: "Fornecedor" },
  motivo: { rotulo: "Motivo" },
  observacoes: { rotulo: "Observação" },
  email: { rotulo: "E-mail tentado" },
  etapa: { rotulo: "Etapa da OS" },
};

const textoValor = (valor: unknown, moeda: boolean) => {
  if (valor === null || valor === undefined || valor === "") return "vazio";
  if (moeda && typeof valor === "number") return formatarBRL(valor);
  return String(valor);
};

/** Painel lateral de um registro da auditoria (somente leitura). */
export function AuditoriaDetalhe({ registro, aoFechar }: { registro: RegistroAuditoria | null; aoFechar: () => void }) {
  const detalhes = registro?.detalhes ?? {};
  const mudancas = detalhes.mudancas ?? [];
  const incluidas = Array.isArray(detalhes.incluidas) ? (detalhes.incluidas as string[]) : [];
  const retiradas = Array.isArray(detalhes.retiradas) ? (detalhes.retiradas as string[]) : [];
  const itensAcerto = Array.isArray(detalhes.itens) && registro?.acao === "estoque.acerto" ? (detalhes.itens as { produto: string; sistema: number; contado: number; diferenca: number }[]) : [];
  const extras = Object.entries(EXTRAS).filter(([chave]) => detalhes[chave] !== undefined && detalhes[chave] !== "");
  const tela = registro?.alvo ? TELA_DO_ALVO[registro.alvo.tipo] : undefined;

  return (
    <Sheet open={registro !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-lg!">
        {registro && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="pr-8 leading-snug">{registro.descricao}</SheetTitle>
              <SheetDescription>
                {new Date(registro.criadoEm).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "medium" })}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
              {ehSensivel(registro) && (
                <p className="bg-erro-fundo text-foreground flex items-start gap-2 rounded-lg p-3 text-sm">
                  <TriangleAlert className="text-erro mt-0.5 size-4 shrink-0" />
                  Ação sensível: confira se foi combinada com a gerência.
                </p>
              )}

              <SecaoDados titulo="Registro">
                <Dado rotulo="Feito por">{registro.usuario || "Sem identificação"}</Dado>
                <Dado rotulo="Categoria">{CATEGORIAS[registro.categoria]?.texto ?? registro.categoria}</Dado>
                {extras.map(([chave, { rotulo, moeda }]) => (
                  <Dado key={chave} rotulo={rotulo}>
                    {textoValor(detalhes[chave], moeda ?? false)}
                  </Dado>
                ))}
                <Dado rotulo="Endereço IP">{registro.ip ?? "—"}</Dado>
              </SecaoDados>

              {mudancas.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">O que mudou</h3>
                  <ul className="flex flex-col divide-y rounded-xl border">
                    {mudancas.map((m) => (
                      <li key={m.campo} className="flex flex-col gap-1 p-3 text-sm">
                        <span className="text-muted-foreground text-xs">{m.campo}</span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-muted-foreground break-all line-through decoration-1">{textoValor(m.antes, detalhes.moeda === true)}</span>
                          <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                          <span className="font-medium break-all">{textoValor(m.depois, detalhes.moeda === true)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(incluidas.length > 0 || retiradas.length > 0) && (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">Permissões</h3>
                  <ul className="flex flex-col divide-y rounded-xl border text-sm">
                    {incluidas.map((p) => (
                      <li key={`+${p}`} className="flex items-center gap-2 p-3">
                        <span className="text-ok w-4 text-center font-semibold">+</span>
                        {p}
                      </li>
                    ))}
                    {retiradas.map((p) => (
                      <li key={`-${p}`} className="flex items-center gap-2 p-3">
                        <span className="text-erro w-4 text-center font-semibold">−</span>
                        <span className="text-muted-foreground">{p}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {itensAcerto.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">Produtos com diferença</h3>
                  <ul className="flex flex-col divide-y rounded-xl border">
                    {itensAcerto.map((item) => (
                      <li key={item.produto} className="flex items-start justify-between gap-3 p-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium break-words">{item.produto}</p>
                          <p className="text-muted-foreground tabular-nums">
                            Sistema {formatarQuantidade(item.sistema)} → contado {formatarQuantidade(item.contado)}
                          </p>
                        </div>
                        <p className={`shrink-0 font-medium tabular-nums ${item.diferenca < 0 ? "text-erro" : "text-ok"}`}>
                          {item.diferenca > 0 ? "+" : "−"}
                          {formatarQuantidade(Math.abs(item.diferenca))}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {tela &&
                (alvoExcluido(registro) ? (
                  <p className="text-muted-foreground text-sm">O registro foi excluído e não aparece mais em {tela.texto}.</p>
                ) : (
                  <Link to={tela.url} className="text-primary text-sm font-medium hover:underline">
                    Abrir {tela.texto} →
                  </Link>
                ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
