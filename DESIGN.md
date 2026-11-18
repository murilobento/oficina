# DESIGN.md — Telemetria + bancada

Linguagem visual do app da oficina: painel de instrumentos (telemetria) sobre bancada de trabalho. Mobile-first, uso no balcão e no pátio, com uma mão.

## Princípios
- Sinal amarelo (`--sinal`) só para ação principal e foco; nunca como texto sobre fundo claro (use `--sinal-forte`).
- Informação técnica (códigos, valores, placas, datas) em fonte mono (`font-mono`, `tabular-nums`).
- Títulos e rótulos em Archivo condensado, caixa alta (`font-display`, `[font-stretch:75%]`).
- Status nunca só por cor: sempre `FitaStatus` com ícone e texto.
- Sombras planas; bordas de 1px; raio pequeno (`rounded-md`).
- Alvos de toque ≥ 44px; campos com `max(16px,1em)` para não dar zoom no iOS.
- Um tema próprio, claro (padrão) e escuro; o contraste é verificado em `src/styles/contraste.test.ts`.

## Tokens (OKLCH)
| Token | Claro | Escuro |
|---|---|---|
| background | 0.975 0.004 95 | 0.17 0.01 260 |
| card | 1 0 0 | 0.215 0.012 260 |
| foreground | 0.21 0.012 260 | claro |
| input (borda de campo) | 0.62 0.008 95 | 0.56 0.01 260 |
| sinal | 0.86 0.165 92 | igual |
| sidebar (grafite) | 0.2 0.012 260 | 0.13 0.01 260 |

Estados: `ok`, `atencao`, `erro`, `info`.

## Componentes de marca (`src/components/marca`)
`PlacaVeiculo`, `FitaStatus`, `MedidorSegmentado`, `Numeral`, `RotuloSecao`.

## Navegação no celular
Barra inferior com 3 atalhos permitidos pelo perfil, botão ＋ central (folha "Criar novo", filtrada por permissão) e Menu. No desktop, sidebar grafite.
