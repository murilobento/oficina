import { useState } from "react";

import { Banknote, CreditCard, Landmark, QrCode, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RotuloSecao } from "@/components/marca/rotulo-secao";
import { usePode } from "@/features/auth/sessao";
import { formatarBRL, mascararMoeda } from "@/lib/numeros";

import {
  adicionarForma,
  type CorpoRecebimento,
  type FormaRecebimento,
  type LinhaRecebimento,
  pagamentosParaApi,
  problemaRecebimento,
  resumoRecebimento,
  trocoDaLinha,
} from "./pagamentos";
import { dataValida, dividirParcelas, hojeISO, somarDias } from "./parcelas";

const FORMAS: { forma: FormaRecebimento; texto: string; icone: typeof Banknote }[] = [
  { forma: "dinheiro", texto: "Dinheiro", icone: Banknote },
  { forma: "pix", texto: "Pix", icone: QrCode },
  { forma: "debito", texto: "Débito", icone: Landmark },
  { forma: "credito", texto: "Crédito", icone: CreditCard },
];
const nomeForma = (forma: FormaRecebimento) => FORMAS.find((f) => f.forma === forma)?.texto ?? forma;
const dataBR = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Etapa de recebimento: total em destaque, formas que já entram com o que falta, troco no dinheiro,
 * vezes no crédito e botões que mudam conforme a situação.
 * - `modo="venda"`: ao faltar valor, "fica a receber" (com parcelas) ou "dar desconto".
 * - `modo="receber"`: recebimento de saldo; pode ser parcial.
 * Quem não vê valores só escolhe a forma (a API registra o total).
 */
