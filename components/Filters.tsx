"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SCOPES, type ScopeKey } from "@/lib/types";

export type Opcao = { value: string; label: string };

type Props = {
  scope: ScopeKey;
  countries: Opcao[];
  decades: Opcao[];
  /** Só o Arquivo tem escolas: o TMDb não possui o conceito. */
  movements?: Opcao[];
  sorts: Record<string, string>;
  /** Só o Arquivo tem rankings agrupados por nota editorial. */
  modes?: Record<string, string>;
};

/**
 * Barra de filtros dos dois escopos.
 *
 * O estado vive na URL, não em useState: um recorte filtrado é um link
 * que você manda para alguém. Os selects fazem replace, não push, para
 * não entupir o histórico a cada ajuste.
 *
 * Trocar de escopo descarta os filtros de propósito — "Brasil" no Arquivo
 * é o texto `Brasil` e no TMDb é o ISO `BR`, e a década do Arquivo pode
 * não existir no outro. Carregar valor incompatível daria lista vazia sem
 * explicação.
 */
export function Filters({
  scope,
  countries,
  decades,
  movements,
  sorts,
  modes,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const atual = {
    country: params.get("country") ?? "",
    decade: params.get("decade") ?? "",
    movement: params.get("movement") ?? "",
    sort: params.get("sort") ?? "",
    mode: params.get("mode") ?? "browse",
    view: params.get("view") ?? "grid",
  };

  const rankeando = Boolean(modes) && atual.mode !== "browse";

  function href(muda: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(muda)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    // qualquer mudança de filtro volta para a primeira página
    if (!("page" in muda)) p.delete("page");
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function mudar(chave: string, valor: string) {
    router.replace(href({ [chave]: valor }), { scroll: false });
  }

  const chips = [
    atual.country && {
      chave: "country",
      rotulo:
        countries.find((c) => c.value === atual.country)?.label ?? atual.country,
    },
    atual.decade && { chave: "decade", rotulo: `Anos ${atual.decade}` },
    atual.movement &&
      movements && {
        chave: "movement",
        rotulo:
          movements.find((m) => m.value === atual.movement)?.label ??
          atual.movement,
      },
  ].filter(Boolean) as { chave: string; rotulo: string }[];

  return (
    <div className="controls">
      <div className="controls-in">
        {/* Escopo: as duas populações de filme */}
        <div className="mode-switch" role="group" aria-label="Escopo">
          {(Object.keys(SCOPES) as ScopeKey[]).map((k) => (
            <Link
              key={k}
              href={
                k === "archive"
                  ? pathname
                  : `${pathname}?scope=tmdb`
              }
              aria-current={scope === k ? "true" : undefined}
              scroll={false}
            >
              {SCOPES[k]}
            </Link>
          ))}
        </div>

        {modes && (
          <div className="mode-switch" role="group" aria-label="Modo">
            {Object.entries(modes).map(([k, rotulo]) => (
              <Link
                key={k}
                href={href({ mode: k === "browse" ? "" : k })}
                aria-current={atual.mode === k ? "true" : undefined}
                scroll={false}
              >
                {rotulo}
              </Link>
            ))}
          </div>
        )}

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
                <option key={c.value} value={c.value}>
                  {c.label}
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
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {movements && (
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
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="f-sort">Ordenar por</label>
          <div className="sel">
            <select
              id="f-sort"
              value={atual.sort || Object.keys(sorts)[0]}
              disabled={rankeando}
              onChange={(e) => mudar("sort", e.target.value)}
            >
              {Object.entries(sorts).map(([k, rotulo]) => (
                <option key={k} value={k}>
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
