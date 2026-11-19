# Roteiro: OS → Caixa → Contato → Agenda

Decidido com o Murilo em 19/11/2026. Quem usa: recepção (balcão), mecânicos (pátio, celular) e dono/gerência.
Fluxo da oficina: orçamento → aprovação → serviço → entrega.

## Fase 1 — Ordem de serviço

**Origem**
- De orçamento aprovado: botão **Abrir OS** no detalhe do orçamento (copia cliente, veículo, km, problema e itens). Orçamento passa a "Em serviço".
- Direta, sem orçamento (urgência): cliente + veículo + problema; itens podem entrar depois, valor sai no fim.

**Status (simples)**: Na fila → Em execução → Aguardando peça → Pronto → Entregue. Cancelada à parte.
- **Entregue** = abre a etapa de recebimento já existente e gera a **venda** (itens aprovados da OS). A baixa de estoque continua acontecendo na venda.

**Fila de todos**: sem mecânico responsável. A tela de OS é um quadro por status (lista com filtros no celular, colunas no computador), com tempo desde a entrada.

**No celular do mecânico**
- Mudar status (botões grandes: Iniciar, Aguardando peça, Pronto).
- Registrar peça/serviço usado: do cadastro ou avulso. Item da OS que não estava no orçamento entra como **extra – aguardando aprovação**.
- Anotações / laudo: o que encontrou e recomendação para a próxima visita (fica no histórico do veículo).
- Cada mudança registra quem e quando (linha do tempo da OS).

**Extras**: a recepção liga para o cliente e marca **Aprovado** ou **Recusado**. Só itens aprovados vão para a venda.

**Valores**: o Murilo quer que o mecânico veja preços na OS. Proposta: liberar `valores.ver` no perfil Mecânico (tela Perfis), em vez de abrir exceção só na OS — confirmar, porque isso também mostra preços em orçamentos e vendas.

**Permissões novas**: `ordens.ver`, `ordens.editar` (abrir, editar itens, aprovar extras, entregar), `ordens.executar` (mudar status, apontar itens, laudo — o mecânico).

**Dados**: `ordens` (numero OS-0001, cliente, veículo, km, problema, laudo, status, orcamento_id, venda_id, datas), `ordem_itens` (como orçamento + `situacao`: orcado | extra_pendente | aprovado | recusado), `ordem_eventos` (status, quem, quando, texto).

**Início**: card "No pátio" com contagem por status.

## Fase 2 — Caixa e relatórios
- Fechamento do dia: recebido por forma (dinheiro, pix, débito, crédito), incluindo recebimentos de parcelas; estornos à parte; conferência do dinheiro em gaveta.
- Mês: faturamento, ticket médio, serviços e peças mais vendidos, compras (saídas), a receber e vencido.
- Só com `valores.ver` (+ nova `relatorios.ver`).

## Fase 3 — Contato com cliente (WhatsApp)
- Links `wa.me` com texto pronto (sem integração paga): enviar orçamento (PDF), avisar "carro pronto" (OS em Pronto), recibo da venda, cobrar parcela vencida (tela A receber), lembrete de revisão por data/km a partir do laudo.

## Fase 4 — Agenda
- Horários por dia com cliente/veículo e serviço previsto; ao chegar, **Abrir OS** do agendamento; capacidade de carros por dia.

## Fora do roteiro por enquanto
Link para o cliente aprovar online, impressão de recibo/venda (pode entrar na Fase 3), importação de dados, logo do PWA.
