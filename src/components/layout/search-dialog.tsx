
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
import { navModules } from "@/navigation/sidebar-items";

type SearchItem = {
  id: string;
  group: string;
  label: string;
  url: string;
  icon?: LucideIcon;
};

// Só entram na busca as telas que já existem (itens com endereço).
const searchItems: SearchItem[] = navModules.flatMap((module) => {
  if (module.url) {
    return [{ id: module.id, group: "Geral", label: module.title, url: module.url, icon: module.icon }];
  }
  return (module.groups ?? []).flatMap((group) =>
    group.items.flatMap((item) =>
      item.url ? [{ id: item.id, group: module.title, label: item.title, url: item.url, icon: module.icon }] : [],
    ),
  );
});

const recommendations = searchItems;

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
        variant="link"
        className="text-muted-foreground px-0! font-normal hover:no-underline"
      >
        <Search data-icon="inline-start" />
        Buscar
        <kbd className="bg-muted hidden h-5 md:inline-flex items-center gap-1 rounded border px-1.5 text-[10px] font-medium select-none">
          Ctrl K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <Command>
          <CommandInput placeholder="Buscar telas…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            {query ? renderGroups(searchItems) : renderGroups(recommendations)}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
