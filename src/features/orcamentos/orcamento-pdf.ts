import { contatosEmLista, type Empresa, enderecoEmLinha } from "@/features/empresa/tipos";
import { mascararCNPJ, mascararDocumento, mascararTelefone } from "@/features/pessoas/documento";
import type { Pessoa } from "@/features/pessoas/tipos";
import { mascararPlaca, type Veiculo } from "@/features/veiculos/tipos";
import { formatarBRL, formatarQuantidade } from "@/lib/numeros";

import { subtotalItem, validoAte } from "./calculo";
import { type Orcamento, totaisDoOrcamento } from "./tipos";

const dataCurta = (data: Date | string) => new Date(data).toLocaleDateString("pt-BR");
/** O espaço que o `toLocaleString` coloca depois de "R$" é inseparável (U+00A0): troca por espaço comum. */
const moeda = (centavos: number) => formatarBRL(centavos).replace(/ /g, " ");

type Dados = { orcamento: Orcamento; cliente: Pessoa | null; veiculo: Veiculo | null; empresa: Empresa };

/**
 * Gera o PDF do orçamento (A4) como arquivo de verdade, em vez de depender do diálogo de impressão do
 * navegador, que no celular e em outros aparelhos sai em branco. A biblioteca só é baixada quando se gera o primeiro PDF.
 */
