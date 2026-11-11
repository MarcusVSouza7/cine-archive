import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogForm } from "@/components/LogForm";
import { Poster } from "@/components/Poster";
import { ReviewList } from "@/components/ReviewList";
import { SourceBanner } from "@/components/SourceBanner";
import { authDisponivel, getCurrentProfile } from "@/lib/auth";
import {
  catalogNumbers,
  getFilm,
  getFilms,
  getFilmStats,
  getIndex,
  getMovement,
} from "@/lib/data";
import { getFilmReviews, getMyEntry } from "@/lib/entries";
import { getMovie, POSTER } from "@/lib/tmdb";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const films = await getFilms();
  return films.map((f) => ({ slug: f.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFilm(slug);
  if (!f) return { title: "Obra não encontrada" };
  return {
    title: `${f.title} (${f.year})`,
    description: f.synopsis,
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
  const film = await getFilm(slug);
  if (!film) notFound();

  const [movement, { films }, stats, perfil, minhaEntrada, reviews] =
    await Promise.all([
      getMovement(film.movementId),
      getIndex(),
      getFilmStats(film.id),
      getCurrentProfile(),
      getMyEntry(film.id),
      getFilmReviews(film.id),
    ]);

  // Enriquecimento: se o TMDb cair ou não estiver configurado, a ficha
  // curada continua inteira. Nunca é fonte de verdade.
  const tmdb = film.tmdbId ? await getMovie(film.tmdbId) : null;

  const cats = catalogNumbers(films);
  const mesmoDiretor = films
    .filter((f) => f.director === film.director && f.id !== film.id)
    .slice(0, 3);

  // Sem este descarte, uma obra do mesmo diretor dentro da mesma corrente
  // aparece nas duas listas — e as conexões repetem o mesmo título.
  const jaListados = new Set([film.id, ...mesmoDiretor.map((f) => f.id)]);
  const mesmaEscola = films
    .filter((f) => f.movementId === film.movementId && !jaListados.has(f.id))
    .sort(
      (a, b) => (b.historicalRelevance ?? 0) - (a.historicalRelevance ?? 0)
    )
    .slice(0, 3);

  const streaming = tmdb?.providers.flatrate ?? [];
  const aluguel = tmdb?.providers.rent ?? [];

  return (
    <>
      <nav className="crumb" aria-label="Trilha">
        <Link href="/explorar">Filmes</Link>
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
            size={POSTER.ficha}
            sizes="(max-width: 820px) 60vw, 288px"
            priority
          />
          {film.archival && (
            <p
              style={{
                margin: 0,
                fontSize: 10,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--sepia)",
              }}
            >
              Acervo de preservação
            </p>
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

          <div className="scores">
            <div>
              <span className="n">
                {film.archiveScore ?? "—"}
                <sup>/100</sup>
              </span>
              <span className="k">Nota do arquivo</span>
            </div>
            <div>
              <span className="n">
                {film.historicalRelevance ?? "—"}
                <sup>/100</sup>
              </span>
              <span className="k">Relevância histórica</span>
            </div>
            {/* A média da comunidade só aparece quando existe comunidade:
                zero leria como "ninguém gostou". */}
            {stats && stats.ratingCount > 0 && (
              <div>
                <span className="n">
                  {stats.ratingAvg}
                  <sup>/5</sup>
                </span>
                <span className="k">
                  {stats.ratingCount} nota
                  {stats.ratingCount === 1 ? "" : "s"} de leitores
                </span>
              </div>
            )}
          </div>

          <SourceBanner />

          {tmdb && tmdb.cast.length > 0 && (
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
          )}

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
              ) : film.archival ? (
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

          {/* Log do usuário. Três estados honestos: sem banco, sem
              sessão, e o formulário de verdade. O primeiro aparece em vez
              de sumir: seção invisível é indistinguível de não construída. */}
          {!authDisponivel ? (
            <section className="logbox">
              <p className="block-t" style={{ marginBottom: 8 }}>
                Seu registro
              </p>
              <p className="body-s">
                Marcar como visto, nota em meias estrelas e review existem e
                estão prontos — mas gravam no Postgres, então precisam do
                Supabase conectado. Com <code>.env.local</code> preenchido, o
                formulário aparece aqui.
              </p>
            </section>
          ) : perfil ? (
            <LogForm
              filmId={film.id}
              filmTitle={film.title}
              entry={minhaEntrada}
            />
          ) : (
            <section className="logbox">
              <p className="block-t" style={{ marginBottom: 8 }}>
                Seu registro
              </p>
              <p className="body-s" style={{ marginBottom: 14 }}>
                Entre para marcar como visto, dar nota em meias estrelas e
                escrever uma review desta obra.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(`/filmes/${film.id}`)}`}
                className="btn"
              >
                Entrar
              </Link>
            </section>
          )}

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
