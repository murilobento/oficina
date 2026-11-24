import { type ReactNode, useEffect, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Search, Trash2 } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CampoSelect, CampoTexto, CampoTextarea } from "@/components/layout/campos-form";
import { Listagem, ListagemCabecalho } from "@/components/layout/listagem";
import { RotuloSecao } from "@/components/marca/rotulo-secao";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { consultarCEP, consultarCNPJ, ErroConsulta } from "@/features/pessoas/consultas";
import {
  limparCNPJ,
  mascararCEP,
  mascararCNPJ,
  mascararTelefone,
  soDigitos,
  validarCNPJ,
} from "@/features/pessoas/documento";
import { UFS } from "@/features/pessoas/tipos";
import { cn } from "@/lib/utils";
import { useEnvioUnico } from "@/lib/envio-unico";

import { ErroLogo, processarLogo, TIPOS_ACEITOS } from "./logo";
import { useEmpresaConsulta, useSalvarEmpresa } from "./api";
import { type Empresa, type EmpresaFormValores, esquemaEmpresa, paraEmpresa, paraFormulario } from "./tipos";

const PREFIXO = "empresa";
const UF_OPCOES = UFS.map((uf) => ({ valor: uf, texto: uf }));
const soDigitosAte = (limite: number) => (valor: string) => valor.replace(/\D/g, "").slice(0, limite);

type Aviso = { tom: "erro" | "info"; texto: string };

function TextoAviso({ aviso }: { aviso: Aviso | null }) {
  if (!aviso) return null;
  return (
    <p role="status" className={cn("text-sm", aviso.tom === "erro" ? "text-destructive" : "text-muted-foreground")}>
      {aviso.texto}
    </p>
  );
}

/**
 * Uma faixa da tela de configuração: título e explicação à esquerda, campos à direita.
 * Em telas estreitas vira uma coluna só.
 */
function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="grid gap-4 @3xl:grid-cols-[13rem_minmax(0,1fr)] @3xl:gap-8">
      {/* Mesmo título de seção dos formulários de cadastro (SecaoFormulario). */}
      <div className="flex flex-col gap-1">
        <RotuloSecao>{titulo}</RotuloSecao>
        <p className="text-muted-foreground text-sm">{descricao}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

/**
 * Tela de configuração da empresa: identidade (logo, nome, CNPJ), endereço, contato e os
 * textos padrão dos documentos. Salva tudo de uma vez pelo botão fixo no rodapé.
 */
export function EmpresaForm() {
  const consulta = useEmpresaConsulta();
  if (consulta.isPending) return <p className="text-muted-foreground text-sm">Carregando…</p>;
  if (consulta.isError) return <p role="alert" className="text-destructive text-sm">{consulta.error.message}</p>;
  return <EmpresaFormulario empresa={consulta.data} />;
}

