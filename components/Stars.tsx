/**
 * Nota em estrelas, só leitura.
 *
 * Server Component: não há estado nenhum aqui, e as notas aparecem em
 * lista longa (diário, reviews). Mandar isto ao cliente seria pagar
 * JavaScript por uma imagem estática.
 */
export function Stars({ value }: { value: number }) {
  const rotulo = `${String(value).replace(".", ",")} de 5`;

  return (
    <span className="stars-ro" title={rotulo} aria-label={rotulo}>
      {[1, 2, 3, 4, 5].map((i) => {
        const corte = value >= i ? "0%" : value >= i - 0.5 ? "50%" : "100%";
        return (
          <span
            className="star"
            key={i}
            style={{ "--cut": corte } as React.CSSProperties}
            aria-hidden="true"
          >
            <svg className="out" viewBox="0 0 24 24">
              <path d="M12 2.6l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6L2.5 9.6l6.6-.9z" />
            </svg>
            <svg className="in" viewBox="0 0 24 24">
              <path d="M12 2.6l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6L2.5 9.6l6.6-.9z" />
            </svg>
          </span>
        );
      })}
    </span>
  );
}
