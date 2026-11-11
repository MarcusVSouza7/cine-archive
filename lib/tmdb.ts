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

/* ============================================================
   CATÁLOGO — navegar e buscar o TMDb inteiro
   ============================================================ */

/**
 * Países de origem oferecidos no filtro do catálogo.
 *
 * Lista curada, não as ~250 do ISO 3166: um select com duzentas entradas
 * não é navegação. São as cinematografias que o acervo já cobre mais as
 * que um usuário deste site provavelmente procura.
 */
export const PAISES_TMDB: { iso: string; nome: string }[] = [
  { iso: "BR", nome: "Brasil" },
  { iso: "US", nome: "Estados Unidos" },
  { iso: "FR", nome: "França" },
  { iso: "IT", nome: "Itália" },
  { iso: "DE", nome: "Alemanha" },
  { iso: "JP", nome: "Japão" },
  { iso: "TW", nome: "Taiwan" },
  { iso: "DK", nome: "Dinamarca" },
  { iso: "GB", nome: "Reino Unido" },
  { iso: "ES", nome: "Espanha" },
  { iso: "AR", nome: "Argentina" },
  { iso: "MX", nome: "México" },
  { iso: "KR", nome: "Coreia do Sul" },
  { iso: "CN", nome: "China" },
  { iso: "HK", nome: "Hong Kong" },
  { iso: "IN", nome: "Índia" },
  { iso: "IR", nome: "Irã" },
  { iso: "RU", nome: "Rússia" },
  { iso: "SE", nome: "Suécia" },
  { iso: "PL", nome: "Polônia" },
  { iso: "PT", nome: "Portugal" },
  { iso: "CA", nome: "Canadá" },
  { iso: "AU", nome: "Austrália" },
];

/** Décadas oferecidas no catálogo, de 1890 à atual. */
export function decadasTmdb(): number[] {
  const atual = Math.floor(new Date().getFullYear() / 10) * 10;
  const out: number[] = [];
  for (let d = atual; d >= 1890; d -= 10) out.push(d);
  return out;
}

export const ORDENS_TMDB = {
  popularity: "Mais populares",
  rating: "Melhor avaliados",
  "date-desc": "Lançamento — recente",
  "date-asc": "Lançamento — antigo",
  revenue: "Maior bilheteria",
} as const;

export type OrdemTmdb = keyof typeof ORDENS_TMDB;

export function isOrdemTmdb(v: string | undefined): v is OrdemTmdb {
  return !!v && v in ORDENS_TMDB;
}

/**
 * Piso de votos para a ordenação por nota.
 *
 * Sem isto, `vote_average.desc` devolve filmes com três votos e média
 * 10,0 no topo — o TMDb não aplica média bayesiana no discover. O piso é
 * o que transforma "melhor avaliados" em algo que significa alguma coisa.
 */
const PISO_VOTOS = 300;

export type ResultadoTmdb = {
  id: number;
  title: string;
  original_title: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  vote_average: number | null;
  vote_count: number | null;
  original_language: string | null;
};

export type PaginaTmdb = {
  itens: ResultadoTmdb[];
  pagina: number;
  totalPaginas: number;
  totalResultados: number;
};

type RespostaLista = {
  page?: number;
  results?: ResultadoTmdb[];
  total_pages?: number;
  total_results?: number;
};

const VAZIA: PaginaTmdb = {
  itens: [],
  pagina: 1,
  totalPaginas: 0,
  totalResultados: 0,
};

/** O discover do TMDb só serve até a página 500. */
const PAGINA_MAX = 500;

function normalizaPagina(resp: RespostaLista, pedida: number): PaginaTmdb {
  return {
    itens: resp.results ?? [],
    pagina: resp.page ?? pedida,
    totalPaginas: Math.min(resp.total_pages ?? 0, PAGINA_MAX),
    totalResultados: resp.total_results ?? 0,
  };
}

/**
 * Navegação pelo catálogo inteiro: /discover/movie.
 *
 * É aqui que "todo o acervo do TMDb" acontece — ao vivo, sem importar
 * nada para o banco.
 */
export async function discoverMovies(opcoes: {
  country?: string;
  decade?: string;
  sort?: OrdemTmdb;
  page?: number;
}): Promise<PaginaTmdb> {
  if (!TOKEN) return VAZIA;

  const pagina = Math.min(Math.max(opcoes.page ?? 1, 1), PAGINA_MAX);

  const params: Record<string, string> = {
    language: "pt-BR",
    include_adult: "false",
    include_video: "false",
    page: String(pagina),
  };

  switch (opcoes.sort ?? "popularity") {
    case "rating":
      params.sort_by = "vote_average.desc";
      params["vote_count.gte"] = String(PISO_VOTOS);
      break;
    case "date-desc":
      params.sort_by = "primary_release_date.desc";
      // sem piso, "recente" devolve projeto anunciado e nunca lançado
      params["vote_count.gte"] = "10";
      break;
    case "date-asc":
      params.sort_by = "primary_release_date.asc";
      params["primary_release_date.gte"] = "1890-01-01";
      break;
    case "revenue":
      params.sort_by = "revenue.desc";
      break;
    default:
      params.sort_by = "popularity.desc";
  }

  if (opcoes.country) params.with_origin_country = opcoes.country;

  if (opcoes.decade && /^\d{4}$/.test(opcoes.decade)) {
    const d = Number(opcoes.decade);
    params["primary_release_date.gte"] = `${d}-01-01`;
    params["primary_release_date.lte"] = `${d + 9}-12-31`;
  }

  try {
    const resp = await chamar<RespostaLista>("/discover/movie", params, 3_600);
    return normalizaPagina(resp, pagina);
  } catch (e) {
    console.error("[tmdb] discover falhou:", (e as Error).message);
    return VAZIA;
  }
}

/** Busca por texto no catálogo inteiro. */
export async function searchCatalog(
  query: string,
  page = 1
): Promise<PaginaTmdb> {
  if (!TOKEN || !query.trim()) return VAZIA;

  const pagina = Math.min(Math.max(page, 1), PAGINA_MAX);

  try {
    const resp = await chamar<RespostaLista>(
      "/search/movie",
      {
        query: query.trim(),
        include_adult: "false",
        language: "pt-BR",
        page: String(pagina),
      },
      600
    );
    return normalizaPagina(resp, pagina);
  } catch (e) {
    console.error("[tmdb] search falhou:", (e as Error).message);
    return VAZIA;
  }
}

/**
 * Ficha mínima de um filme do TMDb.
 *
 * Usada para criar o stub no banco quando alguém registra um filme que
 * ainda não existe lá. Não traz elenco nem providers: isso é a ficha
 * completa, e stub é stub.
 */
export async function getMovieStub(tmdbId: number): Promise<ResultadoTmdb & {
  runtime: number | null;
} | null> {
  if (!TOKEN) return null;
  try {
    return await chamar<ResultadoTmdb & { runtime: number | null }>(
      `/movie/${tmdbId}`,
      { language: "pt-BR" },
      86_400
    );
  } catch (e) {
    console.error("[tmdb] getMovieStub falhou:", (e as Error).message);
    return null;
  }
}

/** Ano a partir de release_date, que o TMDb devolve vazio com frequência. */
export function anoDe(releaseDate: string | null | undefined): number | null {
  if (!releaseDate) return null;
  const a = Number(releaseDate.slice(0, 4));
  return Number.isFinite(a) && a >= 1870 && a <= 2200 ? a : null;
}
