# Cine:Archive — contexto para agentes

Leia isto antes de mexer em qualquer coisa. O que está aqui não é derivável do código.

---

## O que é

Arquivo de cinema de curadoria. **37 obras fundamentais organizadas por escolas cinematográficas** (Expressionismo Alemão, Neorrealismo, Nouvelle Vague, Cinema Novo, New Hollywood, Idade de Ouro Japonesa, Novo Cinema Taiwanês, J-Horror, Dogma 95) — mais o **catálogo inteiro do TMDb** ao lado, para achar e registrar qualquer filme. Perfis com diário, notas em meias estrelas e reviews, estilo Letterboxd.

Next.js 15 (App Router) + Supabase (Postgres, Auth, RLS) + TMDb. TypeScript estrito. Sem Tailwind: CSS próprio em `app/globals.css`.

Repositório: `github.com/MarcusVSouza7/cine-archive` (público). Projeto Supabase ref: `jpsyqoohajbdojtfqtgo`.

---

## ⚠ O FATO MAIS IMPORTANTE

**Mais da metade do código nunca rodou.** Compila, passa `tsc --noEmit`, e os caminhos *sem* credencial foram verificados rota por rota. Nada além disso.

Nunca executado contra banco ou API real:

- as três migrações SQL
- auth OAuth (Google, GitHub), criação de perfil, `/conta`
- gravar/editar/apagar em `entries`
- a RPC `ensure_tmdb_film`
- as policies de RLS de fato recusando escrita alheia
- `discover`, `search` e `watch/providers` do TMDb
- a view `film_stats`
- carregamento de imagem de `image.tmdb.org` pelo `next/image`

**Não afirme que qualquer uma dessas coisas funciona.** Diga "escrito, não verificado". A lista de 19 verificações está em `docs/ROADMAP.md` §6.4.

---

## Onde o trabalho parou

Aguardando o usuário colar `DATABASE_URL` no `.env.local` (Session pooler, porta 5432). Quando ele disser que colou:

```sh
npm run db:migrate   # as 3 migrações, em ordem, com rollback
npm run db:seed      # 37 obras + 9 escolas
npm run db:check     # contagens + se a RLS está ligada nas 4 tabelas
```

Depois disso, só falta dele: token do TMDb (passo 6 do SETUP) e as OAuth apps no GitHub e Google (passos 9–12). Com o token no `.env.local`, rode `npm run tmdb:backfill`, `npm run seed:gen` e `npm run db:seed`.

### Pendência de segurança

O usuário colou a chave `sb_secret_...` (service_role) no chat em 2026-11-11. **Confirme com ele se já rotacionou** em Project Settings → API Keys. A `sb_publishable_` não precisa — é feita para ser pública.

---

## Comandos

```sh
npm run dev           # localhost:3000; funciona sem nenhuma credencial
npm run build
npm run typecheck
npm run db:status     # migrações aplicadas vs pendentes
npm run db:migrate
npm run db:seed
npm run db:check
npm run seed:gen      # data/*.json -> supabase/seed.sql
npm run tmdb:backfill -- --dry-run
```

---

## Invariantes de arquitetura

Decisões que parecem arbitrárias e não são. **Não as reverta sem conversar com o usuário.**

**1. `movement` é dado curado, nunca do TMDb.** O TMDb não tem o conceito de escola cinematográfica, e `keywords` é crowdsourced e inconsistente. Esse campo é o diferencial inteiro do projeto. Nenhuma obra entra no Arquivo por existir no TMDb.

**2. Duas populações em `films`.** `in_archive = true` é curadoria (slug editorial, escola, nota de arquivo, sinopse escrita). `in_archive = false` é stub nascido do TMDb (slug `tmdb-<id>`). `getFilms()` filtra pelo flag — o Arquivo nunca mistura.

