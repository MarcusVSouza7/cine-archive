import Link from "next/link";

export default function NotFound() {
  return (
    <section className="opener">
      <div>
        <p className="rubric" style={{ marginBottom: 20 }}>
          Erro 404
        </p>
        <h1 className="display d-1">Não há essa entrada no catálogo.</h1>
      </div>
      <div className="opener-meta">
        <p className="lede">
          O endereço não corresponde a nenhuma obra nem a nenhuma escola do
          acervo. Pode ter sido um slug digitado à mão, ou uma entrada que saiu
          da curadoria.
        </p>
        <div className="links" style={{ paddingTop: 16 }}>
          <Link href="/explorar">
            <i>Acervo</i>Ver todas as obras
          </Link>
          <Link href="/escolas">
            <i>Escolas</i>Ver as correntes
          </Link>
        </div>
      </div>
    </section>
  );
}
