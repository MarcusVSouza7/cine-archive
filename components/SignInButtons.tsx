"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const PROVEDORES = [
  { id: "google" as const, nome: "Google" },
  { id: "github" as const, nome: "GitHub" },
];

/**
 * Único ponto em que o cliente fala direto com o Supabase: iniciar o
 * OAuth exige redirecionar o navegador, o que o servidor não pode fazer
 * por ele. Leitura e escrita de dados continuam todas no servidor.
 */
export function SignInButtons({ next = "/" }: { next?: string }) {
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(provider: "google" | "github") {
    setErro(null);
    setCarregando(provider);
    try {
      const supabase = createSupabaseBrowser();
      const destino = new URL("/auth/callback", window.location.origin);
      destino.searchParams.set("next", next);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: destino.toString() },
      });
      if (error) throw error;
      // Em caso de sucesso o navegador sai desta página.
    } catch (e) {
      setCarregando(null);
      setErro(
        `Não deu para abrir o login com ${provider}: ${(e as Error).message}`
      );
    }
  }

  return (
    <div className="signin">
      {PROVEDORES.map((p) => (
        <button
          key={p.id}
          type="button"
          className="btn"
          onClick={() => entrar(p.id)}
          disabled={carregando !== null}
        >
          {carregando === p.id ? "Abrindo…" : `Entrar com ${p.nome}`}
        </button>
      ))}
      {erro && (
        <p className="form-msg err" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