**3. O catálogo do TMDb não é importado.** Os termos deles proíbem replicar a base. Navegação e busca batem na API ao vivo; linha local nasce só quando alguém interage com o filme. Se pedirem "importar tudo", isso é outro projeto (Postgres pago, job de sync, questão de licença) — levante a questão.

**4. As escalas de nota nunca se misturam.** Quatro números, quatro colunas, cada um rotulado: `archive_score` (0–100, editorial), `historical_relevance` (0–100, editorial), `film_stats.rating_avg` (0–5, leitores da casa), `vote_average` (0–10, TMDb). Somar ou mediar entre eles transforma o arquivo num agregador — é o que o projeto existe para não ser.

**5. `films` e `movements` não têm policy de escrita.** RLS ligada, zero policies de `insert/update/delete`. Nem usuário autenticado toca na curadoria. A única porta é `ensure_tmdb_film`, `SECURITY DEFINER`, que só cria linha nova, força `in_archive = false`, força o id `tmdb-<id>` (para não colidir com slug editorial) e não aceita campo editorial como parâmetro.

**6. A RLS é a autoridade, não o código.** Toda escrita passa por `lib/supabase/server.ts`, que leva o JWT do usuário. A aplicação não checa dono de linha. As validações nas Server Actions existem só para dar mensagem decente antes de o Postgres recusar.

**7. `TMDB_READ_TOKEN` nunca vai ao cliente, e não existe proxy aberto.** Só funções nomeadas em `lib/tmdb.ts`. Um `/api/tmdb/[...path]` seria a cota do usuário servida de graça a quem achasse o endpoint.

**8. `unstable_rethrow` nos catch de degradação.** `lib/auth.ts` e `lib/entries.ts` degradam para vazio quando o Supabase falha, mas rejogam os erros de controle do Next. Sem isso, o `DynamicServerError` de `cookies()` é engolido, a rota não é marcada como dinâmica, e a página anônima fica em cache para quem está logado. **Não remova.**

**9. Fonte dupla em `lib/data.ts`.** Lê Supabase quando as variáveis existem, os JSON em `data/` quando não existem, normalizando as duas para um tipo só. É o que faz `npm run dev` funcionar sem credencial.

**10. As placas tipográficas são fallback deliberado, não placeholder.** Quando `poster_path` é nulo — regra para obra muda — a placa entra no mesmo enquadramento 2:3, com tinta HSL derivada da escola. Não as substitua por caixa cinza ou ícone.

**11. Estado dos filtros vive na URL, não em `useState`.** Um recorte filtrado é link compartilhável. `router.replace`, não `push`.

**12. Tema único escuro, deliberado.** A sala de projeção. Sem `prefers-color-scheme`, sem toggle. Tudo pintado explicitamente para não herdar fundo do host.

**13. `Film` é subtipo de `CatalogItem`.** A intersecção estreita os campos nuláveis. Por isso `Film` passa onde se pede `CatalogItem`, sem conversão. Não achate os dois num tipo com tudo nulável.

---

## Identidade visual

Não improvise aqui — o usuário especificou a paleta e a tipografia no primeiro pedido.

| Token | Valor |
|---|---|
| `--ink` | `#0E0E10` |
| `--ink-2` | `#141418` |
| `--cream` | `#F4F4F0` |
| `--muted` | `#8F8A80` |
| `--faint` | `#605B54` |
| `--sepia` | `#A98253` — **único** acento |
| `--rule` | `rgba(244,244,240,.12)` |

Cormorant Garamond (display, via `next/font`) + Inter (dados, labels em caixa alta com tracking). Estrutura por **filetes**, não cartões: nenhum `border-radius`, nenhuma sombra. Seções usam coluna-rubrica fixa à esquerda. Números com `tabular-nums`.

---

## Armadilhas do ambiente

Windows 11, Git Bash + PowerShell disponíveis.

**Heredoc com apóstrofo quebra no Bash deste ambiente.** `cat > x <<'EOF'` com `'SF Mono'` ou `'Iowan Old Style'` no corpo falha com *unexpected EOF*. Use a ferramenta Write, ou escreva no scratchpad e `cat a >> b`.

