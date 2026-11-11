# Arquitetura — Cine:Archive v1

Documento de decisão para a passagem do protótipo estático para aplicação com catálogo vindo do TMDb e sistema de perfis com reviews.

Estado atual: página única estática, 37 obras em JSON embutido, hospedada no GitHub Pages.

---

## Decisões travadas

| Eixo | Decisão |
|---|---|
| Stack | Next.js (App Router) na Vercel + Supabase (Postgres, Auth, RLS) |
| Catálogo | Curado por você. TMDb enriquece — não define o acervo |
| Perfil v1 | Log com data, nota em meias estrelas, review em texto, página de diário |
| Auth | OAuth Google + GitHub, via Supabase |

### O que essas decisões custam

**O GitHub Pages sai.** Pages serve arquivos estáticos; não há servidor para guardar a chave do TMDb nem banco para os reviews. A aplicação passa a viver na Vercel.

Para o endereço atual não morrer durante a construção, mova o protótipo para uma branch própria e aponte o Pages para ela:

```sh
git checkout -b static-v0 main
git push -u origin static-v0
gh api -X PUT repos/MarcusVSouza7/cine-archive/pages -f "source[branch]=static-v0" -f "source[path]=/"
git checkout main
```

A partir daí `main` recebe a aplicação e `static-v0` continua servindo o protótipo em `marcusvsouza7.github.io/cine-archive/`.

---

## O ponto de design que sustenta o resto

O TMDb não tem o conceito de **escola cinematográfica**. Não há campo, não há tag equivalente, e `keywords` é crowdsourced e inconsistente. Esse campo é o diferencial inteiro do projeto.

Logo: `movement` é dado curado seu, mora no seu banco, e é a chave estrangeira que sustenta a seção de Escolas, o filtro do explorador e o bloco de conexões da ficha. O TMDb entra depois, como camada de enriquecimento ligada por `tmdb_id`.

```
movements  (seu, curado)  ──┐
                            ├──>  films  ──  tmdb_id  ──>  TMDb (pôster, elenco, providers)
entries    (dos usuários) ──┘
```

Consequência prática: nenhum filme aparece no site porque existe no TMDb. Ele aparece porque você catalogou, atribuiu uma escola e escreveu a nota de arquivo. O TMDb não pode introduzir obra nova no acervo.

### As duas notas, agora que existem usuários

Hoje `rating` e `relevance` são valores de demonstração. Com usuários logando e avaliando, aparecem três números distintos — e misturá-los destruiria o sentido de cada um:

| Número | Origem | Papel |
|---|---|---|
| `archive_score` | Você, editorial | A nota do arquivo. Não é média de nada |
| `historical_relevance` | Você, editorial | Quanto a obra alterou o que vinha depois |
| `film_stats.rating_avg` | Média dos `entries` | O que os usuários acharam |

Manter o editorial separado da média da comunidade é exatamente o que o Letterboxd não faz, e é o que mantém isto um arquivo de curadoria. A ficha mostra os três, rotulados.

### O que acontece com as placas tipográficas

Elas deixam de ser contorno de CSP e passam a ser **fallback deliberado**: quando `poster_path` é nulo — e para obra de 1920 isso acontece — a placa entra no lugar, no mesmo enquadramento 2:3. A identidade visual sobrevive à chegada dos cartazes reais, e obra sem cartaz no TMDb não vira buraco na grade.

---

## Modelo de dados

Quatro tabelas em v1. Migração em `supabase/migrations/0001_init.sql`.

### `profiles`
Espelha `auth.users`, criada por trigger no signup. `handle` é `citext` com regex `^[a-z0-9_]{3,24}$` — é o que aparece na URL.

### `movements`
Os 9 registros de `data/movements.json`, incluindo `hue`/`sat` (a tinta da placa daquela escola continua vindo do banco).

### `films`
Os 37 registros de `data/films.json`, mais:

