"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteEntry, saveEntry, type Resultado } from "@/app/actions";
import { StarRating } from "@/components/StarRating";
import type { Entry } from "@/lib/types";

/** Hoje em ISO local — `new Date().toISOString()` daria o dia errado à noite. */
function hojeLocal() {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

export function LogForm({
  filmId,
  filmTitle,
  entry,
}: {
  filmId: string;
  filmTitle: string;
  entry: Entry | null;
}) {
  const [estado, salvar, salvando] = useActionState<Resultado | null, FormData>(
    saveEntry,
    null
  );
  const [estadoApagar, apagar, apagando] = useActionState<
    Resultado | null,
    FormData
  >(deleteEntry, null);

  const editando = Boolean(entry);
  const msg = estado ?? estadoApagar;

  return (
    <section className="logbox">
      <div className="logbox-head">
        <p className="block-t" style={{ margin: 0 }}>
          {editando ? "Seu registro" : "Registrar"}
        </p>
        {editando && entry?.createdAt && (
          <span className="logbox-since">
            desde{" "}
            {new Date(entry.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      <form action={salvar} className="logform">
        <input type="hidden" name="filmId" value={filmId} />

        <div className="logform-row">
          <div className="field">
            <label htmlFor="watchedOn">Visto em</label>
            <input
              id="watchedOn"
              name="watchedOn"
              type="date"
              max={hojeLocal()}
              defaultValue={entry?.watchedOn ?? ""}
              className="inp"
            />
          </div>

          <div className="field">
            <label htmlFor="watchCount">Vezes</label>
            <input
              id="watchCount"
              name="watchCount"
              type="number"
              min={1}
              max={999}
              step={1}
              defaultValue={entry?.watchCount ?? 1}
              className="inp narrow"
            />
          </div>

          <div className="field">
            <label>Nota</label>
            <StarRating defaultValue={entry?.rating ?? null} />
          </div>

          <div className="field">
            <label htmlFor="liked">Favorito</label>
            <label className="check">
              <input
                id="liked"
                name="liked"
                type="checkbox"
                defaultChecked={entry?.liked ?? false}
              />
              <span>Marcar como favorito</span>
            </label>
          </div>
        </div>

        <div className="field">
          <label htmlFor="review">
            Review <span className="opt">opcional</span>
          </label>
          <textarea
            id="review"
            name="review"
            rows={5}
            maxLength={10_000}
            defaultValue={entry?.review ?? ""}
            placeholder={`O que ${filmTitle} fez com você.`}
            className="inp area"
          />
        </div>

        <div className="logform-foot">
          <label className="check">
            <input
              name="hasSpoilers"
              type="checkbox"
              defaultChecked={entry?.hasSpoilers ?? false}
            />
            <span>Contém spoilers</span>
          </label>

          <button type="submit" className="btn" disabled={salvando}>
            {salvando ? "Salvando…" : editando ? "Atualizar" : "Registrar"}
          </button>
        </div>
      </form>

      {editando && (
        <form action={apagar} className="logform-delete">
          <input type="hidden" name="filmId" value={filmId} />
          <button type="submit" className="btn-ghost" disabled={apagando}>
            {apagando ? "Removendo…" : "Remover do meu log"}
          </button>
        </form>
      )}

      {msg && (
        <p
          className={msg.ok ? "form-msg ok" : "form-msg err"}
          role="status"
          aria-live="polite"
        >
          {msg.ok ? msg.aviso : msg.erro}
          {!msg.ok && msg.erro?.includes("Entre") && (
            <>
              {" "}
              <Link href="/login">Entrar</Link>
            </>
          )}
        </p>
      )}
    </section>
  );
}
