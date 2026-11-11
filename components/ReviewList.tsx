import Image from "next/image";
import Link from "next/link";
import { Stars } from "@/components/Stars";
import type { EntryWithProfile } from "@/lib/types";

/**
 * Reviews de uma ficha.
 *
 * Spoiler não é escondido atrás de clique aqui: é marcado. Esconder
 * exigiria JavaScript no cliente para uma lista que o servidor já
 * renderiza pronta, e a etiqueta resolve o problema real — avisar antes
 * de a pessoa ler.
 */
export function ReviewList({ entries }: { entries: EntryWithProfile[] }) {
  if (entries.length === 0) return null;

  return (
    <div>
      <p className="block-t">
        {entries.length === 1 ? "Uma review" : `${entries.length} reviews`}
      </p>

      <div className="reviews">
        {entries.map((e) => (
          <article className="review" key={e.id}>
            <div className="review-head">
              {e.profile.avatarUrl ? (
                <Image
                  src={e.profile.avatarUrl}
                  alt=""
                  width={26}
                  height={26}
                  className="avatar"
                />
              ) : (
                <span className="avatar avatar-blank" aria-hidden="true" />
              )}

              <Link href={`/u/${e.profile.handle}`} className="review-who">
                {e.profile.displayName}
              </Link>

              {e.rating !== null && <Stars value={e.rating} />}
              {e.liked && <span className="heart">favorito</span>}

              <time
                className="review-when"
                dateTime={e.createdAt}
              >
                {new Date(e.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </div>

            {e.hasSpoilers && (
              <span className="spoiler-tag">contém spoilers</span>
            )}
            <p className="review-body">{e.review}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
