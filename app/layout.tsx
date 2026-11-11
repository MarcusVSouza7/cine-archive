import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { authDisponivel, getCurrentProfile } from "@/lib/auth";
import "./globals.css";

/* As duas famílias do projeto, auto-hospedadas pelo next/font:
   sem requisição a fonts.googleapis.com em runtime, sem FOUT de rede. */
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cine:Archive",
    template: "%s · Cine:Archive",
  },
  description:
    "Arquivo de cinema de curadoria: obras fundamentais organizadas pelas escolas cinematográficas que as produziram.",
  openGraph: {
    title: "Cine:Archive",
    description:
      "Um catálogo do cinema organizado por escolas, não por algoritmo.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#0E0E10",
};

const NAV = [
  { href: "/explorar", label: "Arquivo" },
  { href: "/escolas", label: "Escolas" },
  { href: "/explorar?scope=tmdb", label: "Catálogo" },
  { href: "/buscar", label: "Buscar" },
  { href: "/sobre", label: "Sobre" },
];

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const perfil = await getCurrentProfile();

  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <header className="masthead">
          <div className="masthead-in">
            <Link href="/" className="wordmark">
              Cine<em>:</em>Archive
            </Link>
            <nav className="nav" aria-label="Seções">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href}>
                  {n.label}
                </Link>
              ))}
            </nav>

            {authDisponivel &&
              (perfil ? (
                <Link href={`/u/${perfil.handle}`} className="me">
                  {perfil.avatarUrl ? (
                    <Image
                      src={perfil.avatarUrl}
                      alt=""
                      width={22}
                      height={22}
                      className="avatar"
                    />
                  ) : (
                    <span className="avatar avatar-blank" aria-hidden="true" />
                  )}
                  <span className="me-handle">{perfil.handle}</span>
                </Link>
              ) : (
                <Link href="/login" className="me">
                  <span className="me-handle">Entrar</span>
                </Link>
              ))}
          </div>
        </header>

        <div className="shell">{children}</div>

        <footer className="closer">
          <div className="in">
            <p>Cine:Archive — arquivo de curadoria</p>
            <p className="attr">
              Este produto usa a API do TMDb, mas não é endossado nem
              certificado pelo TMDb. Dados de disponibilidade fornecidos por
              JustWatch.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
