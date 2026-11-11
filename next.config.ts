import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    // Unico host externo de imagem do projeto. Pôsteres e backdrops do TMDb.
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      // avatares vindos dos provedores OAuth (fase 4)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  experimental: {
    // o acervo muda pouco: vale cachear o payload das paginas de leitura
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default config;
