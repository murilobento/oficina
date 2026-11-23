# Identidade neutra (substitui "Telemetria + bancada")

Data: 2026-11-23. Substitui `2026-11-18-redesign-design.md`.

## Por quê
No celular o app parecia poluído e pouco familiar. Três problemas foram apontados: topo cheio (logo, nome, busca, tela cheia e tema), tipografia técnica (Archivo condensado em caixa alta, mono espalhado, faixa amarela) e listas pesadas (título grande, descrição, botão, busca e dois ou três selects antes do primeiro item). A barra inferior foi aprovada e ficou.

## Objetivos
- Cara de app comum (iOS, lista do Nubank): neutro, uma cor de ação, letra normal.
- Menos elementos por tela no celular.
- Contraste AA ou melhor nos dois temas, para leitura no sol do pátio.

**Não faz parte:** mudar fluxos, regras, rotas ou o conteúdo das folhas.
**Seria um fracasso mesmo funcionando:** o app ficar com dois visuais misturados, ou perder contraste.

## Decisões do dono
- Recomeçar a identidade, sem tentar manter o amarelo e o grafite.
- Direção **neutro claro**, cor de marca **azul** (cerca de #1D4ED8), fonte **Inter**.
- Trocar tudo de uma vez: base, casca e passada nas telas.
- Dados cadastrados aparecem **como foram digitados**. Isso reverte o "registros em maiúsculas" de 18/11.

## Abordagens
1. **Base e casca de uma vez (escolhida).** Tokens em `globals.css` e componentes compartilhados (`app-layout`, `listagem`, `marca/*`, `ui/*`), seguidos de uma passada nas telas. Um único visual e um único teste de contraste.
2. **Tela a tela.** Descartada: dois visuais convivendo por semanas.
3. **Só cores e fonte.** Descartada: não resolve o topo cheio nem as listas pesadas.

## O que mudou
- **Tokens:** neutros de matiz 260, primary azul `oklch(0.49 0.2 264)`, info passou para verde-azulado, sidebar clara, raio de 10px. `--sinal` e `--sinal-forte` foram removidos.
- **Tipografia:** Inter. Saíram a caixa alta global de h1–h3 e a utilidade `font-display`. Mono ficou só em placa, número de documento e senha.
- **Topo:** sem faixa amarela. No celular, marca e busca. Tema e tela cheia foram para o menu do usuário.
- **Listagem:** título 24px, descrição só no computador, ＋ redondo no celular, filtros de até 5 opções viram chips e as linhas ficam num bloco único no lugar dos cartões.
- **Marca:** `FitaStatus` virou pílula, `PlacaVeiculo` ficou discreta, `RotuloSecao` saiu sem traço amarelo e `Numeral` trocou mono por algarismos tabulares.
- **ui/*:** botão sem caixa alta e sem borda preta, campos com borda de 1px, cabeçalho de tabela normal e contornos de menus e diálogos mais suaves.

## Decisões do construtor
- Chips aparecem automaticamente quando o filtro tem até 5 opções (`MAX_CHIPS`).
- O status usa ícone colorido e texto na cor principal, sobre o fundo do tom. Assim o contraste do texto independe do tom.
- O total na etapa de recebimento passou de painel escuro para painel `bg-muted`.
