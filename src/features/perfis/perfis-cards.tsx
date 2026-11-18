import { Lock, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PERMISSOES } from "@/features/auth/permissoes";

import type { PerfilApi } from "./api";
import { MODULOS, moduloDaPermissao } from "./data";

/** Lista de perfis em cartões: funciona no celular e no computador. */
export function PerfisCards({
  perfis,
  aoEditar,
  aoExcluir,
}: {
  perfis: PerfilApi[];
  aoEditar: (perfil: PerfilApi) => void;
  aoExcluir: (perfil: PerfilApi) => void;
}) {
  const totalPermissoes = Object.keys(PERMISSOES).length;

  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-3">
      {perfis.map((perfil) => {
        const modulos = MODULOS.filter((modulo) =>
          perfil.permissoes.some((permissao) => moduloDaPermissao(permissao) === modulo.id),
        );
        const pessoas = perfil.funcionarios;

        return (
          <li key={perfil.id} className="bg-card flex min-w-0 flex-col gap-3 rounded-xl border p-4 uppercase [&_button]:uppercase">
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
              <div className="flex shrink-0 gap-1.5">
                {!perfil.protegido && (
                  <Button variant="outline" aria-label={`Editar ${perfil.nome}`} onClick={() => aoEditar(perfil)}>
                    <Pencil /> Editar
                  </Button>
                )}
                {!perfil.protegido && (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Excluir ${perfil.nome}`}
                    title={pessoas > 0 ? "Troque o perfil dos funcionários antes de excluir." : "Excluir perfil"}
                    disabled={pessoas > 0}
                    onClick={() => aoExcluir(perfil)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
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
