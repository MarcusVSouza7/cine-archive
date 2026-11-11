/**
 * Camada TMDb.
 *
 * REGRA: a chave nunca vai ao cliente. Nada aqui recebe prefixo
 * NEXT_PUBLIC_, e este modulo só e importado por Server Component ou
 * route handler.
 *
 * REGRA: nenhum proxy aberto. Um /api/tmdb/[...path] que repassa
 * qualquer caminho e a sua cota servida de graca a quem achar o
 * endpoint. Aqui só existem funcoes nomeadas, uma por necessidade real.
 *
 * A grade e as listas NAO chamam o TMDb: elas leem films.poster_path,
 * em cache no Postgres. Só a ficha individual busca elenco e providers.
 */

const TOKEN = process.env.TMDB_READ_TOKEN;
const BASE = "https://api.themoviedb.org/3";

export const tmdbConfigurado = Boolean(TOKEN);

const IMG = "https://image.tmdb.org/t/p";

/** Tamanhos de pôster do TMDb. Nunca sirva `original` numa grade. */
export const POSTER = {
  grade: "w342",
  ficha: "w500",
  mini: "w154",
} as const;

export function posterUrl(
  posterPath: string | null,
  size: (typeof POSTER)[keyof typeof POSTER] = POSTER.grade
): string | null {
  return posterPath ? `${IMG}/${size}${posterPath}` : null;
}

export function backdropUrl(backdropPath: string | null): string | null {
  return backdropPath ? `${IMG}/w1280${backdropPath}` : null;
}

/* ============================================================
   tipos do que realmente consumimos
   ============================================================ */

export type TmdbCredit = { name: string; character?: string; order?: number };

export type TmdbProvider = { provider_name: string; logo_path: string | null };

export type TmdbMovie = {
  id: number;
  original_title: string;
  overview: string | null;
  runtime: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number | null;
  vote_count: number | null;
  original_language: string | null;
  cast: TmdbCredit[];
  /** Disponibilidade na regiao pedida. Dado do JustWatch: exige atribuicao. */
  providers: {
    flatrate: TmdbProvider[];
    rent: TmdbProvider[];
    buy: TmdbProvider[];
    link: string | null;
  };
};

/* ============================================================
   chamadas
   ============================================================ */

async function chamar<T>(
  caminho: string,
  params: Record<string, string> = {},
  revalidate = 86_400
): Promise<T> {
  if (!TOKEN) throw new Error("TMDB_READ_TOKEN nao definido");

  const url = new URL(BASE + caminho);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`TMDb ${res.status} em ${caminho}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Ficha, elenco e disponibilidade em UMA requisicao.
 * `append_to_response` e o que evita tres chamadas por pagina de filme.
 */
export async function getMovie(
  tmdbId: number,
  regiao = "BR"
): Promise<TmdbMovie | null> {
  if (!TOKEN) return null;

  try {
    type Bruto = {
      id: number;
      original_title: string;
      overview: string | null;
      runtime: number | null;
      poster_path: string | null;
      backdrop_path: string | null;
      vote_average: number | null;
      vote_count: number | null;
      original_language: string | null;
      credits?: { cast?: TmdbCredit[] };
      "watch/providers"?: {
        results?: Record<
          string,
          {
            link?: string;
            flatrate?: TmdbProvider[];
            rent?: TmdbProvider[];
            buy?: TmdbProvider[];
          }
        >;
      };
    };

    const d = await chamar<Bruto>(`/movie/${tmdbId}`, {
      language: "pt-BR",
      append_to_response: "credits,watch/providers",
    });

    const regional = d["watch/providers"]?.results?.[regiao] ?? {};

    return {
      id: d.id,
      original_title: d.original_title,
      overview: d.overview,
      runtime: d.runtime,
      poster_path: d.poster_path,
      backdrop_path: d.backdrop_path,
      vote_average: d.vote_average,
      vote_count: d.vote_count,
      original_language: d.original_language,
      cast: (d.credits?.cast ?? []).slice(0, 8),
      providers: {
        flatrate: regional.flatrate ?? [],
        rent: regional.rent ?? [],
        buy: regional.buy ?? [],
        link: regional.link ?? null,
      },
    };
  } catch (e) {
    // O TMDb e enriquecimento, nao fonte de verdade: se cair, a ficha
    // curada continua inteira. Loga e segue.
    console.error("[tmdb] getMovie falhou:", (e as Error).message);
    return null;
  }
}

/** Só para o backfill e para o painel de curadoria. Nunca em rota publica. */
export async function searchMovie(query: string, year?: number) {
  if (!TOKEN) return [];
  type Resultado = {
    results?: Array<{
      id: number;
      title: string;
      original_title: string;
      release_date: string | null;
      poster_path: string | null;
      vote_count: number;
    }>;
  };
  const d = await chamar<Resultado>(
    "/search/movie",
    {
      query,
      include_adult: "false",
      language: "pt-BR",
      ...(year ? { primary_release_year: String(year) } : {}),
    },
    3_600
  );
  return d.results ?? [];
}
