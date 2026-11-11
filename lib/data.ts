/**
 * Acesso ao acervo.
 *
 * Duas fontes, mesma forma de saida:
 *
 *   1. Supabase, quando NEXT_PUBLIC_SUPABASE_URL e ANON_KEY existem
 *   2. os JSON em data/, quando nao existem
 *
 * O fallback nao e gentileza: e o que faz `npm run dev` funcionar antes
 * de qualquer credencial estar no lugar, e o que mantem o projeto
 * rodando se o Supabase cair. A fase 1 do roadmap roda inteira no
 * fallback; semear o banco e trocar a fonte, nao reescrever a aplicacao.
 *
 * Somente servidor: nenhum destes modulos deve ser importado por
 * Client Component.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Film, FilmStats, Movement } from "./types";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const usandoSupabase = Boolean(URL_SUPABASE && CHAVE_ANON);

let cliente: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!cliente) {
    cliente = createClient(URL_SUPABASE!, CHAVE_ANON!, {
      auth: { persistSession: false },
    });
  }
  return cliente;
}

/* ============================================================
   normalizacao
   ============================================================ */

type LinhaJsonEscola = {
  id: string; name: string; region: string; years: string;
  abstract: string; aesthetic: string; keyDirectors: string[];
  hue: number; sat: string;
};

type LinhaJsonFilme = {
  id: string; tmdb_id?: number | null; title: string; originalTitle: string;
  year: number; country: string; director: string; runtime: number;
  movement: string; rating: number; relevance: number; synopsis: string;
  archival: boolean; poster_path?: string | null; backdrop_path?: string | null;
};

type LinhaDbEscola = {
  id: string; name: string; region: string; years: string;
  abstract: string; aesthetic: string; key_directors: string[];
  hue: number; sat: string;
};

type LinhaDbFilme = {
  id: string; tmdb_id: number | null; title: string; original_title: string;
  year: number; country: string; director: string; runtime: number | null;
  movement_id: string; archive_score: number | null;
  historical_relevance: number | null; synopsis: string; archival: boolean;
  poster_path: string | null; backdrop_path: string | null;
};

const deJsonEscola = (m: LinhaJsonEscola): Movement => ({ ...m });

const deDbEscola = (m: LinhaDbEscola): Movement => ({
  id: m.id, name: m.name, region: m.region, years: m.years,
  abstract: m.abstract, aesthetic: m.aesthetic,
  keyDirectors: m.key_directors ?? [], hue: m.hue, sat: m.sat,
});

const deJsonFilme = (f: LinhaJsonFilme): Film => ({
  id: f.id,
  tmdbId: f.tmdb_id ?? null,
  title: f.title,
  originalTitle: f.originalTitle,
  year: f.year,
  country: f.country,
  director: f.director,
  runtime: f.runtime ?? null,
  movementId: f.movement,
  archiveScore: f.rating ?? null,
  historicalRelevance: f.relevance ?? null,
  synopsis: f.synopsis,
  archival: Boolean(f.archival),
  posterPath: f.poster_path ?? null,
  backdropPath: f.backdrop_path ?? null,
});

const deDbFilme = (f: LinhaDbFilme): Film => ({
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

/* ============================================================
   leitura dos JSON locais
   ============================================================ */

async function lerJson<T>(arquivo: string): Promise<T> {
  const p = path.join(process.cwd(), "data", arquivo);
  return JSON.parse(await readFile(p, "utf8")) as T;
}

/* ============================================================
   consultas
   ============================================================ */

export async function getMovements(): Promise<Movement[]> {
  if (!usandoSupabase) {
    const linhas = await lerJson<LinhaJsonEscola[]>("movements.json");
    return linhas.map(deJsonEscola);
  }
  const { data, error } = await supabase()
    .from("movements")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Supabase movements: ${error.message}`);
  return (data as LinhaDbEscola[]).map(deDbEscola);
}

export async function getFilms(): Promise<Film[]> {
  if (!usandoSupabase) {
    const linhas = await lerJson<LinhaJsonFilme[]>("films.json");
    return linhas.map(deJsonFilme);
  }
  const { data, error } = await supabase()
    .from("films")
    .select("*")
    .order("archive_score", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`Supabase films: ${error.message}`);
  return (data as LinhaDbFilme[]).map(deDbFilme);
}

export async function getFilm(slug: string): Promise<Film | null> {
  if (!usandoSupabase) {
    const todos = await getFilms();
    return todos.find((f) => f.id === slug) ?? null;
  }
  const { data, error } = await supabase()
    .from("films")
    .select("*")
    .eq("id", slug)
    .maybeSingle();
  if (error) throw new Error(`Supabase film ${slug}: ${error.message}`);
  return data ? deDbFilme(data as LinhaDbFilme) : null;
}

export async function getMovement(slug: string): Promise<Movement | null> {
  const todas = await getMovements();
  return todas.find((m) => m.id === slug) ?? null;
}

/**
 * Agregados da comunidade. Sem Supabase nao existem usuarios, logo
 * nao existem numeros — devolve null, e a interface omite o bloco em
 * vez de mostrar zero, que leria como "ninguem gostou".
 */
export async function getFilmStats(filmId: string): Promise<FilmStats | null> {
  if (!usandoSupabase) return null;
  const { data, error } = await supabase()
    .from("film_stats")
    .select("*")
    .eq("film_id", filmId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    filmId: data.film_id,
    logCount: data.log_count ?? 0,
    ratingCount: data.rating_count ?? 0,
    ratingAvg: data.rating_avg ?? null,
    likeCount: data.like_count ?? 0,
    reviewCount: data.review_count ?? 0,
  };
}

/* ============================================================
   derivados
   ============================================================ */

export const decadeOf = (year: number) => Math.floor(year / 10) * 10;

export async function getIndex() {
  const [movements, films] = await Promise.all([getMovements(), getFilms()]);
  const byMovement = new Map(movements.map((m) => [m.id, m]));
  return {
    movements,
    films,
    byMovement,
    countries: [...new Set(films.map((f) => f.country))].sort((a, b) =>
      a.localeCompare(b, "pt")
    ),
    decades: [...new Set(films.map((f) => decadeOf(f.year)))].sort((a, b) => a - b),
  };
}

/** Numero de catalogo estavel: posicao no acervo ordenado por ano e id. */
export function catalogNumbers(films: Film[]): Map<string, string> {
  const ordenado = [...films].sort(
    (a, b) => a.year - b.year || a.id.localeCompare(b.id)
  );
  return new Map(ordenado.map((f, i) => [f.id, String(i + 1).padStart(3, "0")]));
}
