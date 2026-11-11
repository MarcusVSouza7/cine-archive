"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MODES, SORTS, type Movement } from "@/lib/types";

type Props = {
  countries: string[];
  decades: number[];
  movements: Pick<Movement, "id" | "name">[];
};

/**
 * Barra de filtros.
 *
 * O estado vive na URL, não em useState: um ranking filtrado passa a ser
 * link que você manda para alguém. Os selects fazem replace (não push)
 * para não entupir o histórico do navegador a cada ajuste.
 */
export function Filters({ countries, decades, movements }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const atual = {
    country: params.get("country") ?? "",
    decade: params.get("decade") ?? "",
    movement: params.get("movement") ?? "",
    sort: params.get("sort") ?? "rating",
    mode: params.get("mode") ?? "browse",
    view: params.get("view") ?? "grid",
  };

  const rankeando = atual.mode !== "browse";

  /** Monta uma URL com as mudanças aplicadas; valor vazio remove a chave. */
  function href(muda: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(muda)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function mudar(chave: string, valor: string) {
    router.replace(href({ [chave]: valor }), { scroll: false });
  }

  const chips = [
    atual.country && { chave: "country", rotulo: atual.country },
    atual.decade && { chave: "decade", rotulo: `Anos ${atual.decade}` },
    atual.movement && {
      chave: "movement",
      rotulo:
        movements.find((m) => m.id === atual.movement)?.name ?? atual.movement,
    },
  ].filter(Boolean) as { chave: string; rotulo: string }[];

  return (
    <div className="controls">
      <div className="controls-in">
        <div className="mode-switch" role="group" aria-label="Modo de exibição">
          {Object.entries(MODES).map(([chave, rotulo]) => (
            <Link
              key={chave}
              href={href({ mode: chave === "browse" ? "" : chave })}
              aria-current={atual.mode === chave ? "true" : undefined}
              scroll={false}
            >
              {rotulo}
            </Link>
          ))}
        </div>

        <div className="field">
          <label htmlFor="f-country">País / região</label>
          <div className="sel">
            <select
              id="f-country"
              value={atual.country}
              onChange={(e) => mudar("country", e.target.value)}
            >
              <option value="">Todos os países</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-decade">Década</label>
          <div className="sel">
            <select
              id="f-decade"
              value={atual.decade}
              onChange={(e) => mudar("decade", e.target.value)}
            >
              <option value="">Todas as décadas</option>
              {decades.map((d) => (
                <option key={d} value={String(d)}>
                  Anos {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-movement">Escola</label>
          <div className="sel">
            <select
              id="f-movement"
              value={atual.movement}
              onChange={(e) => mudar("movement", e.target.value)}
            >
              <option value="">Todas as escolas</option>
              {movements.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-sort">Ordenar por</label>
          <div className="sel">
            <select
              id="f-sort"
              value={atual.sort}
              disabled={rankeando}
              onChange={(e) => mudar("sort", e.target.value)}
            >
              {Object.entries(SORTS).map(([chave, rotulo]) => (
                <option key={chave} value={chave}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!rankeando && (
          <div className="view-toggle" role="group" aria-label="Visualização">
            <Link
              href={href({ view: "" })}
              aria-current={atual.view === "grid" ? "true" : undefined}
              scroll={false}
            >
              Grade
            </Link>
            <Link
              href={href({ view: "list" })}
              aria-current={atual.view === "list" ? "true" : undefined}
              scroll={false}
            >
              Lista editorial
            </Link>
          </div>
        )}
      </div>

      <div className="chips">
        {chips.map((c) => (
          <span className="chip" key={c.chave}>
            {c.rotulo}
            <Link
              href={href({ [c.chave]: "" })}
              aria-label={`Remover filtro ${c.rotulo}`}
              scroll={false}
            >
              ×
            </Link>
          </span>
        ))}
        {chips.length > 1 && (
          <Link
            className="clear"
            href={href({ country: "", decade: "", movement: "" })}
            scroll={false}
          >
            Limpar tudo
          </Link>
        )}
      </div>
    </div>
  );
}