- `tmdb_id integer unique` — a ligação. Nulo até o backfill rodar
- `poster_path`, `backdrop_path` — **cacheados** do TMDb
- `tmdb_synced_at` — quando o cache foi preenchido

O cache de `poster_path` é o que impede a grade de bater no TMDb. Uma página de explorador com 37 pôsteres faz **zero** requisição ao TMDb; só a ficha individual busca elenco e providers.

### `entries`
O log. **Uma linha por par (perfil, filme)**, carregando data, contagem de revisões, nota, curtida e review.

```
unique (profile_id, film_id)
rating numeric(2,1) check (rating between 0.5 and 5.0 and rating*2 = floor(rating*2))
```

**Trade-off assumido:** o Letterboxd permite várias entradas de diário para o mesmo filme, cada uma com sua data e sua resenha. Aqui há uma só, com `watch_count` para revisões. É o corte mínimo que já é útil e evita decidir agora como exibir cinco resenhas suas do mesmo filme.

Para virar diário de verdade depois: remover o `unique`, adicionar `logged_at` e trocar os `upsert` por `insert`. É a única mudança não aditiva previsível neste schema — toda consulta neste documento foi escrita para sobreviver a ela.

### `film_stats`
View agregando `entries` por filme: média, contagem de notas, de logs, de curtidas, de reviews. Declarada com `security_invoker = on`; como a política de leitura de `entries` é pública, a média conta todos.

### RLS, em uma frase cada

- `movements`, `films` — leitura pública; escrita só por `service_role` (seed e backfill). Nenhuma política de escrita existe, então nem usuário autenticado consegue tocar no acervo.
- `profiles` — leitura pública; dono escreve o próprio.
- `entries` — leitura pública (reviews são públicos em v1); dono insere, atualiza e apaga só o próprio, checado por `auth.uid() = profile_id` em `using` **e** `with check`.

---

## Camada TMDb

### A chave nunca vai ao cliente

`TMDB_READ_TOKEN` é variável de ambiente só de servidor. Todo acesso ao TMDb acontece em Server Component ou route handler. Nada de `NEXT_PUBLIC_`.

### Não construa proxy aberto

Um `/api/tmdb/[...path]` que repassa qualquer caminho é sua cota servida de graça para quem achar o endpoint. Em vez disso, funções nomeadas em `lib/tmdb.ts`, uma por necessidade concreta:

```ts
getMovie(tmdbId)        // ficha + credits + watch/providers, em uma chamada
searchMovie(query, year) // só para o backfill e o painel de curadoria
getImageBase()           // /configuration, cacheado por muito tempo
```

Autenticação por header, com o token v4 — ele funciona nos endpoints v3 e não vaza em log de URL:

```ts
fetch(`https://api.themoviedb.org/3/movie/${id}?append_to_response=credits,watch/providers&language=pt-BR`, {
  headers: { Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}` },
  next: { revalidate: 86_400 },
})
```

`append_to_response` resolve ficha, elenco e onde assistir em **uma** requisição em vez de três.

### Onde assistir, de verdade

O campo `watch` de hoje é valor de demonstração. `/movie/{id}/watch/providers` devolve disponibilidade real por região — use `BR`. É dado do JustWatch e **exige atribuição a eles**, além da atribuição ao TMDb.

### Cache em três camadas

1. `poster_path` e `backdrop_path` no Postgres — grade e listas nunca chamam o TMDb
2. `next: { revalidate: 86400 }` nas chamadas de ficha — uma por filme por dia
3. `next/image` com `remotePatterns` para `image.tmdb.org`, servindo em `w342` na grade e `w500` na ficha

Tamanhos de pôster do TMDb: `w92 w154 w185 w342 w500 w780 original`. Nunca sirva `original` numa grade.

### Atribuição é obrigatória

Os termos do TMDb exigem o aviso e o logo. No rodapé, com a tipografia do projeto:

> Este produto usa a API do TMDb, mas não é endossado nem certificado pelo TMDb.
> Dados de disponibilidade fornecidos por JustWatch.

Os termos também proíbem replicar o TMDb como banco concorrente. Cachear pôster e ficha das 37 obras do seu acervo está dentro do uso previsto; espelhar o catálogo deles não está.

---

## Rotas

```
/                        home editorial
/escolas                 as 9 correntes
/escolas/[slug]          verbete + obras da corrente
/explorar                filtros e rankings em searchParams (URL compartilhável)
/filmes/[slug]           ficha: dados curados + TMDb + reviews + seu log
/u/[handle]              perfil: diário, notas, contagens
/u/[handle]/diario       log completo, paginado
/login                   OAuth Google + GitHub
/conta                   handle, nome, bio
```

**Detalhe que custa uma hora se descoberto tarde:** não use `app/@[handle]`. No App Router, `@` como prefixo de pasta declara *parallel route slot*, não segmento dinâmico. Daí o `/u/[handle]`.

Os filtros do explorador vão para `searchParams`, não para estado de cliente — um ranking filtrado passa a ser link que você pode mandar para alguém.

---

## Auth

Supabase Auth com Google e GitHub. Nenhuma senha armazenada, nenhum fluxo de recuperação para construir.

Fluxo: `signInWithOAuth` → callback em `/auth/callback` → trigger `handle_new_user` cria o `profiles` com handle provisório derivado do e-mail mais sufixo do uuid (garante unicidade e os 3 caracteres mínimos) → primeiro acesso leva a `/conta` para escolher o handle definitivo.

Sessão via `@supabase/ssr` com cookies, para Server Component ler usuário sem round-trip no cliente.

---

## Fases

**1 — Fundação.** Projeto Supabase, rodar `0001_init.sql`, semear `movements` e `films` a partir dos JSON atuais. Nenhuma interface ainda.

**2 — Backfill do TMDb.** `scripts/backfill-tmdb-ids.mjs` preenche `tmdb_id` e `poster_path`. Casos ambíguos vão para revisão manual, não são adivinhados.

**3 — Leitura.** Next.js reproduzindo o site atual, agora vindo do banco, com pôsteres reais e placa como fallback. Aqui o Pages já pode sair de `main`.

**4 — Auth e log.** OAuth, `profiles`, `/conta`, botão de log com data e nota na ficha.

**5 — Reviews e diário.** Campo de review, `/u/[handle]`, reviews na ficha, `film_stats` na interface.

Fase 3 é o ponto de não-retorno da hospedagem. Até lá, dá para desistir sem custo.

---

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # só servidor: seed e backfill
TMDB_READ_TOKEN=                # só servidor: token de leitura v4
```

`SUPABASE_SERVICE_ROLE_KEY` ignora RLS por completo. Nunca em Client Component, nunca com prefixo `NEXT_PUBLIC_`, nunca em commit.

---

## Riscos conhecidos

**Nota de arquivo é opinião assinada.** Hoje é valor de demonstração sinalizado. Quando houver usuários, `archive_score` precisa ou de proveniência citada por obra, ou de ser assumida explicitamente como editorial. Número sem origem ao lado de média da comunidade é lido como se fosse agregação.

**Review pública sem moderação.** Em v1 toda review é pública e não há denúncia nem bloqueio. Aceitável enquanto o cadastro é restrito; vira problema no dia em que abrir.

**`unique (profile_id, film_id)`.** A única mudança não aditiva prevista. Decidida com os olhos abertos.

**Spam de signup.** OAuth reduz, não elimina. Se abrir ao público, `entries` precisa de rate limit por perfil.

**Acoplamento ao TMDb.** Se o TMDb mudar de termos ou de preço, o acervo curado continua inteiro no seu banco — pôster e elenco somem, as 37 fichas não. O cache de `poster_path` é o que garante isso.