function EmpresaFormulario({ empresa }: { empresa: Empresa }) {
  const salvar = useSalvarEmpresa();

  const { enviando, enviar: enviarUnico } = useEnvioUnico();

  const form = useForm<EmpresaFormValores>({
    resolver: zodResolver(esquemaEmpresa),
    defaultValues: paraFormulario(empresa),
    mode: "onTouched",
  });
  const { control, formState } = form;
  const logo = useWatch({ control, name: "logo" });
  const cep = useWatch({ control, name: "cep" });

  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [avisoCnpj, setAvisoCnpj] = useState<Aviso | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState<Aviso | null>(null);
  const [erroLogo, setErroLogo] = useState("");
  const [lendoLogo, setLendoLogo] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const entradaArquivo = useRef<HTMLInputElement>(null);

  // Último CNPJ e CEP consultados (começam com o que já está salvo) e número da consulta em
  // andamento: evita repetir a consulta e descarta resposta atrasada. Mesma ideia dos clientes.
  const ultimoCnpj = useRef(empresa.cnpj);
  const ultimoCep = useRef(empresa.cep);
  const consultaCnpj = useRef(0);
  const consultaCep = useRef(0);

  function preencher(campos: Partial<EmpresaFormValores>) {
    for (const [nome, valor] of Object.entries(campos)) {
      // Só preenche o que o serviço devolveu; vazio não apaga o que já foi digitado.
      if (typeof valor === "string" && valor !== "") {
        form.setValue(nome as keyof EmpresaFormValores, valor, { shouldDirty: true, shouldValidate: true });
      }
    }
  }

  async function buscarCnpj() {
    const cnpj = limparCNPJ(form.getValues("cnpj"));
    if (!validarCNPJ(cnpj)) {
      await form.trigger("cnpj");
      return;
    }
    ultimoCnpj.current = cnpj;
    const consulta = ++consultaCnpj.current;
    setBuscandoCnpj(true);
    setAvisoCnpj(null);
    try {
      const dados = await consultarCNPJ(cnpj);
      if (consulta !== consultaCnpj.current) return;
      preencher({
        razaoSocial: dados.nome,
        nomeFantasia: dados.nomeFantasia,
        email: dados.email,
        telefone: mascararTelefone(dados.telefone),
        cep: mascararCEP(dados.cep),
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento,
        bairro: dados.bairro,
        cidade: dados.cidade,
        uf: dados.uf,
      });
      // O endereço já veio com o CNPJ: não precisa consultar o CEP de novo.
      if (dados.cep) ultimoCep.current = dados.cep;
      setAvisoCep(null);
      setAvisoCnpj({ tom: "info", texto: `Dados preenchidos pela ${dados.fonte}. Confira e ajuste se precisar.` });
    } catch (erro) {
      if (consulta !== consultaCnpj.current) return;
      setAvisoCnpj({
        tom: "erro",
        texto: erro instanceof ErroConsulta ? erro.message : "Não foi possível consultar o CNPJ.",
      });
    } finally {
      if (consulta === consultaCnpj.current) setBuscandoCnpj(false);
    }
  }

  // CEP completo (8 números) preenche o endereço sozinho, uma vez por CEP.
  useEffect(() => {
    const digitos = soDigitos(cep);
    if (digitos.length !== 8 || digitos === ultimoCep.current) return;
    ultimoCep.current = digitos;
    const consulta = ++consultaCep.current;
    setBuscandoCep(true);
    setAvisoCep(null);
    consultarCEP(digitos)
      .then((dados) => {
        if (consulta !== consultaCep.current) return;
        preencher({ logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.cidade, uf: dados.uf });
        setAvisoCep({ tom: "info", texto: "Endereço preenchido pelo CEP. Complete com o número." });
      })
      .catch((erro) => {
        if (consulta !== consultaCep.current) return;
        setAvisoCep({
          tom: "erro",
          texto: erro instanceof ErroConsulta ? erro.message : "Não foi possível consultar o CEP.",
        });
        if (!(erro instanceof ErroConsulta) || erro.motivo !== "nao_encontrado") ultimoCep.current = "";
      })
      .finally(() => {
        if (consulta === consultaCep.current) setBuscandoCep(false);
      });
    // `preencher` só usa `form`, que é estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep]);

  // Sair da página (fechar a aba, recarregar) com alteração não salva pede confirmação ao navegador.
  useEffect(() => {
    if (!formState.isDirty) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [formState.isDirty]);

  async function escolherLogo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErroLogo("");
    setLendoLogo(true);
    try {
      const pronta = await processarLogo(arquivo);
      form.setValue("logo", pronta, { shouldDirty: true });
    } catch (erro) {
      setErroLogo(erro instanceof ErroLogo ? erro.message : "Não foi possível usar essa imagem.");
    } finally {
      setLendoLogo(false);
      if (entradaArquivo.current) entradaArquivo.current.value = "";
    }
  }

  const enviar = enviarUnico(form, async (valores) => {
    try {
      await salvar.mutateAsync(paraEmpresa(valores));
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Não foi possível salvar. Tente de novo.";
      const campos = (erro as { campos?: Record<string, string> }).campos ?? {};
      for (const [campo, texto] of Object.entries(campos)) form.setError(campo as keyof EmpresaFormValores, { message: texto });
      toast.error(mensagem);
      return;
    }
    // Recomeça "limpo" com o que foi salvo, para o aviso de alterações sair.
    form.reset(valores);
    toast.success("Dados da empresa salvos.");
  });

  return (
    <Listagem>
      <ListagemCabecalho titulo="Dados da empresa" descricao="Aparecem no menu, na tela de entrada e no cabeçalho dos orçamentos e vendas impressos." />
      <form noValidate onSubmit={enviar} className="flex flex-col gap-4 md:gap-6">
        <div className="bg-card flex flex-col gap-8 rounded-xl border p-4 md:p-6">
          <Secao titulo="Identidade" descricao="Logo, nome e documentos da oficina. A logo e o nome fantasia aparecem em tudo.">
            <div
              role="button"
              tabIndex={0}
              aria-label={logo ? "Trocar a logo" : "Enviar a logo"}
              data-arrastando={arrastando || undefined}
              onClick={() => entradaArquivo.current?.click()}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" || evento.key === " ") {
                  evento.preventDefault();
                  entradaArquivo.current?.click();
                }
              }}
              onDragOver={(evento) => {
                evento.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(evento) => {
                evento.preventDefault();
                setArrastando(false);
                void escolherLogo(evento.dataTransfer.files?.[0]);
              }}
              className="hover:bg-muted/40 focus-visible:ring-ring data-arrastando:border-primary data-arrastando:bg-primary/5 flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed p-3 outline-none focus-visible:ring-2"
            >
              <div className="bg-background flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                {lendoLogo ? (
                  <Spinner className="size-6" />
                ) : logo ? (
                  <img src={logo} alt="Logo da oficina" className="size-full object-contain p-1.5" />
                ) : (
                  <ImagePlus className="text-muted-foreground size-7" aria-hidden />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium">{logo ? "Trocar a logo" : "Arraste a logo aqui"}</span>
                <span className="text-muted-foreground text-sm">
                  {logo ? "Arraste outra imagem ou clique para escolher." : "Ou clique para escolher. PNG, JPG ou SVG; fundo transparente fica melhor."}
                </span>
              </div>
            </div>
            <input
              ref={entradaArquivo}
              type="file"
              accept={TIPOS_ACEITOS.join(",")}
              className="sr-only"
              id="empresa-logo-arquivo"
              aria-label="Arquivo da logo"
              tabIndex={-1}
              onChange={(evento) => void escolherLogo(evento.target.files?.[0])}
            />
            {(erroLogo || logo) && (
              <div className="-mt-2 flex items-center justify-between gap-3">
                {erroLogo ? (
                  <p role="alert" className="text-destructive text-sm">
                    {erroLogo}
                  </p>
                ) : (
                  <span />
                )}
                {logo && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => form.setValue("logo", "", { shouldDirty: true })}>
                    <Trash2 /> Remover logo
                  </Button>
                )}
              </div>
            )}

            <CampoTexto control={control} prefixo={PREFIXO} nome="nomeFantasia" rotulo="Nome da oficina (fantasia)" descricao="É o nome que aparece no menu e nos documentos." />
            <CampoTexto control={control} prefixo={PREFIXO} nome="razaoSocial" rotulo="Razão social (opcional)" />
            <Controller
              control={control}
              name="cnpj"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="empresa-cnpj">CNPJ (opcional)</FieldLabel>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="empresa-cnpj"
                      className="sm:flex-1"
                      autoComplete="off"
                      placeholder="00.000.000/0000-00"
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(evento) => field.onChange(mascararCNPJ(evento.target.value))}
                      aria-invalid={fieldState.invalid}
                    />
                    <Button type="button" variant="outline" carregando={buscandoCnpj} onClick={() => void buscarCnpj()}>
                      <Search />
                      Preencher pelo CNPJ
                    </Button>
                  </div>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : <TextoAviso aviso={avisoCnpj} />}
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto control={control} prefixo={PREFIXO} nome="inscricaoEstadual" rotulo="Inscrição estadual (opcional)" />
              <CampoTexto control={control} prefixo={PREFIXO} nome="inscricaoMunicipal" rotulo="Inscrição municipal (opcional)" />
            </div>
          </Secao>

          <Secao titulo="Endereço" descricao="Digite o CEP e a rua, o bairro, a cidade e a UF se preenchem sozinhos.">
            <div className="grid gap-4 sm:grid-cols-6">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <CampoTexto control={control} prefixo={PREFIXO} nome="cep" rotulo="CEP" inputMode="numeric" placeholder="00000-000" mascara={mascararCEP} />
                {buscandoCep ? (
                  <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <Spinner /> Buscando endereço…
                  </span>
                ) : (
                  <TextoAviso aviso={avisoCep} />
                )}
              </div>
              <CampoTexto control={control} prefixo={PREFIXO} nome="logradouro" rotulo="Logradouro" className="sm:col-span-4" />
              <CampoTexto control={control} prefixo={PREFIXO} nome="numero" rotulo="Número" className="sm:col-span-2" />
              <CampoTexto control={control} prefixo={PREFIXO} nome="complemento" rotulo="Complemento" className="sm:col-span-4" />
              <CampoTexto control={control} prefixo={PREFIXO} nome="bairro" rotulo="Bairro" className="sm:col-span-2" />
              <CampoTexto control={control} prefixo={PREFIXO} nome="cidade" rotulo="Cidade" className="sm:col-span-3" />
              <CampoSelect control={control} prefixo={PREFIXO} nome="uf" rotulo="UF" opcoes={UF_OPCOES} className="sm:col-span-1" />
            </div>
          </Secao>

          <Secao titulo="Contato" descricao="Como o cliente fala com a oficina. Sai no cabeçalho dos documentos.">
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto control={control} prefixo={PREFIXO} nome="telefone" rotulo="Telefone" inputMode="tel" placeholder="(11) 3333-4444" mascara={mascararTelefone} />
              <CampoTexto control={control} prefixo={PREFIXO} nome="whatsapp" rotulo="WhatsApp" inputMode="tel" placeholder="(11) 99999-0000" mascara={mascararTelefone} />
              <CampoTexto control={control} prefixo={PREFIXO} nome="email" rotulo="E-mail" inputMode="email" placeholder="contato@oficina.com.br" className="sm:col-span-2" />
              <CampoTexto control={control} prefixo={PREFIXO} nome="site" rotulo="Site" placeholder="www.oficina.com.br" />
              <CampoTexto control={control} prefixo={PREFIXO} nome="instagram" rotulo="Instagram" placeholder="@suaoficina" />
              <CampoTextarea
                control={control}
                prefixo={PREFIXO}
                nome="horario"
                rotulo="Horário de funcionamento"
                descricao="Ex.: Seg a sex 8h às 18h, sáb 8h às 12h."
                className="sm:col-span-2"
                linhas={2}
              />
            </div>
          </Secao>

          <Secao titulo="Documentos" descricao="Textos que entram sozinhos nos orçamentos e vendas. Cada orçamento ainda pode ser ajustado.">
            <CampoTexto
              control={control}
              prefixo={PREFIXO}
              nome="validadeOrcamentoDias"
              rotulo="Validade do orçamento (dias)"
              inputMode="numeric"
              mascara={soDigitosAte(2)}
              className="sm:max-w-56"
            />
            <CampoTextarea
              control={control}
              prefixo={PREFIXO}
              nome="condicoesOrcamento"
              rotulo="Condições do orçamento"
              descricao="Já vêm nas observações de todo orçamento novo. Ex.: formas de pagamento e prazo de execução."
              linhas={4}
            />
            <CampoTextarea
              control={control}
              prefixo={PREFIXO}
              nome="rodape"
              rotulo="Rodapé dos documentos"
              descricao="Uma linha no fim da folha. Ex.: Obrigado pela preferência! PIX: CNPJ."
              linhas={2}
            />
          </Secao>
        </div>

        {/* Só aparece com alteração. No celular fica acima da barra inferior. */}
        {(formState.isDirty || enviando) && (
          <div className="bg-card animate-in fade-in slide-in-from-bottom-2 sticky bottom-4 z-30 mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border p-2 pl-4 shadow-lg max-md:bottom-[calc(5rem+env(safe-area-inset-bottom))]">
            <p className="text-sm font-medium whitespace-nowrap" aria-live="polite">
              <span className="sm:hidden">Não salvo</span>
              <span className="max-sm:hidden">Alterações não salvas</span>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" disabled={enviando} onClick={() => form.reset(paraFormulario(empresa))}>
                Descartar
              </Button>
              <Button type="submit" carregando={enviando}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </form>
    </Listagem>
  );
}
