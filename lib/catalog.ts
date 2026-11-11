/**
 * A ponte entre as duas populações de filme.
 *
 *   ARQUIVO   curadoria sua. Slug editorial ("deus-diabo-1964"), escola,
 *             nota de arquivo, sinopse escrita. 37 obras.
 *   CATÁLOGO  o TMDb inteiro, ao vivo. Slug "tmdb-<id>". Sem escola e sem
 *             nota editorial, porque não há curadoria sobre ele.
 *
 * `CatalogItem` é a forma mínima que as duas sabem produzir, e é o que
 * grade, lista e diário consomem. Quem precisa dos campos editoriais pede
 * `Film`, que só existe para o arquivo.
 */

import type { Film, CatalogItem } from "./types";
import { getFilm } from "./data";
import { anoDe, getMovieStub, type ResultadoTmdb } from "./tmdb";

/* ---------------- slugs ---------------- */

const PREFIXO = "tmdb-";

export const slugDeTmdb = (tmdbId: number) => `${PREFIXO}${tmdbId}`;

/** Devolve o tmdb_id se o slug for do catálogo; null se for do arquivo. */
export function tmdbIdDeSlug(slug: string): number | null {
  if (!slug.startsWith(PREFIXO)) return null;
  const n = Number(slug.slice(PREFIXO.length));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/* ---------------- conversões ---------------- */

export function daArquivo(f: Film): CatalogItem {
  return {
    id: f.id,
    tmdbId: f.tmdbId,
    title: f.title,
    originalTitle: f.originalTitle,
    year: f.year,
    posterPath: f.posterPath,
    director: f.director,
    country: f.country,
    movementId: f.movementId,
    inArchive: true,
    archiveScore: f.archiveScore,
    voteAverage: null,
    voteCount: null,
  };
}

export function doTmdb(r: ResultadoTmdb): CatalogItem {
  return {
    id: slugDeTmdb(r.id),
    tmdbId: r.id,
    title: r.title || r.original_title,
    originalTitle: r.original_title || null,
    year: anoDe(r.release_date),
    posterPath: r.poster_path,
    director: null, // o discover não devolve crédito; só a ficha traz
    country: null,
    movementId: null,
    inArchive: false,
    archiveScore: null,
    voteAverage: r.vote_average,
    voteCount: r.vote_count,
  };
}

/**
 * Marca quais resultados do TMDb já estão no arquivo.
 *
 * Sem isto, o mesmo filme apareceria duas vezes para o usuário — uma na
 * busca do catálogo e outra no arquivo — como se fossem obras diferentes.
 * O item do arquivo ganha o slug editorial, então o link leva para a
 * ficha curada, não para o stub.
 */
export function cruzarComArquivo(
  itens: CatalogItem[],
  arquivo: Film[]
): CatalogItem[] {
  const porTmdb = new Map<number, Film>();
  for (const f of arquivo) if (f.tmdbId) porTmdb.set(f.tmdbId, f);

  return itens.map((item) => {
    const naCasa = item.tmdbId ? porTmdb.get(item.tmdbId) : undefined;
    return naCasa ? daArquivo(naCasa) : item;
  });
}

/* ---------------- resolução de ficha ---------------- */

export type FichaResolvida =
  | { tipo: "arquivo"; film: Film }
  | { tipo: "catalogo"; item: CatalogItem; tmdbId: number }
  | null;

/**
 * Resolve um slug de `/filmes/[slug]` para uma das duas populações.
 *
 * Um slug `tmdb-N` que já tenha sido promovido ao arquivo (porque você
 * catalogou a obra depois) resolve para a ficha curada: a URL antiga
 * continua funcionando e cai no lugar melhor.
 */
export async function resolverFicha(slug: string): Promise<FichaResolvida> {
  const doArquivo = await getFilm(slug);
  if (doArquivo) return { tipo: "arquivo", film: doArquivo };

  const tmdbId = tmdbIdDeSlug(slug);
  if (!tmdbId) return null;

  const stub = await getMovieStub(tmdbId);
  if (!stub) return null;

  return {
    tipo: "catalogo",
    tmdbId,
    item: doTmdb({
      id: stub.id,
      title: stub.title,
      original_title: stub.original_title,
      release_date: stub.release_date,
      poster_path: stub.poster_path,
      backdrop_path: stub.backdrop_path,
      overview: stub.overview,
      vote_average: stub.vote_average,
      vote_count: stub.vote_count,
      original_language: stub.original_language,
    }),
  };
}
