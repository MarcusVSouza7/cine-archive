import Image from "next/image";
import Link from "next/link";
import { posterUrl, POSTER } from "@/lib/tmdb";
import type { CatalogItem, Movement } from "@/lib/types";

type Base = {
  /** Obra do arquivo ou item do catálogo: a placa serve as duas. */
  film: CatalogItem;
  movement?: Movement;
  /** Número de catálogo. Só obra do arquivo tem. */
  cat?: string;
  /** Minutos, quando quem chama tem a ficha completa. */
  runtime?: number | null;
};

type Props = Base & {
  size?: (typeof POSTER)[keyof typeof POSTER];
  sizes?: string;
  priority?: boolean;
};

/**
 * Pôster do filme.
 *
 * Com poster_path, serve o cartaz do TMDb. Sem ele — e para obra de 1920
 * isso é regra, não exceção — cai na placa tipográfica no mesmo
 * enquadramento 2:3. Nenhuma obra vira buraco na grade.
 */
export function Poster({
  film,
  movement,
  cat,
  runtime,
  size = POSTER.grade,
  sizes = "(max-width: 760px) 45vw, 200px",
  priority = false,
}: Props) {
  const url = posterUrl(film.posterPath, size);

  if (url) {
    return (
      <div className="poster">
        <Image
          src={url}
          alt={`Cartaz de ${film.title}`}
          fill
          sizes={sizes}
          priority={priority}
        />
      </div>
    );
  }

  return <Plate film={film} movement={movement} cat={cat} runtime={runtime} />;
}

/** A placa tipográfica, também usada sozinha onde não há cartaz possível. */
export function Plate({ film, movement, cat, runtime }: Base) {
  const tint = {
    "--h": String(movement?.hue ?? 40),
    "--s": movement?.sat ?? "12%",
  } as React.CSSProperties;

  return (
    <div className="plate" style={tint}>
      <span className="frame" />
      <div className="plate-top">
        <span className="plate-cat">{cat ?? (film.inArchive ? "—" : "TMDb")}</span>
        <span className="plate-cat">{film.year ?? "s/d"}</span>
      </div>
      <p className="plate-title">{film.originalTitle ?? film.title}</p>
      <div className="plate-foot">
        <span className="dir">{film.director ?? "direção não creditada"}</span>
        <span>{runtime ? `${runtime}'` : ""}</span>
      </div>
    </div>
  );
}

/* ============================================================
   cartões e linhas
   ============================================================ */

export function FilmCard({ film, movement, cat, runtime, priority }: Props) {
  return (
    <Link href={`/filmes/${film.id}`} className="film-card">
      <Poster
        film={film}
        movement={movement}
        cat={cat}
        runtime={runtime}
        priority={priority}
      />
      <span className="cap">
        <h3>{film.title}</h3>
        <p>
          {film.director ? `${film.director} · ` : ""}
          {film.year ?? "sem data"}
          {!film.inArchive && film.voteAverage ? (
            <span className="tmdb-note"> · TMDb {film.voteAverage.toFixed(1)}</span>
          ) : null}
        </p>
      </span>
    </Link>
  );
}

export function FilmRow({
  film,
  movement,
  index,
  synopsis,
}: {
  film: CatalogItem;
  movement?: Movement;
  index: number;
  /** Só o arquivo tem sinopse escrita. */
  synopsis?: string | null;
}) {
  return (
    <Link href={`/filmes/${film.id}`} className="ed-row">
      <span className="ed-idx">{String(index + 1).padStart(2, "0")}</span>
      <span className="ed-main">
        <h3>
          {film.title}
          {film.originalTitle && film.originalTitle !== film.title && (
            <span className="orig">{film.originalTitle}</span>
          )}
        </h3>
        {synopsis && <p>{synopsis}</p>}
        {movement && <span className="mv">{movement.name}</span>}
      </span>
      <span className="ed-meta dir">{film.director ?? "—"}</span>
      <span className="ed-meta yr">{film.year ?? "—"}</span>
      <span className="ed-meta ct dim">{film.country ?? "—"}</span>
      <span className="ed-score">
        {film.archiveScore ?? (film.voteAverage ? film.voteAverage.toFixed(1) : "—")}
      </span>
    </Link>
  );
}

export function RankRow({
  film,
  movement,
  position,
}: {
  film: CatalogItem;
  movement?: Movement;
  position: number;
}) {
  return (
    <Link href={`/filmes/${film.id}`} className="rank-row">
      <span className="pos">{position}</span>
      <span className="ti">
        {film.title}
        <small>
          {film.director ? `${film.director} · ` : ""}
          {film.year ?? "sem data"}
          {movement ? ` · ${movement.name}` : ""}
        </small>
      </span>
      <span className="sc">
        {film.archiveScore ?? (film.voteAverage ? film.voteAverage.toFixed(1) : "—")}
      </span>
    </Link>
  );
}
