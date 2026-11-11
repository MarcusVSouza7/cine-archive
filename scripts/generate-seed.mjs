#!/usr/bin/env node
/**
 * Gera supabase/seed.sql a partir de data/movements.json e data/films.json.
 *
 * O JSON continua sendo a fonte de verdade editorial; o SQL e artefato.
 * Idempotente: usa on conflict do update, pode rodar quantas vezes quiser.
 *
 * Uso:  node scripts/generate-seed.mjs
 *
 * Sem dependencias. Requer Node 18+.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const raiz = (...p) => resolve(AQUI, "..", ...p);

const movements = JSON.parse(readFileSync(raiz("data", "movements.json"), "utf8"));
const films = JSON.parse(readFileSync(raiz("data", "films.json"), "utf8"));

/* ---------------- escaping ---------------- */

/** Literal SQL. Aspas simples dobradas; null quando ausente. */
const txt = (v) =>
  v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

const num = (v) => (v === null || v === undefined || v === "" ? "NULL" : String(Number(v)));
const bool = (v) => (v ? "true" : "false");

/** text[] do Postgres a partir de array JS. */
const arr = (a) =>
  !Array.isArray(a) || a.length === 0
    ? "'{}'"
    : `array[${a.map(txt).join(", ")}]::text[]`;

/* ---------------- validacao antes de gerar ---------------- */

const erros = [];
const idsEscolas = new Set(movements.map((m) => m.id));

for (const m of movements) {
  if (!/^[a-z0-9-]+$/.test(m.id)) erros.push(`escola "${m.id}": id fora do formato slug`);
  if (m.hue < 0 || m.hue > 360) erros.push(`escola "${m.id}": hue ${m.hue} fora de 0-360`);
}
for (const f of films) {
  if (!/^[a-z0-9-]+$/.test(f.id)) erros.push(`filme "${f.id}": id fora do formato slug`);
  if (!idsEscolas.has(f.movement)) erros.push(`filme "${f.id}": escola "${f.movement}" nao existe`);
  if (f.year < 1888 || f.year > 2100) erros.push(`filme "${f.id}": ano ${f.year} implausivel`);
  if (f.rating != null && (f.rating < 0 || f.rating > 100)) erros.push(`filme "${f.id}": nota fora de 0-100`);
}
const vistos = new Set();
for (const f of films) {
  if (vistos.has(f.id)) erros.push(`filme "${f.id}": id duplicado`);
  vistos.add(f.id);
}

if (erros.length) {
  console.error("Seed nao gerado. Corrija os dados:\n" + erros.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

/* ---------------- geracao ---------------- */

const linhas = [];
const p = (s = "") => linhas.push(s);

p("-- ============================================================");
p("-- GERADO por scripts/generate-seed.mjs — nao editar a mao.");
p("-- Fonte: data/movements.json e data/films.json");
p(`-- ${movements.length} escolas, ${films.length} obras`);
p("-- ============================================================");
p();
p("begin;");
p();

p("-- ---------------- escolas ----------------");
p("insert into public.movements");
p("  (id, name, region, years, abstract, aesthetic, key_directors, hue, sat, sort_order)");
p("values");
p(
  movements
    .map((m, i) =>
      "  (" +
      [
        txt(m.id), txt(m.name), txt(m.region), txt(m.years),
        txt(m.abstract), txt(m.aesthetic), arr(m.keyDirectors),
        num(m.hue), txt(m.sat), String(i),
      ].join(", ") +
      ")"
    )
    .join(",\n")
);
p("on conflict (id) do update set");
p("  name = excluded.name,");
p("  region = excluded.region,");
p("  years = excluded.years,");
p("  abstract = excluded.abstract,");
p("  aesthetic = excluded.aesthetic,");
p("  key_directors = excluded.key_directors,");
p("  hue = excluded.hue,");
p("  sat = excluded.sat,");
p("  sort_order = excluded.sort_order;");
p();

p("-- ---------------- obras ----------------");
p("-- tmdb_id, poster_path e backdrop_path vem do backfill, nao daqui:");
p("-- scripts/backfill-tmdb-ids.mjs preenche o JSON e o seed os propaga.");
p("-- O campo watch do JSON NAO e semeado: em v1 a disponibilidade vem");
p("-- de /movie/{id}/watch/providers do TMDb, por regiao.");
p("insert into public.films");
p("  (id, tmdb_id, title, original_title, year, country, director, runtime,");
p("   movement_id, archive_score, historical_relevance, synopsis, archival,");
p("   poster_path, backdrop_path)");
p("values");
p(
  films
    .map((f) =>
      "  (" +
      [
        txt(f.id), num(f.tmdb_id), txt(f.title), txt(f.originalTitle),
        num(f.year), txt(f.country), txt(f.director), num(f.runtime),
        txt(f.movement), num(f.rating), num(f.relevance),
        txt(f.synopsis), bool(f.archival),
        txt(f.poster_path ?? null), txt(f.backdrop_path ?? null),
      ].join(", ") +
      ")"
    )
    .join(",\n")
);
p("on conflict (id) do update set");
p("  tmdb_id = coalesce(excluded.tmdb_id, public.films.tmdb_id),");
p("  title = excluded.title,");
p("  original_title = excluded.original_title,");
p("  year = excluded.year,");
p("  country = excluded.country,");
p("  director = excluded.director,");
p("  runtime = excluded.runtime,");
p("  movement_id = excluded.movement_id,");
p("  archive_score = excluded.archive_score,");
p("  historical_relevance = excluded.historical_relevance,");
p("  synopsis = excluded.synopsis,");
p("  archival = excluded.archival,");
p("  poster_path = coalesce(excluded.poster_path, public.films.poster_path),");
p("  backdrop_path = coalesce(excluded.backdrop_path, public.films.backdrop_path);");
p();
p("commit;");
p();

mkdirSync(raiz("supabase"), { recursive: true });
writeFileSync(raiz("supabase", "seed.sql"), linhas.join("\n"), "utf8");

const comTmdb = films.filter((f) => f.tmdb_id).length;
console.log(`supabase/seed.sql gerado: ${movements.length} escolas, ${films.length} obras.`);
console.log(`tmdb_id preenchido em ${comTmdb}/${films.length} — rode scripts/backfill-tmdb-ids.mjs para o resto.`);
