import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Mostrada no lugar da tela quando o perfil do funcionário não tem a permissão exigida. */
export function SemPermissao() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <ShieldAlert className="text-muted-foreground size-10" />
      <h1 className="text-2xl font-semibold">Sem permissão</h1>
      <p className="text-muted-foreground max-w-sm text-sm">Seu perfil não tem acesso a esta tela. Se precisar dela, peça ao administrador.</p>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
