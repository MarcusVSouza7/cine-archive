import Link from "next/link";
import type { Film, Movement } from "@/lib/types";

export function SchoolCard({
  movement,
  films,
  linkTitle = false,
}: {
  movement: Movement;
  films: Film[];
  /** Na página /escolas o título é link; na home, não. */
  linkTitle?: boolean;
}) {
  const essenciais = [...films]
    .sort(
      (a, b) => (b.historicalRelevance ?? 0) - (a.historicalRelevance ?? 0)
    )
    .slice(0, 3);

  const tint = {
    "--h": String(movement.hue),
    "--s": movement.sat,
  } as React.CSSProperties;

  const titulo = (
    <h3>
      <span className="loc">{movement.region}</span>
      {movement.name}
    </h3>
  );

  return (
    <article className="school" style={tint}>
      <span className="strip" />
      <div className="school-top">
        {linkTitle ? (
          <Link href={`/escolas/${movement.id}`}>{titulo}</Link>
        ) : (
          titulo
        )}
        <span className="yrs">{movement.years}</span>
      </div>

      <p className="abstract">{movement.abstract}</p>

      <dl>
        <dt>Diretores</dt>
        <dd>{movement.keyDirectors.join(" · ")}</dd>
        <dt>Estética</dt>
        <dd>{movement.aesthetic}</dd>
      </dl>

      <div className="essentials">
        {essenciais.map((f) => (
          <Link key={f.id} href={`/filmes/${f.id}`}>
            {f.title} <span style={{ color: "var(--faint)" }}>{f.year}</span>
          </Link>
        ))}
      </div>

      <Link className="go" href={`/explorar?movement=${movement.id}`}>
        Ver as {films.length} obras
      </Link>
    </article>
  );
}
