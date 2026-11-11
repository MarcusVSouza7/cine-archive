import type { Metadata } from "next";
import Link from "next/link";
import { FilmCard } from "@/components/Poster";
import { SourceBanner } from "@/components/SourceBanner";
import { cruzarComArquivo, daArquivo, doTmdb } from "@/lib/catalog";
import { catalogNumbers, getIndex } from "@/lib/data";
import { plural } from "@/lib/query";
import { searchCatalog, tmdbConfigurado } from "@/lib/tmdb";

export const metadata: Metadata = {
  title: "Buscar",
  description:
    "Procure no acervo curado e no catálogo inteiro do TMDb ao mesmo tempo.",
};

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

/** Normaliza para comparar título sem acento e sem pontuação. */
function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function Buscar({ searchParams }: Props) {
  const { q: bruto, page: pageBruto } = await searchParams;
  const q = (bruto ?? "").trim();
  const page = Math.max(1, Number(pageBruto) || 1);

  const { films, movements, byMovement } = await getIndex();
  const cats = catalogNumbers(films);

  /* O arquivo é pequeno e já está em memória: busca local, sem ida ao
     banco nem à API. Diretor e escola entram no índice porque "Glauber"
     e "Nouvelle Vague" são buscas que alguém realmente faz aqui. */
  const alvo = normalizar(q);
  const noArquivo = q
    ? films.filter((f) => {
        const escola = byMovement.get(f.movementId)?.name ?? "";
        return normalizar(
          `${f.title} ${f.originalTitle} ${f.director} ${f.country} ${escola}`
        ).includes(alvo);
      })
    : [];

  const tmdb = q ? await searchCatalog(q, page) : null;

  // Tira do catálogo o que o arquivo já mostrou acima: o mesmo filme em
  // duas seções da mesma página de resultados é ruído, não cobertura.
  const idsDoArquivo = new Set(noArquivo.map((f) => f.tmdbId).filter(Boolean));
  const noCatalogo = tmdb
    ? cruzarComArquivo(doTmdbLista(tmdb.itens), films).filter(
        (i) => !(i.tmdbId && idsDoArquivo.has(i.tmdbId))
      )
    : [];

  const linkPagina = (p: number) =>
    `/buscar?q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <>
      <section className="opener" style={{ paddingBottom: 0 }}>
        <div>
          <p className="rubric" style={{ marginBottom: 20 }}>
            Buscar
          </p>
          <h1 className="display d-2">
            {q ? <>Resultados para “{q}”</> : <>O que você procura?</>}
          </h1>
        </div>
        <div className="opener-meta">
          {/* GET puro: o resultado é um link compartilhável e a busca
              funciona sem JavaScript. */}
          <form action="/buscar" method="get" className="busca-form" role="search">
            <label htmlFor="q" className="sr">
              Título, diretor ou escola
            </label>
            <input
              id="q"
              name="q"
              type="search"
              className="inp"
              defaultValue={q}
              placeholder="Título, diretor ou escola"
              autoComplete="off"
              spellCheck={false}
              autoFocus={!q}
            />
            <button type="submit" className="btn">
              Buscar
            </button>
          </form>
          <p className="body-s">
            Procura no acervo curado e no catálogo inteiro do TMDb. O arquivo
            vem primeiro, com escola e nota; o resto vem do TMDb.
          </p>
        </div>
      </section>

      <div className="band" style={{ borderTop: 0 }}>
        <div className="band-in">
          <div className="band-head">
            <p className="rubric">No arquivo</p>
            <span className="count">
              {q ? plural(noArquivo.length, "obra", "obras") : "—"}
            </span>
          </div>
          <div className="stack">
            <SourceBanner />
            {!q ? (
              <p className="body-s">
                Digite algo acima. Ou abra o{" "}
                <Link href="/explorar" style={{ color: "var(--sepia)" }}>
                  Arquivo
                </Link>{" "}
                e navegue por escola, país e década.
              </p>
            ) : noArquivo.length === 0 ? (
              <p className="body-s">
                Nada no acervo curado com esse nome. Veja o catálogo abaixo.
              </p>
            ) : (
              <div className="grid">
                {noArquivo.map((f, i) => (
                  <FilmCard
                    key={f.id}
                    film={daArquivo(f)}
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
      </div>

      {q && (
        <div className="band">
          <div className="band-in">
            <div className="band-head">
              <p className="rubric">No catálogo TMDb</p>
              <span className="count">
                {tmdb && tmdb.totalResultados > 0
                  ? `${tmdb.totalResultados.toLocaleString("pt-BR")} títulos`
                  : "—"}
              </span>
            </div>
            <div className="stack">
              {!tmdbConfigurado ? (
                <p className="body-s">
                  A busca no catálogo precisa do token do TMDb em{" "}
                  <code>.env.local</code>. O acervo curado acima funciona sem
                  ele.
                </p>
              ) : noCatalogo.length === 0 ? (
                <p className="body-s">Nenhum outro título no TMDb.</p>
              ) : (
                <>
                  <div className="grid">
                    {noCatalogo.map((f) => (
                      <FilmCard
                        key={f.id}
                        film={f}
                        movement={
                          f.movementId
                            ? byMovement.get(f.movementId)
                            : undefined
                        }
                      />
                    ))}
                  </div>

                  {tmdb && tmdb.totalPaginas > 1 && (
                    <nav className="pager" aria-label="Paginação">
                      {page > 1 ? (
                        <Link href={linkPagina(page - 1)}>← Anterior</Link>
                      ) : (
                        <span />
                      )}
                      <span className="pager-pos">
                        Página {page} de{" "}
                        {tmdb.totalPaginas.toLocaleString("pt-BR")}
                      </span>
                      {page < tmdb.totalPaginas ? (
                        <Link href={linkPagina(page + 1)}>Próxima →</Link>
                      ) : (
                        <span />
                      )}
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {movements.length > 0 && !q && (
        <div className="band">
          <div className="band-in">
            <div className="band-head">
              <p className="rubric">Ou por escola</p>
              <span className="count">
                {plural(movements.length, "corrente", "correntes")}
              </span>
            </div>
            <div className="stack">
              <div className="links" style={{ borderTop: 0, paddingTop: 0 }}>
                {movements.map((m) => (
                  <Link key={m.id} href={`/escolas/${m.id}`}>
                    <i>{m.region}</i>
                    {m.name}
                    <span className="yr">{m.years}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Pequeno adaptador para manter a página legível. */
function doTmdbLista(itens: Parameters<typeof doTmdb>[0][]) {
  return itens.map(doTmdb);
}
