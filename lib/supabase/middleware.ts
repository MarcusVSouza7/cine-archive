import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Renova a sessão a cada navegação.
 *
 * Sem isso o token expira e o usuário é deslogado silenciosamente: o
 * Server Component não pode escrever cookie, então é aqui que o refresh
 * acontece. A chamada a getUser() não é decorativa — é ela que dispara a
 * renovação.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sem Supabase o app roda no fallback dos JSON: nada a renovar.
  if (!URL_SUPABASE || !CHAVE_ANON) return response;

  const supabase = createServerClient(URL_SUPABASE, CHAVE_ANON, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(lista) {
        for (const { name, value } of lista) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of lista) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
