import { criarCadastroStore } from "@/lib/cadastro-store";

import type { Acerto } from "./acerto";

export const useAcertosStore = criarCadastroStore<Acerto>("acertos", []);
