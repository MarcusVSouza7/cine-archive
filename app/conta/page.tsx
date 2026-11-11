import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { ProfileForm } from "@/components/ProfileForm";
import { authDisponivel, getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sua conta",
  robots: { index: false },
};

type Props = {
  searchParams: Promise<{ "boas-vindas"?: string; next?: string }>;
};

export default async function Conta({ searchParams }: Props) {
  const { "boas-vindas": boasVindas, next } = await searchParams;

  if (!authDisponivel) redirect("/login");

  const perfil = await getCurrentProfile();
  if (!perfil) redirect("/login?next=/conta");

  return (
    <section className="band" style={{ borderTop: 0 }}>
      <div className="band-in">
        <div className="band-head">
          <p className="rubric">Conta</p>
          <span className="count">/u/{perfil.handle}</span>
        </div>

        <div className="stack">
          <h1 className="display d-2">
            {boasVindas ? "Escolha seu handle" : "Sua conta"}
          </h1>

          {boasVindas && (
            <p className="lede">
              O handle provisório <code>{perfil.handle}</code> saiu do seu
              e-mail. Troque por um que você queira ver na URL — depois disso o
              perfil fica em{" "}
              <code>/u/{perfil.handle === "" ? "seu-handle" : perfil.handle}</code>
              .
            </p>
          )}

          <ProfileForm profile={perfil} />

          <div className="conta-foot">
            <Link href={`/u/${perfil.handle}`}>Ver meu perfil público →</Link>
            {next && next !== "/conta" && (
              <Link href={next}>Voltar para onde eu estava →</Link>
            )}
            <form action={signOut}>
              <button type="submit" className="btn-ghost">
                Sair da conta
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
