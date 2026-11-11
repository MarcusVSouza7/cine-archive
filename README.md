# Cine:Archive

Arquivo de cinema de curadoria: **37 obras fundamentais organizadas por escolas cinematográficas**, não por popularidade ou algoritmo — mais o **catálogo inteiro do TMDb** ao lado, para achar e registrar qualquer filme. Cada ficha devolve o filme ao movimento que o produziu.

Aplicação Next.js com acervo curado, enriquecimento pelo TMDb e perfis com diário, notas e reviews. Roda sem nenhuma credencial: sem Supabase, lê o acervo dos JSON em `data/` e diz na tela o que está desligado.

---

## Conceito

Minimalismo clássico de revista de crítica impressa, aplicado a uma interface. Três decisões governam o resto:

**Tema único escuro, deliberado.** A sala de projeção. Fundo e todas as cores são pintados explicitamente — a página não herda o tema do navegador nem do host onde é embutida.

**Estrutura por filetes, não por cartões.** Nenhuma borda arredondada, nenhuma sombra, nenhum cartão. A hierarquia vem de filetes a 12% de opacidade, de espaço negativo e da escala tipográfica. Seções usam uma coluna-rubrica fixa à esquerda e o conteúdo à direita, como as cabeças correntes de um periódico.

**Pôsteres compostos no navegador.** Nenhuma imagem é carregada de fora. Cada pôster é uma *placa tipográfica* gerada em CSS — título original na serifa, número de catálogo, diretor e duração sobre uma tinta HSL derivada da escola do filme (azul-frio no expressionismo, ocre no Cinema Novo, verde-doente no J-Horror), com grão de película em `feTurbulence`. O enquadramento é 2:3, pronto para receber cartazes licenciados nos mesmos slots sem mudar o layout.

### Paleta

| Token | Valor | Uso |
|---|---|---|
| `--ink` | `#0E0E10` | fundo, a sala escura |
| `--ink-2` | `#141418` | planos elevados (ficha, blocos de código) |
| `--cream` | `#F4F4F0` | texto principal |
| `--muted` | `#8F8A80` | texto secundário — cinza quente, com viés para o acento |
| `--faint` | `#605B54` | labels, metadados |
| `--sepia` | `#A98253` | **único** acento: filetes ativos, números de ranking, acervos |
| `--rule` | `rgba(244,244,240,.12)` | toda a estrutura da página |

### Tipografia

- **Cormorant Garamond** (300 / 400 / 500 + itálico) — títulos, fichas, placas, valores de dados.
- **Inter** (400 / 500 / 600) — menu, labels, números tabulares.

Labels em caixa alta com `.14`–`.2em` de tracking. Todos os números com `font-variant-numeric: tabular-nums`. Fontes vêm do Google Fonts com pilha de fallback real declarada.

---

## Estrutura

| Seção | O que faz |
|---|---|
| **Cabeçalho** | Logo, menu e a conta — avatar e handle quando logado, "Entrar" quando não |
| **A seleção** | Seis entradas curadas — a porta de entrada mais limpa para cada corrente |
| **Escolas** | 9 correntes com verbete editorial: condições históricas, diretores-chave, marcas estéticas e as obras essenciais |
| **Explorador** | Dois escopos: **O Arquivo** (país, década, escola, nota editorial) e **Catálogo TMDb** (mais de um milhão de títulos, ao vivo, paginado) |
| **Rankings** | *Top por década* e *Top por país* no Arquivo — agrupam e numeram 1–5 dentro de cada grupo, respeitando os filtros ativos |
| **Buscar** | `/buscar?q=` procura no acervo curado e no TMDb ao mesmo tempo. Formulário GET: funciona sem JavaScript e o resultado é link |
| **Ficha do filme** | Cartaz, ficha técnica, sinopse, as três notas, elenco e disponibilidade do TMDb, seu log e as reviews |
| **Perfil** | `/u/[handle]`: favoritos, contagens e o diário com data, nota, favorito e review |
| **Sobre** | Critério de curadoria e o que o TMDb faz — e não faz |

A busca do v0, que era um overlay com `Ctrl K`, voltou como rota própria: `/buscar`. Formulário GET em vez de estado de cliente, então o resultado é compartilhável.

### Acessibilidade e responsividade

- Coluna única a partir de ~860px; grade fluida com `auto-fill`; nada estoura a largura da tela.
- `aria-pressed` nos alternadores, `role="dialog"` + `aria-modal` nos overlays, foco devolvido ao elemento de origem ao fechar.
- `:focus-visible` com contorno sépia; `prefers-reduced-motion` desliga animações e scroll suave.

---

## Arquitetura de dados

