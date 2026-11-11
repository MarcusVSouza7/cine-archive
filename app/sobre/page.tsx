import type { Metadata } from "next";
import { SourceBanner } from "@/components/SourceBanner";
import { getIndex } from "@/lib/data";
import { plural } from "@/lib/query";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Critério de curadoria, procedência dos dados e o que o TMDb faz — e não faz — neste arquivo.",
};

export default async function Sobre() {
  const { films, movements, countries } = await getIndex();

  return (
    <section className="band" style={{ borderTop: 0 }}>
      <div className="band-in">
        <div className="band-head">
          <p className="rubric">Sobre</p>
          <span className="count">Nota editorial</span>
        </div>
        <div className="stack">
          <h1 className="display d-2">Como este arquivo é feito</h1>

          <SourceBanner />

          <div className="about-grid">
            <div>
              <h3>Critério</h3>
              <p className="body-s">
                Entra no acervo a obra que ajuda a explicar uma corrente — não
                necessariamente a mais vista. Hoje são{" "}
                {plural(films.length, "obra", "obras")} em{" "}
                {plural(movements.length, "escola", "escolas")} e{" "}
                {plural(countries.length, "cinematografia", "cinematografias")}.
              </p>
            </div>
            <div>
              <h3>As três notas</h3>
              <p className="body-s">
                A <strong>nota do arquivo</strong> e a{" "}
                <strong>relevância histórica</strong> são editoriais: opinião
                assinada, não média de nada. A <strong>nota de leitores</strong>{" "}
                é a média de quem registrou o filme. São perguntas diferentes e
                ficam em colunas diferentes de propósito — misturá-las é o que
                transformaria um arquivo de curadoria num agregador.
              </p>
            </div>
            <div>
              <h3>O que o TMDb faz</h3>
              <p className="body-s">
                Cartaz, elenco, duração e disponibilidade de streaming. O que
                ele <em>não</em> faz: decidir o que entra no acervo. O TMDb não
                tem o conceito de escola cinematográfica, e esse campo é
                curadoria própria — nenhuma obra aparece aqui por existir lá.
              </p>
            </div>
            <div>
              <h3>Pôsteres</h3>
              <p className="body-s">
                Onde há cartaz no TMDb, é o cartaz. Onde não há — e para obra
                muda isso é regra — entra a placa tipográfica: título original
                na serifa do arquivo, número de catálogo, diretor e duração
                sobre uma tinta derivada da escola do filme.
              </p>
            </div>
          </div>

          <p className="body-s">
            Fichas técnicas e sinopses são verificáveis. As notas editoriais
            deste protótipo ainda são valores de demonstração, sem proveniência
            citada por obra — é o próximo débito a pagar.
          </p>
        </div>
      </div>
    </section>
  );
}
