# DESIGN.md — Identidade neutra

Linguagem visual do app da oficina: neutra, familiar (cara de app comum) e de alto contraste. Mobile-first, uso no balcão e no pátio, com uma mão. Decisões em `docs/superpowers/specs/2026-11-23-identidade-neutra-design.md`.

## Princípios
- **Neutros + uma cor de ação.** Fundo quase branco, texto quase preto, cinzas para o secundário. O azul (`--primary`) só aparece em ação principal, item ativo, foco e link.
- **Letra normal.** Inter, em sentence case. Nada de caixa alta em títulos, rótulos, botões ou dados: o que foi digitado aparece como foi digitado.
- **Números tabulares.** Valores, quantidades e datas usam `tabular-nums` (Inter). `font-mono` fica só em placa, número de documento e senha gerada.
- **Menos elementos por tela.** Topo do celular: marca + busca. Lista: título, busca, filtros em chips, linhas. Descrições de tela só no computador.
- **Status nunca só por cor.** `FitaStatus`: pílula com ícone e texto.
- Bordas de 1px, raio de 10px (`--radius: 0.625rem`), sombras discretas.
- Alvos de toque ≥ 44px; campos com `max(16px,1em)` para não dar zoom no iOS.
- Tema claro (padrão) e escuro; contraste verificado em `src/styles/contraste.test.ts`.

## Tokens (OKLCH)
| Token | Claro | Escuro |
|---|---|---|
| background | 0.985 0 0 | 0.16 0.005 260 |
| card | 1 0 0 | 0.2 0.006 260 |
| foreground | 0.2 0.005 260 | 0.96 0.003 260 |
| muted-foreground | 0.47 0.01 260 | 0.72 0.008 260 |
| border | 0.92 0.004 260 | 0.28 0.006 260 |
| input (borda de campo) | 0.62 0.01 260 | 0.56 0.01 260 |
| primary (azul) | 0.49 0.2 264 | 0.7 0.15 260 |
| accent (azul claro) | 0.955 0.02 264 | 0.27 0.04 264 |
| sidebar | igual ao card | 0.18 0.005 260 |

Estados: `ok` (verde), `atencao` (laranja), `erro` (vermelho), `info` (verde-azulado, para não confundir com a marca), cada um com `-fundo`.

## Padrões
- **Listagem** (`src/components/layout/listagem.tsx`): título + ＋ (no celular, só o ícone) → busca → filtros (até 5 opções = chips roláveis; mais = seleção) → linhas num bloco único no celular / tabela no computador → rodapé. Quadros sem tabela (`sempre`) usam cartões soltos.
- **Componentes de marca** (`src/components/marca`): `PlacaVeiculo` (mono em caixa com borda fina), `FitaStatus`, `MedidorSegmentado`, `Numeral`, `RotuloSecao`.

## Navegação
- Celular: topo com logo, nome e busca; barra inferior com 3 atalhos permitidos pelo perfil, ＋ redondo central (folha "Criar novo", filtrada por permissão) e Menu. Tema e tela cheia ficam no menu do usuário.
- Computador: sidebar clara, item ativo em azul claro; topo com botão do menu e busca.
