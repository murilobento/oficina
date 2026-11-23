import { useState } from "react";

import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { mascararDocumento } from "@/features/pessoas/documento";
import type { Pessoa } from "@/features/pessoas/tipos";
import { normalizar } from "@/lib/listagem";
import { cn } from "@/lib/utils";

const MAXIMO_NA_LISTA = 30;

/**
 * Escolha de cliente por digitação: abre uma lista, filtra pelo nome (sem diferenciar acentos
 * ou maiúsculas, e também pelo CPF/CNPJ) e, no fim, oferece cadastrar um novo cliente com o
 * que foi digitado.
 */
export function CampoCliente({
  id,
  valor,
  clientes,
  invalido,
  aoMudar,
  aoCadastrar,
  entidade = "cliente",
}: {
  id: string;
  /** Id do cliente escolhido ("" = nenhum). */
  valor: string;
  clientes: Pessoa[];
  invalido?: boolean;
  aoMudar: (id: string) => void;
  /** Chamado com o texto digitado, para o cadastro rápido já vir com o nome. */
  aoCadastrar: (nomeDigitado: string) => void;
  /** Como a pessoa é chamada nos textos ("cliente", "fornecedor"). */
  entidade?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");

  const escolhido = clientes.find((cliente) => cliente.id === valor);
  const termo = normalizar(busca.trim());
  const termoDocumento = termo.replace(/[^a-z0-9]/g, "");
  const encontrados = clientes.filter(
    (cliente) =>
      termo === "" ||
      normalizar(`${cliente.nome} ${cliente.nomeFantasia}`).includes(termo) ||
      (termoDocumento !== "" && cliente.documento.toLowerCase().includes(termoDocumento)),
  );

  function abrirOuFechar(abrir: boolean) {
    setAberto(abrir);
    if (!abrir) setBusca("");
  }

  return (
    <Popover open={aberto} onOpenChange={abrirOuFechar}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          aria-invalid={invalido}
          className={cn(
            "min-w-0 flex-1 justify-between px-3 font-normal",
            !escolhido && "text-muted-foreground",
          )}
        >
          <span className="truncate">{escolhido ? escolhido.nome : `Digite para buscar o ${entidade}`}</span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        {/* A filtragem é feita aqui (sem acento e por documento), por isso shouldFilter={false}. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={busca}
            onValueChange={setBusca}
            placeholder={`Nome ou CPF/CNPJ do ${entidade}`}
            aria-label={`Buscar ${entidade}`}
          />
          <CommandList>
            {encontrados.slice(0, MAXIMO_NA_LISTA).map((cliente) => (
              <CommandItem
                key={cliente.id}
                value={cliente.id}
                className="min-h-11 md:min-h-8"
                onSelect={() => {
                  aoMudar(cliente.id);
                  abrirOuFechar(false);
                }}
              >
                <Check className={cn("size-4 shrink-0", cliente.id === valor ? "opacity-100" : "opacity-0")} />
                <span className="min-w-0">
                  <span className="block truncate">{cliente.nome}</span>
                  {cliente.documento && (
                    <span className="text-muted-foreground block truncate text-xs">
                      {mascararDocumento(cliente.tipo, cliente.documento)}
                    </span>
                  )}
                </span>
              </CommandItem>
            ))}
            {encontrados.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">Nenhum {entidade} encontrado.</p>
            )}
            {encontrados.length > MAXIMO_NA_LISTA && (
              <p className="text-muted-foreground py-2 text-center text-xs">Digite mais para refinar a busca.</p>
            )}
          </CommandList>
          <CommandSeparator />
          <CommandGroup>
            <CommandItem
              value="__novo__"
              className="min-h-11 md:min-h-8"
              onSelect={() => {
                const digitado = busca.trim();
                abrirOuFechar(false);
                aoCadastrar(digitado);
              }}
            >
              <Plus className="size-4" />
              {busca.trim() ? `Cadastrar "${busca.trim()}"` : `Cadastrar novo ${entidade}`}
            </CommandItem>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
