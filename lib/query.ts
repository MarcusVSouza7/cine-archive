/**
 * Filtro, ordenação e agrupamento do explorador.
 *
 * Puro: recebe o acervo e os parâmetros da URL, devolve o que renderizar.
 * Sem acesso a dados e sem React, para poder ser testado sozinho e para
 * sobreviver à troca do JSON local pelo Postgres.
 */

import { decadeOf } from "./data";
import {
  isModeKey,
  isSortKey,
  type Film,
  type ModeKey,
  type Query,
  type SortKey,
  type ViewKey,
} from "./types";

type Entrada = Record<string, string | string[] | undefined>;

const umSo = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

/** Lê a URL com tolerância: valor inválido cai no padrão, nunca quebra. */
export function parseQuery(sp: Entrada): Query {
  const sort = umSo(sp.sort);
  const mode = umSo(sp.mode);
  const view = umSo(sp.view);
  const decade = umSo(sp.decade);

  return {
    country: umSo(sp.country),
    decade: /^\d{4}$/.test(decade) ? decade : "",
    movement: umSo(sp.movement),
    sort: isSortKey(sort) ? (sort as SortKey) : "rating",
    mode: isModeKey(mode) ? (mode as ModeKey) : "browse",
    view: view === "list" ? ("list" as ViewKey) : ("grid" as ViewKey),
  };
}

export function applyFilters(films: Film[], q: Query): Film[] {
  return films.filter((f) => {
    if (q.country && f.country !== q.country) return false;
    if (q.decade && decadeOf(f.year) !== Number(q.decade)) return false;
    if (q.movement && f.movementId !== q.movement) return false;
    return true;
  });
}

export function applySort(films: Film[], sort: SortKey): Film[] {
  const l = [...films];
  switch (sort) {
    case "rating":
      return l.sort(
        (a, b) =>
          (b.archiveScore ?? -1) - (a.archiveScore ?? -1) || a.year - b.year
      );
    case "relevance":
      return l.sort(
        (a, b) =>
          (b.historicalRelevance ?? -1) - (a.historicalRelevance ?? -1) ||
          a.year - b.year
      );
    case "year-desc":
      return l.sort((a, b) => b.year - a.year);
    case "year-asc":
      return l.sort((a, b) => a.year - b.year);
    case "title":
      return l.sort((a, b) => a.title.localeCompare(b.title, "pt"));
  }
}

export type Grupo = { chave: string; rotulo: string; total: number; top: Film[] };

/**
 * Rankings agrupados: top 5 por década ou por país, respeitando os
 * filtros ativos. A numeração 1–5 é ordinal de verdade — é o que
 * justifica usar número no marcador.
 */
export function groupRankings(
  films: Film[],
  por: "decade" | "country",
  limite = 5
): Grupo[] {
  const mapa = new Map<string, Film[]>();

  for (const f of films) {
    const chave = por === "decade" ? String(decadeOf(f.year)) : f.country;
    const lista = mapa.get(chave);
    if (lista) lista.push(f);
    else mapa.set(chave, [f]);
  }

  const chaves = [...mapa.keys()].sort((a, b) =>
    por === "decade" ? Number(a) - Number(b) : a.localeCompare(b, "pt")
  );

  return chaves.map((chave) => {
    const todos = mapa.get(chave)!;
    return {
      chave,
      rotulo: por === "decade" ? `Anos ${chave}` : chave,
      total: todos.length,
      top: [...todos]
        .sort(
          (a, b) =>
            (b.archiveScore ?? -1) - (a.archiveScore ?? -1) || a.year - b.year
        )
        .slice(0, limite),
    };
  });
}

export function plural(n: number, um: string, muitos: string) {
  return `${n} ${n === 1 ? um : muitos}`;
}
