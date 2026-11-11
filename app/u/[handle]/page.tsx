import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Poster } from "@/components/Poster";
import { Stars } from "@/components/Stars";
import { getCurrentProfile } from "@/lib/auth";
import { catalogNumbers, getIndex } from "@/lib/data";
import { getDiary, getProfileByHandle, totalsFromDiary } from "@/lib/entries";
import { authDisponivel } from "@/lib/supabase/server";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const p = await getProfileByHandle(handle);
  if (!p) return { title: "Perfil não encontrado" };
  return {
    title: p.displayName,
    description: p.bio ?? `O diário de cinema de ${p.displayName}.`,
  };
}

function dataCurta(iso: string | null) {
  if (!iso) return "sem data";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PerfilPublico({ params }: Props) {
  const { handle } = await params;

  if (!authDisponivel) {
    return (
      <section className="opener">
        <div>
          <p className="rubric" style={{ marginBottom: 20 }}>
            Perfis
          </p>
          <h1 className="display d-1">Os perfis vivem no banco.</h1>
        </div>
        <div className="opener-meta">
          <p className="lede">
            Este ambiente roda no modo protótipo, lendo o acervo dos JSON em{" "}
            <code>data/</code>. Diário, notas e reviews exigem o Supabase
            conectado.
          </p>
          <div className="links" style={{ paddingTop: 16 }}>
            <Link href="/explorar">
              <i>Acervo</i>Ver as obras
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const perfil = await getProfileByHandle(handle);
  if (!perfil) notFound();

  const [diario, { byMovement, films }, eu] = await Promise.all([
    getDiary(perfil.id),
    getIndex(),
    getCurrentProfile(),
  ]);

  const totais = totalsFromDiary(diario);
  const cats = catalogNumbers(films);
  const souEu = eu?.id === perfil.id;

  const favoritos = diario.filter((e) => e.liked).slice(0, 6);

  return (
    <>
      <section className="opener">
        <div>
          <p className="rubric" style={{ marginBottom: 20 }}>
            Perfil · /u/{perfil.handle}
          </p>
          <h1 className="display d-1">{perfil.displayName}</h1>
          {perfil.bio && (
            <p className="lede" style={{ marginTop: 20 }}>
              {perfil.bio}
            </p>
          )}
        </div>

        <div className="opener-meta">
          {perfil.avatarUrl && (
            <Image
              src={perfil.avatarUrl}
              alt=""
              width={64}
              height={64}
              className="avatar-lg"
            />
          )}
          <dl className="ledger">
            <dt>Registrados</dt>
            <dd>{totais.logged}</dd>
            <dt>Com nota</dt>
            <dd>
              {totais.rated}
              {totais.avgRating !== null && (
                <span style={{ color: "var(--faint)" }}>
                  {" "}
                  · média {String(totais.avgRating).replace(".", ",")}
                </span>
              )}
            </dd>
            <dt>Reviews</dt>
            <dd>{totais.reviews}</dd>
            <dt>Favoritos</dt>
            <dd>{totais.likes}</dd>
          </dl>
          {souEu && (
            <p>
              <Link href="/conta" style={{ color: "var(--sepia)", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase" }}>
                Editar perfil →
              </Link>
            </p>
          )}
        </div>
      </section>

      {favoritos.length > 0 && (
        <section className="band">
          <div className="band-in">
            <div className="band-head">
              <p className="rubric">Favoritos</p>
              <span className="count">{totais.likes} marcados</span>
            </div>
            <div className="stack">
              <div className="grid">
                {favoritos.map((e) => (
                  <div key={e.id}>
                    <Poster
                      film={e.film}
                      movement={byMovement.get(e.film.movementId)}
                      cat={cats.get(e.film.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="band">
        <div className="band-in">
          <div className="band-head">
            <p className="rubric">Diário</p>
            <span className="count">
              {totais.logged === 0
                ? "vazio"
                : `${totais.logged} ${totais.logged === 1 ? "entrada" : "entradas"}`}
            </span>
          </div>

          <div className="stack">
            {diario.length === 0 ? (
              <p className="empty">
                {souEu
                  ? "Você ainda não registrou nada."
                  : "Este diário ainda está vazio."}
                <Link href="/explorar">Abrir o acervo</Link>
              </p>
            ) : (
              <div className="diary">
                {diario.map((e) => (
                  <article className="diary-row" key={e.id}>
                    <Link href={`/filmes/${e.film.id}`} className="diary-poster">
                      <Poster
                        film={e.film}
                        movement={byMovement.get(e.film.movementId)}
                        cat={cats.get(e.film.id)}
                        sizes="72px"
                      />
                    </Link>

                    <div className="diary-main">
                      <h3>
                        <Link href={`/filmes/${e.film.id}`}>{e.film.title}</Link>
                        <span className="yr">{e.film.year}</span>
                      </h3>

                      <div className="diary-meta">
                        <span>{dataCurta(e.watchedOn)}</span>
                        {e.watchCount > 1 && <span>{e.watchCount}ª vez</span>}
                        {e.rating !== null && <Stars value={e.rating} />}
                        {e.liked && <span className="heart">favorito</span>}
                      </div>

                      {e.review && (
                        <p className={e.hasSpoilers ? "diary-review spoiler" : "diary-review"}>
                          {e.hasSpoilers && (
                            <span className="spoiler-tag">contém spoilers</span>
                          )}
                          {e.review}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
