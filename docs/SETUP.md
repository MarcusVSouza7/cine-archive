# Setup — passo a passo com links e valores

Cada passo tem o link, os campos e exatamente o que colar. Os passos estão em ordem de **progresso visível**: nos passos 5, 8 e 13 você confere algo funcionando na tela antes de seguir.

Se travar, anote **o número do passo** — é o que distingue mensagens de erro parecidas.

---

## Notação

| Placeholder | De onde vem |
|---|---|
| `<ref>` | subdomínio da Project URL do Supabase. Se a URL é `https://abcdefghijklm.supabase.co`, o ref é `abcdefghijklm` |

Você **não precisa montar** a callback URL à mão: o passo 11 mostra ela pronta para copiar.

---

# PARTE A — Banco e acervo

## 1. Criar o projeto Supabase

**Link:** https://supabase.com/dashboard/new

| Campo | Valor |
|---|---|
| Name | `cine-archive` |
| Database Password | gere um e **salve num gerenciador de senhas** |
| Region | `South America (São Paulo)` |
| Plan | Free |

Clique em **Create new project** e espere ~2 minutos.

> A senha do banco não é usada pela aplicação, mas é a única forma de conectar direto no Postgres depois — e o Supabase não mostra de novo.

## 2. Copiar as chaves

**Link:** `https://supabase.com/dashboard/project/<ref>/settings/api`

Ou: barra lateral → ⚙ **Project Settings** → **API**

Abra `.env.local` na raiz do projeto e preencha:

| No painel | Na variável |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon** / **public** (ou *Publishable key*) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** (ou *Secret key*) | `SUPABASE_SERVICE_ROLE_KEY` |

Salve o arquivo. Deixe `TMDB_READ_TOKEN` vazio por enquanto.

## 3. Rodar as migrações

**Link:** `https://supabase.com/dashboard/project/<ref>/sql/new`

Ou: barra lateral → **SQL Editor** → **New query**

Cole o conteúdo de cada arquivo e clique em **Run**, **uma por vez, nesta ordem**:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_onboarding.sql
supabase/migrations/0003_catalogo_tmdb.sql
```

Espere "Success" antes de passar para a próxima. A `0003` depende de colunas que a `0001` cria.

## 4. Semear o acervo

No terminal:

```sh
npm run seed:gen
```

Abra `supabase/seed.sql`, copie tudo, cole no SQL Editor e **Run**.

## 5. ✅ CONFERIR — o banco está servindo

```sh
npm run dev
```

| Onde | O que esperar |
|---|---|
| `https://supabase.com/dashboard/project/<ref>/editor` → tabela `films` | 37 linhas, todas com `in_archive = true` |
| `http://localhost:3000` | o aviso amarelo agora fala **só** do TMDb |
| `http://localhost:3000/explorar` | 37 obras |

> Variável de ambiente só é lida na inicialização. Se editou `.env.local` com o servidor rodando, reinicie.

---

# PARTE B — Cartazes

## 6. Token do TMDb

**Link:** https://www.themoviedb.org/signup → depois https://www.themoviedb.org/settings/api

Na página de API, clique em **Request an API Key** → **Developer** → aceite os termos e preencha:

| Campo | Valor |
|---|---|
| Type of Use | Personal |
| Application Name | `Cine:Archive` |
| Application URL | `http://localhost:3000` |
| Application Summary | `Arquivo de curadoria de cinema organizado por escolas cinematográficas, com diário pessoal de filmes.` |

Aprovação é imediata. A página passa a mostrar dois valores:

- ~~API Key (v3 auth)~~ — curto, **não é este**
- **API Read Access Token** — longo, começa com `eyJ` ← **este**

Cole em `TMDB_READ_TOKEN` no `.env.local`.

## 7. Ligar os filmes ao TMDb

```sh
npm run tmdb:backfill -- --dry-run    # confere sem gravar
npm run tmdb:backfill                 # grava tmdb_id e poster_path
npm run seed:gen                      # regenera o seed com os novos campos
```

Cole `supabase/seed.sql` no SQL Editor de novo e **Run**.

O que ficar ambíguo sai em `data/tmdb-revisao.json`. Resolva à mão e rode:

```sh
npm run tmdb:backfill -- --only <id-do-filme>
```

## 8. ✅ CONFERIR — os cartazes apareceram

Reinicie o `npm run dev`.

| Onde | O que esperar |
|---|---|
| `http://localhost:3000/explorar` | cartazes reais no lugar das placas |
| `http://localhost:3000/filmes/caligari-1920` | se o TMDb não tiver cartaz de 1920, **a placa tipográfica entra** — é o fallback funcionando |
| `http://localhost:3000/explorar?scope=tmdb` | o catálogo inteiro, paginado |
| `http://localhost:3000/buscar?q=kurosawa` | resultados nos dois acervos |
| qualquer página | **o aviso amarelo desapareceu** |

---

# PARTE C — Login

## 9. OAuth App no GitHub

**Link:** https://github.com/settings/applications/new

