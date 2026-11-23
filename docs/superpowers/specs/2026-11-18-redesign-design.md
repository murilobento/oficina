# Redesenho visual: "Telemetria + bancada"

> **Substituída** em 2026-11-23 por `2026-11-23-identidade-neutra-design.md`.

**Data:** 2026-11-18 · **Maturidade:** L0 (sem DESIGN.md; tema atual é o shadcn do template + 8 presets)

## Decisões do Murilo
- Ousadia: **ousado**.
- Uso dominante: **balcão e pátio, no celular**. Uma mão, sol forte, dedos sujos.
- Temas: **um tema próprio**, com claro e escuro. Os 8 presets e o seletor de fonte saem.
- Direção: **Telemetria + bancada**. A base é o painel de corrida (amarelo-alerta, números mono, placas Mercosul, barras segmentadas). O padrão é o modo **claro**, com a robustez de bancada de ferramentas para aguentar o sol.

## Frase-tema
**Técnico + robusto + telemetria de oficina.** Toda decisão de cor, tipo e forma precisa se defender contra ela.

Referências e traços extraídos:
- Cronometragem de F1 e HUD: números grandes em mono, rótulos curtos em caixa alta, barras segmentadas.
- Gaveteiro de ferramentas e sinalização de segurança: superfícies foscas, um amarelo que chama a atenção, etiquetas tipo fita.
- Placa Mercosul: a placa do veículo como objeto gráfico reconhecível.
- Desenho técnico: linhas finas de grade, alinhamento rígido, cotas.

**Evitar:**
- Glassmorphism: perde contraste no sol.
- Neubrutalismo puro: cansa no uso diário.
- Gradientes "IA-roxo".
- Sombras com desfoque. A profundidade vem de borda e camada, não de sombra.

## Cor (OKLCH; contraste conferido por script)

**Claro (padrão)**

| Papel | OKLCH | Hex | Contraste |
|---|---|---|---|
| fundo | 0.975 0.004 95 | #F7F7F4 | — |
| cartão | 1 0 0 | #FFFFFF | — |
| tinta (texto) | 0.21 0.012 260 | #15181E | 16.5:1 no fundo |
| tinta-2 (secundário) | 0.45 0.012 260 | #51555C | 6.9:1 no fundo |
| borda de cartão (decorativa) | 0.86 0.006 95 | #D2D1CD | — |
| borda de campo | 0.62 0.008 95 | — | 3.6:1 (UI) |
| **sinal** (amarelo-alerta) | 0.86 0.165 92 | #F8CC2F | tinta sobre sinal: 11.6:1 |
| sinal-forte (texto/ícone amarelo no claro) | 0.52 0.11 85 | #866300 | 5.6:1 |

**Escuro**

| Papel | OKLCH | Hex | Contraste |
|---|---|---|---|
| fundo | 0.17 0.01 260 | #0D1014 | — |
| cartão | 0.215 0.012 260 | #161A1F | — |
| tinta | 0.96 0.004 95 | #F2F2EF | 17.0:1 |
| tinta-2 | 0.72 0.01 260 | #A1A5AB | 7.1:1 |
| borda de campo | 0.54 0.01 260 | — | ≥ 3:1, a conferir no teste |
| sinal | 0.86 0.165 92 | #F8CC2F | 12.5:1 no fundo |

**Estados**

| Estado | Claro | Contraste no cartão | Escuro | Contraste no cartão |
|---|---|---|---|---|
| ok | #1D7D3E | 5.2 | #5DC879 | 8.4 |
| atenção | #C55300 (laranja, para não confundir com o sinal) | 4.6 | #FF9B50 | 8.4 |
| erro | #D01D21 | 5.4 | #FD736D | 6.6 |
| info | #116BB5 | 5.5 | #68B5F5 | 8.0 |

**Regras de uso**
- O amarelo **nunca** é texto sobre fundo claro (1.5:1). Ele é preenchimento com tinta por cima: botão principal, item ativo, foco, barra "LED".
- Status sempre leva **ícone + texto**, nunca só cor. Isso garante leitura para daltônicos.
- O foco aparece como anel de 2px do sinal com contorno de 1px de tinta, visível nos dois modos.

