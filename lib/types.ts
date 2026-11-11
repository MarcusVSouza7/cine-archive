/**
 * Tipos do dominio.
 *
 * Uma forma só, em camelCase, independente da fonte: o JSON local do
 * protótipo e o Postgres usam nomes diferentes (`rating` vs
 * `archive_score`, `movement` vs `movement_id`). A normalizacao mora em
 * lib/data.ts, e o resto da aplicacao só conhece estes tipos.
 */

export type Movement = {
  id: string;
  name: string;
  region: string;
  years: string;
  abstract: string;
  aesthetic: string;
  keyDirectors: string[];
  hue: number;
  sat: string;
};

/**
 * A forma minima que as duas populacoes de filme sabem produzir.
 *
 *   ARQUIVO   curadoria propria: preenche tudo.
 *   CATALOGO  o TMDb inteiro, ao vivo: deixa escola, pais e diretor
 *             nulos, porque nao ha curadoria sobre ele.
 *
 * Grade, lista e diario consomem isto, entao servem as duas sem
 * conversao. Quem precisa dos campos editoriais pede `Film`.
 */
export type CatalogItem = {
  id: string;
  tmdbId: number | null;
  title: string;
  originalTitle: string | null;
  year: number | null;
  /** Em cache do TMDb. Null -> a interface cai na placa tipografica. */
  posterPath: string | null;
  director: string | null;
  country: string | null;
  movementId: string | null;
  inArchive: boolean;
  /** Nota editorial 0-100. Nao e media de usuarios. Null fora do arquivo. */
  archiveScore: number | null;
  /** Media do TMDb, 0-10. Nao confundir com archiveScore nem com a da casa. */
  voteAverage: number | null;
  voteCount: number | null;
};

/**
 * Obra do arquivo: um CatalogItem com a curadoria em cima.
 *
 * A intersecao estreita os campos que o catalogo deixa nulos — obra
 * catalogada sempre tem ano, pais, diretor e escola. Por ser um subtipo,
 * `Film` e aceito em qualquer lugar que peca `CatalogItem`.
 */
export type Film = CatalogItem & {
  year: number;
  country: string;
  director: string;
  originalTitle: string;
  movementId: string;
  inArchive: true;

  runtime: number | null;
  /** Relevancia historica 0-100. Editorial, como archiveScore. */
  historicalRelevance: number | null;
  synopsis: string;
  archival: boolean;
  backdropPath: string | null;
};

/** Agregados da comunidade. Separados das notas editoriais de proposito. */
export type FilmStats = {
  filmId: string;
  logCount: number;
  ratingCount: number;
  ratingAvg: number | null;
  likeCount: number;
  reviewCount: number;
};

export type Profile = {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  /** True depois que o usuario salvou /conta pela primeira vez. */
  onboarded: boolean;
};

export type Entry = {
  id: string;
  profileId: string;
  filmId: string;
  watchedOn: string | null;
  watchCount: number;
  rating: number | null;
  liked: boolean;
  review: string | null;
  hasSpoilers: boolean;
  createdAt: string;
};

/**
 * Uma entrada do log com o filme embutido: o diario de um perfil.
 *
 * CatalogItem e nao Film, porque a entrada pode apontar para um stub do
 * TMDb, que nao tem escola nem nota editorial.
 */
export type EntryWithFilm = Entry & { film: CatalogItem };

/** Uma entrada com quem escreveu: as reviews de uma ficha. */
export type EntryWithProfile = Entry & {
  profile: Pick<Profile, "handle" | "displayName" | "avatarUrl">;
};

/** Contagens do perfil. */
export type ProfileTotals = {
  logged: number;
  rated: number;
  reviews: number;
  likes: number;
  avgRating: number | null;
};

/* ---------------- filtros do explorador ---------------- */

export const SORTS = {
  rating: "Nota do arquivo",
  relevance: "Relevância histórica",
  "year-desc": "Ano — mais recente",
  "year-asc": "Ano — mais antigo",
  title: "Título A–Z",
} as const;

export type SortKey = keyof typeof SORTS;

export const MODES = {
  browse: "Acervo",
  decade: "Top por década",
  country: "Top por país",
} as const;

export type ModeKey = keyof typeof MODES;

export type ViewKey = "grid" | "list";

/** Qual das duas populacoes o explorador esta mostrando. */
export const SCOPES = {
  archive: "O Arquivo",
  tmdb: "Catálogo TMDb",
} as const;

export type ScopeKey = keyof typeof SCOPES;

export function isScopeKey(v: string | undefined): v is ScopeKey {
  return !!v && v in SCOPES;
}

export type Query = {
  country: string;
  decade: string;
  movement: string;
  sort: SortKey;
  mode: ModeKey;
  view: ViewKey;
};

export function isSortKey(v: string | undefined): v is SortKey {
  return !!v && v in SORTS;
}
export function isModeKey(v: string | undefined): v is ModeKey {
  return !!v && v in MODES;
}
