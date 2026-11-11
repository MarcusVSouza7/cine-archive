# Plano de desenvolvimento

O que falta para o Cine:Archive sair de "roda no localhost" e virar um site público que outras pessoas usam.

Decisões e modelo de dados estão em [`ARCHITECTURE.md`](ARCHITECTURE.md). Este documento é só o que falta fazer, em que ordem, e o que impede o quê.

---

## Onde o projeto está

| | Estado |
|---|---|
| Identidade visual, acervo de 37 obras, 9 escolas | pronto |
| Explorador do Arquivo: filtros, rankings, grade/lista | pronto |
| Catálogo TMDb: discover ao vivo, paginado | **escrito, nunca executado** |
| Busca nos dois acervos | **escrita, metade nunca executada** |
| Auth OAuth, perfis, diário, notas, reviews | **escrito, nunca executado** |
| Schema com RLS (3 migrações) | **escrito, nunca rodado** |
| Deploy | não existe |
| Testes, CI | não existem |

A coluna da direita é o ponto central deste plano: **mais da metade do código nunca rodou contra o banco nem contra a API**. Tudo que está escrito compila, passa typecheck e tem os caminhos sem credencial verificados rota por rota — e nada além disso.

---

## Fase 6 — Ligar (bloqueada em você)

Nada daqui eu consigo fazer: são contas e chaves em seu nome.

### 6.1 Credenciais

| Passo | Onde | Resultado em `.env.local` |
|---|---|---|
| Criar projeto | supabase.com | — |
| Copiar URL e chave `anon` | Project Settings → API | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Copiar `service_role` | Project Settings → API | `SUPABASE_SERVICE_ROLE_KEY` |
| API Read Access Token v4 | themoviedb.org → Settings → API | `TMDB_READ_TOKEN` |

### 6.2 OAuth

1. Google Cloud Console → credenciais OAuth → origem autorizada `http://localhost:3000`, redirect `https://<seu-projeto>.supabase.co/auth/v1/callback`
2. GitHub → Settings → Developer settings → OAuth Apps → mesmo callback do Supabase
3. Supabase → Authentication → Providers → habilitar os dois, colar client ID e secret
4. Supabase → Authentication → URL Configuration:
   - Site URL `http://localhost:3000`
   - Redirect URLs `http://localhost:3000/auth/callback`

**O erro mais comum aqui:** confundir os dois callbacks. O provedor aponta para o Supabase; o Supabase aponta para a aplicação. Trocar os dois faz o login terminar numa página branca sem mensagem.

### 6.3 Banco e acervo

```sh
# no SQL Editor do Supabase, nesta ordem:
supabase/migrations/0001_init.sql
supabase/migrations/0002_onboarding.sql
supabase/migrations/0003_catalogo_tmdb.sql

# depois, local:
npm run seed:gen                      # data/*.json -> supabase/seed.sql
# cole supabase/seed.sql no SQL Editor

npm run tmdb:backfill -- --dry-run    # confere os pareamentos
npm run tmdb:backfill                 # grava tmdb_id e poster_path
npm run seed:gen                      # regenera com os novos campos
# cole seed.sql de novo
```

O que ficar ambíguo sai em `data/tmdb-revisao.json`. Resolva à mão e rode `npm run tmdb:backfill -- --only <id>`.

### 6.4 Verificação — o que precisa ser visto funcionando

Esta é a lista que transforma "escrito" em "funciona". Cada item nunca foi executado:

- [ ] Login com Google cria o perfil e cai em `/conta` com handle provisório
- [ ] Login com GitHub idem
- [ ] Salvar `/conta` grava handle, nome e bio, e marca `onboarded`
- [ ] Handle duplicado devolve a mensagem de erro, não o erro cru do Postgres
- [ ] Registrar obra do Arquivo grava em `entries`
- [ ] Registrar filme do catálogo cria o stub via `ensure_tmdb_film` e grava
- [ ] Nota em meia estrela sobrevive ao round-trip (`numeric` volta como string do driver)
- [ ] Review aparece na ficha e no diário
- [ ] Remover do log apaga a linha
- [ ] `/u/<handle>` de outra pessoa mostra o diário dela e **não** mostra botão de editar
- [ ] Tentar gravar no log de outro perfil é recusado pela RLS, não pela aplicação
- [ ] `film_stats` soma as notas e aparece na ficha
- [ ] Cartazes carregam de `image.tmdb.org` pelo `next/image`
- [ ] Placa tipográfica entra onde o TMDb não tem cartaz (teste com Caligari, 1920)
- [ ] `/explorar?scope=tmdb` lista, pagina e filtra por país e década
- [ ] "Melhor avaliados" não devolve lixo com 3 votos (o piso de 300 funciona)
- [ ] `/buscar?q=` acha nos dois acervos sem duplicar o mesmo filme
- [ ] Disponibilidade de streaming aparece na ficha (dado JustWatch)
- [ ] O aviso de "modo protótipo" desaparece

