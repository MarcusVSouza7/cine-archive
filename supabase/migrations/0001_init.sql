-- ============================================================
-- Cine:Archive — schema inicial
--
-- Quatro tabelas: movements e films sao acervo curado (so o
-- service_role escreve); profiles e entries pertencem aos usuarios.
--
-- Rodar com:  supabase db push
-- ou colar no SQL Editor do painel do Supabase.
-- ============================================================

create extension if not exists citext;

-- ============================================================
-- PERFIS
-- Espelha auth.users. Criado por trigger no signup.
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  handle        citext not null unique,
  display_name  text   not null,
  bio           text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- handle e o que aparece na URL: /u/<handle>
  constraint handle_formato check (handle ~ '^[a-z0-9_]{3,24}$'),
  constraint bio_tamanho    check (bio is null or char_length(bio) <= 500),
  constraint nome_tamanho   check (char_length(display_name) between 1 and 60)
);

comment on table  public.profiles        is 'Perfil publico do usuario.';
comment on column public.profiles.handle is 'Identificador na URL. Minusculas, numeros e _ apenas.';

-- ============================================================
-- ESCOLAS CINEMATOGRAFICAS
-- O campo que o TMDb nao tem. Curado, e a FK que sustenta o site.
-- ============================================================
create table public.movements (
  id             text primary key,
  name           text     not null,
  region         text     not null,
  years          text     not null,   -- faixa editorial ("1955-1972"), nao data exata
  abstract       text     not null,
  aesthetic      text     not null,
  key_directors  text[]   not null default '{}',
  hue            smallint not null,   -- tinta HSL da placa desta escola
  sat            text     not null,
  sort_order     smallint not null default 0,

  constraint movement_id_slug check (id ~ '^[a-z0-9-]+$'),
  constraint hue_valido       check (hue between 0 and 360)
);

comment on table public.movements is 'Correntes e escolas. Dado curado: o TMDb nao possui equivalente.';

-- ============================================================
-- FILMES
-- Acervo curado. tmdb_id e a ponte para o enriquecimento.
-- ============================================================
create table public.films (
  id                    text primary key,
  tmdb_id               integer unique,          -- nulo ate o backfill rodar
  title                 text     not null,       -- titulo de distribuicao local
  original_title        text     not null,       -- usado na placa tipografica
  year                  smallint not null,
  country               text     not null,
  director              text     not null,
  runtime               smallint,                -- minutos
  movement_id           text     not null references public.movements (id) on delete restrict,

  -- notas editoriais: opiniao assinada do arquivo, nunca media de nada
  archive_score         smallint,
  historical_relevance  smallint,

  synopsis              text     not null,
  archival              boolean  not null default false,  -- preservacao / dominio publico

  -- cache do TMDb: e o que impede a grade de bater na API
  poster_path           text,
  backdrop_path         text,
  tmdb_synced_at        timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint film_id_slug     check (id ~ '^[a-z0-9-]+$'),
  constraint ano_plausivel    check (year between 1888 and 2100),
  constraint duracao_positiva check (runtime is null or runtime > 0),
  constraint archive_0_100    check (archive_score is null or archive_score between 0 and 100),
  constraint relevancia_0_100 check (historical_relevance is null or historical_relevance between 0 and 100)
);

create index films_movement_idx on public.films (movement_id);
create index films_year_idx     on public.films (year);
create index films_country_idx  on public.films (country);
create index films_score_idx    on public.films (archive_score desc nulls last);

comment on column public.films.tmdb_id       is 'FK externa para o TMDb. Preenchida pelo backfill, revisada a mao quando ambigua.';
comment on column public.films.archive_score is 'Nota editorial 0-100. NAO e media de usuarios: ver view film_stats.';
comment on column public.films.poster_path   is 'Caminho do TMDb em cache. Null -> interface cai na placa tipografica.';

