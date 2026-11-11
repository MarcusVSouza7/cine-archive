import Image from "next/image";
import Link from "next/link";
import { posterUrl, POSTER } from "@/lib/tmdb";
import type { Film, Movement } from "@/lib/types";

type Props = {
  film: Film;
  movement?: Movement;
  /** Número de catálogo. Só aparece na placa. */
  cat?: string;
  size?: (typeof POSTER)[keyof typeof POSTER];
  sizes?: string;
  priority?: boolean;
};

/**
 * Pôster do filme.
 *
 * Com poster_path em cache, serve o cartaz do TMDb. Sem ele — e para obra
 * de 1920 isso e regra, não exceção — cai na placa tipográfica no mesmo
 * enquadramento 2:3. A identidade visual sobrevive à chegada dos cartazes
 * reais, e obra sem cartaz não vira buraco na grade.
 */
export function Poster({
  film,
  movement,
  cat,
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

  return <Plate film={film} movement={movement} cat={cat} />;
}

/** A placa tipográfica. Também usada sozinha onde não há cartaz possível. */
export function Plate({
  film,
  movement,
  cat,
}: Pick<Props, "film" | "movement" | "cat">) {
  const tint = {
    "--h": String(movement?.hue ?? 40),
    "--s": movement?.sat ?? "12%",
  } as React.CSSProperties;

  return (
    <div className="plate" style={tint}>
      <span className="frame" />
      <div className="plate-top">
        <span className="plate-cat">{cat ?? "—"}</span>
        <span className="plate-cat">{film.year}</span>
      </div>
      <p className="plate-title">{film.originalTitle}</p>
      <div className="plate-foot">
        <span className="dir">{film.director}</span>
        <span>{film.runtime ? `${film.runtime}'` : ""}</span>
      </div>
    </div>
  );
}

/* ============================================================
   cartões e linhas
   ============================================================ */

export function FilmCard({
  film,
  movement,
  cat,
  priority,
}: Props & { priority?: boolean }) {
  return (
    <Link href={`/filmes/${film.id}`} className="film-card">
      <Poster
        film={film}
        movement={movement}
        cat={cat}
        priority={priority}
      />
      <span className="cap">
        <h3>{film.title}</h3>
        <p>
          {film.director} · {film.year}
        </p>
      </span>
    </Link>
  );
}

export function FilmRow({
  film,
  movement,
  index,
}: {
  film: Film;
  movement?: Movement;
  index: number;
}) {
  return (
    <Link href={`/filmes/${film.id}`} className="ed-row">
      <span className="ed-idx">{String(index + 1).padStart(2, "0")}</span>
      <span className="ed-main">
        <h3>
          {film.title}
          {film.originalTitle !== film.title && (
            <span className="orig">{film.originalTitle}</span>
          )}
        </h3>
        <p>{film.synopsis}</p>
        {movement && <span className="mv">{movement.name}</span>}
      </span>
      <span className="ed-meta dir">{film.director}</span>
      <span className="ed-meta yr">{film.year}</span>
      <span className="ed-meta ct dim">{film.country}</span>
      <span className="ed-score">{film.archiveScore ?? "—"}</span>
    </Link>
  );
}

export function RankRow({
  film,
  movement,
  position,
}: {
  film: Film;
  movement?: Movement;
  position: number;
}) {
  return (
    <Link href={`/filmes/${film.id}`} className="rank-row">
      <span className="pos">{position}</span>
      <span className="ti">
        {film.title}
        <small>
          {film.director} · {film.year}
          {movement ? ` · ${movement.name}` : ""}
        </small>
      </span>
      <span className="sc">{film.archiveScore ?? "—"}</span>
    </Link>
  );
}
