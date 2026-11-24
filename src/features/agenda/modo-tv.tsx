import { useState } from "react";

import { Check, Copy, Tv } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useAcessosTv, useCriarAcessoTv, useRevogarAcessoTv } from "./api";

const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca");

/**
 * Links da TV do pátio: cada link abre o painel sem login, só para ver. O link aparece uma vez,
 * na criação; se perder, revogue e gere outro.
 */
export function ModoTvDialog({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const consulta = useAcessosTv(aberto);
  const criar = useCriarAcessoTv();
  const revogar = useRevogarAcessoTv();
  const [nome, setNome] = useState("TV do pátio");
  const [novoLink, setNovoLink] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [revogando, setRevogando] = useState("");
  const ativos = (consulta.data ?? []).filter((a) => !a.revogadoEm);

  async function gerar() {
    try {
      const { token } = await criar.mutateAsync(nome.trim() || "TV do pátio");
      setNovoLink(`${window.location.origin}/tv/${token}`);
      setCopiado(false);
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Não foi possível gerar o link.");
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(novoLink);
      setCopiado(true);
    } catch {
      toast.error("Não deu para copiar. Selecione o link e copie à mão.");
    }
  }

  async function revogarLink(id: string) {
    setRevogando(id);
    try {
      await revogar.mutateAsync(id);
      toast.success("Link revogado. A TV que usava este link para de mostrar o painel.");
    } catch (falha) {
      toast.error(falha instanceof Error ? falha.message : "Não foi possível revogar.");
    }
    setRevogando("");
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        if (!abrir) {
          aoFechar();
          setNovoLink("");
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tv className="size-5" /> Modo TV
          </DialogTitle>
          <DialogDescription>
            Abra o link no navegador da TV da oficina: ela mostra os carros que chegam hoje e o pátio, atualizando sozinha. Não precisa de login e não mostra valores nem dados dos clientes.
          </DialogDescription>
        </DialogHeader>

        {novoLink ? (
          <div className="flex flex-col gap-2 rounded-xl border p-3">
            <p className="text-sm font-medium">Link criado. Copie agora: ele não aparece de novo.</p>
            <div className="flex gap-2">
              <Input readOnly value={novoLink} aria-label="Link da TV" onFocus={(e) => e.target.select()} className="font-mono text-xs" />
              <Button variant="outline" onClick={() => void copiar()}>
                {copiado ? <Check /> : <Copy />} {copiado ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void gerar();
            }}
          >
            <Field className="flex-1 gap-1.5">
              <FieldLabel htmlFor="tv-nome">Nome da TV</FieldLabel>
              <Input id="tv-nome" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} />
            </Field>
            <Button type="submit" carregando={criar.isPending}>
              Gerar link
            </Button>
          </form>
        )}

        <div className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-sm font-semibold">Links ativos</h3>
          {ativos.length === 0 ? (
            <p className="text-muted-foreground text-sm">{consulta.isPending ? "Carregando…" : "Nenhuma TV ligada ainda."}</p>
          ) : (
            <ul className="flex flex-col divide-y rounded-xl border">
              {ativos.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.nome}</p>
                    <p className="text-muted-foreground text-xs">
                      Criado em {quando(a.criadoEm)} · último acesso {quando(a.ultimoUso)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" carregando={revogando === a.id} disabled={revogando !== "" && revogando !== a.id} onClick={() => void revogarLink(a.id)}>
                    Revogar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
