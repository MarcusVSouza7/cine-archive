#!/usr/bin/env node
/**
 * Roda SQL no Postgres do Supabase.
 *
 * Existe porque as chaves de API falam com a API REST e nao executam DDL:
 * migracao e seed precisam de conexao Postgres de verdade.
 *
 * Uso:
 *   npm run db:migrate          aplica as migracoes pendentes, em ordem
 *   npm run db:seed             aplica supabase/seed.sql (idempotente)
 *   npm run db:status           o que ja foi aplicado e o que falta
 *   npm run db:check            contagens do acervo
 *
 * Precisa de DATABASE_URL no .env.local. A senha fica no arquivo, que
 * esta no .gitignore — nunca passa pelo terminal nem por log.
 */

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import pg from "pg";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");
const DIR_MIGRACOES = join(RAIZ, "supabase", "migrations");

const URL_DB = process.env.DATABASE_URL;

if (!URL_DB) {
  console.error(
    "\nDATABASE_URL nao definida.\n\n" +
      "No painel do Supabase: Project Settings > Database > Connection string\n" +
      "Aba URI, modo *Session pooler* (porta 5432). Troque [YOUR-PASSWORD]\n" +
      "pela senha do banco e acrescente ao .env.local:\n\n" +
      "  DATABASE_URL=postgresql://postgres.<ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres\n"
  );
  process.exit(1);
}

/** Sem isto o Postgres do Supabase recusa a conexao TLS. */
const cliente = new pg.Client({
  connectionString: URL_DB,
  ssl: { rejectUnauthorized: false },
  // DDL longo em conexao lenta: o default de 30s e curto demais
  statement_timeout: 120_000,
});

/** Mascara a senha antes de qualquer impressao. */
function hostSeguro(url) {
  try {
    const u = new global.URL(url);
    return `${u.hostname}:${u.port}${u.pathname} (usuario ${u.username})`;
  } catch {
    return "(string de conexao ilegivel)";
  }
}

/* ============================================================
   controle de migracoes
   ============================================================ */

const TABELA = `
create table if not exists public.schema_migrations (
  arquivo     text primary key,
  aplicada_em timestamptz not null default now()
)`;

async function jaAplicadas() {
  await cliente.query(TABELA);
  const { rows } = await cliente.query(
    "select arquivo from public.schema_migrations"
  );
  return new Set(rows.map((r) => r.arquivo));
}

async function listarMigracoes() {
  const todas = await readdir(DIR_MIGRACOES);
  // 0001_, 0002_, 0003_... a ordem lexicografica e a ordem correta
  return todas.filter((f) => f.endsWith(".sql")).sort();
}

/**
 * Roda um arquivo. Envolve em transacao quando ele nao traz a sua —
 * DDL no Postgres e transacional, entao falha no meio nao deixa o schema
 * pela metade.
 */
async function rodarArquivo(caminho, rotulo) {
  const sql = await readFile(caminho, "utf8");
  const temTransacaoPropria = /^\s*begin\s*;/im.test(sql);

  const t0 = Date.now();
  try {
    if (!temTransacaoPropria) await cliente.query("begin");
    await cliente.query(sql);
    if (!temTransacaoPropria) await cliente.query("commit");
    console.log(`  ok  ${rotulo}  (${Date.now() - t0}ms)`);
    return true;
  } catch (e) {
    if (!temTransacaoPropria) {
      try {
        await cliente.query("rollback");
      } catch {
        /* a conexao pode ter caido junto */
      }
    }
    console.error(`\n  FALHOU em ${rotulo}\n`);
    console.error(`  ${e.message}`);
    if (e.position) console.error(`  posicao no SQL: ${e.position}`);
    if (e.hint) console.error(`  dica do Postgres: ${e.hint}`);
    if (e.detail) console.error(`  detalhe: ${e.detail}`);
    return false;
  }
}

/* ============================================================
   comandos
   ============================================================ */

