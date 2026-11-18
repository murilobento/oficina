import { useState } from "react";

import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizar } from "@/lib/listagem";
import { cn } from "@/lib/utils";

const MAXIMO_NA_LISTA = 40;

/** Escolha de um item de uma lista longa por digitação (sem diferenciar acentos nem maiúsculas). */
export function CampoBusca({
  id,
  valor,
  opcoes,
  placeholder,
  carregando = false,
  desabilitado = false,
  aoEscolher,
}: {
  id: string;
  /** Código da opção escolhida ("" = nenhuma). */
  valor: string;
  opcoes: { codigo: string; nome: string }[];
  placeholder: string;
  carregando?: boolean;
  desabilitado?: boolean;
  aoEscolher: (opcao: { codigo: string; nome: string }) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");

  const escolhida = opcoes.find((opcao) => opcao.codigo === valor);
  const termo = normalizar(busca.trim());
  const encontradas = opcoes.filter((opcao) => termo === "" || normalizar(opcao.nome).includes(termo));

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
          disabled={desabilitado}
          className={cn("w-full min-w-0 justify-between px-3 font-normal", !escolhida && "text-muted-foreground")}
        >
          <span className="truncate uppercase">{carregando ? "Carregando…" : escolhida ? escolhida.nome : placeholder}</span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <Command shouldFilter={false}>
          <CommandInput value={busca} onValueChange={setBusca} placeholder="Digite para buscar" aria-label="Buscar" />
          <CommandList>
            {encontradas.slice(0, MAXIMO_NA_LISTA).map((opcao) => (
              <CommandItem
                key={opcao.codigo}
                value={opcao.codigo}
                className="min-h-11 md:min-h-8"
                onSelect={() => {
                  aoEscolher(opcao);
                  abrirOuFechar(false);
                }}
              >
                <Check className={cn("size-4 shrink-0", opcao.codigo === valor ? "opacity-100" : "opacity-0")} />
                <span className="truncate uppercase">{opcao.nome}</span>
              </CommandItem>
            ))}
            {encontradas.length === 0 && <p className="text-muted-foreground py-4 text-center text-sm">Nada encontrado.</p>}
            {encontradas.length > MAXIMO_NA_LISTA && (
              <p className="text-muted-foreground py-2 text-center text-xs">Digite mais para refinar a busca.</p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
