import { useCallback, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Impede envio duplicado: enquanto uma gravação está em andamento, novos cliques/Enter são ignorados
 * (a trava é um ref, vale no mesmo instante, antes de a tela re-renderizar) e `enviando` desabilita o botão.
 */
export function useEnvioUnico() {
  const emAndamento = useRef(false);
  const [enviando, setEnviando] = useState(false);

  /** Envolve uma função assíncrona: só roda uma por vez. */
  const proteger = useCallback(
    <A extends unknown[]>(funcao: (...args: A) => Promise<void> | void) =>
      async (...args: A): Promise<void> => {
        if (emAndamento.current) return;
        emAndamento.current = true;
        setEnviando(true);
        try {
          await funcao(...args);
        } finally {
          emAndamento.current = false;
          setEnviando(false);
        }
      },
    [],
  );

  /** `form.handleSubmit` com a trava de envio único. */
  const enviar = useCallback(
    <T extends FieldValues, O extends FieldValues>(form: UseFormReturn<T, unknown, O>, funcao: (dados: O) => Promise<void> | void) => form.handleSubmit(proteger(funcao)),
    [proteger],
  );

  return { enviando, proteger, enviar };
}