export function RecebimentoEtapa({
  modo,
  total,
  temCliente = false,
  sugerido,
  enviando,
  aoConcluir,
}: {
  modo: "venda" | "receber";
  total: number;
  temCliente?: boolean;
  /** Valor da próxima parcela, sugerido na primeira forma (modo receber). */
  sugerido?: number;
  enviando: boolean;
  aoConcluir: (corpo: CorpoRecebimento) => void;
}) {
  const verValores = usePode("valores.ver");
  const [linhas, setLinhas] = useState<LinhaRecebimento[]>([]);
  const [erro, setErro] = useState("");
  // Qual botão de concluir foi clicado: só ele mostra o spinner; os outros ficam só travados.
  const [clicado, setClicado] = useState("");
  const girando = (id: string) => enviando && clicado === id;
  const [aReceber, setAReceber] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [vencimento, setVencimento] = useState(() => somarDias(hojeISO(), 30));

  const { pago, falta, excesso } = resumoRecebimento(linhas, total);

  function mudar(novas: LinhaRecebimento[]) {
    setLinhas(novas);
    setErro("");
    setAReceber(false);
  }
  const trocar = (id: string, parte: Partial<LinhaRecebimento>) => mudar(linhas.map((l) => (l.id === id ? { ...l, ...parte } : l)));

  function concluir(extra: Omit<CorpoRecebimento, "pagamentos"> = {}) {
    const problema = problemaRecebimento(linhas, total);
    if (problema) return setErro(problema);
    aoConcluir({ pagamentos: pagamentosParaApi(linhas), ...extra });
  }

  // Sem ver valores: só a forma; a API paga o total.
  if (!verValores) {
    const escolhida = linhas[0]?.forma;
    return (
      <div className="flex flex-col gap-4">
        <RotuloSecao>Forma de pagamento</RotuloSecao>
        <div role="radiogroup" aria-label="Forma de pagamento" className="grid grid-cols-2 gap-2">
          {FORMAS.map(({ forma, texto, icone: Icone }) => (
            <Button key={forma} type="button" role="radio" aria-checked={escolhida === forma} variant={escolhida === forma ? "default" : "outline"} className="h-12" onClick={() => mudar([{ id: "u", forma, valor: "", entregue: "", vezes: 1 }])}>
              <Icone /> {texto}
            </Button>
          ))}
        </div>
        {erro && <p role="alert" className="text-destructive text-sm">{erro}</p>}
        <Button type="button" className="h-12" disabled={enviando} carregando={girando("forma")} onClick={() => (setClicado("forma"), escolhida ? aoConcluir({ pagamentos: [{ forma: escolhida, valor: 0 }] }) : setErro("Escolha a forma de pagamento."))}>
          Concluir venda
        </Button>
      </div>
    );
  }

  // Não há como dividir em mais parcelas que centavos (o servidor limita do mesmo jeito).
  const vencimentoOk = dataValida(vencimento) && vencimento >= hojeISO();
  const previa = aReceber && vencimentoOk ? dividirParcelas(falta, Math.min(parcelas, falta), vencimento) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-muted flex items-baseline justify-between gap-3 rounded-xl p-4">
        <span className="text-sm font-medium">{modo === "venda" ? "Total" : "Saldo em aberto"}</span>
        <span className="text-3xl font-semibold tabular-nums">{formatarBRL(total)}</span>
      </div>

      <section className="flex flex-col gap-2">
        <RotuloSecao>{linhas.length === 0 ? "Como o cliente pagou?" : "Adicionar outra forma"}</RotuloSecao>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FORMAS.map(({ forma, texto, icone: Icone }) => (
            <Button key={forma} type="button" variant="outline" className="h-12" onClick={() => mudar(adicionarForma(linhas, forma, total, sugerido))}>
              <Icone /> {texto}
            </Button>
          ))}
        </div>
      </section>

      {linhas.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Formas de pagamento">
          {linhas.map((l) => {
            const troco = trocoDaLinha(l);
            return (
              <li key={l.id} className="bg-card flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-end gap-2">
                  <Field className="min-w-0 flex-1 gap-1.5">
                    <FieldLabel htmlFor={`${l.id}-valor`}>{nomeForma(l.forma)}</FieldLabel>
                    <Input id={`${l.id}-valor`} inputMode="numeric" className="tabular-nums" placeholder="0,00" value={l.valor} onChange={(e) => trocar(l.id, { valor: mascararMoeda(e.target.value) })} />
                  </Field>
                  {l.forma === "credito" && (
                    <Field className="w-24 gap-1.5">
                      <FieldLabel htmlFor={`${l.id}-vezes`}>Vezes</FieldLabel>
                      <NativeSelect id={`${l.id}-vezes`} className="w-full" value={String(l.vezes)} onChange={(e) => trocar(l.id, { vezes: Number(e.target.value) })}>
                        {Array.from({ length: 12 }, (_, i) => (
                          <NativeSelectOption key={i + 1} value={String(i + 1)}>
                            {i + 1}x
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  )}
                  {l.forma === "dinheiro" && (
                    <Field className="w-32 gap-1.5">
                      <FieldLabel htmlFor={`${l.id}-entregue`}>Entregue</FieldLabel>
                      <Input id={`${l.id}-entregue`} inputMode="numeric" className="tabular-nums" placeholder={l.valor || "0,00"} value={l.entregue} onChange={(e) => trocar(l.id, { entregue: mascararMoeda(e.target.value) })} />
                    </Field>
                  )}
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${nomeForma(l.forma)}`} onClick={() => mudar(linhas.filter((x) => x.id !== l.id))}>
                    <X />
                  </Button>
                </div>
                {troco > 0 && (
                  <p className="text-ok tabular-nums text-sm font-semibold" role="status">
                    Troco: {formatarBRL(troco)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-baseline justify-between gap-3 border-t pt-3">
        <span className="text-sm font-medium">{excesso > 0 ? "Passou do total" : falta > 0 ? "Falta" : "Quitado"}</span>
        <span className={`text-2xl font-semibold tabular-nums ${excesso > 0 || falta > 0 ? "text-erro" : "text-ok"}`}>{formatarBRL(excesso > 0 ? excesso : falta)}</span>
      </div>

      {erro && <p role="alert" className="text-destructive text-sm">{erro}</p>}

      {modo === "receber" ? (
        <Button type="button" className="h-12" disabled={enviando || pago === 0} carregando={girando("pago")} onClick={() => (setClicado("pago"), concluir())}>
          {pago === 0 ? "Escolha a forma de pagamento" : falta > 0 ? `Registrar ${formatarBRL(pago)} (parcial)` : `Registrar ${formatarBRL(pago)}`}
        </Button>
      ) : aReceber ? (
        <section className="flex flex-col gap-3 rounded-md border p-3">
          <RotuloSecao>A receber · {formatarBRL(falta)}</RotuloSecao>
          <div className="grid grid-cols-2 gap-2">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="rc-parcelas">Parcelas</FieldLabel>
              <NativeSelect id="rc-parcelas" className="w-full" value={String(parcelas)} onChange={(e) => setParcelas(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => (
                  <NativeSelectOption key={i + 1} value={String(i + 1)}>
                    {i + 1}x
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="rc-vencimento">{parcelas > 1 ? "1º vencimento" : "Vencimento"}</FieldLabel>
              <Input id="rc-vencimento" type="date" min={hojeISO()} value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </Field>
          </div>
          <ul className="divide-y rounded-md border text-sm">
            {previa.map((p) => (
              <li key={p.numero} className="flex justify-between gap-2 px-3 py-2 tabular-nums">
                <span>
                  {p.numero}/{previa.length} · {dataBR(p.vencimento)}
                </span>
                <span className="font-semibold">{formatarBRL(p.valor)}</span>
              </li>
            ))}
          </ul>
          {!vencimentoOk && <p className="text-destructive text-sm">Informe uma data de vencimento a partir de hoje.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-12" onClick={() => setAReceber(false)}>
              Voltar
            </Button>
            <Button type="button" className="h-12" disabled={enviando || !vencimentoOk} carregando={girando("saldo")} onClick={() => (setClicado("saldo"), concluir({ divergencia: "saldo", parcelamento: { parcelas: Math.min(parcelas, falta), primeiroVencimento: vencimento } }))}>
              Confirmar · {formatarBRL(falta)} a receber
            </Button>
          </div>
        </section>
      ) : excesso > 0 ? (
        <p className="text-destructive text-sm">O valor passa do total. Para dar troco, use o campo Entregue do dinheiro.</p>
      ) : falta === 0 && excesso === 0 && (linhas.length > 0 || total === 0) ? (
        <Button type="button" className="h-12" disabled={enviando} carregando={girando("total")} onClick={() => (setClicado("total"), concluir())}>
          Concluir venda
        </Button>
      ) : falta > 0 ? (
        <div className="flex flex-col gap-2">
          <Button type="button" className="h-12" disabled={!temCliente} onClick={() => (problemaRecebimento(linhas, total) ? setErro(problemaRecebimento(linhas, total)) : setAReceber(true))}>
            {pago === 0 ? "Concluir · tudo fica a receber" : `Concluir · ${formatarBRL(falta)} fica a receber`}
          </Button>
          {!temCliente && <p className="text-muted-foreground text-sm">Para deixar valor a receber, a venda precisa de cliente.</p>}
          {pago > 0 && (
            <Button type="button" variant="outline" className="h-12" disabled={enviando} carregando={girando("desconto")} onClick={() => (setClicado("desconto"), concluir({ divergencia: "desconto" }))}>
              Dar {formatarBRL(falta)} de desconto e concluir
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
