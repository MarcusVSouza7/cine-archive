import type { User } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import { authDisponivel, createSupabaseServer } from "./supabase/server";
import type { Profile } from "./types";

export { authDisponivel };

/**
 * Usuário da sessão, ou null.
 *
 * Nunca lança: sem Supabase configurado a aplicação toda roda anônima,
 * e cada página decide o que mostrar no lugar do que exige login.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!authDisponivel) return null;
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch (e) {
    // Obrigatorio: sem isto o DynamicServerError lancado por cookies()
    // seria engolido, o Next nao marcaria a rota como dinamica, e a
    // pagina anonima ficaria em cache para quem esta logado. O mesmo
    // vale para redirect() e notFound().
    unstable_rethrow(e);
    return null;
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!authDisponivel) return null;
  try {
    const supabase = await createSupabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("id, handle, display_name, bio, avatar_url, onboarded")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      handle: data.handle,
      displayName: data.display_name,
      bio: data.bio,
      avatarUrl: data.avatar_url,
      onboarded: data.onboarded ?? false,
    };
  } catch (e) {
    unstable_rethrow(e);
    return null;
  }
}

/** Para Server Action: exige sessão e devolve o id do perfil. */
export async function requireProfileId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Entre para fazer isso.");
  return user.id;
}
