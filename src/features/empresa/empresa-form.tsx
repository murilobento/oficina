import { type ReactNode, useEffect, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Search, Trash2 } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CampoSelect, CampoTexto, CampoTextarea } from "@/components/layout/campos-form";
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

function Cartao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 md:p-5">
      <div>
        <h2 className="text-base font-semibold">{titulo}</h2>
        {descricao && <p className="text-muted-foreground text-sm">{descricao}</p>}
      </div>
      {children}
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

  const enviar = form.handleSubmit(async (valores) => {
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
    <form noValidate onSubmit={enviar} className="mx-auto flex w-full max-w-3xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Empresa</h1>
        <p className="text-muted-foreground text-sm">
          Dados da oficina, usados no menu, na tela de entrada e no cabeçalho dos documentos impressos.
        </p>
      </div>

      <Cartao titulo="Logo e identificação">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-muted/40 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
              {logo ? (
                <img src={logo} alt="Logo da oficina" className="size-full object-contain p-1" />
              ) : (
                <ImagePlus className="text-muted-foreground size-8" aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <input
                ref={entradaArquivo}
                type="file"
                accept={TIPOS_ACEITOS.join(",")}
                className="sr-only"
                id="empresa-logo-arquivo"
                aria-label="Arquivo da logo"
                onChange={(evento) => void escolherLogo(evento.target.files?.[0])}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={lendoLogo} onClick={() => entradaArquivo.current?.click()}>
                  {lendoLogo ? <Spinner /> : <ImagePlus />}
                  {logo ? "Trocar logo" : "Enviar logo"}
                </Button>
                {logo && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => form.setValue("logo", "", { shouldDirty: true })}
                  >
                    <Trash2 /> Remover
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-sm">PNG, JPG ou SVG. Fundo transparente fica melhor.</p>
            </div>
          </div>
          {erroLogo && (
            <p role="alert" className="text-destructive text-sm">
              {erroLogo}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              control={control}
              prefixo={PREFIXO}
              nome="nomeFantasia"
              rotulo="Nome da oficina (fantasia)"
              descricao="É o nome que aparece no menu e nos documentos."
              className="sm:col-span-2"
            />
            <CampoTexto
              control={control}
              prefixo={PREFIXO}
              nome="razaoSocial"
              rotulo="Razão social (opcional)"
              className="sm:col-span-2"
            />
            <Controller
              control={control}
              name="cnpj"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5 sm:col-span-2" data-invalid={fieldState.invalid}>
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
                    <Button type="button" variant="outline" disabled={buscandoCnpj} onClick={() => void buscarCnpj()}>
                      {buscandoCnpj ? <Spinner /> : <Search />}
                      {buscandoCnpj ? "Buscando..." : "Buscar dados do CNPJ"}
                    </Button>
                  </div>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : <TextoAviso aviso={avisoCnpj} />}
                </Field>
              )}
            />
            <CampoTexto control={control} prefixo={PREFIXO} nome="inscricaoEstadual" rotulo="Inscrição estadual (opcional)" />
            <CampoTexto control={control} prefixo={PREFIXO} nome="inscricaoMunicipal" rotulo="Inscrição municipal (opcional)" />
          </div>
        </div>
      </Cartao>

      <Cartao titulo="Endereço" descricao="Digite o CEP para preencher rua, bairro, cidade e UF.">
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <CampoTexto
              control={control}
              prefixo={PREFIXO}
              nome="cep"
              rotulo="CEP"
              inputMode="numeric"
              placeholder="00000-000"
              mascara={mascararCEP}
            />
            {buscandoCep ? (
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Spinner /> Buscando endereço...
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
      </Cartao>

      <Cartao titulo="Contato e funcionamento">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            control={control}
            prefixo={PREFIXO}
            nome="telefone"
            rotulo="Telefone"
            inputMode="tel"
            placeholder="(11) 3333-4444"
            mascara={mascararTelefone}
          />
          <CampoTexto
            control={control}
            prefixo={PREFIXO}
            nome="whatsapp"
            rotulo="WhatsApp"
            inputMode="tel"
            placeholder="(11) 99999-0000"
            mascara={mascararTelefone}
          />
          <CampoTexto
            control={control}
            prefixo={PREFIXO}
            nome="email"
            rotulo="E-mail"
            inputMode="email"
            placeholder="contato@oficina.com.br"
            className="sm:col-span-2"
          />
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
      </Cartao>

      <Cartao titulo="Documentos" descricao="Textos que entram sozinhos nos documentos. Cada orçamento ainda pode ser ajustado.">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            control={control}
            prefixo={PREFIXO}
            nome="validadeOrcamentoDias"
            rotulo="Validade do orçamento (dias)"
            inputMode="numeric"
            mascara={soDigitosAte(2)}
          />
          <CampoTextarea
            control={control}
            prefixo={PREFIXO}
            nome="condicoesOrcamento"
            rotulo="Condições do orçamento"
            descricao="Já vêm nas observações de todo orçamento novo. Ex.: formas de pagamento e prazo de execução."
            className="sm:col-span-2"
            linhas={4}
          />
          <CampoTextarea
            control={control}
            prefixo={PREFIXO}
            nome="rodape"
            rotulo="Rodapé dos documentos"
            descricao="Uma linha no fim da folha. Ex.: Obrigado pela preferência! PIX: CNPJ."
            className="sm:col-span-2"
            linhas={2}
          />
        </div>
      </Cartao>

      <div className="bg-card sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-sm md:bottom-4">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {formState.isDirty ? "Há alterações não salvas." : "Tudo salvo."}
        </p>
        <div className="flex flex-1 justify-end gap-2 sm:flex-none">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={!formState.isDirty}
            onClick={() => form.reset(paraFormulario(empresa))}
          >
            Descartar
          </Button>
          <Button type="submit" className="flex-1 sm:flex-none" disabled={!formState.isDirty}>
            Salvar
          </Button>
        </div>
      </div>
    </form>
  );
}
