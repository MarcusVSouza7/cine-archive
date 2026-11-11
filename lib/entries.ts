/**
 * Leitura de perfis e do log.
 *
 * Tudo aqui depende do Supabase: sem banco não existem usuários, e cada
 * função devolve vazio em vez de lançar. A aplicação segue inteira no
 * modo protótipo, só sem a camada social.
 */

import { unstable_rethrow } from "next/navigation";
import { authDisponivel, createSupabaseServer } from "./supabase/server";
import type {
  Entry,
  EntryWithFilm,
  EntryWithProfile,
  Film,
  Profile,
  ProfileTotals,
} from "./types";

/* ---------------- normalização ---------------- */

type LinhaEntry = {
  id: string;
  profile_id: string;
  film_id: string;
  watched_on: string | null;
  watch_count: number;
  rating: number | string | null;
  liked: boolean;
  review: string | null;
  has_spoilers: boolean;
  created_at: string;
};

type LinhaFilme = {
  id: string; tmdb_id: number | null; title: string; original_title: string;
  year: number; country: string; director: string; runtime: number | null;
  movement_id: string; archive_score: number | null;
  historical_relevance: number | null; synopsis: string; archival: boolean;
  poster_path: string | null; backdrop_path: string | null;
};

type LinhaPerfil = {
  handle: string;
  display_name: string;
  avatar_url: string | null;
};

/** `numeric` volta como string do driver: Number() é obrigatório, não enfeite. */
const nota = (v: number | string | null): number | null =>
  v === null ? null : Number(v);

const deEntry = (e: LinhaEntry): Entry => ({
  id: e.id,
  profileId: e.profile_id,
  filmId: e.film_id,
  watchedOn: e.watched_on,
  watchCount: e.watch_count,
  rating: nota(e.rating),
  liked: e.liked,
  review: e.review,
  hasSpoilers: e.has_spoilers,
  createdAt: e.created_at,
});

const deFilme = (f: LinhaFilme): Film => ({
  id: f.id,
  tmdbId: f.tmdb_id,
  title: f.title,
  originalTitle: f.original_title,
  year: f.year,
  country: f.country,
  director: f.director,
  runtime: f.runtime,
  movementId: f.movement_id,
  archiveScore: f.archive_score,
  historicalRelevance: f.historical_relevance,
  synopsis: f.synopsis,
  archival: f.archival,
  posterPath: f.poster_path,
  backdropPath: f.backdrop_path,
});

const CAMPOS = "id, profile_id, film_id, watched_on, watch_count, rating, liked, review, has_spoilers, created_at";

/* ---------------- consultas ---------------- */

/** O log do usuário atual para um filme, se existir. */
export async function getMyEntry(filmId: string): Promise<Entry | null> {
  if (!authDisponivel) return null;
  try {
    const supabase = await createSupabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;

    const { data } = await supabase
      .from("entries")
      .select(CAMPOS)
      .eq("profile_id", auth.user.id)
      .eq("film_id", filmId)
      .maybeSingle();

    return data ? deEntry(data as LinhaEntry) : null;
  } catch (e) {
    unstable_rethrow(e);
    return null;
  }
}

/** Reviews públicas de uma ficha, mais recentes primeiro. */
export async function getFilmReviews(
  filmId: string,
  limite = 12
): Promise<EntryWithProfile[]> {
  if (!authDisponivel) return [];
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("entries")
      .select(`${CAMPOS}, profiles!inner (handle, display_name, avatar_url)`)
      .eq("film_id", filmId)
      .not("review", "is", null)
      .order("created_at", { ascending: false })
      .limit(limite);

    return (data ?? []).map((linha) => {
      const l = linha as unknown as LinhaEntry & { profiles: LinhaPerfil };
      return {
        ...deEntry(l),
        profile: {
          handle: l.profiles.handle,
          displayName: l.profiles.display_name,
          avatarUrl: l.profiles.avatar_url,
        },
      };
    });
  } catch (e) {
    unstable_rethrow(e);
    return [];
  }
}

export async function getProfileByHandle(
  handle: string
): Promise<Profile | null> {
  if (!authDisponivel) return null;
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("profiles")
      .select("id, handle, display_name, bio, avatar_url, onboarded")
      .eq("handle", handle)
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

/** O diário de um perfil: entradas com o filme embutido. */
export async function getDiary(
  profileId: string,
  limite = 60
): Promise<EntryWithFilm[]> {
  if (!authDisponivel) return [];
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("entries")
      .select(`${CAMPOS}, films!inner (*)`)
      .eq("profile_id", profileId)
      .order("watched_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limite);

    return (data ?? []).map((linha) => {
      const l = linha as unknown as LinhaEntry & { films: LinhaFilme };
      return { ...deEntry(l), film: deFilme(l.films) };
    });
  } catch (e) {
    unstable_rethrow(e);
    return [];
  }
}

/**
 * Contagens do perfil.
 *
 * Calculadas sobre o diário já carregado em vez de cinco agregações no
 * banco: o teto de entradas por perfil é o tamanho do acervo, então não
 * vale a ida extra.
 */
export function totalsFromDiary(diary: EntryWithFilm[]): ProfileTotals {
  const notas = diary
    .map((e) => e.rating)
    .filter((r): r is number => r !== null);

  return {
    logged: diary.length,
    rated: notas.length,
    reviews: diary.filter((e) => e.review).length,
    likes: diary.filter((e) => e.liked).length,
    avgRating: notas.length
      ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10
      : null,
  };
}
