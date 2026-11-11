#!/usr/bin/env node
/**
 * Preenche tmdb_id e poster_path em data/films.json.
 *
 * Nao adivinha: casos de baixa confianca ficam com tmdb_id nulo e saem
 * num relatorio para revisao manual. Um tmdb_id errado contamina poster,
 * elenco e providers daquela obra para sempre, entao um campo vazio e
 * sempre melhor que um palpite.
 *
 * Uso:
 *   TMDB_READ_TOKEN=... node scripts/backfill-tmdb-ids.mjs
 *   TMDB_READ_TOKEN=... node scripts/backfill-tmdb-ids.mjs --dry-run
 *   TMDB_READ_TOKEN=... node scripts/backfill-tmdb-ids.mjs --only caligari-1920
 *
 * Sem dependencias: fetch global e node:fs apenas. Requer Node 18+.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ARQUIVO = resolve(AQUI, "..", "data", "films.json");
const RELATORIO = resolve(AQUI, "..", "data", "tmdb-revisao.json");

const TOKEN = process.env.TMDB_READ_TOKEN;
const DRY = process.argv.includes("--dry-run");
const SO = (() => {
  const i = process.argv.indexOf("--only");
  return i !== -1 ? process.argv[i + 1] : null;
})();

if (!TOKEN) {
  console.error(
    "TMDB_READ_TOKEN nao definido.\n" +
    "Pegue o token de leitura v4 em themoviedb.org > Settings > API e rode:\n" +
    "  TMDB_READ_TOKEN=... node scripts/backfill-tmdb-ids.mjs"
  );
  process.exit(1);
}

/* ---------------- TMDb ---------------- */

const PAUSA_MS = 250; // ~4 req/s: folgado para o limite do TMDb
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(caminho, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${caminho}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  if (res.status === 429) {
    const espere = Number(res.headers.get("retry-after") || 2);
    console.warn(`  429 do TMDb, aguardando ${espere}s`);
    await espera(espere * 1000);
    return tmdb(caminho, params);
  }
  if (!res.ok) throw new Error(`TMDb ${res.status} em ${caminho}: ${await res.text()}`);
  return res.json();
}

/* ---------------- casamento de titulos ---------------- */

/** Minusculas, sem acento, sem pontuacao, espacos colapsados. */
function normalizar(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pontua um candidato de 0 a 100.
 * O ano pesa mais que o titulo: titulo de filme antigo varia muito entre
 * mercados, ano de lancamento nao.
 */
function pontuar(filme, cand) {
  let p = 0;
  const alvos = [normalizar(filme.originalTitle), normalizar(filme.title)];
  const deles = [normalizar(cand.original_title), normalizar(cand.title)];

  if (alvos.some((a) => deles.includes(a))) p += 55;
  else if (alvos.some((a) => deles.some((d) => d.includes(a) || a.includes(d)))) p += 30;

  const ano = Number((cand.release_date || "").slice(0, 4));
  if (ano === filme.year) p += 40;
  else if (Math.abs(ano - filme.year) === 1) p += 28;
  else if (Math.abs(ano - filme.year) <= 3) p += 8;
  else p -= 25;

  // desempate fraco, so para ordenar entre candidatos ja plausiveis
  p += Math.min(5, (cand.vote_count || 0) / 400);

  return Math.round(p);
}

async function localizar(filme) {
  const vistos = new Map();

  const consultas = [
    { query: filme.originalTitle, primary_release_year: filme.year },
    { query: filme.title, primary_release_year: filme.year },
    { query: filme.originalTitle },
    { query: filme.title },
  ];

  for (const q of consultas) {
    const r = await tmdb("/search/movie", { ...q, include_adult: false, language: "pt-BR" });
    for (const c of r.results || []) if (!vistos.has(c.id)) vistos.set(c.id, c);
    await espera(PAUSA_MS);
    // ja achou casamento forte de titulo e ano? para de consultar
    if ([...vistos.values()].some((c) => pontuar(filme, c) >= 90)) break;
  }

  const ranque = [...vistos.values()]
    .map((c) => ({ cand: c, pontos: pontuar(filme, c) }))
    .sort((a, b) => b.pontos - a.pontos);

  return ranque;
}

/* ---------------- execucao ---------------- */

const filmes = JSON.parse(readFileSync(ARQUIVO, "utf8"));
const alvo = SO ? filmes.filter((f) => f.id === SO) : filmes;

if (SO && alvo.length === 0) {
  console.error(`Nenhum filme com id "${SO}".`);
  process.exit(1);
}

const LIMITE_ACEITE = 85;   // abaixo disso nao grava
const LIMITE_MARGEM = 12;   // 2o colocado perto demais -> ambiguo

const revisao = [];
let gravados = 0, pulados = 0;

console.log(`Backfill de ${alvo.length} obra(s)${DRY ? " [dry-run]" : ""}\n`);

for (const filme of alvo) {
  if (filme.tmdb_id) {
    console.log(`·  ${filme.id} — ja tem tmdb_id ${filme.tmdb_id}, mantido`);
    continue;
  }

  let ranque;
  try {
    ranque = await localizar(filme);
  } catch (e) {
    console.error(`!  ${filme.id} — falha na busca: ${e.message}`);
    revisao.push({ id: filme.id, motivo: "erro de rede", erro: e.message });
    pulados++;
    continue;
  }

  const melhor = ranque[0];
  const segundo = ranque[1];

  if (!melhor || melhor.pontos < LIMITE_ACEITE) {
    console.log(`?  ${filme.id} — sem candidato confiavel (melhor: ${melhor?.pontos ?? "nenhum"})`);
    revisao.push({
      id: filme.id,
      motivo: "confianca baixa",
      busca: { titulo: filme.originalTitle, ano: filme.year },
      candidatos: ranque.slice(0, 4).map((r) => ({
        tmdb_id: r.cand.id, titulo: r.cand.title,
        original: r.cand.original_title, ano: (r.cand.release_date || "").slice(0, 4),
        pontos: r.pontos,
      })),
    });
    pulados++;
    continue;
  }

  if (segundo && melhor.pontos - segundo.pontos < LIMITE_MARGEM) {
    console.log(`?  ${filme.id} — ambiguo: ${melhor.pontos} vs ${segundo.pontos}`);
    revisao.push({
      id: filme.id,
      motivo: "ambiguo",
      busca: { titulo: filme.originalTitle, ano: filme.year },
      candidatos: [melhor, segundo].map((r) => ({
        tmdb_id: r.cand.id, titulo: r.cand.title,
        original: r.cand.original_title, ano: (r.cand.release_date || "").slice(0, 4),
        pontos: r.pontos,
      })),
    });
    pulados++;
    continue;
  }

  filme.tmdb_id = melhor.cand.id;
  filme.poster_path = melhor.cand.poster_path || null;
  filme.backdrop_path = melhor.cand.backdrop_path || null;
  gravados++;

  const marca = filme.poster_path ? "" : "  (sem poster no TMDb -> placa tipografica)";
  console.log(`ok ${filme.id} — ${melhor.cand.id} "${melhor.cand.original_title}" ${melhor.pontos}pts${marca}`);
}

if (!DRY) {
  writeFileSync(ARQUIVO, JSON.stringify(filmes, null, 1) + "\n", "utf8");
  writeFileSync(RELATORIO, JSON.stringify(revisao, null, 2) + "\n", "utf8");
}

console.log(`\n${gravados} gravado(s), ${pulados} para revisao manual.`);
if (pulados && !DRY) {
  console.log(`Relatorio em data/tmdb-revisao.json — resolva a mao e rode de novo com --only <id>.`);
}
