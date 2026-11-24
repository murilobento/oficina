import { useMemo, useState } from "react";

import { CircleAlert } from "lucide-react";

import { Listagem, ListagemAbas, ListagemBusca, ListagemCabecalho, ListagemCartoes, ListagemFiltros, ListagemVazia } from "@/components/layout/listagem";
import { FitaStatus } from "@/components/marca/fita-status";
import { PlacaVeiculo } from "@/components/marca/placa-veiculo";
import { usePode } from "@/features/auth/sessao";
import { usePessoas } from "@/features/pessoas/api";
import { useVeiculos } from "@/features/veiculos/api";
import { useAbrirQuandoPedido } from "@/lib/acao-novo";
import { normalizar } from "@/lib/listagem";

import { useOrdensConsulta } from "./api";
import { OrdemDetalhe } from "./ordem-detalhe";
import { OrdemForm } from "./ordem-form";
import { contarPorEtapa, ETAPAS, FINAIS, infoStatus, noPatio, type Ordem, type StatusOrdem, tempoDesde } from "./tipos";

type Filtro = "patio" | StatusOrdem;

/** Quadro das OS: por padrão, só os carros no pátio (da que entrou antes para a depois). */
export function OrdensLista() {
  const consulta = useOrdensConsulta();
  const ordens = useMemo(() => consulta.data ?? [], [consulta.data]);
  const clientes = usePessoas("cliente");
  const veiculos = useVeiculos();
  const podeAbrir = usePode("ordens.editar");
  const [filtro, setFiltro] = useState<Filtro>("patio");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ aberto: false, abertura: 0 });
  const [verId, setVerId] = useState("");

  useAbrirQuandoPedido("ordem", () => podeAbrir && setForm((a) => ({ aberto: true, abertura: a.abertura + 1 })));

  const contagem = contarPorEtapa(ordens);
  const termo = normalizar(busca);
  const veiculo = (o: Ordem) => veiculos.find((v) => v.id === o.veiculoId);
  const cliente = (o: Ordem) => clientes.find((c) => c.id === o.clienteId);

  const visiveis = ordens
    .filter((o) => (filtro === "patio" ? noPatio(o) : o.status === filtro))
    .filter((o) => termo === "" || normalizar(`${o.numero} ${cliente(o)?.nome ?? ""} ${veiculo(o)?.modelo ?? ""} ${veiculo(o)?.placa ?? ""}`).includes(termo))
    .sort((a, b) => (filtro === "patio" ? a.criadoEm.localeCompare(b.criadoEm) : b.criadoEm.localeCompare(a.criadoEm)));

  const filtros: { id: Filtro; texto: string; total: number }[] = [
    { id: "patio", texto: "No pátio", total: ordens.filter(noPatio).length },
    ...ETAPAS.map((e) => ({ id: e.status, texto: e.texto, total: contagem[e.status] })),
    ...FINAIS.map((e) => ({ id: e.status, texto: e.texto, total: contagem[e.status] })),
  ];

  const aberta = ordens.find((o) => o.id === verId) ?? null;

  return (
    <Listagem>
      <ListagemCabecalho
        titulo="Ordens de serviço"
        descricao="Carros no pátio, do orçamento aprovado à entrega."
        rotuloNovo="Nova OS"
        aoNovo={podeAbrir ? () => setForm((a) => ({ aberto: true, abertura: a.abertura + 1 })) : undefined}
      />

      <ListagemAbas
        rotulo="Etapas"
        valor={filtro}
        aoMudar={setFiltro}
        abas={filtros.map((f) => ({ valor: f.id, texto: f.texto, total: f.total }))}
      />

      <ListagemFiltros>
        <ListagemBusca valor={busca} aoMudar={setBusca} placeholder="Número, cliente, modelo ou placa" rotulo="Buscar ordens de serviço" />
      </ListagemFiltros>

      {consulta.isError ? (
        <ListagemVazia>Não foi possível carregar as ordens de serviço.</ListagemVazia>
      ) : (
        <ListagemCartoes sempre>
          {visiveis.map((o) => {
            const info = infoStatus(o.status);
            const v = veiculo(o);
            const pendentes = o.itens.filter((i) => i.situacao === "pendente").length;
            return (
              <li key={o.id} className="bg-card flex min-w-0 flex-col overflow-hidden rounded-xl border">
                <button type="button" className="hover:bg-muted/50 flex flex-col gap-2 p-4 text-left" onClick={() => setVerId(o.id)}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground font-mono text-sm">{o.numero}</span>
                    <FitaStatus tom={info.tom} icone={info.icone}>
                      {info.texto}
                    </FitaStatus>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{v?.modelo ?? "Veículo removido"}</span>
                      <span className="text-muted-foreground block truncate text-sm">{cliente(o)?.nome ?? "Cliente removido"}</span>
                    </span>
                    {v?.placa && <PlacaVeiculo placa={v.placa} tamanho="sm" />}
                  </span>
                  {o.problema && <span className="text-muted-foreground line-clamp-2 text-sm">{o.problema}</span>}
                </button>
                <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5">
                  {pendentes > 0 ? (
                    <span className="text-atencao flex items-center gap-1 text-xs font-semibold">
                      <CircleAlert className="size-3.5" /> {pendentes} extra{pendentes > 1 ? "s" : ""} p/ aprovar
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">{o.itens.filter((i) => i.situacao === "aprovado").length} itens</span>
                  )}
                  <span className="text-muted-foreground text-xs tabular-nums">{noPatio(o) ? tempoDesde(o.criadoEm) : new Date(o.atualizadoEm).toLocaleDateString("pt-BR")}</span>
                </div>
              </li>
            );
          })}
          {visiveis.length === 0 && (
            <li className="col-span-full">
              <ListagemVazia>{consulta.isPending ? "Carregando..." : filtro === "patio" ? "Nenhum carro no pátio." : "Nenhuma OS nesta etapa."}</ListagemVazia>
            </li>
          )}
        </ListagemCartoes>
      )}

      <OrdemForm key={form.abertura} aberto={form.aberto} aoFechar={() => setForm((a) => ({ ...a, aberto: false }))} aoAberta={(id) => setVerId(id)} />
      <OrdemDetalhe key={verId} ordem={aberta} aoFechar={() => setVerId("")} />
    </Listagem>
  );
}