**Não apague `.next` com o dev server rodando.** Isso invalida o mapa de módulos em memória e dá `MODULE_NOT_FOUND: Cannot find module './611.js'` com 500 nas rotas. Mate o servidor primeiro.

**`Invariant: no direct app page entry found for /x`** no build é cache velho. `rm -rf .next` e rebuild.

**PowerShell não tem `VAR=x comando`.** Por isso os scripts usam `node --env-file-if-exists=.env.local`. O sufixo `-if-exists` importa: sem ele, quem não tem o arquivo recebe erro de arquivo ausente em vez da mensagem que explica o que falta.

**`cat arquivo | clip`** coloca no clipboard do Windows. Útil para o usuário colar SQL no painel.

**Git avisa sobre LF→CRLF** em todo commit. É esperado, não é erro.

---

## Convenções

- **Identificadores e comentários em português** no código da aplicação (`garantirFilme`, `daArquivo`, `rodarArquivo`). Nomes de campo do banco em inglês snake_case, porque é o schema.
- **Comentários explicam *por que*, não *o quê*.** O código já diz o quê. Os comentários deste repo registram a razão de decisões que parecem estranhas — mantenha esse padrão.
- **Mensagem de commit:** assunto curto em uma linha, corpo explicando a decisão e o que a motivou. Termine com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Nenhum dado inventado.** O script de backfill deixa `tmdb_id` nulo e manda para revisão manual em vez de adivinhar — um id errado contamina cartaz, elenco e disponibilidade em silêncio. `archive_score` e `historical_relevance` são valores de demonstração e **isso está sinalizado na própria interface**; não os apresente como agregação.

---

## Como ajudar este usuário

- **Ele quer código entregue, não documento.** Já reclamou de receber plano quando esperava implementação: *"abri aqui o index.html e ainda não há nada do que foi combinado"*. Construa, depois explique.
- **Dê endereço exato, não descrição de tela.** Errei três vezes seguidas em que painel ele estava por descrever ("procure Authentication") em vez de dar o link. Monte a URL com o ref `jpsyqoohajbdojtfqtgo` e cole.
- **Verifique antes de afirmar.** O padrão aqui é rodar `curl`/`tsc`/`build` e mostrar a saída. Duas vezes isso pegou bug real: conexão duplicada na ficha de *Deus e o Diabo*, e os catch engolindo `DynamicServerError`.
- **Diga o que não funciona.** Não arredonde "escrito" para "pronto".
- Responda em português.

---

## Estrutura

```
app/            rotas. / /escolas /explorar /buscar /filmes/[slug]
                /u/[handle] /conta /login /auth/callback /sobre
components/     Poster, Filters, LogForm, StarRating, Stars,
                ReviewList, ProfileForm, SignInButtons, SourceBanner
lib/            data.ts (fonte dupla) · tmdb.ts · catalog.ts (ponte
                entre as duas populações) · query.ts (puro) · auth.ts
                entries.ts · types.ts · supabase/{server,client,middleware}
data/           films.json (37) · movements.json (9) — fonte editorial
supabase/       migrations/0001..0003 · seed.sql (gerado)
scripts/        db.mjs · generate-seed.mjs · backfill-tmdb-ids.mjs
docs/           ARCHITECTURE.md · ROADMAP.md · SETUP.md
index.html      protótipo v0, autossuficiente. É o que o GitHub Pages
                serve. Sai para a branch static-v0 quando houver deploy
```

**Dívidas conhecidas e plano completo: `docs/ROADMAP.md`.** Resumo do que falta e dói: sem direção nos filmes do catálogo (`getMovie` lê `credits.cast` e ignora `credits.crew`), sem `error.tsx`/`loading.tsx`, sem sitemap/robots/metadataBase, sem paginação no diário e nas reviews, **zero testes e zero CI**, e `.controls` com `top:57px` que precisa de teste em celular real.
