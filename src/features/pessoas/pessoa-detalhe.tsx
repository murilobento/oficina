import type { ReactNode } from "react";

import { Pencil, Trash2, UserCheck, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { VeiculosDoCliente } from "@/features/veiculos/veiculos-do-cliente";

import { mascararCEP, mascararDocumento, mascararTelefone } from "./documento";
import type { EntidadeConfig } from "./entidades";
import { StatusBadge } from "./pessoa-partes";
import { type Pessoa, rotuloDocumento, rotuloTipo } from "./tipos";

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Dado({ rotulo, children, largo }: { rotulo: string; children: ReactNode; largo?: boolean }) {
  const vazio = children === "" || children === null || children === undefined || children === false;
  return (
    <div className={largo ? "flex flex-col gap-0.5 sm:col-span-2" : "flex flex-col gap-0.5"}>
      <dt className="text-muted-foreground text-sm">{rotulo}</dt>
      <dd className={vazio ? "text-muted-foreground text-sm" : "text-sm break-words"}>
        {vazio ? "Não informado" : children}
      </dd>
    </div>
  );
}

/** Painel lateral de visualização, o mesmo para clientes e fornecedores. */
export function PessoaDetalhe({
  config,
  aberto,
  pessoa,
  aoFechar,
  aoEditar,
  aoAlternarAtivo,
  aoExcluir,
}: {
  config: EntidadeConfig;
  aberto: boolean;
  pessoa: Pessoa | null;
  aoFechar: () => void;
  aoEditar: (pessoa: Pessoa) => void;
  aoAlternarAtivo: (pessoa: Pessoa) => void;
  aoExcluir: (pessoa: Pessoa) => void;
}) {
  const pessoaJuridica = pessoa?.tipo === "PJ";

  return (
    <Sheet open={aberto && pessoa !== null} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-xl!">
        {pessoa && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="pr-8 break-words">{pessoa.nome}</SheetTitle>
              <SheetDescription>{pessoa.nomeFantasia || `Cadastro de ${config.singular}`}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary" className="font-normal">
                  {rotuloTipo(pessoa.tipo)}
                </Badge>
                <StatusBadge ativo={pessoa.ativo} />
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
              <Secao titulo="Identificação">
                <Dado rotulo={rotuloDocumento(pessoa.tipo)}>{mascararDocumento(pessoa.tipo, pessoa.documento)}</Dado>
                <Dado rotulo={pessoaJuridica ? "Razão social" : "Nome completo"}>{pessoa.nome}</Dado>
                {pessoaJuridica && (
                  <>
                    <Dado rotulo="Nome fantasia">{pessoa.nomeFantasia}</Dado>
                    <Dado rotulo="Situação cadastral">{pessoa.situacaoCadastral}</Dado>
                    <Dado rotulo="CNAE principal" largo>
                      {pessoa.cnaePrincipal}
                    </Dado>
                  </>
                )}
                {config.camposExtras.map((campo) => (
                  <Dado key={campo.nome} rotulo={campo.rotulo}>
                    {pessoa.extras[campo.nome] ?? ""}
                  </Dado>
                ))}
              </Secao>

              <Secao titulo="Contato">
                <Dado rotulo="Celular">
                  {pessoa.celular && (
                    <a className="-my-2 inline-block py-2 underline underline-offset-2" href={`tel:+55${pessoa.celular}`}>
                      {mascararTelefone(pessoa.celular)}
                    </a>
                  )}
                </Dado>
                <Dado rotulo="Telefone">
                  {pessoa.telefone && (
                    <a className="-my-2 inline-block py-2 underline underline-offset-2" href={`tel:+55${pessoa.telefone}`}>
                      {mascararTelefone(pessoa.telefone)}
                    </a>
                  )}
                </Dado>
                <Dado rotulo="E-mail" largo>
                  {pessoa.email && (
                    <a className="-my-2 inline-block py-2 underline underline-offset-2" href={`mailto:${pessoa.email}`}>
                      {pessoa.email}
                    </a>
                  )}
                </Dado>
              </Secao>

              <Secao titulo="Endereço">
                <Dado rotulo="CEP">{mascararCEP(pessoa.cep)}</Dado>
                <Dado rotulo="Logradouro">{pessoa.logradouro}</Dado>
                <Dado rotulo="Número">{pessoa.numero}</Dado>
                <Dado rotulo="Complemento">{pessoa.complemento}</Dado>
                <Dado rotulo="Bairro">{pessoa.bairro}</Dado>
                <Dado rotulo="Cidade / UF">{[pessoa.cidade, pessoa.uf].filter(Boolean).join("/")}</Dado>
              </Secao>

              {config.chave === "clientes" && <VeiculosDoCliente clienteId={pessoa.id} />}

              <Secao titulo="Outras informações">
                <Dado rotulo="Observações" largo>
                  {pessoa.observacoes && <span className="whitespace-pre-wrap">{pessoa.observacoes}</span>}
                </Dado>
                <Dado rotulo="Cadastrado em">
                  {new Date(pessoa.criadoEm).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </Dado>
              </Secao>
            </div>

            <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t">
              <Button
                variant="outline"
                className="text-destructive"
                aria-label={`Excluir ${pessoa.nome}`}
                onClick={() => aoExcluir(pessoa)}
              >
                <Trash2 /> Excluir
              </Button>
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => aoAlternarAtivo(pessoa)}>
                {pessoa.ativo ? <UserX /> : <UserCheck />}
                {pessoa.ativo ? "Inativar" : "Ativar"}
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={() => aoEditar(pessoa)}>
                <Pencil /> Editar
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
