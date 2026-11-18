# Recebimento da venda — redesenho

Substitui o bloco "Pagamento" dentro do formulário (achado confuso: tudo junto, linha em branco valendo o total, "dividir em outra forma", escolha devendo × desconto).

## Fluxo

1. **Etapa 1 — Venda** (itens, cliente, desconto negociado). Botão de baixo: **Continuar para pagamento · R$ 500,00**.
   No orçamento aprovado → "Gerar venda" abre direto na etapa 2 (os itens já estão definidos).
2. **Etapa 2 — Recebimento** (mesma folha, troca o conteúdo; "Voltar" leva aos itens).

```
 ← Voltar                         VND · Recebimento
 TOTAL                                   R$ 500,00
 ─────────────────────────────────────────────────
 Toque na forma — ela já entra com o que falta:
 [Dinheiro] [Pix] [Débito] [Crédito]

 Pix ............................ R$ 400,00   ✕
 ─────────────────────────────────────────────────
 FALTA                                   R$ 100,00

 [ Concluir · R$ 100,00 fica a receber ]   (exige cliente)
 [ Dar R$ 100,00 de desconto e concluir ]
```

- Tocar numa forma adiciona uma linha **já preenchida com o que falta** (sem campo em branco valendo o total). O valor é editável; ✕ remove.
- O cabeçalho mostra sempre TOTAL e, embaixo, FALTA / TROCO / QUITADO, em número grande.
- **Dinheiro**: a linha tem "Valor" e "Entregue"; se entregue > valor, mostra **Troco R$ x**. Grava só o valor.
- **Crédito**: escolha de vezes (1x…12x), informativo; aparece no detalhe e na impressão. Não gera conta a receber.
- **Botão final muda com a situação** (sem rádio escondido):
  - falta 0 → **Concluir venda**;
  - falta > 0 → dois botões: **Concluir · R$ x fica a receber** e **Dar R$ x de desconto e concluir**;
  - sem forma nenhuma → **Concluir · tudo fica a receber** (exige cliente).
- Quem não vê valores: só toca na forma e conclui (a API paga o total), como hoje.

## Fica a receber

Ao escolher "fica a receber", antes de concluir aparece:

```
 A RECEBER  R$ 100,00
 Parcelas [ 2 ▾ ]   1º vencimento [ 18/12/2026 ]
   1/2  18/12/2026  R$ 50,00
   2/2  17/01/2027  R$ 50,00
```

- Divide em partes iguais (centavos que sobram vão para a 1ª); as seguintes a cada 30 dias. Padrão: 1 parcela, vencimento em 30 dias.
- Tabela nova `venda_parcelas` (numero, vencimento, valor). Pagamento recebido depois quita as parcelas **da mais antiga para a mais nova**.
- Estorno reabre na ordem inversa (o saldo é recalculado a partir dos pagamentos; as parcelas mostram pago/aberto por esse cálculo).

## Tela "A receber"

- Lista por **parcela**, ordenada por vencimento; selo **Vencida** (vermelho) / **Vence hoje** / data.
- Topo: total em aberto e total vencido.
- **Receber** abre a mesma etapa de recebimento (formas, troco, crédito em vezes), com o valor da parcela sugerido.

## Mantido do que já existe

- Desconto da diferença no recebimento (vira `ajuste`), sem permissão extra.
- Venda com pagamento recebido não cancela (estornar antes).
- API recalcula tudo; migração das vendas antigas mantida (saldo antigo vira 1 parcela vencendo na data da venda + 30 dias).

## Modelo de dados (migração 0005)

- `venda_pagamentos`: + `parcelas_cartao smallint` (1–12, só crédito).
- `venda_parcelas`: `id, venda_id, numero, vencimento date, valor integer`.
- API: `parcelamento: { parcelas: number, primeiroVencimento: "AAAA-MM-DD" }` quando houver saldo; resposta da venda inclui `parcelas[]` com `pago`/`aberto` calculados.
