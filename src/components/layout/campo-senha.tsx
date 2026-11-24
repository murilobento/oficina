import { useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Campo de senha com o botão de olho para mostrar o que foi digitado (conferência).
 * É o mesmo Input dos outros campos (borda, foco e o fundo do preenchimento automático cobrem
 * o campo inteiro); o olho fica por cima, à direita. O olho próprio do Edge fica escondido.
 */
export function CampoSenha({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative w-full">
      <Input
        {...props}
        type={visivel ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn("pr-11 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden", className)}
      />
      <button
        type="button"
        aria-label={visivel ? "Esconder a senha" : "Mostrar a senha"}
        aria-pressed={visivel}
        title={visivel ? "Esconder a senha" : "Mostrar a senha"}
        onClick={() => setVisivel((v) => !v)}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-1 my-auto flex size-9 items-center justify-center rounded-md outline-none focus-visible:ring-2 md:size-8"
      >
        {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
