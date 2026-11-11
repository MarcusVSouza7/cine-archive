import type { Metadata } from "next";
import { SchoolCard } from "@/components/SchoolCard";
import { getIndex } from "@/lib/data";
import { plural } from "@/lib/query";

export const metadata: Metadata = {
  title: "Escolas",
  description:
    "As correntes e escolas do cinema: condições históricas, diretores-chave, marcas estéticas e as obras onde aparecem com mais nitidez.",
};

export default async function Escolas() {
  const { films, movements } = await getIndex();

  return (
    <section className="band" style={{ borderTop: 0 }}>
      <div className="band-in">
        <div className="band-head">
          <p className="rubric">Escolas</p>
          <span className="count">
            {plural(movements.length, "corrente", "correntes")}
          </span>
        </div>
        <div className="stack">
          <h1 className="display d-2">Movimentos</h1>
          <p className="lede">
            Uma escola não é um gênero: é um conjunto de condições — material,
            política, econômica — que fez um grupo de diretores filmar de um
            modo que ninguém filmava antes. Cada verbete resume essas condições
            e aponta as obras onde elas aparecem com mais nitidez.
          </p>
          <div className="schools">
            {movements.map((m) => (
              <SchoolCard
                key={m.id}
                movement={m}
                films={films.filter((f) => f.movementId === m.id)}
                linkTitle
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
