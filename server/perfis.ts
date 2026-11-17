import { PERMISSOES, type Permissao } from "../src/features/auth/permissoes";
import { perfisIniciais } from "../src/features/perfis/data";

import type { Banco } from "./banco";

/** Cria os perfis iniciais que ainda não existem. Perfis já ajustados pelo administrador não são sobrescritos. */
export async function semearPerfis(banco: Banco): Promise<void> {
  for (const perfil of perfisIniciais) {
    const novos = await banco.consultar(
      `insert into perfis (id, nome, descricao, protegido) values ($1, $2, $3, $4) on conflict (id) do nothing returning id`,
      [perfil.id, perfil.nome, perfil.descricao, perfil.protegido],
    );
    if (novos.length === 0) continue;
    for (const permissao of perfil.permissoes) {
      await banco.consultar(`insert into perfil_permissoes (perfil_id, permissao) values ($1, $2) on conflict do nothing`, [perfil.id, permissao]);
    }
  }
}

/** Permissões do perfil. O perfil protegido (Administrador) sempre tem todas. */
export async function permissoesDoPerfil(banco: Banco, perfilId: string): Promise<Permissao[]> {
  const [perfil] = await banco.consultar<{ protegido: boolean }>("select protegido from perfis where id = $1", [perfilId]);
  if (!perfil) return [];
  if (perfil.protegido) return Object.keys(PERMISSOES) as Permissao[];
  const linhas = await banco.consultar<{ permissao: Permissao }>("select permissao from perfil_permissoes where perfil_id = $1 order by permissao", [perfilId]);
  return linhas.map((linha) => linha.permissao);
}
