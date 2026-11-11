import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogForm } from "@/components/LogForm";
import { Poster } from "@/components/Poster";
import { ReviewList } from "@/components/ReviewList";
import { SourceBanner } from "@/components/SourceBanner";
import { authDisponivel, getCurrentProfile } from "@/lib/auth";
import { resolverFicha } from "@/lib/catalog";
import {
  catalogNumbers,
  getFilmStats,
  getFilms,
  getIndex,
  getMovement,
} from "@/lib/data";
import { getFilmReviews, getMyEntry } from "@/lib/entries";
import { getMovie, POSTER } from "@/lib/tmdb";
import type { CatalogItem, Film } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

/** Só as obras do arquivo são pré-renderizadas: o catálogo é sob demanda. */
export async function generateStaticParams() {
  const films = await getFilms();
  return films.map((f) => ({ slug: f.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await resolverFicha(slug);
  if (!r) return { title: "Obra não encontrada" };

  if (r.tipo === "arquivo") {
    return {
      title: `${r.film.title} (${r.film.year})`,
      description: r.film.synopsis,
    };
  }
  return {
    title: `${r.item.title}${r.item.year ? ` (${r.item.year})` : ""}`,
    description: `Ficha do TMDb. Não catalogado no arquivo.`,
  };
}

function duracao(min: number | null) {
  if (!min) return "—";
  return min >= 60
    ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}min`
    : `${min}min`;
}

export default async function Ficha({ params }: Props) {
  const { slug } = await params;
  const resolvida = await resolverFicha(slug);
  if (!resolvida) notFound();

  return resolvida.tipo === "arquivo" ? (
    <FichaArquivo film={resolvida.film} />
  ) : (
    <FichaCatalogo item={resolvida.item} tmdbId={resolvida.tmdbId} />
  );
}

/* ============================================================
   FICHA DO ARQUIVO — curadoria completa
   ============================================================ */

async function FichaArquivo({ film }: { film: Film }) {
  const [movement, { films }, stats, perfil, minhaEntrada, reviews] =
    await Promise.all([
      getMovement(film.movementId),
      getIndex(),
      getFilmStats(film.id),
      getCurrentProfile(),
      getMyEntry(film.id),
      getFilmReviews(film.id),
    ]);

  // Enriquecimento: se o TMDb cair, a ficha curada continua inteira.
  const tmdb = film.tmdbId ? await getMovie(film.tmdbId) : null;

  const cats = catalogNumbers(films);
  const mesmoDiretor = films
    .filter((f) => f.director === film.director && f.id !== film.id)
    .slice(0, 3);

  // Sem este descarte, obra do mesmo diretor na mesma corrente apareceria
  // nas duas listas, repetindo o título.
  const jaListados = new Set([film.id, ...mesmoDiretor.map((f) => f.id)]);
  const mesmaEscola = films
    .filter((f) => f.movementId === film.movementId && !jaListados.has(f.id))
    .sort((a, b) => (b.historicalRelevance ?? 0) - (a.historicalRelevance ?? 0))
    .slice(0, 3);

  return (
    <>
      <nav className="crumb" aria-label="Trilha">
        <Link href="/explorar">Arquivo</Link>
        <em>/</em>
        {movement && (
          <>
            <Link href={`/escolas/${movement.id}`}>{movement.name}</Link>
            <em>/</em>
          </>
        )}
        <span>Catálogo {cats.get(film.id)}</span>
      </nav>

      <div className="sheet-body">
        <div className="poster-col">
          <Poster
            film={film}
            movement={movement ?? undefined}
            cat={cats.get(film.id)}
            runtime={film.runtime}
            size={POSTER.ficha}
            sizes="(max-width: 820px) 60vw, 288px"
            priority
          />
          {film.archival && (
            <p className="poster-note">Acervo de preservação</p>
          )}
        </div>

        <div className="sheet-main">
          <div>
            <h1>{film.title}</h1>
            {film.originalTitle !== film.title && (
              <p className="orig-t">{film.originalTitle}</p>
            )}
          </div>

          <dl className="tech">
            <div>
              <dt>Direção</dt>
              <dd>{film.director}</dd>
            </div>
            <div>
              <dt>Ano</dt>
              <dd>{film.year}</dd>
            </div>
            <div>
              <dt>País</dt>
              <dd>{film.country}</dd>
            </div>
            <div>
              <dt>Duração</dt>
              <dd>{duracao(film.runtime ?? tmdb?.runtime ?? null)}</dd>
            </div>
            <div>
              <dt>Escola</dt>
              <dd>
                {movement ? (
                  <Link href={`/escolas/${movement.id}`}>{movement.name}</Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>

          <p className="synopsis">{film.synopsis}</p>

          <Notas
            archiveScore={film.archiveScore}
            relevance={film.historicalRelevance}
            comunidade={stats}
            tmdb={tmdb}
          />

          <SourceBanner />

          <Elenco tmdb={tmdb} />

          <OndeAssistir tmdb={tmdb} archival={film.archival} />

          <Log
            filmId={film.id}
            filmTitle={film.title}
            entry={minhaEntrada}
            logado={Boolean(perfil)}
          />

          <ReviewList
            entries={reviews.filter((r) => r.profileId !== perfil?.id)}
          />

          <div className="links">
            {movement && (
              <Link href={`/escolas/${movement.id}`}>
                <i>Escola</i>
                Explorar {movement.name}
              </Link>
            )}
            {mesmoDiretor.map((f, i) => (
              <Link key={f.id} href={`/filmes/${f.id}`}>
                <i>{i === 0 ? `De ${film.director}` : " "}</i>
                {f.title}
                <span className="yr">{f.year}</span>
              </Link>
            ))}
            {mesmaEscola.map((f, i) => (
              <Link key={f.id} href={`/filmes/${f.id}`}>
                <i>{i === 0 ? "Na mesma corrente" : " "}</i>
                {f.title}
                <span className="yr">{f.year}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================================================
   FICHA DO CATÁLOGO — TMDb, sem curadoria
   ============================================================ */

async function FichaCatalogo({
  item,
  tmdbId,
}: {
  item: CatalogItem;
  tmdbId: number;
}) {
  const [tmdb, stats, perfil, minhaEntrada, reviews] = await Promise.all([
    getMovie(tmdbId),
    getFilmStats(item.id),
    getCurrentProfile(),
    getMyEntry(item.id),
    getFilmReviews(item.id),
  ]);

  return (
    <>
      <nav className="crumb" aria-label="Trilha">
        <Link href="/explorar?scope=tmdb">Catálogo TMDb</Link>
        <em>/</em>
        <span>Não catalogado</span>
      </nav>

      <div className="sheet-body">
        <div className="poster-col">
          <Poster
            film={item}
            size={POSTER.ficha}
            sizes="(max-width: 820px) 60vw, 288px"
            runtime={tmdb?.runtime ?? null}
            priority
          />
        </div>

        <div className="sheet-main">
          <div>
            <h1>{item.title}</h1>
            {item.originalTitle && item.originalTitle !== item.title && (
              <p className="orig-t">{item.originalTitle}</p>
            )}
          </div>

          <div className="banner" style={{ padding: 0 }}>
            <div>
              <strong>Fora do arquivo</strong>
              <span>
                Este filme vem do catálogo do TMDb e não passou pela curadoria:
                não tem escola, nota de arquivo nem sinopse escrita. Você pode
                registrá-lo e resenhá-lo como qualquer outro.
              </span>
            </div>
          </div>

          <dl className="tech">
            <div>
              <dt>Ano</dt>
              <dd>{item.year ?? "—"}</dd>
            </div>
            <div>
              <dt>Duração</dt>
              <dd>{duracao(tmdb?.runtime ?? null)}</dd>
            </div>
            <div>
              <dt>Idioma original</dt>
              <dd>{tmdb?.original_language?.toUpperCase() ?? "—"}</dd>
            </div>
            <div>
              <dt>Escola</dt>
              <dd>—</dd>
            </div>
          </dl>

          {tmdb?.overview && <p className="synopsis">{tmdb.overview}</p>}

          <Notas
            archiveScore={null}
            relevance={null}
            comunidade={stats}
            tmdb={tmdb}
          />

          <SourceBanner />

          <Elenco tmdb={tmdb} />

          <OndeAssistir tmdb={tmdb} archival={false} />

          <Log
            filmId={item.id}
            filmTitle={item.title}
            entry={minhaEntrada}
            logado={Boolean(perfil)}
          />

          <ReviewList
            entries={reviews.filter((r) => r.profileId !== perfil?.id)}
          />
        </div>
      </div>
    </>
  );
}

/* ============================================================
   blocos compartilhados
   ============================================================ */

type Stats = Awaited<ReturnType<typeof getFilmStats>>;
type Tmdb = Awaited<ReturnType<typeof getMovie>>;

/**
 * As notas, lado a lado e rotuladas.
 *
 * Três escalas diferentes convivem aqui e nunca se somam: 0–100 editorial,
 * 0–5 dos leitores da casa, 0–10 do TMDb. Misturá-las é exatamente o que
 * transformaria o arquivo num agregador.
 */
function Notas({
  archiveScore,
  relevance,
  comunidade,
  tmdb,
}: {
  archiveScore: number | null;
  relevance: number | null;
  comunidade: Stats;
  tmdb: Tmdb;
}) {
  const temEditorial = archiveScore !== null || relevance !== null;
  const temComunidade = comunidade && comunidade.ratingCount > 0;
  const temTmdb = tmdb?.vote_average && (tmdb.vote_count ?? 0) >= 10;

  if (!temEditorial && !temComunidade && !temTmdb) return null;

  return (
    <div className="scores">
      {temEditorial && (
        <>
          <div>
            <span className="n">
              {archiveScore ?? "—"}
              <sup>/100</sup>
            </span>
            <span className="k">Nota do arquivo</span>
          </div>
          <div>
            <span className="n">
              {relevance ?? "—"}
              <sup>/100</sup>
            </span>
            <span className="k">Relevância histórica</span>
          </div>
        </>
      )}
      {temComunidade && (
        <div>
          <span className="n">
            {comunidade.ratingAvg}
            <sup>/5</sup>
          </span>
          <span className="k">
            {comunidade.ratingCount} nota
            {comunidade.ratingCount === 1 ? "" : "s"} de leitores
          </span>
        </div>
      )}
      {temTmdb && (
        <div>
          <span className="n">
            {tmdb!.vote_average!.toFixed(1)}
            <sup>/10</sup>
          </span>
          <span className="k">
            TMDb · {(tmdb!.vote_count ?? 0).toLocaleString("pt-BR")} votos
          </span>
        </div>
      )}
    </div>
  );
}

function Elenco({ tmdb }: { tmdb: Tmdb }) {
  if (!tmdb || tmdb.cast.length === 0) return null;
  return (
    <div>
      <p className="block-t">Elenco</p>
      <ul className="cast">
        {tmdb.cast.map((c) => (
          <li key={c.name}>
            {c.name}
            {c.character && <span> · {c.character}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OndeAssistir({ tmdb, archival }: { tmdb: Tmdb; archival: boolean }) {
  const streaming = tmdb?.providers.flatrate ?? [];
  const aluguel = tmdb?.providers.rent ?? [];

  return (
    <div>
      <p className="block-t">Onde assistir</p>
      <div className="where">
        {streaming.length > 0 || aluguel.length > 0 ? (
          <>
            {streaming.map((p) => (
              <span key={`f-${p.provider_name}`}>{p.provider_name}</span>
            ))}
            {aluguel.map((p) => (
              <span key={`r-${p.provider_name}`}>
                {p.provider_name} · aluguel
              </span>
            ))}
          </>
        ) : archival ? (
          <span className="archive">
            Acervo de preservação ou domínio público
          </span>
        ) : (
          <span className="none">
            {tmdb
              ? "Sem oferta de streaming no Brasil hoje."
              : "Disponibilidade vem do TMDb — não consultada neste modo."}
          </span>
        )}
      </div>
    </div>
  );
}

/** Três estados honestos: sem banco, sem sessão, e o formulário. */
function Log({
  filmId,
  filmTitle,
  entry,
  logado,
}: {
  filmId: string;
  filmTitle: string;
  entry: Awaited<ReturnType<typeof getMyEntry>>;
  logado: boolean;
}) {
  if (!authDisponivel) {
    return (
      <section className="logbox">
        <p className="block-t" style={{ marginBottom: 8 }}>
          Seu registro
        </p>
        <p className="body-s">
          Marcar como visto, nota em meias estrelas e review existem e estão
          prontos — mas gravam no Postgres, então precisam do Supabase
          conectado. Com <code>.env.local</code> preenchido, o formulário
          aparece aqui.
        </p>
      </section>
    );
  }

  if (!logado) {
    return (
      <section className="logbox">
        <p className="block-t" style={{ marginBottom: 8 }}>
          Seu registro
        </p>
        <p className="body-s" style={{ marginBottom: 14 }}>
          Entre para marcar como visto, dar nota em meias estrelas e escrever
          uma review desta obra.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/filmes/${filmId}`)}`}
          className="btn"
        >
          Entrar
        </Link>
      </section>
    );
  }

  return <LogForm filmId={filmId} filmTitle={filmTitle} entry={entry} />;
}
