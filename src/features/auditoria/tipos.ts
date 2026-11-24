import { Banknote, Boxes, FileX, KeyRound, type LucideIcon, ShieldCheck, Tag, Trash2 } from "lucide-react";

export type CategoriaAuditoria = "dinheiro" | "estoque" | "precos" | "documentos" | "cadastros" | "acesso" | "login";

export type Mudanca = { campo: string; antes: unknown; depois: unknown };

export type RegistroAuditoria = {
  id: string;
  criadoEm: string;
  usuarioId: string | null;
  usuario: string;
  categoria: CategoriaAuditoria;
  acao: string;
  descricao: string;
  alvo: { tipo: string; id: string } | null;
  detalhes: ({ mudancas?: Mudanca[]; moeda?: boolean } & Record<string, unknown>) | null;
  ip: string | null;
};

export type PaginaAuditoria = { registros: RegistroAuditoria[]; proximo: string | null };

export const CATEGORIAS: Record<CategoriaAuditoria, { texto: string; icone: LucideIcon }> = {
  dinheiro: { texto: "Dinheiro", icone: Banknote },
  estoque: { texto: "Estoque", icone: Boxes },
  precos: { texto: "Preços", icone: Tag },
  documentos: { texto: "Documentos", icone: FileX },
  cadastros: { texto: "Exclusões", icone: Trash2 },
  acesso: { texto: "Acessos e permissões", icone: ShieldCheck },
  login: { texto: "Entradas no sistema", icone: KeyRound },
};

/** Ações que merecem atenção: saída de dinheiro, cancelamento, senha errada, alguém ganhando acesso. */
export function ehSensivel(registro: RegistroAuditoria): boolean {
  switch (registro.acao) {
    case "venda.pagamento_estornado":
    case "venda.cancelada":
    case "compra.cancelada":
    case "login.senha_errada":
    case "funcionario.perfil_alterado":
    case "funcionario.senha_redefinida":
      return true;
    case "perfil.alterado":
      return Array.isArray(registro.detalhes?.incluidas) && registro.detalhes.incluidas.length > 0;
    default:
      return false;
  }
}

/** Tela onde o registro alvo aparece, para o link do painel. */
export const TELA_DO_ALVO: Record<string, { url: string; texto: string }> = {
  venda: { url: "/vendas", texto: "Vendas" },
  compra: { url: "/compras", texto: "Compras" },
  produto: { url: "/produtos", texto: "Produtos" },
  servico: { url: "/servicos", texto: "Serviços" },
  cliente: { url: "/clientes", texto: "Clientes" },
  fornecedor: { url: "/fornecedores", texto: "Fornecedores" },
  veiculo: { url: "/veiculos", texto: "Veículos" },
  orcamento: { url: "/orcamentos", texto: "Orçamentos" },
  ordem: { url: "/ordens", texto: "Ordens de serviço" },
  acerto: { url: "/estoque/acertos", texto: "Acertos de estoque" },
  funcionario: { url: "/admin/usuarios", texto: "Funcionários" },
  perfil: { url: "/admin/perfis", texto: "Perfis" },
  empresa: { url: "/admin/empresa", texto: "Dados da empresa" },
};

/** Ações em que o registro alvo deixou de existir. */
export const alvoExcluido = (registro: RegistroAuditoria) => registro.acao.endsWith(".excluido");

export const PERIODOS = [
  { valor: "7", texto: "Últimos 7 dias" },
  { valor: "hoje", texto: "Hoje" },
  { valor: "30", texto: "Últimos 30 dias" },
  { valor: "tudo", texto: "Tudo" },
];

/** Início do período em ISO (meia-noite local), ou nada para "tudo". */
export function inicioDoPeriodo(periodo: string, agora = new Date()): string | undefined {
  if (periodo === "tudo") return undefined;
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  if (periodo !== "hoje") inicio.setDate(inicio.getDate() - (Number(periodo) - 1));
  return inicio.toISOString();
}

/** "Hoje", "Ontem" ou a data, para agrupar a lista por dia. */
export function rotuloDia(iso: string, agora = new Date()): string {
  const dia = new Date(iso);
  const chave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);
  if (chave(dia) === chave(agora)) return "Hoje";
  if (chave(dia) === chave(ontem)) return "Ontem";
  return dia.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: dia.getFullYear() === agora.getFullYear() ? undefined : "numeric" });
}

export const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
