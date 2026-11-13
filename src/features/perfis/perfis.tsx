import { useMemo, useState } from "react";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { usuariosIniciais } from "@/features/usuarios/data";

import { type PerfilAcesso, perfisIniciais } from "./data";
import { PerfilForm, type PerfilFormValores } from "./perfil-form";
import { PerfisCards } from "./perfis-cards";

/**
 * Tela de perfis (protótipo): cartões com os perfis e o formulário para editar nome, descrição
 * e permissões por módulo. Os dados ficam só na memória até a ligação com o Supabase.
 */
export function Perfis() {
  const [perfis, setPerfis] = useState<PerfilAcesso[]>(perfisIniciais);
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<PerfilAcesso | null>(null);

  // Quantos funcionários têm cada perfil (vem da lista de exemplo da tela de funcionários).
  const usuariosPorPerfil = useMemo(() => {
    const contagem: Record<string, number> = {};
    for (const usuario of usuariosIniciais) {
      contagem[usuario.perfilId] = (contagem[usuario.perfilId] ?? 0) + 1;
    }
    return contagem;
  }, []);

  function abrir(perfil: PerfilAcesso | null) {
    setEmEdicao(perfil);
    setFormAberto(true);
  }

  function salvar(valores: PerfilFormValores) {
    if (emEdicao) {
      setPerfis((lista) => lista.map((item) => (item.id === emEdicao.id ? { ...item, ...valores } : item)));
      toast.success(`Perfil ${valores.nome} atualizado.`);
    } else {
      const novo: PerfilAcesso = { id: crypto.randomUUID(), ...valores, protegido: false };
      setPerfis((lista) => [...lista, novo]);
      toast.success(`Perfil ${valores.nome} criado.`);
    }
    setFormAberto(false);
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Perfis</h1>
          <p className="text-muted-foreground text-sm">
            O que cada função pode fazer no sistema. Vale para todos que têm o perfil.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => abrir(null)}>
          <Plus /> <span className="hidden sm:inline">Novo perfil</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      <PerfisCards perfis={perfis} usuariosPorPerfil={usuariosPorPerfil} aoEditar={abrir} />

      <PerfilForm
        aberto={formAberto}
        perfil={emEdicao}
        nomesEmUso={perfis.filter((item) => item.id !== emEdicao?.id).map((item) => item.nome.toLowerCase())}
        aoFechar={() => setFormAberto(false)}
        aoSalvar={salvar}
      />
    </div>
  );
}
