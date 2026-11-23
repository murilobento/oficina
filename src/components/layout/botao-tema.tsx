import { Moon, Sun } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

/** Item do menu do usuário que alterna entre tema claro e escuro (o padrão é o claro). */
export function ItemTema() {
  const { resolvido, setPreference } = usePreferencesStore(
    useShallow((state) => ({ resolvido: state.resolvedThemeMode, setPreference: state.setPreference })),
  );
  const escuro = resolvido === "dark";
  return (
    <DropdownMenuItem
      onSelect={(evento) => {
        // Mantém o menu aberto: dá para ver a troca e voltar atrás.
        evento.preventDefault();
        setPreference("theme_mode", escuro ? "light" : "dark");
      }}
    >
      {escuro ? <Sun /> : <Moon />}
      {escuro ? "Tema claro" : "Tema escuro"}
    </DropdownMenuItem>
  );
}