Duas coleções e uma chave estrangeira. `movement` é o campo que sustenta **três** superfícies ao mesmo tempo — a seção de Escolas, o filtro do explorador e o bloco de conexões da ficha. A década é sempre derivada de `year`, nunca armazenada.

```
data/
├── movements.json   9 registros
└── films.json      37 registros
```

### `movements.json`

```json
{
  "id": "cinema-novo",
  "name": "Cinema Novo",
  "region": "Brasil",
  "years": "1955–1972",
  "abstract": "…",
  "aesthetic": "…",
  "keyDirectors": ["Glauber Rocha", "Nelson Pereira dos Santos", "Ruy Guerra"],
  "hue": 24,
  "sat": "18%"
}
```

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `string` | slug, chave primária |
| `years` | `string` | faixa editorial, não data exata |
| `abstract` | `string` | 2–3 frases de contexto histórico |
| `aesthetic` | `string` | marcas formais separadas por vírgula |
| `hue` / `sat` | `number` / `string` | tinta HSL da placa daquela escola |

### `films.json`

```json
{
  "id": "deus-diabo-1964",
  "title": "Deus e o Diabo na Terra do Sol",
  "originalTitle": "Deus e o Diabo na Terra do Sol",
  "year": 1964,
  "country": "Brasil",
  "director": "Glauber Rocha",
  "runtime": 125,
  "movement": "cinema-novo",
  "rating": 94,
  "relevance": 97,
  "synopsis": "…",
  "watch": ["MUBI", "Itaú Cultural Play"],
  "archival": false
}
```

| Campo | Tipo | Nota |
|---|---|---|
| `id` | `string` | slug + ano |
| `title` / `originalTitle` | `string` | o original é o que aparece na placa |
| `year` | `number` | a década é derivada, nunca armazenada |
| `runtime` | `number` | minutos, inteiro |
| `movement` | `string` | **FK → `movements.id`** |
| `rating` | `number` | nota do arquivo, 0–100 |
| `relevance` | `number` | relevância histórica, 0–100 |
| `watch` | `string[]` | plataformas e acervos de preservação |
| `archival` | `boolean` | `true` → preservação ou domínio público, marcado em sépia na ficha |

As duas notas são mantidas **separadas de propósito**: consenso crítico e impacto histórico não são a mesma pergunta, e *Vidas Secas* e *O Poderoso Chefão* não deveriam competir na mesma coluna.

### Cobertura do acervo

9 escolas · 8 cinematografias (Alemanha, Itália, França, Brasil, Estados Unidos, Japão, Taiwan, Dinamarca) · 9 décadas, de **1920 a 2002**.

Expressionismo Alemão · Neorrealismo Italiano · Nouvelle Vague · Cinema Novo · Idade de Ouro Japonesa · New Hollywood · Novo Cinema Taiwanês · J-Horror · Dogma 95

---

## Procedência dos dados

Títulos, títulos originais, diretores, anos, países e durações são verificáveis.

**`rating`, `relevance` e `watch` são valores de demonstração deste protótipo.** Não vêm de nenhum agregador e não devem ser lidos como tal — a página diz isso na abertura e na seção Sobre. A estrutura está pronta para receber um acervo real pelo esquema acima.

---

## Rodar

```sh
npm install
npm run dev          # localhost:3000
```

Funciona imediatamente, sem `.env.local`: o acervo vem dos JSON em `data/` e um aviso na tela diz o que falta ligar. Para acender banco, login e cartazes, veja a seção seguinte.

```sh
npm run build        # build de produção
npm run typecheck    # tsc --noEmit
npm run seed:gen     # data/*.json -> supabase/seed.sql
npm run tmdb:backfill
```

**O protótipo v0** continua em `index.html` na raiz, documento autossuficiente que abre direto no navegador. É o que o GitHub Pages serve hoje em **https://marcusvsouza7.github.io/cine-archive/** — Pages não roda Next.js, então quando a aplicação subir para a Vercel esse arquivo vai para a branch `static-v0`.

---

## Ligar o Supabase e o TMDb

A aplicação roda sem nada disso — lê o acervo dos JSON e mostra na tela o que está desligado. Os passos abaixo acendem o resto.

**1. Projeto e credenciais.** Crie um projeto em supabase.com. Em *Project Settings → API*, copie a URL e a chave `anon` para `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**2. Schema.** No *SQL Editor*, rode em ordem:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_onboarding.sql
```

**3. Acervo.** Gere e rode o seed:

```sh
npm run seed:gen        # data/*.json -> supabase/seed.sql
```

Cole `supabase/seed.sql` no SQL Editor. É idempotente: pode rodar quantas vezes quiser.

