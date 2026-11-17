import { cn } from "@/lib/utils";

import { useEmpresa } from "./store";
import { siglaEmpresa } from "./tipos";

/**
 * A logo da oficina no tamanho `className` (quadrado). Sem logo, mostra as iniciais do nome
 * fantasia. Usado no menu e na tela de entrada.
 */
export function LogoEmpresa({ className }: { className?: string }) {
  const empresa = useEmpresa();
  if (empresa.logo) {
    return (
      <img
        src={empresa.logo}
        alt={`Logo ${empresa.nomeFantasia}`}
        className={cn("shrink-0 rounded-md object-contain", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "bg-primary text-primary-foreground flex shrink-0 items-center justify-center rounded-md text-xs font-bold",
        className,
      )}
    >
      {siglaEmpresa(empresa.nomeFantasia)}
    </span>
  );
}