**Esforço:** 1 a 2 horas, quase tudo clicando em painel.

---

## Fase 7 — Robustez (o site aguenta ser usado)

Tudo aqui é meu. Nada depende da fase 6 para ser escrito, mas nada pode ser *verificado* antes dela.

### 7.1 Bordas que não existem

| Arquivo | Por que importa |
|---|---|
| `app/error.tsx` | Supabase cair em `/explorar` hoje entrega a tela de erro padrão do Next, em inglês, fora da identidade |
| `app/global-error.tsx` | idem, para falha no próprio layout |
| `app/explorar/loading.tsx`, `app/buscar/loading.tsx` | o escopo TMDb espera a API sem nenhum sinal na tela |
| `app/not-found.tsx` | existe, mas não cobre o 404 de `/u/<handle>` inexistente com texto próprio |

### 7.2 Diretor dos filmes do catálogo

`getMovie` pede `append_to_response=credits,watch/providers` e lê só `credits.cast`. A ficha de um filme do catálogo fica **sem direção** — e direção é a primeira coisa que alguém procura num site de cinema.

Correção: ler `credits.crew`, filtrar `job === "Director"`, e preencher o campo. Pequeno, e resolve um buraco visível.

### 7.3 SEO e metadados

- `metadataBase` no layout — sem ele o Next não resolve URL de Open Graph e avisa no build
- `app/sitemap.ts` — 37 fichas + 9 escolas + as rotas fixas
- `app/robots.ts` — e `/conta` e `/u/*` fora do índice
- `app/opengraph-image.tsx` — card de compartilhamento na tipografia do projeto, com a placa como fundo

### 7.4 Paginação que falta

| Onde | Hoje | Problema |
|---|---|---|
| `getDiary` | 60 entradas, sem "mais" | quem registrar 200 filmes vê 60 e nada avisa |
| `getFilmReviews` | 12 reviews, sem "mais" | idem |
| Explorador do Arquivo | 37 de uma vez | tudo bem até ~100 obras; depois precisa |

### 7.5 Limpeza

- `searchMovie` em `lib/tmdb.ts` é código morto: o backfill tem o próprio fetch e o catálogo usa `searchCatalog`
- o campo `watch` nos 37 registros de `films.json` é dado morto desde que a disponibilidade passou a vir do TMDb — remover do JSON e do README
- a barra de filtros é `position: sticky; top: 57px`, valor que assume a altura do cabeçalho; no celular o cabeçalho quebra em duas linhas e pode sobrepor. **Precisa de teste em aparelho real**, não em janela estreita

**Esforço:** médio. 7.2 e 7.3 são pequenos e rendem muito; 7.4 é o maior pedaço.

---

## Fase 8 — Testes

Zero testes hoje. O projeto já mudou de arquitetura duas vezes, e nas duas a verificação foi `curl` manual rota por rota. Isso não escala.

### 8.1 O que é fácil e vale muito

`lib/query.ts` e `lib/catalog.ts` são puros — sem React, sem rede, sem banco. Testá-los é barato:

| Alvo | Casos que já teriam pegado bug |
|---|---|
| `parseQuery` | `?decade=abc`, `?sort=inexistente`, parâmetro repetido |
| `applyFilters` / `applySort` | ano nulo na ordenação, empate de nota |
| `groupRankings` | grupo com menos de 5, ordenação dos grupos |
| `tmdbIdDeSlug` | `tmdb-`, `tmdb-0`, `tmdb-abc`, `tmdb--1` |
| `cruzarComArquivo` | o filme que está nos dois acervos (o bug da duplicata) |
| `normalizar` (busca) | acento, pontuação, caixa |

Vitest, sem jsdom — são funções puras.

### 8.2 O que vale um smoke test

Um teste que sobe o servidor e confere que cada rota responde 200/404 como deve. É exatamente o `curl` que eu rodei a mão nas últimas três fases, só automatizado.

### 8.3 CI

`.github/workflows/ci.yml` rodando `npm run typecheck`, `npm run build` e `npm test` em push e PR. Sem isso, o typecheck limpo de hoje é um fato sobre a minha máquina.

**Esforço:** pequeno para 8.1 e 8.3, médio para 8.2.

---

## Fase 9 — Deploy

### 9.1 Vercel

1. Importar o repositório
2. Variáveis de ambiente — as quatro, com `SUPABASE_SERVICE_ROLE_KEY` e `TMDB_READ_TOKEN` marcadas como *sensitive*
3. Acrescentar o domínio da Vercel às Redirect URLs do Supabase **e** à Site URL

