// Preparo da logo enviada: valida o arquivo e, para PNG/JPG/WebP, reduz a imagem para caber
// no armazenamento do navegador. O resultado é um data URL, guardado junto com os dados da empresa.

/** Maior lado da logo guardada, em pixels. */
export const LADO_MAXIMO = 512;
/** Arquivo enviado: acima disso nem tenta abrir. */
export const TAMANHO_MAXIMO_ARQUIVO = 5 * 1024 * 1024;
/** SVG não é reduzido, então o limite é menor. */
export const TAMANHO_MAXIMO_SVG = 200 * 1024;
/** Resultado guardado: se passar disso, reduz mais (o localStorage tem poucos MB no total). */
const TAMANHO_MAXIMO_RESULTADO = 400 * 1024;

export const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export class ErroLogo extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroLogo";
  }
}

/** Mantém a proporção e limita o maior lado a `maximo` (imagem menor não é ampliada). */
export function dimensoesReduzidas(largura: number, altura: number, maximo = LADO_MAXIMO) {
  const maior = Math.max(largura, altura);
  if (maior <= maximo) return { largura, altura };
  const fator = maximo / maior;
  return { largura: Math.max(1, Math.round(largura * fator)), altura: Math.max(1, Math.round(altura * fator)) };
}

function lerComoDataUrl(arquivo: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new ErroLogo("Não foi possível ler o arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}

function abrirImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new ErroLogo("Não foi possível abrir a imagem. Tente outro arquivo."));
    imagem.src = url;
  });
}

/** Devolve a logo pronta para guardar (data URL) ou lança `ErroLogo` com a mensagem para o usuário. */
export async function processarLogo(arquivo: File): Promise<string> {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new ErroLogo("Use uma imagem PNG, JPG ou SVG.");
  }
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
    throw new ErroLogo("A imagem é muito grande (máximo de 5 MB).");
  }

  const original = await lerComoDataUrl(arquivo);

  if (arquivo.type === "image/svg+xml") {
    if (arquivo.size > TAMANHO_MAXIMO_SVG) {
      throw new ErroLogo("O SVG é muito pesado (máximo de 200 KB). Use PNG ou exporte um SVG mais simples.");
    }
    return original;
  }

  const imagem = await abrirImagem(original);
  // JPG continua JPG (sem transparência, menor); PNG e WebP viram PNG para manter a transparência.
  const tipoSaida = arquivo.type === "image/jpeg" ? "image/jpeg" : "image/png";

  for (const lado of [LADO_MAXIMO, 384, 256]) {
    const { largura, altura } = dimensoesReduzidas(imagem.naturalWidth, imagem.naturalHeight, lado);
    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    const contexto = tela.getContext("2d");
    if (!contexto) throw new ErroLogo("Não foi possível preparar a imagem neste navegador.");
    contexto.drawImage(imagem, 0, 0, largura, altura);
    const resultado = tela.toDataURL(tipoSaida, 0.88);
    if (resultado.length <= TAMANHO_MAXIMO_RESULTADO || lado === 256) return resultado;
  }
  return original;
}