> Confirme que o formulário tem **exatamente quatro campos** e nenhuma menção a *Webhook* ou *Permissions*. Se tiver, você está em **GitHub Apps**, que é outra coisa — volte para o link acima.

| Campo | Valor |
|---|---|
| Application name | `Cine:Archive` |
| Homepage URL | `http://localhost:3000` |
| Application description | *(deixe vazio)* |
| Authorization callback URL | `https://<ref>.supabase.co/auth/v1/callback` |

**Register application** → o **Client ID** aparece na tela → clique em **Generate a new client secret** e copie na hora: o secret é mostrado **uma única vez**.

## 10. OAuth no Google

**10a. Tela de consentimento** — `https://console.cloud.google.com/auth/overview`

Crie um projeto se ainda não tiver. Então, em **Branding** (ou *OAuth consent screen*):

| Campo | Valor |
|---|---|
| App name | `Cine:Archive` |
| User support email | seu e-mail |
| Developer contact email | seu e-mail |

Em **Audience** (ou *User type*): **External**.

> **Isto não é opcional:** em modo *Testing*, somente e-mails na lista **Test users** conseguem entrar. Adicione o seu em *Audience → Test users*. É a causa nº 1 de "o login volta sem erro nenhum".

**10b. Credencial** — `https://console.cloud.google.com/auth/clients`

**Create client** (ou *Credentials → Create credentials → OAuth client ID*):

| Campo | Valor |
|---|---|
| Application type | `Web application` |
| Name | `Cine:Archive local` |
| Authorized JavaScript origins | `http://localhost:3000` |
| Authorized redirect URIs | `https://<ref>.supabase.co/auth/v1/callback` |

**Create** → copie **Client ID** e **Client Secret**.

## 11. Ligar os dois no Supabase

**Link:** `https://supabase.com/dashboard/project/<ref>/auth/providers`

Ou: barra lateral → **Authentication** → **Providers** (ou *Sign In / Providers*)

Para **GitHub** e para **Google**, separadamente:

1. Clique no provedor na lista e ative o toggle
2. O painel mostra **Callback URL (for OAuth)**, só leitura, com botão de copiar — **é esta que vai nos passos 9 e 10b.** Se você montou à mão, compare e corrija
3. Cole **Client ID** e **Client Secret**
4. **Save**

## 12. URLs de retorno

**Link:** `https://supabase.com/dashboard/project/<ref>/auth/url-configuration`

Ou: **Authentication** → **URL Configuration**

| Campo | Valor |
|---|---|
| Site URL | `http://localhost:3000` |
| Redirect URLs → Add URL | `http://localhost:3000/auth/callback` |

### Os dois callbacks, que não são a mesma coisa

| Configurado em | Aponta para |
|---|---|
| GitHub e Google (passos 9 e 10b) | `https://<ref>.supabase.co/auth/v1/callback` |
| Supabase (passo 12) | `http://localhost:3000/auth/callback` |

O provedor devolve para o **Supabase**. O Supabase devolve para a **sua aplicação**. Trocar os dois faz o login terminar numa página branca, sem erro em lugar nenhum.

## 13. ✅ CONFERIR — o login funciona

Reinicie o `npm run dev` e vá em `http://localhost:3000/login`.

- [ ] **Entrar com Google** → cai em `/conta` com handle provisório (tipo `marcus_a3f1`)
- [ ] Trocar o handle e salvar → mensagem "Perfil salvo"
- [ ] Repetir com **GitHub** numa janela anônima
- [ ] `/filmes/deus-diabo-1964` → caixa "Seu registro" com o formulário
- [ ] Preencher data, nota em **meia** estrela, favorito e review → **Registrar**
- [ ] A review aparece logo abaixo e em `/u/<seu-handle>`
- [ ] **Atualizar** edita em vez de duplicar
- [ ] **Remover do meu log** apaga
- [ ] Em `/explorar?scope=tmdb`, abrir um filme **fora do arquivo** e registrar → cria o stub
- [ ] Nesse filme, `films` ganhou uma linha com `in_archive = false`

A lista completa de verificação, inclusive o que depende de duas contas, está em [`ROADMAP.md`](ROADMAP.md) seção 6.4.

---

## Se algo falhar

| Sintoma | Causa mais provável | Passo |
|---|---|---|
| Página branca depois do login, sem erro | os dois callbacks trocados | 9, 10b, 12 |
| "Error 400: redirect_uri_mismatch" | redirect URI no Google diferente do que o Supabase mostra | 10b, 11 |
| Login do Google volta direto sem entrar | seu e-mail não está em Test users | 10a |
| `TMDB_READ_TOKEN nao definido` | token não salvo no `.env.local` | 6 |
| Aviso amarelo não desaparece | servidor não reiniciado | 5, 8 |
| `relation "films" does not exist` | migrações não rodadas ou fora de ordem | 3 |
| Nota salva como inteiro | — reporte: é bug meu, `numeric` volta como string do driver | 13 |

Ao pedir ajuda, mande **o número do passo e a mensagem exata**.
