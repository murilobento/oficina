import { useState } from "react";

import { toast } from "sonner";

import { Listagem, ListagemCabecalho, ListagemVazia } from "@/components/layout/listagem";
import { ConfirmarExclusaoRegistro } from "@/components/layout/registro-partes";

import { type PerfilApi, useExcluirPerfil, usePerfis, usePerfisConsulta, useSalvarPerfil } from "./api";
import { PerfilForm, type PerfilFormValores } from "./perfil-form";
import { PerfisCards } from "./perfis-cards";

/** Tela de perfis: cartões com os perfis e o formulário para editar nome, descrição e permissões por módulo. */
export function Perfis() {
  const consulta = usePerfisConsulta();
  const perfis = usePerfis();
  const salvarPerfil = useSalvarPerfil();
  const excluirPerfil = useExcluirPerfil();
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<PerfilApi | null>(null);
  const [paraExcluir, setParaExcluir] = useState<PerfilApi | null>(null);

  function abrir(perfil: PerfilApi | null) {
    setEmEdicao(perfil);
    setFormAberto(true);
  }

  async function salvar(valores: PerfilFormValores) {
    await salvarPerfil.mutateAsync({ id: emEdicao?.id, dados: valores });
    toast.success(emEdicao ? `Perfil ${valores.nome} atualizado.` : `Perfil ${valores.nome} criado.`);
    setFormAberto(false);
  }

  async function excluir() {
    if (!paraExcluir) return;
    const perfil = paraExcluir;
    setParaExcluir(null);
    try {
      await excluirPerfil.mutateAsync(perfil.id);
      toast.success(`Perfil ${perfil.nome} excluído.`);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir. Tente de novo.");
    }
  }

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Perfis"
        descricao="O que cada função pode fazer no sistema. Vale para todos que têm o perfil."
        rotuloNovo="Novo perfil"
        aoNovo={() => abrir(null)}
      />

      {consulta.isPending || consulta.isError ? (
        <ListagemVazia>{consulta.isPending ? "Carregando…" : consulta.error.message}</ListagemVazia>
      ) : (
        <PerfisCards perfis={perfis} aoEditar={abrir} aoExcluir={setParaExcluir} />
      )}

      <PerfilForm
        aberto={formAberto}
        perfil={emEdicao}
        aoFechar={() => setFormAberto(false)}
        aoSalvar={salvar}
      />
      <ConfirmarExclusaoRegistro
        nome={paraExcluir?.nome ?? null}
        singular="perfil"
        aoCancelar={() => setParaExcluir(null)}
        aoConfirmar={() => void excluir()}
      />
    </Listagem>
  );
}
