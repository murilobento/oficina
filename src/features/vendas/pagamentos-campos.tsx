import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { usePode } from "@/features/auth/sessao";
import { formatarBRL, mascararMoeda } from "@/lib/numeros";

import { type EstadoPagamento, type LinhaPagamento, novaLinha, resumoPagamento, textoValor } from "./pagamentos";
import { FORMAS_PAGAMENTO } from "./tipos";

/**
 * Pagamentos da venda: forma e valor de cada um, a conta (total, pago, falta ou troco) e,
 * quando falta valor, a escolha entre ficar devendo e dar desconto da diferença.
 * Quem não vê valores só escolhe a forma: a API paga o total.
 */
export function PagamentosCampos({
  prefixo,
  total,
  estado,
  aoMudar,
  temCliente,
  erro,
}: {
  prefixo: string;
  total: number;
  estado: EstadoPagamento;
  aoMudar: (estado: EstadoPagamento) => void;
  temCliente: boolean;
  erro?: string;
}) {
  const verValores = usePode("valores.ver");
  const { pago, falta, excesso } = resumoPagamento(estado, total);
  const unica = estado.linhas.length === 1;

  const trocarLinha = (id: string, parte: Partial<LinhaPagamento>) =>
    aoMudar({ ...estado, linhas: estado.linhas.map((l) => (l.id === id ? { ...l, ...parte } : l)) });

  if (!verValores) {
    const linha = estado.linhas[0];
    return (
      <Field className="gap-1.5" data-invalid={!!erro}>
        <FieldLabel htmlFor={`${prefixo}-forma-0`}>Forma de pagamento</FieldLabel>
        <NativeSelect id={`${prefixo}-forma-0`} className="w-full" value={linha.forma} aria-invalid={!!erro} onChange={(e) => trocarLinha(linha.id, { forma: e.target.value })}>
          <NativeSelectOption value="">Selecione</NativeSelectOption>
          {FORMAS_PAGAMENTO.map((f) => (
            <NativeSelectOption key={f.valor} value={f.valor}>
              {f.texto}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {erro && <p role="alert" className="text-destructive text-sm">{erro}</p>}
      </Field>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {estado.linhas.map((linha, i) => (
        <div key={linha.id} className="flex items-end gap-2">
          <Field className="min-w-0 flex-1 gap-1.5">
            <FieldLabel htmlFor={`${prefixo}-forma-${i}`}>{i === 0 ? "Forma de pagamento" : `Forma ${i + 1}`}</FieldLabel>
            <NativeSelect id={`${prefixo}-forma-${i}`} className="w-full" value={linha.forma} onChange={(e) => trocarLinha(linha.id, { forma: e.target.value })}>
              <NativeSelectOption value="">Selecione</NativeSelectOption>
              {FORMAS_PAGAMENTO.map((f) => (
                <NativeSelectOption key={f.valor} value={f.valor}>
                  {f.texto}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field className="w-32 gap-1.5">
            <FieldLabel htmlFor={`${prefixo}-valor-${i}`}>Valor (R$)</FieldLabel>
            <Input
              id={`${prefixo}-valor-${i}`}
              inputMode="numeric"
              className="font-mono"
              placeholder={unica ? textoValor(total) : "0,00"}
              value={linha.valor}
              onChange={(e) => trocarLinha(linha.id, { valor: mascararMoeda(e.target.value) })}
            />
          </Field>
          {!unica && (
            <Button type="button" variant="ghost" size="icon" aria-label={`Remover forma ${i + 1}`} onClick={() => aoMudar({ ...estado, linhas: estado.linhas.filter((l) => l.id !== linha.id) })}>
              <X />
            </Button>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => {
          // Ao dividir em mais de uma forma, a primeira linha ganha o total como valor explícito, para editar.
          const linhas = unica && estado.linhas[0].valor === "" ? [{ ...estado.linhas[0], valor: textoValor(total) }, novaLinha()] : [...estado.linhas, novaLinha()];
          aoMudar({ ...estado, linhas });
        }}
      >
        <Plus /> Dividir em outra forma
      </Button>

      <dl className="bg-muted/50 grid grid-cols-3 gap-2 rounded-md border p-3 text-sm">
        <Conta rotulo="Total" valor={formatarBRL(total)} />
        <Conta rotulo="Pago" valor={formatarBRL(pago)} />
        {excesso > 0 ? <Conta rotulo="Troco" valor={formatarBRL(excesso)} destaque="ok" /> : <Conta rotulo="Faltam" valor={formatarBRL(falta)} destaque={falta > 0 ? "erro" : undefined} />}
      </dl>

      {falta > 0 && (
        <Field className="gap-1.5" data-invalid={!!erro}>
          <span id={`${prefixo}-divergencia`} className="text-sm font-medium">
            Faltam {formatarBRL(falta)}. O que fazer?
          </span>
          <div role="radiogroup" aria-labelledby={`${prefixo}-divergencia`} className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              role="radio"
              aria-checked={estado.divergencia === "saldo"}
              variant={estado.divergencia === "saldo" ? "default" : "outline"}
              disabled={!temCliente}
              onClick={() => aoMudar({ ...estado, divergencia: "saldo" })}
            >
              Ficar devendo {formatarBRL(falta)}
            </Button>
            <Button type="button" role="radio" aria-checked={estado.divergencia === "desconto"} variant={estado.divergencia === "desconto" ? "default" : "outline"} onClick={() => aoMudar({ ...estado, divergencia: "desconto" })}>
              Dar desconto de {formatarBRL(falta)}
            </Button>
          </div>
          {!temCliente && <p className="text-muted-foreground text-sm">Para ficar devendo, escolha o cliente.</p>}
        </Field>
      )}

      {erro && <p role="alert" className="text-destructive text-sm">{erro}</p>}
    </div>
  );
}

function Conta({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: "ok" | "erro" }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{rotulo}</dt>
      <dd className={`font-mono font-semibold tabular-nums ${destaque === "erro" ? "text-erro" : destaque === "ok" ? "text-ok" : ""}`}>{valor}</dd>
    </div>
  );
}
