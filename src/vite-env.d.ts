/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/info" />

interface ImportMetaEnv {
  /** "true" liga o login (precisa da API no ar). Sem isso o sistema abre com o funcionário de exemplo. */
  readonly VITE_LOGIN_ATIVO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
