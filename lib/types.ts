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

export type Film = {
  id: string;
  tmdbId: number | null;
  title: string;
  originalTitle: string;
  year: number;
  country: string;
  director: string;
  runtime: number | null;
  movementId: string;
  /** Nota editorial 0-100. Nao e media de usuarios. */
  archiveScore: number | null;
  historicalRelevance: number | null;
  synopsis: string;
  archival: boolean;
  /** Em cache do TMDb. Null -> a interface cai na placa tipografica. */
  posterPath: string | null;
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