**Sem o passo 3 o login em produção volta para `localhost` e falha.**

### 9.2 O protótipo sai da raiz

O GitHub Pages serve `index.html` da `main`. Pages não roda Next.js, então quando a aplicação subir:

```sh
git checkout -b static-v0 main
git push -u origin static-v0
gh api -X PUT repos/MarcusVSouza7/cine-archive/pages \
  -f "source[branch]=static-v0" -f "source[path]=/"
git checkout main
git rm index.html .nojekyll
```

O endereço antigo continua servindo o protótipo; a `main` fica só com a aplicação.

**Esforço:** pequeno, mas o passo 3 é o tipo de coisa que custa uma tarde se passar batido.

---

## Fase 10 — Antes de abrir cadastro ao público

Enquanto só você usa, nada aqui importa. No dia em que o cadastro abrir, tudo aqui importa de uma vez.

### 10.1 Moderação

Toda review é pública e não existe denúncia, bloqueio nem remoção. Precisa de:

- campo de denúncia por entrada e uma fila para você
- capacidade de ocultar uma review sem apagar o log de quem escreveu
- bloquear perfil

### 10.2 Abuso

- rate limit em `entries` por perfil — OAuth reduz conta fake, não elimina
- `ensure_tmdb_film` pode ser chamada em loop para inflar a tabela: limitar criações por perfil por hora

### 10.3 Dados pessoais (LGPD)

Site brasileiro com conta de usuário:

- apagar a conta, de verdade — `on delete cascade` já leva as entradas, falta a interface
- exportar o próprio diário (JSON ou CSV)
- política de privacidade dizendo o que o Google e o GitHub entregam e o que fica guardado
- decidir se review pública é opção ou obrigação — hoje é obrigação

**Esforço:** grande. É a fase que separa projeto pessoal de serviço.

---

## Fase 11 — Produto

Em ordem de quanto cada um muda a experiência.

| | O que é | Esforço |
|---|---|---|
| **Watchlist** | marcar "quero ver". Tabela nova, RLS igual a `entries` | pequeno |
| **Diário de verdade** | várias entradas por filme. Remover `unique (profile_id, film_id)`, adicionar `logged_at`, trocar upsert por insert. **A única mudança não aditiva prevista no schema** | médio |
| **Listas** | coleções ordenáveis pelo usuário. Duas tabelas, reordenação, página pública | médio |
| **Seguir e feed** | seguir perfis, atividade de quem você segue. Puxa regras de privacidade da fase 10 | grande |
| **Páginas de diretor** | `/diretores/[slug]` — hoje "outros filmes de X" é um filtro em memória, não uma página | pequeno |
| **Proveniência das notas** | `archive_score` e `historical_relevance` ainda são valores de demonstração. Ou cada obra ganha fonte citada, ou a escala é assumida como opinião assinada. **Número sem origem ao lado de média da comunidade é lido como se fosse agregação** | médio |
| **Curadoria sem editar JSON** | hoje catalogar obra nova é editar `data/films.json` e rodar o seed. Tolerável com 37, ruim com 300. Um painel em `/admin` fecharia o ciclo | grande |

---

## O que bloqueia o quê

```
Fase 6 (credenciais) ─── bloqueia a VERIFICAÇÃO de tudo
      │                   mas não bloqueia escrever nada
      ▼
Fase 7 (robustez) ──┐
Fase 8 (testes) ────┼──> Fase 9 (deploy)
                    │
                    └──> Fase 10 (público) ──> Fase 11 (social)
```

- **Fases 7 e 8 podem começar agora**, antes das credenciais. O que não dá é confirmar que funcionam.
- **Fase 9 depende de 6**, porque deploy sem banco publica o modo protótipo.
- **Fase 11 "Seguir e feed" depende de 10**, porque feed sem privacidade e sem moderação é problema, não funcionalidade.
- **"Diário de verdade" quanto mais cedo, melhor**: é a única mudança que quebra schema, e cada semana com usuários registrando torna a migração mais arriscada.

---

## Se eu tivesse que escolher a ordem

1. **Fase 6** — você. Sem isso, metade do projeto é teoria.
2. **7.2 (diretor) e 7.1 (bordas)** — pequenos, e consertam coisa visível.
3. **8.1 + 8.3 (testes puros + CI)** — barato, e impede regressão nas próximas mudanças.
4. **Diário de verdade (11)** — antes de ter usuários, enquanto quebrar schema é grátis.
5. **7.3 + 7.4 (SEO e paginação)**, depois **Fase 9 (deploy)**.
6. **Fase 10** só quando for realmente abrir, e inteira — moderação pela metade é pior que nenhuma.
