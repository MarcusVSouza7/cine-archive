import { usandoSupabase } from "@/lib/data";
import { tmdbConfigurado } from "@/lib/tmdb";

/**
 * Diz de onde os dados desta página vieram.
 *
 * Existe porque "abri e não vi o que foi combinado" é o modo de falha
 * mais fácil de cometer num projeto com fonte dupla: a página renderiza
 * perfeitamente a partir do JSON e nada avisa que o banco nunca foi
 * conectado. Quando as duas fontes estão no lugar, o aviso desaparece.
 */
export function SourceBanner() {
  if (usandoSupabase && tmdbConfigurado) return null;

  const faltando: string[] = [];
  if (!usandoSupabase) faltando.push("NEXT_PUBLIC_SUPABASE_URL + ANON_KEY");
  if (!tmdbConfigurado) faltando.push("TMDB_READ_TOKEN");

  return (
    <div className="banner">
      <div>
        <strong>Modo protótipo</strong>
        <span>
          {!usandoSupabase && (
            <>
              Acervo lido de <code>data/*.json</code>, não do Postgres — sem
              perfis e sem reviews.{" "}
            </>
          )}
          {!tmdbConfigurado && (
            <>
              Sem token do TMDb: nenhum cartaz, elenco ou disponibilidade; os
              pôsteres são as placas tipográficas.{" "}
            </>
          )}
          Defina {faltando.join(" e ")} em <code>.env.local</code> para ligar o
          resto.
        </span>
      </div>
    </div>
  );
}
