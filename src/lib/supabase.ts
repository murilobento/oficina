import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** true quando o .env.local ainda não foi preenchido. */
export const supabaseNaoConfigurado = !url || !anonKey

/**
 * Cliente único do Supabase. Só a chave pública (anon) entra aqui;
 * a service_role nunca vai para o navegador.
 */
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'chave-nao-configurada',
)
