import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { authDisponivel, createSupabaseServer } from "@/lib/supabase/server";

/**
 * Volta do provedor OAuth: troca o code pela sessão.
 *
 * `next` só é aceito como caminho relativo — um `next` absoluto vindo da
 * query transformaria este endpoint em redirect aberto, que é como se
 * monta phishing em cima do domínio de outra pessoa.
 */
function destinoSeguro(bruto: string | null): string {
  if (!bruto) return "/";
  if (!bruto.startsWith("/") || bruto.startsWith("//")) return "/";
  return bruto;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const erroProvedor = searchParams.get("error_description");
  const next = destinoSeguro(searchParams.get("next"));

  if (!authDisponivel) {
    return NextResponse.redirect(`${origin}/login?erro=sem-supabase`);
  }

  if (erroProvedor) {
    return NextResponse.redirect(
      `${origin}/login?erro=${encodeURIComponent(erroProvedor)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=sem-codigo`);
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?erro=${encodeURIComponent(error.message)}`
    );
  }

  // Primeiro login: o handle ainda é o provisório do trigger, então
  // manda escolher um antes de qualquer outra coisa.
  const perfil = await getCurrentProfile();
  if (perfil && !perfil.onboarded) {
    return NextResponse.redirect(
      `${origin}/conta?boas-vindas=1&next=${encodeURIComponent(next)}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
