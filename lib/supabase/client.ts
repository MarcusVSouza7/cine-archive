"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de navegador.
 *
 * Usado apenas para iniciar o fluxo OAuth — é o único momento em que o
 * cliente precisa falar com o Supabase direto. Leitura e escrita de
 * dados acontecem no servidor, por Server Component e Server Action.
 */
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
