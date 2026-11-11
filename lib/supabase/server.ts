import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const authDisponivel = Boolean(URL_SUPABASE && CHAVE_ANON);

/**
 * Cliente de servidor, ciente da sessão pelos cookies.
 *
 * Toda escrita da aplicação passa por aqui, de propósito: o cliente leva
 * o JWT do usuário, então as policies de RLS valem como escritas no
 * banco. A aplicação não precisa checar dono de linha — se tentar gravar
 * no log de outra pessoa, o Postgres recusa.
 *
 * O service_role NUNCA entra aqui. Ele ignora RLS e só existe em script.
 */
export async function createSupabaseServer() {
  if (!authDisponivel) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const store = await cookies();

  return createServerClient(URL_SUPABASE!, CHAVE_ANON!, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(lista) {
        try {
          for (const { name, value, options } of lista) {
            store.set(name, value, options);
          }
        } catch {
          // Server Component não pode escrever cookie. Silencioso de
          // propósito: o middleware renova a sessão a cada navegação.
        }
      },
    },
  });
}
