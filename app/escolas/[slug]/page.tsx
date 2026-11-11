import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FilmCard } from "@/components/Poster";
import { catalogNumbers, getIndex, getMovement, getMovements } from "@/lib/data";
import { applySort, plural } from "@/lib/query";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const movements = await getMovements();
  return movements.map((m) => ({ slug: m.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = await getMovement(slug);
  if (!m) return { title: "Escola não encontrada" };
  return {
    title: m.name,
    description: `${m.name} (${m.region}, ${m.years}). ${m.abstract.slice(0, 150)}…`,
  };
}

export default async function Escola({ params }: Props) {
  const { slug } = await params;
  const movement = await getMovement(slug);
  if (!movement) notFound();

  const { films } = await getIndex();
  const cats = catalogNumbers(films);
  const daEscola = applySort(
    films.filter((f) => f.movementId === movement.id),
    "year-asc"
  );

  return (
    <>
      <nav className="crumb" aria-label="Trilha">
        <Link href="/escolas">Escolas</Link>
        <em>/</em>
        <span>{movement.name}</span>
      </nav>

      <section className="opener">
        <div>
          <p className="rubric" style={{ marginBottom: 20 }}>
            {movement.region} · {movement.years}
          </p>
          <h1 className="display d-1">{movement.name}</h1>
        </div>
        <div className="opener-meta">
          <p className="lede">{movement.abstract}</p>
          <dl className="ledger">
            <dt>Diretores</dt>
            <dd>{movement.keyDirectors.join(" · ")}</dd>
            <dt>Estética</dt>
            <dd>{movement.aesthetic}</dd>
            <dt>No acervo</dt>
            <dd>{plural(daEscola.length, "obra", "obras")}</dd>
          </dl>
        </div>
      </section>

      <section className="band">
        <div className="band-in">
          <div className="band-head">
            <p className="rubric">Obras</p>
            <span className="count">Em ordem cronológica</span>
          </div>
          <div className="stack">
            <div className="grid">
              {daEscola.map((f, i) => (
                <FilmCard
                  key={f.id}
                  film={f}
                  movement={movement}
                  cat={cats.get(f.id)}
                  priority={i < 6}
                />
              ))}
            </div>
            <p>
              <Link
                href={`/explorar?movement=${movement.id}`}
                style={{
                  fontSize: 10,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  color: "var(--sepia)",
                }}
              >
                Abrir no explorador →
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
