import { Lock, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PERMISSOES } from "@/features/auth/permissoes";

import { MODULOS, moduloDaPermissao, type PerfilAcesso } from "./data";

/** Lista de perfis em cartões: funciona no celular e no computador. */
export function PerfisCards({
  perfis,
  usuariosPorPerfil,
  aoEditar,
}: {
  perfis: PerfilAcesso[];
  usuariosPorPerfil: Record<string, number>;
  aoEditar: (perfil: PerfilAcesso) => void;
}) {
  const totalPermissoes = Object.keys(PERMISSOES).length;

  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {perfis.map((perfil) => {
        const modulos = MODULOS.filter((modulo) =>
          perfil.permissoes.some((permissao) => moduloDaPermissao(permissao) === modulo.id),
        );
        const pessoas = usuariosPorPerfil[perfil.id] ?? 0;

        return (
          <li key={perfil.id} className="bg-card flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium">
                  {perfil.nome}
                  {perfil.protegido && (
                    <Lock className="text-muted-foreground size-3.5" aria-label="Perfil protegido" />
                  )}
                </p>
                <p className="text-muted-foreground text-sm">{perfil.descricao}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                aria-label={`Editar ${perfil.nome}`}
                onClick={() => aoEditar(perfil)}
              >
                <Pencil /> Editar
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {modulos.length === 0 ? (
                <span className="text-muted-foreground text-sm">Sem permissões</span>
              ) : (
                modulos.map((modulo) => (
                  <Badge key={modulo.id} variant="secondary" className="font-normal">
                    {modulo.nome}
                  </Badge>
                ))
              )}
            </div>

            <p className="text-muted-foreground mt-auto text-xs tabular-nums">
              {perfil.permissoes.length} de {totalPermissoes} permissões · {pessoas}{" "}
              {pessoas === 1 ? "funcionário" : "funcionários"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