async function migrar() {
  const aplicadas = await jaAplicadas();
  const arquivos = await listarMigracoes();
  const pendentes = arquivos.filter((f) => !aplicadas.has(f));

  if (pendentes.length === 0) {
    console.log(`Nada pendente. ${arquivos.length} migracao(oes) ja aplicada(s).`);
    return true;
  }

  console.log(`${pendentes.length} migracao(oes) pendente(s):\n`);
  for (const arquivo of pendentes) {
    const ok = await rodarArquivo(join(DIR_MIGRACOES, arquivo), arquivo);
    if (!ok) {
      console.error(
        `\nParei em ${arquivo}. As anteriores continuam aplicadas;\n` +
          `corrija o arquivo e rode de novo — ele retoma daqui.\n`
      );
      return false;
    }
    await cliente.query(
      "insert into public.schema_migrations (arquivo) values ($1) on conflict do nothing",
      [arquivo]
    );
  }
  return true;
}

async function semear() {
  const caminho = join(RAIZ, "supabase", "seed.sql");
  console.log("Semeando o acervo:\n");
  return rodarArquivo(caminho, "seed.sql");
}

async function status() {
  const aplicadas = await jaAplicadas();
  const arquivos = await listarMigracoes();
  console.log("Migracoes:\n");
  for (const a of arquivos) {
    console.log(`  ${aplicadas.has(a) ? "aplicada " : "PENDENTE "} ${a}`);
  }
}

async function conferir() {
  const perguntas = [
    ["escolas", "select count(*)::int n from public.movements"],
    ["obras do arquivo", "select count(*)::int n from public.films where in_archive"],
    ["stubs do TMDb", "select count(*)::int n from public.films where not in_archive"],
    ["com tmdb_id", "select count(*)::int n from public.films where tmdb_id is not null"],
    ["com cartaz", "select count(*)::int n from public.films where poster_path is not null"],
    ["perfis", "select count(*)::int n from public.profiles"],
    ["entradas de log", "select count(*)::int n from public.entries"],
  ];

  console.log("Acervo:\n");
  for (const [rotulo, sql] of perguntas) {
    try {
      const { rows } = await cliente.query(sql);
      console.log(`  ${String(rows[0].n).padStart(5)}  ${rotulo}`);
    } catch (e) {
      console.log(`  ----   ${rotulo}  (${e.message.split("\n")[0]})`);
    }
  }

  // RLS ligada em tudo que importa? Esta e a checagem que eu nao conseguia
  // fazer sem conexao, e e a que protege os dados dos usuarios.
  const { rows: rls } = await cliente.query(`
    select c.relname tabela, c.relrowsecurity ligada,
           (select count(*) from pg_policies p
             where p.schemaname='public' and p.tablename=c.relname)::int policies
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r'
       and c.relname in ('movements','films','profiles','entries')
     order by c.relname`);

  console.log("\nRLS:\n");
  for (const r of rls) {
    const marca = r.ligada ? "on " : "OFF";
    console.log(`  ${marca}  ${r.tabela.padEnd(10)} ${r.policies} policy(ies)`);
  }
  const semRls = rls.filter((r) => !r.ligada);
  if (semRls.length) {
    console.log(
      `\n  ATENCAO: RLS desligada em ${semRls.map((r) => r.tabela).join(", ")}`
    );
  }
}

/* ============================================================
   execucao
   ============================================================ */

const comando = process.argv[2] ?? "status";

console.log(`\nConectando em ${hostSeguro(URL_DB)}\n`);

try {
  await cliente.connect();
} catch (e) {
  console.error(`Nao conectou: ${e.message}\n`);
  console.error(
    "Causas comuns:\n" +
      "  - senha errada na DATABASE_URL (o [YOUR-PASSWORD] nao foi trocado)\n" +
      "  - usou o Transaction pooler (porta 6543): migracao precisa da 5432\n" +
      "  - projeto pausado por inatividade: despause no painel\n"
  );
  process.exit(1);
}

let ok = true;
try {
  if (comando === "migrate") ok = await migrar();
  else if (comando === "seed") ok = await semear();
  else if (comando === "check") await conferir();
  else if (comando === "status") await status();
  else {
    console.error(`Comando desconhecido: ${comando}`);
    console.error("Use: migrate | seed | status | check");
    ok = false;
  }
} finally {
  await cliente.end();
}

console.log("");
process.exit(ok ? 0 : 1);
