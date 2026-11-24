import { useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, Search, User } from "lucide-react";
import { type Control, Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useSalvarPessoa } from "./api";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useEnvioUnico } from "@/lib/envio-unico";

import { consultarCEP, consultarCNPJ, ErroConsulta } from "./consultas";
import {
  limparDocumento,
  mascararCEP,
  mascararDocumento,
  mascararTelefone,
  soDigitos,
  type TipoPessoa,
  validarCNPJ,
} from "./documento";
import { capitalizar, type EntidadeConfig } from "./entidades";
import {
  esquemaPessoa,
  FORM_VAZIO,
  paraFormulario,
  paraPessoa,
  type Pessoa,
  type PessoaFormValores,
  rotuloDocumento,
  UFS,
} from "./tipos";

type NomeCampoTexto = Exclude<keyof PessoaFormValores, "tipo" | "ativo" | "extras"> | `extras.${string}`;

/** Campo de texto padrão do formulário: rótulo, entrada (com máscara opcional) e erro. */
function CampoTexto({
  control,
  nome,
  rotulo,
  descricao,
  mascara,
  className,
  ...entrada
}: {
  control: Control<PessoaFormValores>;
  nome: NomeCampoTexto;
  rotulo: string;
  descricao?: string;
  mascara?: (valor: string) => string;
  className?: string;
} & Pick<React.ComponentProps<"input">, "type" | "inputMode" | "placeholder" | "autoComplete" | "maxLength">) {
  const id = `pessoa-${nome}`;
  return (
    <Controller
      control={control}
      name={nome}
      render={({ field, fieldState }) => (
        <Field className={cn("gap-1.5", className)} data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{rotulo}</FieldLabel>
          <Input
            autoComplete="off"
            {...entrada}
            id={id}
            name={field.name}
            ref={field.ref}
            value={typeof field.value === "string" ? field.value : ""}
            onBlur={field.onBlur}
            onChange={(evento) => field.onChange(mascara ? mascara(evento.target.value) : evento.target.value)}
            aria-invalid={fieldState.invalid}
          />
          {descricao && <FieldDescription>{descricao}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

type Aviso = { tom: "erro" | "info"; texto: string };

function TextoAviso({ aviso }: { aviso: Aviso | null }) {
  if (!aviso) return null;
  return (
    <p role="status" className={cn("text-sm", aviso.tom === "erro" ? "text-destructive" : "text-muted-foreground")}>
      {aviso.texto}
    </p>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {descricao && <p className="text-muted-foreground text-sm">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Painel lateral de cadastro e edição, o mesmo para clientes e fornecedores.
 * `pessoa` preenchida = edição; `null` = cadastro novo.
 *
 * Quem usa deve trocar a `key` a cada abertura (ver pessoas-lista.tsx): assim o formulário
 * e o controle das consultas de CNPJ e CEP começam limpos.
 */
export function PessoaForm({
  config,
  aberto,
  pessoa,
  aoFechar,
}: {
  config: EntidadeConfig;
  aberto: boolean;
  pessoa: Pessoa | null;
  aoFechar: () => void;
}) {
  const editando = pessoa !== null;
  const salvar = useSalvarPessoa(config.papel);

  const { enviando, enviar: enviarUnico } = useEnvioUnico();

  const form = useForm<PessoaFormValores>({
    resolver: zodResolver(esquemaPessoa),
    defaultValues: pessoa ? paraFormulario(pessoa) : FORM_VAZIO,
    mode: "onTouched",
  });
  const { control } = form;
  const tipo = useWatch({ control, name: "tipo" });
  const pessoaJuridica = tipo === "PJ";

  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [avisoCnpj, setAvisoCnpj] = useState<Aviso | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState<Aviso | null>(null);

  // Último CNPJ e CEP consultados, para não repetir a consulta (nem sobrescrever o que o
  // usuário editou) a cada saída do campo. Na edição, começam com os valores já salvos.
  const ultimoCnpj = useRef(pessoa?.tipo === "PJ" ? pessoa.documento : "");
  const ultimoCep = useRef(pessoa?.cep ?? "");
  // Número da consulta em andamento: uma resposta atrasada de consulta antiga é descartada.
  const consultaCnpj = useRef(0);
  const consultaCep = useRef(0);

  function preencher(campos: Partial<PessoaFormValores>) {
    for (const [nome, valor] of Object.entries(campos)) {
      // Só preenche o que o serviço devolveu; campo vazio não apaga o que já foi digitado.
      if (typeof valor === "string" && valor !== "") {
        form.setValue(nome as keyof PessoaFormValores, valor, { shouldDirty: true, shouldValidate: true });
      }
    }
  }

  async function buscarCnpj({ forcar }: { forcar: boolean }) {
    const cnpj = limparDocumento("PJ", form.getValues("documento"));
    if (!validarCNPJ(cnpj)) {
      // No botão, mostra o erro do campo; na saída do campo a validação normal já cuida disso.
      if (forcar) await form.trigger("documento");
      return;
    }
    if (!forcar && cnpj === ultimoCnpj.current) return;

    ultimoCnpj.current = cnpj;
    const consulta = ++consultaCnpj.current;
    setBuscandoCnpj(true);
    setAvisoCnpj(null);
    try {
      const dados = await consultarCNPJ(cnpj);
      if (consulta !== consultaCnpj.current) return;

      preencher({
        nome: dados.nome,
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
        situacaoCadastral: dados.situacaoCadastral,
        cnaePrincipal: dados.cnaePrincipal,
      });
      // O endereço já veio com o CNPJ: não precisa consultar o CEP de novo.
      if (dados.cep) ultimoCep.current = dados.cep;
      setAvisoCep(null);
      setAvisoCnpj({ tom: "info", texto: `Dados preenchidos pela ${dados.fonte}. Confira e ajuste se precisar.` });
    } catch (erro) {
      if (consulta !== consultaCnpj.current) return;
      const texto = erro instanceof ErroConsulta ? erro.message : "Não foi possível consultar o CNPJ.";
      setAvisoCnpj({ tom: "erro", texto });
      // Falha passageira: permite tentar de novo ao sair do campo.
      if (!(erro instanceof ErroConsulta) || erro.motivo !== "nao_encontrado") ultimoCnpj.current = "";
    } finally {
      if (consulta === consultaCnpj.current) setBuscandoCnpj(false);
    }
  }

  async function buscarCep(valor: string) {
    const cep = soDigitos(valor);
    if (cep.length !== 8 || cep === ultimoCep.current) return;

    ultimoCep.current = cep;
    const consulta = ++consultaCep.current;
    setBuscandoCep(true);
    setAvisoCep(null);
    try {
      const dados = await consultarCEP(cep);
      if (consulta !== consultaCep.current) return;
      preencher({ logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.cidade, uf: dados.uf });
      setAvisoCep({ tom: "info", texto: "Endereço preenchido pelo CEP. Complete com o número." });
    } catch (erro) {
      if (consulta !== consultaCep.current) return;
      setAvisoCep({
        tom: "erro",
        texto: erro instanceof ErroConsulta ? erro.message : "Não foi possível consultar o CEP.",
      });
      if (!(erro instanceof ErroConsulta) || erro.motivo !== "nao_encontrado") ultimoCep.current = "";
    } finally {
      if (consulta === consultaCep.current) setBuscandoCep(false);
    }
  }

  function trocarTipo(novo: TipoPessoa) {
    if (novo === tipo) return;
    form.setValue("tipo", novo, { shouldDirty: true });
    // CPF e CNPJ têm formatos diferentes: o documento digitado não vale para o outro tipo.
    form.setValue("documento", "", { shouldDirty: true });
    form.clearErrors("documento");
    ultimoCnpj.current = "";
    consultaCnpj.current++;
    setBuscandoCnpj(false);
    setAvisoCnpj(null);
  }

  const enviar = enviarUnico(form, async (valores) => {
    try {
      await salvar.mutateAsync({ id: pessoa?.id, dados: paraPessoa(valores) });
    } catch (erro) {
      const campos = (erro as { campos?: Record<string, string> }).campos ?? {};
      const primeiro = Object.keys(campos)[0];
      for (const [campo, texto] of Object.entries(campos)) {
        form.setError(campo as keyof PessoaFormValores, { message: texto }, { shouldFocus: campo === primeiro });
      }
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar. Tente de novo.");
      return;
    }
    toast.success(`${capitalizar(config.singular)} ${pessoa ? "atualizado" : "cadastrado"}.`);
    aoFechar();
  });

  const comprimentoCompleto = pessoaJuridica ? 14 : 11;

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && aoFechar()}>
      <SheetContent className="w-full! gap-0 sm:max-w-xl!">
        <SheetHeader className="border-b">
          <SheetTitle>{editando ? `Editar ${config.singular}` : `Novo ${config.singular}`}</SheetTitle>
          <SheetDescription>Só o tipo e o nome são obrigatórios.</SheetDescription>
        </SheetHeader>

        <form noValidate onSubmit={enviar} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-4">
      <Secao titulo="Identificação">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="gap-1.5 sm:col-span-2">
            <FieldLabel id="pessoa-tipo-rotulo">Tipo de pessoa</FieldLabel>
            <div role="radiogroup" aria-labelledby="pessoa-tipo-rotulo" className="grid grid-cols-2 gap-2">
              {(["PF", "PJ"] as const).map((opcao) => (
                <Button
                  key={opcao}
                  type="button"
                  role="radio"
                  aria-checked={tipo === opcao}
                  variant={tipo === opcao ? "default" : "outline"}
                  className="min-w-0"
                  onClick={() => trocarTipo(opcao)}
                >
                  {opcao === "PF" ? <User /> : <BriefcaseBusiness />}
                  {opcao === "PF" ? "Pessoa física" : "Pessoa jurídica"}
                </Button>
              ))}
            </div>
          </Field>

          <Controller
            control={control}
            name="documento"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5 sm:col-span-2" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="pessoa-documento">{rotuloDocumento(tipo)} (opcional)</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="pessoa-documento"
                    name={field.name}
                    ref={field.ref}
                    className="sm:max-w-64"
                    autoComplete="off"
                    // O CNPJ pode ter letras (formato alfanumérico); o CPF é só números.
                    inputMode={pessoaJuridica ? "text" : "numeric"}
                    autoCapitalize="characters"
                    placeholder={pessoaJuridica ? "00.000.000/0000-00" : "000.000.000-00"}
                    value={field.value}
                    aria-invalid={fieldState.invalid}
                    onChange={(evento) => {
                      const valor = mascararDocumento(tipo, evento.target.value);
                      field.onChange(valor);
                      // Retorno imediato: valida assim que o documento fica completo.
                      if (limparDocumento(tipo, valor).length === comprimentoCompleto) void form.trigger("documento");
                      else if (fieldState.invalid) form.clearErrors("documento");
                    }}
                    onBlur={() => {
                      field.onBlur();
                      if (pessoaJuridica) void buscarCnpj({ forcar: false });
                    }}
                  />
                  {pessoaJuridica && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={buscandoCnpj}
                      onClick={() => void buscarCnpj({ forcar: true })}
                    >
                      {buscandoCnpj ? <Spinner /> : <Search />}
                      {buscandoCnpj ? "Buscando..." : "Buscar dados do CNPJ"}
                    </Button>
                  )}
                </div>
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : <TextoAviso aviso={avisoCnpj} />}
                {pessoaJuridica && !fieldState.invalid && !avisoCnpj && (
                  <FieldDescription>
                    Com o CNPJ preenchido, o sistema busca razão social, endereço e situação da empresa.
                  </FieldDescription>
                )}
              </Field>
            )}
          />

          <CampoTexto
            control={control}
            nome="nome"
            rotulo={pessoaJuridica ? "Razão social" : "Nome completo"}
            className={pessoaJuridica ? undefined : "sm:col-span-2"}
          />
          {pessoaJuridica && <CampoTexto control={control} nome="nomeFantasia" rotulo="Nome fantasia (opcional)" />}

          {pessoaJuridica && (
            <>
              <CampoTexto control={control} nome="situacaoCadastral" rotulo="Situação cadastral" />
              <CampoTexto control={control} nome="cnaePrincipal" rotulo="CNAE principal" />
            </>
          )}

          {config.camposExtras.map((campo) => (
            <CampoTexto
              key={campo.nome}
              control={control}
              nome={`extras.${campo.nome}`}
              rotulo={campo.rotulo}
              descricao={campo.descricao}
            />
          ))}
        </div>
      </Secao>

      <Secao titulo="Contato">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            control={control}
            nome="celular"
            rotulo="Celular"
            mascara={mascararTelefone}
            type="tel"
            inputMode="numeric"
            placeholder="(00) 00000-0000"
          />
          <CampoTexto
            control={control}
            nome="telefone"
            rotulo="Telefone"
            mascara={mascararTelefone}
            type="tel"
            inputMode="numeric"
            placeholder="(00) 0000-0000"
          />
          <CampoTexto
            control={control}
            nome="email"
            rotulo="E-mail"
            type="email"
            inputMode="email"
            placeholder="nome@exemplo.com.br"
            className="sm:col-span-2"
          />
        </div>
      </Secao>

      <Secao titulo="Endereço" descricao="Digite o CEP para preencher rua, bairro, cidade e UF.">
        <div className="grid gap-4 sm:grid-cols-6">
          <Controller
            control={control}
            name="cep"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5 sm:col-span-6" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="pessoa-cep">CEP</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id="pessoa-cep"
                    name={field.name}
                    ref={field.ref}
                    className="max-w-40"
                    autoComplete="off"
                    inputMode="numeric"
                    placeholder="00000-000"
                    value={field.value}
                    aria-invalid={fieldState.invalid}
                    onBlur={field.onBlur}
                    onChange={(evento) => {
                      const valor = mascararCEP(evento.target.value);
                      field.onChange(valor);
                      void buscarCep(valor);
                    }}
                  />
                  {buscandoCep && (
                    <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                      <Spinner /> Buscando endereço...
                    </span>
                  )}
                </div>
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : <TextoAviso aviso={avisoCep} />}
              </Field>
            )}
          />
          <CampoTexto control={control} nome="logradouro" rotulo="Logradouro" className="sm:col-span-4" />
          <CampoTexto control={control} nome="numero" rotulo="Número" className="sm:col-span-2" />
          <CampoTexto control={control} nome="complemento" rotulo="Complemento" className="sm:col-span-3" />
          <CampoTexto control={control} nome="bairro" rotulo="Bairro" className="sm:col-span-3" />
          <CampoTexto control={control} nome="cidade" rotulo="Cidade" className="sm:col-span-4" />
          <Controller
            control={control}
            name="uf"
            render={({ field }) => (
              <Field className="gap-1.5 sm:col-span-2">
                <FieldLabel htmlFor="pessoa-uf">UF</FieldLabel>
                <NativeSelect
                  id="pessoa-uf"
                  className="w-full"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                >
                  <NativeSelectOption value="">Selecione</NativeSelectOption>
                  {UFS.map((uf) => (
                    <NativeSelectOption key={uf} value={uf}>
                      {uf}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}
          />
        </div>
      </Secao>

      <Secao titulo="Outras informações">
        <div className="flex flex-col gap-5">
          <Controller
            control={control}
            name="observacoes"
            render={({ field }) => (
              <Field className="gap-1.5">
                <FieldLabel htmlFor="pessoa-observacoes">Observações (opcional)</FieldLabel>
                <Textarea {...field} id="pessoa-observacoes" rows={4} />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="ativo"
            render={({ field }) => (
              <label htmlFor="pessoa-ativo" className="flex cursor-pointer items-center justify-between gap-4">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Cadastro ativo</span>
                  <span className="text-muted-foreground text-sm">
                    Inativo continua no histórico, mas deixa de aparecer para novos lançamentos.
                  </span>
                </span>
                <Switch id="pessoa-ativo" checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        </div>
      </Secao>

          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" carregando={enviando}>
              {editando ? "Salvar alterações" : `Cadastrar ${config.singular}`}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
