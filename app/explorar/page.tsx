import type { Metadata } from "next";
import Link from "next/link";
import { Filters } from "@/components/Filters";
import { FilmCard, FilmRow, RankRow } from "@/components/Poster";
import { SourceBanner } from "@/components/SourceBanner";
import { catalogNumbers, getIndex } from "@/lib/data";
import {
  applyFilters,
  applySort,
  groupRankings,
  parseQuery,
  plural,
} from "@/lib/query";
import { MODES } from "@/lib/types";

export const metadata: Metadata = {
  title: "Explorar",
  description:
    "Filtre o acervo por país, década e escola, ou veja as melhores notas de cada década e cada cinematografia.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Explorar({ searchParams }: Props) {
  const q = parseQuery(await searchParams);
  const { films, movements, byMovement, countries, decades } = await getIndex();
  const cats = catalogNumbers(films);

  const filtrados = applyFilters(films, q);
  const lista = applySort(filtrados, q.sort);

  return (
    <>
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
              {q.mode === "browse" ? "O explorador" : MODES[q.mode]}
            </h1>
            <p className="lede">
              {q.mode === "browse"
                ? "Filtre por procedência, década e escola. Os filtros vivem na URL — um recorte filtrado é um link que você pode mandar para alguém."
                : "As cinco melhores notas do arquivo dentro de cada grupo, respeitando os filtros ativos."}
            </p>

            <SourceBanner />

            <Filters
              countries={countries}
              decades={decades}
              movements={movements.map((m) => ({ id: m.id, name: m.name }))}
            />

            {filtrados.length === 0 ? (
              <p className="empty">
                Nenhuma obra responde a esses filtros.
                <Link href="/explorar">Limpar filtros</Link>
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
                    priority={i < 6}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
