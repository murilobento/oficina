
import * as React from "react";

import { useNavigate } from "@tanstack/react-router";

import { type LucideIcon, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useModulosPermitidos } from "@/navigation/acesso";
import type { NavModule } from "@/navigation/sidebar-items";

type SearchItem = {
  id: string;
  group: string;
  label: string;
  url: string;
  icon?: LucideIcon;
};

// Só entram na busca as telas que já existem (itens com endereço) e que a pessoa pode abrir.
function montarItens(modulos: NavModule[]): SearchItem[] {
  return modulos.flatMap((module) => {
    if (module.url) {
      return [{ id: module.id, group: "Geral", label: module.title, url: module.url, icon: module.icon }];
    }
    return (module.groups ?? []).flatMap((group) =>
      group.items.flatMap((item) =>
        item.url ? [{ id: item.id, group: module.title, label: item.title, url: item.url, icon: module.icon }] : [],
      ),
    );
  });
}


function groupBy(items: SearchItem[]) {
  const groups = [...new Set(items.map((item) => item.group))];
  return groups.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  }));
}

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const navigate = useNavigate();
  const modulos = useModulosPermitidos();
  const searchItems = React.useMemo(() => montarItens(modulos), [modulos]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // toLowerCase: com Caps Lock ligado a tecla chega como "K" maiúsculo.
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setQuery("");
  };

  const handleSelect = (item: SearchItem) => {
    handleOpenChange(false);
    void navigate({ to: item.url });
  };

  const renderGroups = (items: SearchItem[]) =>
    groupBy(items).map(({ group, items: groupItems }, index) => (
      <React.Fragment key={group}>
        {index > 0 && <CommandSeparator />}
        <CommandGroup heading={group}>
          {groupItems.map((item) => (
            <CommandItem
              key={`${group}-${item.id}`}
              value={`${item.group} ${item.label}`}
              onSelect={() => handleSelect(item)}
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.icon && <item.icon />}
                <span className="truncate">{item.label}</span>
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </React.Fragment>
    ));

  return (
    <>
      <Button
        onClick={() => handleOpenChange(true)}
        variant="ghost"
        aria-label="Buscar telas"
        className="text-muted-foreground px-2.5 max-md:size-11 max-md:px-0 md:px-0! hover:bg-transparent"
      >
        <Search data-icon="inline-start" className="max-md:size-5" />
        <span className="max-md:sr-only">Buscar</span>
        <kbd className="bg-muted hidden h-5 md:inline-flex items-center gap-1 rounded border px-1.5 text-[10px] font-medium select-none">
          Ctrl K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <Command>
          <CommandInput placeholder="Buscar telas…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            {renderGroups(searchItems)}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
