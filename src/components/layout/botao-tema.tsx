import { Moon, Sun } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

/** Alterna entre tema claro e escuro (o padrão é o claro). */
export function BotaoTema() {
  const { resolvido, setPreference } = usePreferencesStore(
    useShallow((state) => ({ resolvido: state.resolvedThemeMode, setPreference: state.setPreference })),
  );
  const escuro = resolvido === "dark";
  return (
    <Button
      size="icon"
      variant="outline"
      aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
      onClick={() => setPreference("theme_mode", escuro ? "light" : "dark")}
    >
      {escuro ? <Sun /> : <Moon />}
    </Button>
  );
}
