import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInButtons } from "@/components/SignInButtons";
import { authDisponivel, getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre para registrar o que viu, dar nota e escrever reviews.",
};

const MOTIVOS: Record<string, string> = {
  "sem-supabase": "O Supabase não está configurado neste ambiente.",
  "sem-codigo": "O provedor não devolveu um código de autorização.",
};

type Props = {
  searchParams: Promise<{ erro?: string; next?: string }>;
};

export default async function Login({ searchParams }: Props) {
  const { erro, next } = await searchParams;

  const perfil = await getCurrentProfile();
  if (perfil) redirect(perfil.onboarded ? `/u/${perfil.handle}` : "/conta");

  return (
    <section className="opener">
      <div>
        <p className="rubric" style={{ marginBottom: 20 }}>
          Arquivo de curadoria
        </p>
        <h1 className="display d-1">
          Entre para manter o seu <em>diário</em>.
        </h1>
      </div>

      <div className="opener-meta">
        <p className="lede">
          Registrar o que viu, dar nota em meias estrelas e escrever review. O
          acervo e as escolas continuam abertos sem login — a conta serve só
          para o que é seu.
        </p>

        {authDisponivel ? (
          <SignInButtons next={next ?? "/"} />
        ) : (
          <div className="banner" style={{ padding: 0 }}>
            <div>
              <strong>Indisponível</strong>
              <span>
                Login exige Supabase. Defina{" "}
                <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> em{" "}
                <code>.env.local</code>, rode as migrações de{" "}
                <code>supabase/migrations/</code> e habilite Google e GitHub em
                Authentication → Providers.
              </span>
            </div>
          </div>
        )}

        {erro && (
          <p className="form-msg err" role="alert">
            {MOTIVOS[erro] ?? erro}
          </p>
        )}

        <p className="body-s">
          Sem cadastro com senha: a conta vem do Google ou do GitHub, então não
          há senha para guardar nem recuperação para fazer.{" "}
          <Link href="/sobre" style={{ color: "var(--sepia)" }}>
            Sobre o arquivo
          </Link>
        </p>
      </div>
    </section>
  );
}
