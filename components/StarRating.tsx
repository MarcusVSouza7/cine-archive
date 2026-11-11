"use client";

import { useState } from "react";

const ESTRELAS = [1, 2, 3, 4, 5];

function Estrela({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.6l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6L2.5 9.6l6.6-.9z" />
    </svg>
  );
}

/**
 * Nota em meias estrelas, de 0,5 a 5.
 *
 * Radiogroup com inputs reais por trás das metades visíveis: as setas do
 * teclado funcionam sem uma linha de JS, e o leitor de tela anuncia
 * "três estrelas e meia" em vez de "botão".
 */
export function StarRating({
  name = "rating",
  defaultValue = null,
}: {
  name?: string;
  defaultValue?: number | null;
}) {
  const [valor, setValor] = useState<number | null>(defaultValue);
  const [previa, setPrevia] = useState<number | null>(null);

  const mostrando = previa ?? valor ?? 0;

  /** Quanto da estrela i esconder pela direita. */
  function corte(i: number) {
    if (mostrando >= i) return "0%";
    if (mostrando >= i - 0.5) return "50%";
    return "100%";
  }

  return (
    <div className="rating-field">
      <div
        className="stars"
        role="radiogroup"
        aria-label="Sua nota"
        onMouseLeave={() => setPrevia(null)}
      >
        {ESTRELAS.map((i) => (
          <span
            className="star"
            key={i}
            style={{ "--cut": corte(i) } as React.CSSProperties}
          >
            <Estrela className="out" />
            <Estrela className="in" />
            {[i - 0.5, i].map((v, metade) => (
              <label key={v} className={metade === 0 ? "half l" : "half r"}>
                <input
                  type="radio"
                  name={name}
                  value={v}
                  checked={valor === v}
                  onChange={() => setValor(v)}
                  onMouseEnter={() => setPrevia(v)}
                  onFocus={() => setPrevia(v)}
                  onBlur={() => setPrevia(null)}
                />
                <span className="sr">
                  {v === 1 ? "1 estrela" : `${String(v).replace(".", ",")} estrelas`}
                </span>
              </label>
            ))}
          </span>
        ))}
      </div>

      <span className="rating-read">
        {valor
          ? `${String(valor).replace(".", ",")} de 5`
          : "sem nota"}
      </span>

      {valor !== null && (
        <button
          type="button"
          className="rating-clear"
          onClick={() => {
            setValor(null);
            setPrevia(null);
          }}
        >
          limpar
        </button>
      )}
    </div>
  );
}
