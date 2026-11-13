import type { ReactNode } from "react";

/** Cabeçalho padrão de uma tela: título, descrição e conteúdo. */
export function Pagina({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="text-muted-foreground text-sm">{descricao}</p>}
      </div>
      {children}
    </div>
  );
}

/** Aviso usado nas telas que ainda serão construídas. */
export function EmConstrucao() {
  return (
    <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
      Esta tela ainda será construída.
    </div>
  )
}
