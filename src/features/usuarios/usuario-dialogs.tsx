import { useState } from "react";

import { Check, Copy, TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import type { Usuario } from "./api";

/** Mostra a senha provisória uma única vez (PRD RF-03). Fechou, não dá para ver de novo. */
export function SenhaProvisoriaDialog({
  dados,
  aoFechar,
}: {
  dados: { usuario: Usuario; senha: string; motivo: "cadastro" | "redefinicao" } | null;
  aoFechar: () => void;
}) {
  const [copiada, setCopiada] = useState(false);

  const copiar = async () => {
    if (!dados) return;
    try {
      await navigator.clipboard.writeText(dados.senha);
      setCopiada(true);
    } catch {
      // Sem acesso à área de transferência: a senha continua visível para copiar à mão.
    }
  };

  return (
    <Dialog
      open={dados !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCopiada(false);
          aoFechar();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {dados?.motivo === "redefinicao" ? "Senha redefinida" : "Funcionário cadastrado"}
          </DialogTitle>
          <DialogDescription>
            Repasse a senha provisória abaixo para <strong>{dados?.usuario.nome}</strong>. No primeiro acesso, o
            sistema obriga a troca antes de liberar qualquer tela.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted flex items-center justify-between gap-3 rounded-md border p-3">
          <code className="font-mono text-lg tracking-wider break-all select-all">{dados?.senha}</code>
          <Button type="button" variant="outline" onClick={copiar}>
            {copiada ? <Check /> : <Copy />}
            {copiada ? "Copiada" : "Copiar"}
          </Button>
        </div>

        <p className="text-muted-foreground flex items-start gap-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
          Esta senha aparece só agora. Depois de fechar, a única saída é redefinir de novo.
        </p>

        <DialogFooter>
          <Button type="button" onClick={aoFechar}>
            Já anotei, fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Confirmação antes de redefinir a senha ou de desativar/reativar alguém. */
export function ConfirmacaoDialog({
  confirmacao,
  aoCancelar,
  aoConfirmar,
}: {
  confirmacao: { tipo: "redefinir" | "desativar" | "reativar"; usuario: Usuario } | null;
  aoCancelar: () => void;
  /** Assíncrono: o botão mostra o spinner e o diálogo espera terminar. */
  aoConfirmar: () => Promise<unknown> | void;
}) {
  const nome = confirmacao?.usuario.nome;
  const textos = {
    redefinir: {
      titulo: "Redefinir a senha?",
      descricao: `A senha atual de ${nome} deixa de valer. O sistema gera uma senha provisória, e a troca volta a ser obrigatória no próximo acesso.`,
      acao: "Redefinir senha",
    },
    desativar: {
      titulo: "Desativar este usuário?",
      descricao: `${nome} perde o acesso na hora, mesmo com o sistema aberto, e não consegue mais entrar. Nada é apagado, e você pode reativar depois.`,
      acao: "Desativar",
    },
    reativar: {
      titulo: "Reativar este usuário?",
      descricao: `${nome} volta a poder entrar com a mesma senha, e o mesmo perfil de antes.`,
      acao: "Reativar",
    },
  };
  const texto = confirmacao ? textos[confirmacao.tipo] : null;

  return (
    <AlertDialog open={confirmacao !== null} onOpenChange={(open) => !open && aoCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{texto?.titulo}</AlertDialogTitle>
          <AlertDialogDescription>{texto?.descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant={confirmacao?.tipo === "desativar" ? "destructive" : "default"}
            aoConfirmar={aoConfirmar}
          >
            {texto?.acao}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
