/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" liga o login (precisa da API no ar). Sem isso o sistema abre com o funcionário de exemplo. */
  readonly VITE_LOGIN_ATIVO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
