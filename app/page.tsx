import Link from "next/link";
import { FilmCard } from "@/components/Poster";
import { SchoolCard } from "@/components/SchoolCard";
import { SourceBanner } from "@/components/SourceBanner";
import { catalogNumbers, getIndex } from "@/lib/data";
import { plural } from "@/lib/query";

/** Entradas pelas quais um visitante começa. Uma por corrente que importa. */
const SELECAO = [
  "ladri-1948",
  "bout-souffle-1960",
  "deus-diabo-1964",
  "tokyo-1953",
  "metropolis-1927",
  "ringu-1998",
];

export default async function Home() {
  const { films, movements, byMovement, countries } = await getIndex();
  const cats = catalogNumbers(films);

  const selecao = SELECAO.map((id) => films.find((f) => f.id === id)).filter(
    (f): f is NonNullable<typeof f> => Boolean(f)
  );

  const anos = films.map((f) => f.year);
  const destaque = movements.slice(0, 4);

  return (
    <>
      <section className="opener">
        <div>
          <p className="rubric" style={{ marginBottom: 20 }}>
            Arquivo de curadoria
          </p>
          <h1 className="display d-1">
            Um catálogo do cinema organizado por <em>escolas</em>, não por
            algoritmo.
          </h1>
        </div>
        <div className="opener-meta">
          <p className="lede">
            Obras fundamentais lidas através das correntes que as produziram —
            do expressionismo de estúdio ao vídeo granulado do Dogma 95. Cada
            ficha devolve o filme ao seu movimento.
          </p>
          <dl className="ledger">
            <dt>Obras</dt>
            <dd>{plural(films.length, "catalogada", "catalogadas")}</dd>
            <dt>Escolas</dt>
            <dd>{plural(movements.length, "corrente", "correntes")}</dd>
            <dt>Período</dt>
            <dd>
              {Math.min(...anos)} — {Math.max(...anos)}
            </dd>
            <dt>Procedência</dt>
            <dd>
              {plural(countries.length, "cinematografia", "cinematografias")}
            </dd>
          </dl>
        </div>
      </section>

      <SourceBanner />

      <div className="rule-caption">
        <div>
          <span>Cartazes do TMDb, placas tipográficas onde não há cartaz</span>
          <span>Nota do arquivo — escala curatorial 0–100</span>
          <span>Curadoria própria, não agregação</span>
        </div>
      </div>

      <section className="band" style={{ borderTop: 0 }}>
        <div className="band-in">
          <div className="band-head">
            <p className="rubric">A seleção</p>
            <span className="count">
              {plural(selecao.length, "entrada", "entradas")}
            </span>
          </div>
          <div className="stack">
            <p className="lede">
              Os títulos pelos quais um visitante começa: cada um é a porta de
              entrada mais limpa para a corrente que representa.
            </p>
            <div className="grid">
              {selecao.map((f, i) => (
                <FilmCard
                  key={f.id}
                  film={f}
                  movement={byMovement.get(f.movementId)}
                  cat={cats.get(f.id)}
                  priority={i < 3}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="band-in">
          <div className="band-head">
            <p className="rubric">Escolas</p>
            <span className="count">
              {plural(movements.length, "corrente", "correntes")}
            </span>
          </div>
          <div className="stack">
            <h2 className="display d-2">Movimentos</h2>
            <p className="lede">
              Uma escola não é um gênero: é um conjunto de condições —
              material, política, econômica — que fez um grupo de diretores
              filmar de um modo que ninguém filmava antes.
            </p>
            <div className="schools">
              {destaque.map((m) => (
                <SchoolCard
                  key={m.id}
                  movement={m}
                  films={films.filter((f) => f.movementId === m.id)}
                  linkTitle
                />
              ))}
            </div>
            <p>
              <Link
                href="/escolas"
                style={{
                  fontSize: 10,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  color: "var(--sepia)",
                }}
              >
                Ver as {movements.length} escolas →
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="band-in">
          <div className="band-head">
            <p className="rubric">Explorar</p>
            <span className="count">{films.length} obras</span>
          </div>
          <div className="stack">
            <h2 className="display d-2">O explorador</h2>
            <p className="lede">
              Filtre por procedência, década e escola. Ou troque para os
              rankings, que reordenam o acervo pelas melhores notas dentro de
              cada década e de cada cinematografia.
            </p>
            <div className="links" style={{ borderTop: 0, paddingTop: 0 }}>
              <Link href="/explorar">
                <i>Acervo</i>Grade e lista editorial, com filtros
              </Link>
              <Link href="/explorar?mode=decade">
                <i>Rankings</i>As melhores notas de cada década
              </Link>
              <Link href="/explorar?mode=country">
                <i>Rankings</i>As melhores notas de cada país
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