export async function gerarPdfOrcamento({ orcamento, cliente, veiculo, empresa }: Dados): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const margem = 14;
  const util = largura - margem * 2;
  const totais = totaisDoOrcamento(orcamento);
  let y = margem;

  const garantirEspaco = (necessario: number) => {
    if (y + necessario > altura - margem) {
      doc.addPage();
      y = margem;
    }
  };
  const texto = (conteudo: string, x: number, opcoes: { tamanho?: number; negrito?: boolean; alinhar?: "left" | "right" | "center"; largura?: number } = {}) => {
    doc.setFont("helvetica", opcoes.negrito ? "bold" : "normal");
    doc.setFontSize(opcoes.tamanho ?? 10);
    const linhas = opcoes.largura ? doc.splitTextToSize(conteudo, opcoes.largura) : [conteudo];
    doc.text(linhas, x, y, { align: opcoes.alinhar ?? "left" });
    return linhas.length;
  };
  const altLinha = (tamanho: number) => tamanho * 0.3528 * 1.25;

  // ---- Cabeçalho: logo + dados da oficina à esquerda, título à direita
  let xTexto = margem;
  if (empresa.logo) {
    try {
      const formato = /^data:image\/png/i.test(empresa.logo) ? "PNG" : /^data:image\/jpe?g/i.test(empresa.logo) ? "JPEG" : null;
      if (formato) {
        const props = doc.getImageProperties(empresa.logo);
        const alturaLogo = 18;
        const larguraLogo = Math.min((props.width / props.height) * alturaLogo, 34);
        doc.addImage(empresa.logo, formato, margem, y, larguraLogo, alturaLogo);
        xTexto = margem + larguraLogo + 4;
      }
    } catch {
      // Logo ilegível: o PDF sai sem ela.
    }
  }
  const razaoDiferente = empresa.razaoSocial && empresa.razaoSocial !== empresa.nomeFantasia;
  const fiscal = [empresa.cnpj && `CNPJ ${mascararCNPJ(empresa.cnpj)}`, empresa.inscricaoEstadual && `IE ${empresa.inscricaoEstadual}`, empresa.inscricaoMunicipal && `IM ${empresa.inscricaoMunicipal}`]
    .filter(Boolean)
    .join(" · ");
  const linhasEmpresa = [razaoDiferente ? empresa.razaoSocial : "", fiscal, enderecoEmLinha(empresa), contatosEmLista(empresa).join(" · "), empresa.horario].filter(Boolean);
  const larguraEsquerda = util - (xTexto - margem) - 62;
  const topo = y;
  y = topo + 5;
  texto(empresa.nomeFantasia, xTexto, { tamanho: 15, negrito: true, largura: larguraEsquerda });
  y += 4.5;
  for (const linha of linhasEmpresa) {
    const n = texto(linha, xTexto, { tamanho: 8, largura: larguraEsquerda });
    y += n * altLinha(8);
  }
  const fimEsquerda = Math.max(y, topo + 20);
  y = topo + 5;
  texto(`Orçamento ${orcamento.numero}`, largura - margem, { tamanho: 13, negrito: true, alinhar: "right" });
  y += 5;
  texto(`Emitido em ${dataCurta(orcamento.criadoEm)}`, largura - margem, { tamanho: 9, alinhar: "right" });
  y += 4.2;
  texto(`Válido até ${dataCurta(validoAte(orcamento.criadoEm, orcamento.validadeDias))}`, largura - margem, { tamanho: 9, alinhar: "right" });
  y = fimEsquerda + 2;
  doc.setLineWidth(0.6);
  doc.line(margem, y, largura - margem, y);
  y += 7;

  // ---- Cliente e veículo
  const metade = util / 2 - 4;
  const telefone = cliente ? mascararTelefone(cliente.celular || cliente.telefone) : "";
  const blocoCliente = [cliente?.nome ?? "Cliente removido", cliente?.documento ? mascararDocumento(cliente.tipo, cliente.documento) : "", telefone].filter(Boolean);
  const blocoVeiculo = [
    veiculo?.modelo ?? "Veículo removido",
    [veiculo?.placa && `Placa ${mascararPlaca(veiculo.placa)}`, veiculo?.ano, veiculo?.cor, orcamento.km > 0 && `${formatarQuantidade(orcamento.km)} km`].filter(Boolean).join(" · "),
  ].filter(Boolean);
  const inicioBloco = y;
  texto("CLIENTE", margem, { tamanho: 8, negrito: true });
  y += 4.5;
  blocoCliente.forEach((linha, i) => {
    const n = texto(linha, margem, { tamanho: 10, negrito: i === 0, largura: metade });
    y += n * altLinha(10);
  });
  const fimCliente = y;
  y = inicioBloco;
  texto("VEÍCULO", margem + util / 2, { tamanho: 8, negrito: true });
  y += 4.5;
  blocoVeiculo.forEach((linha, i) => {
    const n = texto(linha, margem + util / 2, { tamanho: 10, negrito: i === 0, largura: metade });
    y += n * altLinha(10);
  });
  y = Math.max(y, fimCliente) + 3;

  if (orcamento.problema) {
    garantirEspaco(14);
    texto("PROBLEMA RELATADO", margem, { tamanho: 8, negrito: true });
    y += 4.5;
    const n = texto(orcamento.problema, margem, { tamanho: 10, largura: util });
    y += n * altLinha(10) + 2;
  }

  // ---- Itens
  autoTable(doc, {
    startY: y,
    margin: { left: margem, right: margem, bottom: margem },
    head: [["Descrição", "Qtd", "Unitário", "Subtotal"]],
    body: orcamento.itens.map((item) => [
      `${item.descricao} (${item.tipo === "servico" ? "serviço" : "peça"})`,
      `${formatarQuantidade(item.quantidade)} ${item.unidade}`,
      moeda(item.valor),
      moeda(subtotalItem(item)),
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: { top: 1.8, bottom: 1.8, left: 1, right: 1 }, textColor: 0, lineColor: [200, 200, 200], lineWidth: { bottom: 0.2 } },
    headStyles: { fontStyle: "bold", lineColor: 0, lineWidth: { bottom: 0.4 } },
    columnStyles: { 1: { halign: "right", cellWidth: 24 }, 2: { halign: "right", cellWidth: 28 }, 3: { halign: "right", cellWidth: 30 } },
    didParseCell: (dados) => {
      if (dados.section === "head" && dados.column.index > 0) dados.cell.styles.halign = "right";
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ---- Totais
  const linhasTotais: [string, string, boolean][] = [
    ["Peças", moeda(totais.pecas), false],
    ["Mão de obra", moeda(totais.maoDeObra), false],
    ...(totais.desconto > 0 ? ([["Desconto", `- ${moeda(totais.desconto)}`, false]] as [string, string, boolean][]) : []),
    ["Total", moeda(totais.total), true],
  ];
  garantirEspaco(linhasTotais.length * 6 + 6);
  const xRotulo = largura - margem - 64;
  for (const [rotulo, valor, destaque] of linhasTotais) {
    if (destaque) {
      doc.setLineWidth(0.5);
      doc.line(xRotulo, y - 4.2, largura - margem, y - 4.2);
    }
    texto(rotulo, xRotulo, { tamanho: destaque ? 11 : 10, negrito: destaque });
    texto(valor, largura - margem, { tamanho: destaque ? 11 : 10, negrito: destaque, alinhar: "right" });
    y += destaque ? 7 : 5.5;
  }
  y += 2;

  if (orcamento.observacoes) {
    garantirEspaco(16);
    texto("OBSERVAÇÕES", margem, { tamanho: 8, negrito: true });
    y += 4.5;
    const linhas = doc.splitTextToSize(orcamento.observacoes, util) as string[];
    for (const linha of linhas) {
      garantirEspaco(5);
      texto(linha, margem, { tamanho: 10 });
      y += altLinha(10);
    }
    y += 2;
  }

  // ---- Assinaturas e rodapé
  garantirEspaco(empresa.rodape ? 40 : 26);
  y += 14;
  doc.setLineWidth(0.3);
  const meio = util / 2;
  doc.line(margem, y, margem + meio - 8, y);
  doc.line(margem + meio + 8, y, largura - margem, y);
  y += 4;
  texto(empresa.nomeFantasia, margem + (meio - 8) / 2, { tamanho: 8, alinhar: "center", largura: meio - 8 });
  texto("Aprovação do cliente", margem + meio + 8 + (meio - 8) / 2, { tamanho: 8, alinhar: "center" });
  if (empresa.rodape) {
    y += 10;
    doc.setDrawColor(200);
    doc.line(margem, y - 4, largura - margem, y - 4);
    const n = texto(empresa.rodape, largura / 2, { tamanho: 8, alinhar: "center", largura: util });
    y += n * altLinha(8);
  }

  return doc.output("blob");
}

/** Entrega o arquivo: compartilha (celular, quando o navegador permite) ou baixa; o nome já sai pronto. */
export async function entregarPdf(blob: Blob, nome: string): Promise<void> {
  const arquivo = new File([blob], nome, { type: "application/pdf" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nome });
      return;
    } catch (erro) {
      if ((erro as Error).name === "AbortError") return; // a pessoa fechou a janela de compartilhar
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
