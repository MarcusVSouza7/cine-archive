"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireProfileId } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; erro?: string; aviso?: string };

/* ============================================================
   LOG / REVIEW
   ============================================================ */

const NOTAS_VALIDAS = new Set([
  "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5",
]);

/**
 * Grava o log do usuário para um filme.
 *
 * Upsert, porque `entries` tem unique (profile_id, film_id): salvar duas
 * vezes edita, não duplica.
 *
 * As validações daqui repetem os checks do banco de propósito. O banco é
 * a autoridade — ele recusa mesmo se isto falhar — mas a mensagem crua de
 * um constraint violado não serve para quem está preenchendo o formulário.
 */
export async function saveEntry(
  _anterior: Resultado | null,
  form: FormData
): Promise<Resultado> {
  let filmId = "";
  try {
    const profileId = await requireProfileId();

    filmId = String(form.get("filmId") ?? "");
    if (!filmId) return { ok: false, erro: "Filme não identificado." };

    const notaCru = String(form.get("rating") ?? "").trim();
    if (notaCru && !NOTAS_VALIDAS.has(notaCru)) {
      return { ok: false, erro: "A nota vai de meia a cinco estrelas." };
    }

    const dataCru = String(form.get("watchedOn") ?? "").trim();
    if (dataCru && !/^\d{4}-\d{2}-\d{2}$/.test(dataCru)) {
      return { ok: false, erro: "Data inválida." };
    }
    if (dataCru) {
      const hoje = new Date();
      hoje.setUTCHours(23, 59, 59, 999);
      if (new Date(`${dataCru}T12:00:00Z`) > hoje) {
        return { ok: false, erro: "A data não pode estar no futuro." };
      }
    }

    const review = String(form.get("review") ?? "").trim();
    if (review.length > 10_000) {
      return { ok: false, erro: "A review passou de 10 mil caracteres." };
    }

    const revisões = Number(form.get("watchCount") ?? 1);
    if (!Number.isInteger(revisões) || revisões < 1 || revisões > 999) {
      return { ok: false, erro: "Número de vezes vistas inválido." };
    }

    const supabase = await createSupabaseServer();
    const { error } = await supabase.from("entries").upsert(
      {
        profile_id: profileId,
        film_id: filmId,
        watched_on: dataCru || null,
        watch_count: revisões,
        rating: notaCru ? Number(notaCru) : null,
        liked: form.get("liked") === "on",
        review: review || null,
        has_spoilers: form.get("hasSpoilers") === "on",
      },
      { onConflict: "profile_id,film_id" }
    );

    if (error) {
      // 42501 = RLS recusou. Acontece se a sessão expirou no meio.
      if (error.code === "42501") {
        return { ok: false, erro: "Sessão expirada. Entre de novo." };
      }
      return { ok: false, erro: `Não deu para salvar: ${error.message}` };
    }
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  revalidatePath(`/filmes/${filmId}`);
  const perfil = await getCurrentProfile();
  if (perfil) revalidatePath(`/u/${perfil.handle}`);

  return { ok: true, aviso: "Registrado." };
}

export async function deleteEntry(
  _anterior: Resultado | null,
  form: FormData
): Promise<Resultado> {
  const filmId = String(form.get("filmId") ?? "");
  try {
    const profileId = await requireProfileId();
    const supabase = await createSupabaseServer();

    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("profile_id", profileId)
      .eq("film_id", filmId);

    if (error) return { ok: false, erro: `Não deu para apagar: ${error.message}` };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  revalidatePath(`/filmes/${filmId}`);
  const perfil = await getCurrentProfile();
  if (perfil) revalidatePath(`/u/${perfil.handle}`);

  return { ok: true, aviso: "Registro removido." };
}

/* ============================================================
   PERFIL
   ============================================================ */

const HANDLE = /^[a-z0-9_]{3,24}$/;

/** Handles que não podem ser tomados por um usuário: colidem com rotas. */
const RESERVADOS = new Set([
  "admin", "api", "auth", "conta", "escolas", "explorar", "filmes",
  "login", "logout", "sobre", "u", "sitemap", "robots", "null", "undefined",
]);

export async function saveProfile(
  _anterior: Resultado | null,
  form: FormData
): Promise<Resultado> {
  let handle = "";
  try {
    const profileId = await requireProfileId();

    handle = String(form.get("handle") ?? "").trim().toLowerCase();
    if (!HANDLE.test(handle)) {
      return {
        ok: false,
        erro: "O handle usa de 3 a 24 caracteres: minúsculas, números e _.",
      };
    }
    if (RESERVADOS.has(handle)) {
      return { ok: false, erro: `"${handle}" é reservado. Escolha outro.` };
    }

    const nome = String(form.get("displayName") ?? "").trim();
    if (nome.length < 1 || nome.length > 60) {
      return { ok: false, erro: "O nome tem de 1 a 60 caracteres." };
    }

    const bio = String(form.get("bio") ?? "").trim();
    if (bio.length > 500) {
      return { ok: false, erro: "A bio passou de 500 caracteres." };
    }

    const supabase = await createSupabaseServer();
    const { error } = await supabase
      .from("profiles")
      .update({
        handle,
        display_name: nome,
        bio: bio || null,
        onboarded: true,
      })
      .eq("id", profileId);

    if (error) {
      // 23505 = unique violado. O único unique aqui é o handle.
      if (error.code === "23505") {
        return { ok: false, erro: `O handle "${handle}" já está em uso.` };
      }
      return { ok: false, erro: `Não deu para salvar: ${error.message}` };
    }
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  revalidatePath("/conta");
  revalidatePath(`/u/${handle}`);
  return { ok: true, aviso: "Perfil salvo." };
}

/* ============================================================
   SESSÃO
   ============================================================ */

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
