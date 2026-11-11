import type { Metadata } from "next";
import Link from "next/link";
import { Filters, type Opcao } from "@/components/Filters";
import { FilmCard, FilmRow, RankRow } from "@/components/Poster";
import { SourceBanner } from "@/components/SourceBanner";
import { cruzarComArquivo, doTmdb } from "@/lib/catalog";
import { catalogNumbers, getIndex } from "@/lib/data";
import {
  applyFilters,
  applySort,
  groupRankings,
  parseQuery,
  plural,
} from "@/lib/query";
import {
  decadasTmdb,
  discoverMovies,
  isOrdemTmdb,
  ORDENS_TMDB,
  PAISES_TMDB,
  tmdbConfigurado,
} from "@/lib/tmdb";
import { isScopeKey, MODES, SORTS, type ScopeKey } from "@/lib/types";

export const metadata: Metadata = {
  title: "Explorar",
  description:
    "O acervo curado por país, década e escola — ou o catálogo inteiro do TMDb.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const um = (v: string | string[] | undefined) =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

export default async function Explorar({ searchParams }: Props) {
  const sp = await searchParams;
  const bruto = um(sp.scope);
  const scope: ScopeKey = isScopeKey(bruto) ? bruto : "archive";

  return scope === "tmdb" ? (
    <Catalogo sp={sp} />
  ) : (
    <Arquivo sp={sp} />
  );
}

/* ============================================================
   ESCOPO 1 — O ARQUIVO
   Curadoria própria: escolas, nota editorial, rankings agrupados.
   ============================================================ */

async function Arquivo({
  sp,
}: {
  sp: Record<string, string | string[] | undefined>;
}) {
  const q = parseQuery(sp);
  const { films, movements, byMovement, countries, decades } = await getIndex();
  const cats = catalogNumbers(films);

  const filtrados = applyFilters(films, q);
  const lista = applySort(filtrados, q.sort);

  return (
    <section className="band" style={{ borderTop: 0 }}>
      <div className="band-in">
        <div className="band-head">
          <p className="rubric">Explorar</p>
          <span className="count">
            {plural(filtrados.length, "obra", "obras")}
          </span>
        </div>

        <div className="stack">
          <h1 className="display d-2">
            {q.mode === "browse" ? "O Arquivo" : MODES[q.mode]}
          </h1>
          <p className="lede">
            {q.mode === "browse"
              ? "As obras catalogadas, com escola, nota de arquivo e sinopse escrita. Para qualquer filme fora desta lista, troque para o catálogo do TMDb."
              : "As cinco melhores notas do arquivo dentro de cada grupo, respeitando os filtros ativos."}
          </p>

          <SourceBanner />

          <Filters
            scope="archive"
            countries={countries.map<Opcao>((c) => ({ value: c, label: c }))}
            decades={decades.map<Opcao>((d) => ({
              value: String(d),
              label: `Anos ${d}`,
            }))}
            movements={movements.map<Opcao>((m) => ({
              value: m.id,
              label: m.name,
            }))}
            sorts={SORTS}
            modes={MODES}
          />

          {filtrados.length === 0 ? (
            <p className="empty">
              Nenhuma obra do arquivo responde a esses filtros.
              <Link href="/explorar?scope=tmdb">Procurar no catálogo TMDb</Link>
            </p>
          ) : q.mode !== "browse" ? (
            groupRankings(
              filtrados,
              q.mode === "decade" ? "decade" : "country"
            ).map((g) => (
              <section className="rank-group" key={g.chave}>
                <div className="rank-head">
                  <span className="t">{g.rotulo}</span>
                  <span className="s">
                    {plural(g.total, "obra", "obras")} no acervo
                  </span>
                </div>
                <div className="rank-list">
                  {g.top.map((f, i) => (
                    <RankRow
                      key={f.id}
                      film={f}
                      movement={byMovement.get(f.movementId)}
                      position={i + 1}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : q.view === "list" ? (
            <div className="ed-list">
              {lista.map((f, i) => (
                <FilmRow
                  key={f.id}
                  film={f}
                  movement={byMovement.get(f.movementId)}
                  index={i}
                  synopsis={f.synopsis}
                />
              ))}
            </div>
          ) : (
            <div className="grid">
              {lista.map((f, i) => (
                <FilmCard
                  key={f.id}
                  film={f}
                  movement={byMovement.get(f.movementId)}
                  cat={cats.get(f.id)}
                  runtime={f.runtime}
                  priority={i < 6}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   ESCOPO 2 — O CATÁLOGO DO TMDb
   Mais de um milhão de títulos, consultados ao vivo. Nada é
   importado: os termos do TMDb proíbem replicar a base deles.
   ============================================================ */

async function Catalogo({
  sp,
}: {
  sp: Record<string, string | string[] | undefined>;
}) {
  const country = um(sp.country);
  const decade = um(sp.decade);
  const sortBruto = um(sp.sort);
  const sort = isOrdemTmdb(sortBruto) ? sortBruto : "popularity";
  const view = um(sp.view) === "list" ? "list" : "grid";
  const page = Math.max(1, Number(um(sp.page)) || 1);

  const { films, byMovement } = await getIndex();

  const pagina = await discoverMovies({ country, decade, sort, page });

  // Cruza com o arquivo: o mesmo filme não deve aparecer como duas obras
  // diferentes, e quem já está catalogado leva para a ficha curada.
  const itens = cruzarComArquivo(pagina.itens.map(doTmdb), films);

  const base = new URLSearchParams();
  base.set("scope", "tmdb");
  if (country) base.set("country", country);
  if (decade) base.set("decade", decade);
  if (sort !== "popularity") base.set("sort", sort);
  if (view === "list") base.set("view", "list");
  const linkPagina = (p: number) => {
    const q = new URLSearchParams(base);
    if (p > 1) q.set("page", String(p));
    return `/explorar?${q.toString()}`;
  };

  return (
    <section className="band" style={{ borderTop: 0 }}>
      <div className="band-in">
        <div className="band-head">
          <p className="rubric">Catálogo</p>
          <span className="count">
            {pagina.totalResultados > 0
              ? `${pagina.totalResultados.toLocaleString("pt-BR")} títulos`
              : "—"}
          </span>
        </div>

        <div className="stack">
          <h1 className="display d-2">Catálogo TMDb</h1>
          <p className="lede">
            O acervo inteiro do TMDb, consultado ao vivo. Sem escola e sem nota
            de arquivo — isso é curadoria, e curadoria mora no{" "}
            <Link href="/explorar" style={{ color: "var(--sepia)" }}>
              Arquivo
            </Link>
            . Aqui você acha e registra qualquer filme.
          </p>

          <SourceBanner />

          <Filters
            scope="tmdb"
            countries={PAISES_TMDB.map<Opcao>((p) => ({
              value: p.iso,
              label: p.nome,
            }))}
            decades={decadasTmdb().map<Opcao>((d) => ({
              value: String(d),
              label: `Anos ${d}`,
            }))}
            sorts={ORDENS_TMDB}
          />

          {!tmdbConfigurado ? (
            <p className="empty">
              O catálogo precisa do token do TMDb.
              <Link href="/explorar">Voltar ao Arquivo</Link>
            </p>
          ) : itens.length === 0 ? (
            <p className="empty">
              Nada no TMDb responde a esses filtros.
              <Link href="/explorar?scope=tmdb">Limpar filtros</Link>
            </p>
          ) : (
            <>
              {view === "list" ? (
                <div className="ed-list">
                  {itens.map((f, i) => (
                    <FilmRow
                      key={f.id}
                      film={f}
                      movement={
                        f.movementId ? byMovement.get(f.movementId) : undefined
                      }
                      index={(page - 1) * 20 + i}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid">
                  {itens.map((f, i) => (
                    <FilmCard
                      key={f.id}
                      film={f}
                      movement={
                        f.movementId ? byMovement.get(f.movementId) : undefined
                      }
                      priority={i < 6}
                    />
                  ))}
                </div>
              )}

              <nav className="pager" aria-label="Paginação">
                {page > 1 ? (
                  <Link href={linkPagina(page - 1)}>← Anterior</Link>
                ) : (
                  <span />
                )}
                <span className="pager-pos">
                  Página {page.toLocaleString("pt-BR")} de{" "}
                  {pagina.totalPaginas.toLocaleString("pt-BR")}
                </span>
                {page < pagina.totalPaginas ? (
                  <Link href={linkPagina(page + 1)}>Próxima →</Link>
                ) : (
                  <span />
                )}
              </nav>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