**4. OAuth.** Em *Authentication → Providers*, habilite Google e GitHub e preencha client ID e secret de cada um. Em *Authentication → URL Configuration*:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/auth/callback`

Em produção, acrescente o domínio da Vercel às Redirect URLs — sem isso o login volta para `localhost` e falha.

**5. TMDb.** Pegue o *API Read Access Token* (v4) em themoviedb.org → *Settings → API* e ponha em `.env.local`:

```
TMDB_READ_TOKEN=eyJ...
```

Depois ligue os filmes ao TMDb e propague os cartazes:

```sh
npm run tmdb:backfill -- --dry-run   # confere os pareamentos
npm run tmdb:backfill                # grava tmdb_id e poster_path no JSON
npm run seed:gen                     # regenera o seed com os novos campos
```

Rode o `seed.sql` de novo. O que ficar ambíguo sai em `data/tmdb-revisao.json` para você resolver à mão — o script não adivinha, porque um `tmdb_id` errado contamina cartaz, elenco e disponibilidade daquela obra em silêncio.

O aviso de "modo protótipo" desaparece sozinho quando as duas fontes estão no lugar.

---

## Estado

**v0 — protótipo estático.** `index.html` na raiz, dados embutidos. É o que o GitHub Pages ainda serve.

**v1 — aplicação Next.js.** Acervo, escolas, explorador, rankings, fichas, autenticação OAuth, perfis públicos, diário, notas em meias estrelas e reviews.

| Rota | O que é |
|---|---|
| `/` | home editorial |
| `/escolas`, `/escolas/[slug]` | as correntes e suas obras |
| `/explorar` | O Arquivo: filtros e rankings, com estado na URL |
| `/explorar?scope=tmdb` | Catálogo TMDb: discover ao vivo, paginado |
| `/buscar` | busca nos dois acervos ao mesmo tempo |
| `/filmes/[slug]` | ficha curada + TMDb + seu log + reviews |
| `/filmes/tmdb-[id]` | ficha do catálogo: sem curadoria, mas registrável |
| `/u/[handle]` | perfil público: favoritos e diário |
| `/conta` | handle, nome e bio |
| `/login`, `/auth/callback` | OAuth Google e GitHub |

Decisões e modelo de dados em **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**. O que falta fazer, em ordem, com o que bloqueia o quê, em **[`docs/ROADMAP.md`](docs/ROADMAP.md)**.

### Pontos de arquitetura que não são óbvios no código

**Fonte dupla.** `lib/data.ts` lê o Supabase quando as variáveis existem e os JSON quando não existem, normalizando as duas para um tipo só. Semear o banco é trocar a fonte, não reescrever a aplicação.

**RLS é a autoridade.** Toda escrita passa pelo cliente de servidor, que leva o JWT do usuário. A aplicação não checa dono de linha — se tentar gravar no log de outra pessoa, o Postgres recusa. As validações nas Server Actions existem só para dar mensagem decente antes de o banco recusar.

**O acervo não tem política de escrita.** `movements` e `films` têm RLS ligado e nenhuma policy de `insert`/`update`/`delete`. Nem usuário autenticado toca na curadoria: só o `service_role`, por seed e backfill.

**Quatro notas, quatro colunas.** `archive_score` e `historical_relevance` são editoriais (0–100), a média dos leitores vem da view `film_stats` (0–5), e o `vote_average` vem do TMDb (0–10). Aparecem lado a lado, cada uma rotulada com sua escala, e nunca se somam — é o que separa um arquivo de curadoria de um agregador.

**Duas populações em `films`.** `in_archive = true` é curadoria sua: escola, nota de arquivo, sinopse escrita. `in_archive = false` é stub nascido do TMDb porque alguém registrou o filme. `getFilms()` filtra pelo flag, então o Arquivo nunca mistura. O catálogo completo **não** é importado — os termos do TMDb proíbem replicar a base deles, e a navegação bate na API ao vivo.

**`ensure_tmdb_film` é a única porta de escrita em `films`.** A tabela continua sem policy de escrita; a função é `SECURITY DEFINER`, só cria linha nova, força `in_archive = false`, força o id `tmdb-<id>` para não colidir com slug editorial, e não aceita campo de curadoria como parâmetro.

**`unstable_rethrow` nos catch.** `lib/auth.ts` e `lib/entries.ts` degradam para vazio quando o Supabase falha, mas rejogam os erros de controle do Next. Sem isso o `DynamicServerError` de `cookies()` seria engolido, a rota não seria marcada como dinâmica, e a página anônima ficaria em cache para quem está logado.

### Depois de v1

- [ ] Diário com múltiplas entradas por filme (remover o `unique` em `entries`)
- [ ] Watchlist e listas ordenáveis
- [ ] Seguir perfis e feed de atividade
- [ ] Moderação: denúncia e bloqueio antes de abrir cadastro ao público
- [ ] Notas de arquivo com proveniência citada por obra
- [ ] Páginas próprias por diretor