## Tipografia
- **Archivo Variable** `[needs-install: @fontsource-variable/archivo, OFL]`. É uma só família com eixo de largura:
  - Corpo e UI em largura 100.
  - Títulos, rótulos e números de destaque **condensados** (wdth 75), em caixa alta, combinando com os registros em maiúsculas.
  - Substituto instalado: Geist (já existe).
- **Geist Mono** (já instalada) para números, valores, códigos (ORC-0001), placas e quantidades, sempre `tabular-nums`.
- Escala 1.2 com base 16px. Inputs em 16px, para o iOS não dar zoom.

| Token | px | Papel | Altura de linha | Fonte |
|---|---|---|---|---|
| xs | 12 | rótulo/legenda, caixa alta, +4% de espaçamento | 1.3 | condensada |
| sm | 14 | secundário | 1.45 | normal |
| base | 16 | corpo e campos | 1.5 | normal |
| md | 19 | título de cartão | 1.3 | condensada |
| lg | 23 | título de seção | 1.2 | condensada |
| xl | 28 | título de página | 1.1 | condensada |
| 2xl | 40 | numeral de KPI | 1.0 | mono |

## Forma, espaço e movimento
- **Grade:** base de 4px. Respiro de 16px no celular e 24px no computador.
- **Toque:** alvo mínimo de 44px; 48px nas ações principais e nos campos do celular.
- **Raio:** 6px ("usinado") em cartões, campos e botões; 4px em etiquetas. O círculo fica só para avatar.
- **Profundidade:** plana. Cartão com borda de 1px; sobreposições (sheet, menu) com borda e fundo opaco, sem sombra borrada.
- **Movimento:** 120–180ms com ease-out, sem quique. Sheets entram de baixo no celular. Respeita `prefers-reduced-motion`.

## Assinaturas visuais (componentes novos)

| Componente | O que é |
|---|---|
| `PlacaVeiculo` | Placa Mercosul em miniatura: faixa azul fina, fonte mono, borda. Aparece em listas, cartões e documentos |
| `FitaStatus` | Etiqueta tipo fita com segmento colorido, ícone e texto: rascunho, enviado, aprovado, concluída, cancelada, senha provisória… |
| `MedidorSegmentado` | Barra de 6–10 segmentos, estilo telemetria: progresso do dia, saldo × mínimo de estoque |
| `Numeral` | Valor grande em mono, com rótulo condensado em cima. Usado em KPIs e totais de documento |
| `RotuloSecao` | Caixa alta condensada com traço amarelo de 3px à esquerda |
| `BarraLed` | Linha amarela de 3px no topo da barra superior e no item ativo do menu |

## Casca e navegação (mobile-first)

**Celular (< md)**
- Barra superior compacta, de 56px: nome da oficina, busca e menu do usuário.
- **Barra inferior fixa** com Início, Orçamentos, botão central **＋ Novo** (amarelo, 56px) e Estoque, além de Menu, que abre a gaveta com o resto. Tudo segue as permissões. Respeita `safe-area-inset-bottom`.
- **＋ Novo** abre uma folha com as ações permitidas: novo orçamento, venda, cliente, veículo.
- Formulários abrem em folha de baixo, de altura cheia, com rodapé de ações fixo no polegar.

**Computador (≥ md)**
- Fica a faixa de ícones com o painel (estrutura atual), com novo visual: faixa grafite e item ativo com `BarraLed`.
- Na barra superior ficam busca, tela cheia, claro/escuro e usuário. O seletor de "preferências" sai; o tema vira um botão claro/escuro.

**Listas**
- Cartões com cabeçalho (código mono + `FitaStatus`), corpo (cliente, `PlacaVeiculo`, modelo) e rodapé (valor em `Numeral` pequeno, data).
- A busca fica fixa no topo ao rolar.
- No computador, a tabela tem cabeçalho condensado e linhas de 48px.

**Início:** vira o "painel do dia": atalhos grandes e, se houver permissão, contadores reais (orçamentos abertos, vendas de hoje, produtos abaixo do mínimo) com `Numeral` e `MedidorSegmentado`.

## Fora do escopo
- Logo da oficina e ilustrações: o logo continua vindo do cadastro da empresa.
- Novas funcionalidades além dos contadores do Início.
- Mudanças na API.