-- ============================================================
-- LOG / REVIEWS
-- Uma linha por par (perfil, filme).
--
-- TRADE-OFF: o Letterboxd permite varias entradas de diario para o
-- mesmo filme. Aqui ha uma so, com watch_count para revisoes.
-- Para virar diario de verdade: remover o unique abaixo, adicionar
-- logged_at e trocar os upsert por insert.
-- ============================================================
create table public.entries (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  film_id       text not null references public.films (id)    on delete cascade,

  watched_on    date,                                   -- null = visto, data desconhecida
  watch_count   smallint not null default 1,
  rating        numeric(2,1),                           -- 0.5 a 5.0 em meias estrelas
  liked         boolean  not null default false,
  review        text,
  has_spoilers  boolean  not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint uma_entrada_por_filme unique (profile_id, film_id),
  constraint revisoes_positivas    check (watch_count >= 1),
  constraint nota_meia_estrela     check (
    rating is null or (rating between 0.5 and 5.0 and rating * 2 = floor(rating * 2))
  ),
  constraint data_nao_futura       check (watched_on is null or watched_on <= current_date + 1),
  constraint review_tamanho        check (review is null or char_length(review) <= 10000)
);

create index entries_film_idx    on public.entries (film_id);
create index entries_profile_idx on public.entries (profile_id, watched_on desc nulls last);
create index entries_review_idx  on public.entries (film_id) where review is not null;

comment on table public.entries is 'Log do usuario: visto, nota, curtida e review. Uma linha por (perfil, filme).';

-- ============================================================
-- AGREGADOS DA COMUNIDADE
-- Separado das notas editoriais de propósito: sao perguntas diferentes.
-- ============================================================
create view public.film_stats
with (security_invoker = on) as
select
  f.id                                             as film_id,
  count(e.id)                                      as log_count,
  count(e.rating)                                  as rating_count,
  round(avg(e.rating), 2)                          as rating_avg,
  count(*) filter (where e.liked)                  as like_count,
  count(*) filter (where e.review is not null)     as review_count
from public.films f
left join public.entries e on e.film_id = f.id
group by f.id;

comment on view public.film_stats is 'Media da comunidade. NAO confundir com films.archive_score, que e editorial.';

-- ============================================================
-- updated_at
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger films_touch    before update on public.films
  for each row execute function public.touch_updated_at();
create trigger entries_touch  before update on public.entries
  for each row execute function public.touch_updated_at();

-- ============================================================
-- PERFIL AUTOMATICO NO SIGNUP
-- Handle provisorio: local part do e-mail, higienizado, truncado,
-- mais 4 chars do uuid. Garante unicidade e o minimo de 3 caracteres.
-- O usuario escolhe o definitivo em /conta.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
begin
  base := regexp_replace(lower(coalesce(split_part(new.email, '@', 1), 'cinefilo')), '[^a-z0-9_]', '', 'g');
  base := substr(base, 1, 19);
  if char_length(base) = 0 then
    base := 'cinefilo';
  end if;

  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    base || '_' || substr(replace(new.id::text, '-', ''), 1, 4),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      base
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS
--
-- movements e films: leitura publica, NENHUMA politica de escrita.
-- Sem politica de escrita, nem usuario autenticado toca no acervo —
-- so o service_role, que ignora RLS, via seed e backfill.
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.movements enable row level security;
alter table public.films     enable row level security;
alter table public.entries   enable row level security;

-- acervo: somente leitura
create policy "escolas sao publicas" on public.movements
  for select using (true);

create policy "filmes sao publicos" on public.films
  for select using (true);

-- perfis: publicos para ler, donos para escrever
create policy "perfis sao publicos" on public.profiles
  for select using (true);

create policy "dono cria o proprio perfil" on public.profiles
  for insert with check (auth.uid() = id);

create policy "dono edita o proprio perfil" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- entries: reviews publicas em v1; escrita so do dono
create policy "reviews sao publicas" on public.entries
  for select using (true);

create policy "dono registra o proprio log" on public.entries
  for insert with check (auth.uid() = profile_id);

create policy "dono edita o proprio log" on public.entries
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "dono apaga o proprio log" on public.entries
  for delete using (auth.uid() = profile_id);

-- ============================================================
-- GRANTS
-- anon le o acervo e os reviews; authenticated tambem escreve o seu.
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select on public.movements, public.films, public.profiles, public.entries, public.film_stats
  to anon, authenticated;

grant insert, update         on public.profiles to authenticated;
grant insert, update, delete on public.entries  to authenticated;
